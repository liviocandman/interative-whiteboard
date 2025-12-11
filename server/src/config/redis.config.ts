import dotenv from 'dotenv';

dotenv.config();
// Redis configuration and keys
export const REDIS_KEYS = {
  ROOM_DATA: (roomId: string) => `room:${roomId}:data`,
  ROOM_USERS: (roomId: string) => `room:${roomId}:users`,
  ROOM_STATE: (roomId: string) => `room:${roomId}:state`,
  ROOM_STROKES: (roomId: string) => `room:${roomId}:strokes`,
  ROOM_CHANNEL: (roomId: string) => `room:${roomId}`,
  USER_DATA: (userId: string) => `user:${userId}:data`,
  SESSION_DATA: (socketId: string) => `session:${socketId}`,
  ALL_ROOMS: 'rooms:all',
} as const;

export const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST || 'localhost',
  PORT: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  USERNAME: process.env.REDIS_USERNAME,
  PASSWORD: process.env.REDIS_PASSWORD,
  RECONNECT_DELAY: 1000,
  MAX_RETRIES: 10,
} as const;

/**
 * Get Redis client configuration from environment variables
 * @returns Redis client configuration object
 */
export function getRedisClientConfig() {
  const config = {
    socket: {
      host: REDIS_CONFIG.HOST,
      port: REDIS_CONFIG.PORT,
    },
    username: REDIS_CONFIG.USERNAME,
    password: REDIS_CONFIG.PASSWORD,
  };

  return config;
}
