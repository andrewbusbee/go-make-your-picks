import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

export class RemoveSeasonCommissionerMigration implements Migration {
  id: string = '20250116000000_remove_season_commissioner';
  description: string = 'Remove commissioner field from seasons table since emails now use current commissioner from admins table';

  async up(): Promise<void> {
    logger.info('Checking if seasons table has commissioner column...');
    
    try {
      // Check if the commissioner column exists
      const [columns] = await db.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'seasons' 
         AND COLUMN_NAME = 'commissioner'`
      );
      
      if (columns.length > 0) {
        logger.info('Removing commissioner column from seasons table...');
        await db.query('ALTER TABLE seasons DROP COLUMN commissioner');
        logger.info('Successfully removed commissioner column from seasons table');
      } else {
        logger.debug('Commissioner column does not exist in seasons table, skipping migration');
      }
    } catch (error) {
      logger.error('Error removing commissioner column from seasons table', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    logger.info('Adding commissioner column back to seasons table...');
    try {
      await db.query('ALTER TABLE seasons ADD COLUMN commissioner VARCHAR(255) DEFAULT NULL');
      logger.info('Successfully added commissioner column back to seasons table');
    } catch (error) {
      logger.error('Error adding commissioner column back to seasons table', { error });
      throw error;
    }
  }
}
