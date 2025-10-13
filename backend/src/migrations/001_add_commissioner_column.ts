import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { Migration } from './Migration';

/**
 * Migration: Add is_commissioner column to admins table
 * 
 * This migration adds the ability to designate one admin as "the commissioner"
 * for use in email signatures and other purposes.
 */
class AddCommissionerColumnMigration implements Migration {
  id = '20251013000000_add_commissioner_column';
  description = 'Add is_commissioner column to admins table';

  async up(): Promise<void> {
    try {
      // Check if column already exists
      const [columns] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'admins' 
         AND COLUMN_NAME = 'is_commissioner'`
      );

      if (columns.length > 0) {
        logger.info('Column is_commissioner already exists, skipping');
        return;
      }

      // Add the column
      await db.query(`
        ALTER TABLE admins 
        ADD COLUMN is_commissioner BOOLEAN DEFAULT FALSE 
        AFTER is_main_admin
      `);

      logger.info('Successfully added is_commissioner column to admins table');
    } catch (error) {
      logger.error('Failed to add is_commissioner column', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // Check if column exists before trying to drop it
      const [columns] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'admins' 
         AND COLUMN_NAME = 'is_commissioner'`
      );

      if (columns.length === 0) {
        logger.info('Column is_commissioner does not exist, nothing to rollback');
        return;
      }

      // Drop the column
      await db.query('ALTER TABLE admins DROP COLUMN is_commissioner');
      logger.info('Successfully removed is_commissioner column from admins table');
    } catch (error) {
      logger.error('Failed to remove is_commissioner column', { error });
      throw error;
    }
  }
}

export default new AddCommissionerColumnMigration();

