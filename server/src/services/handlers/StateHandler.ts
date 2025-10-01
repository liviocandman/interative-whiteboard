import { Socket } from 'socket.io';
import { StateService } from '../core/StateService';
import { StrokeService } from '../core/StrokeService';
import { RedisService } from '../core/RedisService';

export class StateHandler {
  private stateService: StateService;
  private strokeService: StrokeService;
  private redis: RedisService;

  constructor() {
    this.stateService = new StateService();
    this.strokeService = new StrokeService();
    this.redis = RedisService.getInstance();
  }

  async handleSaveState(
    socket: Socket,
    snapshot: string,
    ack?: (error?: string) => void
  ): Promise<void> {
    try {
      // Obter sala atual
      const rooms = Array.from(socket.rooms);
      const currentRoom = rooms.find(room => room !== socket.id);
      
      if (!currentRoom) {
        ack?.('Not in a room');
        return;
      }

      // Validar snapshot
      if (!snapshot || typeof snapshot !== 'string') {
        ack?.('Invalid snapshot data');
        return;
      }

      // Salvar estado
      await this.stateService.saveCanvasState(currentRoom, snapshot);
      ack?.();

    } catch (error) {
      console.error(`[StateHandler] Error saving state:`, error);
      ack?.((error as Error).message || 'Failed to save state');
    }
  }

  async handleResetBoard(
    socket: Socket,
    ack?: (error?: string) => void
  ): Promise<void> {
    try {
      // Obter sala atual
      const rooms = Array.from(socket.rooms);
      const currentRoom = rooms.find(room => room !== socket.id);
      
      if (!currentRoom) {
        ack?.('Not in a room');
        return;
      }

      // Limpar estado e strokes
      await Promise.all([
        this.stateService.deleteCanvasState(currentRoom),
        this.strokeService.clearStrokes(currentRoom),
      ]);

      // Publicar evento de reset
      await this.redis.publish(
        `room:${currentRoom}`,
        JSON.stringify({ reset: true, origin: socket.id })
      );

      // Emitir para o próprio socket também
      socket.emit('clearBoard');
      
      ack?.();

    } catch (error) {
      console.error(`[StateHandler] Error resetting board:`, error);
      ack?.((error as Error).message || 'Failed to reset board');
    }
  }
}