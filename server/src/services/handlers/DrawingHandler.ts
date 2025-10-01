import { Server, Socket } from 'socket.io';
import { StrokeService } from '../core/StrokeService';
import { validateStroke } from '../../utils/validation';
import type { Stroke } from '../../types';

export class DrawingHandler {
  private strokeService: StrokeService;

  constructor(private io: Server) {
    this.strokeService = new StrokeService();
  }

  async handleDrawing(socket: Socket, stroke: unknown): Promise<void> {
    try {
      // Validação do stroke
      const validatedStroke = validateStroke(stroke);
      if (!validatedStroke) {
        socket.emit('error', { 
          event: 'drawing', 
          message: 'Invalid stroke data' 
        });
        return;
      }

      // Obter sala atual do socket
      const rooms = Array.from(socket.rooms);
      const currentRoom = rooms.find(room => room !== socket.id);
      
      if (!currentRoom) {
        socket.emit('error', { 
          event: 'drawing', 
          message: 'Not in a room' 
        });
        return;
      }

      // Salvar e transmitir stroke
      const result = await this.strokeService.saveAndBroadcast(
        currentRoom,
        validatedStroke,
        socket.id
      );

      // Fallback para transmissão local se Pub/Sub falhar
      if (result.publishCount === 0) {
        console.warn(`[DrawingHandler] Pub/Sub failed, using local broadcast`);
        socket.to(currentRoom).emit('drawing', validatedStroke);
      }

    } catch (error) {
      console.error(`[DrawingHandler] Error handling drawing:`, error);
      socket.emit('error', { 
        event: 'drawing', 
        message: 'Internal server error' 
      });
    }
  }
}