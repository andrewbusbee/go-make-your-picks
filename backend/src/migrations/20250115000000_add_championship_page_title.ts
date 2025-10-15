import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Add championship_page_title field to text_settings
 * This migration adds the championship_page_title setting for existing databases
 */
export class AddChampionshipPageTitleMigration implements Migration {
  id = '20250115000000_add_championship_page_title';
  description = 'Add championship_page_title field to text_settings table';

  async up(): Promise<void> {
    // Check if the championship_page_title setting already exists
    const [existingSettings] = await db.query(
      'SELECT setting_key FROM text_settings WHERE setting_key = ?',
      ['championship_page_title']
    ) as any;

    if (existingSettings.length > 0) {
      logger.info('championship_page_title setting already exists, skipping migration');
      return;
    }

    // Insert the new setting with default value
    await db.query(
      `INSERT INTO text_settings (setting_key, setting_value) VALUES ('championship_page_title', 'Hall of Fame')`
    );

    logger.info('Successfully added championship_page_title setting with default value "Hall of Fame"');
  }

  async down(): Promise<void> {
    // Remove the championship_page_title setting
    await db.query(
      'DELETE FROM text_settings WHERE setting_key = ?',
      ['championship_page_title']
    );

    logger.info('Removed championship_page_title setting');
  }
}
