import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

export class AddSendAdminSummaryMigration implements Migration {
  id = '20251014000000_add_send_admin_summary';
  description = 'Add send_admin_summary field to settings table';

  async up(): Promise<void> {
    try {
      // Check if settings table exists
      const [tables] = await db.query(
        `SHOW TABLES LIKE 'settings'`
      );

      if (Array.isArray(tables) && tables.length === 0) {
        // Create settings table with send_admin_summary field
        await db.query(`
          CREATE TABLE IF NOT EXISTS settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            send_admin_summary BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        logger.info('Created settings table');
        
        // Insert default row
        await db.query(`
          INSERT INTO settings (send_admin_summary) VALUES (TRUE)
        `);
        logger.info('Inserted default settings row');
      } else {
        // Table exists, check if column exists
        const [columns] = await db.query(
          `SHOW COLUMNS FROM settings LIKE 'send_admin_summary'`
        );

        if (Array.isArray(columns) && columns.length === 0) {
          // Add send_admin_summary column with default TRUE
          await db.query(`
            ALTER TABLE settings 
            ADD COLUMN send_admin_summary BOOLEAN NOT NULL DEFAULT TRUE
          `);
          logger.info('Added send_admin_summary column to existing settings table');
        } else {
          logger.info('send_admin_summary column already exists in settings table');
        }
      }
    } catch (error) {
      logger.error('Error in AddSendAdminSummaryMigration.up', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // Check if settings table exists
      const [tables] = await db.query(
        `SHOW TABLES LIKE 'settings'`
      );

      if (Array.isArray(tables) && tables.length > 0) {
        // Drop the entire settings table since it was created by this migration
        await db.query(`DROP TABLE IF EXISTS settings`);
        logger.info('Removed settings table');
      } else {
        logger.info('settings table does not exist, nothing to rollback');
      }
    } catch (error) {
      logger.error('Error in AddSendAdminSummaryMigration.down', { error });
      throw error;
    }
  }
}


