import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Restore original_pick column in picks_v2
 *
 * This column was previously dropped but is needed to track the original pick value
 * when an admin edits a user's pick. This allows the UI to show what the pick was
 * before the admin changed it.
 */
export class RestoreOriginalPickInPicksV2 implements Migration {
  id = '20250123000008_restore_original_pick';
  description = 'Restore original_pick column in picks_v2 for admin edit tracking';

  async up(): Promise<void> {
    try {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'picks_v2' AND COLUMN_NAME = 'original_pick'`
      ) as any;

      if (rows.length === 0) {
        await db.query(`ALTER TABLE picks_v2 ADD COLUMN original_pick VARCHAR(255) NULL`);
        logger.info('Restored column picks_v2.original_pick');
      } else {
        logger.info('Column picks_v2.original_pick already exists, skipping');
      }
    } catch (error) {
      logger.error('Error restoring picks_v2.original_pick', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'picks_v2' AND COLUMN_NAME = 'original_pick'`
      ) as any;

      if (rows.length > 0) {
        await db.query(`ALTER TABLE picks_v2 DROP COLUMN original_pick`);
        logger.info('Dropped column picks_v2.original_pick');
      } else {
        logger.info('Column picks_v2.original_pick does not exist, skipping');
      }
    } catch (error) {
      logger.error('Error dropping picks_v2.original_pick', { error });
      throw error;
    }
  }
}

