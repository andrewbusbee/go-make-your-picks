import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Fix scoring_rules_v2 place constraint to allow place = 0
 * 
 * This migration fixes the CHECK constraint on scoring_rules_v2 to allow place = 0,
 * which represents "no pick" points. The original constraint only allowed place >= 1,
 * but the application needs to store point values for place = 0 (no pick scenarios).
 * 
 * Changes:
 * - Drop the old constraint: check_place_range_scoring (place >= 1 AND place <= 10)
 * - Add new constraint: check_place_range_scoring (place >= 0 AND place <= 10)
 * 
 * This aligns scoring_rules_v2 with score_details_v2, which already allows place = 0.
 */
export class FixScoringRulesPlaceConstraint implements Migration {
  id = '20250123000005_fix_scoring_rules_place_constraint';
  description = 'Fix scoring_rules_v2 place constraint to allow place = 0 for no pick points';

  async up(): Promise<void> {
    try {
      // Check if scoring_rules_v2 table exists
      const [tableExists] = await db.query(
        "SHOW TABLES LIKE 'scoring_rules_v2'"
      ) as any;

      if (tableExists.length === 0) {
        logger.info('scoring_rules_v2 table does not exist, skipping constraint update');
        return;
      }

      // Check if constraint already exists with correct definition
      const [constraintInfo] = await db.query(
        `SELECT CHECK_CLAUSE 
         FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'scoring_rules_v2' 
         AND CONSTRAINT_NAME = 'check_place_range_scoring'`
      ) as any;

      if (constraintInfo.length > 0) {
        const checkClause = constraintInfo[0].CHECK_CLAUSE;
        // Check if it already allows place >= 0
        if (checkClause && checkClause.includes('place >= 0')) {
          logger.info('Constraint already allows place >= 0, skipping');
          return;
        }
      }

      // Drop the old constraint if it exists
      try {
        await db.query(`ALTER TABLE scoring_rules_v2 DROP CONSTRAINT check_place_range_scoring`);
        logger.info('Dropped old check_place_range_scoring constraint');
      } catch (error: any) {
        // Constraint might not exist or might have a different name
        if (error.code === 'ER_CONSTRAINT_NOT_FOUND' || error.code === 'ER_CHECK_CONSTRAINT_NOT_FOUND') {
          logger.info('Old constraint not found, may have already been updated or never existed');
        } else {
          logger.warn('Error dropping old constraint (may not exist)', { error: error.message });
        }
      }

      // Add new constraint that allows place = 0
      await db.query(`
        ALTER TABLE scoring_rules_v2
        ADD CONSTRAINT check_place_range_scoring CHECK (place >= 0 AND place <= 10)
      `);
      logger.info('Added updated check_place_range_scoring constraint (allows place = 0)');
    } catch (error: any) {
      // If constraint already exists with correct definition, that's fine
      if (error.code === 'ER_DUP_CONSTRAINT_NAME' || error.code === 'ER_DUP_KEYNAME') {
        logger.info('Constraint already exists with correct definition, skipping');
      } else {
        logger.error('Error updating scoring_rules_v2 place constraint', { error });
        throw error;
      }
    }
  }

  async down(): Promise<void> {
    try {
      // Drop the new constraint
      await db.query(`ALTER TABLE scoring_rules_v2 DROP CONSTRAINT check_place_range_scoring`);
      
      // Restore the old constraint (place >= 1)
      await db.query(`
        ALTER TABLE scoring_rules_v2
        ADD CONSTRAINT check_place_range_scoring CHECK (place >= 1 AND place <= 10)
      `);
      logger.info('Reverted scoring_rules_v2 place constraint back to place >= 1');
    } catch (error: any) {
      logger.error('Error reverting scoring_rules_v2 place constraint', { error });
      // Don't throw - allow migration to continue
    }
  }
}

