import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logError, logInfo, logWarn } from '../utils/logger';

const router = express.Router();

// Get participants for a season
router.get('/:seasonId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const adminEmail = req.user?.email;

  logInfo('Getting season participants', { seasonId, adminEmail });

  try {
    const [participants] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.is_active, sp.created_at as added_at
       FROM season_participants sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.season_id = ?
       ORDER BY u.name ASC`,
      [seasonId]
    );

    logInfo('Season participants retrieved successfully', { 
      seasonId, 
      participantCount: participants.length,
      adminEmail 
    });

    res.json(participants);
  } catch (error) {
    logError('Get participants error', error, { seasonId, adminEmail });
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add participant to season
router.post('/:seasonId/participants', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const { userId } = req.body;
  const adminEmail = req.user?.email;

  logInfo('Adding participant to season', { seasonId, userId, adminEmail });

  if (!userId) {
    logWarn('Add participant request missing user ID', { seasonId, adminEmail });
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await db.query(
      'INSERT IGNORE INTO season_participants (season_id, user_id) VALUES (?, ?)',
      [seasonId, userId]
    );

    logInfo('Participant added to season successfully', { seasonId, userId, adminEmail });
    res.json({ message: 'Participant added successfully' });
  } catch (error) {
    logError('Add participant error', error, { seasonId, userId, adminEmail });
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add all users to season
router.post('/:seasonId/participants/bulk', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const adminEmail = req.user?.email;

  logInfo('Adding all users to season', { seasonId, adminEmail });

  try {
    // Get all users
    const [users] = await db.query<RowDataPacket[]>('SELECT id FROM users');
    
    if (users.length === 0) {
      logWarn('No users found to add to season', { seasonId, adminEmail });
      return res.json({ message: 'No users to add', added: 0 });
    }

    // Add all users to the season (INSERT IGNORE will skip any already added)
    const values = users.map(user => [seasonId, user.id]);
    await db.query(
      'INSERT IGNORE INTO season_participants (season_id, user_id) VALUES ?',
      [values]
    );

    logInfo('All users added to season successfully', { 
      seasonId, 
      userCount: users.length,
      adminEmail 
    });

    res.json({ message: 'All players added successfully', added: users.length });
  } catch (error) {
    logError('Add all participants error', error, { seasonId, adminEmail });
    console.error('Add all participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove participant from season
router.delete('/:seasonId/participants/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const userId = parseInt(req.params.userId);
  const adminEmail = req.user?.email;

  logInfo('Removing participant from season', { seasonId, userId, adminEmail });

  try {
    await db.query(
      'DELETE FROM season_participants WHERE season_id = ? AND user_id = ?',
      [seasonId, userId]
    );

    logInfo('Participant removed from season successfully', { seasonId, userId, adminEmail });
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    logError('Remove participant error', error, { seasonId, userId, adminEmail });
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
