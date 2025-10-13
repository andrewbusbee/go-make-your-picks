/**
 * Migration interface
 * All migrations must implement this interface
 */
export interface Migration {
  /**
   * Unique identifier for this migration
   * Format: YYYYMMDDHHMMSS_description
   * Example: 20251013000000_add_commissioner_column
   */
  id: string;

  /**
   * Human-readable description of what this migration does
   */
  description: string;

  /**
   * Execute the migration
   * This should be idempotent - safe to run multiple times
   */
  up(): Promise<void>;

  /**
   * Optional: Rollback the migration
   * Not required but useful for development
   */
  down?(): Promise<void>;
}

