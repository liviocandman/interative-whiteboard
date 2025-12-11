import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../types';
import type { Room, RoomSettings, CreateRoomRequest } from '../types';

export class RoomModel {
  static async createRoom(data: CreateRoomRequest, createdBy: {id: string, name: string}): Promise<Room> {
    const room: Room = { 
      id: this.generateRoomId(data.name),
      name: data.name,
      description: data.description || '',
      isPublic: data.isPublic,
      hasPassword: Boolean(data.password),
      passwordHash: data.password ? await this.hashPassword(data.password) : undefined,
      maxUsers: data.maxUsers,
      currentUsers: 0,
      tags: data.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      settings: data.settings,
      lastActivity: new Date(),
      isActive: true,
    };

    return room;
  }

  static generateRoomId(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 20); // Limit length

    const uniqueSuffix = uuidv4().substring(0, 8); // Short unique identifier
    return `${slug}-${uniqueSuffix}`;
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static validateSettings(settings: RoomSettings): string[] {
    const errors: string[] = [];

    if (settings.canvasSize === 'custom') {
      if (!settings.customWidth || settings.customWidth < 400) {
        errors.push('Custom width must be at least 400px');
      }
      if (!settings.customHeight || settings.customHeight < 300) {
        errors.push('Custom height must be at least 300px');
      }
    }

    if (settings.historyLimit < 5 || settings.historyLimit > 100) {
      errors.push('History limit must be between 5 and 100');
    }

    return errors;
  }

  static serialize(room: Room): string {
    return JSON.stringify({
      ...room,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      lastActivity: room.lastActivity.toISOString(),
    });
  }

  static deserialize(data: string): Room | null {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        lastActivity: new Date(parsed.lastActivity),
      };
    } catch {
      return null;
    }
  }

  static toPublic(room: Room): Omit<Room, 'passwordHash'> {
    const { passwordHash, ...publicRoom } = room;
    return publicRoom;
  }

  static updateActivity(room: Room): Room {
    return {
      ...room,
      lastActivity: new Date(),
      updatedAt: new Date(),
    };
  }

  static incrementUsers(room: Room): Room {
    return {
      ...room,
      currentUsers: room.currentUsers + 1,
      lastActivity: new Date(),
      updatedAt: new Date(),
    };
  }

  static decrementUsers(room: Room): Room {
    return {
      ...room,
      currentUsers: Math.max(0, room.currentUsers - 1),
      lastActivity: new Date(),
      updatedAt: new Date(),
    };
  }
}
