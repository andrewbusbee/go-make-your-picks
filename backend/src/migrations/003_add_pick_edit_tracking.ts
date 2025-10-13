import { Migration } from './Migration';
import { RowDataPacket } from 'mysql2';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Add pick edit tracking columns
 * 
 * Adds columns to track when admins edit user picks:
 * - admin_edited: Boolean flag indicating if pick was edited by admin
 * - original_pick: The original pick value before admin edit
 * - edited_by_admin_id: Foreign key to admins table
 * - edited_at: Timestamp of when the edit occurred
 */
class AddPickEditTrackingMigration implements Migration {
  id = '20251013000003_add_pick_edit_tracking';
  description = 'Add pick edit tracking columns to picks table';
  
  async up(): Promise<void> {
    try {
      logger.info('Running migration: add_pick_edit_tracking (UP)');
      
      // Check if columns already exist
      const [columns] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'picks' 
         AND COLUMN_NAME IN ('admin_edited', 'original_pick', 'edited_by_admin_id', 'edited_at')`
      );
      
      const existingColumns = new Set(columns.map((col: any) => col.COLUMN_NAME));
      
      // Add admin_edited column if it doesn't exist
      if (!existingColumns.has('admin_edited')) {
        logger.info('Adding admin_edited column to picks table');
        await db.query(
          `ALTER TABLE picks 
           ADD COLUMN admin_edited BOOLEAN DEFAULT FALSE NOT NULL`
        );
      } else {
        logger.info('Column admin_edited already exists, skipping');
      }
      
      // Add original_pick column if it doesn't exist
      if (!existingColumns.has('original_pick')) {
        logger.info('Adding original_pick column to picks table');
        await db.query(
          `ALTER TABLE picks 
           ADD COLUMN original_pick VARCHAR(255) NULL`
        );
      } else {
        logger.info('Column original_pick already exists, skipping');
      }
      
      // Add edited_by_admin_id column if it doesn't exist
      if (!existingColumns.has('edited_by_admin_id')) {
        logger.info('Adding edited_by_admin_id column to picks table');
        await db.query(
          `ALTER TABLE picks 
           ADD COLUMN edited_by_admin_id INT NULL,
           ADD CONSTRAINT fk_picks_edited_by_admin 
           FOREIGN KEY (edited_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL`
        );
      } else {
        logger.info('Column edited_by_admin_id already exists, skipping');
      }
      
      // Add edited_at column if it doesn't exist
      if (!existingColumns.has('edited_at')) {
        logger.info('Adding edited_at column to picks table');
        await db.query(
          `ALTER TABLE picks 
           ADD COLUMN edited_at TIMESTAMP NULL`
        );
      } else {
        logger.info('Column edited_at already exists, skipping');
      }
      
      logger.info('Migration add_pick_edit_tracking completed successfully');
    } catch (error) {
      logger.error('Failed to run migration add_pick_edit_tracking', { error });
      throw error;
    }
  }
  
  async down(): Promise<void> {
    try {
      logger.info('Running migration: add_pick_edit_tracking (DOWN)');
      
      // Check which columns exist before trying to drop them
      const [columns] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'picks' 
         AND COLUMN_NAME IN ('admin_edited', 'original_pick', 'edited_by_admin_id', 'edited_at')`
      );
      
      const existingColumns = new Set(columns.map((col: any) => col.COLUMN_NAME));
      
      // Drop foreign key constraint if edited_by_admin_id exists
      if (existingColumns.has('edited_by_admin_id')) {
        logger.info('Dropping foreign key constraint fk_picks_edited_by_admin');
        await db.query(
          `ALTER TABLE picks DROP FOREIGN KEY fk_picks_edited_by_admin`
        );
      }
      
      // Drop columns in reverse order
      if (existingColumns.has('edited_at')) {
        logger.info('Dropping edited_at column');
        await db.query(`ALTER TABLE picks DROP COLUMN edited_at`);
      }
      
      if (existingColumns.has('edited_by_admin_id')) {
        logger.info('Dropping edited_by_admin_id column');
        await db.query(`ALTER TABLE picks DROP COLUMN edited_by_admin_id`);
      }
      
      if (existingColumns.has('original_pick')) {
        logger.info('Dropping original_pick column');
        await db.query(`ALTER TABLE picks DROP COLUMN original_pick`);
      }
      
      if (existingColumns.has('admin_edited')) {
        logger.info('Dropping admin_edited column');
        await db.query(`ALTER TABLE picks DROP COLUMN admin_edited`);
      }
      
      logger.info('Migration add_pick_edit_tracking rollback completed');
    } catch (error) {
      logger.error('Failed to rollback migration add_pick_edit_tracking', { error });
      throw error;
    }
  }
}

export default new AddPickEditTrackingMigration();

