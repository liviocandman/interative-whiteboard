import { pubClient } from "../config/redis";

const DEFAULT_TTL_SECONDS = 3600;

function isRedisOpen(client: typeof pubClient) {
  return !!client && (client as any).isOpen === true;
}

export async function createRoom(roomId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  if (!roomId) throw new Error("createRoom: roomId inválido");
  if (!isRedisOpen(pubClient)) return;

  const metaKey = `room:${roomId}:meta`;
  await pubClient.set(metaKey, "1", { EX: ttlSeconds });
}

export async function addUserToRoom(roomId: string, userId: string): Promise<number> {
  if (!roomId) throw new Error("addUserToRoom: roomId inválido");
  if (!userId) throw new Error("addUserToRoom: userId inválido");

  const usersKey = `room:${roomId}:users`;
  try {
    await pubClient.sAdd(usersKey, userId);
    const count = await pubClient.sCard(usersKey);
    return typeof count === "number" ? count : Number(count);
  } catch (err) {
    console.error("addUserToRoom erro:", err);
    throw err;
  }
}

export async function getRoomUsersCount(roomId: string): Promise<number> {
  if (!roomId) throw new Error("getRoomUsersCount: roomId inválido");
  const usersKey = `room:${roomId}:users`;
  try {
    const count = await pubClient.sCard(usersKey);
    return typeof count === "number" ? count : Number(count);
  } catch (err) {
    console.error("getRoomUsersCount erro:", err);
    return 0;
  }
}

export async function removeUserFromRoom(roomId: string, userId: string): Promise<number> {
  if (!roomId) throw new Error("removeUserFromRoom: roomId inválido");
  if (!userId) throw new Error("removeUserFromRoom: userId inválido");

  const usersKey = `room:${roomId}:users`;

  // Lua script: remove o membro e retorna o novo SCARD
  const lua = `
    redis.call("SREM", KEYS[1], ARGV[1])
    return redis.call("SCARD", KEYS[1])
  `;

  try {
    // node-redis v4: client.eval(script, { keys: [...], arguments: [...] })
    const res = await (pubClient as any).eval(lua, { keys: [usersKey], arguments: [userId] });
    const count = Number(res ?? 0);
    return Number.isFinite(count) ? count : 0;
  } catch (err) {
    console.error("removeUserFromRoom (eval) erro:", err);
    // fallback seguro: tentar remover e ler count separadamente
    try {
      await pubClient.sRem(usersKey, userId);
      const count = await pubClient.sCard(usersKey);
      return typeof count === "number" ? count : Number(count);
    } catch (e) {
      console.error("removeUserFromRoom (fallback) erro:", e);
      throw e;
    }
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  if (!roomId) throw new Error("deleteRoom: roomId inválido");
  if (!isRedisOpen(pubClient)) return;

  const keys = [
    `room:${roomId}:users`,
    `room:${roomId}:state`,
    `room:${roomId}:meta`,
  ];

  try {
    // pubClient.del aceita múltiplas chaves
    await pubClient.del(keys);
  } catch (err) {
    console.error("deleteRoom erro:", err);
    throw err;
  }
}


