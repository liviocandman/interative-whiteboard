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

  async saveAndBroadcastBatch(
    roomId: string,
    strokes: Stroke[],
    origin?: string
  ): Promise<BroadcastResult> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const channel = REDIS_KEYS.ROOM_CHANNEL(roomId);

    // Save strokes (store batch as a single entry for undo optimization)
    const savedCount = await this.redis.rPush(strokesKey, JSON.stringify(strokes));

    // Publish batch to other clients
    const publishCount = await this.redis.publish(
      channel,
      JSON.stringify({ strokes, origin: origin || null })
    );

    return { savedCount, publishCount };
  }

  async getStrokes(roomId: string): Promise<Stroke[]> {
    const strokesKey = REDIS_KEYS.ROOM_STROKES(roomId);
    const items = await this.redis.lRange(strokesKey, 0, -1);

    const strokes: Stroke[] = [];
    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          strokes.push(...parsed);
        } else {
          const validated = StrokeModel.validate(parsed);
          if (validated) strokes.push(validated);
        }
      } catch (e) {
        console.error('[StrokeService] Error deserializing stroke:', e);
      }
    }
    return strokes;
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

    const removedStrokes: Stroke[] = [];
    const remainingItems: string[] = [];

    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          // If any stroke in the batch matches, we might need to partially remove
          // or just filter the whole batch. Since segments of one batch share metadata,
          // usually the WHOLE batch belongs to the same strokeId/userId.
          const isMatch = parsed.some(s => s.strokeId === strokeId && s.userId === userId);

          if (isMatch) {
            removedStrokes.push(...parsed);
          } else {
            remainingItems.push(item);
          }
        } else {
          const s = StrokeModel.validate(parsed);
          if (s && s.strokeId === strokeId && s.userId === userId) {
            removedStrokes.push(s);
          } else {
            remainingItems.push(item);
          }
        }
      } catch {
        remainingItems.push(item);
      }
    }

    if (removedStrokes.length > 0) {
      await this.redis.del(strokesKey);
      if (remainingItems.length > 0) {
        await this.redis.rPush(strokesKey, ...remainingItems);
      }
    }

    return removedStrokes;
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
