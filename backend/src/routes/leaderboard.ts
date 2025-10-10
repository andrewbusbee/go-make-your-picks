import express from 'express';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { SettingsService } from '../services/settingsService';

const router = express.Router();

// Get leaderboard for a season
router.get('/season/:seasonId', async (req, res) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    // Get point values from cache (or database if cache expired)
    const points = await SettingsService.getPointsSettings();

    // Get all rounds for the season
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT id, sport_name, status, first_place_team, second_place_team, third_place_team, fourth_place_team, fifth_place_team, lock_time
       FROM rounds 
       WHERE season_id = ? 
       ORDER BY lock_time ASC`,
      [seasonId]
    );

    // Get all users
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM users ORDER BY name ASC'
    );

    // Get all picks for the season's rounds
    const roundIds = rounds.map(r => r.id);
    let picks: RowDataPacket[] = [];
    let pickItems: RowDataPacket[] = [];
    
    if (roundIds.length > 0) {
      [picks] = await db.query<RowDataPacket[]>(
        `SELECT p.*, r.status as round_status, r.lock_time, r.timezone
         FROM picks p
         JOIN rounds r ON p.round_id = r.id
         WHERE p.round_id IN (?)`,
        [roundIds]
      );

      // Get all pick items for these picks
      if (picks.length > 0) {
        const pickIds = picks.map(p => p.id);
        [pickItems] = await db.query<RowDataPacket[]>(
          'SELECT * FROM pick_items WHERE pick_id IN (?) ORDER BY pick_number',
          [pickIds]
        );
      }
    }

    // Get all scores for the season's rounds
    let scores: RowDataPacket[] = [];
    
    if (roundIds.length > 0) {
      [scores] = await db.query<RowDataPacket[]>(
        'SELECT * FROM scores WHERE round_id IN (?)',
        [roundIds]
      );
    }

    // Build lookup maps for O(1) access instead of O(n) .find()
    const picksMap = new Map<string, any>();
    picks.forEach(p => {
      picksMap.set(`${p.user_id}-${p.round_id}`, p);
    });

    const scoresMap = new Map<string, any>();
    scores.forEach(s => {
      scoresMap.set(`${s.user_id}-${s.round_id}`, s);
    });

    const pickItemsMap = new Map<number, any[]>();
    pickItems.forEach(item => {
      const existing = pickItemsMap.get(item.pick_id) || [];
      existing.push(item);
      pickItemsMap.set(item.pick_id, existing);
    });

    // Build leaderboard data with O(1) lookups
    const leaderboard = users.map(user => {
      const userPicks: any = {};
      const userScores: any = {};
      let totalPoints = 0;

      rounds.forEach(round => {
        const key = `${user.id}-${round.id}`;
        const pick = picksMap.get(key);
        const score = scoresMap.get(key);

        // Add pick items to the pick object
        if (pick) {
          const items = pickItemsMap.get(pick.id) || [];
          userPicks[round.id] = {
            ...pick,
            pickItems: items.map(item => ({
              pickNumber: item.pick_number,
              pickValue: item.pick_value
            }))
          };
        } else {
          userPicks[round.id] = null;
        }
        
        // Calculate dynamic total points based on current settings
        if (score) {
          const dynamicTotal = 
            (score.first_place || 0) * points.pointsFirst +
            (score.second_place || 0) * points.pointsSecond +
            (score.third_place || 0) * points.pointsThird +
            (score.fourth_place || 0) * points.pointsFourth +
            (score.fifth_place || 0) * points.pointsFifth +
            (score.sixth_plus_place || 0) * points.pointsSixthPlus;
          
          userScores[round.id] = {
            ...score,
            total_points: dynamicTotal  // Override with dynamic calculation
          };
          totalPoints += dynamicTotal;
        } else {
          userScores[round.id] = null;
        }
      });

      return {
        userId: user.id,
        userName: user.name,
        picks: userPicks,
        scores: userScores,
        totalPoints,
        rank: 0
      };
    });

    // Sort by total points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      rounds,
      leaderboard
    });
  } catch (error) {
    logger.error('Get leaderboard error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cumulative points history for graphing
router.get('/season/:seasonId/graph', async (req, res) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    // Get point values from cache (or database if cache expired)
    const points = await SettingsService.getPointsSettings();

    // Get completed rounds in order
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT id, sport_name, lock_time
       FROM rounds 
       WHERE season_id = ? AND status = 'completed'
       ORDER BY lock_time ASC`,
      [seasonId]
    );

    // Get all users
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM users ORDER BY name ASC'
    );

    const roundIds = rounds.map(r => r.id);
    let scores: RowDataPacket[] = [];
    
    if (roundIds.length > 0) {
      [scores] = await db.query<RowDataPacket[]>(
        'SELECT * FROM scores WHERE round_id IN (?)',
        [roundIds]
      );
    }

    // Build lookup map for O(1) access
    const scoresMap = new Map<string, any>();
    scores.forEach(s => {
      scoresMap.set(`${s.user_id}-${s.round_id}`, s);
    });

    // Build cumulative data for each user
    const graphData = users.map(user => {
      let cumulative = 0;
      const userPoints = rounds.map(round => {
        const score = scoresMap.get(`${user.id}-${round.id}`);
        if (score) {
          // Calculate dynamic points
          const dynamicTotal = 
            (score.first_place || 0) * points.pointsFirst +
            (score.second_place || 0) * points.pointsSecond +
            (score.third_place || 0) * points.pointsThird +
            (score.fourth_place || 0) * points.pointsFourth +
            (score.fifth_place || 0) * points.pointsFifth +
            (score.sixth_plus_place || 0) * points.pointsSixthPlus;
          cumulative += dynamicTotal;
        }
        return {
          roundId: round.id,
          roundName: round.sport_name,
          points: cumulative
        };
      });

      return {
        userId: user.id,
        userName: user.name,
        points: [{ roundId: 0, roundName: 'Start', points: 0 }, ...userPoints]
      };
    });

    res.json(graphData);
  } catch (error) {
    logger.error('Get graph data error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
