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

      // Check if constraint exists by trying to query it via SHOW CREATE TABLE
      // This is more reliable across MariaDB versions than INFORMATION_SCHEMA
      let constraintExists = false;
      let constraintAllowsPlace0 = false;
      
      try {
        const [createTableResult] = await db.query(
          `SHOW CREATE TABLE scoring_rules_v2`
        ) as any;
        
        if (createTableResult.length > 0) {
          const createTableSQL = createTableResult[0]['Create Table'] || '';
          
          // Check if constraint exists
          if (createTableSQL.includes('check_place_range_scoring')) {
            constraintExists = true;
            
            // Check if it already allows place >= 0
            if (createTableSQL.includes('place >= 0')) {
              constraintAllowsPlace0 = true;
              logger.info('Constraint already allows place >= 0, skipping');
              return;
            }
          }
        }
      } catch (error: any) {
        // If we can't check, proceed with dropping and adding
        logger.warn('Could not check existing constraint, proceeding with update', { error: error.message });
      }

      // Drop the old constraint if it exists
      if (constraintExists) {
        try {
          await db.query(`ALTER TABLE scoring_rules_v2 DROP CONSTRAINT check_place_range_scoring`);
          logger.info('Dropped old check_place_range_scoring constraint');
        } catch (error: any) {
          // Constraint might not exist or might have a different name
          if (error.code === 'ER_CONSTRAINT_NOT_FOUND' || error.code === 'ER_CHECK_CONSTRAINT_NOT_FOUND' || error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            logger.info('Old constraint not found, may have already been updated or never existed');
          } else {
            logger.warn('Error dropping old constraint (may not exist)', { error: error.message });
            // Continue anyway - try to add the new constraint
          }
        }
      }

      // Add new constraint that allows place = 0
      try {
        await db.query(`
          ALTER TABLE scoring_rules_v2
          ADD CONSTRAINT check_place_range_scoring CHECK (place >= 0 AND place <= 10)
        `);
        logger.info('Added updated check_place_range_scoring constraint (allows place = 0)');
      } catch (error: any) {
        // If constraint already exists, that's fine (idempotency)
        if (error.code === 'ER_DUP_CONSTRAINT_NAME' || error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate constraint')) {
          logger.info('Constraint already exists, skipping');
        } else {
          throw error;
        }
      }
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

