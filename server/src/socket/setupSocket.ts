// src/socket/setupSocket.ts
import { Server } from "socket.io";
import {
  pubClient as redisPublisher,
  subClient as redisSubscriber,
} from "../config/redis";
import {
  saveCanvasState,
  getCanvasState,
  deleteCanvasState,
} from "../services/stateService";
import {
  addUserToRoom,
  removeUserFromRoom,
  getRoomUsersCount,
} from "../services/roomService";
import { scheduleOrCancelRoomCleanup } from "../services/cleanupService";
import {
  Stroke,
  fetchRoomStrokes,
  saveAndBroadcastStroke,
  clearRoomStrokes,
} from "../services/strokeService";
import {
  markUserActive,
  cleanupUserData,
  getUserRoom,
} from "../services/userActivityService";

const ROOM_KEY_PREFIX = "room:";
const REDIS_PUBSUB_PATTERN = `${ROOM_KEY_PREFIX}*`;

/**
 * Setup principal de Socket.IO + Redis Pub/Sub
 */
export async function setupSocket(io: Server) {
  // 1) inscrição no Redis Pub/Sub (pattern)
  try {
    // pSubscribe espera (pattern, (message, channel) => void)
    await redisSubscriber.pSubscribe(REDIS_PUBSUB_PATTERN, createRedisPubSubHandler(io));
    console.info(`[socketService] Subscreveu Pub/Sub pattern='${REDIS_PUBSUB_PATTERN}'`);
  } catch (err) {
    console.error("[socketService] Falha ao subscrever Pub/Sub:", err);
  }

  // 2) cleanup no SIGINT
  process.once("SIGINT", async () => {
    try {
      await redisSubscriber.pUnsubscribe(REDIS_PUBSUB_PATTERN);
      console.info("[socketService] pUnsubscribe executado, saindo");
      process.exit(0);
    } catch (e) {
      console.warn("[socketService] Erro no pUnsubscribe, forçando exit:", e);
      process.exit(1);
    }
  });

  // 3) handler de conexões
  io.on("connection", (clientSocket) => {
    console.info(`[socketService] Cliente conectado: ${clientSocket.id}`);
    let currentRoomId: string | null = null;

    // renova TTL (marca atividade)
    async function refreshUserActivity() {
      if (!currentRoomId) return;
      try {
        await markUserActive(clientSocket.id, currentRoomId);
      } catch (err) {
        console.error(`[socketService] markUserActive erro (socket=${clientSocket.id}):`, err);
      }
    }

    // registra handlers
    clientSocket.on("joinRoom", createJoinRoomHandler());
    clientSocket.on("drawing", createDrawingHandler());
    clientSocket.on("saveState", createSaveStateHandler());
    clientSocket.on("leaveRoom", createLeaveRoomHandler());
    clientSocket.on("resetBoard", createResetBoardHandler());
    clientSocket.on("disconnect", handleClientDisconnect);

    /* ---------------------- HANDLERS FACTORY ---------------------- */

    function createJoinRoomHandler() {
      return async (roomId: string, ack?: (err?: string) => void) => {
        if (!roomId) {
          return ack?.("roomId inválido");
        }

        // sair da sala anterior se necessário
        if (currentRoomId && currentRoomId !== roomId) {
          try {
            await leaveRoom(currentRoomId);
          } catch (e) {
            console.warn(`[socketService] erro ao sair sala anterior (socket=${clientSocket.id}):`, e);
          }
        }

        // adicionar ao room service e socket.io
        try {
          const updatedCount = await addUserToRoom(roomId, clientSocket.id);
          await clientSocket.join(roomId);
          currentRoomId = roomId;

          // cancel/ schedule cleanup
          scheduleOrCancelRoomCleanup(roomId, updatedCount);

          // marca atividade no Redis
          await markUserActive(clientSocket.id, roomId);

          // log dos sockets na sala (útil para debug)
          try {
            const socketsInRoom = await io.in(roomId).allSockets(); // Set<string>
            console.debug(`[socketService] sockets em ${roomId}:`, Array.from(socketsInRoom));
          } catch {
            // non-blocking
          }

          console.info(`[socketService] socket=${clientSocket.id} entrou na sala=${roomId} (count=${updatedCount})`);
        } catch (err: any) {
          console.error(`[socketService] addUserToRoom erro:`, err);
          return ack?.(err.message || "Falha ao registrar usuário");
        }

        // Envia estado inicial (snapshot + strokes persistidos)
        try {
          const [canvasSnapshot, persistedStrokes] = await Promise.all([
            getCanvasState(roomId),
            fetchRoomStrokes(roomId),
          ]);

          clientSocket.emit("initialState", {
            snapshot: canvasSnapshot ?? null,
            strokes: persistedStrokes ?? [],
          });

          ack?.();
        } catch (err: any) {
          console.error(`[socketService] erro ao obter initialState (room=${roomId}):`, err);
          clientSocket.emit("initialState", { snapshot: null, strokes: [] });
          ack?.(err.message || "Erro ao recuperar estado inicial");
        }
      };
    }

    function createDrawingHandler() {
      return async (stroke: Stroke) => {
        await refreshUserActivity();
        if (!currentRoomId) return;

        try {
          // Persiste e publica; recebe info de debug
          const res = await saveAndBroadcastStroke(currentRoomId, stroke, clientSocket.id);

          // Se publishCount === 0, não havia subscriber no Pub/Sub:
          // emitir localmente para sockets desta instância (evita perda).
          if (!res.publishCount || res.publishCount === 0) {
            try {
              clientSocket.to(currentRoomId).emit("drawing", stroke);
              console.warn(`[socketService] Pub/Sub sem subscribers (room=${currentRoomId}). Emissão local realizada. origin=${clientSocket.id}`);
            } catch (emitErr) {
              console.error("[socketService] erro ao emitir desenho localmente:", emitErr);
            }
          }
        } catch (err) {
          console.error(`[socketService] saveAndBroadcastStroke erro (socket=${clientSocket.id}):`, err);
          clientSocket.emit("error", { event: "drawing", message: (err as Error).message });
        }
      };
    }

    function createSaveStateHandler() {
      return async (serializedCanvas: string, ack?: (err?: string) => void) => {
        await refreshUserActivity();
        if (!currentRoomId) return ack?.("sem sala");
        try {
          await saveCanvasState(currentRoomId, serializedCanvas);
          ack?.();
        } catch (err: any) {
          console.error(`[socketService] saveCanvasState erro (socket=${clientSocket.id}):`, err);
          ack?.(err.message || "Falha ao salvar estado");
        }
      };
    }

    function createLeaveRoomHandler() {
      return async (roomToLeave?: string, ack?: (err?: string) => void) => {
        await refreshUserActivity();
        const targetRoom = roomToLeave ?? currentRoomId;
        if (!targetRoom) return ack?.("não está em sala");

        try {
          const remainingUsers = await leaveRoom(targetRoom);
          ack?.();
          scheduleOrCancelRoomCleanup(targetRoom, remainingUsers);
        } catch (err: any) {
          console.error(`[socketService] leaveRoom erro (socket=${clientSocket.id}):`, err);
          ack?.(err.message || "Falha ao sair da sala");
        }
      };
    }

    function createResetBoardHandler() {
      return async (ack?: (err?: string) => void) => {
        await refreshUserActivity();
        if (!currentRoomId) return ack?.("não está em sala");

        try {
          await Promise.all([deleteCanvasState(currentRoomId), clearRoomStrokes(currentRoomId)]);
          // publica reset com campo 'origin' consistente
          await redisPublisher.publish(`${ROOM_KEY_PREFIX}${currentRoomId}`, JSON.stringify({ reset: true, origin: clientSocket.id }));
          clientSocket.emit("clearBoard");
          ack?.();
        } catch (err: any) {
          console.error(`[socketService] resetBoard erro (socket=${clientSocket.id}):`, err);
          ack?.(err.message || "Falha ao resetar o quadro");
        }
      };
    }

    /* ---------------------- HELPERS ---------------------- */

    async function leaveRoom(roomId: string): Promise<number> {
      try {
        const updatedCount = await removeUserFromRoom(roomId, clientSocket.id);
        clientSocket.leave(roomId);

        if (currentRoomId === roomId) {
          currentRoomId = null;
          await cleanupUserData(clientSocket.id).catch((e) => console.warn("[socketService] cleanupUserData erro:", e));
        }

        console.info(`[socketService] socket=${clientSocket.id} saiu da sala=${roomId} (count=${updatedCount})`);
        return updatedCount;
      } catch (err) {
        console.error(`[socketService] leaveRoom erro (socket=${clientSocket.id}):`, err);
        throw err;
      }
    }

    async function handleClientDisconnect(reason: string) {
      console.info(`[socketService] socket=${clientSocket.id} desconectou: ${reason}`);
      if (currentRoomId) {
        try {
          const remaining = await leaveRoom(currentRoomId);
          scheduleOrCancelRoomCleanup(currentRoomId, remaining);
        } catch (err) {
          console.warn("[socketService] erro no leaveRoom durante disconnect:", err);
        }
      }
      await cleanupUserData(clientSocket.id).catch((e) => console.warn("[socketService] cleanupUserData no disconnect erro:", e));
    }
  });
}

/* ---------------------- Redis Pub/Sub handler (tolerante + logs) ---------------------- */

function createRedisPubSubHandler(io: Server) {
  return (pubSubMessage: string, channel: string) => {
    try {
      console.debug(`[socketService][pubsub] msg on channel=${channel}: ${pubSubMessage}`);

      const roomId = channel.replace(ROOM_KEY_PREFIX, "");
      if (!roomId) return;

      const parsed = JSON.parse(pubSubMessage) as {
        reset?: boolean;
        stroke?: Stroke;
        origin?: string | null;
        originSocketId?: string | null;
      };

      // aceitar ambos os formatos (compatibilidade)
      const origin = parsed.origin ?? parsed.originSocketId ?? null;

      if (parsed.reset) {
        const target = origin ? io.in(roomId).except(origin) : io.in(roomId);
        target.emit("clearBoard");
        console.debug(`[socketService][pubsub] emitted clearBoard room=${roomId} origin=${origin ?? "null"}`);
        return;
      }

      if (parsed.stroke) {
        const target = origin ? io.in(roomId).except(origin) : io.in(roomId);
        target.emit("drawing", parsed.stroke);
        console.debug(`[socketService][pubsub] emitted drawing room=${roomId} origin=${origin ?? "null"}`);
      }
    } catch (err) {
      console.error("[socketService] Erro no Pub/Sub handler:", err);
    }
  };
}
