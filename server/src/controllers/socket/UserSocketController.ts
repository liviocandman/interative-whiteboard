import { Socket } from 'socket.io';
import { UserService } from '../../services/UserService';
import type { Point } from '../../types';

export class UserSocketController {
  private userService: UserService;

  constructor() {
    this.userService = UserService.getInstance();
  }

  handleUserSetup(socket: Socket, data: { name: string; color: string }): void {
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

  handleCursorMove(socket: Socket, position: Point): void {
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

  handleDrawingState(socket: Socket, isDrawing: boolean): void {
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

  handleDisconnect(socket: Socket): void {
    try {
      this.userService.removeUser(socket.id);
      console.log(`[Socket] User removed: ${socket.id}`);
    } catch (error) {
      console.error('[Socket] Error removing user:', error);
    }
  }
}
