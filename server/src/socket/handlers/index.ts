import { Server, Socket } from 'socket.io';
import { RoomService } from '../../services/RoomService';
import { UserService } from '../../services/UserService';
import { DrawingService } from '../../services/DrawingService';
import { StateService } from '../../services/StateService';
import { validateStroke } from '../../utils/validation';
import type { Point } from '../../types';

export class SocketHandlers {
  private roomService: RoomService;
  private userService: UserService;
  private drawingService: DrawingService;
  private stateService: StateService;

  constructor(private io: Server) {
    this.roomService = new RoomService();
    this.userService = UserService.getInstance();
    this.drawingService = new DrawingService(io);
    this.stateService = new StateService();
  }

  setup(socket: Socket): void {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // User setup
    socket.on('userSetup', (data: { name: string; color: string }) => {
      this.handleUserSetup(socket, data);
    });

    // Room events
    socket.on('joinRoom', (roomId: string, callback?: (error?: string) => void) => {
      this.handleJoinRoom(socket, roomId, callback);
    });

    socket.on('leaveRoom', (callback?: (error?: string) => void) => {
      this.handleLeaveRoom(socket, callback);
    });

    // Drawing events
    socket.on('drawing', (stroke: any) => {
      this.handleDrawing(socket, stroke);
    });

    socket.on('saveState', (snapshot: string, callback?: (error?: string) => void) => {
      this.handleSaveState(socket, snapshot, callback);
    });

    socket.on('resetBoard', (callback?: (error?: string) => void) => {
      this.handleResetBoard(socket, callback);
    });

    // Undo/Redo events
    socket.on('undoStroke', async (callback?: (result: { success: boolean; strokeId?: string }) => void) => {
      console.log('[Socket] undoStroke event received from:', socket.id);
      await this.handleUndoStroke(socket, callback);
      console.log('[Socket] undoStroke handler completed');
    });

    socket.on('redoStroke', async (callback?: (result: { success: boolean }) => void) => {
      console.log('[Socket] redoStroke event received from:', socket.id);
      await this.handleRedoStroke(socket, callback);
      console.log('[Socket] redoStroke handler completed');
    });

    // User interaction events
    socket.on('cursorMove', (position: Point) => {
      this.handleCursorMove(socket, position);
    });

    socket.on('drawingState', (isDrawing: boolean) => {
      this.handleDrawingState(socket, isDrawing);
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  private handleUserSetup(socket: Socket, data: { name: string; color: string }): void {
    try {
      const user = this.userService.createUser(socket.id, data.name, data.color);
      console.log(`[Socket] User setup: ${user.name} (${socket.id})`);
    } catch (error) {
      console.error('[Socket] Error in user setup:', error);
      socket.emit('error', {
        event: 'userSetup',
        message: 'Failed to setup user',
        timestamp: Date.now(),
      });
    }
  }

  private async handleJoinRoom(
    socket: Socket,
    roomId: string,
    callback?: (error?: string) => void
  ): Promise<void> {
    try {
      // Check if room exists
      const roomExists = await this.roomService.roomExists(roomId);
      if (!roomExists) {
        callback?.('Room not found');
        return;
      }

      // Leave current room if any
      const currentRoom = this.getCurrentRoom(socket);
      if (currentRoom && currentRoom !== roomId) {
        await this.leaveRoom(socket, currentRoom);
      }

      // Join new room
      await socket.join(roomId);
      await this.roomService.addUserToRoom(roomId, socket.id);
      this.userService.setUserRoom(socket.id, roomId);

      // Get initial state
      const initialState = await this.drawingService.getInitialState(roomId);
      socket.emit('initialState', initialState);

      // Get room users and broadcast
      const roomUsers = this.userService.getUsersByRoom(roomId);
      const currentUser = this.userService.getUser(socket.id);

      // Notify others about new user
      if (currentUser) {
        socket.to(roomId).emit('userJoined', currentUser);
      }

      // Send all users to the joining user
      socket.emit('roomUsers', roomUsers);

      console.log(`[Socket] User ${socket.id} joined room ${roomId}`);
      callback?.();
    } catch (error) {
      console.error('[Socket] Error joining room:', error);
      callback?.(error instanceof Error ? error.message : 'Failed to join room');
    }
  }

  private async handleLeaveRoom(
    socket: Socket,
    callback?: (error?: string) => void
  ): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.('Not in a room');
        return;
      }

      await this.leaveRoom(socket, currentRoom);
      callback?.();
    } catch (error) {
      console.error('[Socket] Error leaving room:', error);
      callback?.(error instanceof Error ? error.message : 'Failed to leave room');
    }
  }

  private async handleDrawing(socket: Socket, stroke: any): Promise<void> {
    try {
      const validatedStroke = validateStroke(stroke);
      if (!validatedStroke) {
        socket.emit('error', {
          event: 'drawing',
          message: 'Invalid stroke data',
          timestamp: Date.now(),
        });
        return;
      }

      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        socket.emit('error', {
          event: 'drawing',
          message: 'Not in a room',
          timestamp: Date.now(),
        });
        return;
      }

      // Add user ID to stroke
      validatedStroke.userId = socket.id;

      // Save stroke to Redis
      await this.drawingService.handleStroke(currentRoom, validatedStroke, socket.id);

    } catch (error) {
      console.error('[Socket] Error handling drawing:', error);
      socket.emit('error', {
        event: 'drawing',
        message: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }

  private async handleSaveState(
    socket: Socket,
    snapshot: string,
    callback?: (error?: string) => void
  ): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.('Not in a room');
        return;
      }

      if (!snapshot || typeof snapshot !== 'string') {
        callback?.('Invalid snapshot data');
        return;
      }

      await this.stateService.saveCanvasState(currentRoom, snapshot);
      callback?.();
    } catch (error) {
      console.error('[Socket] Error saving state:', error);
      callback?.(error instanceof Error ? error.message : 'Failed to save state');
    }
  }

  private async handleResetBoard(
    socket: Socket,
    callback?: (error?: string) => void
  ): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.('Not in a room');
        return;
      }

      await this.drawingService.clearBoard(currentRoom, socket.id);
      callback?.();
    } catch (error) {
      console.error('[Socket] Error resetting board:', error);
      callback?.(error instanceof Error ? error.message : 'Failed to reset board');
    }
  }

  private async handleUndoStroke(
    socket: Socket,
    callback?: (result: { success: boolean; strokeId?: string }) => void
  ): Promise<void> {
    console.log('[Socket] handleUndoStroke starting for socket:', socket.id);
    try {
      const currentRoom = this.getCurrentRoom(socket);
      console.log('[Socket] currentRoom:', currentRoom);
      if (!currentRoom) {
        console.log('[Socket] No room found, returning failure');
        callback?.({ success: false });
        return;
      }

      console.log('[Socket] Calling drawingService.undoStroke...');
      const result = await this.drawingService.undoStroke(currentRoom, socket.id);
      console.log('[Socket] undoStroke result:', result);
      callback?.(result);
      console.log('[Socket] Callback invoked with result');
    } catch (error) {
      console.error('[Socket] Error undoing stroke:', error);
      callback?.({ success: false });
    }
  }

  private async handleRedoStroke(
    socket: Socket,
    callback?: (result: { success: boolean }) => void
  ): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.({ success: false });
        return;
      }

      const result = await this.drawingService.redoStroke(currentRoom, socket.id);
      callback?.(result);
    } catch (error) {
      console.error('[Socket] Error redoing stroke:', error);
      callback?.({ success: false });
    }
  }

  private handleCursorMove(socket: Socket, position: Point): void {
    try {
      const user = this.userService.updateCursor(socket.id, position);
      if (!user || !user.roomId) return;

      socket.to(user.roomId).emit('cursorMove', {
        userId: socket.id,
        position,
      });
    } catch (error) {
      console.error('[Socket] Error handling cursor move:', error);
    }
  }

  private handleDrawingState(socket: Socket, isDrawing: boolean): void {
    try {
      const user = this.userService.updateDrawingState(socket.id, isDrawing);
      if (!user || !user.roomId) return;

      socket.to(user.roomId).emit('drawingState', {
        userId: socket.id,
        isDrawing,
      });
    } catch (error) {
      console.error('[Socket] Error handling drawing state:', error);
    }
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (currentRoom) {
        await this.leaveRoom(socket, currentRoom);
      }

      this.userService.removeUser(socket.id);
    } catch (error) {
      console.error('[Socket] Error handling disconnect:', error);
    }
  }

  private async leaveRoom(socket: Socket, roomId: string): Promise<void> {
    const remainingUsers = await this.roomService.removeUserFromRoom(roomId, socket.id);
    await socket.leave(roomId);
    this.userService.setUserRoom(socket.id, undefined);

    // Notify others
    socket.to(roomId).emit('userLeft', socket.id);

    console.log(`[Socket] User ${socket.id} left room ${roomId} (remaining: ${remainingUsers})`);

    // Schedule cleanup if room is empty
    if (remainingUsers === 0) {
      // Will be handled by CleanupManager
    }
  }

  private getCurrentRoom(socket: Socket): string | undefined {
    const rooms = Array.from(socket.rooms);
    return rooms.find(room => room !== socket.id);
  }
}