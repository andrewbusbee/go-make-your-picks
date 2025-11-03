# Legacy Game Tables

## Overview

The legacy game tables have been renamed to have a `_legacy` suffix to clearly mark them as historical snapshots that are no longer used by the application.

**Rename Date**: January 2025  
**Migration**: `20250123000003_rename_legacy_game_tables`

---

## Renamed Tables

The following legacy game tables have been renamed:

| Legacy Table | New Name | Status |
|-------------|----------|--------|
| `picks` | `picks_legacy` | ✅ Renamed |
| `pick_items` | `pick_items_legacy` | ✅ Renamed |
| `scores` | `scores_legacy` | ✅ Renamed |
| `round_teams` | `round_teams_legacy` | ✅ Renamed |
| `season_participants` | `season_participants_legacy` | ✅ Renamed |
| `season_winners` | `season_winners_legacy` | ✅ Renamed |

---

## Tables NOT Renamed (Yet)

The following tables have **NOT** been renamed because they are still referenced by foreign keys from non-game tables:

- **`seasons`** - Still referenced by:
  - `magic_links` (via `round_id` → `rounds` → `season_id`)
  - `email_magic_links` (via `round_id` → `rounds` → `season_id`)
  - `reminder_log` (via `round_id` → `rounds` → `season_id`)
  - `season_participants_legacy` (historical FK)
  - `season_winners_legacy` (historical FK)

- **`rounds`** - Still referenced by:
  - `magic_links` (FK to `rounds.id`)
  - `email_magic_links` (FK to `rounds.id`)
  - `reminder_log` (FK to `round_id`)
  - `picks_legacy` (historical FK)
  - `scores_legacy` (historical FK)
  - `round_teams_legacy` (historical FK)

These tables will be renamed in a future migration once the dependent tables (`magic_links`, `email_magic_links`, `reminder_log`) have been migrated to reference `seasons_v2` and `rounds_v2` instead.

---

## Purpose of Legacy Tables

The `*_legacy` tables are retained as:

1. **Historical Snapshots**: They contain historical game data from before the v2 schema cutover
2. **Safety Net**: In case data recovery or comparison is needed
3. **Reference**: For understanding the old schema structure during migration planning

**Important**: The application runtime code no longer reads from or writes to these legacy tables. All active game logic uses the `*_v2` tables.

---

## Foreign Key Preservation

The `RENAME TABLE` operation automatically preserves all foreign key constraints:

- Foreign keys **between** legacy tables (e.g., `pick_items_legacy` → `picks_legacy`) are preserved
- Foreign keys **from** legacy tables to non-renamed tables (e.g., `picks_legacy` → `rounds`, `season_winners_legacy` → `seasons`) remain valid
- Foreign keys **from** non-game tables to `seasons`/`rounds` remain valid (this is why `seasons`/`rounds` weren't renamed yet)

---

## Migration Details

The migration `20250123000003_rename_legacy_game_tables`:

- Checks for table existence before renaming
- Handles already-renamed tables gracefully (idempotent)
- Preserves all foreign key constraints automatically
- Includes a `down()` method for rollback if needed

---

## Future Work

1. **Migrate Dependent Tables**: Update `magic_links`, `email_magic_links`, and `reminder_log` to reference `rounds_v2` instead of `rounds`
2. **Rename Remaining Tables**: Once dependencies are migrated, rename `seasons` → `seasons_legacy` and `rounds` → `rounds_legacy`
3. **Archive Decision**: Determine long-term retention policy for `*_legacy` tables (keep indefinitely vs. archive/delete after X years)

---

## Active Schema

The application now uses **only** the following `*_v2` tables for game logic:

- `seasons_v2`
- `rounds_v2`
- `teams_v2`
- `round_teams_v2`
- `round_results_v2`
- `season_participants_v2`
- `picks_v2`
- `pick_items_v2`
- `score_details_v2`
- `scoring_rules_v2`
- `season_winners_v2`

All runtime code (routes, services) has been migrated to use these tables exclusively.

