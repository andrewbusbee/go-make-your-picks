import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Remove UNIQUE constraint from teams_v2.name
 * 
 * This allows teams to be isolated per round - the same team name (e.g., "Dodgers")
 * can exist multiple times with different IDs, each associated with different rounds.
 * 
 * Teams are now isolated per round rather than shared globally.
 */
export class RemoveTeamsV2UniqueConstraint implements Migration {
  id = '20250123000007_remove_teams_v2_unique_constraint';
  description = 'Remove UNIQUE constraint from teams_v2.name to allow team isolation per round';

  async up(): Promise<void> {
    try {
      // Check if constraint or index exists (UNIQUE creates both)
      const [constraints] = await db.query(
        `SELECT CONSTRAINT_NAME 
         FROM information_schema.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'teams_v2' 
         AND CONSTRAINT_NAME = 'unique_team_name'`
      ) as any[];

      // Also check for index existence (UNIQUE constraints create indexes)
      const [indexes] = await db.query(
        `SELECT INDEX_NAME 
         FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'teams_v2' 
         AND INDEX_NAME = 'unique_team_name'`
      ) as any[];

      if (constraints.length > 0 || indexes.length > 0) {
        // Use DROP INDEX (works for both constraint and index)
        // Wrap in try-catch to handle race conditions or if already dropped
        try {
          await db.query('ALTER TABLE teams_v2 DROP INDEX unique_team_name');
          logger.info('Dropped UNIQUE constraint/index unique_team_name from teams_v2');
        } catch (dropError: any) {
          // If index/constraint doesn't exist (e.g., already dropped), log and continue
          if (dropError.code === 'ER_CANT_DROP_FIELD_OR_KEY' || dropError.code === '42S21') {
            logger.info('UNIQUE constraint/index unique_team_name already removed, skipping');
          } else {
            throw dropError;
          }
        }
      } else {
        logger.info('UNIQUE constraint/index unique_team_name does not exist, skipping');
      }
    } catch (error) {
      logger.error('Error removing UNIQUE constraint from teams_v2', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // Check if constraint already exists
      const [constraints] = await db.query(
        `SELECT CONSTRAINT_NAME 
         FROM information_schema.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'teams_v2' 
         AND CONSTRAINT_NAME = 'unique_team_name'`
      ) as any[];

      if (constraints.length === 0) {
        // Check if there are duplicate names (would prevent adding UNIQUE constraint)
        const [duplicates] = await db.query(
          `SELECT name, COUNT(*) as count 
           FROM teams_v2 
           GROUP BY name 
           HAVING COUNT(*) > 1`
        ) as any[];

        if (duplicates.length > 0) {
          logger.warn('Cannot restore UNIQUE constraint: duplicate team names exist', {
            duplicateCount: duplicates.length,
            examples: duplicates.slice(0, 5).map((d: any) => d.name)
          });
          throw new Error('Cannot restore UNIQUE constraint: duplicate team names exist. Please resolve duplicates first.');
        }

        await db.query('ALTER TABLE teams_v2 ADD UNIQUE KEY unique_team_name (name)');
        logger.info('Restored UNIQUE constraint unique_team_name to teams_v2');
      } else {
        logger.info('UNIQUE constraint unique_team_name already exists, skipping');
      }
    } catch (error) {
      logger.error('Error restoring UNIQUE constraint to teams_v2', { error });
      throw error;
    }
  }
}

