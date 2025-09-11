import { pubClient } from "../config/redis";

const DEFAULT_TTL_SECONDS = 3600;

function isRedisOpen(client: typeof pubClient) {
  return !!client && (client as any).isOpen === true;
}

/**
 * Cria metadado da sala (chave string) com TTL para indicar existência.
 * Não manipula o set de usuários diretamente — o set é criado quando um usuário entra (SADD).
 */
export async function createRoom(roomId: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  if (!roomId) throw new Error("createRoom: roomId inválido");
  if (!isRedisOpen(pubClient)) return;

  const metaKey = `room:${roomId}:meta`;
  // cria uma chave string com TTL; evita criar set com placeholder
  await pubClient.set(metaKey, "1", { EX: ttlSeconds });
}
/**
 * Adiciona usuário ao set de usuários da sala e retorna o novo count.
 */
export async function addUserToRoom(roomId: string, userId: string): Promise<number> {
  if (!roomId) throw new Error("addUserToRoom: roomId inválido");
  if (!userId) throw new Error("addUserToRoom: userId inválido");

  const usersKey = `room:${roomId}:users`;
  await pubClient.sAdd(usersKey, userId);
  const count = await pubClient.sCard(usersKey);
  return typeof count === "number" ? count : Number(count);
}

/**
 * Remove o usuário do set e retorna o novo count (0 se não existir).
 */
export async function removeUserFromRoom(roomId: string, userId: string): Promise<number> {
  if (!roomId) throw new Error("removeUserFromRoom: roomId inválido");
  if (!userId) throw new Error("removeUserFromRoom: userId inválido");

  const usersKey = `room:${roomId}:users`;
  await pubClient.sRem(usersKey, userId);
  const count = await pubClient.sCard(usersKey);
  return typeof count === "number" ? count : Number(count);
}

/**
 * Apaga todos os keys relacionados à sala (users set, state e meta).
 */
export async function deleteRoom(roomId: string): Promise<void> {
  if (!roomId) throw new Error("deleteRoom: roomId inválido");
  if (!isRedisOpen(pubClient)) return;

  const keys = [
    `room:${roomId}:users`,
    `room:${roomId}:state`,
    `room:${roomId}:meta`,
  ];
  
  for (const key of keys) {
    await pubClient.del(key);
  }
}

/**
 * Retorna o número de usuários na sala (sempre number; 0 se key não existir).
 */
export async function getRoomUsersCount(roomId: string): Promise<number> {
  if (!roomId) throw new Error("getRoomUsersCount: roomId inválido");
  const usersKey = `room:${roomId}:users`;
  const count = await pubClient.sCard(usersKey);
  return typeof count === "number" ? count : Number(count);
}
