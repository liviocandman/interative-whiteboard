import { Socket } from 'socket.io';
import { RoomService } from '../../services/RoomService';
import { UserService } from '../../services/UserService';

export class RoomSocketController {
  private roomService: RoomService;
  private userService: UserService;

  constructor() {
    this.roomService = new RoomService();
    this.userService = new UserService();
  }

  async handleJoinRoom(
    socket: Socket,
    roomId: string,
    callback?: (error?: string) => void
  ): Promise<void> {
    console.log(`[RoomController] START handleJoinRoom - socket: ${socket.id}, room: ${roomId}`);
    try {
      // Check if room exists
      console.log(`[RoomController] Checking if room ${roomId} exists...`);
      const roomExists = await this.roomService.roomExists(roomId);
      if (!roomExists) {
        console.log(`[RoomController] Room ${roomId} does not exist, auto-creating...`);

        // Auto-create room with default settings
        const user = this.userService.getUser(socket.id);
        const createdBy = user
          ? { id: user.id, name: user.name }
          : { id: socket.id, name: 'Anonymous' };

        await this.roomService.createRoomWithId(roomId, {
          name: `Room ${roomId.split('-').pop()?.slice(0, 8) || 'Untitled'}`,
          description: 'Auto-created collaborative whiteboard room',
          isPublic: true,
          maxUsers: 50,
          tags: ['auto-created'],
          settings: {
            allowDrawing: true,
            allowChat: false,
            allowExport: true,
            requireApproval: false,
            backgroundColor: '#ffffff',
            canvasSize: 'large',
            enableGrid: false,
            enableRulers: false,
            autoSave: true,
            historyLimit: 50,
          }
        }, createdBy);

        console.log(`[RoomController] Room ${roomId} auto-created ✓`);
      } else {
        console.log(`[RoomController] Room ${roomId} exists ✓`);
      }

      // Leave current room if any
      const currentRoom = this.getCurrentRoom(socket);
      if (currentRoom && currentRoom !== roomId) {
        console.log(`[RoomController] Leaving current room ${currentRoom}`);
        await this.handleLeaveRoomInternal(socket, currentRoom);
      }

      // Join new room
      console.log(`[RoomController] Joining socket.io room ${roomId}...`);
      await socket.join(roomId);
      console.log(`[RoomController] Socket.io join completed ✓`);

      console.log(`[RoomController] Adding user ${socket.id} to RoomService...`);
      await this.roomService.addUserToRoom(roomId, socket.id);
      console.log(`[RoomController] User added to RoomService ✓`);

      console.log(`[RoomController] Setting user room in UserService...`);
      this.userService.setUserRoom(socket.id, roomId);
      console.log(`[RoomController] User room set ✓`);

      // Get room users and send to joining user
      const roomUsers = this.userService.getUsersByRoom(roomId);
      const currentUser = this.userService.getUser(socket.id);

      // Notify others about new user
      if (currentUser) {
        console.log(`[RoomController] Notifying other users about ${socket.id}`);
        socket.to(roomId).emit('userJoined', currentUser);
      } else {
        console.warn(`[RoomController] WARNING: currentUser not found for ${socket.id}`);
      }

      // Send all users to the joining user
      socket.emit('roomUsers', roomUsers);

      console.log(`[RoomController] ✅ User ${socket.id} successfully joined room ${roomId}`);
      callback?.();
    } catch (error) {
      console.error(`[RoomController] ERROR joining room ${roomId}:`, error);
      callback?.(error instanceof Error ? error.message : 'Failed to join room');
    }
  }

  async handleLeaveRoom(
    socket: Socket,
    callback?: (error?: string) => void
  ): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (!currentRoom) {
        callback?.('Not in a room');
        return;
      }

      await this.handleLeaveRoomInternal(socket, currentRoom);
      callback?.();
    } catch (error) {
      console.error('[Socket] Error leaving room:', error);
      callback?.(error instanceof Error ? error.message : 'Failed to leave room');
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const currentRoom = this.getCurrentRoom(socket);
      if (currentRoom) {
        await this.handleLeaveRoomInternal(socket, currentRoom);
      }
    } catch (error) {
      console.error('[Socket] Error handling disconnect:', error);
    }
  }

  private async handleLeaveRoomInternal(socket: Socket, roomId: string): Promise<void> {
    const remainingUsers = await this.roomService.removeUserFromRoom(roomId, socket.id);
    await socket.leave(roomId);
    this.userService.setUserRoom(socket.id, undefined);

    // Notify others
    socket.to(roomId).emit('userLeft', socket.id);

    console.log(`[Socket] User ${socket.id} left room ${roomId} (remaining: ${remainingUsers})`);
  }

  private getCurrentRoom(socket: Socket): string | undefined {
    const rooms = Array.from(socket.rooms);
    return rooms.find(room => room !== socket.id);
  }
}
