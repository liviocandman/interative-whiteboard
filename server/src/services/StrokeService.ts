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

  /**
   * Remove all strokes with a specific strokeId belonging to a user
   * Returns the removed strokes for undo stack
   */
  async removeStrokesByStrokeId(
    roomId: string,
    strokeId: string,
    userId: string
  ): Promise<Stroke[]> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const items = await this.redis.lRange(strokesKey, 0, -1);

    const strokes = items
      .map(item => StrokeModel.deserialize(item))
      .filter((stroke): stroke is Stroke => stroke !== null);

    // Find strokes to remove
    const strokesToRemove = strokes.filter(
      s => s.strokeId === strokeId && s.userId === userId
    );

    if (strokesToRemove.length === 0) {
      return [];
    }

    // Filter out the strokes to remove
    const remainingStrokes = strokes.filter(
      s => !(s.strokeId === strokeId && s.userId === userId)
    );

    // Atomic replace: delete and re-add remaining strokes
    await this.redis.del(strokesKey);

    if (remainingStrokes.length > 0) {
      const serialized = remainingStrokes.map(s => StrokeModel.serialize(s));
      for (const stroke of serialized) {
        await this.redis.rPush(strokesKey, stroke);
      }
    }

    return strokesToRemove;
  }

  /**
   * Add a single stroke back (for redo)
   */
  async addStroke(roomId: string, stroke: Stroke): Promise<void> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const serialized = StrokeModel.serialize(stroke);
    await this.redis.rPush(strokesKey, serialized);
  }
}
