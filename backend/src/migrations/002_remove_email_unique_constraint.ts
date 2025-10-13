import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { Migration } from './Migration';

/**
 * Migration: Remove UNIQUE constraint from users.email
 * 
 * This migration allows multiple players to share the same email address,
 * which is useful for families or couples who want to use a single email.
 * Each player still gets their own magic link and individual tracking.
 */
class RemoveEmailUniqueConstraintMigration implements Migration {
  id = '20251013010000_remove_email_unique_constraint';
  description = 'Remove UNIQUE constraint from users.email to allow shared emails';

  async up(): Promise<void> {
    try {
      // Check if the UNIQUE constraint exists
      const [constraints] = await db.query<RowDataPacket[]>(
        `SELECT CONSTRAINT_NAME 
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'users' 
         AND CONSTRAINT_TYPE = 'UNIQUE'
         AND CONSTRAINT_NAME = 'email'`
      );

      if (constraints.length === 0) {
        logger.info('UNIQUE constraint on users.email does not exist, skipping');
        return;
      }

      // Drop the UNIQUE constraint
      await db.query('ALTER TABLE users DROP INDEX email');

      // Add a regular index for performance (non-unique)
      await db.query('CREATE INDEX idx_email ON users(email)');

      logger.info('Successfully removed UNIQUE constraint from users.email and added regular index');
    } catch (error: any) {
      // If the index already exists, that's okay
      if (error.code === 'ER_DUP_KEYNAME') {
        logger.info('Index idx_email already exists, skipping index creation');
        return;
      }
      logger.error('Failed to remove UNIQUE constraint from users.email', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // Check if there are duplicate emails before adding UNIQUE constraint back
      const [duplicates] = await db.query<RowDataPacket[]>(
        `SELECT email, COUNT(*) as count 
         FROM users 
         GROUP BY email 
         HAVING count > 1`
      );

      if (duplicates.length > 0) {
        logger.error('Cannot rollback: duplicate emails exist in database', { 
          duplicateCount: duplicates.length 
        });
        throw new Error('Cannot add UNIQUE constraint: duplicate emails exist');
      }

      // Drop the regular index
      await db.query('DROP INDEX idx_email ON users');

      // Add back the UNIQUE constraint
      await db.query('ALTER TABLE users ADD UNIQUE KEY email (email)');

      logger.info('Successfully restored UNIQUE constraint on users.email');
    } catch (error) {
      logger.error('Failed to restore UNIQUE constraint on users.email', { error });
      throw error;
    }
  }
}

export default new RemoveEmailUniqueConstraintMigration();

