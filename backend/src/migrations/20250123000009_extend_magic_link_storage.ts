import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Add plain_token column to magic_links and email_magic_links tables
 *
 * This allows us to store the plain token alongside the hashed token so that
 * reminder emails can reuse the same magic link that was sent in the activation email.
 * The plain token is needed for the email URL, while the hash is used for validation.
 */
export class ExtendMagicLinkStorage implements Migration {
  id = '20250123000009_extend_magic_link_storage';
  description = 'Extend magic_links and email_magic_links storage for persistent links';

  async up(): Promise<void> {
    try {
      // Add plain_token to magic_links table
      const [magicLinksColumns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magic_links' AND COLUMN_NAME = 'plain_token'`
      ) as any;

      if (magicLinksColumns.length === 0) {
        await db.query(`ALTER TABLE magic_links ADD COLUMN plain_token VARCHAR(255) NULL`);
        logger.info('Added plain_token column to magic_links table');
      } else {
        logger.info('Column plain_token already exists in magic_links table, skipping');
      }

      // Add plain_token to email_magic_links table
      const [emailMagicLinksColumns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_magic_links' AND COLUMN_NAME = 'plain_token'`
      ) as any;

      if (emailMagicLinksColumns.length === 0) {
        await db.query(`ALTER TABLE email_magic_links ADD COLUMN plain_token VARCHAR(255) NULL`);
        logger.info('Added plain_token column to email_magic_links table');
      } else {
        logger.info('Column plain_token already exists in email_magic_links table, skipping');
      }
    } catch (error) {
      logger.error('Error adding plain_token columns', { error });
      throw error;
    }
  }

  async down(): Promise<void> {
    try {
      // Remove plain_token from magic_links table
      const [magicLinksColumns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magic_links' AND COLUMN_NAME = 'plain_token'`
      ) as any;

      if (magicLinksColumns.length > 0) {
        await db.query(`ALTER TABLE magic_links DROP COLUMN plain_token`);
        logger.info('Removed plain_token column from magic_links table');
      } else {
        logger.info('Column plain_token does not exist in magic_links table, skipping');
      }

      // Remove plain_token from email_magic_links table
      const [emailMagicLinksColumns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_magic_links' AND COLUMN_NAME = 'plain_token'`
      ) as any;

      if (emailMagicLinksColumns.length > 0) {
        await db.query(`ALTER TABLE email_magic_links DROP COLUMN plain_token`);
        logger.info('Removed plain_token column from email_magic_links table');
      } else {
        logger.info('Column plain_token does not exist in email_magic_links table, skipping');
      }
    } catch (error) {
      logger.error('Error removing plain_token columns', { error });
      throw error;
    }
  }
}

