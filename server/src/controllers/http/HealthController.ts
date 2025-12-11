import { Request, Response } from 'express';

export class HealthController {
  async getHealth(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'whiteboard-api',
    });
  }
}
