import { Socket } from 'socket.io';
import { DrawingService } from '../../services/DrawingService';
import { StateService } from '../../services/StateService';
import { StrokeModel } from '../../models';

export class DrawingSocketController {
  private drawingService: DrawingService;
  private stateService: StateService;

  constructor(private io: any) {
    this.drawingService = new DrawingService(io);
    this.stateService = new StateService();
  }

  async handleDrawing(socket: Socket, stroke: any): Promise<void> {
    try {
      const validatedStroke = StrokeModel.validate(stroke);
      if (!validatedStroke) {
        console.warn(`[DrawingController] Invalid stroke from ${socket.id}:`, stroke);
        socket.emit('error', {
          event: 'drawing',
          message: 'Invalid stroke data',
          timestamp: Date.now(),
        });
        return;
      }

      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        console.warn(`[DrawingController] Socket ${socket.id} not in a room`);
        socket.emit('error', {
          event: 'drawing',
          message: 'Not in a room',
          timestamp: Date.now(),
        });
        return;
      }

      // Add user ID to stroke
      const strokeWithUser = StrokeModel.addUserId(validatedStroke, socket.id);

      console.log(`[DrawingController] Processing stroke in room ${currentRoom} from ${socket.id}`);

      // Save and broadcast
      await this.drawingService.handleStroke(currentRoom, strokeWithUser, socket.id);

      console.log(`[DrawingController] Stroke saved and broadcasted to room ${currentRoom}`);
    } catch (error) {
      console.error('[DrawingController] Error handling drawing:', error);
      socket.emit('error', {
        event: 'drawing',
        message: 'Internal server error',
        timestamp: Date.now(),
      });
    }
  }

  async handleSaveState(
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

  async handleResetBoard(
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

  async getInitialState(socket: Socket, roomId: string): Promise<void> {
    try {
      const initialState = await this.drawingService.getInitialState(roomId);
      socket.emit('initialState', initialState);
    } catch (error) {
      console.error('[Socket] Error getting initial state:', error);
      socket.emit('error', {
        event: 'initialState',
        message: 'Failed to get initial state',
        timestamp: Date.now(),
      });
    }
  }

  async handleUndoStroke(
    socket: Socket,
    callback?: (result: { success: boolean; strokeId?: string }) => void
  ): Promise<void> {
    console.log('[DrawingController] handleUndoStroke called for socket:', socket.id);
    try {
      const currentRoom = this.getCurrentRoom(socket);
      console.log('[DrawingController] currentRoom:', currentRoom);
      if (!currentRoom) {
        console.log('[DrawingController] No room found, returning false');
        callback?.({ success: false });
        return;
      }

      console.log('[DrawingController] Calling drawingService.undoStroke...');
      const result = await this.drawingService.undoStroke(currentRoom, socket.id);
      console.log('[DrawingController] undoStroke result:', result);
      callback?.(result);
    } catch (error) {
      console.error('[DrawingController] Error undoing stroke:', error);
      callback?.({ success: false });
    }
  }

  async handleRedoStroke(
    socket: Socket,
    callback?: (result: { success: boolean }) => void
  ): Promise<void> {
    console.log('[DrawingController] handleRedoStroke called for socket:', socket.id);
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.({ success: false });
        return;
      }

      const result = await this.drawingService.redoStroke(currentRoom, socket.id);
      callback?.(result);
    } catch (error) {
      console.error('[DrawingController] Error redoing stroke:', error);
      callback?.({ success: false });
    }
  }

  private getCurrentRoom(socket: Socket): string | undefined {
    const rooms = Array.from(socket.rooms);
    return rooms.find(room => room !== socket.id);
  }
}
