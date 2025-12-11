import { RedisService } from './RedisService';
import { REDIS_KEYS, CONFIG } from '../types';

export class StateService {
  private redis: RedisService;

  constructor() {
    this.redis = RedisService.getInstance();
  }

  async saveCanvasState(roomId: string, state: string): Promise<void> {
    await this.redis.setWithTTL(
      REDIS_KEYS.ROOM_STATE(roomId),
      JSON.stringify(state),
      CONFIG.DEFAULT_TTL_SECONDS
    );
  }

  async getCanvasState(roomId: string): Promise<string | null> {
    const serialized = await this.redis.get(REDIS_KEYS.ROOM_STATE(roomId));

    if (!serialized) return null;

    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  }

  async deleteCanvasState(roomId: string): Promise<number> {
    return await this.redis.del(REDIS_KEYS.ROOM_STATE(roomId));
  }

  async stateExists(roomId: string): Promise<boolean> {
    const exists = await this.redis.get(REDIS_KEYS.ROOM_STATE(roomId));
    return exists !== null;
  }
}
