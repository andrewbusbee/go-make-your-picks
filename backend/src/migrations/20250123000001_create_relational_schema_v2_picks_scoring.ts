import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Create picks and scoring normalized relational schema v2 tables
 * 
 * This migration creates the picks and scoring tables for the normalized schema:
 * - picks_v2: User picks per round (with admin edit tracking)
 * - pick_items_v2: Individual pick values (references teams_v2)
 * - score_details_v2: Normalized score breakdown (replaces denormalized scores table)
 * - scoring_rules_v2: Points per place per season (normalized scoring configuration)
 * - season_participants_v2: Junction table for season-user participation
 * 
 * These tables run IN PARALLEL with the existing schema and do not affect current functionality.
 */
export class CreateRelationalSchemaV2PicksScoring implements Migration {
  id = '20250123000001_create_relational_schema_v2_picks_scoring';
  description = 'Create picks and scoring normalized relational schema v2 tables';

  async up(): Promise<void> {
    // Note: We assume admins table exists (from existing schema)
    // We'll reference it by name, not by _v2 version since admins are shared

    // 1. Season Participants table - Junction table for season-user participation
    const [seasonParticipantsExists] = await db.query(
      "SHOW TABLES LIKE 'season_participants_v2'"
    ) as any;

    if (seasonParticipantsExists.length === 0) {
      // Note: We'll need to reference users table (existing or create users_v2)
      // For now, we'll create it to reference users (assuming users table exists)
      // In a full migration, we'd create users_v2, but for parallel operation, we can reference existing users
      await db.query(`
        CREATE TABLE season_participants_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          season_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons_v2(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_season_user_v2 (season_id, user_id),
          INDEX idx_season_v2 (season_id),
          INDEX idx_user_v2 (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Junction table: users participating in seasons (v2 normalized)'
      `);
      logger.info('Created season_participants_v2 table');
    } else {
      logger.info('season_participants_v2 table already exists, skipping');
    }

    // 2. Scoring Rules table - Points per place per season
    // Normalizes scoring configuration that was in numeric_settings and season_winners
    const [scoringRulesExists] = await db.query(
      "SHOW TABLES LIKE 'scoring_rules_v2'"
    ) as any;

    if (scoringRulesExists.length === 0) {
      await db.query(`
        CREATE TABLE scoring_rules_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          season_id INT NOT NULL,
          place INT NOT NULL,
          points INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons_v2(id) ON DELETE CASCADE,
          UNIQUE KEY unique_season_place (season_id, place),
          INDEX idx_season (season_id),
          INDEX idx_place (place),
          CONSTRAINT check_place_range_scoring CHECK (place >= 1 AND place <= 10),
          CONSTRAINT check_points_range CHECK (points >= -10 AND points <= 20)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Scoring rules per season - points awarded per finishing place (normalized)'
      `);
      logger.info('Created scoring_rules_v2 table');
    } else {
      logger.info('scoring_rules_v2 table already exists, skipping');
    }

    // 3. Picks table - User picks per round (with admin edit tracking)
    const [picksExists] = await db.query(
      "SHOW TABLES LIKE 'picks_v2'"
    ) as any;

    if (picksExists.length === 0) {
      await db.query(`
        CREATE TABLE picks_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          round_id INT NOT NULL,
          admin_edited BOOLEAN DEFAULT FALSE NOT NULL,
          original_pick VARCHAR(255) NULL,
          -- Note: original_pick kept as string for backward compatibility during migration
          -- In pure v2, we could store this differently, but keeping for compatibility
          edited_by_admin_id INT NULL,
          edited_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE,
          FOREIGN KEY (edited_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
          UNIQUE KEY unique_user_round_pick_v2 (user_id, round_id),
          INDEX idx_user_v2 (user_id),
          INDEX idx_round_v2 (round_id),
          INDEX idx_user_round_v2 (user_id, round_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='User picks per round - normalized version with team references'
      `);
      logger.info('Created picks_v2 table');
    } else {
      logger.info('picks_v2 table already exists, skipping');
    }

    // 4. Pick Items table - Individual picks (references teams_v2)
    // This is the key normalization: pick values reference team entities instead of strings
    const [pickItemsExists] = await db.query(
      "SHOW TABLES LIKE 'pick_items_v2'"
    ) as any;

    if (pickItemsExists.length === 0) {
      await db.query(`
        CREATE TABLE pick_items_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          pick_id INT NOT NULL,
          pick_number INT NOT NULL,
          team_id INT NOT NULL,
          -- For write-in picks that don't match existing teams, we can:
          -- Option A: Create a team entry in teams_v2 first
          -- Option B: Allow NULL and have a separate write_in_value column
          -- For now, we'll require team_id (write-ins must be added to teams_v2)
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pick_id) REFERENCES picks_v2(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams_v2(id) ON DELETE RESTRICT,
          UNIQUE KEY unique_pick_number_v2 (pick_id, pick_number),
          INDEX idx_pick_id_v2 (pick_id),
          INDEX idx_team_id_v2 (team_id),
          INDEX idx_pick_id_number_v2 (pick_id, pick_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Individual pick items - normalized with team references (replaces string values)'
      `);
      logger.info('Created pick_items_v2 table');
    } else {
      logger.info('pick_items_v2 table already exists, skipping');
    }

    // 5. Score Details table - Normalized score breakdown
    // Replaces the denormalized scores table with columns for each place
    // This allows for cleaner querying and easier extension
    const [scoreDetailsExists] = await db.query(
      "SHOW TABLES LIKE 'score_details_v2'"
    ) as any;

    if (scoreDetailsExists.length === 0) {
      await db.query(`
        CREATE TABLE score_details_v2 (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          round_id INT NOT NULL,
          place INT NOT NULL,
          count TINYINT NOT NULL DEFAULT 0,
          -- count: how many picks matched this place (typically 0, 1, or 2)
          -- place: 0 = no pick, 1-10 = finishing places
          -- This replaces first_place, second_place, etc. columns
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (round_id) REFERENCES rounds_v2(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_round_place_v2 (user_id, round_id, place),
          INDEX idx_user_v2 (user_id),
          INDEX idx_round_v2 (round_id),
          INDEX idx_user_round_v2 (user_id, round_id),
          INDEX idx_place_v2 (place),
          CONSTRAINT check_place_range_score CHECK (place >= 0 AND place <= 10),
          CONSTRAINT check_count_range CHECK (count >= 0 AND count <= 2)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Normalized score breakdown - replaces denormalized scores table columns (place=0 for no_pick)'
      `);
      logger.info('Created score_details_v2 table');
    } else {
      logger.info('score_details_v2 table already exists, skipping');
    }

    // Note: place=0 is used for "no pick" scenarios in score_details_v2
    // The CHECK constraint already allows place >= 0, so no additional ALTER is needed

    logger.info('Successfully created picks and scoring relational schema v2 tables');
  }

  async down(): Promise<void> {
    // Drop in reverse order of dependencies
    await db.query(`DROP TABLE IF EXISTS score_details_v2`);
    await db.query(`DROP TABLE IF EXISTS pick_items_v2`);
    await db.query(`DROP TABLE IF EXISTS picks_v2`);
    await db.query(`DROP TABLE IF EXISTS scoring_rules_v2`);
    await db.query(`DROP TABLE IF EXISTS season_participants_v2`);
    logger.info('Dropped picks and scoring relational schema v2 tables');
  }
}

