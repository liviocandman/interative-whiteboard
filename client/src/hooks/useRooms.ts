import { useState, useCallback } from 'react';
import { roomService } from '../services/roomService';
import type { Room, RoomStats, CreateRoomData, JoinRoomData } from '../types/room';

interface UseRoomsReturn {
  rooms: Room[];
  stats: RoomStats | null;
  isLoading: boolean;
  error: string | null;
  createRoom: (data: CreateRoomData) => Promise<Room>;
  joinRoom: (data: JoinRoomData) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
}

export function useRooms(): UseRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRooms = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [roomsData, statsData] = await Promise.all([
        roomService.getRooms(),
        roomService.getStats(),
      ]);
      
      setRooms(roomsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar salas');
      console.error('Failed to refresh rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRoom = useCallback(async (data: CreateRoomData): Promise<Room> => {
    try {
      const room = await roomService.createRoom(data);
      setRooms(prev => [room, ...prev]);
      
      // Update stats
      if (stats) {
        setStats(prev => prev ? {
          ...prev,
          totalRooms: prev.totalRooms + 1,
          publicRooms: data.isPublic ? prev.publicRooms + 1 : prev.publicRooms,
          privateRooms: data.isPublic ? prev.privateRooms : prev.privateRooms + 1,
        } : null);
      }
      
      return room;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar sala');
    }
  }, [stats]);

  const joinRoom = useCallback(async (data: JoinRoomData): Promise<void> => {
    try {
      await roomService.joinRoom(data);
      
      // Update room user count locally
      setRooms(prev => prev.map(room => 
        room.id === data.roomId 
          ? { ...room, currentUsers: room.currentUsers + 1 }
          : room
      ));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao entrar na sala');
    }
  }, []);

  const deleteRoom = useCallback(async (roomId: string): Promise<void> => {
    try {
      await roomService.deleteRoom(roomId);
      
      const deletedRoom = rooms.find(r => r.id === roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
      
      // Update stats
      if (stats && deletedRoom) {
        setStats(prev => prev ? {
          ...prev,
          totalRooms: prev.totalRooms - 1,
          publicRooms: deletedRoom.isPublic ? prev.publicRooms - 1 : prev.publicRooms,
          privateRooms: deletedRoom.isPublic ? prev.privateRooms : prev.privateRooms - 1,
        } : null);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao deletar sala');
    }
  }, [rooms, stats]);

  return {
    rooms,
    stats,
    isLoading,
    error,
    createRoom,
    joinRoom,
    deleteRoom,
    refreshRooms,
  };
}