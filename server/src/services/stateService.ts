import { pubClient } from "../config/redis";

export async function saveCanvasState(roomId: string, state: string, ttlSeconds = 3600) {
  await pubClient.set(
    `room:${roomId}:state`,
    JSON.stringify(state),
    { EX: ttlSeconds }
  );
}

export async function getCanvasState(roomId: string) {
  const serialized = await pubClient.get(`room:${roomId}:state`);
  return serialized ? JSON.parse(serialized) : null;
}

export async function deleteCanvasState(roomId: string) {
  await pubClient.del(`room:${roomId}:state`);
}
