import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { Migration } from './Migration';

/**
 * Migration: Force remove any remaining UNIQUE constraints from users.email
 * 
 * This migration ensures that multiple users can share the same email address
 * by removing any remaining unique constraints or indexes that might prevent this.
 */
class ForceRemoveEmailUniqueConstraintMigration implements Migration {
  id = '20251014000000_force_remove_email_unique_constraint';
  description = 'Force remove any remaining UNIQUE constraints from users.email';

  async up(): Promise<void> {
    try {
      // Check for any unique constraints on the email column
      const [constraints] = await db.query<RowDataPacket[]>(
        `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'users' 
         AND CONSTRAINT_TYPE = 'UNIQUE'`
      );

      logger.info('Found constraints on users table:', { constraints });

      // Check for unique indexes on email column
      const [indexes] = await db.query<RowDataPacket[]>(
        `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'email'`
      );

      logger.info('Found indexes on users.email column:', { indexes });

      // Remove any unique constraints on email
      for (const constraint of constraints) {
        if (constraint.CONSTRAINT_NAME === 'email' || constraint.CONSTRAINT_NAME.includes('email')) {
          try {
            await db.query(`ALTER TABLE users DROP INDEX ${constraint.CONSTRAINT_NAME}`);
            logger.info(`Dropped unique constraint: ${constraint.CONSTRAINT_NAME}`);
          } catch (error: any) {
            if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
              logger.warn(`Failed to drop constraint ${constraint.CONSTRAINT_NAME}:`, { error: error.message });
            }
          }
        }
      }

      // Remove any unique indexes on email
      for (const index of indexes) {
        if (index.NON_UNIQUE === 0) { // NON_UNIQUE = 0 means it's a unique index
          try {
            await db.query(`ALTER TABLE users DROP INDEX ${index.INDEX_NAME}`);
            logger.info(`Dropped unique index: ${index.INDEX_NAME}`);
          } catch (error: any) {
            if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
              logger.warn(`Failed to drop index ${index.INDEX_NAME}:`, { error: error.message });
            }
          }
        }
      }

      // Ensure we have a non-unique index for performance
      try {
        await db.query('CREATE INDEX idx_email ON users(email)');
        logger.info('Created non-unique index on users.email');
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          logger.info('Index idx_email already exists');
        } else {
          logger.warn('Failed to create index idx_email:', { error: error.message });
        }
      }

      logger.info('Successfully ensured users.email has no unique constraints');
    } catch (error: any) {
      logger.error('Failed to force remove unique constraints from users.email', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // This migration cannot be safely rolled back if there are duplicate emails
      const [duplicates] = await db.query<RowDataPacket[]>(
        `SELECT email, COUNT(*) as count 
         FROM users 
         GROUP BY email 
         HAVING count > 1`
      );

      if (duplicates.length > 0) {
        logger.error('Cannot rollback: duplicate emails exist in database', { 
          duplicateCount: duplicates.length,
          duplicates: duplicates.map(d => ({ email: d.email, count: d.count }))
        });
        throw new Error('Cannot rollback: duplicate emails exist');
      }

      // Drop the non-unique index
      try {
        await db.query('DROP INDEX idx_email ON users');
        logger.info('Dropped non-unique index idx_email');
      } catch (error: any) {
        logger.warn('Failed to drop index idx_email:', { error: error.message });
      }

      // Add back unique constraint (this will fail if duplicates exist)
      try {
        await db.query('ALTER TABLE users ADD UNIQUE KEY email (email)');
        logger.info('Restored unique constraint on users.email');
      } catch (error: any) {
        logger.error('Failed to restore unique constraint:', { error: error.message });
        throw error;
      }
    } catch (error) {
      logger.error('Failed to rollback email unique constraint removal', { error });
      throw error;
    }
  }
}

export default new ForceRemoveEmailUniqueConstraintMigration();
