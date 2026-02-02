import { Server, Socket } from 'socket.io';
import {
  RoomSocketController,
  DrawingSocketController,
  UserSocketController
} from '../../controllers/socket';

export function setupSocketRoutes(io: Server): void {
  const roomController = new RoomSocketController();
  const userController = new UserSocketController();

  // Create DrawingSocketController ONCE, shared across all connections
  const drawingController = new DrawingSocketController(io);

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // User setup
    socket.on('userSetup', (data: { userId: string; name: string; color: string }) => {
      userController.handleUserSetup(socket, data);
    });

    // Room events
    socket.on('joinRoom', async (roomId: string, callback?: (error?: string) => void) => {
      await roomController.handleJoinRoom(socket, roomId, callback);
      // Get initial state after joining
      await drawingController.getInitialState(socket, roomId);
    });

    socket.on('leaveRoom', (callback?: (error?: string) => void) => {
      roomController.handleLeaveRoom(socket, callback);
    });

    // Drawing events
    socket.on('drawing', (stroke: any) => {
      drawingController.handleDrawing(socket, stroke);
    });

    socket.on('drawing_batch', (batch: any[]) => {
      drawingController.handleDrawingBatch(socket, batch);
    });

    socket.on('saveState', (snapshot: string, callback?: (error?: string) => void) => {
      drawingController.handleSaveState(socket, snapshot, callback);
    });

    socket.on('resetBoard', (callback?: (error?: string) => void) => {
      drawingController.handleResetBoard(socket, callback);
    });

    // Undo/Redo events
    socket.on('undoStroke', async (callback?: (result: { success: boolean; strokeId?: string }) => void) => {
      console.log('[Socket] undoStroke event received from:', socket.id);
      await drawingController.handleUndoStroke(socket, callback);
    });

    socket.on('redoStroke', async (callback?: (result: { success: boolean }) => void) => {
      console.log('[Socket] redoStroke event received from:', socket.id);
      await drawingController.handleRedoStroke(socket, callback);
    });

    // User interaction events
    socket.on('cursorMove', (position: { x: number; y: number }) => {
      userController.handleCursorMove(socket, position);
    });

    socket.on('drawingState', (isDrawing: boolean) => {
      userController.handleDrawingState(socket, isDrawing);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      await roomController.handleDisconnect(socket);
      userController.handleDisconnect(socket);
    });
  });
}
