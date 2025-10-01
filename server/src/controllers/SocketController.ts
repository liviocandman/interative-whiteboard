// server/src/controllers/SocketController.ts
import { Server, Socket } from 'socket.io';
import { SessionManager } from '../services/managers/SessionManager';
import { DrawingHandler } from '../services/handlers/DrawingHandler';
import { RoomHandler } from '../services/handlers/RoomHandler';
import { StateHandler } from '../services/handlers/StateHandler';


export class SocketController {
  private sessionManager: SessionManager;
  private drawingHandler: DrawingHandler;
  private roomHandler: RoomHandler;
  private stateHandler: StateHandler;

  constructor(private io: Server) {
    this.sessionManager = new SessionManager();
    this.drawingHandler = new DrawingHandler(io);
    this.roomHandler = new RoomHandler(io, this.sessionManager);
    this.stateHandler = new StateHandler();
  }

  setupSocketHandlers(socket: Socket): void {
    console.log(`[SocketController] Client connected: ${socket.id}`);

    // Registra handlers de eventos
    this.registerEventHandlers(socket);
    
    // Setup session tracking
    this.sessionManager.initSession(socket.id);

    // Handle disconnect
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
  }

  private registerEventHandlers(socket: Socket): void {
    socket.on('joinRoom', (roomId: string, ack?: (error?: string) => void) => {
      this.roomHandler.handleJoinRoom(socket, roomId, ack);
    });

    socket.on('drawing', (stroke: any) => {
      this.drawingHandler.handleDrawing(socket, stroke);
    });

    socket.on('saveState', (snapshot: string, ack?: (error?: string) => void) => {
      this.stateHandler.handleSaveState(socket, snapshot, ack);
    });

    socket.on('leaveRoom', (ack?: (error?: string) => void) => {
      this.roomHandler.handleLeaveRoom(socket, ack);
    });

    socket.on('resetBoard', (ack?: (error?: string) => void) => {
      this.stateHandler.handleResetBoard(socket, ack);
    });

    // Atividade do usuário para renovar TTL
    const activityEvents = ['drawing', 'saveState', 'joinRoom'];
    activityEvents.forEach(event => {
      socket.on(event, () => {
        this.sessionManager.markActivity(socket.id);
      });
    });
  }

  private async handleDisconnect(socket: Socket, reason: string): Promise<void> {
    console.log(`[SocketController] Client disconnected: ${socket.id}, reason: ${reason}`);
    
    try {
      // Cleanup da sessão e sala
      await this.roomHandler.handleDisconnect(socket);
      await this.sessionManager.cleanup(socket.id);
    } catch (error) {
      console.error(`[SocketController] Error during disconnect cleanup:`, error);
    }
  }
}