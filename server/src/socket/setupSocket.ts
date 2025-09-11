import { Server } from "socket.io";
import { pubClient, subClient } from "../config/redis";
import {
  saveCanvasState,
  getCanvasState,
  deleteCanvasState,
} from "../services/stateService";
import {
  addUserToRoom,
  removeUserFromRoom,
  deleteRoom,
} from "../services/roomService";
import {
  Stroke,
  getRoomStrokes,
  publishStroke,
  deleteRoomStrokes,
} from "../services/strokeService";

const REDIS_ROOM_PREFIX = "room:";

export async function setupSocket(io: Server) {
  // Subscriber global para strokes de outras instâncias
  try {
    await subClient.pSubscribe(`${REDIS_ROOM_PREFIX}*`, (rawMessage, channel) => {
      try {
        const roomId = channel.substring(REDIS_ROOM_PREFIX.length);
        if (!roomId) return;

        const { stroke, origin }: { stroke: Stroke; origin?: string } = JSON.parse(rawMessage);
        io.in(roomId).except(origin ?? []).emit("drawing", stroke);
      } catch (err) {
        console.error("Redis pSubscribe handler error:", err);
      }
    });
    console.log("🔔 Redis pSubscribe registrado em pattern 'room:*'");
  } catch (err) {
    console.error("Falha ao registrar pSubscribe no Redis:", err);
  }

  // Cancela inscrição no Redis ao encerrar processo
  process.once("SIGINT", async () => {
    try {
      await subClient.pUnsubscribe(`${REDIS_ROOM_PREFIX}*`);
      console.log("🔕 Redis pUnsubscribe executado");
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });

  // Limpa estado, metadados e strokes quando sala fica vazia
  async function cleanupRoomWhenEmpty(roomId: string, count: number) {
    if (count !== 0) {
      console.log(`Sala ${roomId} com ${count} usuário(s) — mantida`);
      return;
    }
    console.log(`🧹 Sala ${roomId} vazia — apagando estado e removendo sala`);
    await Promise.all([
      deleteCanvasState(roomId),
      deleteRoom(roomId),
      deleteRoomStrokes(roomId),
    ]).catch((err) => console.error("Erro no cleanup:", err));
  }

  io.on("connection", (socket) => {
    console.log(`🟢 Socket conectado: ${socket.id}`);
    let joinedRoom: string | null = null;

    socket.on("joinRoom", async (roomId: string, ack?: (err?: string) => void) => {
      if (!roomId) {
        ack?.("roomId inválido");
        return;
      }

      // Sai da sala anterior se necessário
      if (joinedRoom && joinedRoom !== roomId) {
        try {
          const prevCount = await removeUserFromRoom(joinedRoom, socket.id);
          socket.leave(joinedRoom);
          await cleanupRoomWhenEmpty(joinedRoom, prevCount);
        } catch (err) {
          console.error("Erro ao sair de sala anterior:", err);
        } finally {
          joinedRoom = null;
        }
      }

      // Registra no serviço e entra na sala
      try {
        const newCount = await addUserToRoom(roomId, socket.id);
        socket.join(roomId);
        joinedRoom = roomId;
        console.log(`📌 ${socket.id} entrou na sala ${roomId} (${newCount} usuários)`);
      } catch (err: any) {
        console.error("Falha addUserToRoom:", err);
        ack?.(err.message || "Erro ao registrar usuário");
        return;
      }

      // Envia estado inicial consolidado
      try {
        const [snapshot, strokes] = await Promise.all([
          getCanvasState(roomId),
          getRoomStrokes(roomId),
        ]);
        socket.emit("initialState", {
          snapshot: snapshot ?? null,
          strokes,
        });
        ack?.();
      } catch (err: any) {
        console.error("Falha ao recuperar estado inicial:", err);
        socket.emit("initialState", { snapshot: null, strokes: [] });
        ack?.(err.message || "Falha ao recuperar estado inicial");
      }
    });

    socket.on("drawing", async (stroke: Stroke) => {
      if (!joinedRoom) return;
      try {
        await publishStroke(joinedRoom, { ...stroke }, socket.id);
      } catch (err) {
        console.error("Erro ao publicar stroke:", err);
        socket.emit("error", { event: "drawing", message: (err as Error).message });
      }
    });

    socket.on("saveState", async (canvasState: string, ack?: (err?: string) => void) => {
      if (!joinedRoom) {
        ack?.("sem sala");
        return;
      }
      try {
        await saveCanvasState(joinedRoom, canvasState);
        ack?.();
      } catch (err: any) {
        console.error("Erro saveCanvasState:", err);
        ack?.(err.message || "Falha ao salvar estado");
      }
    });

    socket.on("leaveRoom", async (roomId?: string, ack?: (err?: string) => void) => {
      const target = roomId ?? joinedRoom;
      if (!target) {
        ack?.("não está em sala");
        return;
      }
      try {
        const newCount = await removeUserFromRoom(target, socket.id);
        socket.leave(target);
        if (joinedRoom === target) joinedRoom = null;
        console.log(`🚪 ${socket.id} saiu da sala ${target} (${newCount} usuários)`);
        await cleanupRoomWhenEmpty(target, newCount);
        ack?.();
      } catch (err: any) {
        console.error("Erro leaveRoom:", err);
        ack?.(err.message || "Falha ao sair da sala");
      }
    });

    socket.on("disconnect", async (reason) => {
      if (!joinedRoom) {
        console.log(`🔴 ${socket.id} desconectou (sem sala) — razão: ${reason}`);
        return;
      }
      const roomToClean = joinedRoom;
      joinedRoom = null;
      try {
        const newCount = await removeUserFromRoom(roomToClean, socket.id);
        socket.leave(roomToClean);
        console.log(`🔴 ${socket.id} desconectou de ${roomToClean} (${newCount} usuários)`);
        await cleanupRoomWhenEmpty(roomToClean, newCount);
      } catch (err) {
        console.error("Erro no handler disconnect:", err);
      }
    });
  });
}
