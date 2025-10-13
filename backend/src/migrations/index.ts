/**
 * Migration Registry
 * Import and export all migrations here in chronological order
 */
import { Migration } from './Migration';
import migration001 from './001_add_commissioner_column';

/**
 * All migrations in order of execution
 * Add new migrations to the end of this array
 */
export const allMigrations: Migration[] = [
  migration001,
  // Add new migrations here
];

export { Migration } from './Migration';
export { default as migrationRunner } from './migrationRunner';

