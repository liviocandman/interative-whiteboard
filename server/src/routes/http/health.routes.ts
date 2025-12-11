import { Router } from 'express';
import { HealthController } from '../../controllers/http';

const router = Router();
const healthController = new HealthController();

router.get('/health', (req, res) => healthController.getHealth(req, res));

export default router;
