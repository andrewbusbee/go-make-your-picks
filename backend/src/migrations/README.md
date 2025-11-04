# Database Migrations

This directory contains database migrations for the Go Make Your Picks application.

## Overview

Migrations are automatically run on server startup, ensuring that database schema changes are applied consistently across all environments (development, staging, production).

**Important**: This project uses **custom TypeScript migrations**, not Drizzle or other migration frameworks. Each migration is a TypeScript class that implements the `Migration` interface.

## Migration vs init.sql

- **Fresh installs**: Use `backend/database/init.sql` which contains the complete schema
- **Existing databases**: Migrations are automatically applied on startup to upgrade schema
- Migrations are only needed for databases that were created before a new schema change

## How It Works

1. **On Startup**: The server runs all pending migrations before accepting requests
2. **Tracking**: A `migrations` table tracks which migrations have been executed
3. **Idempotent**: Migrations are safe to run multiple times - they check if changes already exist
4. **Ordered**: Migrations run in chronological order based on their ID (alphabetical sort)

## Idempotency Requirement

**All migrations MUST be idempotent** (safe to run multiple times). Always check if a change already exists before applying it. This allows:
- Safe re-runs if a migration partially fails
- Consistent behavior across environments
- No errors if migrations are run multiple times

Every migration should:
1. Check if the change already exists (table, column, constraint, etc.)
2. Skip if already exists
3. Apply change only if it doesn't exist

## Migration File Structure

Each migration file must:
- Implement the `Migration` interface from `Migration.ts`
- Have a unique ID in format: `YYYYMMDDHHMMSS_description` (14-digit timestamp)
- Export a default instance of the migration class
- Be registered in `index.ts` in the `allMigrations` array

### Migration ID Format

The migration ID must follow this format:
- **Format**: `YYYYMMDDHHMMSS_description`
- **Example**: `20250115000000_add_championship_page_title`
- **Timestamp**: 14 digits (year, month, day, hour, minute, second)
- **Description**: Lowercase with underscores, descriptive of the change

### Example Migration

```typescript
import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

export class MyMigration implements Migration {
  id = '20250115000000_add_my_column';
  description = 'Add my_column to some_table';

  async up(): Promise<void> {
    // ALWAYS check if change already exists (idempotency)
    const [columns] = await db.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'some_table' 
       AND COLUMN_NAME = 'my_column'`
    );

    if (columns.length > 0) {
      logger.info('Column my_column already exists, skipping');
      return;
    }

    // Apply the change only if it doesn't exist
    await db.query(`
      ALTER TABLE some_table 
      ADD COLUMN my_column VARCHAR(255) NOT NULL DEFAULT ''
    `);

    logger.info('Successfully added my_column to some_table');
  }

  async down(): Promise<void> {
    // Optional: Rollback logic
    // Note: Rollbacks are not automatically executed
    const [columns] = await db.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'some_table' 
       AND COLUMN_NAME = 'my_column'`
    );

    if (columns.length > 0) {
      await db.query('ALTER TABLE some_table DROP COLUMN my_column');
      logger.info('Removed column my_column from some_table');
    }
  }
}

export default new MyMigration();
```

## Creating a New Migration

1. **Create the migration file**:
   ```bash
   # Use format: YYYYMMDDHHMMSS_description.ts (14-digit timestamp)
   # Example: 20250115143000_add_user_preferences.ts
   touch backend/src/migrations/20250115143000_add_user_preferences.ts
   ```

2. **Implement the migration**:
   - Copy the example structure above
   - Update the ID to match filename (without .ts)
   - Update the description
   - Implement the `up()` method with idempotent checks
   - Optionally implement `down()` for rollback

3. **Register the migration**:
   - Open `backend/src/migrations/index.ts`
   - Import your migration class
   - Add a new instance to the `allMigrations` array at the end

4. **Test locally**:
   ```bash
   # Start the server - migrations run automatically
   npm run dev
   # Check logs for migration execution
   # Verify schema changes in your database
   ```

## Best Practices

### ✅ DO:
- **Always check if changes exist** before applying them (idempotency)
- **Use descriptive IDs** that include 14-digit timestamp and description
- **Log progress** using the logger
- **Test migrations** on a copy of production data before deploying
- **Keep migrations small** and focused on one change
- **Use transactions** for complex multi-step changes (via `withTransaction` utility)
- **Follow naming conventions**: Lowercase with underscores for descriptions

### ❌ DON'T:
- **Don't modify existing migrations** after they've been deployed to production
- **Don't delete migrations** that have been run in production
- **Don't assume table structure** - always check first using INFORMATION_SCHEMA
- **Don't use migrations for data seeding** - use separate seed scripts or the seed data function
- **Don't use future timestamps** - use current timestamp when creating the migration

## Migration Tracking

The system automatically creates a `migrations` table on first run:

```sql
CREATE TABLE migrations (
  id VARCHAR(255) PRIMARY KEY,
  description VARCHAR(500) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Each executed migration is recorded here to prevent re-execution.

## Troubleshooting

### Migration Failed
If a migration fails:
1. Check the server logs for the error message
2. Fix the issue in the migration file
3. Manually remove the migration record from the database (if it was partially recorded):
   ```sql
   DELETE FROM migrations WHERE id = 'your_migration_id';
   ```
4. Restart the server to retry

### Column Already Exists Error
This shouldn't happen if migrations are properly idempotent. If it does:
1. Check that your migration includes existence checks
2. Verify the migration wasn't partially applied
3. Check if the column exists with different properties (nullable, default, etc.)

### Need to Rollback
Rollbacks are not automatic. To rollback:
1. Implement the `down()` method in your migration
2. Manually call it or create a rollback script
3. Remove the migration record from the database:
   ```sql
   DELETE FROM migrations WHERE id = 'your_migration_id';
   ```

### Migration Not Running
If a migration isn't running:
1. Check that it's registered in `backend/src/migrations/index.ts`
2. Verify the migration ID format is correct (14 digits)
3. Check server logs for migration execution messages
4. Verify the migration hasn't already been executed:
   ```sql
   SELECT * FROM migrations WHERE id = 'your_migration_id';
   ```

## Relationship to Seed Data

The seed data function (available when `ENABLE_DEV_TOOLS=true`) uses a metadata table (`seed_data_metadata`) to track sample data. This table is created by a migration (`20250123000006_create_seed_data_metadata.ts`). Migrations can create application-specific tables like this for tracking purposes.

## Current Migrations

All migrations are registered in `backend/src/migrations/index.ts`. To see what migrations exist:
- Check the `allMigrations` array in that file
- Or list files in `backend/src/migrations/` directory
- Or query the database: `SELECT * FROM migrations ORDER BY executed_at;`

---

**Note**: For fresh database installations, all schema is defined in `backend/database/init.sql`. Migrations are only needed for upgrading existing databases.
