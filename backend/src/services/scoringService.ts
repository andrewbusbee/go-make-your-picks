/**
 * Scoring Service
 * Centralized scoring calculations for consistency across all endpoints
 * Eliminates duplicate calculation logic and prevents scoring bugs
 */

import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { SettingsService } from './settingsService';

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  picks: Record<number, any>;
  scores: Record<number, any>;
  totalPoints: number;
  rank: number;
}

export interface FinalStanding {
  user_id: number;
  name: string;
  total_points: number;
}

export interface GraphData {
  userId: number;
  userName: string;
  points: Array<{
    roundId: number;
    roundName: string;
    points: number;
  }>;
}

export class ScoringService {
  /**
   * Calculate leaderboard for a season
   * Used by: leaderboard endpoint, admin dashboard
   */
  static async calculateLeaderboard(seasonId: number): Promise<{
    rounds: RowDataPacket[];
    leaderboard: LeaderboardEntry[];
  }> {
    try {
      logger.debug('Calculating leaderboard for season', { seasonId });
      
      // Get point values from settings (uses historical settings for ended seasons)
      const points = await SettingsService.getPointsSettingsForSeason(seasonId);
      logger.debug('Retrieved point settings for season', { seasonId, points });

      // Get all rounds for the season (excluding soft-deleted)
      const [rounds] = await db.query<RowDataPacket[]>(
        `SELECT id, sport_name, status, first_place_team, second_place_team, third_place_team, fourth_place_team, fifth_place_team, lock_time
         FROM rounds 
         WHERE season_id = ? AND deleted_at IS NULL
         ORDER BY lock_time ASC`,
        [seasonId]
      );

      // Get only users who are participants in this season
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name 
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         WHERE sp.season_id = ?
         ORDER BY u.name ASC`,
        [seasonId]
      );

      // Get all picks for the season's rounds
      const roundIds = rounds.map(r => r.id);
      let picks: RowDataPacket[] = [];
      let pickItems: RowDataPacket[] = [];
      
      if (roundIds.length > 0) {
        [picks] = await db.query<RowDataPacket[]>(
          `SELECT p.*, r.status as round_status, r.lock_time, r.timezone,
                  a.name as editor_name
           FROM picks p
           JOIN rounds r ON p.round_id = r.id
           LEFT JOIN admins a ON p.edited_by_admin_id = a.id
           WHERE p.round_id IN (?)`,
          [roundIds]
        );

        // Get all pick items for these picks
        if (picks.length > 0) {
          const pickIds = picks.map(p => p.id);
          [pickItems] = await db.query<RowDataPacket[]>(
            'SELECT * FROM pick_items WHERE pick_id IN (?)',
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

      // Build lookup maps for O(1) access
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

      // Add rank with proper tie handling
      let currentRank = 1;
      leaderboard.forEach((entry, index) => {
        // If this is not the first entry and points are different from previous entry
        // then the rank should be the current position (index + 1)
        if (index > 0 && leaderboard[index - 1].totalPoints !== entry.totalPoints) {
          currentRank = index + 1;
        }
        entry.rank = currentRank;
      });

      logger.debug('Leaderboard calculation completed', { 
        seasonId, 
        userCount: leaderboard.length,
        roundCount: rounds.length,
        topScore: leaderboard[0]?.totalPoints || 0
      });

      return {
        rounds,
        leaderboard
      };
    } catch (error) {
      logger.error('ScoringService.calculateLeaderboard error', { error, seasonId });
      throw error;
    }
  }

  /**
   * Calculate final standings for ending a season
   * Used by: end season endpoint
   */
  static async calculateFinalStandings(seasonId: number): Promise<FinalStanding[]> {
    try {
      // Get current point values (season is being ended now, so use current settings)
      const points = await SettingsService.getPointsSettings();

      // Calculate final standings with comprehensive scoring (same as leaderboard, excluding soft-deleted rounds)
      const [leaderboard] = await db.query<RowDataPacket[]>(
        `SELECT 
          u.id as user_id,
          u.name,
          CAST(
            SUM(COALESCE(s.first_place, 0) * ?) +
            SUM(COALESCE(s.second_place, 0) * ?) +
            SUM(COALESCE(s.third_place, 0) * ?) +
            SUM(COALESCE(s.fourth_place, 0) * ?) +
            SUM(COALESCE(s.fifth_place, 0) * ?) +
            SUM(COALESCE(s.sixth_plus_place, 0) * ?) +
            SUM(COALESCE(s.no_pick, 0) * ?)
          AS SIGNED) as total_points
        FROM users u
        JOIN season_participants sp ON u.id = sp.user_id
        LEFT JOIN rounds r ON r.season_id = ? AND r.deleted_at IS NULL
        LEFT JOIN scores s ON u.id = s.user_id AND s.round_id = r.id
        WHERE sp.season_id = ?
        GROUP BY u.id, u.name
        ORDER BY total_points DESC`,
        [points.pointsFirst, points.pointsSecond, points.pointsThird, points.pointsFourth, points.pointsFifth, points.pointsSixthPlus, points.pointsNoPick, seasonId, seasonId]
      );

      logger.debug('Final standings calculated', { 
        count: leaderboard.length, 
        points: {
          first: points.pointsFirst,
          second: points.pointsSecond,
          third: points.pointsThird,
          fourth: points.pointsFourth,
          fifth: points.pointsFifth,
          sixthPlus: points.pointsSixthPlus,
          noPick: points.pointsNoPick
        }
      });

      return leaderboard as FinalStanding[];
    } catch (error) {
      logger.error('ScoringService.calculateFinalStandings error', { error, seasonId });
      throw error;
    }
  }

  /**
   * Calculate cumulative points graph data
   * Used by: leaderboard graph endpoint
   */
  static async calculateCumulativeGraph(seasonId: number): Promise<GraphData[]> {
    try {
      // Get point values from settings (uses historical settings for ended seasons)
      const points = await SettingsService.getPointsSettingsForSeason(seasonId);

      // Get completed rounds in order (excluding soft-deleted)
      const [rounds] = await db.query<RowDataPacket[]>(
        `SELECT id, sport_name, lock_time
         FROM rounds 
         WHERE season_id = ? AND status = 'completed' AND deleted_at IS NULL
         ORDER BY lock_time ASC`,
        [seasonId]
      );

      // Get only users who are participants in this season
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name 
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         WHERE sp.season_id = ?
         ORDER BY u.name ASC`,
        [seasonId]
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
              (score.sixth_plus_place || 0) * points.pointsSixthPlus +
              (score.no_pick || 0) * points.pointsNoPick;
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

      logger.info('Cumulative graph data with Start point', {
        seasonId,
        userCount: graphData.length,
        sampleUser: graphData[0] ? {
          userName: graphData[0].userName,
          pointsCount: graphData[0].points.length,
          firstPoint: graphData[0].points[0],
          secondPoint: graphData[0].points[1]
        } : null
      });

      return graphData;
    } catch (error) {
      logger.error('ScoringService.calculateCumulativeGraph error', { error, seasonId });
      throw error;
    }
  }

  /**
   * Calculate total points for a specific user in a season
   * Used by: user profile, individual stats
   */
  static async calculateUserTotalPoints(userId: number, seasonId: number): Promise<number> {
    try {
      // Get point values from settings (uses historical settings for ended seasons)
      const points = await SettingsService.getPointsSettingsForSeason(seasonId);

      const [result] = await db.query<RowDataPacket[]>(
        `SELECT 
          CAST(
            SUM(COALESCE(s.first_place, 0) * ?) +
            SUM(COALESCE(s.second_place, 0) * ?) +
            SUM(COALESCE(s.third_place, 0) * ?) +
            SUM(COALESCE(s.fourth_place, 0) * ?) +
            SUM(COALESCE(s.fifth_place, 0) * ?) +
            SUM(COALESCE(s.sixth_plus_place, 0) * ?) +
            SUM(COALESCE(s.no_pick, 0) * ?)
          AS SIGNED) as total_points
        FROM scores s
        JOIN rounds r ON s.round_id = r.id
        WHERE s.user_id = ? AND r.season_id = ? AND r.deleted_at IS NULL`,
        [points.pointsFirst, points.pointsSecond, points.pointsThird, points.pointsFourth, points.pointsFifth, points.pointsSixthPlus, points.pointsNoPick, userId, seasonId]
      );

      return Number(result[0]?.total_points) || 0;
    } catch (error) {
      logger.error('ScoringService.calculateUserTotalPoints error', { error, userId, seasonId });
      throw error;
    }
  }
}
