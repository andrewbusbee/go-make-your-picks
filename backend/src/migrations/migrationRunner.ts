import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { Migration } from './Migration';

/**
 * Migration Runner
 * Handles tracking and execution of database migrations
 */
export class MigrationRunner {
  /**
   * Ensure the migrations tracking table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        description VARCHAR(500) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.query(createTableQuery);
    logger.info('Migrations table ready');
  }

  /**
   * Check if a migration has already been executed
   */
  private async isMigrationExecuted(migrationId: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM migrations WHERE id = ?',
      [migrationId]
    );
    return rows.length > 0;
  }

  /**
   * Record that a migration has been executed
   */
  private async recordMigration(migration: Migration): Promise<void> {
    await db.query(
      'INSERT INTO migrations (id, description) VALUES (?, ?)',
      [migration.id, migration.description]
    );
  }

  /**
   * Run a single migration if it hasn't been executed yet
   */
  private async runMigration(migration: Migration): Promise<void> {
    const alreadyExecuted = await this.isMigrationExecuted(migration.id);

    if (alreadyExecuted) {
      logger.debug(`Migration ${migration.id} already executed, skipping`);
      return;
    }

    logger.info(`Running migration: ${migration.id} - ${migration.description}`);

    try {
      await migration.up();
      await this.recordMigration(migration);
      logger.info(`Migration ${migration.id} completed successfully`);
    } catch (error) {
      logger.error(`Migration ${migration.id} failed`, { error });
      throw new Error(`Migration ${migration.id} failed: ${error}`);
    }
  }

  /**
   * Run all pending migrations
   * @param migrations Array of migrations to run (should be in order)
   */
  async runAll(migrations: Migration[]): Promise<void> {
    logger.info('Starting migration process');

    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Sort migrations by ID to ensure they run in order
      const sortedMigrations = [...migrations].sort((a, b) => 
        a.id.localeCompare(b.id)
      );

      // Run each migration
      for (const migration of sortedMigrations) {
        await this.runMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed', { error });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();
    
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM migrations ORDER BY executed_at ASC'
    );
    
    return rows.map(row => row.id);
  }
}

export default new MigrationRunner();

