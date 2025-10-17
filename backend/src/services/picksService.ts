/**
 * Picks Service
 * Centralized pick submission logic to eliminate duplication
 */

import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import logger from '../utils/logger';
import { sanitizePlainTextArray } from '../utils/textSanitizer';

export interface SubmitPickOptions {
  userId: number;
  roundId: number;
  picks: string[];
  validateTeams?: boolean;
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
   */
  static async validatePicksAgainstTeams(
    connection: PoolConnection,
    roundId: number,
    picks: string[]
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const [teams] = await connection.query<RowDataPacket[]>(
        'SELECT team_name FROM round_teams WHERE round_id = ?',
        [roundId]
      );

      const teamNames = teams.map(t => t.team_name.toLowerCase());
      
      if (teamNames.length > 0) {
        for (const pick of picks) {
          if (!teamNames.includes(pick.toLowerCase())) {
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
   */
  static async submitPick(
    connection: PoolConnection,
    options: SubmitPickOptions
  ): Promise<void> {
    const { userId, roundId, picks, validateTeams = false } = options;

    return this.retryOnDeadlock(async () => {
      // Validate pick values (length only)
      for (const pick of picks) {
        if (pick && pick.length > 100) {
          throw new Error('Pick values must be 100 characters or less');
        }
      }

      // Sanitize picks to strip tags but not encode '/'
      const cleanedPicks = sanitizePlainTextArray(picks);

      // Validate against teams if requested
      if (validateTeams) {
        const validation = await this.validatePicksAgainstTeams(connection, roundId, cleanedPicks);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // Insert or update main pick record
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO picks (user_id, round_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [userId, roundId]
      );

      // Get the pick ID (handles both INSERT and UPDATE cases)
      let pickId = result.insertId;
      
      if (!pickId) {
        const [existingPick] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM picks WHERE user_id = ? AND round_id = ?',
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
        'DELETE FROM pick_items WHERE pick_id = ?',
        [pickId]
      );

      // Insert new pick items
      const pickItemValues = cleanedPicks
        .filter(p => p && p.trim().length > 0)
        .map((pick, index) => [pickId, index + 1, pick]);

      if (pickItemValues.length > 0) {
        await connection.query(
          'INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES ?',
          [pickItemValues]
        );
      }

      logger.debug('Pick submitted successfully', { userId, roundId, pickCount: picks.length });
    });
  }

  /**
   * Gets pick with items for a user and round
   */
  static async getPick(
    connection: PoolConnection,
    userId: number,
    roundId: number
  ): Promise<{ id: number; pickItems: Array<{ pickNumber: number; pickValue: string }> } | null> {
    try {
      const [picks] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM picks WHERE user_id = ? AND round_id = ?',
        [userId, roundId]
      );

      if (picks.length === 0) {
        return null;
      }

      const [pickItems] = await connection.query<RowDataPacket[]>(
        'SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number',
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

