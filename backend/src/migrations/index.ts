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

/**
 * All migrations in order of execution
 * Add new migrations to the end of this array
 */
export const allMigrations: Migration[] = [
  new AddChampionshipPageTitleMigration(),
  new RemoveSeasonCommissionerMigration(),
  new AddHistoricalChampions(),
  // Add new migrations here as needed
];

export { Migration } from './Migration';
export { default as migrationRunner } from './migrationRunner';

