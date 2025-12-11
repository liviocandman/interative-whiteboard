import express from 'express';
import cors from 'cors';
import { httpRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { getCorsOrigin } from './config/cors.config';

/**
 * Create and configure Express application
 */
export function createApp(): express.Application {
  const app = express();

  // CORS - Secure configuration using environment variables
  app.use(
    cors({
      origin: getCorsOrigin(),
      credentials: true,
    })
  );

  // Body parsing with size limits to prevent DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (safe for production - no sensitive data)
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.use('/', httpRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling
  app.use(errorHandler);

  return app;
}
