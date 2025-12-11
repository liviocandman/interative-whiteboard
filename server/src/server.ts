import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { RedisService } from './services/RedisService';
import { CleanupManager } from './managers';
import { setupPubSub, SOCKET_CONFIG } from './config';
import { setupSocketRoutes } from './routes';

export class WhiteboardServer {
  private app: ReturnType<typeof createApp>;
  private server: http.Server;
  private io: Server;
  private redis: RedisService;
  private cleanupManager: CleanupManager;

  constructor() {
    this.app = createApp();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: SOCKET_CONFIG.CORS,
      pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
      pingInterval: SOCKET_CONFIG.PING_INTERVAL,
    });

    this.redis = RedisService.getInstance();
    this.cleanupManager = CleanupManager.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Whiteboard Server...');

      // Initialize Redis
      await this.redis.connect();
      console.log('✅ Redis connected');

      // Setup Socket.IO routes
      setupSocketRoutes(this.io);
      console.log('✅ Socket.IO routes configured');

      // Setup Redis Pub/Sub
      await setupPubSub(this.io);
      console.log('✅ Redis Pub/Sub configured');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
      console.log('✅ Graceful shutdown configured');

      console.log('✅ Whiteboard server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n📤 ${signal} received, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        this.server.close((err) => {
          if (err) {
            console.error('❌ Error closing HTTP server:', err);
          } else {
            console.log('✅ HTTP server closed');
          }
        });

        // Close Socket.IO connections
        this.io.close((err) => {
          if (err) {
            console.error('❌ Error closing Socket.IO:', err);
          } else {
            console.log('✅ Socket.IO closed');
          }
        });

        // Shutdown cleanup manager
        this.cleanupManager.shutdown();
        console.log('✅ Cleanup manager shutdown');

        // Disconnect Redis
        await this.redis.disconnect();
        console.log('✅ Redis disconnected');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(port, () => {
          console.log('');
          console.log('╔════════════════════════════════════════╗');
          console.log('║   🎨 Collaborative Whiteboard Server  ║');
          console.log('╠════════════════════════════════════════╣');
          console.log(`║   📡 Server: http://localhost:${port}     ║`);
          console.log(`║   🔌 WebSocket: ws://localhost:${port}    ║`);
          console.log('║   ✅ Status: Running                   ║');
          console.log('╚════════════════════════════════════════╝');
          console.log('');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
