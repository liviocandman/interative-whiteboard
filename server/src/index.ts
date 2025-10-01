import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { RedisService } from './services/core/RedisService';
import { SocketController } from './controllers/SocketController';
import { setupPubSub } from './config/pubsub';
import { CleanupManager } from './services/managers/CleanupManager';
import healthRouter from './routes/health';

dotenv.config();

class WhiteboardServer {
  private app: express.Application;
  private server: http.Server;
  private io: Server;
  private redis: RedisService;
  private socketController: SocketController;
  private cleanupManager: CleanupManager;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    
    this.redis = RedisService.getInstance();
    this.socketController = new SocketController(this.io);
    this.cleanupManager = CleanupManager.getInstance();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Redis
      await this.redis.connect();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup Socket.IO
      this.setupSocketIO();
      
      // Setup Redis Pub/Sub
      await setupPubSub(this.io);
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('✅ Whiteboard server initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    this.app.use('/', healthRouter);
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      this.socketController.setupSocketHandlers(socket);
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n📤 ${signal} received, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        this.server.close((err) => {
          if (err) {
            console.error('Error closing HTTP server:', err);
          } else {
            console.log('HTTP server closed');
          }
        });

        // Close Socket.IO
        this.io.close((err) => {
          if (err) {
            console.error('Error closing Socket.IO:', err);
          } else {
            console.log('Socket.IO closed');
          }
        });

        // Cleanup scheduled jobs
        this.cleanupManager.shutdown();

        // Disconnect Redis
        await this.redis.disconnect();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🚀 Server running on http://localhost:${port}`);
          resolve();
        }
      });
    });
  }
}

// Start server
async function startServer() {
  try {
    const server = new WhiteboardServer();
    await server.initialize();
    
    const port = parseInt(process.env.PORT || '3001');
    await server.start(port);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this file is run directly
if (require.main === module) {
  startServer();
}

export { WhiteboardServer };
