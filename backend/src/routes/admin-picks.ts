import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import moment from 'moment-timezone';
import { validateRequest } from '../middleware/validator';
import { adminCreatePickValidators } from '../validators/picksValidators';
import logger from '../utils/logger';
import { PicksService } from '../services/picksService';
import { withTransaction } from '../utils/transactionWrapper';

const router = express.Router();

// Create or update pick as admin
router.post('/', authenticateAdmin, validateRequest(adminCreatePickValidators), async (req: AuthRequest, res: Response) => {
  const { userId, roundId, picks } = req.body; // picks is array of pick values
  const adminId = req.adminId!;

  try {
    await withTransaction(async (connection) => {
      // Verify round exists and get details from rounds_v2
      const [rounds] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM rounds_v2 WHERE id = ?',
        [roundId]
      );

      if (rounds.length === 0) {
        throw new Error('Round not found');
      }

      const round = rounds[0];
      const pickType = round.pick_type || 'single';

      // Allow admin to enter picks even after lock time
      // But prevent if round is completed
      if (round.status === 'completed') {
        throw new Error('Cannot modify picks for completed rounds');
      }

      // Check if pick already exists and capture original value for edit tracking from picks_v2 + pick_items_v2 + teams_v2
      const [existingPicks] = await connection.query<RowDataPacket[]>(
        `SELECT p.id, t.name as pick_value 
         FROM picks_v2 p
         LEFT JOIN pick_items_v2 pi ON p.id = pi.pick_id
         LEFT JOIN teams_v2 t ON pi.team_id = t.id
         WHERE p.round_id = ? AND p.user_id = ?
         ORDER BY pi.pick_number`,
        [roundId, userId]
      );

      // Capture original pick value before updating (for both regular teams and write-ins)
      let originalPickValue: string | null = null;
      if (existingPicks.length > 0) {
        const originalPicks = existingPicks.map((p: any) => p.pick_value).filter((v: string) => v !== null);
        if (originalPicks.length > 0) {
          originalPickValue = originalPicks.join(', ');
        }
      }

      // Submit pick using centralized service
      const shouldValidateTeams = pickType === 'single';
      
      await PicksService.submitPick(connection, {
        userId,
        roundId,
        picks,
        validateTeams: shouldValidateTeams
      });

      // Update pick with admin edit tracking information in picks_v2
      // Only set original_pick if this is the first time admin is editing (original_pick is NULL)
      await connection.query(
        `UPDATE picks_v2 
         SET admin_edited = TRUE,
             edited_by_admin_id = ?,
             edited_at = NOW(),
             original_pick = COALESCE(original_pick, ?)
         WHERE round_id = ? AND user_id = ?`,
        [adminId, originalPickValue, roundId, userId]
      );
    });

    logger.info('Admin pick saved successfully', { userId, roundId, pickCount: picks.length, adminId });
    res.json({ message: 'Pick saved successfully' });
  } catch (error: any) {
    logger.error('Admin pick error', { error, userId, roundId });
    
    if (error.message === 'Round not found') {
      return res.status(404).json({ error: 'Round not found' });
    } else if (error.message === 'Cannot modify picks for completed rounds') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pick for a user/round
router.get('/:roundId/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.roundId);
  const userId = parseInt(req.params.userId);

  try {
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT * FROM picks_v2 WHERE round_id = ? AND user_id = ?',
      [roundId, userId]
    );

    if (picks.length === 0) {
      return res.json(null);
    }

    // Get pick items from pick_items_v2 + teams_v2
    const [pickItems] = await db.query<RowDataPacket[]>(
      `SELECT pi.pick_number, t.name as pick_value 
       FROM pick_items_v2 pi
       JOIN teams_v2 t ON pi.team_id = t.id
       WHERE pi.pick_id = ? 
       ORDER BY pi.pick_number`,
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
