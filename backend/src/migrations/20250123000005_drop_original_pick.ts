import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Drop legacy picks_v2.original_pick column
 *
 * -- Drop legacy picks_v2.original_pick (deprecated string field from pre-v2 schema).
 * The v2 schema stores pick items in pick_items_v2 via team_id; this string field is no longer used.
 */
export class DropOriginalPickFromPicksV2 implements Migration {
  id = '20250123000005_drop_original_pick';
  description = 'Drop legacy original_pick column from picks_v2 (no longer used)';

  async up(): Promise<void> {
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

  async down(): Promise<void> {
    try {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'picks_v2' AND COLUMN_NAME = 'original_pick'`
      ) as any;

      if (rows.length === 0) {
        await db.query(`ALTER TABLE picks_v2 ADD COLUMN original_pick VARCHAR(255) NULL`);
        logger.info('Re-added column picks_v2.original_pick');
      } else {
        logger.info('Column picks_v2.original_pick already exists, skipping');
      }
    } catch (error) {
      logger.error('Error restoring picks_v2.original_pick', { error });
      throw error;
    }
  }
}


