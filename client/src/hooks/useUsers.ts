import { useState, useCallback, useEffect } from 'react';
import { socket } from '../services/socket';
import { getPersistentUserId } from '../utils/user';
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
    const persistentUserId = getPersistentUserId();
    console.log('[useUsers] setupUser called with:', { name, color, persistentUserId, socketId: socket.id, connected: socket.connected });

    // Ensure socket is connected
    if (!socket.connected) {
      console.warn('[useUsers] Socket not connected, connecting first...');
      socket.connect();
    }

    // Wait a moment for socket.id to be available
    const createUser = () => {
      if (!socket.id) {
        console.error('[useUsers] Socket ID not available yet, retrying...');
        setTimeout(createUser, 100);
        return;
      }

      const user: User = {
        id: persistentUserId,
        name,
        color,
        cursor: { x: 0, y: 0 },
        isDrawing: false,
        lastSeen: new Date(),
        isOnline: true,
      };

      console.log('[useUsers] Created user:', user);
      setCurrentUser(user);
      setIsSettingUp(false);

      // Send user data to server with persistent userId
      console.log('[useUsers] Emitting userSetup to server');
      socket.emit('userSetup', { userId: persistentUserId, name, color });
    };

    createUser();
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
    console.log('[useUsers] Setting up socket listeners');

    const handleUserJoined = (user: User): void => {
      console.log('[useUsers] userJoined event received:', user);
      setOtherUsers(prev => new Map(prev.set(user.id, user)));
    };

    const handleUserLeft = (userId: string): void => {
      console.log('[useUsers] userLeft event received:', userId);
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
      console.log('[useUsers] roomUsers event received:', users);
      const usersMap = new Map<string, User>();
      users.forEach(user => {
        if (user.id !== socket.id) {
          usersMap.set(user.id, user);
        }
      });
      setOtherUsers(usersMap);
      console.log('[useUsers] Updated otherUsers map:', usersMap);
    };

    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('cursorMove', handleCursorMove);
    socket.on('drawingState', handleDrawingState);
    socket.on('roomUsers', handleRoomUsers);

    // When socket connects, the roomUsers event should be sent automatically by server
    // but let's log it
    const handleConnect = (): void => {
      console.log('[useUsers] Socket connected, ID:', socket.id);
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('cursorMove', handleCursorMove);
      socket.off('drawingState', handleDrawingState);
      socket.off('roomUsers', handleRoomUsers);
      socket.off('connect', handleConnect);
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
