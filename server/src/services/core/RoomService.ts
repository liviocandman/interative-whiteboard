import { RedisService } from './RedisService';
import { StateService } from './StateService';
import { StrokeService } from './StrokeService';
import type { CanvasState } from '../../types';

export class RoomService {
  private redis: RedisService;
  private stateService: StateService;
  private strokeService: StrokeService;
  private readonly DEFAULT_TTL = 3600; // 1 hora

  constructor() {
    this.redis = RedisService.getInstance();
    this.stateService = new StateService();
    this.strokeService = new StrokeService();
  }

  async createRoom(roomId: string): Promise<void> {
    const metaKey = `room:${roomId}:meta`;
    await this.redis.setWithTTL(metaKey, '1', this.DEFAULT_TTL);
  }

  async addUser(roomId: string, userId: string): Promise<number> {
    const usersKey = `room:${roomId}:users`;
    await this.redis.sAdd(usersKey, userId);
    return await this.redis.sCard(usersKey);
  }

  async removeUser(roomId: string, userId: string): Promise<number> {
    const usersKey = `room:${roomId}:users`;
    return await this.redis.sRemAndCount(usersKey, userId);
  }

  async getUserCount(roomId: string): Promise<number> {
    const usersKey = `room:${roomId}:users`;
    return await this.redis.sCard(usersKey);
  }

  async getInitialState(roomId: string): Promise<CanvasState> {
    const [snapshot, strokes] = await Promise.all([
      this.stateService.getCanvasState(roomId),
      this.strokeService.getStrokes(roomId),
    ]);

    return {
      snapshot: snapshot || null,
      strokes: strokes || [],
    };
  }

  async deleteRoom(roomId: string): Promise<void> {
    const keys = [
      `room:${roomId}:users`,
      `room:${roomId}:meta`,
    ];

    await this.redis.del(keys);
  }

  async roomExists(roomId: string): Promise<boolean> {
    const metaKey = `room:${roomId}:meta`;
    const exists = await this.redis.get(metaKey);
    return exists !== null;
  }
}
