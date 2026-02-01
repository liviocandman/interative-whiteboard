import type { Room, RoomStats, CreateRoomData, JoinRoomData } from '../types/room';
import { getBackendUrl } from '../utils/config';

class RoomService {
  private baseUrl = getBackendUrl();

  async getRooms(): Promise<Room[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return await response.json();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  async getRoomById(roomId: string): Promise<Room> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Room not found');
        }
        throw new Error('Failed to fetch room');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  }

  async getStats(): Promise<RoomStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create room');
      return await response.json();
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async checkRoomExists(roomId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomId}/exists`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.exists;
    } catch {
      return false;
    }
  }

  async joinRoom(data: JoinRoomData): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${data.roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join room');
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to join room');
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete room');
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to delete room');
    }
  }
}

export const roomService = new RoomService();