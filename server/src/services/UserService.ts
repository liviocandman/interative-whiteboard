import { RedisService } from './RedisService';
import { UserModel } from '../models';
import { REDIS_KEYS, CONFIG } from '../types';
import type { User, Point } from '../types';

export class UserService {
  private static instance: UserService;
  private redis: RedisService;
  private users = new Map<string, User>();

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  createUser(socketId: string, name: string, color: string, roomId?: string): User {
    const user = UserModel.createUser(socketId, name, color, roomId);

    this.users.set(socketId, user);
    this.saveUserToRedis(user);

    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateCursor(userId: string, position: Point): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated = UserModel.updateCursor(user, position);
    this.users.set(userId, updated);

    return updated;
  }

  updateDrawingState(userId: string, isDrawing: boolean): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated = UserModel.updateDrawingState(user, isDrawing);
    this.users.set(userId, updated);

    return updated;
  }

  setUserRoom(userId: string, roomId: string | undefined): void {
    const user = this.users.get(userId);
    if (!user) return;

    const updated = UserModel.setRoom(user, roomId);
    this.users.set(userId, updated);
    this.saveUserToRedis(updated);
  }

  getUsersByRoom(roomId: string): User[] {
    return Array.from(this.users.values()).filter(user => user.roomId === roomId);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.redis.del(REDIS_KEYS.USER_DATA(userId));
  }

  markUserOffline(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    const updated = UserModel.markOffline(user);
    this.users.set(userId, updated);
  }

  private async saveUserToRedis(user: User): Promise<void> {
    const serialized = UserModel.serialize(user);

    await this.redis.setWithTTL(
      REDIS_KEYS.USER_DATA(user.id),
      serialized,
      CONFIG.SESSION_TTL_SECONDS
    );
  }

  async loadUserFromRedis(userId: string): Promise<User | null> {
    try {
      const data = await this.redis.get(REDIS_KEYS.USER_DATA(userId));
      if (!data) return null;

      const user = UserModel.deserialize(data);
      if (user) {
        this.users.set(userId, user);
      }
      return user;
    } catch {
      return null;
    }
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getOnlineUsersCount(): number {
    return Array.from(this.users.values()).filter(u => u.isOnline).length;
  }
}
