import express from 'express';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import moment from 'moment-timezone';
import { pickSubmissionLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validator';
import { submitPickValidators } from '../validators/picksValidators';
import logger from '../utils/logger';
import { PicksService } from '../services/picksService';

const router = express.Router();

// Validate magic link and get round info
router.get('/validate/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const [links] = await db.query<RowDataPacket[]>(
      `SELECT ml.*, u.name as user_name, u.email, r.*, s.name as season_name
       FROM magic_links ml
       JOIN users u ON ml.user_id = u.id
       JOIN rounds r ON ml.round_id = r.id
       JOIN seasons s ON r.season_id = s.id
       WHERE ml.token = ?`,
      [token]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    const link = links[0];
    
    // Get current time in the round's timezone
    const now = moment.tz(link.timezone);
    
    // Parse lock time from database (stored as UTC) and convert to round's timezone
    const lockTime = moment.utc(link.lock_time).tz(link.timezone);

    // Check if expired
    if (now.isAfter(lockTime)) {
      return res.status(403).json({ 
        error: 'This round is now locked',
        locked: true
      });
    }

    // Get available teams
    const [teams] = await db.query<RowDataPacket[]>(
      'SELECT team_name FROM round_teams WHERE round_id = ? ORDER BY team_name',
      [link.round_id]
    );

    // Get user's current pick if exists
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT * FROM picks WHERE user_id = ? AND round_id = ?',
      [link.user_id, link.round_id]
    );

    let currentPick = null;
    if (picks.length > 0) {
      // Get pick items for this pick
      const [pickItems] = await db.query<RowDataPacket[]>(
        'SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number',
        [picks[0].id]
      );
      
      currentPick = {
        id: picks[0].id,
        pickItems: pickItems.map(item => ({
          pickNumber: item.pick_number,
          pickValue: item.pick_value
        }))
      };
    }

    res.json({
      valid: true,
      user: {
        id: link.user_id,
        name: link.user_name
        // Email removed for privacy - not needed for pick submission
      },
      round: {
        id: link.round_id,
        sportName: link.sport_name,
        pickType: link.pick_type || 'single',
        numWriteInPicks: link.num_write_in_picks,
        lockTime: link.lock_time,
        timezone: link.timezone,
        status: link.status,
        seasonName: link.season_name
      },
      teams: teams.map(t => t.team_name),
      currentPick
    });
  } catch (error) {
    logger.error('Validate magic link error', { error, token });
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit or update pick via magic link
router.post('/:token', pickSubmissionLimiter, validateRequest(submitPickValidators), async (req, res) => {
  const { token } = req.params;
  const { picks } = req.body; // Array of pick values

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Validate magic link
    const [links] = await connection.query<RowDataPacket[]>(
      `SELECT ml.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks
       FROM magic_links ml
       JOIN rounds r ON ml.round_id = r.id
       WHERE ml.token = ?`,
      [token]
    );

    if (links.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    const link = links[0];
    const pickType = link.pick_type || 'single';
    
    // Get current time in the round's timezone
    const now = moment.tz(link.timezone);
    
    // Parse lock time from database (stored as UTC) and convert to round's timezone
    const lockTime = moment.utc(link.lock_time).tz(link.timezone);

    // Check if expired
    if (now.isAfter(lockTime) || link.status === 'locked' || link.status === 'completed') {
      await connection.rollback();
      return res.status(403).json({ error: 'This round is now locked' });
    }

    // Submit pick using centralized service
    const shouldValidateTeams = pickType === 'single';
    
    await PicksService.submitPick(connection, {
      userId: link.user_id,
      roundId: link.round_id,
      picks,
      validateTeams: shouldValidateTeams
    });

    await connection.commit();

    logger.info('Pick submitted successfully', { token, pickCount: picks.length });
    res.json({ message: 'Pick submitted successfully' });
  } catch (error) {
    await connection.rollback();
    logger.error('Submit pick error', { error, token });
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
