import express, { Response } from 'express';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { SettingsService } from '../services/settingsService';
import { withTransaction } from '../utils/transactionWrapper';
import { QueryCacheService } from '../services/queryCacheService';
import { logError, logInfo, logWarn, logDebug } from '../utils/logger';
import { getOrCreateTeam } from '../utils/teamHelpers';

const router = express.Router();

// Check if sample data exists
router.get('/check-sample-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [metadataRows] = await db.query<RowDataPacket[]>(
      'SELECT season_id, user_ids FROM seed_data_metadata ORDER BY id DESC LIMIT 1'
    );

    if (metadataRows.length === 0) {
      return res.json({ hasSampleData: false });
    }

    const metadata = metadataRows[0];
    const seasonId = metadata.season_id;

    // Verify the season still exists
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT id FROM seasons_v2 WHERE id = ?',
      [seasonId]
    );

    if (seasons.length === 0) {
      // Season was deleted, clean up metadata
      await db.query('DELETE FROM seed_data_metadata WHERE season_id = ?', [seasonId]);
      return res.json({ hasSampleData: false });
    }

    return res.json({ hasSampleData: true });
  } catch (error) {
    logError('Check sample data error', error);
    res.status(500).json({ error: 'Failed to check sample data' });
  }
});

// ⚠️ TEMPORARY ROUTE - REMOVE BEFORE PRODUCTION ⚠️
// Seed sample data for development/testing purposes
router.post('/seed-test-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  // Get settings BEFORE starting transaction to avoid connection conflicts
  const points = await SettingsService.getPointsSettings();
  
  try {
    const details = await withTransaction(async (connection) => {
      // Get or create default season from seasons_v2
    let [seasons] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM seasons_v2 WHERE is_default = TRUE LIMIT 1'
    );

    let seasonId: number;

    if (seasons.length === 0) {
      // Create a default season for the seed data with current year and next year
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const seasonName = `Test Season ${currentYear}-${nextYear}`;
      const [seasonResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO seasons_v2 (name, year_start, year_end, is_active, is_default) VALUES (?, ?, ?, ?, ?)',
        [seasonName, currentYear, nextYear, true, true]
      );
      seasonId = seasonResult.insertId;
    } else {
      seasonId = seasons[0].id;
    }

    // 1. Create 15 sample users
    const users = [
      { name: 'Player 01', email: 'player1@example.com' },
      { name: 'Player 02', email: 'player2@example.com' },
      { name: 'Player 03', email: 'player3@example.com' },
      { name: 'Player 04', email: 'player4@example.com' },
      { name: 'Player 05', email: 'player5@example.com' },
      { name: 'Player 06', email: 'player6@example.com' },
      { name: 'Player 07', email: 'player7@example.com' },
      { name: 'Player 08', email: 'player8@example.com' },
      { name: 'Player 09', email: 'player9@example.com' },
      { name: 'Player 10', email: 'player10@example.com' },
      { name: 'Player 11', email: 'player11@example.com' },
      { name: 'Player 12', email: 'player12@example.com' },
      { name: 'Player 13', email: 'player13@example.com' },
      { name: 'Player 14', email: 'player14@example.com' },
      { name: 'Player 15', email: 'player15@example.com' }
    ];

    const userIds: number[] = [];

    for (const user of users) {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO users (name, email, is_active) VALUES (?, ?, TRUE)',
        [user.name, user.email]
      );
      userIds.push(result.insertId);
    }

    // 2. Add all users to default season using season_participants_v2
    const participantValues = userIds.map(userId => [seasonId, userId]);
    await connection.query(
      'INSERT INTO season_participants_v2 (season_id, user_id) VALUES ?',
      [participantValues]
    );

    // 3. Create Multi-Pick Sport (ACTIVE) - March Madness using rounds_v2
    // Set lock time to 1 week from now if not already locked
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const multiPickLockTime = oneWeekFromNow.toISOString().slice(0, 19).replace('T', ' ');
    const [multiPickResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds_v2 (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        'March Madness 2027',
        'multiple',
        1,
        'Pick your team to win March Madness!',
        multiPickLockTime,
        'America/New_York',
        'active'
      ]
    );
    const multiPickRoundId = multiPickResult.insertId;

    // 4. Create Write-In Sport (ACTIVE) - Wimbledon using rounds_v2 (replaces Super Bowl LXI)
    const wimbledonLockTime = new Date(oneWeekFromNow.getTime() + (60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' '); // 1 hour after March Madness
    const [wimbledonResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds_v2 (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        'Wimbledon',
        'multiple',
        1,
        'Pick your Wimbledon champion!',
        wimbledonLockTime,
        'America/New_York',
        'active'
      ]
    );
    const wimbledonRoundId = wimbledonResult.insertId;

    // 5. Create 8 completed sports with scores (removed Wimbledon 2026 as it's now an active sport)
    const completedSports = [
      {
        name: 'NBA Finals 2026',
        lockTime: new Date('2026-06-15T20:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Celtics',
        pickType: 'single'
      },
      {
        name: 'World Cup 2026',
        lockTime: new Date('2026-07-15T16:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Brazil',
        pickType: 'single'
      },
      {
        name: 'Masters 2026',
        lockTime: new Date('2026-04-10T08:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Tiger Woods',
        pickType: 'single'
      },
      {
        name: 'Kentucky Derby 2026',
        lockTime: new Date('2026-05-07T18:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Thunder Strike',
        pickType: 'single'
      },
      {
        name: 'Stanley Cup 2026',
        lockTime: new Date('2026-06-25T20:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Rangers',
        pickType: 'single'
      },
      {
        name: 'UFC Championship 2026',
        lockTime: new Date('2026-08-15T22:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Jon Jones',
        pickType: 'single'
      },
      {
        name: 'Olympics Basketball 2024',
        lockTime: new Date('2024-08-10T20:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'USA',
        pickType: 'single'
      },
      {
        name: 'Champions League 2026',
        lockTime: new Date('2026-05-30T20:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Real Madrid',
        pickType: 'single'
      }
    ];

    const completedRoundIds: number[] = [];

    for (const sport of completedSports) {
      // Insert round into rounds_v2 (no first_place_team - that goes in round_results_v2)
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO rounds_v2 (season_id, sport_name, pick_type, email_message, lock_time, timezone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          seasonId,
          sport.name,
          sport.pickType,
          `Pick the winner of ${sport.name}!`,
          sport.lockTime,
          'America/New_York',
          'completed'
        ]
      );
      const roundId = result.insertId;
      completedRoundIds.push(roundId);

      // Store winner in round_results_v2 (using teams_v2)
      const winnerTeamId = await getOrCreateTeam(connection, sport.winner);
      await connection.query(
        'INSERT INTO round_results_v2 (round_id, place, team_id) VALUES (?, 1, ?)',
        [roundId, winnerTeamId]
      );
    }

    // 6. Define valid choices for completed sports (used for both teams and picks)
    const completedSportChoices = [
      ['Celtics', 'Lakers', 'Warriors', 'Heat', 'Nuggets', 'Suns', 'Bucks', 'Nets', '76ers', 'Clippers', 'Jazz', 'Trail Blazers', 'Hawks', 'Knicks', 'Bulls'], // NBA Finals
      ['Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'England', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Croatia', 'Uruguay', 'Mexico', 'Japan', 'South Korea'], // World Cup
      ['Tiger Woods', 'Rory McIlroy', 'Scottie Scheffler', 'Jon Rahm', 'Viktor Hovland', 'Collin Morikawa', 'Xander Schauffele', 'Justin Thomas', 'Dustin Johnson', 'Bryson DeChambeau', 'Patrick Cantlay', 'Tony Finau', 'Hideki Matsuyama', 'Cameron Smith', 'Jordan Spieth'], // Masters
      ['Thunder Strike', 'Lightning Bolt', 'Storm Chaser', 'Wind Runner', 'Fire Starter', 'Golden Arrow', 'Silver Bullet', 'Diamond Dust', 'Crystal Clear', 'Midnight Express', 'Sunrise Surprise', 'Moonlight Magic', 'Starlight Symphony', 'Aurora Borealis', 'Cosmic Wonder'], // Kentucky Derby
      ['Rangers', 'Lightning', 'Avalanche', 'Panthers', 'Oilers', 'Maple Leafs', 'Bruins', 'Canadiens', 'Red Wings', 'Blackhawks', 'Penguins', 'Capitals', 'Flyers', 'Devils', 'Islanders'], // Stanley Cup
      ['Jon Jones', 'Israel Adesanya', 'Alexander Volkanovski', 'Kamaru Usman', 'Francis Ngannou', 'Conor McGregor', 'Khabib Nurmagomedov', 'Daniel Cormier', 'Stipe Miocic', 'Amanda Nunes', 'Valentina Shevchenko', 'Rose Namajunas', 'Weili Zhang', 'Holly Holm', 'Miesha Tate'], // UFC
      ['USA', 'Spain', 'Australia', 'France', 'Germany', 'Canada', 'Serbia', 'Slovenia', 'Greece', 'Lithuania', 'Argentina', 'Brazil', 'Italy', 'Croatia', 'Turkey'], // Olympics Basketball
      ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Barcelona', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham', 'Manchester United', 'Juventus', 'AC Milan', 'Inter Milan', 'Atletico Madrid', 'Sevilla'] // Champions League
    ];

    // 7. Add teams to completed single-pick sports using round_teams_v2 + teams_v2
    // This ensures picks come from valid teams for single-pick completed sports
    for (let sportIndex = 0; sportIndex < completedSports.length; sportIndex++) {
      const roundId = completedRoundIds[sportIndex];
      const sport = completedSports[sportIndex];
      const choices = completedSportChoices[sportIndex];
      
      // Only add teams for single-pick sports
      if (sport.pickType === 'single' && choices && choices.length > 0) {
        const teamIds: number[] = [];
        // Get unique teams from choices
        const uniqueTeams = [...new Set(choices)];
        for (const team of uniqueTeams) {
          const teamId = await getOrCreateTeam(connection, team);
          teamIds.push(teamId);
        }
        if (teamIds.length > 0) {
          const teamValues = teamIds.map(teamId => [roundId, teamId]);
          await connection.query(
            'INSERT INTO round_teams_v2 (round_id, team_id) VALUES ?',
            [teamValues]
          );
        }
      }
    }

    // 8. Create picks and scores for completed sports
    for (let sportIndex = 0; sportIndex < completedSports.length; sportIndex++) {
      const roundId = completedRoundIds[sportIndex];
      const sport = completedSports[sportIndex];
      const choices = completedSportChoices[sportIndex];

      // For single-pick sports, get valid teams from round_teams_v2
      let validTeams: string[] = [];
      if (sport.pickType === 'single') {
        const [teamRows] = await connection.query<RowDataPacket[]>(
          `SELECT t.name 
           FROM round_teams_v2 rt
           JOIN teams_v2 t ON rt.team_id = t.id
           WHERE rt.round_id = ?
           ORDER BY t.name`,
          [roundId]
        );
        validTeams = teamRows.map(row => row.name);
      }

      // Create picks for all users using picks_v2 + pick_items_v2 + teams_v2
      for (let userIndex = 0; userIndex < userIds.length; userIndex++) {
        const userId = userIds[userIndex];
        
        // Create pick record in picks_v2
        const [pickResult] = await connection.query<ResultSetHeader>(
          'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
          [userId, roundId]
        );
        const pickId = pickResult.insertId;

        // For single-pick sports, pick from valid teams; otherwise use choices array
        let pickValue: string;
        if (sport.pickType === 'single' && validTeams.length > 0) {
          // Pick randomly from valid teams
          pickValue = validTeams[Math.floor(Math.random() * validTeams.length)];
        } else {
          // Use choices array (shouldn't happen for single-pick, but fallback)
          pickValue = choices[userIndex];
        }
        
        if (!pickValue) {
          throw new Error(`No pick value available for user ${userIndex} in sport ${sport.name}.`);
        }
        
        const teamId = await getOrCreateTeam(connection, pickValue);
        await connection.query(
          'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES (?, ?, ?)',
          [pickId, 1, teamId]
        );

        // Create realistic scores using score_details_v2
        // Realistic single-round score options (place 1-6 or 0 for no pick)
        const realisticPlaces = [1, 2, 3, 4, 5, 6, 0]; // 1st, 2nd, 3rd, 4th, 5th, 6th+, no pick
        const randomPlace = realisticPlaces[Math.floor(Math.random() * realisticPlaces.length)];
        
        await connection.query(
          'INSERT INTO score_details_v2 (user_id, round_id, place, count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE count = 1',
          [userId, roundId, randomPlace]
        );
      }
    }

    // 9. Create simulated picks for active write-in sports (March Madness and Wimbledon)
    const marchMadnessChoices = [
      'Duke',
      'Kansas',
      'UNC',
      'Kentucky',
      'Gonzaga',
      'Villanova',
      'Michigan',
      'UCLA',
      'Arizona',
      'Houston',
      'UConn',
      'Purdue',
      'Tennessee',
      'Alabama',
      'Baylor'
    ];

    // Random Wimbledon player names for write-in picks
    const wimbledonPlayers = [
      'Novak Djokovic', 'Rafael Nadal', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev',
      'Stefanos Tsitsipas', 'Alexander Zverev', 'Casper Ruud', 'Felix Auger-Aliassime', 'Taylor Fritz',
      'Frances Tiafoe', 'Sebastian Korda', 'Lorenzo Musetti', 'Holger Rune', 'Ben Shelton',
      'Andy Murray', 'Stan Wawrinka', 'Grigor Dimitrov', 'Cameron Norrie', 'Jack Draper'
    ];

    // March Madness picks (write-in, single pick)
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record in picks_v2
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
        [userId, multiPickRoundId]
      );
      const pickId = pickResult.insertId;

      // Create pick item using teams_v2 (single write-in pick)
      const pickValue = marchMadnessChoices[i];
      if (!pickValue) {
        throw new Error(`No pick value available for user ${i} in March Madness.`);
      }
      
      const teamId = await getOrCreateTeam(connection, pickValue);
      await connection.query(
        'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES (?, ?, ?)',
        [pickId, 1, teamId]
      );
    }

    // Wimbledon picks (write-in, single pick - random)
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record in picks_v2
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
        [userId, wimbledonRoundId]
      );
      const pickId = pickResult.insertId;

      // Random write-in pick from Wimbledon players
      const randomPlayer = wimbledonPlayers[Math.floor(Math.random() * wimbledonPlayers.length)];
      const teamId = await getOrCreateTeam(connection, randomPlayer);
      await connection.query(
        'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES (?, ?, ?)',
        [pickId, 1, teamId]
      );
    }

      // Store metadata about seed data for reliable detection and deletion
      await connection.query(
        'INSERT INTO seed_data_metadata (season_id, user_ids) VALUES (?, ?)',
        [seasonId, JSON.stringify(userIds)]
      );

      return {
        users: userIds.length,
        season: seasonId,
        sports: 2 + completedSports.length, // 2 active write-in sports + 8 completed sports
        picks: userIds.length * (2 + completedSports.length)
      };
    });

    // Invalidate seasons cache after seeding
    QueryCacheService.invalidatePattern('seasons:');
    
    res.json({
      message: 'Sample data seeded successfully!',
      details: details
    });

  } catch (error: any) {
    logError('Seed sample data error', error, {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    logError('Seed sample data error:', error);
    logError('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    // Check if data already exists
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: 'Sample data may already exist. Delete existing sample users first or reset the database.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to seed sample data'
    });
  }
});

// ⚠️ TEMPORARY ROUTE - REMOVE BEFORE PRODUCTION ⚠️
// Clear all sample data
router.post('/clear-test-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await withTransaction(async (connection) => {
      // Get metadata about seed data
      const [metadataRows] = await connection.query<RowDataPacket[]>(
        'SELECT season_id, user_ids FROM seed_data_metadata ORDER BY id DESC LIMIT 1'
      );

      if (metadataRows.length === 0) {
        // Fallback: try to delete by email addresses if metadata doesn't exist
        await connection.query(
          `DELETE FROM users WHERE email IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'player1@example.com',
            'player2@example.com',
            'player3@example.com',
            'player4@example.com',
            'player5@example.com',
            'player6@example.com',
            'player7@example.com',
            'player8@example.com',
            'player9@example.com',
            'player10@example.com',
            'player11@example.com',
            'player12@example.com',
            'player13@example.com',
            'player14@example.com',
            'player15@example.com'
          ]
        );
      } else {
        const metadata = metadataRows[0];
        const seasonId = metadata.season_id;
        const userIds: number[] = JSON.parse(metadata.user_ids as string);

        // Delete metadata record FIRST (before season, in case of FK constraint)
        await connection.query(
          'DELETE FROM seed_data_metadata WHERE season_id = ?',
          [seasonId]
        );

        // Delete users by ID (CASCADE will handle picks_v2, season_participants_v2)
        if (userIds.length > 0) {
          const [userDeleteResult] = await connection.query<ResultSetHeader>(
            `DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(', ')})`,
            userIds
          );
          logInfo('Users deleted successfully', { count: userDeleteResult.affectedRows, expected: userIds.length });
        }

        // Verify season exists before attempting deletion
        const [seasonCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM seasons_v2 WHERE id = ?',
          [seasonId]
        );

        if (seasonCheck.length > 0) {
          // Delete season - CASCADE will handle:
          // - All rounds in that season (rounds_v2)
          // - All picks in those rounds (picks_v2 via round_id)
          // - All season participants (season_participants_v2)
          // - All season winners (season_winners_v2)
          // Note: Hard delete (not soft delete) - permanently removes the season
          // Force delete even if it's the default/active season
          try {
            // First, ensure we can delete by explicitly removing related data
            // (Even though CASCADE should handle it, we'll do it explicitly to avoid any issues)
            
            // Delete season participants (should be deleted by CASCADE from users, but delete explicitly)
            const [participantDeleteResult] = await connection.query<ResultSetHeader>(
              'DELETE FROM season_participants_v2 WHERE season_id = ?',
              [seasonId]
            );
            logInfo('Deleted season participants', { seasonId, count: participantDeleteResult.affectedRows });

            // Delete season winners (should cascade, but delete explicitly)
            const [winnersDeleteResult] = await connection.query<ResultSetHeader>(
              'DELETE FROM season_winners_v2 WHERE season_id = ?',
              [seasonId]
            );
            logInfo('Deleted season winners', { seasonId, count: winnersDeleteResult.affectedRows });

            // Now delete the season (rounds_v2 should cascade automatically)
            const [seasonDeleteResult] = await connection.query<ResultSetHeader>(
              'DELETE FROM seasons_v2 WHERE id = ?',
              [seasonId]
            );

            if (seasonDeleteResult.affectedRows === 0) {
              logWarn('Season deletion affected 0 rows - attempting to check why', { seasonId });
              // Check if season still exists
              const [stillExists] = await connection.query<RowDataPacket[]>(
                'SELECT id, name, is_default, is_active, deleted_at FROM seasons_v2 WHERE id = ?',
                [seasonId]
              );
              if (stillExists.length > 0) {
                const seasonInfo = stillExists[0];
                logError('Season still exists after deletion attempt', { 
                  seasonId, 
                  season: seasonInfo,
                  message: 'Season deletion failed - may have constraints or be locked' 
                });
                throw new Error(`Failed to delete season ${seasonId} (${seasonInfo.name}). Season still exists after deletion attempt.`);
              } else {
                logInfo('Season was deleted (affectedRows was 0 but season no longer exists)', { seasonId });
              }
            } else {
              logInfo('Season deleted successfully', { seasonId, affectedRows: seasonDeleteResult.affectedRows });
            }
          } catch (error: any) {
            logError('Error deleting season', { 
              error, 
              seasonId, 
              message: error.message,
              code: error.code,
              sqlState: error.sqlState,
              sqlMessage: error.sqlMessage
            });
            throw error;
          }
        } else {
          logWarn('Season not found for deletion (may have already been deleted)', { seasonId });
        }
      }
    });

    // Invalidate all relevant caches after deletion
    QueryCacheService.invalidatePattern('seasons:');
    QueryCacheService.invalidatePattern('users:');
    QueryCacheService.invalidatePattern('rounds:');
    QueryCacheService.invalidatePattern('picks:');
    QueryCacheService.invalidatePattern('participants:');
    logInfo('Cache invalidated after sample data deletion');

    res.json({ message: 'Sample data deleted successfully!' });

  } catch (error) {
    logError('Clear sample data error', error);
    res.status(500).json({ error: 'Failed to delete sample data' });
  }
});

export default router;

