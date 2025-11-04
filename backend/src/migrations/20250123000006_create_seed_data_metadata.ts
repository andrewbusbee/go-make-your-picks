import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Create seed_data_metadata table
 *
 * This table tracks seed data created by the seed function for development/testing.
 * It stores the season_id and user_ids so we can reliably detect and delete sample data
 * even if names are changed.
 */
export class CreateSeedDataMetadata implements Migration {
  id = '20250123000006_create_seed_data_metadata';
  description = 'Create seed_data_metadata table to track sample data for dev tools';

  async up(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS seed_data_metadata (
          id INT PRIMARY KEY AUTO_INCREMENT,
          season_id INT NOT NULL,
          user_ids JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons_v2(id) ON DELETE CASCADE,
          INDEX idx_season_id (season_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('Created seed_data_metadata table');
    } catch (error) {
      logger.error('Error creating seed_data_metadata table', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      await db.query(`DROP TABLE IF EXISTS seed_data_metadata`);
      logger.info('Dropped seed_data_metadata table');
    } catch (error) {
      logger.error('Error dropping seed_data_metadata table', { error });
      throw error;
    }
  }
}

