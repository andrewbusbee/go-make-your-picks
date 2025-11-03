import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Rename legacy game tables to _legacy suffix
 * 
 * This migration renames the legacy game tables that are no longer used by the application
 * to have a `_legacy` suffix. These tables are being retained as historical snapshots
 * and safety nets, but are no longer part of the active application schema.
 * 
 * Tables being renamed:
 * - picks → picks_legacy
 * - pick_items → pick_items_legacy
 * - scores → scores_legacy
 * - round_teams → round_teams_legacy
 * - season_participants → season_participants_legacy
 * - season_winners → season_winners_legacy
 * 
 * Note: `seasons` and `rounds` are NOT being renamed in this migration because:
 * - They are still referenced by foreign keys from non-game tables (magic_links, 
 *   email_magic_links, reminder_log, etc.)
 * - These dependent tables will need to be migrated to reference seasons_v2/rounds_v2
 *   in a future migration before seasons/rounds can be renamed
 * 
 * Foreign Key Preservation:
 * - RENAME TABLE automatically preserves foreign key constraints between the renamed tables
 * - Foreign keys from renamed tables to seasons/rounds/users/admins remain valid
 * - Foreign keys from pick_items to picks are automatically updated
 * 
 * This migration is idempotent-safe: if a table has already been renamed, the RENAME TABLE
 * command will fail with a clear error, allowing the migration runner to handle it appropriately.
 */
export class RenameLegacyGameTables implements Migration {
  id = '20250123000003_rename_legacy_game_tables';
  description = 'Rename legacy game tables to _legacy suffix (historical snapshot)';

  async up(): Promise<void> {
    const tablesToRename = [
      { old: 'picks', new: 'picks_legacy' },
      { old: 'pick_items', new: 'pick_items_legacy' },
      { old: 'scores', new: 'scores_legacy' },
      { old: 'round_teams', new: 'round_teams_legacy' },
      { old: 'season_participants', new: 'season_participants_legacy' },
      { old: 'season_winners', new: 'season_winners_legacy' }
    ];

    for (const { old, new: newName } of tablesToRename) {
      try {
        // Check if the old table exists
        const [existing] = await db.query(
          `SHOW TABLES LIKE '${old}'`
        ) as any;

        if (existing.length === 0) {
          logger.info(`Table ${old} does not exist, skipping rename`);
          continue;
        }

        // Check if the new table already exists (migration already run)
        const [alreadyRenamed] = await db.query(
          `SHOW TABLES LIKE '${newName}'`
        ) as any;

        if (alreadyRenamed.length > 0) {
          logger.info(`Table ${old} has already been renamed to ${newName}, skipping`);
          continue;
        }

        // Rename the table
        // RENAME TABLE automatically preserves foreign key constraints
        await db.query(`RENAME TABLE ${old} TO ${newName}`);
        logger.info(`Successfully renamed table ${old} to ${newName}`);
      } catch (error: any) {
        // If table doesn't exist or already renamed, log and continue
        if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
          logger.info(`Table ${old} does not exist, skipping rename`);
          continue;
        }
        // If table already exists with new name, log and continue
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          logger.info(`Table ${newName} already exists, ${old} may have already been renamed`);
          continue;
        }
        // For other errors, re-throw
        logger.error(`Error renaming table ${old} to ${newName}`, { error });
        throw error;
      }
    }

    logger.info('Completed renaming legacy game tables');
  }

  async down(): Promise<void> {
    // Reverse the renaming operation
    const tablesToRename = [
      { old: 'picks_legacy', new: 'picks' },
      { old: 'pick_items_legacy', new: 'pick_items' },
      { old: 'scores_legacy', new: 'scores' },
      { old: 'round_teams_legacy', new: 'round_teams' },
      { old: 'season_participants_legacy', new: 'season_participants' },
      { old: 'season_winners_legacy', new: 'season_winners' }
    ];

    for (const { old, new: newName } of tablesToRename) {
      try {
        // Check if the legacy table exists
        const [existing] = await db.query(
          `SHOW TABLES LIKE '${old}'`
        ) as any;

        if (existing.length === 0) {
          logger.info(`Table ${old} does not exist, skipping reverse rename`);
          continue;
        }

        // Check if the original table already exists
        const [alreadyExists] = await db.query(
          `SHOW TABLES LIKE '${newName}'`
        ) as any;

        if (alreadyExists.length > 0) {
          logger.info(`Table ${newName} already exists, skipping reverse rename`);
          continue;
        }

        // Rename back
        await db.query(`RENAME TABLE ${old} TO ${newName}`);
        logger.info(`Successfully renamed table ${old} back to ${newName}`);
      } catch (error: any) {
        if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
          logger.info(`Table ${old} does not exist, skipping reverse rename`);
          continue;
        }
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          logger.info(`Table ${newName} already exists, ${old} may have already been renamed back`);
          continue;
        }
        logger.error(`Error reversing rename of table ${old} to ${newName}`, { error });
        throw error;
      }
    }

    logger.info('Completed reversing rename of legacy game tables');
  }
}

