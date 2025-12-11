import dotenv from 'dotenv';
import { getCorsOrigin } from './cors.config';

dotenv.config();

/**
 * Socket.IO Server Configuration
 * Configures WebSocket connections, CORS, and connection parameters
 */

export const SOCKET_CONFIG = {
  CORS: {
    origin: getCorsOrigin(),
    methods: ['GET', 'POST'] as string[],
    credentials: true,
  },
  PING_TIMEOUT: 60000, // 60 seconds - time to wait before considering connection lost
  PING_INTERVAL: 25000, // 25 seconds - interval between ping packets
  MAX_BUFFER_SIZE: 1e6, // 1 MB - maximum size of messages
  TRANSPORTS: ['websocket', 'polling'] as const,
} as const;

