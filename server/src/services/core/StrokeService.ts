import { RedisService } from './RedisService';
import type { Stroke } from '../../types';

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
    const strokesKey = `room:${roomId}:strokes`;
    const channel = `room:${roomId}`;

    // Salvar stroke
    const savedCount = await this.redis.rPush(strokesKey, JSON.stringify(stroke));

    // Publicar para outros clientes
    const publishCount = await this.redis.publish(
      channel,
      JSON.stringify({ stroke, origin: origin || null })
    );

    return { savedCount, publishCount };
  }

  async getStrokes(roomId: string): Promise<Stroke[]> {
    const strokesKey = `room:${roomId}:strokes`;
    const items = await this.redis.lRange(strokesKey, 0, -1);

    return items
      .map(item => {
        try {
          return JSON.parse(item) as Stroke;
        } catch {
          return null;
        }
      })
      .filter((stroke): stroke is Stroke => stroke !== null);
  }

  async clearStrokes(roomId: string): Promise<number> {
    const strokesKey = `room:${roomId}:strokes`;
    return await this.redis.del(strokesKey);
  }

  async getStrokeCount(roomId: string): Promise<number> {
    const strokesKey = `room:${roomId}:strokes`;
    const strokes = await this.redis.lRange(strokesKey, 0, -1);
    return strokes.length;
  }
}