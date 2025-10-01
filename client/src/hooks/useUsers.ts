import { useState, useCallback, useEffect } from 'react';
import { socket } from '../services/socket';
import type { User, Point } from '../types';

interface UseUsersReturn {
  currentUser: User | null;
  otherUsers: User[];
  isSettingUp: boolean;
  setupUser: (name: string, color: string) => void;
  updateCursor: (position: Point) => void;
  setDrawing: (isDrawing: boolean) => void;
}

export function useUsers(): UseUsersReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<Map<string, User>>(new Map());
  const [isSettingUp, setIsSettingUp] = useState(true);

  const setupUser = useCallback((name: string, color: string): void => {
    const user: User = {
      id: socket.id || '',
      name,
      color,
      cursor: { x: 0, y: 0 },
      isDrawing: false,
      lastSeen: new Date(),
      isOnline: true,
    };

    setCurrentUser(user);
    setIsSettingUp(false);

    // Enviar dados do usuário para o servidor
    socket.emit('userSetup', { name, color });
  }, []);

  const updateCursor = useCallback((position: Point): void => {
    if (!currentUser) return;

    const updatedUser = { ...currentUser, cursor: position, lastSeen: new Date() };
    setCurrentUser(updatedUser);

    // Throttled cursor position update
    socket.emit('cursorMove', position);
  }, [currentUser]);

  const setDrawing = useCallback((isDrawing: boolean): void => {
    if (!currentUser) return;

    const updatedUser = { ...currentUser, isDrawing, lastSeen: new Date() };
    setCurrentUser(updatedUser);

    socket.emit('drawingState', isDrawing);
  }, [currentUser]);

  // Socket event listeners
  useEffect(() => {
    const handleUserJoined = (user: User): void => {
      setOtherUsers(prev => new Map(prev.set(user.id, user)));
    };

    const handleUserLeft = (userId: string): void => {
      setOtherUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    const handleCursorMove = (data: { userId: string; position: Point }): void => {
      setOtherUsers(prev => {
        const newMap = new Map(prev);
        const user = newMap.get(data.userId);
        if (user) {
          newMap.set(data.userId, { ...user, cursor: data.position, lastSeen: new Date() });
        }
        return newMap;
      });
    };

    const handleDrawingState = (data: { userId: string; isDrawing: boolean }): void => {
      setOtherUsers(prev => {
        const newMap = new Map(prev);
        const user = newMap.get(data.userId);
        if (user) {
          newMap.set(data.userId, { ...user, isDrawing: data.isDrawing, lastSeen: new Date() });
        }
        return newMap;
      });
    };

    const handleRoomUsers = (users: User[]): void => {
      const usersMap = new Map<string, User>();
      users.forEach(user => {
        if (user.id !== socket.id) {
          usersMap.set(user.id, user);
        }
      });
      setOtherUsers(usersMap);
    };

    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('cursorMove', handleCursorMove);
    socket.on('drawingState', handleDrawingState);
    socket.on('roomUsers', handleRoomUsers);

    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('cursorMove', handleCursorMove);
      socket.off('drawingState', handleDrawingState);
      socket.off('roomUsers', handleRoomUsers);
    };
  }, []);

  return {
    currentUser,
    otherUsers: Array.from(otherUsers.values()),
    isSettingUp,
    setupUser,
    updateCursor,
    setDrawing,
  };
}
