import { Server, Socket } from 'socket.io';
import { RoomService } from '../core/RoomService';
import { SessionManager } from '../managers/SessionManager';
import { CleanupManager } from '../managers/CleanupManager';
import { validateRoomId } from '../../utils/validation';

export class RoomHandler {
  private roomService: RoomService;
  private cleanupManager: CleanupManager;

  constructor(
    private io: Server,
    private sessionManager: SessionManager
  ) {
    this.roomService = new RoomService();
    this.cleanupManager = CleanupManager.getInstance();
  }

  async handleJoinRoom(
    socket: Socket, 
    roomId: string, 
    ack?: (error?: string) => void
  ): Promise<void> {
    try {
      // Validar roomId
      if (!validateRoomId(roomId)) {
        ack?.('Invalid room ID');
        return;
      }

      // Sair da sala anterior se necessário
      const currentRoom = this.sessionManager.getCurrentRoom(socket.id);
      if (currentRoom && currentRoom !== roomId) {
        await this.leaveRoom(socket, currentRoom);
      }

      // Adicionar à nova sala
      const userCount = await this.roomService.addUser(roomId, socket.id);
      await socket.join(roomId);
      await this.sessionManager.joinRoom(socket.id, roomId);

      // Cancelar cleanup se sala não está mais vazia
      this.cleanupManager.cancelCleanup(roomId);

      // Enviar estado inicial
      const initialState = await this.roomService.getInitialState(roomId);
      socket.emit('initialState', initialState);

      console.log(`[RoomHandler] Socket ${socket.id} joined room ${roomId} (users: ${userCount})`);
      ack?.();

    } catch (error) {
      console.error(`[RoomHandler] Error joining room:`, error);
      ack?.((error as Error).message || 'Failed to join room');
    }
  }

  async handleLeaveRoom(
    socket: Socket,
    ack?: (error?: string) => void
  ): Promise<void> {
    try {
      const currentRoom = this.sessionManager.getCurrentRoom(socket.id);
      if (!currentRoom) {
        ack?.('Not in a room');
        return;
      }

      await this.leaveRoom(socket, currentRoom);
      ack?.();

    } catch (error) {
      console.error(`[RoomHandler] Error leaving room:`, error);
      ack?.((error as Error).message || 'Failed to leave room');
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const currentRoom = this.sessionManager.getCurrentRoom(socket.id);
    if (currentRoom) {
      await this.leaveRoom(socket, currentRoom);
    }
  }

  private async leaveRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      const remainingUsers = await this.roomService.removeUser(roomId, socket.id);
      socket.leave(roomId);
      await this.sessionManager.leaveRoom(socket.id);

      // Agendar cleanup se sala ficar vazia
      if (remainingUsers === 0) {
        this.cleanupManager.scheduleCleanup(roomId);
      }

      console.log(`[RoomHandler] Socket ${socket.id} left room ${roomId} (remaining: ${remainingUsers})`);

    } catch (error) {
      console.error(`[RoomHandler] Error in leaveRoom:`, error);
      throw error;
    }
  }
}