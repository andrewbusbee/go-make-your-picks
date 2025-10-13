/**
 * Migration Registry
 * Import and export all migrations here in chronological order
 */
import { Migration } from './Migration';
import migration001 from './001_add_commissioner_column';
import migration002 from './002_remove_email_unique_constraint';
import migration003 from './003_add_pick_edit_tracking';

/**
 * All migrations in order of execution
 * Add new migrations to the end of this array
 */
export const allMigrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  // Add new migrations here
];

export { Migration } from './Migration';
export { default as migrationRunner } from './migrationRunner';

