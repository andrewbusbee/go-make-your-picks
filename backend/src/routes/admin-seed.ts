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
      // Create a default season for the seed data
      const [seasonResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO seasons_v2 (name, year_start, year_end, is_active, is_default) VALUES (?, ?, ?, ?, ?)',
        ['Test Season 2025-2026', 2025, 2026, true, true]
      );
      seasonId = seasonResult.insertId;
    } else {
      seasonId = seasons[0].id;
    }

    // 1. Create 15 sample users
    const users = [
      { name: 'John Sample', email: 'sample1@example.com' },
      { name: 'Sarah Mitchell', email: 'sample2@example.com' },
      { name: 'Michael Chen', email: 'sample3@example.com' },
      { name: 'Emily Rodriguez', email: 'sample4@example.com' },
      { name: 'David Thompson', email: 'sample5@example.com' },
      { name: 'Jessica Williams', email: 'sample6@example.com' },
      { name: 'Christopher Davis', email: 'sample7@example.com' },
      { name: 'Amanda Brown', email: 'sample8@example.com' },
      { name: 'Matthew Wilson', email: 'sample9@example.com' },
      { name: 'Ashley Garcia', email: 'sample10@example.com' },
      { name: 'Daniel Martinez', email: 'sample11@example.com' },
      { name: 'Stephanie Anderson', email: 'sample12@example.com' },
      { name: 'Ryan Taylor', email: 'sample13@example.com' },
      { name: 'Nicole Thomas', email: 'sample14@example.com' },
      { name: 'Brandon Jackson', email: 'sample15@example.com' }
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

    // 3. Create Multi-Pick Sport (ACTIVE) using rounds_v2
    const multiPickLockTime = new Date('2027-01-15T17:00:00').toISOString().slice(0, 19).replace('T', ' ');
    const [multiPickResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds_v2 (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        'March Madness 2027',
        'multiple',
        2,
        'Pick your top 2 teams to win March Madness!',
        multiPickLockTime,
        'America/New_York',
        'active'
      ]
    );
    const multiPickRoundId = multiPickResult.insertId;

    // 4. Create Single-Pick Sport (ACTIVE) using rounds_v2
    const singlePickLockTime = new Date('2027-01-20T15:00:00').toISOString().slice(0, 19).replace('T', ' ');
    const [singlePickResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds_v2 (season_id, sport_name, pick_type, email_message, lock_time, timezone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        'Super Bowl LXI',
        'single',
        'Pick the Super Bowl champion!',
        singlePickLockTime,
        'America/New_York',
        'active'
      ]
    );
    const singlePickRoundId = singlePickResult.insertId;

    // 5. Create 9 completed sports with scores
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
        name: 'Wimbledon 2026',
        lockTime: new Date('2026-07-10T14:00:00').toISOString().slice(0, 19).replace('T', ' '),
        winner: 'Novak Djokovic',
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

    // 6. Add teams to single-pick sport using round_teams_v2 + teams_v2
    const teams = ['Chiefs', '49ers', 'Ravens', 'Bills', 'Cowboys', 'Eagles', 'Packers'];
    const teamIds: number[] = [];
    for (const team of teams) {
      const teamId = await getOrCreateTeam(connection, team);
      teamIds.push(teamId);
    }
    const teamValues = teamIds.map(teamId => [singlePickRoundId, teamId]);
    await connection.query(
      'INSERT INTO round_teams_v2 (round_id, team_id) VALUES ?',
      [teamValues]
    );

    // 7. Create picks and scores for completed sports
    const completedSportChoices = [
      ['Celtics', 'Lakers', 'Warriors', 'Heat', 'Nuggets', 'Suns', 'Bucks', 'Nets', '76ers', 'Clippers', 'Jazz', 'Trail Blazers', 'Hawks', 'Knicks', 'Bulls'], // NBA Finals
      ['Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'England', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Croatia', 'Uruguay', 'Mexico', 'Japan', 'South Korea'], // World Cup
      ['Tiger Woods', 'Rory McIlroy', 'Scottie Scheffler', 'Jon Rahm', 'Viktor Hovland', 'Collin Morikawa', 'Xander Schauffele', 'Justin Thomas', 'Dustin Johnson', 'Bryson DeChambeau', 'Patrick Cantlay', 'Tony Finau', 'Hideki Matsuyama', 'Cameron Smith', 'Jordan Spieth'], // Masters
      ['Thunder Strike', 'Lightning Bolt', 'Storm Chaser', 'Wind Runner', 'Fire Starter', 'Golden Arrow', 'Silver Bullet', 'Diamond Dust', 'Crystal Clear', 'Midnight Express', 'Sunrise Surprise', 'Moonlight Magic', 'Starlight Symphony', 'Aurora Borealis', 'Cosmic Wonder'], // Kentucky Derby
      ['Rangers', 'Lightning', 'Avalanche', 'Panthers', 'Oilers', 'Maple Leafs', 'Bruins', 'Canadiens', 'Red Wings', 'Blackhawks', 'Penguins', 'Capitals', 'Flyers', 'Devils', 'Islanders'], // Stanley Cup
      ['Jon Jones', 'Israel Adesanya', 'Alexander Volkanovski', 'Kamaru Usman', 'Francis Ngannou', 'Conor McGregor', 'Khabib Nurmagomedov', 'Daniel Cormier', 'Stipe Miocic', 'Amanda Nunes', 'Valentina Shevchenko', 'Rose Namajunas', 'Weili Zhang', 'Holly Holm', 'Miesha Tate'], // UFC
      ['Novak Djokovic', 'Rafael Nadal', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev', 'Stefanos Tsitsipas', 'Alexander Zverev', 'Casper Ruud', 'Felix Auger-Aliassime', 'Taylor Fritz', 'Frances Tiafoe', 'Sebastian Korda', 'Lorenzo Musetti', 'Holger Rune', 'Ben Shelton'], // Wimbledon
      ['USA', 'Spain', 'Australia', 'France', 'Germany', 'Canada', 'Serbia', 'Slovenia', 'Greece', 'Lithuania', 'Argentina', 'Brazil', 'Italy', 'Croatia', 'Turkey'], // Olympics Basketball
      ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Barcelona', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham', 'Manchester United', 'Juventus', 'AC Milan', 'Inter Milan', 'Atletico Madrid', 'Sevilla'] // Champions League
    ];

    for (let sportIndex = 0; sportIndex < completedSports.length; sportIndex++) {
      const roundId = completedRoundIds[sportIndex];
      const sport = completedSports[sportIndex];
      const choices = completedSportChoices[sportIndex];

      // Create picks for all users using picks_v2 + pick_items_v2 + teams_v2
      for (let userIndex = 0; userIndex < userIds.length; userIndex++) {
        const userId = userIds[userIndex];
        
        // Create pick record in picks_v2
        const [pickResult] = await connection.query<ResultSetHeader>(
          'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
          [userId, roundId]
        );
        const pickId = pickResult.insertId;

        // Create pick item using teams_v2
        const pickValue = choices[userIndex];
        if (!pickValue) {
          throw new Error(`No pick value available for user ${userIndex} in sport ${sport.name}. Check completedSportChoices array.`);
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

    // 8. Create simulated picks for active sports
    const multiPickChoices = [
      ['Duke', 'Kansas'],
      ['UNC', 'Kentucky'],
      ['Gonzaga', 'Villanova'],
      ['Michigan', 'UCLA'],
      ['Duke', 'UNC'],
      ['Arizona', 'Houston'],
      ['UConn', 'Purdue'],
      ['Tennessee', 'Alabama'],
      ['Creighton', 'Marquette'],
      ['Baylor', 'Texas'],
      ['Florida', 'Auburn'],
      ['Ohio State', 'Wisconsin'],
      ['Syracuse', 'Louisville'],
      ['Virginia', 'Miami'],
      ['Oregon', 'Washington']
    ];

    const singlePickChoices = [
      'Chiefs', '49ers', 'Ravens', 'Bills', 'Cowboys',
      'Eagles', 'Packers', 'Lions', 'Dolphins', 'Jets',
      'Steelers', 'Browns', 'Bengals', 'Colts', 'Titans'
    ];

    // Multi-pick picks using picks_v2 + pick_items_v2 + teams_v2
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record in picks_v2
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
        [userId, multiPickRoundId]
      );
      const pickId = pickResult.insertId;

      // Create pick items using teams_v2
      const picks = multiPickChoices[i];
      if (!picks || picks.length === 0) {
        throw new Error(`No pick values available for user ${i} in multi-pick sport. Check multiPickChoices array.`);
      }
      
      for (let j = 0; j < picks.length; j++) {
        const pickValue = picks[j];
        if (!pickValue) {
          throw new Error(`No pick value available for user ${i}, pick ${j} in multi-pick sport. Check multiPickChoices array.`);
        }
        
        const teamId = await getOrCreateTeam(connection, pickValue);
        await connection.query(
          'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES (?, ?, ?)',
          [pickId, j + 1, teamId]
        );
      }
    }

    // Single-pick picks using picks_v2 + pick_items_v2 + teams_v2
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record in picks_v2
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks_v2 (user_id, round_id) VALUES (?, ?)',
        [userId, singlePickRoundId]
      );
      const pickId = pickResult.insertId;

      // Create pick item using teams_v2
      const pickValue = singlePickChoices[i];
      if (!pickValue) {
        throw new Error(`No pick value available for user ${i} in single-pick sport. Check singlePickChoices array.`);
      }
      
      const teamId = await getOrCreateTeam(connection, pickValue);
      await connection.query(
        'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES (?, ?, ?)',
        [pickId, 1, teamId]
      );
    }

      return {
        users: userIds.length,
        season: seasonId,
        sports: 2 + completedSports.length, // 2 active + 9 completed
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
        error: 'Sample data may already exist. Delete existing sample users first or reset the database.',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to seed sample data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Check server logs for details'
    });
  }
});

// ⚠️ TEMPORARY ROUTE - REMOVE BEFORE PRODUCTION ⚠️
// Clear all sample data
router.post('/clear-test-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await withTransaction(async (connection) => {
      // Delete users with sample emails (CASCADE will handle related data)
      await connection.query(
        `DELETE FROM users WHERE email IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'sample1@example.com',
          'sample2@example.com',
          'sample3@example.com',
          'sample4@example.com',
          'sample5@example.com',
          'sample6@example.com',
          'sample7@example.com',
          'sample8@example.com',
          'sample9@example.com',
          'sample10@example.com',
          'sample11@example.com',
          'sample12@example.com',
          'sample13@example.com',
          'sample14@example.com',
          'sample15@example.com'
        ]
      );

      // Delete sample sports from rounds_v2
      const testSports = [
        'March Madness 2027', 
        'Super Bowl LXI',
        'NBA Finals 2026',
        'World Cup 2026',
        'Masters 2026',
        'Kentucky Derby 2026',
        'Stanley Cup 2026',
        'UFC Championship 2026',
        'Wimbledon 2026',
        'Olympics Basketball 2024',
        'Champions League 2026'
      ];
      
      await connection.query(
        `DELETE FROM rounds_v2 WHERE sport_name IN (${testSports.map(() => '?').join(', ')})`,
        testSports
      );

      // Delete sample season from seasons_v2 (CASCADE will handle related data like season_participants_v2)
      await connection.query(
        `DELETE FROM seasons_v2 WHERE name = ?`,
        ['Test Season 2025-2026']
      );
    });

    res.json({ message: 'Sample data deleted successfully!' });

  } catch (error) {
    logError('Clear sample data error', error);
    res.status(500).json({ error: 'Failed to delete sample data' });
  }
});

export default router;

