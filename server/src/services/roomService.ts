import { pubClient } from "../config/redis";

function isRedisOpen(client: typeof pubClient) {
  return client.isOpen;
}

export async function createRoom(roomId: string, ttlSeconds = 3600) {
  const key = `room:${roomId}:users`;
  await pubClient.sAdd(key, ""); // cria conjunto vazio
  await pubClient.expire(key, ttlSeconds);
}

export async function addUserToRoom(roomId: string, userId: string) {
  const key = `room:${roomId}:users`;
  await pubClient.sAdd(key, userId);
}

export async function removeUserFromRoom(roomId: string, userId: string) {
  const key = `room:${roomId}:users`;
  await pubClient.sRem(key, userId);
}

export async function deleteRoom(roomId: string) {
  if (isRedisOpen(pubClient)) {
    await pubClient.del(`room:${roomId}:users`);
    await pubClient.del(`room:${roomId}:state`);
  }
}

export async function getRoomUsers(roomId: string) {
  return await pubClient.sMembers(`room:${roomId}:users`);
}
