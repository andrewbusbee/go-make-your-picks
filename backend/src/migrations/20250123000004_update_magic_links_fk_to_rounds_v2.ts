import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Update magic_links, email_magic_links, and reminder_log foreign keys to reference rounds_v2
 * 
 * This migration updates the foreign key constraints in magic_links, email_magic_links, and reminder_log
 * tables to reference rounds_v2 instead of rounds. This is necessary because:
 * - New rounds are now created in rounds_v2
 * - The application code has been cut over to use rounds_v2
 * - These tables need to reference the active rounds table (rounds_v2)
 * 
 * Changes:
 * - magic_links.round_id: DROP FK to rounds(id), ADD FK to rounds_v2(id)
 * - email_magic_links.round_id: DROP FK to rounds(id), ADD FK to rounds_v2(id)
 * - reminder_log.round_id: DROP FK to rounds(id), ADD FK to rounds_v2(id)
 * 
 * Note: This migration assumes rounds_v2 exists and has data. If there are existing
 * rows pointing to rounds that don't exist in rounds_v2, those will need to be
 * cleaned up separately (they would be orphaned anyway).
 */
export class UpdateMagicLinksFkToRoundsV2 implements Migration {
  id = '20250123000004_update_magic_links_fk_to_rounds_v2';
  description = 'Update magic_links, email_magic_links, and reminder_log foreign keys to reference rounds_v2';

  async up(): Promise<void> {
    // Update magic_links table
    try {
      // Check if magic_links table exists
      const [magicLinksExists] = await db.query(
        "SHOW TABLES LIKE 'magic_links'"
      ) as any;

      if (magicLinksExists.length > 0) {
        // Get the foreign key constraint name
        const [fkInfo] = await db.query(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'magic_links' 
           AND COLUMN_NAME = 'round_id' 
           AND REFERENCED_TABLE_NAME IS NOT NULL`
        ) as any;

        if (fkInfo.length > 0) {
          const fkName = fkInfo[0].CONSTRAINT_NAME;
          
          // Drop the old foreign key
          await db.query(`ALTER TABLE magic_links DROP FOREIGN KEY ${fkName}`);
          logger.info(`Dropped foreign key ${fkName} from magic_links`);
        }

        // Add new foreign key to rounds_v2
        await db.query(`
          ALTER TABLE magic_links
          ADD CONSTRAINT magic_links_round_id_fk_v2
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE
        `);
        logger.info('Added foreign key from magic_links.round_id to rounds_v2.id');
      } else {
        logger.info('magic_links table does not exist, skipping');
      }
    } catch (error: any) {
      // If FK already points to rounds_v2, that's fine
      if (error.code === 'ER_DUP_KEYNAME' || error.message?.includes('already exists')) {
        logger.info('Foreign key already updated for magic_links, skipping');
      } else {
        logger.error('Error updating magic_links foreign key', { error });
        throw error;
      }
    }

    // Update email_magic_links table
    try {
      // Check if email_magic_links table exists
      const [emailMagicLinksExists] = await db.query(
        "SHOW TABLES LIKE 'email_magic_links'"
      ) as any;

      if (emailMagicLinksExists.length > 0) {
        // Get the foreign key constraint name
        const [fkInfo] = await db.query(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'email_magic_links' 
           AND COLUMN_NAME = 'round_id' 
           AND REFERENCED_TABLE_NAME IS NOT NULL`
        ) as any;

        if (fkInfo.length > 0) {
          const fkName = fkInfo[0].CONSTRAINT_NAME;
          
          // Drop the old foreign key
          await db.query(`ALTER TABLE email_magic_links DROP FOREIGN KEY ${fkName}`);
          logger.info(`Dropped foreign key ${fkName} from email_magic_links`);
        }

        // Add new foreign key to rounds_v2
        await db.query(`
          ALTER TABLE email_magic_links
          ADD CONSTRAINT email_magic_links_round_id_fk_v2
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE
        `);
        logger.info('Added foreign key from email_magic_links.round_id to rounds_v2.id');
      } else {
        logger.info('email_magic_links table does not exist, skipping');
      }
    } catch (error: any) {
      // If FK already points to rounds_v2, that's fine
      if (error.code === 'ER_DUP_KEYNAME' || error.message?.includes('already exists')) {
        logger.info('Foreign key already updated for email_magic_links, skipping');
      } else {
        logger.error('Error updating email_magic_links foreign key', { error });
        throw error;
      }
    }

    // Update reminder_log table
    try {
      // Check if reminder_log table exists
      const [reminderLogExists] = await db.query(
        "SHOW TABLES LIKE 'reminder_log'"
      ) as any;

      if (reminderLogExists.length > 0) {
        // Get the foreign key constraint name
        const [fkInfo] = await db.query(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'reminder_log' 
           AND COLUMN_NAME = 'round_id' 
           AND REFERENCED_TABLE_NAME IS NOT NULL`
        ) as any;

        if (fkInfo.length > 0) {
          const fkName = fkInfo[0].CONSTRAINT_NAME;
          
          // Drop the old foreign key
          await db.query(`ALTER TABLE reminder_log DROP FOREIGN KEY ${fkName}`);
          logger.info(`Dropped foreign key ${fkName} from reminder_log`);
        }

        // Add new foreign key to rounds_v2
        await db.query(`
          ALTER TABLE reminder_log
          ADD CONSTRAINT reminder_log_round_id_fk_v2
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE
        `);
        logger.info('Added foreign key from reminder_log.round_id to rounds_v2.id');
      } else {
        logger.info('reminder_log table does not exist, skipping');
      }
    } catch (error: any) {
      // If FK already points to rounds_v2, that's fine
      if (error.code === 'ER_DUP_KEYNAME' || error.message?.includes('already exists')) {
        logger.info('Foreign key already updated for reminder_log, skipping');
      } else {
        logger.error('Error updating reminder_log foreign key', { error });
        throw error;
      }
    }

    logger.info('Completed updating magic_links, email_magic_links, and reminder_log foreign keys to rounds_v2');
  }

  async down(): Promise<void> {
    // Reverse: change FKs back to rounds
    try {
      // Check if magic_links table exists
      const [magicLinksExists] = await db.query(
        "SHOW TABLES LIKE 'magic_links'"
      ) as any;

      if (magicLinksExists.length > 0) {
        // Drop the v2 foreign key
        await db.query(`ALTER TABLE magic_links DROP FOREIGN KEY magic_links_round_id_fk_v2`);
        
        // Add back foreign key to rounds
        await db.query(`
          ALTER TABLE magic_links
          ADD CONSTRAINT magic_links_round_id_fk
          FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
        `);
        logger.info('Reverted magic_links foreign key back to rounds');
      }
    } catch (error: any) {
      logger.error('Error reverting magic_links foreign key', { error });
      // Don't throw - allow migration to continue
    }

    try {
      // Check if email_magic_links table exists
      const [emailMagicLinksExists] = await db.query(
        "SHOW TABLES LIKE 'email_magic_links'"
      ) as any;

      if (emailMagicLinksExists.length > 0) {
        // Drop the v2 foreign key
        await db.query(`ALTER TABLE email_magic_links DROP FOREIGN KEY email_magic_links_round_id_fk_v2`);
        
        // Add back foreign key to rounds
        await db.query(`
          ALTER TABLE email_magic_links
          ADD CONSTRAINT email_magic_links_round_id_fk
          FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
        `);
        logger.info('Reverted email_magic_links foreign key back to rounds');
      }
    } catch (error: any) {
      logger.error('Error reverting email_magic_links foreign key', { error });
      // Don't throw - allow migration to continue
    }

    try {
      // Check if reminder_log table exists
      const [reminderLogExists] = await db.query(
        "SHOW TABLES LIKE 'reminder_log'"
      ) as any;

      if (reminderLogExists.length > 0) {
        // Drop the v2 foreign key
        await db.query(`ALTER TABLE reminder_log DROP FOREIGN KEY reminder_log_round_id_fk_v2`);
        
        // Add back foreign key to rounds
        await db.query(`
          ALTER TABLE reminder_log
          ADD CONSTRAINT reminder_log_round_id_fk
          FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
        `);
        logger.info('Reverted reminder_log foreign key back to rounds');
      }
    } catch (error: any) {
      logger.error('Error reverting reminder_log foreign key', { error });
      // Don't throw - allow migration to continue
    }

    logger.info('Completed reverting magic_links, email_magic_links, and reminder_log foreign keys to rounds');
  }
}

