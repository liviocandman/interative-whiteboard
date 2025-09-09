import { Server } from "socket.io";
import { pubClient, subClient } from "../config/redis";
import { addUserToRoom, removeUserFromRoom, deleteRoom } from "../services/roomService";
import { saveCanvasState, getCanvasState, deleteCanvasState } from "../services/stateService";

export async function setupSocket(io: Server) {

  await subClient.pSubscribe("room:*", (message, channel) => {
    const [, roomId] = channel.split(":");
    io.to(roomId).emit("drawing", JSON.parse(message));
  });

  io.on("connection", (socket) => {
    console.log("Socket connect:", socket.id);
    let joinedRoom: string | null = null;

    socket.on("joinRoom", async (roomId: string) => {
      joinedRoom = roomId;
      socket.join(roomId);
      await addUserToRoom(roomId, socket.id);

      const state = await getCanvasState(roomId);
      socket.emit("initialState", state);
    });


    socket.on("drawing", async (stroke: any) => {
      if (!joinedRoom) return;
      socket.emit("drawing", stroke);
      await pubClient.publish(`room:${joinedRoom}`, JSON.stringify(stroke));
    });

    
    socket.on("saveState", async (canvasState) => {
      if (!joinedRoom) return;
      await saveCanvasState(joinedRoom, canvasState);
    });

    socket.on("leaveRoom", async () => {
      if (!joinedRoom) return;
      await removeUserFromRoom(joinedRoom, socket.id);
      await deleteCanvasState(joinedRoom);
      socket.leave(joinedRoom);
      joinedRoom = null;
    });
        
    socket.on("disconnecting", async () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          await removeUserFromRoom(roomId, socket.id);
          await deleteRoom(roomId);
        }
      }
    });
  });
}