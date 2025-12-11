// server/src/services/RedisService.ts
import { createClient, RedisClientType } from 'redis';
import { getRedisClientConfig } from '../config/redis.config';

export class RedisService {
  private static instance: RedisService;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private isConnected = false;

  private constructor() {
    // Use configuration from redis.config.ts with environment variables
    this.pubClient = createClient(getRedisClientConfig());

    this.subClient = this.pubClient.duplicate();

    this.setupErrorHandlers();
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.isConnected = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    await Promise.all([
      this.pubClient.disconnect(),
      this.subClient.disconnect(),
    ]);

    this.isConnected = false;
    console.log('📤 Redis disconnected');
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    this.ensureConnected();
    return await this.pubClient.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.ensureConnected();
    await this.pubClient.set(key, value);
  }

  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.ensureConnected();
    await this.pubClient.set(key, value, { EX: ttlSeconds });
  }

  async del(key: string | string[]): Promise<number> {
    this.ensureConnected();
    const keys = Array.isArray(key) ? key : [key];
    return await this.pubClient.del(keys);
  }

  // Set operations
  async sAdd(key: string, member: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient.sRem(key, member);
  }

  async sCard(key: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient.sCard(key);
  }

  // List operations
  async rPush(key: string, value: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient.rPush(key, value);
  }

  async lRange(key: string, start: number, end: number): Promise<string[]> {
    this.ensureConnected();
    return await this.pubClient.lRange(key, start, end);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    this.ensureConnected();
    return await this.pubClient.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    this.ensureConnected();
    await this.subClient.subscribe(channel, callback);
  }

  async pSubscribe(
    pattern: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    this.ensureConnected();
    await this.subClient.pSubscribe(pattern, callback);
  }

  async unsubscribe(channel?: string): Promise<void> {
    this.ensureConnected();
    await this.subClient.unsubscribe(channel);
  }

  async pUnsubscribe(pattern?: string): Promise<void> {
    this.ensureConnected();
    await this.subClient.pUnsubscribe(pattern);
  }

  // Advanced operations
  async eval(
    script: string,
    keys: string[],
    args: string[]
  ): Promise<any> {
    this.ensureConnected();
    return await this.pubClient.eval(script, {
      keys,
      arguments: args,
    });
  }

  // Atomic set remove and count
  async sRemAndCount(key: string, member: string): Promise<number> {
    const script = `
      redis.call("SREM", KEYS[1], ARGV[1])
      return redis.call("SCARD", KEYS[1])
    `;

    return await this.eval(script, [key], [member]);
  }

  private setupErrorHandlers(): void {
    this.pubClient.on('error', (err) => {
      console.error('Redis Pub Client Error:', err);
    });

    this.subClient.on('error', (err) => {
      console.error('Redis Sub Client Error:', err);
    });

    this.pubClient.on('connect', () => {
      console.log('📡 Redis Pub Client connected');
    });

    this.subClient.on('connect', () => {
      console.log('📡 Redis Sub Client connected');
    });
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Redis is not connected. Call connect() first.');
    }
  }

  // Getters for backward compatibility
  get pub(): RedisClientType {
    this.ensureConnected();
    return this.pubClient;
  }

  get sub(): RedisClientType {
    this.ensureConnected();
    return this.subClient;
  }
}
