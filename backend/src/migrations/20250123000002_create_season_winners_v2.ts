import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

/**
 * Migration: Create season_winners_v2 table
 * 
 * This migration creates a normalized version of season_winners:
 * - season_winners_v2: Normalized season standings (replaces denormalized season_winners)
 * 
 * Key differences from season_winners:
 * - Removes denormalized point columns (points_first_place, points_second_place, etc.)
 * - Uses place as a single column instead of multiple point columns
 * - total_points is a derived/computed value (calculated from score_details_v2 + scoring_rules_v2)
 * - Enforces referential integrity with seasons_v2 and users
 * - Ensures unique place per season and unique user per season
 * 
 * These tables run IN PARALLEL with the existing schema and do not affect current functionality.
 */
export class CreateSeasonWinnersV2 implements Migration {
  id = '20250123000002_create_season_winners_v2';
  description = 'Create normalized season_winners_v2 table for season standings';

  async up(): Promise<void> {
    const [tableExists] = await db.query(
      "SHOW TABLES LIKE 'season_winners_v2'"
    ) as any;

    if (tableExists.length === 0) {
      await db.query(`
        CREATE TABLE season_winners_v2 (
          id INT(11) NOT NULL AUTO_INCREMENT,
          season_id INT(11) NOT NULL,
          user_id INT(11) NOT NULL,
          place INT(11) NOT NULL,
          total_points INT(11) NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_season_user_v2 (season_id, user_id),
          UNIQUE KEY unique_season_place_v2 (season_id, place),
          INDEX idx_season_user_v2 (season_id, user_id),
          INDEX idx_season_place_v2 (season_id, place),
          INDEX idx_season_v2 (season_id),
          INDEX idx_user_v2 (user_id),
          INDEX idx_place_v2 (place),
          FOREIGN KEY (season_id) REFERENCES seasons_v2(id) ON DELETE CASCADE ON UPDATE RESTRICT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT,
          CONSTRAINT check_place_range_v2 CHECK (place >= 1 AND place <= 100),
          CONSTRAINT check_total_points_v2 CHECK (total_points >= 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Normalized season standings - replaces denormalized season_winners table. total_points is derived from score_details_v2 + scoring_rules_v2'
      `);
      logger.info('Created season_winners_v2 table');
    } else {
      logger.info('season_winners_v2 table already exists, skipping');
    }

    // Note: Data migration from season_winners to season_winners_v2
    // The following SQL can be used to migrate existing data (manual step):
    // 
    // INSERT INTO season_winners_v2 (season_id, user_id, place, total_points, created_at)
    // SELECT 
    //   season_id, 
    //   user_id, 
    //   place, 
    //   total_points, 
    //   created_at
    // FROM season_winners
    // WHERE season_id IN (SELECT id FROM seasons_v2)
    // ON DUPLICATE KEY UPDATE 
    //   place = VALUES(place),
    //   total_points = VALUES(total_points),
    //   updated_at = CURRENT_TIMESTAMP;
    //
    // Note: This assumes seasons have been migrated to seasons_v2 first.
    // The total_points value should ideally be recalculated from score_details_v2 + scoring_rules_v2
    // for full normalization, but this provides a direct migration path.
  }

  async down(): Promise<void> {
    await db.query(`DROP TABLE IF EXISTS season_winners_v2`);
    logger.info('Dropped season_winners_v2 table');
  }
}

