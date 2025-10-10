import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import moment from 'moment-timezone';
import { validateRequest } from '../middleware/validator';
import { adminCreatePickValidators } from '../validators/picksValidators';
import logger from '../utils/logger';
import { PicksService } from '../services/picksService';

const router = express.Router();

// Create or update pick as admin
router.post('/', authenticateAdmin, validateRequest(adminCreatePickValidators), async (req: AuthRequest, res: Response) => {
  const { userId, roundId, picks } = req.body; // picks is array of pick values

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Verify round exists and get details
    const [rounds] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM rounds WHERE id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];
    const pickType = round.pick_type || 'single';

    // Allow admin to enter picks even after lock time
    // But prevent if round is completed
    if (round.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot modify picks for completed rounds' });
    }

    // Submit pick using centralized service
    const shouldValidateTeams = pickType === 'single';
    
    await PicksService.submitPick(connection, {
      userId,
      roundId,
      picks,
      validateTeams: shouldValidateTeams
    });

    await connection.commit();

    logger.info('Admin pick saved successfully', { userId, roundId, pickCount: picks.length });
    res.json({ message: 'Pick saved successfully' });
  } catch (error) {
    await connection.rollback();
    logger.error('Admin pick error', { error, userId, roundId });
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get pick for a user/round
router.get('/:roundId/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.roundId);
  const userId = parseInt(req.params.userId);

  try {
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT * FROM picks WHERE round_id = ? AND user_id = ?',
      [roundId, userId]
    );

    if (picks.length === 0) {
      return res.json(null);
    }

    // Get pick items
    const [pickItems] = await db.query<RowDataPacket[]>(
      'SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number',
      [picks[0].id]
    );

    res.json({
      id: picks[0].id,
      pickItems: pickItems.map(item => ({
        pickNumber: item.pick_number,
        pickValue: item.pick_value
      }))
    });
  } catch (error) {
    logger.error('Get pick error', { error, roundId, userId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
