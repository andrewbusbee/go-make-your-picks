import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

export class AddHistoricalChampions implements Migration {
  id = '20250117000000_add_historical_champions';
  description = 'Add historical_champions table for manually added champions';

  async up(): Promise<void> {
    // Check if the table already exists
    const [existingTables] = await db.query(
      "SHOW TABLES LIKE 'historical_champions'"
    ) as any;

    if (existingTables.length > 0) {
      logger.info('historical_champions table already exists, skipping migration');
      return;
    }

    await db.query(`
      CREATE TABLE historical_champions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        end_year INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_end_year (end_year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('Successfully created historical_champions table');
  }

  async down(): Promise<void> {
    await db.query(`DROP TABLE IF EXISTS historical_champions`);
    logger.info('Dropped historical_champions table');
  }
}
