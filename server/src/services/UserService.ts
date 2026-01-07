import { RedisService } from './RedisService';
import { UserModel } from '../models';
import { REDIS_KEYS, CONFIG } from '../types';
import type { User, Point } from '../types';

export class UserService {
  private static instance: UserService;
  private redis: RedisService;
  // Primary storage: userId -> User
  private users = new Map<string, User>();
  // Lookup map: socketId -> userId (for disconnect handling)
  private socketToUser = new Map<string, string>();

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Creates or updates a user. If userId already exists, updates the socketId (reconnection).
   * Returns the user and whether this was a reconnection.
   */
  createOrUpdateUser(
    userId: string,
    socketId: string,
    name: string,
    color: string,
    roomId?: string
  ): { user: User; isReconnection: boolean } {
    const existingUser = this.users.get(userId);

    if (existingUser) {
      // Reconnection: update socketId and mark online
      console.log(`[UserService] User ${userId} reconnecting with new socket ${socketId}`);

      // Clean up old socket mapping if it exists
      const oldSocketId = this.findSocketIdByUserId(userId);
      if (oldSocketId) {
        this.socketToUser.delete(oldSocketId);
      }

      // Update user with new socket info
      const updated: User = {
        ...existingUser,
        name: UserModel.sanitizeName(name),
        color: UserModel.validateColor(color),
        isOnline: true,
        lastSeen: new Date(),
      };

      this.users.set(userId, updated);
      this.socketToUser.set(socketId, userId);
      this.saveUserToRedis(updated);

      return { user: updated, isReconnection: true };
    }

    // New user
    const user = UserModel.createUser(userId, name, color, roomId);
    this.users.set(userId, user);
    this.socketToUser.set(socketId, userId);
    this.saveUserToRedis(user);

    return { user, isReconnection: false };
  }

  /**
   * @deprecated Use createOrUpdateUser instead
   */
  createUser(socketId: string, name: string, color: string, roomId?: string): User {
    // Fallback for backwards compatibility - uses socketId as userId
    const { user } = this.createOrUpdateUser(socketId, socketId, name, color, roomId);
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserBySocketId(socketId: string): User | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;
    return this.users.get(userId);
  }

  getUserIdBySocketId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  private findSocketIdByUserId(userId: string): string | undefined {
    for (const [socketId, uid] of this.socketToUser.entries()) {
      if (uid === userId) return socketId;
    }
    return undefined;
  }

  updateCursor(socketId: string, position: Point): User | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;

    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated = UserModel.updateCursor(user, position);
    this.users.set(userId, updated);

    return updated;
  }

  updateDrawingState(socketId: string, isDrawing: boolean): User | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;

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

  removeUserBySocketId(socketId: string): void {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    this.socketToUser.delete(socketId);
    this.users.delete(userId);
    this.redis.del(REDIS_KEYS.USER_DATA(userId));
    console.log(`[UserService] User ${userId} removed (socket: ${socketId})`);
  }

  /**
   * @deprecated Use removeUserBySocketId instead
   */
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
