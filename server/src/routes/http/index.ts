import { Router } from 'express';
import healthRoutes from './health.routes';
import roomRoutes from './room.routes';

const router = Router();

// Register all HTTP routes
router.use('/', healthRoutes);
router.use('/', roomRoutes);

export default router;
