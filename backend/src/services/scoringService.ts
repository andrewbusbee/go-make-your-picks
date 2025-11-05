/**
 * Scoring Service
 * Centralized scoring calculations for consistency across all endpoints
 * Eliminates duplicate calculation logic and prevents scoring bugs
 * Updated to use v2 normalized schema (score_details_v2, scoring_rules_v2, round_results_v2)
 */

// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

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

      // Get all rounds for the season (excluding soft-deleted) from rounds_v2
      // Sort: completed rounds by completion date (updated_at) first, then uncompleted by lock_time
      // If no rounds are completed, all sorted by lock_time
      const [rounds] = await db.query<RowDataPacket[]>(
        `SELECT id, sport_name, status, lock_time, updated_at
         FROM rounds_v2 
         WHERE season_id = ? AND deleted_at IS NULL
         ORDER BY 
           CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
           COALESCE(
             CASE WHEN status = 'completed' THEN updated_at END,
             lock_time
           ) ASC`,
        [seasonId]
      );

      // Get only users who are participants in this season (from season_participants_v2)
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name 
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id
         WHERE sp.season_id = ?
         ORDER BY u.name ASC`,
        [seasonId]
      );

      // Get all picks for the season's rounds from picks_v2
      const roundIds = rounds.map(r => r.id);
      let picks: RowDataPacket[] = [];
      let pickItems: RowDataPacket[] = [];
      
      if (roundIds.length > 0) {
        [picks] = await db.query<RowDataPacket[]>(
          `SELECT p.*, r.status as round_status, r.lock_time, r.timezone,
                  a.name as editor_name
           FROM picks_v2 p
           JOIN rounds_v2 r ON p.round_id = r.id
           LEFT JOIN admins a ON p.edited_by_admin_id = a.id
           WHERE p.round_id IN (?)`,
          [roundIds]
        );

        // Get all pick items for these picks from pick_items_v2 + teams_v2
        if (picks.length > 0) {
          const pickIds = picks.map(p => p.id);
          [pickItems] = await db.query<RowDataPacket[]>(
            `SELECT pi.pick_id, pi.pick_number, t.name as pick_value
             FROM pick_items_v2 pi
             JOIN teams_v2 t ON pi.team_id = t.id
             WHERE pi.pick_id IN (?)`,
            [pickIds]
          );
        }
      }

      // Get all score details for the season's rounds from score_details_v2
      // Also get scoring rules for this season from scoring_rules_v2
      let scoreDetails: RowDataPacket[] = [];
      let scoringRules: RowDataPacket[] = [];
      if (roundIds.length > 0) {
        [scoreDetails] = await db.query<RowDataPacket[]>(
          'SELECT * FROM score_details_v2 WHERE round_id IN (?)',
          [roundIds]
        );
        
        // Get scoring rules for this season
        [scoringRules] = await db.query<RowDataPacket[]>(
          'SELECT place, points FROM scoring_rules_v2 WHERE season_id = ?',
          [seasonId]
        );
      }
      
      // Check if season is ended to determine if missing scoring rules is expected
      const [seasonData] = await db.query<RowDataPacket[]>(
        'SELECT ended_at FROM seasons_v2 WHERE id = ?',
        [seasonId]
      );

      // Build lookup maps for O(1) access
      const picksMap = new Map<string, any>();
      picks.forEach(p => {
        picksMap.set(`${p.user_id}-${p.round_id}`, p);
      });

      // Build scoring rules map (place -> points)
      const scoringRulesMap = new Map<number, number>();
      scoringRules.forEach(rule => {
        scoringRulesMap.set(rule.place, rule.points);
      });
      
      // If no scoring rules exist in v2, fall back to SettingsService (backward compatibility)
      // This is expected for active seasons - scoring_rules_v2 is only populated when a season ends
      // Only warn if season is ended but has no rules (indicates a problem)
      if (scoringRulesMap.size === 0) {
        const isEnded = seasonData.length > 0 && seasonData[0].ended_at !== null;
        if (isEnded) {
          logger.warn('Ended season has no scoring rules in scoring_rules_v2, falling back to SettingsService', { seasonId });
        } else {
          logger.debug('Active season has no scoring rules in scoring_rules_v2, using current settings (expected)', { seasonId });
        }
        const points = await SettingsService.getPointsSettingsForSeason(seasonId);
        scoringRulesMap.set(1, points.pointsFirst);
        scoringRulesMap.set(2, points.pointsSecond);
        scoringRulesMap.set(3, points.pointsThird);
        scoringRulesMap.set(4, points.pointsFourth);
        scoringRulesMap.set(5, points.pointsFifth);
        scoringRulesMap.set(6, points.pointsSixthPlus);
        scoringRulesMap.set(0, points.pointsNoPick);
      }

      // Build score details map: key = `${user_id}-${round_id}`, value = Map<place, count>
      const scoreDetailsMap = new Map<string, Map<number, number>>();
      scoreDetails.forEach(sd => {
        const key = `${sd.user_id}-${sd.round_id}`;
        if (!scoreDetailsMap.has(key)) {
          scoreDetailsMap.set(key, new Map());
        }
        scoreDetailsMap.get(key)!.set(sd.place, sd.count);
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

          // Add pick items to the pick object
          if (pick) {
            const items = pickItemsMap.get(pick.id) || [];
            userPicks[round.id] = {
              ...pick,
              original_pick: pick.original_pick || null,
              pickItems: items.map(item => ({
                pickNumber: item.pick_number,
                pickValue: item.pick_value
              }))
            };
          } else {
            userPicks[round.id] = null;
          }
          
          // Calculate dynamic total points from score_details_v2 + scoring_rules_v2
          const scoreKey = `${user.id}-${round.id}`;
          const scoreMap = scoreDetailsMap.get(scoreKey);
          
          if (scoreMap) {
            // Calculate total points by summing: count * points for each place
            let roundTotalPoints = 0;
            const scoreObject: any = {};
            
            // Build score object similar to old format for backward compatibility
            for (let place = 0; place <= 10; place++) {
              const count = scoreMap.get(place) || 0;
              const points = scoringRulesMap.get(place) || 0;
              roundTotalPoints += count * points;
              
              // Map to old format for API compatibility
              if (place === 1) scoreObject.first_place = count;
              else if (place === 2) scoreObject.second_place = count;
              else if (place === 3) scoreObject.third_place = count;
              else if (place === 4) scoreObject.fourth_place = count;
              else if (place === 5) scoreObject.fifth_place = count;
              else if (place === 6) scoreObject.sixth_plus_place = count;
              else if (place === 0) scoreObject.no_pick = count;
            }
            
            userScores[round.id] = {
              ...scoreObject,
              total_points: roundTotalPoints
            };
            totalPoints += roundTotalPoints;
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

      // Get round results for completed rounds (for display in frontend)
      const completedRoundIds = rounds.filter(r => r.status === 'completed').map(r => r.id);
      const roundResultsMap = new Map<number, Array<{place: number, teamId: number, teamName: string}>>();
      
      if (completedRoundIds.length > 0) {
        const [allRoundResults] = await db.query<RowDataPacket[]>(
          `SELECT rr.round_id, rr.place, rr.team_id, t.name as team_name
           FROM round_results_v2 rr
           JOIN teams_v2 t ON rr.team_id = t.id
           WHERE rr.round_id IN (?)
           ORDER BY rr.round_id, rr.place`,
          [completedRoundIds]
        );

        allRoundResults.forEach(rr => {
          if (!roundResultsMap.has(rr.round_id)) {
            roundResultsMap.set(rr.round_id, []);
          }
          roundResultsMap.get(rr.round_id)!.push({
            place: rr.place,
            teamId: rr.team_id,
            teamName: rr.team_name
          });
        });
      }

      // Attach results to rounds
      const roundsWithResults = rounds.map(round => ({
        ...round,
        results: roundResultsMap.get(round.id) || undefined
      }));

      return {
        rounds: roundsWithResults,
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
   * Updated to use v2 schema: score_details_v2, scoring_rules_v2
   */
  static async calculateFinalStandings(seasonId: number): Promise<FinalStanding[]> {
    try {
      // Get scoring rules for this season from scoring_rules_v2
      // Also check if season is ended to determine if this is expected
      const [seasonData] = await db.query<RowDataPacket[]>(
        'SELECT ended_at FROM seasons_v2 WHERE id = ?',
        [seasonId]
      );
      
      const [scoringRules] = await db.query<RowDataPacket[]>(
        'SELECT place, points FROM scoring_rules_v2 WHERE season_id = ?',
        [seasonId]
      );

      // If no scoring rules exist, fall back to SettingsService
      // This is expected for active seasons (scoring_rules_v2 is only populated when season ends)
      // Only warn if season is ended but has no rules (indicates a problem)
      if (scoringRules.length === 0) {
        const isEnded = seasonData.length > 0 && seasonData[0].ended_at !== null;
        if (isEnded) {
          logger.warn('Ended season has no scoring rules in scoring_rules_v2, falling back to SettingsService', { seasonId });
        } else {
          logger.debug('Active season has no scoring rules in scoring_rules_v2, using current settings (expected)', { seasonId });
        }
        const points = await SettingsService.getPointsSettings();
        
        // Calculate using score_details_v2 with fallback points
        const [leaderboard] = await db.query<RowDataPacket[]>(
          `SELECT 
            u.id as user_id,
            u.name,
            CAST(
              SUM(COALESCE(CASE WHEN sd.place = 1 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 2 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 3 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 4 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 5 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place >= 6 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 0 THEN sd.count ELSE 0 END, 0) * ?)
            AS SIGNED) as total_points
          FROM users u
          JOIN season_participants_v2 sp ON u.id = sp.user_id
          LEFT JOIN rounds_v2 r ON r.season_id = ? AND r.deleted_at IS NULL
          LEFT JOIN score_details_v2 sd ON u.id = sd.user_id AND sd.round_id = r.id
          WHERE sp.season_id = ?
          GROUP BY u.id, u.name
          ORDER BY total_points DESC`,
          [points.pointsFirst, points.pointsSecond, points.pointsThird, points.pointsFourth, points.pointsFifth, points.pointsSixthPlus, points.pointsNoPick, seasonId, seasonId]
        );
        
        return leaderboard as FinalStanding[];
      }

      // Build scoring rules map
      const scoringRulesMap = new Map<number, number>();
      scoringRules.forEach(rule => {
        scoringRulesMap.set(rule.place, rule.points);
      });

      // Calculate final standings using score_details_v2 + scoring_rules_v2
      // Use a subquery to calculate points per round, then sum
      const [leaderboard] = await db.query<RowDataPacket[]>(
        `SELECT 
          u.id as user_id,
          u.name,
          CAST(
            SUM(
              COALESCE(sd.count, 0) * COALESCE(sr.points, 0)
            )
          AS SIGNED) as total_points
        FROM users u
        JOIN season_participants_v2 sp ON u.id = sp.user_id
        LEFT JOIN rounds_v2 r ON r.season_id = ? AND r.deleted_at IS NULL
        LEFT JOIN score_details_v2 sd ON u.id = sd.user_id AND sd.round_id = r.id
        LEFT JOIN scoring_rules_v2 sr ON sr.season_id = ? AND sr.place = sd.place
        WHERE sp.season_id = ?
        GROUP BY u.id, u.name
        ORDER BY total_points DESC`,
        [seasonId, seasonId, seasonId]
      );

      logger.debug('Final standings calculated', { 
        count: leaderboard.length,
        seasonId
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

      // Get completed rounds in order (excluding soft-deleted) from rounds_v2
      // Sort by completion date (updated_at) to match leaderboard sorting
      const [rounds] = await db.query<RowDataPacket[]>(
        `SELECT id, sport_name, lock_time, updated_at
         FROM rounds_v2 
         WHERE season_id = ? AND status = 'completed' AND deleted_at IS NULL
         ORDER BY updated_at ASC`,
        [seasonId]
      );

      // Get only users who are participants in this season from season_participants_v2
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name 
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id
         WHERE sp.season_id = ?
         ORDER BY u.name ASC`,
        [seasonId]
      );

      const roundIds = rounds.map(r => r.id);
      let scoreDetails: RowDataPacket[] = [];
      let scoringRules: RowDataPacket[] = [];
      
      if (roundIds.length > 0) {
        [scoreDetails] = await db.query<RowDataPacket[]>(
          'SELECT * FROM score_details_v2 WHERE round_id IN (?)',
          [roundIds]
        );
        
        [scoringRules] = await db.query<RowDataPacket[]>(
          'SELECT place, points FROM scoring_rules_v2 WHERE season_id = ?',
          [seasonId]
        );
      }

      // Build scoring rules map
      const scoringRulesMap = new Map<number, number>();
      scoringRules.forEach(rule => {
        scoringRulesMap.set(rule.place, rule.points);
      });
      
      // Fall back to SettingsService if no scoring rules
      if (scoringRulesMap.size === 0) {
        const points = await SettingsService.getPointsSettingsForSeason(seasonId);
        scoringRulesMap.set(1, points.pointsFirst);
        scoringRulesMap.set(2, points.pointsSecond);
        scoringRulesMap.set(3, points.pointsThird);
        scoringRulesMap.set(4, points.pointsFourth);
        scoringRulesMap.set(5, points.pointsFifth);
        scoringRulesMap.set(6, points.pointsSixthPlus);
        scoringRulesMap.set(0, points.pointsNoPick);
      }

      // Build score details map: key = `${user_id}-${round_id}`, value = Map<place, count>
      const scoreDetailsMap = new Map<string, Map<number, number>>();
      scoreDetails.forEach(sd => {
        const key = `${sd.user_id}-${sd.round_id}`;
        if (!scoreDetailsMap.has(key)) {
          scoreDetailsMap.set(key, new Map());
        }
        scoreDetailsMap.get(key)!.set(sd.place, sd.count);
      });

      // Build cumulative data for each user
      const graphData = users.map(user => {
        let cumulative = 0;
        const userPoints = rounds.map(round => {
          const scoreKey = `${user.id}-${round.id}`;
          const scoreMap = scoreDetailsMap.get(scoreKey);
          
          if (scoreMap) {
            // Calculate points by summing: count * points for each place
            let roundPoints = 0;
            scoreMap.forEach((count, place) => {
              const points = scoringRulesMap.get(place) || 0;
              roundPoints += count * points;
            });
            cumulative += roundPoints;
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
   * Updated to use v2 schema: score_details_v2, scoring_rules_v2
   */
  static async calculateUserTotalPoints(userId: number, seasonId: number): Promise<number> {
    try {
      // Get scoring rules for this season from scoring_rules_v2
      const [scoringRules] = await db.query<RowDataPacket[]>(
        'SELECT place, points FROM scoring_rules_v2 WHERE season_id = ?',
        [seasonId]
      );

      // If no scoring rules exist, fall back to SettingsService
      if (scoringRules.length === 0) {
        const points = await SettingsService.getPointsSettingsForSeason(seasonId);
        
        const [result] = await db.query<RowDataPacket[]>(
          `SELECT 
            CAST(
              SUM(COALESCE(CASE WHEN sd.place = 1 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 2 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 3 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 4 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 5 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place >= 6 THEN sd.count ELSE 0 END, 0) * ?) +
              SUM(COALESCE(CASE WHEN sd.place = 0 THEN sd.count ELSE 0 END, 0) * ?)
            AS SIGNED) as total_points
          FROM score_details_v2 sd
          JOIN rounds_v2 r ON sd.round_id = r.id
          WHERE sd.user_id = ? AND r.season_id = ? AND r.deleted_at IS NULL`,
          [points.pointsFirst, points.pointsSecond, points.pointsThird, points.pointsFourth, points.pointsFifth, points.pointsSixthPlus, points.pointsNoPick, userId, seasonId]
        );
        
        return Number(result[0]?.total_points) || 0;
      }

      // Calculate using score_details_v2 + scoring_rules_v2
      const [result] = await db.query<RowDataPacket[]>(
        `SELECT 
          CAST(
            SUM(COALESCE(sd.count, 0) * COALESCE(sr.points, 0))
          AS SIGNED) as total_points
        FROM score_details_v2 sd
        JOIN rounds_v2 r ON sd.round_id = r.id
        LEFT JOIN scoring_rules_v2 sr ON sr.season_id = ? AND sr.place = sd.place
        WHERE sd.user_id = ? AND r.season_id = ? AND r.deleted_at IS NULL`,
        [seasonId, userId, seasonId]
      );

      return Number(result[0]?.total_points) || 0;
    } catch (error) {
      logger.error('ScoringService.calculateUserTotalPoints error', { error, userId, seasonId });
      throw error;
    }
  }
}
