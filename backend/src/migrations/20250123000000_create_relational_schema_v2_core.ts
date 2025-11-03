import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Create core normalized relational schema v2 tables
 * 
 * This migration creates the foundational tables for a fully normalized schema:
 * - teams_v2: Master team catalog (reusable across rounds/seasons)
 * - seasons_v2: Tournament seasons (cleaner version)
 * - rounds_v2: Events/competitions within seasons (without denormalized results)
 * - round_teams_v2: Junction table linking rounds to available teams
 * - round_results_v2: Normalized round results (replaces first_place_team, etc. columns)
 * 
 * These tables run IN PARALLEL with the existing schema and do not affect current functionality.
 */
export class CreateRelationalSchemaV2Core implements Migration {
  id = '20250123000000_create_relational_schema_v2_core';
  description = 'Create core normalized relational schema v2 tables (teams, seasons, rounds, results)';

  async up(): Promise<void> {
    // Check if any _v2 tables already exist
    const [existingTables] = await db.query(
      "SHOW TABLES LIKE '%_v2'"
    ) as any;

    if (existingTables.length > 0) {
      logger.info('Some _v2 tables already exist, checking each table individually');
    }

    // 1. Teams table - Master catalog of all teams
    // Allows teams to be reused across rounds/seasons, enabling analytics and consistency
    const [teamsExists] = await db.query(
      "SHOW TABLES LIKE 'teams_v2'"
    ) as any;

    if (teamsExists.length === 0) {
      await db.query(`
        CREATE TABLE teams_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          -- Optional: can be extended with sport, league, etc. in future
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_team_name (name),
          INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Master team catalog - teams can be reused across rounds/seasons'
      `);
      logger.info('Created teams_v2 table');
    } else {
      logger.info('teams_v2 table already exists, skipping');
    }

    // 2. Seasons table - Clean version (matches current seasons but with better structure)
    const [seasonsExists] = await db.query(
      "SHOW TABLES LIKE 'seasons_v2'"
    ) as any;

    if (seasonsExists.length === 0) {
      await db.query(`
        CREATE TABLE seasons_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          year_start INT NOT NULL,
          year_end INT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          ended_at TIMESTAMP NULL DEFAULT NULL,
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active (is_active),
          INDEX idx_default (is_default),
          INDEX idx_ended (ended_at),
          INDEX idx_deleted (deleted_at),
          CONSTRAINT check_years_v2 CHECK (year_start >= 1990 AND year_start <= 2100 AND year_end >= year_start AND year_end <= 2100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Tournament seasons - matches current seasons structure'
      `);
      logger.info('Created seasons_v2 table');
    } else {
      logger.info('seasons_v2 table already exists, skipping');
    }

    // 3. Rounds table - Clean version without denormalized result columns
    // Results are stored in round_results_v2 instead
    const [roundsExists] = await db.query(
      "SHOW TABLES LIKE 'rounds_v2'"
    ) as any;

    if (roundsExists.length === 0) {
      await db.query(`
        CREATE TABLE rounds_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          season_id INT NOT NULL,
          sport_name VARCHAR(100) NOT NULL,
          pick_type ENUM('single', 'multiple') DEFAULT 'single',
          num_write_in_picks INT DEFAULT NULL,
          email_message VARCHAR(1000) DEFAULT NULL,
          lock_time TIMESTAMP NOT NULL,
          timezone VARCHAR(100) DEFAULT 'America/New_York',
          reminder_type ENUM('daily', 'before_lock') DEFAULT 'daily',
          daily_reminder_time TIME DEFAULT '10:00:00',
          first_reminder_hours INT DEFAULT 48,
          final_reminder_hours INT DEFAULT 6,
          status ENUM('draft', 'active', 'locked', 'completed') DEFAULT 'draft',
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons_v2(id) ON DELETE CASCADE,
          INDEX idx_season (season_id),
          INDEX idx_status (status),
          INDEX idx_pick_type (pick_type),
          INDEX idx_deleted (deleted_at),
          INDEX idx_season_status_deleted (season_id, status, deleted_at),
          INDEX idx_lock_time (lock_time),
          INDEX idx_timezone (timezone),
          INDEX idx_reminder_type (reminder_type),
          INDEX idx_daily_reminder_time (daily_reminder_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Events/competitions within seasons - results stored in round_results_v2'
      `);
      logger.info('Created rounds_v2 table');
    } else {
      logger.info('rounds_v2 table already exists, skipping');
    }

    // 4. Round Teams junction table - Links rounds to available teams
    // Normalized version: references teams_v2 instead of storing team names as strings
    const [roundTeamsExists] = await db.query(
      "SHOW TABLES LIKE 'round_teams_v2'"
    ) as any;

    if (roundTeamsExists.length === 0) {
      await db.query(`
        CREATE TABLE round_teams_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          round_id INT NOT NULL,
          team_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams_v2(id) ON DELETE CASCADE,
          UNIQUE KEY unique_round_team (round_id, team_id),
          INDEX idx_round (round_id),
          INDEX idx_team (team_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Junction table: available teams for each round (normalized with team references)'
      `);
      logger.info('Created round_teams_v2 table');
    } else {
      logger.info('round_teams_v2 table already exists, skipping');
    }

    // 5. Round Results table - Normalized results storage
    // Replaces first_place_team, second_place_team, etc. columns in rounds table
    const [roundResultsExists] = await db.query(
      "SHOW TABLES LIKE 'round_results_v2'"
    ) as any;

    if (roundResultsExists.length === 0) {
      await db.query(`
        CREATE TABLE round_results_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          round_id INT NOT NULL,
          place INT NOT NULL,
          team_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams_v2(id) ON DELETE RESTRICT,
          UNIQUE KEY unique_round_place (round_id, place),
          INDEX idx_round (round_id),
          INDEX idx_team (team_id),
          INDEX idx_place (place),
          CONSTRAINT check_place_range CHECK (place >= 1 AND place <= 10)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Normalized round results - replaces denormalized result columns in rounds table'
      `);
      logger.info('Created round_results_v2 table');
    } else {
      logger.info('round_results_v2 table already exists, skipping');
    }

    logger.info('Successfully created core relational schema v2 tables');
  }

  async down(): Promise<void> {
    // Drop in reverse order of dependencies
    await db.query(`DROP TABLE IF EXISTS round_results_v2`);
    await db.query(`DROP TABLE IF EXISTS round_teams_v2`);
    await db.query(`DROP TABLE IF EXISTS rounds_v2`);
    await db.query(`DROP TABLE IF EXISTS seasons_v2`);
    await db.query(`DROP TABLE IF EXISTS teams_v2`);
    logger.info('Dropped core relational schema v2 tables');
  }
}

