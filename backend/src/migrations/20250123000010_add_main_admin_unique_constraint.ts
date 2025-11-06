import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

/**
 * Migration: Add unique constraint to ensure only one main admin can exist
 * 
 * Uses a generated VIRTUAL column that is 1 when is_main_admin = TRUE, NULL otherwise.
 * UNIQUE constraint on this column ensures only one row can have the value 1.
 * This prevents any code path (including init.sql) from creating a second main admin.
 */
export default class AddMainAdminUniqueConstraint implements Migration {
  id = '20250123000010_add_main_admin_unique_constraint';
  description = 'Add unique constraint to ensure only one main admin can exist using generated column';

  async up(): Promise<void> {
    // Check if the column already exists
    const [columns] = await db.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'admins' 
       AND COLUMN_NAME = 'main_admin_token'`
    );

    if (columns.length > 0) {
      logger.info('main_admin_token column already exists, skipping migration');
      return;
    }

    // Add the generated VIRTUAL column
    await db.query(`
      ALTER TABLE admins 
      ADD COLUMN main_admin_token TINYINT(1) GENERATED ALWAYS AS (
        CASE WHEN is_main_admin = TRUE THEN 1 ELSE NULL END
      ) VIRTUAL
    `);
    logger.info('Successfully added main_admin_token generated column');

    // Check if the unique index already exists
    const [indexes] = await db.query<RowDataPacket[]>(
      `SELECT INDEX_NAME 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'admins' 
       AND INDEX_NAME = 'unique_main_admin'`
    );

    if (indexes.length > 0) {
      logger.info('unique_main_admin index already exists, skipping');
      return;
    }

    // Add UNIQUE constraint on the generated column
    await db.query(`
      ALTER TABLE admins 
      ADD UNIQUE INDEX unique_main_admin (main_admin_token)
    `);
    logger.info('Successfully added unique constraint on main_admin_token');

    // Verify only one main admin exists (safety check)
    const [mainAdmins] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM admins WHERE is_main_admin = TRUE'
    );

    const mainAdminCount = mainAdmins[0]?.count || 0;
    if (mainAdminCount > 1) {
      logger.warn(`⚠️ Found ${mainAdminCount} main admins. The constraint will prevent new ones, but existing duplicates should be resolved manually.`);
    } else {
      logger.info(`✅ Verified: ${mainAdminCount} main admin(s) exist (as expected)`);
    }
  }

  async down(): Promise<void> {
    // Remove the unique index first
    try {
      await db.query(`ALTER TABLE admins DROP INDEX unique_main_admin`);
      logger.info('Removed unique_main_admin index');
    } catch (error: any) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw error;
      }
      logger.info('unique_main_admin index does not exist, skipping removal');
    }

    // Remove the generated column
    try {
      await db.query(`ALTER TABLE admins DROP COLUMN main_admin_token`);
      logger.info('Removed main_admin_token column');
    } catch (error: any) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw error;
      }
      logger.info('main_admin_token column does not exist, skipping removal');
    }
  }
}

