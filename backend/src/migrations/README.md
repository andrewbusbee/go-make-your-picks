# Database Migrations

This directory contains database migrations for the Go Make Your Picks application.

## Overview

Migrations are automatically run on server startup, ensuring that database schema changes are applied consistently across all environments (development, staging, production).

## How It Works

1. **On Startup**: The server runs all pending migrations before accepting requests
2. **Tracking**: A `migrations` table tracks which migrations have been executed
3. **Idempotent**: Migrations are safe to run multiple times - they check if changes already exist
4. **Ordered**: Migrations run in chronological order based on their ID

## Migration File Structure

Each migration file must:
- Implement the `Migration` interface
- Have a unique ID in format: `YYYYMMDDHHMMSS_description`
- Export a default instance of the migration class

### Example Migration

```typescript
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';
import { Migration } from './Migration';

class MyMigration implements Migration {
  id = '20251013120000_add_my_column';
  description = 'Add my_column to some_table';

  async up(): Promise<void> {
    // Check if change already exists
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

    // Apply the change
    await db.query(`
      ALTER TABLE some_table 
      ADD COLUMN my_column VARCHAR(255) NOT NULL DEFAULT ''
    `);

    logger.info('Successfully added my_column to some_table');
  }

  async down(): Promise<void> {
    // Optional: Rollback logic
    await db.query('ALTER TABLE some_table DROP COLUMN my_column');
  }
}

export default new MyMigration();
```

## Creating a New Migration

1. **Create the migration file**:
   ```bash
   # Use format: YYYYMMDDHHMMSS_description.ts
   touch backend/src/migrations/20251013120000_add_my_feature.ts
   ```

2. **Implement the migration**:
   - Copy the example structure above
   - Update the ID and description
   - Implement the `up()` method with idempotent checks
   - Optionally implement `down()` for rollback

3. **Register the migration**:
   - Open `backend/src/migrations/index.ts`
   - Import your migration
   - Add it to the `allMigrations` array

4. **Test locally**:
   ```bash
   npm run dev
   # Check logs for migration execution
   ```

## Best Practices

### ✅ DO:
- **Always check if changes exist** before applying them
- **Use descriptive IDs** that include timestamp and description
- **Log progress** using the logger
- **Test migrations** on a copy of production data
- **Keep migrations small** and focused on one change
- **Use transactions** for complex multi-step changes

### ❌ DON'T:
- **Don't modify existing migrations** after they've been deployed
- **Don't delete migrations** that have been run in production
- **Don't assume table structure** - always check first
- **Don't use migrations for data seeding** - use separate seed scripts

## Migration Tracking

The system automatically creates a `migrations` table:

```sql
CREATE TABLE migrations (
  id VARCHAR(255) PRIMARY KEY,
  description VARCHAR(500) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_executed_at (executed_at)
);
```

## Troubleshooting

### Migration Failed
If a migration fails:
1. Check the server logs for the error message
2. Fix the issue in the migration file
3. Manually remove the migration record from the database:
   ```sql
   DELETE FROM migrations WHERE id = 'your_migration_id';
   ```
4. Restart the server to retry

### Column Already Exists Error
This shouldn't happen if migrations are properly idempotent. If it does:
1. Check that your migration includes existence checks
2. Verify the migration wasn't partially applied

### Need to Rollback
Rollbacks are not automatic. To rollback:
1. Implement the `down()` method in your migration
2. Manually call it or create a rollback script
3. Remove the migration record from the database

## Existing Migrations

- `001_add_commissioner_column` - Adds `is_commissioner` column to `admins` table

## Future Enhancements

Potential improvements to the migration system:
- CLI tool for generating migration templates
- Automatic rollback on failure
- Migration dry-run mode
- Migration status command
- Support for data migrations (not just schema)

