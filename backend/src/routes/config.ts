import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// Public endpoint to get client-side configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = {
      enableDevTools: process.env.ENABLE_DEV_TOOLS === 'true'
    };
    
    res.json(config);
  } catch (error) {
    logger.error('Error fetching config', { error });
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;

