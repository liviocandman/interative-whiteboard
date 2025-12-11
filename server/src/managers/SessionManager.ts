import { RedisService } from '../services/RedisService';

interface Session {
  socketId: string;
  roomId?: string;
  lastActivity: number;
}

export class SessionManager {
  private redis = RedisService.getInstance();
  private readonly TTL_SECONDS = 300; // 5 minutes
  private sessions = new Map<string, Session>();

  async initSession(socketId: string): Promise<void> {
    const session: Session = {
      socketId,
      lastActivity: Date.now(),
    };

    this.sessions.set(socketId, session);
    await this.saveSessionToRedis(session);
  }

  async joinRoom(socketId: string, roomId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) {
      throw new Error(`Session not found for socket ${socketId}`);
    }

    session.roomId = roomId;
    session.lastActivity = Date.now();

    this.sessions.set(socketId, session);
    await this.saveSessionToRedis(session);
  }

  async leaveRoom(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) return;

    delete session.roomId;
    session.lastActivity = Date.now();

    this.sessions.set(socketId, session);
    await this.saveSessionToRedis(session);
  }

  async markActivity(socketId: string): Promise<void> {
    const session = this.sessions.get(socketId);
    if (!session) return;

    session.lastActivity = Date.now();
    this.sessions.set(socketId, session);

    // Renew TTL in Redis
    const roomId = session.roomId;
    if (roomId) {
      await this.redis.setWithTTL(
        `session:${socketId}:activity`,
        roomId,
        this.TTL_SECONDS
      );
    }
  }

  getSession(socketId: string): Session | undefined {
    return this.sessions.get(socketId);
  }

  getCurrentRoom(socketId: string): string | undefined {
    return this.sessions.get(socketId)?.roomId;
  }

  async cleanup(socketId: string): Promise<void> {
    this.sessions.delete(socketId);

    await Promise.all([
      this.redis.del(`session:${socketId}:activity`),
      this.redis.del(`session:${socketId}:room`),
      this.redis.del(`session:${socketId}:data`),
    ]);
  }

  getSessionsByRoom(roomId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => session.roomId === roomId);
  }

  private async saveSessionToRedis(session: Session): Promise<void> {
    const key = `session:${session.socketId}:data`;
    await this.redis.setWithTTL(
      key,
      JSON.stringify(session),
      this.TTL_SECONDS
    );

    // Save room mapping separately for fast queries
    if (session.roomId) {
      await this.redis.setWithTTL(
        `session:${session.socketId}:room`,
        session.roomId,
        this.TTL_SECONDS
      );
    }
  }

  async loadSessionFromRedis(socketId: string): Promise<Session | null> {
    try {
      const data = await this.redis.get(`session:${socketId}:data`);
      if (!data) return null;

      const session = JSON.parse(data) as Session;
      this.sessions.set(socketId, session);
      return session;
    } catch (error) {
      console.error(`Error loading session for ${socketId}:`, error);
      return null;
    }
  }
}
