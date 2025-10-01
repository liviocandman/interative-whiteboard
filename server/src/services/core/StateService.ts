import { RedisService } from './RedisService';

export class StateService {
  private redis: RedisService;
  private readonly DEFAULT_TTL = 3600; // 1 hora

  constructor() {
    this.redis = RedisService.getInstance();
  }

  async saveCanvasState(roomId: string, state: string): Promise<void> {
    const stateKey = `room:${roomId}:state`;
    await this.redis.setWithTTL(stateKey, JSON.stringify(state), this.DEFAULT_TTL);
  }

  async getCanvasState(roomId: string): Promise<string | null> {
    const stateKey = `room:${roomId}:state`;
    const serialized = await this.redis.get(stateKey);
    
    if (!serialized) return null;
    
    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  }

  async deleteCanvasState(roomId: string): Promise<number> {
    const stateKey = `room:${roomId}:state`;
    return await this.redis.del(stateKey);
  }

  async stateExists(roomId: string): Promise<boolean> {
    const stateKey = `room:${roomId}:state`;
    const exists = await this.redis.get(stateKey);
    return exists !== null;
  }
}