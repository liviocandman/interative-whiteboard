import { Server } from 'socket.io';
import { RedisService } from '../services/RedisService';
import type { Stroke } from '../types';

const ROOM_PATTERN = 'room:*';

interface PubSubMessage {
  reset?: boolean;
  stroke?: Stroke;
  origin?: string;
}

export async function setupPubSub(io: Server): Promise<void> {
  const redis = RedisService.getInstance();

  try {
    await redis.pSubscribe(ROOM_PATTERN, (message: string, channel: string) => {
      handlePubSubMessage(io, message, channel);
    });

    console.log(`📡 Subscribed to Redis Pub/Sub pattern: ${ROOM_PATTERN}`);

  } catch (error) {
    console.error('Failed to setup Pub/Sub:', error);
    throw error;
  }
}

function handlePubSubMessage(io: Server, message: string, channel: string): void {
  try {
    const roomId = channel.replace('room:', '');
    if (!roomId) return;

    const data = JSON.parse(message) as PubSubMessage;

    if (data.reset) {
      // Broadcast reset to all clients except origin
      const target = data.origin ? io.in(roomId).except(data.origin) : io.in(roomId);
      target.emit('clearBoard');

      console.debug(`[PubSub] Broadcasted reset to room ${roomId}`);
      return;
    }

    if (data.stroke) {
      // Broadcast stroke to all clients except origin
      const target = data.origin ? io.in(roomId).except(data.origin) : io.in(roomId);
      target.emit('drawing', data.stroke);

      console.debug(`[PubSub] Broadcasted stroke to room ${roomId}`);
    }

  } catch (error) {
    console.error('[PubSub] Error handling message:', error);
  }
}
