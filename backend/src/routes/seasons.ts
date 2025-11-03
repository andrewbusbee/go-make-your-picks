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
import { sendSeasonEndingEmail } from '../services/emailService';

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
          `SELECT s.*, 
           (SELECT COUNT(*) FROM rounds_v2 r WHERE r.season_id = s.id AND r.status = 'completed' AND r.deleted_at IS NULL) as completed_rounds_count
           FROM seasons_v2 s 
           WHERE s.deleted_at IS NULL 
           ORDER BY s.year_start DESC`
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
    // Try to get default season (not deleted) from seasons_v2
    const [defaultSeasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons_v2 WHERE is_default = TRUE AND deleted_at IS NULL LIMIT 1'
    );
    
    if (defaultSeasons.length > 0) {
      return res.json(defaultSeasons[0]);
    }
    
    // If no default, get latest created season (not deleted) from seasons_v2
    const [latestSeasons] = await db.query<RowDataPacket[]>(
      'SELECT * FROM seasons_v2 WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
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
      'SELECT * FROM seasons_v2 WHERE is_active = TRUE AND deleted_at IS NULL ORDER BY year_start DESC'
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
       FROM season_winners_v2 sw
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

// Get all champions (public) - for champions wall
router.get('/champions', async (req, res) => {
  try {
    // Get all ended seasons with their champions (1st place only)
    const [seasonChampions] = await db.query<RowDataPacket[]>(
      `SELECT 
        s.id as season_id,
        s.name as season_name,
        s.year_start,
        s.year_end,
        s.ended_at,
        sw.place,
        sw.total_points,
        u.name as user_name,
        'season' as champion_type
       FROM seasons_v2 s
       JOIN season_winners_v2 sw ON s.id = sw.season_id
       JOIN users u ON sw.user_id = u.id
       WHERE s.ended_at IS NOT NULL 
       AND s.deleted_at IS NULL
       AND sw.place = 1
       ORDER BY s.year_end DESC, s.id DESC, sw.total_points DESC, u.name ASC`
    );

    // Get historical champions
    const [historicalChampions] = await db.query<RowDataPacket[]>(
      `SELECT 
        id as season_id,
        name as season_name,
        end_year as year_end,
        name as user_name,
        'historical' as champion_type,
        NULL as year_start,
        NULL as ended_at,
        NULL as place,
        NULL as total_points
       FROM historical_champions
       ORDER BY end_year DESC, name ASC`
    );

    // Combine and sort all champions by year_end (descending)
    const allChampions = [...seasonChampions, ...historicalChampions].sort((a, b) => {
      const aYear = a.year_end || 0;
      const bYear = b.year_end || 0;
      if (aYear !== bYear) {
        return bYear - aYear; // Descending by year
      }
      // If same year, season champions come before historical
      if (a.champion_type === 'season' && b.champion_type === 'historical') return -1;
      if (a.champion_type === 'historical' && b.champion_type === 'season') return 1;
      return 0;
    });

    // Get app settings for display
    const [settings] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value 
       FROM text_settings 
       WHERE setting_key IN ('app_title', 'app_tagline')`
    );

    const appTitle = settings.find(s => s.setting_key === 'app_title')?.setting_value || 'Go Make Your Picks';
    const appTagline = settings.find(s => s.setting_key === 'app_tagline')?.setting_value || 'Predict. Compete. Win.';

    // Get years active range - established year is the earliest of seasons or historical champions
    const [yearRange] = await db.query<RowDataPacket[]>(
      `SELECT 
        LEAST(
          COALESCE((SELECT MIN(year_end) FROM seasons_v2 WHERE ended_at IS NOT NULL AND deleted_at IS NULL), 9999),
          COALESCE((SELECT MIN(end_year) FROM historical_champions), 9999)
        ) as first_year,
        GREATEST(
          COALESCE((SELECT MAX(year_end) FROM seasons_v2 WHERE ended_at IS NOT NULL AND deleted_at IS NULL), 0),
          COALESCE((SELECT MAX(end_year) FROM historical_champions), 0)
        ) as last_year`
    );

    // Get current commissioner from admins table (authoritative)
    const [commissionerRows] = await db.query<RowDataPacket[]>(
      `SELECT name FROM admins WHERE is_commissioner = TRUE LIMIT 1`
    );
    const currentCommissioner = commissionerRows[0]?.name || null;

    res.json({
      champions: allChampions,
      appTitle,
      appTagline,
      currentCommissioner,
      yearsActive: yearRange.length > 0 ? {
        first: yearRange[0].first_year,
        last: yearRange[0].last_year
      } : null
    });
  } catch (error) {
    logger.error('Get champions error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new season (admin only)
router.post('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { name, yearStart, yearEnd, commissioner, isDefault, participantIds, copySports, sourceSeasonId } = req.body;

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

  // Validate copy sports parameters
  if (copySports && !sourceSeasonId) {
    return res.status(400).json({ error: 'Source season ID is required when copying sports' });
  }

  try {
    const result = await withTransaction(async (connection) => {
      // New season is always active
      // If setting as default, unset all other defaults first
      if (isDefault) {
        await connection.query('UPDATE seasons_v2 SET is_default = FALSE');
      }

      const [seasonResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO seasons_v2 (name, year_start, year_end, is_active, is_default) VALUES (?, ?, ?, ?, ?)',
        [name, yearStart, yearEnd, true, isDefault || false]
      );

      const seasonId = seasonResult.insertId;

      // Add participants if provided to season_participants_v2
      if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
        const participantValues = participantIds.map((userId: number) => [seasonId, userId]);
        await connection.query(
          'INSERT INTO season_participants_v2 (season_id, user_id) VALUES ?',
          [participantValues]
        );
      }

      // Copy sports if requested
      let copyResult = null;
      if (copySports && sourceSeasonId) {
        // Verify source season exists and is not deleted from seasons_v2
        const [sourceSeasons] = await connection.query<RowDataPacket[]>(
          'SELECT id, name FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
          [sourceSeasonId]
        );

        if (sourceSeasons.length === 0) {
          throw new Error('Source season not found');
        }

        const sourceSeason = sourceSeasons[0];

        // Get sports from source season from rounds_v2
        const [sourceSports] = await connection.query<RowDataPacket[]>(
          'SELECT sport_name FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL',
          [sourceSeasonId]
        );

        if (sourceSports.length > 0) {
          // Insert new sports into target season with placeholder lock_time
          // Admin will need to edit each sport to set proper lock_time before activating
          const placeholderLockTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
          
          const insertValues = sourceSports.map(sport => [
            seasonId,
            sport.sport_name,
            placeholderLockTime,
            'draft', // Always start as draft
            new Date() // created_at
          ]);

          await connection.query(
            `INSERT INTO rounds_v2 (season_id, sport_name, lock_time, status, created_at) VALUES ${insertValues.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
            insertValues.flat()
          );

          copyResult = {
            copied_count: sourceSports.length,
            source_season: sourceSeason.name
          };
        } else {
          copyResult = {
            copied_count: 0,
            source_season: sourceSeason.name,
            message: 'No sports found in source season'
          };
        }
      }

      return { seasonId, copyResult };
    });

    // Invalidate seasons cache after creation
    QueryCacheService.invalidatePattern('seasons:');
    
    const response: any = {
      message: 'Season created successfully',
      id: result.seasonId
    };

    if (result.copyResult) {
      response.copy_sports = result.copyResult;
    }
    
    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Create season error', { error });
    
    if (error.message === 'Source season not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit season (admin only)
router.put('/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.id);
  const { name, yearStart, yearEnd, commissioner, isDefault, copySports, sourceSeasonId } = req.body;

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

  // Validate copy sports parameters
  if (copySports && !sourceSeasonId) {
    return res.status(400).json({ error: 'Source season ID is required when copying sports' });
  }

  try {
    const result = await withTransaction(async (connection) => {
      // Check if season exists
      const [existingSeasons] = await connection.query<RowDataPacket[]>(
        'SELECT id, is_active FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
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
        await connection.query('UPDATE seasons_v2 SET is_default = FALSE');
      }

      // Update season
      await connection.query(
        'UPDATE seasons_v2 SET name = ?, year_start = ?, year_end = ?, is_default = ? WHERE id = ?',
        [name, yearStart, yearEnd, isDefault || false, seasonId]
      );

      // Copy sports if requested
      let copyResult = null;
      if (copySports && sourceSeasonId) {
        // Verify source season exists and is not deleted
        const [sourceSeasons] = await connection.query<RowDataPacket[]>(
          'SELECT id, name FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
          [sourceSeasonId]
        );

        if (sourceSeasons.length === 0) {
          throw new Error('Source season not found');
        }

        const sourceSeason = sourceSeasons[0];

        // Get sports from source season
        const [sourceSports] = await connection.query<RowDataPacket[]>(
          'SELECT sport_name FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL',
          [sourceSeasonId]
        );

        if (sourceSports.length > 0) {
          // Get existing sports in target season to prevent duplicates
          const [existingSports] = await connection.query<RowDataPacket[]>(
            'SELECT sport_name FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL',
            [seasonId]
          );

          const existingSportNames = new Set(existingSports.map(s => s.sport_name));

          // Filter out sports that already exist in target season
          const sportsToCopy = sourceSports.filter(s => !existingSportNames.has(s.sport_name));

          if (sportsToCopy.length > 0) {
            // Insert new sports into target season with placeholder lock_time
            // Admin will need to edit each sport to set proper lock_time before activating
            const placeholderLockTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
            
            const insertValues = sportsToCopy.map(sport => [
              seasonId,
              sport.sport_name,
              placeholderLockTime,
              'draft', // Always start as draft
              new Date() // created_at
            ]);

            await connection.query(
              `INSERT INTO rounds_v2 (season_id, sport_name, lock_time, status, created_at) VALUES ${insertValues.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
              insertValues.flat()
            );

            copyResult = {
              copied_count: sportsToCopy.length,
              skipped_count: sourceSports.length - sportsToCopy.length,
              source_season: sourceSeason.name
            };
          } else {
            copyResult = {
              copied_count: 0,
              skipped_count: sourceSports.length,
              source_season: sourceSeason.name,
              message: 'All sports already exist in this season'
            };
          }
        } else {
          copyResult = {
            copied_count: 0,
            skipped_count: 0,
            source_season: sourceSeason.name,
            message: 'No sports found in source season'
          };
        }
      }

      return { copyResult };
    });

    // Invalidate seasons cache after update
    QueryCacheService.invalidatePattern('seasons:');
    
    const response: any = {
      message: 'Season updated successfully'
    };

    if (result.copyResult) {
      response.copy_sports = result.copyResult;
    }
    
    res.json(response);
  } catch (error: any) {
    logger.error('Edit season error', { error, seasonId });
    
    if (error.message === 'Season not found') {
      return res.status(404).json({ error: 'Season not found' });
    } else if (error.message === 'Only active seasons can be set as default') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Source season not found') {
      return res.status(404).json({ error: error.message });
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
        'SELECT is_active FROM seasons_v2 WHERE id = ?',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      if (!seasons[0].is_active) {
        throw new Error('Only active seasons can be set as default');
      }

      // Unset all other defaults
      await connection.query('UPDATE seasons_v2 SET is_default = FALSE');
      
      // Set this season as default
      await connection.query('UPDATE seasons_v2 SET is_default = TRUE WHERE id = ?', [seasonId]);
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
        'SELECT is_active, is_default FROM seasons_v2 WHERE id = ?',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      const currentlyActive = seasons[0].is_active;
      const isDefault = seasons[0].is_default;

      // If deactivating and it's the default, unset default
      if (currentlyActive && isDefault) {
        await connection.query('UPDATE seasons_v2 SET is_default = FALSE WHERE id = ?', [seasonId]);
      }

      // Toggle active status
      await connection.query('UPDATE seasons_v2 SET is_active = ? WHERE id = ?', [!currentlyActive, seasonId]);

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
      'SELECT * FROM seasons_v2 WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
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
    const { storedWinners, fullLeaderboard } = await withTransaction(async (connection) => {
      // Check if season exists and is not deleted from seasons_v2
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
        [seasonId]
      );

      if (seasons.length === 0) {
        throw new Error('Season not found');
      }

      const season = seasons[0];

      if (season.ended_at) {
        throw new Error('Season has already ended');
      }

      // Check if all sports/rounds for this season are completed from rounds_v2
      const [incompleteRounds] = await connection.query<RowDataPacket[]>(
        `SELECT id, sport_name, status 
         FROM rounds_v2 
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
      // This returns ALL participants, not just top 5
      const leaderboard = await ScoringService.calculateFinalStandings(seasonId);

      logger.debug('Leaderboard results (raw)', { count: leaderboard.length, results: leaderboard });

      // Store scoring rules for this season in scoring_rules_v2 (for historical accuracy)
      // This ensures we can reconstruct point values later if needed
      await connection.query(
        'DELETE FROM scoring_rules_v2 WHERE season_id = ?',
        [seasonId]
      );
      
      const scoringRulesValues = [
        [seasonId, 1, points.pointsFirst],
        [seasonId, 2, points.pointsSecond],
        [seasonId, 3, points.pointsThird],
        [seasonId, 4, points.pointsFourth],
        [seasonId, 5, points.pointsFifth],
        [seasonId, 6, points.pointsSixthPlus],
        [seasonId, 0, points.pointsNoPick]
      ];
      
      await connection.query(
        'INSERT INTO scoring_rules_v2 (season_id, place, points) VALUES ?',
        [scoringRulesValues]
      );

      // Clear any existing winners for this season (in case of previous failed attempts)
      await connection.query('DELETE FROM season_winners_v2 WHERE season_id = ?', [seasonId]);

      // Handle ties properly - assign ranks with tie handling
      let currentRank = 1;
      let currentScore = leaderboard.length > 0 ? Number(leaderboard[0].total_points) : 0;
      let tiedCount = 1;
      
      for (let i = 0; i < leaderboard.length && i < 5; i++) { // Store up to 5 winners for podium flexibility
        const player = leaderboard[i];
        const playerScore = Number(player.total_points);
        
        logger.debug('Processing player for winner insertion', {
          index: i,
          playerName: player.name,
          playerScore,
          playerScoreType: typeof player.total_points,
          currentScore,
          currentScoreType: typeof currentScore,
          comparison: playerScore < currentScore ? 'less' : playerScore === currentScore ? 'equal' : 'greater'
        });
        
        // If this player has a different score than the previous, update rank
        if (i > 0 && playerScore < currentScore) {
          currentRank += tiedCount; // Skip ranks after ties
          currentScore = playerScore;
          tiedCount = 1;
        } else if (i > 0 && playerScore === currentScore) {
          // Same score as previous player - they're tied, keep the same rank
          tiedCount++;
        }
        
        logger.debug('Inserting winner', { 
          seasonId, 
          place: currentRank, 
          userId: player.user_id, 
          totalPoints: playerScore
        });
        
        // Store winner in season_winners_v2 (no point columns - those are in scoring_rules_v2)
        await connection.query<ResultSetHeader>(
          `INSERT INTO season_winners_v2 
           (season_id, place, user_id, total_points) 
           VALUES (?, ?, ?, ?)`,
          [seasonId, currentRank, player.user_id, playerScore]
        );
      }

      // Set ended_at timestamp
      await connection.query(
        'UPDATE seasons_v2 SET ended_at = NOW() WHERE id = ?',
        [seasonId]
      );

      // Get the stored winners with proper rankings from season_winners_v2
      const [storedWinners] = await connection.query<RowDataPacket[]>(
        `SELECT sw.*, u.name as user_name
         FROM season_winners_v2 sw
         JOIN users u ON sw.user_id = u.id
         WHERE sw.season_id = ?
         ORDER BY sw.place ASC, sw.total_points DESC`,
        [seasonId]
      );

      return { storedWinners, fullLeaderboard: leaderboard };
    });

    // Invalidate seasons cache after ending
    QueryCacheService.invalidatePattern('seasons:');
    
    // Send season ending emails to all participants (batched for performance)
    try {
      logger.info('Starting season ending email process', { seasonId });
      
      // Get season details
      const [seasonDetails] = await db.query<RowDataPacket[]>(
        'SELECT name, year_start, year_end FROM seasons_v2 WHERE id = ?',
        [seasonId]
      );
      
      if (seasonDetails.length === 0) {
        logger.warn('Season not found for email sending', { seasonId });
      } else {
        const season = seasonDetails[0];
        
        // Get all season participants
        const [participants] = await db.query<RowDataPacket[]>(
          `SELECT u.id, u.name, u.email 
           FROM users u
           JOIN season_participants_v2 sp ON u.id = sp.user_id 
           WHERE sp.season_id = ? AND u.is_active = TRUE`,
          [seasonId]
        );

        logger.info('Found participants for season ending email', { 
          seasonId, 
          participantCount: participants.length
        });

        // Get total rounds count
        const [roundsCount] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) as count 
           FROM rounds_v2 
           WHERE season_id = ? AND deleted_at IS NULL`,
          [seasonId]
        );
        const totalRounds = roundsCount[0]?.count || 0;

        // Get scoring rules for this season
        const [scoringRules] = await db.query<RowDataPacket[]>(
          `SELECT place, points 
           FROM scoring_rules_v2 
           WHERE season_id = ? 
           ORDER BY place ASC`,
          [seasonId]
        );

        // Get final standings (top 5) with user data
        const [topStandings] = await db.query<RowDataPacket[]>(
          `SELECT sw.place, sw.user_id, sw.total_points, u.name
           FROM season_winners_v2 sw
           JOIN users u ON sw.user_id = u.id
           WHERE sw.season_id = ?
           ORDER BY sw.place ASC
           LIMIT 5`,
          [seasonId]
        );

        // Calculate ranks for ALL participants from the full leaderboard (handling ties)
        // This ensures all participants get accurate ranks, not just top 5
        const userRankMap = new Map<number, { rank: number; points: number }>();
        let currentRank = 1;
        let previousScore = fullLeaderboard.length > 0 ? Number(fullLeaderboard[0].total_points) : 0;
        
        fullLeaderboard.forEach((entry: any, index: number) => {
          const currentScore = Number(entry.total_points);
          
          // If this entry has a different score than the previous, update rank
          if (index > 0 && currentScore < previousScore) {
            currentRank = index + 1;
            previousScore = currentScore;
          }
          
          userRankMap.set(entry.user_id, {
            rank: currentRank,
            points: currentScore
          });
        });

        // Prepare base final standings (will be customized per email)
        const baseFinalStandings = topStandings.map((standing: any) => ({
          place: standing.place,
          name: standing.name,
          points: standing.total_points,
          user_id: standing.user_id // Keep for matching
        }));

        const APP_URL = process.env.APP_URL || 'http://localhost:3003';
        const standingsLink = `${APP_URL}`;

        // Group participants by email to merge emails for shared addresses
        const participantsByEmail = new Map<string, Array<{ id: number; name: string }>>();
        participants.forEach((p: any) => {
          if (!participantsByEmail.has(p.email)) {
            participantsByEmail.set(p.email, []);
          }
          participantsByEmail.get(p.email)!.push({ id: p.id, name: p.name });
        });

        logger.info('Grouped participants by email', {
          seasonId,
          uniqueEmails: participantsByEmail.size,
          totalParticipants: participants.length
        });

        // Send emails in batches to prevent overwhelming SMTP server
        const BATCH_SIZE = 10;
        const emailEntries = Array.from(participantsByEmail.entries());
        
        for (let i = 0; i < emailEntries.length; i += BATCH_SIZE) {
          const batch = emailEntries.slice(i, i + BATCH_SIZE);
          
          logger.info(`Processing season ending email batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(emailEntries.length / BATCH_SIZE)}`, {
            seasonId,
            batchSize: batch.length,
            startIndex: i
          });

          const batchResults = await Promise.allSettled(
            batch.map(async ([email, users]) => {
              try {
                // Get rank and points for each user sharing this email
                const usersWithStandings = users.map(user => {
                  const standing = userRankMap.get(user.id);
                  return {
                    id: user.id,
                    name: user.name,
                    rank: standing?.rank || 999, // Default to 999 if not in standings
                    points: standing?.points || 0
                  };
                });

                // Create a set of user IDs for this email group for quick lookup
                const emailUserIds = new Set(users.map(u => u.id));

                // Mark users in top 5 standings for highlighting
                const highlightedStandings = baseFinalStandings.map(standing => ({
                  place: standing.place,
                  name: standing.name,
                  points: standing.points,
                  isCurrentUser: emailUserIds.has(standing.user_id)
                }));

                await sendSeasonEndingEmail(
                  email,
                  usersWithStandings,
                  season.name,
                  season.year_start,
                  season.year_end,
                  highlightedStandings,
                  totalRounds,
                  scoringRules.map((r: any) => ({ place: r.place, points: r.points })),
                  standingsLink
                );

                logger.debug('Successfully sent season ending email', { 
                  seasonId,
                  email: email.substring(0, 3) + '***',
                  userCount: users.length
                });
              } catch (emailError: any) {
                logger.error(`Failed to send season ending email`, { 
                  seasonId,
                  email: email.substring(0, 3) + '***',
                  error: emailError.message 
                });
                throw emailError; // Re-throw to be caught by Promise.allSettled
              }
            })
          );

          // Log batch results
          const batchSuccessCount = batchResults.filter(r => r.status === 'fulfilled').length;
          const batchFailureCount = batchResults.filter(r => r.status === 'rejected').length;
          logger.info(`Season ending email batch completed`, {
            seasonId,
            batchNumber: Math.floor(i / BATCH_SIZE) + 1,
            successCount: batchSuccessCount,
            failureCount: batchFailureCount
          });
        }

        logger.info('Season ending email process finished', { 
          seasonId,
          totalEmails: emailEntries.length,
          totalParticipants: participants.length
        });
      }
    } catch (emailError: any) {
      // Don't fail the season ending if emails fail
      logger.error('Error sending season ending emails', { 
        seasonId,
        error: emailError.message 
      });
    }
    
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
      // Check if season exists and is ended from seasons_v2
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
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
        'UPDATE seasons_v2 SET ended_at = NULL WHERE id = ?',
        [seasonId]
      );

      // Remove winner records from season_winners_v2
      await connection.query(
        'DELETE FROM season_winners_v2 WHERE season_id = ?',
        [seasonId]
      );
      
      // Optionally remove scoring rules (or keep them for historical reference)
      // For now, we'll keep them even if season is reopened
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
        'SELECT * FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await db.query(
        'UPDATE seasons_v2 SET deleted_at = NOW(), is_active = FALSE, is_default = FALSE WHERE id = ?',
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
        'SELECT * FROM seasons_v2 WHERE id = ? AND deleted_at IS NOT NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Deleted season not found' });
    }

    // Restore by clearing deleted_at timestamp
    await db.query(
        'UPDATE seasons_v2 SET deleted_at = NULL WHERE id = ?',
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
        'SELECT * FROM seasons_v2 WHERE id = ? AND deleted_at IS NOT NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Deleted season not found. Only soft-deleted seasons can be permanently deleted.' });
    }

    // Verify confirmation
    if (confirmation !== 'PERMANENT DELETE') {
      return res.status(400).json({ error: 'Invalid confirmation. Must type "PERMANENT DELETE" exactly.' });
    }

    // Log pre-delete counts for verification (direct and CASCADE chain)
    const [participantCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_participants_v2 WHERE season_id = ?',
      [seasonId]
    );
    const [roundCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM rounds_v2 WHERE season_id = ?',
      [seasonId]
    );
    const [winnerCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_winners_v2 WHERE season_id = ?',
      [seasonId]
    );
    
    // Count data that should cascade from rounds deletion
    const [roundIds] = await db.query<RowDataPacket[]>(
      'SELECT id FROM rounds_v2 WHERE season_id = ?',
      [seasonId]
    );
    
    let pickCounts: any[] = [{ count: 0 }];
    let scoreCounts: any[] = [{ count: 0 }];
    let teamCounts: any[] = [{ count: 0 }];
    let linkCounts: any[] = [{ count: 0 }];
    let reminderCounts: any[] = [{ count: 0 }];
    let pickItemCounts: any[] = [{ count: 0 }];
    
    if (roundIds.length > 0) {
      const roundIdList = roundIds.map(r => r.id);
      
      [pickCounts] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM picks_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [scoreCounts] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM score_details_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [teamCounts] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM round_teams_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [linkCounts] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM magic_links WHERE round_id IN (?)`,
        [roundIdList]
      );
      [reminderCounts] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM reminder_log WHERE round_id IN (?)`,
        [roundIdList]
      );
      
      // Count pick_items (cascades from picks)
      if (pickCounts[0].count > 0) {
        [pickItemCounts] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) as count FROM pick_items_v2 pi 
           JOIN picks_v2 p ON pi.pick_id = p.id 
           WHERE p.round_id IN (?)`,
          [roundIdList]
        );
      }
    }

    logger.info('Pre-delete data counts for season', {
      seasonId,
      seasonName: seasons[0].name,
      directDeletes: {
        participants: participantCounts[0].count,
        rounds: roundCounts[0].count,
        winners: winnerCounts[0].count
      },
      cascadeDeletes: {
        picks: pickCounts[0].count,
        pickItems: pickItemCounts[0].count,
        scores: scoreCounts[0].count,
        teams: teamCounts[0].count,
        magicLinks: linkCounts[0].count,
        reminders: reminderCounts[0].count
      }
    });

    // Permanently delete (CASCADE will handle all related data)
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM seasons_v2 WHERE id = ?',
      [seasonId]
    );

    if (result.affectedRows === 0) {
      logger.error('Permanent delete failed - no rows affected', { seasonId });
      return res.status(500).json({ error: 'Delete operation failed - season may have already been deleted' });
    }

    // Verify CASCADE deleted all related data
    const [participantCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_participants_v2 WHERE season_id = ?',
      [seasonId]
    );
    const [roundCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM rounds_v2 WHERE season_id = ?',
      [seasonId]
    );
    const [winnerCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM season_winners_v2 WHERE season_id = ?',
      [seasonId]
    );
    
    // Verify cascade from rounds
    let pickCountsAfter: any[] = [{ count: 0 }];
    let scoreCountsAfter: any[] = [{ count: 0 }];
    let teamCountsAfter: any[] = [{ count: 0 }];
    let linkCountsAfter: any[] = [{ count: 0 }];
    let reminderCountsAfter: any[] = [{ count: 0 }];
    let pickItemCountsAfter: any[] = [{ count: 0 }];
    
    if (roundIds.length > 0) {
      const roundIdList = roundIds.map(r => r.id);
      
      [pickCountsAfter] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM picks_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [scoreCountsAfter] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM score_details_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [teamCountsAfter] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM round_teams_v2 WHERE round_id IN (?)`,
        [roundIdList]
      );
      [linkCountsAfter] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM magic_links WHERE round_id IN (?)`,
        [roundIdList]
      );
      [reminderCountsAfter] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM reminder_log WHERE round_id IN (?)`,
        [roundIdList]
      );
      
      if (pickCounts[0].count > 0) {
        [pickItemCountsAfter] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) as count FROM pick_items_v2 pi 
           JOIN picks_v2 p ON pi.pick_id = p.id 
           WHERE p.round_id IN (?)`,
          [roundIdList]
        );
      }
    }

    const cascadeSuccess = 
      participantCountsAfter[0].count === 0 &&
      roundCountsAfter[0].count === 0 &&
      winnerCountsAfter[0].count === 0 &&
      pickCountsAfter[0].count === 0 &&
      scoreCountsAfter[0].count === 0 &&
      teamCountsAfter[0].count === 0 &&
      linkCountsAfter[0].count === 0 &&
      reminderCountsAfter[0].count === 0 &&
      pickItemCountsAfter[0].count === 0;

    if (!cascadeSuccess) {
      logger.error('CASCADE DELETE failed - orphaned data detected!', {
        seasonId,
        orphanedParticipants: participantCountsAfter[0].count,
        orphanedRounds: roundCountsAfter[0].count,
        orphanedWinners: winnerCountsAfter[0].count,
        orphanedPicks: pickCountsAfter[0].count,
        orphanedPickItems: pickItemCountsAfter[0].count,
        orphanedScores: scoreCountsAfter[0].count,
        orphanedTeams: teamCountsAfter[0].count,
        orphanedLinks: linkCountsAfter[0].count,
        orphanedReminders: reminderCountsAfter[0].count
      });
      return res.status(500).json({ 
        error: 'CASCADE DELETE failed - orphaned data remains. Database constraints may not be configured correctly.' 
      });
    }

    logger.info('Season permanently deleted successfully', {
      seasonId,
      seasonName: seasons[0].name,
      deletedRows: result.affectedRows,
      cascadeSuccess: true,
      deletedData: {
        participants: participantCounts[0].count,
        rounds: roundCounts[0].count,
        winners: winnerCounts[0].count,
        picks: pickCounts[0].count,
        pickItems: pickItemCounts[0].count,
        scores: scoreCounts[0].count,
        teams: teamCounts[0].count,
        magicLinks: linkCounts[0].count,
        reminders: reminderCounts[0].count
      }
    });

    // Invalidate seasons cache after permanent delete
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({ message: 'Season permanently deleted' });
  } catch (error) {
    logger.error('Permanent delete season error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current active seasons and seasons closed in past 24 months with sport counts (admin only)
router.get('/copy-sources', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [seasons] = await db.query<RowDataPacket[]>(
      `SELECT s.id, s.name, s.year_start, s.year_end, s.ended_at, COUNT(r.id) as sport_count
       FROM seasons_v2 s
       LEFT JOIN rounds_v2 r ON s.id = r.season_id AND r.deleted_at IS NULL
       WHERE ((s.ended_at IS NULL AND s.is_active = TRUE)
              OR (s.ended_at IS NOT NULL AND s.ended_at >= DATE_SUB(NOW(), INTERVAL 24 MONTH)))
       AND s.deleted_at IS NULL
       GROUP BY s.id, s.name, s.year_start, s.year_end, s.ended_at
       HAVING sport_count > 0
       ORDER BY 
         CASE WHEN s.ended_at IS NULL THEN 0 ELSE 1 END,
         s.year_end DESC`,
      []
    );

    const formattedSeasons = seasons.map(season => ({
      id: season.id,
      name: season.name,
      year_start: season.year_start,
      year_end: season.year_end,
      sport_count: season.sport_count,
      display_name: `${season.name} (${season.year_start}${season.year_start !== season.year_end ? `-${season.year_end}` : ''}) - ${season.sport_count} sport${season.sport_count !== 1 ? 's' : ''}${season.ended_at ? '' : ' (Current)'}`
    }));

    res.json(formattedSeasons);
  } catch (error) {
    logger.error('Get copy source seasons error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Copy sports from source season to target season (admin only)
router.post('/:targetId/copy-sports', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const targetSeasonId = parseInt(req.params.targetId);
  const { sourceSeasonId } = req.body;

  // Validate required fields
  if (!sourceSeasonId) {
    return res.status(400).json({ error: 'Source season ID is required' });
  }

  try {
    const result = await withTransaction(async (connection) => {
      // Verify both seasons exist and are not deleted
      const [seasons] = await connection.query<RowDataPacket[]>(
        'SELECT id, name FROM seasons_v2 WHERE id IN (?, ?) AND deleted_at IS NULL',
        [targetSeasonId, sourceSeasonId]
      );

      if (seasons.length !== 2) {
        throw new Error('One or both seasons not found');
      }

      const targetSeason = seasons.find(s => s.id === targetSeasonId);
      const sourceSeason = seasons.find(s => s.id === sourceSeasonId);

      if (!targetSeason || !sourceSeason) {
        throw new Error('One or both seasons not found');
      }

      // Get sports from source season
      const [sourceSports] = await connection.query<RowDataPacket[]>(
        'SELECT sport_name FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL',
        [sourceSeasonId]
      );

      if (sourceSports.length === 0) {
        return { copied_count: 0, skipped_count: 0, message: 'No sports found in source season' };
      }

      // Get existing sports in target season to prevent duplicates
      const [existingSports] = await connection.query<RowDataPacket[]>(
        'SELECT sport_name FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL',
        [targetSeasonId]
      );

      const existingSportNames = new Set(existingSports.map(s => s.sport_name));

      // Filter out sports that already exist in target season
      const sportsToCopy = sourceSports.filter(s => !existingSportNames.has(s.sport_name));

      if (sportsToCopy.length === 0) {
        return { 
          copied_count: 0, 
          skipped_count: sourceSports.length, 
          message: 'All sports already exist in target season' 
        };
      }

      // Insert new sports into target season with placeholder lock_time
      // Admin will need to edit each sport to set proper lock_time before activating
      const placeholderLockTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const insertValues = sportsToCopy.map(sport => [
        targetSeasonId,
        sport.sport_name,
        placeholderLockTime,
        'draft', // Always start as draft
        new Date() // created_at
      ]);

      await connection.query(
        `INSERT INTO rounds_v2 (season_id, sport_name, lock_time, status, created_at) VALUES ${insertValues.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
        insertValues.flat()
      );

      return {
        copied_count: sportsToCopy.length,
        skipped_count: sourceSports.length - sportsToCopy.length,
        message: `Successfully copied ${sportsToCopy.length} sport(s) from "${sourceSeason.name}" to "${targetSeason.name}"`
      };
    });

    // Invalidate seasons cache after copying sports
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json(result);
  } catch (error: any) {
    logger.error('Copy sports error', { error, targetSeasonId, sourceSeasonId });
    
    if (error.message === 'One or both seasons not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Message all players in a season (admin only)
router.post('/:id/message-all-players', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const seasonId = parseInt(req.params.id);
    const { message } = req.body;

    if (!seasonId || isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or less' });
    }

    // Verify season exists and is active (not ended, not deleted, not disabled)
    const [seasonRows] = await db.query<RowDataPacket[]>(
      `SELECT id, name, year_start, year_end, is_active, ended_at, deleted_at 
       FROM seasons_v2 
       WHERE id = ? AND deleted_at IS NULL AND is_active = 1 AND ended_at IS NULL`,
      [seasonId]
    );

    if (seasonRows.length === 0) {
      return res.status(404).json({ error: 'Season not found or not eligible for messaging' });
    }

    const season = seasonRows[0];

    // Get all active players in this season
    const [players] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email 
       FROM users u
       JOIN season_participants_v2 sp ON u.id = sp.user_id
       WHERE sp.season_id = ? AND u.is_active = 1
       ORDER BY u.name`,
      [seasonId]
    );

    if (players.length === 0) {
      return res.status(400).json({ error: 'No active players found in this season' });
    }

    // Get commissioner name and app settings
    const [commissionerRows] = await db.query<RowDataPacket[]>(
      `SELECT name FROM admins WHERE is_commissioner = TRUE LIMIT 1`
    );
    const commissionerName = commissionerRows[0]?.name || 'The Commissioner';

    const [settingsRows] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM text_settings WHERE setting_key IN ('app_title')`
    );
    const appTitle = settingsRows.find(s => s.setting_key === 'app_title')?.setting_value || 'Go Make Your Picks';

    // Import email service
    const { sendBulkMessage } = await import('../services/emailService');

    // Prepare email data for bulk sending
    const emailData = players.map(player => ({
      to: player.email,
      name: player.name,
      message: message
    }));

    // Send bulk message using standard template
    await sendBulkMessage(emailData);

    logger.info('Message sent to all players', {
      seasonId,
      seasonName: season.name,
      recipientCount: players.length,
      commissionerName,
      messageLength: message.length
    });

    res.json({
      success: true,
      message: `Message sent successfully to ${players.length} active players`,
      recipientCount: players.length,
      recipients: players.map(p => ({ name: p.name, email: p.email }))
    });

  } catch (error: any) {
    logger.error('Error sending message to all players', { error, seasonId: req.params.id });
    res.status(500).json({ error: 'Failed to send message to players' });
  }
});

export default router;
