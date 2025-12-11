import { RedisService } from './RedisService';
import { StrokeModel } from '../models';
import { REDIS_KEYS } from '../types';
import type { Stroke } from '../types';

interface BroadcastResult {
  savedCount: number;
  publishCount: number;
}

export class StrokeService {
  private redis: RedisService;

  constructor() {
    this.redis = RedisService.getInstance();
  }

  async saveAndBroadcast(
    roomId: string,
    stroke: Stroke,
    origin?: string
  ): Promise<BroadcastResult> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const channel = REDIS_KEYS.ROOM_CHANNEL(roomId);

    // Save stroke
    const serialized = StrokeModel.serialize(stroke);
    const savedCount = await this.redis.rPush(strokesKey, serialized);

    // Publish to other clients
    const publishCount = await this.redis.publish(
      channel,
      JSON.stringify({ stroke, origin: origin || null })
    );

    return { savedCount, publishCount };
  }

  async getStrokes(roomId: string): Promise<Stroke[]> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const items = await this.redis.lRange(strokesKey, 0, -1);

    return items
      .map(item => StrokeModel.deserialize(item))
      .filter((stroke): stroke is Stroke => stroke !== null);
  }

  async clearStrokes(roomId: string): Promise<number> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    return await this.redis.del(strokesKey);
  }

  async getStrokeCount(roomId: string): Promise<number> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const strokes = await this.redis.lRange(strokesKey, 0, -1);
    return strokes.length;
  }
}
