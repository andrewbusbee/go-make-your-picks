/**
 * Picks Service
 * Centralized pick submission logic to eliminate duplication
 * Updated to use v2 normalized schema (picks_v2, pick_items_v2, teams_v2)
 */

import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import logger from '../utils/logger';
import { sanitizePlainTextArray } from '../utils/textSanitizer';
import { createTeam } from '../utils/teamHelpers';

export interface SubmitPickOptions {
  userId: number;
  roundId: number;
  picks: (string | number)[]; // Can be team IDs (numbers) or team names (strings for write-ins)
  validateTeams?: boolean; // If true, validates picks are valid team IDs for this round
}

export class PicksService {
  /**
   * Retry wrapper for deadlock handling
   */
  private static async retryOnDeadlock<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a deadlock error
        if (error.code === 'ER_LOCK_DEADLOCK' || error.errno === 1213) {
          if (attempt < maxRetries) {
            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
            logger.warn(`Deadlock detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, {
              error: error.message,
              attempt
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If it's not a deadlock or we've exhausted retries, throw the error
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Validates picks against available teams for a round
   * Uses v2 schema: round_teams_v2 + teams_v2
   * Accepts both team IDs (numbers) and team names (strings) for validation
   */
  static async validatePicksAgainstTeams(
    connection: PoolConnection,
    roundId: number,
    picks: (string | number)[]
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get available teams from round_teams_v2 + teams_v2
      const [teams] = await connection.query<RowDataPacket[]>(
        `SELECT t.id, t.name 
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id = ?`,
        [roundId]
      );

      if (teams.length === 0) {
        return { valid: true }; // No teams to validate against
      }

      const validTeamIds = new Set(teams.map(t => t.id));
      const validTeamNames = new Set(teams.map(t => t.name.toLowerCase()));
      
      // Debug logging
      logger.debug('Validating picks against teams', {
        roundId,
        pickCount: picks.length,
        picks,
        validTeamIds: Array.from(validTeamIds),
        validTeamNames: Array.from(validTeamNames),
        teamCount: teams.length
      });
      
      // Additional validation: Check if submitted team IDs belong to this round
      // This helps catch cases where frontend shows teams from one round but JWT is for another
      const submittedTeamIds = picks.filter((p): p is number => typeof p === 'number');
      if (submittedTeamIds.length > 0) {
        const invalidTeamIds = submittedTeamIds.filter(id => !validTeamIds.has(id));
        if (invalidTeamIds.length > 0) {
          logger.warn('Team IDs submitted do not belong to this round', {
            roundId,
            submittedTeamIds,
            invalidTeamIds,
            validTeamIds: Array.from(validTeamIds),
            possibleIssue: 'Frontend may be showing teams from a different round than the JWT token'
          });
        }
      }
      
      for (const pick of picks) {
        // Check if pick is a number (ID) or string (name)
        if (typeof pick === 'number') {
          // ID-based validation: check if team_id exists in round_teams_v2
          if (!validTeamIds.has(pick)) {
            logger.warn('Invalid team ID submitted', {
              roundId,
              teamId: pick,
              validTeamIds: Array.from(validTeamIds),
              pickType: typeof pick
            });
            return {
              valid: false,
              error: `Invalid team ID: ${pick}. Please select from available teams.`
            };
          }
        } else if (typeof pick === 'string') {
          // Handle string that might be a numeric ID
          const numPick = parseInt(pick, 10);
          if (!isNaN(numPick) && validTeamIds.has(numPick)) {
            // It's a numeric string representing a valid team ID
            continue;
          }
          
          // Name-based validation (for backward compatibility or write-ins)
          if (!validTeamNames.has(pick.toLowerCase())) {
            logger.warn('Invalid team name submitted', {
              roundId,
              teamName: pick,
              validTeamNames: Array.from(validTeamNames),
              pickType: typeof pick
            });
            return {
              valid: false,
              error: `Invalid pick: ${pick}. Please select from available teams.`
            };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating picks against teams', { error, roundId });
      throw error;
    }
  }

  /**
   * Creates or updates a pick with pick items
   * Handles the complete pick submission workflow
   * Uses v2 schema: picks_v2, pick_items_v2 (with team_id references)
   */
  static async submitPick(
    connection: PoolConnection,
    options: SubmitPickOptions
  ): Promise<void> {
    const { userId, roundId, picks, validateTeams = false } = options;

    return this.retryOnDeadlock(async () => {
      // Validate picks: if they're strings, check length; if numbers, validate as IDs
      for (const pick of picks) {
        if (typeof pick === 'string' && pick.length > 100) {
          throw new Error('Pick values must be 100 characters or less');
        }
        if (typeof pick === 'number' && pick <= 0) {
          throw new Error('Invalid team ID');
        }
      }

      // Validate against teams if requested (works for both IDs and names)
      if (validateTeams) {
        const validation = await this.validatePicksAgainstTeams(connection, roundId, picks);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Convert picks to team IDs
      // If pick is a number (ID), use it directly
      // If pick is a string (name), get or create team
      const teamIds: number[] = [];
      for (const pick of picks) {
        if (pick === null || pick === undefined || pick === '') {
          continue; // Skip empty picks
        }
        
        if (typeof pick === 'number') {
          // Already an ID, use it directly (already validated if validateTeams=true)
          teamIds.push(pick);
        } else if (typeof pick === 'string') {
          // String: sanitize and create new team (always create for write-in picks)
          const cleanedPick = sanitizePlainTextArray([pick])[0];
          if (cleanedPick && cleanedPick.trim().length > 0) {
            const teamId = await createTeam(connection, cleanedPick);
            teamIds.push(teamId);
          }
        }
      }

      // Insert or update main pick record in picks_v2
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO picks_v2 (user_id, round_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [userId, roundId]
      );

      // Get the pick ID (handles both INSERT and UPDATE cases)
      let pickId = result.insertId;
      
      if (!pickId) {
        const [existingPick] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM picks_v2 WHERE user_id = ? AND round_id = ?',
          [userId, roundId]
        );
        
        if (existingPick.length > 0) {
          pickId = existingPick[0].id;
        } else {
          throw new Error('Failed to create or retrieve pick ID');
        }
      }

      // Delete existing pick items
      await connection.query(
        'DELETE FROM pick_items_v2 WHERE pick_id = ?',
        [pickId]
      );

      // Insert new pick items with team_id references
      const pickItemValues = teamIds.map((teamId, index) => [pickId, index + 1, teamId]);

      if (pickItemValues.length > 0) {
        await connection.query(
          'INSERT INTO pick_items_v2 (pick_id, pick_number, team_id) VALUES ?',
          [pickItemValues]
        );
      }

      logger.debug('Pick submitted successfully', { userId, roundId, pickCount: picks.length });
    });
  }

  /**
   * Gets pick with items for a user and round
   * Uses v2 schema: picks_v2, pick_items_v2 + teams_v2 (joins to get team names)
   */
  static async getPick(
    connection: PoolConnection,
    userId: number,
    roundId: number
  ): Promise<{ id: number; pickItems: Array<{ pickNumber: number; pickValue: string }> } | null> {
    try {
      const [picks] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM picks_v2 WHERE user_id = ? AND round_id = ?',
        [userId, roundId]
      );

      if (picks.length === 0) {
        return null;
      }

      // Get pick items with team names joined from teams_v2
      const [pickItems] = await connection.query<RowDataPacket[]>(
        `SELECT pi.pick_number, t.name as pick_value
         FROM pick_items_v2 pi
         JOIN teams_v2 t ON pi.team_id = t.id
         WHERE pi.pick_id = ?
         ORDER BY pi.pick_number`,
        [picks[0].id]
      );

      return {
        id: picks[0].id,
        pickItems: pickItems.map(item => ({
          pickNumber: item.pick_number,
          pickValue: item.pick_value
        }))
      };
    } catch (error) {
      logger.error('Error getting pick', { error, userId, roundId });
      throw error;
    }
  }
}

