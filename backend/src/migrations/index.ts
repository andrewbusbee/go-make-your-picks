/**
 * Migration Registry
 * Import and export all migrations here in chronological order
 * 
 * Note: For fresh installs, all schema is defined in init.sql
 * Migrations are only needed for upgrading existing databases
 */
import { Migration } from './Migration';

/**
 * All migrations in order of execution
 * Add new migrations to the end of this array
 */
export const allMigrations: Migration[] = [
  // Add new migrations here as needed
];

export { Migration } from './Migration';
export { default as migrationRunner } from './migrationRunner';

