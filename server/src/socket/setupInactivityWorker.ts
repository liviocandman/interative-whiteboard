// src/socket/setupInactivityWorker.ts
import { Server } from "socket.io";
import {
  subClient as redisSubscriber,
  pubClient as redisClient,
} from "../config/redis";
import { removeUserFromRoom } from "../services/roomService";
import { scheduleOrCancelRoomCleanup } from "../services/cleanupService";
import {
  getUserRoom,
  cleanupUserData,
} from "../services/userActivityService";

const USER_LAST_ACTIVE_PREFIX = "user:lastActive:";
const EXPIRED_EVENT_CHANNEL = "__keyevent@0__:expired";

async function handleExpiredUser(
  io: Server,
  expiredKey: string
): Promise<void> {
  if (!expiredKey.startsWith(USER_LAST_ACTIVE_PREFIX)) return;

  const socketId = expiredKey.slice(USER_LAST_ACTIVE_PREFIX.length);
  const roomId = await getUserRoom(socketId);

  console.log(
    `[inactivity-worker] detected expiration for socket=${socketId}, roomKey=${roomId}`
  );

  // Se não estava em sala, só limpa dados do usuário
  if (!roomId) {
    console.log(
      `[inactivity-worker] no room found for socket=${socketId}, cleaning user data only`
    );
    await cleanupUserData(socketId).catch((e) =>
      console.warn("cleanupUserData error:", e)
    );
    return;
  }

  // Remove o usuário da sala
  const remainingUserCount = await removeUserFromRoom(roomId, socketId);
  console.log(
    `[inactivity-worker] removeUserFromRoom returned remainingUserCount=${remainingUserCount} for socket=${socketId}, room=${roomId}`
  );

  // Limpa dados de atividade do usuário
  await cleanupUserData(socketId).catch((e) =>
    console.warn("cleanupUserData error:", e)
  );

  // Notifica localmente, caso o socket ainda esteja conectado
  const socketInstance = io.sockets.sockets.get(socketId);
  if (socketInstance) {
    try {
      socketInstance.leave(roomId);
      socketInstance.emit("removedDueToInactivity");
    } catch (e) {
      console.warn("Error notifying socket about inactivity removal:", e);
    }
  }

  // Se a sala ficou vazia, agenda ou executa cleanup
  await scheduleOrCancelRoomCleanup(roomId, Number(remainingUserCount));
}

export async function setupInactivityWorker(io: Server) {
  // Inscreve no canal de expiração de keys do Redis
  await redisSubscriber.subscribe(EXPIRED_EVENT_CHANNEL, async (expiredKey) => {
    try {
      await handleExpiredUser(io, expiredKey);
    } catch (err) {
      console.error(
        `Error processing expiration event (key=${expiredKey}):`,
        err
      );
    }
  });

  console.log(
    `🟢 Inactivity worker subscribed to Redis channel '${EXPIRED_EVENT_CHANNEL}'`
  );

  // Cleanup de inscrição no shutdown
  process.once("SIGINT", async () => {
    await redisSubscriber.unsubscribe(EXPIRED_EVENT_CHANNEL);
    console.log(`🔕 Unsubscribed from '${EXPIRED_EVENT_CHANNEL}', exiting`);
    process.exit(0);
  });
}
