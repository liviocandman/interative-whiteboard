import { Server } from 'socket.io';
import { StrokeService } from './StrokeService';
import { StateService } from './StateService';
import type { Stroke, CanvasState } from '../types';

/**
 * Represents a group of undone strokes (all segments of a single drawing gesture)
 */
interface UndoneStrokeGroup {
  strokes: Stroke[];   // All stroke segments with the same strokeId
  strokeId: string;    // The strokeId that groups these strokes
}

export class DrawingService {
  private strokeService: StrokeService;
  private stateService: StateService;
  private io: Server;

  // Track undone stroke groups per user per room
  private undoneStrokes: Map<string, Map<string, UndoneStrokeGroup[]>> = new Map();

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

    // Save stroke to Redis as a single-item batch
    await this.strokeService.saveAndBroadcastBatch(roomId, [stroke], userId);

    // Clear undo stack for this user when they draw something new
    this.clearUndoStack(roomId, userId);

    console.log(`[DrawingService] Stroke saved for room ${roomId} by user ${userId}`);
  }

  /**
   * Handle a batch of strokes from a user
   */
  async handleBatch(roomId: string, strokes: Stroke[], userId: string): Promise<void> {
    // Ensure all strokes have userId
    strokes.forEach(s => s.userId = userId);

    // Save batch to Redis and broadcast
    await this.strokeService.saveAndBroadcastBatch(roomId, strokes, userId);

    // Clear undo stack for this user when they draw something new
    this.clearUndoStack(roomId, userId);

    console.log(`[DrawingService] Batch of ${strokes.length} strokes saved for room ${roomId} by user ${userId}`);
  }

  /**
   * Undo last stroke for a user
   * Removes all stroke segments with the same strokeId (entire drawing gesture)
   * Emits targeted strokeRemoved event instead of full initialState for better performance
   */
  async undoStroke(roomId: string, userId: string): Promise<{ success: boolean; strokeId?: string }> {
    try {
      // Get all strokes for the room to find the last one by this user
      const strokes = await this.strokeService.getStrokes(roomId);

      // Find the last stroke by this user
      let lastUserStroke: Stroke | undefined;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].userId === userId) {
          lastUserStroke = strokes[i];
          break;
        }
      }

      if (!lastUserStroke) {
        console.log(`[DrawingService] No strokes to undo for user ${userId}`);
        return { success: false };
      }

      const strokeIdToRemove = lastUserStroke.strokeId || `${lastUserStroke.timestamp}`;

      // Remove all strokes with this strokeId using the optimized method
      const removedStrokes = await this.strokeService.removeStrokesByStrokeId(
        roomId,
        strokeIdToRemove,
        userId
      );

      if (removedStrokes.length === 0) {
        return { success: false };
      }

      // Store all removed strokes as a single group for potential redo
      this.addToUndoStack(roomId, userId, {
        strokes: removedStrokes,
        strokeId: strokeIdToRemove
      });

      // Emit targeted strokeRemoved event instead of full initialState
      // This allows clients to remove just the affected strokes without full canvas redraw
      this.io.to(roomId).emit('strokeRemoved', {
        strokeId: strokeIdToRemove,
        userId: userId
      });

      console.log(`[DrawingService] Undo successful for user ${userId} in room ${roomId}. Removed ${removedStrokes.length} stroke segments.`);
      return { success: true, strokeId: strokeIdToRemove };
    } catch (error) {
      console.error('[DrawingService] Undo failed:', error);
      return { success: false };
    }
  }

  /**
   * Redo last undone stroke group for a user
   * Restores all stroke segments at once, not one by one
   */
  async redoStroke(roomId: string, userId: string): Promise<{ success: boolean; strokeId?: string }> {
    try {
      const undoneGroup = this.popFromUndoStack(roomId, userId);

      if (!undoneGroup) {
        console.log(`[DrawingService] No strokes to redo for user ${userId}`);
        return { success: false };
      }

      // Re-add all strokes in the group to Redis
      for (const stroke of undoneGroup.strokes) {
        await this.strokeService.addStroke(roomId, stroke);
      }

      // Emit a single strokeAdded event with all strokes
      this.io.to(roomId).emit('strokeAdded', {
        strokes: undoneGroup.strokes,
        strokeId: undoneGroup.strokeId,
        userId: userId
      });

      console.log(`[DrawingService] Redo successful for user ${userId} in room ${roomId}. Restored ${undoneGroup.strokes.length} stroke segments.`);
      return { success: true, strokeId: undoneGroup.strokeId };
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
  /**
   * Rebuild strokes in Redis (used after undo)
   */
  private async rebuildStrokes(roomId: string, strokes: Stroke[]): Promise<void> {
    // Clear existing strokes
    await this.strokeService.clearStrokes(roomId);

    // Re-add all strokes
    for (const stroke of strokes) {
      await this.strokeService.saveAndBroadcastBatch(roomId, [stroke], stroke.userId || 'unknown');
    }
  }

  // Undo stack management
  private getUndoStack(roomId: string, userId: string): UndoneStrokeGroup[] {
    if (!this.undoneStrokes.has(roomId)) {
      this.undoneStrokes.set(roomId, new Map());
    }
    const roomMap = this.undoneStrokes.get(roomId)!;
    if (!roomMap.has(userId)) {
      roomMap.set(userId, []);
    }
    return roomMap.get(userId)!;
  }

  private addToUndoStack(roomId: string, userId: string, undone: UndoneStrokeGroup): void {
    const stack = this.getUndoStack(roomId, userId);
    stack.push(undone);
    // Limit stack size (20 stroke groups = 20 undo operations)
    if (stack.length > 20) {
      stack.shift();
    }
  }

  private popFromUndoStack(roomId: string, userId: string): UndoneStrokeGroup | undefined {
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
