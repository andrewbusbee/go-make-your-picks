import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '../utils/logger';
import { ScoringService } from '../services/scoringService';
import { SettingsService } from '../services/settingsService';
import { withTransaction } from '../utils/transactionWrapper';
import { MIN_VALID_YEAR, MAX_VALID_YEAR } from '../config/constants';
import { QueryCacheService } from '../services/queryCacheService';

const router = express.Router();

// Validation function for season years
const validateSeasonYears = (yearStart: number, yearEnd: number): string | null => {
  const MIN_YEAR = MIN_VALID_YEAR;
  const MAX_YEAR = MAX_VALID_YEAR;

  if (yearStart < MIN_YEAR || yearStart > MAX_YEAR) {
    return `Start year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
  }

  if (yearEnd < MIN_YEAR || yearEnd > MAX_YEAR) {
    return `End year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
  }

  if (yearEnd < yearStart) {
    return 'End year must be greater than or equal to start year';
  }

  return null; // No errors
};

// Get all seasons (public) - excludes deleted
// Cached for 30 seconds since seasons don't change frequently
router.get('/', async (req, res) => {
  try {
    const cacheKey = QueryCacheService.generateKey('seasons:all');
    
    const result = await QueryCacheService.cached(
      cacheKey,
      async () => {
        const [seasons] = await db.query<RowDataPacket[]>(
          'SELECT * FROM seasons WHERE deleted_at IS NULL ORDER BY year_start DESC'
        );
        
        // Optimize: Calculate leaderboards in parallel (if needed) instead of sequentially
        // Only calculate for active seasons (not ended)
        const activeSeasons = seasons.filter(s => !s.ended_at);
        
        // Batch calculate all leaderboards in parallel
        const leaderboardPromises = activeSeasons.map(season =>
          ScoringService.calculateLeaderboard(season.id)
            .then(leaderboard => ({
              seasonId: season.id,
              leaderboard: leaderboard.leaderboard
                .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
                .map((entry: any, index: number) => ({
                  rank: index + 1,
                  userId: entry.userId,
                  name: entry.userName,
                  totalPoints: entry.totalPoints
                }))
            }))
            .catch(error => {
              logger.error('Error calculating leaderboard for season', { seasonId: season.id, error });
              return { seasonId: season.id, leaderboard: null };
            })
        );
        
        const leaderboardResults = await Promise.all(leaderboardPromises);
        
        // Build leaderboard lookup map
        const leaderboardMap = new Map(
          leaderboardResults.map(result => [result.seasonId, result.leaderboard])
        );
        
        // Attach leaderboards to seasons with O(1) lookup
        const seasonsWithLeaderboard = seasons.map(season => {
          if (!season.ended_at && leaderboardMap.has(season.id)) {
            const leaderboard = leaderboardMap.get(season.id);
            if (leaderboard) {
              return { ...season, leaderboard };
            }
          }
          return season;
        });
        
        return seasonsWithLeaderboard;
      },
      30000 // 30 second cache for public seasons list
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Get seasons error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get default season (public) - excludes deleted
router.get('/default', async (req, res) => {
  try {
    // Try to get default season (not deleted)
    const [defaultSeasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE is_default = TRUE AND deleted_at IS NULL LIMIT 1'
    );
    
    if (defaultSeasons.length > 0) {
      return res.json(defaultSeasons[0]);
    }
    
    // If no default, get latest created season (not deleted)
    const [latestSeasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
    );
    
    res.json(latestSeasons[0] || null);
  } catch (error) {
    logger.error('Get default season error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active seasons (public) - excludes deleted
router.get('/active', async (req, res) => {
  try {
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE is_active = TRUE AND deleted_at IS NULL ORDER BY year_start DESC'
    );
    res.json(seasons);
  } catch (error) {
    logger.error('Get active seasons error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get season winners (public)
router.get('/:id/winners', async (req, res) => {
  const seasonId = parseInt(req.params.id);
  
  try {
    const [winners] = await db.query<RowDataPacket[]>(
      `SELECT sw.*, u.name as user_name
       FROM season_winners sw
       JOIN users u ON sw.user_id = u.id
       WHERE sw.season_id = ?
       ORDER BY sw.place ASC`,
      [seasonId]
    );
    res.json(winners);
  } catch (error) {
    logger.error('Get season winners error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new season (admin only)
router.post('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { name, yearStart, yearEnd, commissioner, isDefault, participantIds } = req.body;

  if (!name || !yearStart || !yearEnd) {
    return res.status(400).json({ error: 'Name, year start, and year end are required' });
  }

  // Validate string length
  if (name.length > 50) {
    return res.status(400).json({ error: 'Season name must be 50 characters or less' });
  }

  // Validate commissioner length if provided
  if (commissioner && commissioner.length > 255) {
    return res.status(400).json({ error: 'Commissioner name must be 255 characters or less' });
  }

  // Validate years
  const yearValidationError = validateSeasonYears(yearStart, yearEnd);
  if (yearValidationError) {
    return res.status(400).json({ error: yearValidationError });
  }

  try {
    const seasonId = await withTransaction(async (connection) => {
      // New season is always active
      // If setting as default, unset all other defaults first
      if (isDefault) {
        await connection.query('UPDATE seasons SET is_default = FALSE');
      }

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO seasons (name, year_start, year_end, commissioner, is_active, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [name, yearStart, yearEnd, commissioner || null, true, isDefault || false]
      );

      const seasonId = result.insertId;

      // Add participants if provided
      if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
        const participantValues = participantIds.map((userId: number) => [seasonId, userId]);
        await connection.query(
          'INSERT INTO season_participants (season_id, user_id) VALUES ?',
          [participantValues]
        );
      }

      return seasonId;
    });

    // Invalidate seasons cache after creation
    QueryCacheService.invalidatePattern('seasons:');
    
    res.status(201).json({
      message: 'Season created successfully',
      id: seasonId
    });
  } catch (error) {
    logger.error('Create season error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit season (admin only)
router.put('/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);
  const { name, yearStart, yearEnd, commissioner, isDefault } = req.body;

  // Validate required fields
  if (!name || !yearStart || !yearEnd) {
    return res.status(400).json({ error: 'Name, year start, and year end are required' });
  }

  // Validate string length
  if (name.length > 50) {
    return res.status(400).json({ error: 'Season name must be 50 characters or less' });
  }

  // Validate commissioner length if provided
  if (commissioner && commissioner.length > 255) {
    return res.status(400).json({ error: 'Commissioner name must be 255 characters or less' });
  }

  // Validate years
  const yearValidationError = validateSeasonYears(yearStart, yearEnd);
  if (yearValidationError) {
    return res.status(400).json({ error: yearValidationError });
  }

  try {
    await withTransaction(async (connection) => {
      // Check if season exists
      const [existingSeasons] = await connection.query<RowDataPacket[]>(
        'SELECT id, is_active FROM seasons WHERE id = ? AND deleted_at IS NULL',
        [seasonId]
      );

      if (existingSeasons.length === 0) {
        throw new Error('Season not found');
      }

      // If setting as default, check if season is active
      if (isDefault && !existingSeasons[0].is_active) {
        throw new Error('Only active seasons can be set as default');
      }

      // If setting as default, unset all other defaults first
      if (isDefault) {
        await connection.query('UPDATE seasons SET is_default = FALSE');
      }

      // Update season
      await connection.query(
        'UPDATE seasons SET name = ?, year_start = ?, year_end = ?, commissioner = ?, is_default = ? WHERE id = ?',
        [name, yearStart, yearEnd, commissioner || null, isDefault || false, seasonId]
      );
    });

    // Invalidate seasons cache after update
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season updated successfully' });
  } catch (error: any) {
    logger.error('Edit season error', { error, seasonId });
    
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    } else if (error.message === 'Only active seasons can be set as default') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Set default season (admin only)
router.put('/:id/set-default', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    await withTransaction(async (connection) => {
      // Check if season is active
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT is_active FROM seasons WHERE id = ?',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      if (!seasons[0].is_active) {
        throw new Error('Only active seasons can be set as default');
      }

      // Unset all other defaults
      await connection.query('UPDATE seasons SET is_default = FALSE');
      
      // Set this season as default
      await connection.query('UPDATE seasons SET is_default = TRUE WHERE id = ?', [seasonId]);
    });

    // Invalidate seasons cache after default change
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Default season updated successfully' });
  } catch (error: any) {
    logger.error('Set default season error', { error });
    
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    } else if (error.message === 'Only active seasons can be set as default') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle season active status (admin only)
router.put('/:id/toggle-active', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    const result = await withTransaction(async (connection) => {
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT is_active, is_default FROM seasons WHERE id = ?',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      const currentlyActive = seasons[0].is_active;
      const isDefault = seasons[0].is_default;

      // If deactivating and it's the default, unset default
      if (currentlyActive && isDefault) {
        await connection.query('UPDATE seasons SET is_default = FALSE WHERE id = ?', [seasonId]);
      }

      // Toggle active status
      await connection.query('UPDATE seasons SET is_active = ? WHERE id = ?', [!currentlyActive, seasonId]);

      return { currentlyActive };
    });

    // Invalidate seasons cache after toggle
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ 
      message: `Season ${result.currentlyActive ? 'deactivated' : 'activated'} successfully`,
      isActive: !result.currentlyActive
    });
  } catch (error: any) {
    logger.error('Toggle active season error', { error });
    
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Get deleted seasons (admin only)
router.get('/deleted', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    res.json(seasons);
  } catch (error) {
    logger.error('Get deleted seasons error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// End a season (admin only) - calculates and stores top 3 winners
router.post('/:id/end', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    const storedWinners = await withTransaction(async (connection) => {
      // Check if season exists and is not deleted
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM seasons WHERE id = ? AND deleted_at IS NULL',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      const season = seasons[0];

      if (season.ended_at) {
        throw new Error('Season has already ended');
      }

      // Check if all sports/rounds for this season are completed
      const [incompleteRounds] = await connection.query<RowDataPacket[]>(
        `SELECT id, sport_name, status 
         FROM rounds 
         WHERE season_id = ? 
         AND deleted_at IS NULL 
         AND status != 'completed'`,
        [seasonId]
      );

      if (incompleteRounds.length > 0) {
        const incompleteSports = incompleteRounds.map(round => `${round.sport_name} (${round.status})`).join(', ');
        throw new Error(`Cannot end season. The following sports are not yet completed: ${incompleteSports}. All sports must be completed before ending a season.`);
      }

      // Capture current point settings to preserve historical accuracy
      const points = await SettingsService.getPointsSettings();
      
      logger.debug('Capturing point settings for season', { 
        seasonId, 
        points: {
          first: points.pointsFirst,
          second: points.pointsSecond,
          third: points.pointsThird,
          fourth: points.pointsFourth,
          fifth: points.pointsFifth,
          sixthPlus: points.pointsSixthPlus
        }
      });

      // Calculate final standings using centralized ScoringService
      const leaderboard = await ScoringService.calculateFinalStandings(seasonId);

      logger.debug('Leaderboard results', { count: leaderboard.length, results: leaderboard });

      // Clear any existing winners for this season (in case of previous failed attempts)
      await connection.query('DELETE FROM season_winners WHERE season_id = ?', [seasonId]);

      // Handle ties properly - assign ranks with tie handling
      let currentRank = 1;
      let currentScore = leaderboard.length > 0 ? leaderboard[0].total_points : 0;
      let tiedCount = 1;
      
      for (let i = 0; i < leaderboard.length && i < 5; i++) { // Store up to 5 winners for podium flexibility
        const player = leaderboard[i];
        
        // If this player has a different score than the previous, update rank
        if (i > 0 && player.total_points < currentScore) {
          currentRank += tiedCount; // Skip ranks after ties
          currentScore = player.total_points;
          tiedCount = 1;
        } else if (i > 0 && player.total_points === currentScore) {
          // Same score as previous player - they're tied, keep the same rank
          tiedCount++;
        }
        
        logger.debug('Inserting winner with point settings', { 
          seasonId, 
          place: currentRank, 
          userId: player.user_id, 
          totalPoints: player.total_points,
          pointSettings: points
        });
        
        // Store winner with current point settings for historical accuracy
        await connection.query<ResultSetHeader>(
          `INSERT INTO season_winners 
           (season_id, place, user_id, total_points, points_first_place, points_second_place, points_third_place, points_fourth_place, points_fifth_place, points_sixth_plus_place) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [seasonId, currentRank, player.user_id, player.total_points, points.pointsFirst, points.pointsSecond, points.pointsThird, points.pointsFourth, points.pointsFifth, points.pointsSixthPlus]
        );
      }

      // Set ended_at timestamp
      await connection.query(
        'UPDATE seasons SET ended_at = NOW() WHERE id = ?',
        [seasonId]
      );

      // Get the stored winners with proper rankings
      const [storedWinners] = await connection.query<RowDataPacket[]>(
        `SELECT sw.*, u.name as user_name
         FROM season_winners sw
         JOIN users u ON sw.user_id = u.id
         WHERE sw.season_id = ?
         ORDER BY sw.place ASC, sw.total_points DESC`,
        [seasonId]
      );

      return storedWinners;
    });

    // Invalidate seasons cache after ending
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ 
      message: 'Season ended successfully',
      winners: storedWinners
    });
  } catch (error: any) {
    logger.error('End season error', { error, seasonId });
    
    // Handle specific error messages
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    } else if (error.message === 'Season has already ended') {
      return res.status(400).json({ error: error.message });
    } else if (error.message.includes('Cannot end season')) {
      return res.status(400).json({ error: error.message });
    } else if (error.message.includes('Duplicate entry')) {
      return res.status(500).json({ error: 'Season winners already exist. Please check if season was already ended.' });
    } else if (error.message.includes('foreign key constraint')) {
      return res.status(500).json({ error: 'Database constraint error. Please check season and participant data.' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Reopen an ended season (admin only)
router.post('/:id/reopen', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    await withTransaction(async (connection) => {
      // Check if season exists and is ended
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM seasons WHERE id = ? AND deleted_at IS NULL',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      const season = seasons[0];

      if (!season.ended_at) {
        throw new Error('Season is not ended');
      }

      // Clear ended_at timestamp
      await connection.query(
        'UPDATE seasons SET ended_at = NULL WHERE id = ?',
        [seasonId]
      );

      // Remove winner records
      await connection.query(
        'DELETE FROM season_winners WHERE season_id = ?',
        [seasonId]
      );
    });

    // Invalidate seasons cache after reopen
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season reopened successfully' });
  } catch (error: any) {
    logger.error('Reopen season error', { error, seasonId });
    
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    } else if (error.message === 'Season is not ended') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete a season (admin only)
router.post('/:id/soft-delete', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    // Check if season exists
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE id = ? AND deleted_at IS NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await db.query(
      'UPDATE seasons SET deleted_at = NOW(), is_active = FALSE, is_default = FALSE WHERE id = ?',
      [seasonId]
    );

    // Invalidate seasons cache after soft delete
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season deleted successfully (can be restored)' });
  } catch (error) {
    logger.error('Soft delete season error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore a deleted season (admin only)
router.post('/:id/restore', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);

  try {
    // Check if season exists and is deleted
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE id = ? AND deleted_at IS NOT NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Deleted season not found' });
    }

    // Restore by clearing deleted_at timestamp
    await db.query(
      'UPDATE seasons SET deleted_at = NULL WHERE id = ?',
      [seasonId]
    );

    // Invalidate seasons cache after restore
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season restored successfully' });
  } catch (error) {
    logger.error('Restore season error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Permanently delete a season (main admin only)
router.delete('/:id/permanent', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);
  const { confirmation } = req.body;

  try {
    // Check if user is main admin
    if (!req.isMainAdmin) {
      return res.status(403).json({ error: 'Only the Main Admin can permanently delete seasons. Please contact the Main Admin to permanently delete this season.' });
    }

    // Check if season exists and is already soft-deleted
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons WHERE id = ? AND deleted_at IS NOT NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Deleted season not found. Only soft-deleted seasons can be permanently deleted.' });
    }

    // Verify confirmation
    if (confirmation !== 'PERMANENT DELETE') {
      return res.status(400).json({ error: 'Invalid confirmation. Must type "PERMANENT DELETE" exactly.' });
    }

    // Permanently delete (CASCADE will handle all related data)
    await db.query('DELETE FROM seasons WHERE id = ?', [seasonId]);

    // Invalidate seasons cache after permanent delete
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season permanently deleted' });
  } catch (error) {
    logger.error('Permanent delete season error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
