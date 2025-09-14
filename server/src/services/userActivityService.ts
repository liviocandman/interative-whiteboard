import { pubClient as redis } from "../config/redis";

const USER_LAST_ACTIVE_PREFIX = "user:lastActive:";
const USER_ROOM_PREFIX = "user:";

const INACTIVITY_TIMEOUT_SECONDS = 60 * 5; // 5 minutos

export async function markUserActive(socketId: string, roomId: string) {
  await Promise.all([
    redis.set(`${USER_LAST_ACTIVE_PREFIX}${socketId}`, roomId, { EX: INACTIVITY_TIMEOUT_SECONDS }),
    redis.set(`${USER_ROOM_PREFIX}${socketId}:room`, roomId),
  ]);
}

export async function getUserRoom(socketId: string): Promise<string | null> {
  return await redis.get(`${USER_ROOM_PREFIX}${socketId}:room`);
}

export async function cleanupUserData(socketId: string) {
  await Promise.all([
    redis.del(`${USER_LAST_ACTIVE_PREFIX}${socketId}`),
    redis.del(`${USER_ROOM_PREFIX}${socketId}:room`),
  ]);
}
