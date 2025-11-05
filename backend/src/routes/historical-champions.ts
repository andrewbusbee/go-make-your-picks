import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import db from '../config/database';
import logger from '../utils/logger';
import { withTransaction } from '../utils/transactionWrapper';
import { validateRequest } from '../middleware/validator';
import {
  createHistoricalChampionValidators,
  updateHistoricalChampionValidators,
  deleteHistoricalChampionValidators,
} from '../validators/historicalChampionsValidators';

const router = Router();

// Get all historical champions (admin only)
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const [champions] = await db.query(
      'SELECT * FROM historical_champions ORDER BY end_year DESC, name ASC'
    );
    
    res.json(champions);
  } catch (error) {
    logger.error('Get historical champions error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new historical champion (admin only)
router.post(
  '/',
  authenticateAdmin,
  validateRequest(createHistoricalChampionValidators),
  async (req: Request, res: Response) => {
    const { name, endYear } = req.body;

    try {
      const result = await withTransaction(async (connection) => {
        // Check for duplicate name and year combination
        const [existing] = await connection.query(
          'SELECT id FROM historical_champions WHERE name = ? AND end_year = ?',
          [name, endYear]
        );

        if (Array.isArray(existing) && existing.length > 0) {
          throw new Error('A champion with this name and year already exists');
        }

        // Insert new historical champion
        const [insertResult] = await connection.query(
          'INSERT INTO historical_champions (name, end_year) VALUES (?, ?)',
          [name, endYear]
        );

        return { id: (insertResult as any).insertId };
      });

      res.status(201).json({
        message: 'Historical champion created successfully',
        id: result.id
      });
    } catch (error: any) {
      // Log detailed error server-side, but return generic message to client
      logger.error('Create historical champion error', {
        error: error.message,
        stack: error.stack,
        name,
        endYear,
      });
      
      // Return generic error message to prevent information leakage
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: 'A champion with this name and year already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create historical champion' });
      }
    }
  }
);

// Update historical champion (admin only)
router.put(
  '/:id',
  authenticateAdmin,
  validateRequest(updateHistoricalChampionValidators),
  async (req: Request, res: Response) => {
    const championId = parseInt(req.params.id);
    const { name, endYear } = req.body;

    try {
      await withTransaction(async (connection) => {
        // Check if champion exists
        const [existing] = await connection.query(
          'SELECT id FROM historical_champions WHERE id = ?',
          [championId]
        );

        if (!Array.isArray(existing) || existing.length === 0) {
          throw new Error('Historical champion not found');
        }

        // Check for duplicate name and year combination (excluding current record)
        const [duplicates] = await connection.query(
          'SELECT id FROM historical_champions WHERE name = ? AND end_year = ? AND id != ?',
          [name, endYear, championId]
        );

        if (Array.isArray(duplicates) && duplicates.length > 0) {
          throw new Error('A champion with this name and year already exists');
        }

        // Update historical champion
        await connection.query(
          'UPDATE historical_champions SET name = ?, end_year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [name, endYear, championId]
        );
      });

      res.json({ message: 'Historical champion updated successfully' });
    } catch (error: any) {
      // Log detailed error server-side, but return generic message to client
      logger.error('Update historical champion error', {
        error: error.message,
        stack: error.stack,
        championId,
        name,
        endYear,
      });
      
      // Return generic error message to prevent information leakage
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Historical champion not found' });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ error: 'A champion with this name and year already exists' });
      } else {
        res.status(500).json({ error: 'Failed to update historical champion' });
      }
    }
  }
);

// Delete historical champion (admin only)
router.delete(
  '/:id',
  authenticateAdmin,
  validateRequest(deleteHistoricalChampionValidators),
  async (req: Request, res: Response) => {
    const championId = parseInt(req.params.id);

    try {
      await withTransaction(async (connection) => {
        // Check if champion exists
        const [existing] = await connection.query(
          'SELECT id FROM historical_champions WHERE id = ?',
          [championId]
        );

        if (!Array.isArray(existing) || existing.length === 0) {
          throw new Error('Historical champion not found');
        }

        // Delete historical champion
        await connection.query(
          'DELETE FROM historical_champions WHERE id = ?',
          [championId]
        );
      });

      res.json({ message: 'Historical champion deleted successfully' });
    } catch (error: any) {
      // Log detailed error server-side, but return generic message to client
      logger.error('Delete historical champion error', {
        error: error.message,
        stack: error.stack,
        championId,
      });
      
      // Return generic error message to prevent information leakage
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Historical champion not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete historical champion' });
      }
    }
  }
);

export default router;
