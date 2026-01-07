import { Server } from 'socket.io';
import { StrokeService } from './StrokeService';
import { StateService } from './StateService';
import type { Stroke, CanvasState } from '../types';

interface UndoneStroke {
  stroke: Stroke;
  index: number;
}

export class DrawingService {
  private strokeService: StrokeService;
  private stateService: StateService;
  private io: Server;

  // Track undone strokes per user per room
  private undoneStrokes: Map<string, Map<string, UndoneStroke[]>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.strokeService = new StrokeService();
    this.stateService = new StateService();
  }

  /**
   * Get initial canvas state for a room (strokes + snapshot)
   */
  async getInitialState(roomId: string): Promise<CanvasState> {
    const [strokes, snapshot] = await Promise.all([
      this.strokeService.getStrokes(roomId),
      this.stateService.getCanvasState(roomId)
    ]);

    return {
      strokes,
      snapshot
    };
  }

  /**
   * Handle a new stroke from a user
   */
  async handleStroke(roomId: string, stroke: Stroke, userId: string): Promise<void> {
    // Ensure stroke has userId
    stroke.userId = userId;

    // Save stroke to Redis
    await this.strokeService.saveAndBroadcast(roomId, stroke, userId);

    // NOTE: Broadcast is handled in socket handler using socket.to(roomId) 
    // to exclude the sender and avoid duplicate strokes

    // Clear undo stack for this user when they draw something new
    this.clearUndoStack(roomId, userId);

    console.log(`[DrawingService] Stroke saved for room ${roomId} by user ${userId}`);
  }

  /**
   * Undo last stroke for a user
   * Removes all stroke segments with the same strokeId (entire drawing gesture)
   */
  async undoStroke(roomId: string, userId: string): Promise<{ success: boolean; strokeId?: string }> {
    try {
      // Get all strokes for the room
      const strokes = await this.strokeService.getStrokes(roomId);

      // Find the last stroke by this user
      let lastUserStrokeIndex = -1;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].userId === userId) {
          lastUserStrokeIndex = i;
          break;
        }
      }

      if (lastUserStrokeIndex === -1) {
        console.log(`[DrawingService] No strokes to undo for user ${userId}`);
        return { success: false };
      }

      const undoneStroke = strokes[lastUserStrokeIndex];
      const strokeIdToRemove = undoneStroke.strokeId;

      // Find all strokes with the same strokeId (entire drawing gesture)
      let strokesToUndo: typeof strokes = [];
      if (strokeIdToRemove) {
        strokesToUndo = strokes.filter(s => s.strokeId === strokeIdToRemove && s.userId === userId);
      } else {
        // If no strokeId, just remove the single stroke (legacy behavior)
        strokesToUndo = [undoneStroke];
      }

      // Store undone strokes for potential redo
      for (const stroke of strokesToUndo) {
        this.addToUndoStack(roomId, userId, {
          stroke,
          index: strokes.indexOf(stroke)
        });
      }

      // Remove all strokes with the same strokeId from Redis and rebuild
      const newStrokes = strokes.filter(s => {
        if (strokeIdToRemove) {
          return !(s.strokeId === strokeIdToRemove && s.userId === userId);
        }
        return s !== undoneStroke;
      });

      await this.rebuildStrokes(roomId, newStrokes);

      // Broadcast the updated state to all users in the room
      const newState = await this.getInitialState(roomId);
      this.io.to(roomId).emit('initialState', newState);

      console.log(`[DrawingService] Undo successful for user ${userId} in room ${roomId}. Removed ${strokesToUndo.length} stroke segments.`);
      return { success: true, strokeId: strokeIdToRemove || `${undoneStroke.timestamp}` };
    } catch (error) {
      console.error('[DrawingService] Undo failed:', error);
      return { success: false };
    }
  }

  /**
   * Redo last undone stroke for a user
   */
  async redoStroke(roomId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const undoneStroke = this.popFromUndoStack(roomId, userId);

      if (!undoneStroke) {
        console.log(`[DrawingService] No strokes to redo for user ${userId}`);
        return { success: false };
      }

      // Re-add the stroke
      await this.strokeService.saveAndBroadcast(roomId, undoneStroke.stroke, userId);

      // Broadcast the updated state to all users in the room
      const newState = await this.getInitialState(roomId);
      this.io.to(roomId).emit('initialState', newState);

      console.log(`[DrawingService] Redo successful for user ${userId} in room ${roomId}`);
      return { success: true };
    } catch (error) {
      console.error('[DrawingService] Redo failed:', error);
      return { success: false };
    }
  }

  /**
   * Clear all strokes and notify room
   */
  async clearBoard(roomId: string, userId: string): Promise<void> {
    await this.strokeService.clearStrokes(roomId);
    await this.stateService.deleteCanvasState(roomId);

    // Clear all undo stacks for this room
    this.undoneStrokes.delete(roomId);

    // Broadcast clear event to all in room
    this.io.to(roomId).emit('clearBoard');

    console.log(`[DrawingService] Board cleared for room ${roomId} by user ${userId}`);
  }

  /**
   * Rebuild strokes in Redis (used after undo)
   */
  private async rebuildStrokes(roomId: string, strokes: Stroke[]): Promise<void> {
    // Clear existing strokes
    await this.strokeService.clearStrokes(roomId);

    // Re-add all strokes
    for (const stroke of strokes) {
      await this.strokeService.saveAndBroadcast(roomId, stroke, stroke.userId || 'unknown');
    }
  }

  // Undo stack management
  private getUndoStack(roomId: string, userId: string): UndoneStroke[] {
    if (!this.undoneStrokes.has(roomId)) {
      this.undoneStrokes.set(roomId, new Map());
    }
    const roomMap = this.undoneStrokes.get(roomId)!;
    if (!roomMap.has(userId)) {
      roomMap.set(userId, []);
    }
    return roomMap.get(userId)!;
  }

  private addToUndoStack(roomId: string, userId: string, undone: UndoneStroke): void {
    const stack = this.getUndoStack(roomId, userId);
    stack.push(undone);
    // Limit stack size
    if (stack.length > 20) {
      stack.shift();
    }
  }

  private popFromUndoStack(roomId: string, userId: string): UndoneStroke | undefined {
    const stack = this.getUndoStack(roomId, userId);
    return stack.pop();
  }

  private clearUndoStack(roomId: string, userId: string): void {
    const roomMap = this.undoneStrokes.get(roomId);
    if (roomMap) {
      roomMap.set(userId, []);
    }
  }
}
