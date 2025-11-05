/**
 * Migration Registry
 * Import and export all migrations here in chronological order
 * 
 * Note: For fresh installs, all schema is defined in init.sql
 * Migrations are only needed for upgrading existing databases
 */
import { Migration } from './Migration';
import { AddChampionshipPageTitleMigration } from './20250115000000_add_championship_page_title';
import { RemoveSeasonCommissionerMigration } from './20250116000000_remove_season_commissioner';
import { AddHistoricalChampions } from './20250117000000_add_historical_champions';
import AddEmailMagicLinks from './20250118000000_add_email_magic_links';
import AddCompleteRoundSelectionMethod from './20250122000000_add_complete_round_selection_method';
import { CreateRelationalSchemaV2Core } from './20250123000000_create_relational_schema_v2_core';
import { CreateRelationalSchemaV2PicksScoring } from './20250123000001_create_relational_schema_v2_picks_scoring';
import { CreateSeasonWinnersV2 } from './20250123000002_create_season_winners_v2';
import { RenameLegacyGameTables } from './20250123000003_rename_legacy_game_tables';
import { UpdateMagicLinksFkToRoundsV2 } from './20250123000004_update_magic_links_fk_to_rounds_v2';
import { FixScoringRulesPlaceConstraint } from './20250123000005_fix_scoring_rules_place_constraint';
import { DropOriginalPickFromPicksV2 } from './20250123000005_drop_original_pick';
import { CreateSeedDataMetadata } from './20250123000006_create_seed_data_metadata';
import { RemoveTeamsV2UniqueConstraint } from './20250123000007_remove_teams_v2_unique_constraint';

/**
 * All migrations in order of execution
 * Add new migrations to the end of this array
 */
export const allMigrations: Migration[] = [
  new AddChampionshipPageTitleMigration(),
  new RemoveSeasonCommissionerMigration(),
  new AddHistoricalChampions(),
  new AddEmailMagicLinks(),
  new AddCompleteRoundSelectionMethod(),
  new CreateRelationalSchemaV2Core(),
  new CreateRelationalSchemaV2PicksScoring(),
  new CreateSeasonWinnersV2(),
  new RenameLegacyGameTables(),
  new UpdateMagicLinksFkToRoundsV2(),
  new FixScoringRulesPlaceConstraint(),
  new DropOriginalPickFromPicksV2(),
  new CreateSeedDataMetadata(),
  new RemoveTeamsV2UniqueConstraint(),
  // Add new migrations here as needed
];

export { Migration } from './Migration';
export { default as migrationRunner } from './migrationRunner';

