import { RedisService } from './RedisService';
import { RoomModel } from '../models';
import { REDIS_KEYS, CONFIG } from '../types';
import type { Room, CreateRoomRequest, RoomFilter, RoomStats } from '../types';

export class RoomService {
  private redis: RedisService;

  constructor() {
    this.redis = RedisService.getInstance();
  }

  async createRoom(data: CreateRoomRequest, createdBy: { id: string; name: string }): Promise<Room> {
    // Validate settings
    const settingsErrors = RoomModel.validateSettings(data.settings);
    if (settingsErrors.length > 0) {
      throw new Error(`Invalid settings: ${settingsErrors.join(', ')}`);
    }

    // Create room
    const room = await RoomModel.createRoom(data, createdBy);

    // Save to Redis
    await this.saveRoom(room);

    // Add to all rooms set
    await this.redis.sAdd(REDIS_KEYS.ALL_ROOMS, room.id);

    return RoomModel.toPublic(room);
  }

  async createRoomWithId(roomId: string, data: CreateRoomRequest, createdBy: { id: string; name: string }): Promise<Room> {
    // Validate settings
    const settingsErrors = RoomModel.validateSettings(data.settings);
    if (settingsErrors.length > 0) {
      throw new Error(`Invalid settings: ${settingsErrors.join(', ')}`);
    }

    // Create room with specific ID
    const room = await RoomModel.createRoomWithId(roomId, data, createdBy);

    // Save to Redis
    await this.saveRoom(room);

    // Add to all rooms set
    await this.redis.sAdd(REDIS_KEYS.ALL_ROOMS, room.id);

    return RoomModel.toPublic(room);
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const data = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
    if (!data) return null;

    const room = RoomModel.deserialize(data);
    return room ? RoomModel.toPublic(room) : null;
  }

  async getAllRooms(filter?: RoomFilter): Promise<Room[]> {
    const roomIds = await this.redis.pub.sMembers(REDIS_KEYS.ALL_ROOMS);

    const rooms = await Promise.all(
      roomIds.map(id => this.getRoomById(id))
    );

    let filteredRooms = rooms.filter((room): room is Room => room !== null);

    // Apply filters
    if (filter) {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredRooms = filteredRooms.filter(room =>
          room.name.toLowerCase().includes(searchLower) ||
          room.description.toLowerCase().includes(searchLower) ||
          room.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (filter.isPublicOnly) {
        filteredRooms = filteredRooms.filter(room => room.isPublic);
      }

      if (filter.tags && filter.tags.length > 0) {
        filteredRooms = filteredRooms.filter(room =>
          filter.tags!.some(tag => room.tags.includes(tag))
        );
      }

      // Sort
      if (filter.sortBy) {
        filteredRooms.sort((a, b) => {
          let comparison = 0;

          switch (filter.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'created':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'updated':
              comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
              break;
            case 'users':
              comparison = a.currentUsers - b.currentUsers;
              break;
          }

          return filter.sortOrder === 'desc' ? -comparison : comparison;
        });
      }
    }

    return filteredRooms;
  }

  async getStats(): Promise<RoomStats> {
    const rooms = await this.getAllRooms();

    const stats: RoomStats = {
      totalRooms: rooms.length,
      publicRooms: rooms.filter(r => r.isPublic).length,
      privateRooms: rooms.filter(r => !r.isPublic).length,
      activeUsers: rooms.reduce((sum, r) => sum + r.currentUsers, 0),
      popularTags: this.calculatePopularTags(rooms),
    };

    return stats;
  }

  async joinRoom(roomId: string, password?: string): Promise<Room> {
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check password
    if (room.hasPassword) {
      if (!password) {
        throw new Error('Password required');
      }

      const roomData = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
      if (!roomData) {
        throw new Error('Room not found');
      }

      const fullRoom = RoomModel.deserialize(roomData);
      if (!fullRoom || !fullRoom.passwordHash) {
        throw new Error('Invalid room data');
      }

      const isValid = await RoomModel.verifyPassword(password, fullRoom.passwordHash);
      if (!isValid) {
        throw new Error('Invalid password');
      }
    }

    // Check capacity
    if (room.currentUsers >= room.maxUsers) {
      throw new Error('Room is full');
    }

    return room;
  }

  async addUserToRoom(roomId: string, userId: string): Promise<number> {
    // Add user to room's user set
    await this.redis.sAdd(REDIS_KEYS.ROOM_USERS(roomId), userId);

    // Update room's current user count
    const room = await this.getRoomById(roomId);
    if (room) {
      const roomData = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
      if (roomData) {
        const fullRoom = RoomModel.deserialize(roomData);
        if (fullRoom) {
          const updated = RoomModel.incrementUsers(fullRoom);
          await this.saveRoom(updated);
          return updated.currentUsers;
        }
      }
    }

    return await this.redis.sCard(REDIS_KEYS.ROOM_USERS(roomId));
  }

  async removeUserFromRoom(roomId: string, userId: string): Promise<number> {
    // Remove user from room's user set
    await this.redis.sRem(REDIS_KEYS.ROOM_USERS(roomId), userId);

    // Update room's current user count
    const room = await this.getRoomById(roomId);
    if (room) {
      const roomData = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
      if (roomData) {
        const fullRoom = RoomModel.deserialize(roomData);
        if (fullRoom) {
          const updated = RoomModel.decrementUsers(fullRoom);
          await this.saveRoom(updated);
          return updated.currentUsers;
        }
      }
    }

    return await this.redis.sCard(REDIS_KEYS.ROOM_USERS(roomId));
  }

  async deleteRoom(roomId: string): Promise<void> {
    // Remove from all rooms set
    await this.redis.sRem(REDIS_KEYS.ALL_ROOMS, roomId);

    // Delete all room data
    const keys = [
      REDIS_KEYS.ROOM_DATA(roomId),
      REDIS_KEYS.ROOM_USERS(roomId),
      REDIS_KEYS.ROOM_STATE(roomId),
      REDIS_KEYS.ROOM_STROKES(roomId),
    ];

    await this.redis.del(keys);
  }

  async roomExists(roomId: string): Promise<boolean> {
    const exists = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
    return exists !== null;
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    const roomData = await this.redis.get(REDIS_KEYS.ROOM_DATA(roomId));
    if (!roomData) return;

    const room = RoomModel.deserialize(roomData);
    if (!room) return;

    const updated = RoomModel.updateActivity(room);
    await this.saveRoom(updated);
  }

  private async saveRoom(room: Room): Promise<void> {
    const serialized = RoomModel.serialize(room);
    await this.redis.setWithTTL(
      REDIS_KEYS.ROOM_DATA(room.id),
      serialized,
      CONFIG.DEFAULT_TTL_SECONDS
    );
  }

  private calculatePopularTags(rooms: Room[]): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    rooms.forEach(room => {
      room.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
