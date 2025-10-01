import { Router } from 'express';
import { RedisService } from '../services/core/RedisService';
import { CleanupManager } from '../services/managers/CleanupManager';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'whiteboard-server'
  });
});

router.get('/health', async (_req, res) => {
  const redis = RedisService.getInstance();
  const cleanup = CleanupManager.getInstance();
  
  try {
    // Test Redis connection
    await redis.set('health-check', 'ok');
    await redis.del('health-check');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'connected',
        cleanup: {
          pendingJobs: cleanup.getJobCount()
        }
      }
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

export default router;