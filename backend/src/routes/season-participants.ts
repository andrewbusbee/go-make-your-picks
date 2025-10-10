import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();

// Get participants for a season
router.get('/:seasonId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    const [participants] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.is_active, sp.created_at as added_at
       FROM season_participants sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.season_id = ?
       ORDER BY u.name ASC`,
      [seasonId]
    );

    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add participant to season
router.post('/:seasonId/participants', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await db.query(
      'INSERT IGNORE INTO season_participants (season_id, user_id) VALUES (?, ?)',
      [seasonId, userId]
    );

    res.json({ message: 'Participant added successfully' });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add all users to season
router.post('/:seasonId/participants/bulk', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    // Get all users
    const [users] = await db.query<RowDataPacket[]>('SELECT id FROM users');
    
    if (users.length === 0) {
      return res.json({ message: 'No users to add', added: 0 });
    }

    // Add all users to the season (INSERT IGNORE will skip any already added)
    const values = users.map(user => [seasonId, user.id]);
    await db.query(
      'INSERT IGNORE INTO season_participants (season_id, user_id) VALUES ?',
      [values]
    );

    res.json({ message: 'All players added successfully', added: users.length });
  } catch (error) {
    console.error('Add all participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove participant from season
router.delete('/:seasonId/participants/:userId', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);
  const userId = parseInt(req.params.userId);

  try {
    await db.query(
      'DELETE FROM season_participants WHERE season_id = ? AND user_id = ?',
      [seasonId, userId]
    );

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
