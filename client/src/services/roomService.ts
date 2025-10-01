import type { Room, RoomStats, CreateRoomData, JoinRoomData } from '../types/room';

class RoomService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  async getRooms(): Promise<Room[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return await response.json();
    } catch (error) {
      // Mock data for development
      return this.getMockRooms();
    }
  }

  async getStats(): Promise<RoomStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      // Mock data for development
      return this.getMockStats();
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
      // Mock creation for development
      return this.createMockRoom(data);
    }
  }

  async checkRoomExists(roomId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/${roomId}/exists`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.exists;
    } catch (error) {
      // Mock for development - assume room exists if it's a valid format
      return /^[a-zA-Z0-9-_]+$/.test(roomId) && roomId.length >= 3;
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

  // Mock data methods for development
  private getMockRooms(): Room[] {
    return [
      {
        id: 'room-1',
        name: 'Brainstorm Marketing Q4',
        description: 'Sessão de brainstorm para planejar as campanhas do quarto trimestre',
        thumbnail: undefined,
        isPublic: true,
        hasPassword: false,
        maxUsers: 15,
        currentUsers: 5,
        tags: ['brainstorm', 'marketing', 'planejamento'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdBy: {
          id: 'user-1',
          name: 'Maria Silva',
          avatar: undefined,
        },
        settings: {
          allowDrawing: true,
          allowChat: true,
          allowExport: true,
          requireApproval: false,
          backgroundColor: '#ffffff',
          canvasSize: 'large',
          enableGrid: true,
          enableRulers: false,
          autoSave: true,
          historyLimit: 25,
        },
      },
      {
        id: 'room-2',
        name: 'Design Review - App Mobile',
        description: 'Revisão dos protótipos da nova versão do aplicativo',
        thumbnail: undefined,
        isPublic: false,
        hasPassword: true,
        maxUsers: 8,
        currentUsers: 3,
        tags: ['design', 'mobile', 'review', 'prototipo'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        createdBy: {
          id: 'user-2',
          name: 'João Costa',
          avatar: undefined,
        },
        settings: {
          allowDrawing: true,
          allowChat: true,
          allowExport: false,
          requireApproval: true,
          backgroundColor: '#f8fafc',
          canvasSize: 'medium',
          enableGrid: false,
          enableRulers: true,
          autoSave: true,
          historyLimit: 20,
        },
      },
      {
        id: 'room-3',
        name: 'Workshop UX/UI',
        description: 'Workshop sobre melhores práticas de design de interfaces',
        thumbnail: undefined,
        isPublic: true,
        hasPassword: false,
        maxUsers: 25,
        currentUsers: 12,
        tags: ['workshop', 'ux', 'ui', 'educação'],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        createdBy: {
          id: 'user-3',
          name: 'Ana Rodrigues',
          avatar: undefined,
        },
        settings: {
          allowDrawing: true,
          allowChat: true,
          allowExport: true,
          requireApproval: false,
          backgroundColor: '#dbeafe',
          canvasSize: 'large',
          enableGrid: true,
          enableRulers: true,
          autoSave: true,
          historyLimit: 30,
        },
      },
    ];
  }

  private getMockStats(): RoomStats {
    return {
      totalRooms: 15,
      publicRooms: 10,
      privateRooms: 5,
      activeUsers: 45,
      popularTags: [
        { tag: 'brainstorm', count: 8 },
        { tag: 'design', count: 6 },
        { tag: 'reunião', count: 5 },
        { tag: 'projeto', count: 4 },
        { tag: 'workshop', count: 3 },
        { tag: 'educação', count: 3 },
      ],
    };
  }

  private createMockRoom(data: CreateRoomData): Room {
    return {
      id: `room-${Date.now()}`,
      name: data.name,
      description: data.description,
      thumbnail: undefined,
      isPublic: data.isPublic,
      hasPassword: Boolean(data.password),
      maxUsers: data.maxUsers,
      currentUsers: 1,
      tags: data.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: 'current-user',
        name: 'Você',
        avatar: undefined,
      },
      settings: data.settings,
    };
  }
}

export const roomService = new RoomService();