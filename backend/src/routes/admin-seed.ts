import express, { Response } from 'express';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { SettingsService } from '../services/settingsService';

const router = express.Router();

// ⚠️ TEMPORARY ROUTE - REMOVE BEFORE PRODUCTION ⚠️
// Seed sample data for development/testing purposes
router.post('/seed-test-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get or create default season
    let [seasons] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM seasons WHERE is_default = TRUE LIMIT 1'
    );

    let seasonId: number;

    if (seasons.length === 0) {
      // Create a default season for the seed data
      const [seasonResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO seasons (name, year_start, year_end, is_active, is_default) VALUES (?, ?, ?, ?, ?)',
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

    // 2. Add all users to default season
    const participantValues = userIds.map(userId => [seasonId, userId]);
    await connection.query(
      'INSERT INTO season_participants (season_id, user_id) VALUES ?',
      [participantValues]
    );

    // 3. Create Multi-Pick Sport (ACTIVE)
    const multiPickLockTime = new Date('2027-01-15T17:00:00').toISOString().slice(0, 19).replace('T', ' ');
    const [multiPickResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, status)
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

    // 4. Create Single-Pick Sport (ACTIVE)
    const singlePickLockTime = new Date('2027-01-20T15:00:00').toISOString().slice(0, 19).replace('T', ' ');
    const [singlePickResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO rounds (season_id, sport_name, pick_type, email_message, lock_time, timezone, status)
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
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO rounds (season_id, sport_name, pick_type, email_message, lock_time, timezone, status, first_place_team)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          seasonId,
          sport.name,
          sport.pickType,
          `Pick the winner of ${sport.name}!`,
          sport.lockTime,
          'America/New_York',
          'completed',
          sport.winner
        ]
      );
      completedRoundIds.push(result.insertId);
    }

    // 6. Add teams to single-pick sport
    const teams = ['Chiefs', '49ers', 'Ravens', 'Bills', 'Cowboys', 'Eagles', 'Packers'];
    const teamValues = teams.map(team => [singlePickRoundId, team]);
    await connection.query(
      'INSERT INTO round_teams (round_id, team_name) VALUES ?',
      [teamValues]
    );

    // 7. Create picks and scores for completed sports
    const completedSportChoices = [
      ['Celtics', 'Lakers', 'Warriors', 'Heat', 'Nuggets'], // NBA Finals
      ['Brazil', 'Argentina', 'France', 'Germany', 'Spain'], // World Cup
      ['Tiger Woods', 'Rory McIlroy', 'Scottie Scheffler', 'Jon Rahm', 'Viktor Hovland'], // Masters
      ['Thunder Strike', 'Lightning Bolt', 'Storm Chaser', 'Wind Runner', 'Fire Starter'], // Kentucky Derby
      ['Rangers', 'Lightning', 'Avalanche', 'Panthers', 'Oilers'], // Stanley Cup
      ['Jon Jones', 'Israel Adesanya', 'Alexander Volkanovski', 'Kamaru Usman', 'Francis Ngannou'], // UFC
      ['Novak Djokovic', 'Rafael Nadal', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev'], // Wimbledon
      ['USA', 'Spain', 'Australia', 'France', 'Germany'], // Olympics Basketball
      ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Barcelona'] // Champions League
    ];

    for (let sportIndex = 0; sportIndex < completedSports.length; sportIndex++) {
      const roundId = completedRoundIds[sportIndex];
      const sport = completedSports[sportIndex];
      const choices = completedSportChoices[sportIndex];

      // Create picks for all users
      for (let userIndex = 0; userIndex < userIds.length; userIndex++) {
        const userId = userIds[userIndex];
        
        // Create pick record
        const [pickResult] = await connection.query<ResultSetHeader>(
          'INSERT INTO picks (user_id, round_id) VALUES (?, ?)',
          [userId, roundId]
        );
        const pickId = pickResult.insertId;

        // Create pick item
        await connection.query(
          'INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES (?, ?, ?)',
          [pickId, 1, choices[userIndex]]
        );

        // Create realistic scores using the current scoring system
        // Get current point values to ensure consistency
        const points = await SettingsService.getPointsSettings();
        
        // Realistic single-round score options (max 6 points per round)
        const realisticPlaceOptions = [
          { first: 1, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0 },      // 6 pts (1st place)
          { first: 0, second: 1, third: 0, fourth: 0, fifth: 0, sixth: 0 },      // 5 pts (2nd place)
          { first: 0, second: 0, third: 1, fourth: 0, fifth: 0, sixth: 0 },      // 4 pts (3rd place)
          { first: 0, second: 0, third: 0, fourth: 1, fifth: 0, sixth: 0 },      // 3 pts (4th place)
          { first: 0, second: 0, third: 0, fourth: 0, fifth: 1, sixth: 0 },      // 2 pts (5th place)
          { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 1 },      // 1 pt (6th+ place)
          { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0 }       // 0 pts (no pick/wrong pick)
        ];
        
        const randomPlace = realisticPlaceOptions[Math.floor(Math.random() * realisticPlaceOptions.length)];
        
        await connection.query(
          'INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, roundId, randomPlace.first, randomPlace.second, randomPlace.third, randomPlace.fourth, randomPlace.fifth, randomPlace.sixth]
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

    // Multi-pick picks
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks (user_id, round_id) VALUES (?, ?)',
        [userId, multiPickRoundId]
      );
      const pickId = pickResult.insertId;

      // Create pick items
      const picks = multiPickChoices[i];
      for (let j = 0; j < picks.length; j++) {
        await connection.query(
          'INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES (?, ?, ?)',
          [pickId, j + 1, picks[j]]
        );
      }
    }

    // Single-pick picks
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Create pick record
      const [pickResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO picks (user_id, round_id) VALUES (?, ?)',
        [userId, singlePickRoundId]
      );
      const pickId = pickResult.insertId;

      // Create pick item
      await connection.query(
        'INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES (?, ?, ?)',
        [pickId, 1, singlePickChoices[i]]
      );
    }

    await connection.commit();

    res.json({
      message: 'Sample data seeded successfully!',
      details: {
        users: userIds.length,
        season: seasonId,
        sports: 2 + completedSports.length, // 2 active + 9 completed
        picks: userIds.length * (2 + completedSports.length)
      }
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Seed sample data error:', error);
    
    // Check if data already exists
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: 'Sample data may already exist. Delete existing sample users first or reset the database.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to seed sample data' });
  } finally {
    connection.release();
  }
});

// ⚠️ TEMPORARY ROUTE - REMOVE BEFORE PRODUCTION ⚠️
// Clear all sample data
router.post('/clear-test-data', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

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

    // Delete sample sports
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
      `DELETE FROM rounds WHERE sport_name IN (${testSports.map(() => '?').join(', ')})`,
      testSports
    );

    // Delete sample season (CASCADE will handle related data like season_participants)
    await connection.query(
      `DELETE FROM seasons WHERE name = ?`,
      ['Test Season 2025-2026']
    );

    await connection.commit();

    res.json({ message: 'Sample data deleted successfully!' });

  } catch (error) {
    await connection.rollback();
    console.error('Clear sample data error:', error);
    res.status(500).json({ error: 'Failed to delete sample data' });
  } finally {
    connection.release();
  }
});

export default router;

