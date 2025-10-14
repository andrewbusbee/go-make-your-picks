import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '../utils/logger';

const router = express.Router();

// Get all users
router.get('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_active, created_at FROM users ORDER BY name ASC'
    );
    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user has any data (picks, scores, participation)
router.get('/:id/has-data', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);

  try {
    // Check picks
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM picks WHERE user_id = ?',
      [userId]
    );

    // Check scores
    const [scores] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM scores WHERE user_id = ?',
      [userId]
    );

    // Check season winners
    const [winners] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_winners WHERE user_id = ?',
      [userId]
    );

    // User has data if they have picks, scores, or podium finishes
    // Note: season_participants is NOT considered "data" - it's just membership
    const hasData = picks[0].count > 0 || scores[0].count > 0 || winners[0].count > 0;

    res.json({ 
      hasData,
      details: {
        picks: picks[0].count,
        scores: scores[0].count,
        wins: winners[0].count
      }
    });
  } catch (error) {
    logger.error('Check user data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new user
router.post('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate string length
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or less' });
  }

  // Email is optional - if provided, validate it
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  // Use a placeholder email if none provided (to maintain uniqueness)
  const finalEmail = email || `noemail-${Date.now()}@placeholder.local`;

  try {
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, finalEmail]
    );

    res.status(201).json({
      message: 'User created successfully',
      id: result.insertId
    });
  } catch (error: any) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate string length
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be 100 characters or less' });
  }

  // Email is optional - if provided, validate it
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  // Use a placeholder email if none provided
  const finalEmail = email || `noemail-${Date.now()}@placeholder.local`;

  try {
    await db.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, finalEmail, userId]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deactivate user (for users with data)
router.post('/:id/deactivate', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);

  try {
    await db.query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [userId]
    );
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reactivate user
router.post('/:id/reactivate', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);

  try {
    await db.query(
      'UPDATE users SET is_active = TRUE WHERE id = ?',
      [userId]
    );
    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    logger.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (only if no data exists)
router.delete('/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);

  try {
    // Check if user has any data
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM picks WHERE user_id = ?',
      [userId]
    );

    const [scores] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM scores WHERE user_id = ?',
      [userId]
    );

    const [winners] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_winners WHERE user_id = ?',
      [userId]
    );

    // User has data if they have picks, scores, or podium finishes
    // Note: season_participants will be deleted via CASCADE, not considered "data"
    const hasData = picks[0].count > 0 || scores[0].count > 0 || winners[0].count > 0;

    if (hasData) {
      return res.status(400).json({ 
        error: 'Cannot delete player with existing data. Please deactivate instead.'
      });
    }

    // Only delete if no data exists (CASCADE will remove season_participants)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
