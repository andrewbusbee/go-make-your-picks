# Database Relational Schema V2 Design Plan

## Overview

This document describes the new normalized relational database schema (`_v2` tables) that runs **in parallel** with the existing schema. The new schema is designed to be fully normalized (targeting Third Normal Form - 3NF) while maintaining compatibility with the current application.

## Design Principles

1. **Non-Breaking**: All existing tables, columns, and functionality remain unchanged
2. **Parallel Operation**: New `_v2` tables coexist with existing tables in the same database
3. **Normalization**: Eliminate data redundancy and improve referential integrity
4. **Team Reusability**: Teams are now entities that can be reused across rounds/seasons
5. **Normalized Results**: Round results stored as relations instead of denormalized columns
6. **Normalized Scoring**: Scores stored as relations instead of denormalized columns

## Entity Relationship Diagram (Textual)

```
┌─────────────┐
│  teams_v2   │ (Master team catalog)
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐     ┌─────────────────┐
│  round_teams_v2     │────▶│  rounds_v2      │
│  (junction)         │     │  (events)       │
└─────────────────────┘     └─────┬───────────┘
                                   │
                                   │ N:1
                                   │
┌──────────────────────────────────▼──────────────┐
│                   seasons_v2                     │
│              (tournament seasons)                 │
└──────────────────────────────────────────────────┘
       │
       │ 1:N
       │
┌──────▼──────────────────────┐
│  season_participants_v2     │
│  (junction: users-seasons)  │
└──────┬──────────────────────┘
       │
       │ N:1
       │
┌──────▼──────┐
│   users     │ (existing table, referenced by FK)
└─────────────┘

┌─────────────┐
│  rounds_v2   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐     ┌──────────────┐
│  round_results_v2   │────▶│  teams_v2   │
│  (place, team_id)   │     └──────────────┘
└─────────────────────┘

┌─────────────┐
│  rounds_v2   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────┐     ┌──────────────┐
│  picks_v2   │────▶│  teams_v2   │
└──────┬──────┘     └──────────────┘
       │                    (via pick_items_v2)
       │ 1:N
       │
┌──────▼──────────────┐
│  pick_items_v2      │
│  (pick_id, team_id) │
└─────────────────────┘

┌─────────────┐
│  rounds_v2   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│  score_details_v2    │
│  (user_id, round_id,│
│   place, count)     │
└─────────────────────┘

┌─────────────┐
│  seasons_v2  │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│  scoring_rules_v2    │
│  (season_id, place,  │
│   points)            │
└──────────────────────┘
```

## Core Tables

### 1. `teams_v2`
**Purpose**: Master catalog of all teams, enabling reuse across rounds/seasons.

**Key Normalization**: Teams are now entities instead of strings, allowing:
- Consistency across rounds/seasons
- Analytics on team performance
- Easier data validation
- Future extensions (team metadata, logos, etc.)

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `name` (VARCHAR(255), UNIQUE, NOT NULL)
- `created_at`, `updated_at` (timestamps)

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE on `name`
- INDEX on `name` for lookups

---

### 2. `seasons_v2`
**Purpose**: Tournament seasons (matches current `seasons` structure).

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `name` (VARCHAR(100), NOT NULL)
- `year_start`, `year_end` (INT, NOT NULL)
- `is_active`, `is_default` (BOOLEAN)
- `ended_at`, `deleted_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (timestamps)

**Constraints**:
- CHECK constraint on year ranges (1990-2100, year_end >= year_start)

**Indexes**:
- Indexes on `is_active`, `is_default`, `ended_at`, `deleted_at`

---

### 3. `rounds_v2`
**Purpose**: Events/competitions within seasons.

**Key Normalization**: **Removed denormalized result columns** (`first_place_team`, `second_place_team`, etc.). Results are now in `round_results_v2`.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `season_id` (FK → `seasons_v2.id`)
- `sport_name` (VARCHAR(100))
- `pick_type` (ENUM: 'single', 'multiple')
- `num_write_in_picks` (INT, nullable)
- `email_message` (VARCHAR(1000))
- `lock_time` (TIMESTAMP)
- `timezone` (VARCHAR(100))
- `reminder_type`, `daily_reminder_time`, `first_reminder_hours`, `final_reminder_hours`
- `status` (ENUM: 'draft', 'active', 'locked', 'completed')
- `deleted_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (timestamps)

**Foreign Keys**:
- `season_id` → `seasons_v2.id` (ON DELETE CASCADE)

**Indexes**:
- Composite indexes for common query patterns (season + status + deleted_at)
- Individual indexes on status, pick_type, lock_time, etc.

---

### 4. `round_teams_v2`
**Purpose**: Junction table linking rounds to available teams.

**Key Normalization**: References `teams_v2.id` instead of storing team names as strings.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `round_id` (FK → `rounds_v2.id`)
- `team_id` (FK → `teams_v2.id`)
- `created_at` (timestamp)

**Constraints**:
- UNIQUE on (`round_id`, `team_id`)

**Foreign Keys**:
- `round_id` → `rounds_v2.id` (ON DELETE CASCADE)
- `team_id` → `teams_v2.id` (ON DELETE CASCADE)

**Indexes**:
- Indexes on `round_id` and `team_id` for efficient lookups

---

### 5. `round_results_v2`
**Purpose**: Normalized round results storage.

**Key Normalization**: Replaces `rounds.first_place_team`, `rounds.second_place_team`, etc. columns with a relation.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `round_id` (FK → `rounds_v2.id`)
- `place` (INT, 1-10)
- `team_id` (FK → `teams_v2.id`)
- `created_at`, `updated_at` (timestamps)

**Constraints**:
- UNIQUE on (`round_id`, `place`) - one team per place per round
- CHECK constraint: `place >= 1 AND place <= 10`

**Foreign Keys**:
- `round_id` → `rounds_v2.id` (ON DELETE CASCADE)
- `team_id` → `teams_v2.id` (ON DELETE RESTRICT)

**Indexes**:
- Indexes on `round_id`, `team_id`, `place`

---

## Picks and Scoring Tables

### 6. `picks_v2`
**Purpose**: User picks per round (with admin edit tracking).

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `user_id` (FK → `users.id`) - references existing `users` table
- `round_id` (FK → `rounds_v2.id`)
- `admin_edited` (BOOLEAN)
- `original_pick` (VARCHAR(255), nullable) - kept for migration compatibility
- `edited_by_admin_id` (FK → `admins.id`, nullable)
- `edited_at` (TIMESTAMP, nullable)
- `created_at`, `updated_at` (timestamps)

**Constraints**:
- UNIQUE on (`user_id`, `round_id`)

**Foreign Keys**:
- `user_id` → `users.id` (ON DELETE CASCADE)
- `round_id` → `rounds_v2.id` (ON DELETE CASCADE)
- `edited_by_admin_id` → `admins.id` (ON DELETE SET NULL)

**Indexes**:
- Composite index on (`user_id`, `round_id`)

---

### 7. `pick_items_v2`
**Purpose**: Individual pick values (references teams).

**Key Normalization**: `pick_value` is now `team_id` (FK to `teams_v2`), replacing string values.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `pick_id` (FK → `picks_v2.id`)
- `pick_number` (INT) - ordering for multiple picks
- `team_id` (FK → `teams_v2.id`)
- `created_at` (timestamp)

**Constraints**:
- UNIQUE on (`pick_id`, `pick_number`)

**Foreign Keys**:
- `pick_id` → `picks_v2.id` (ON DELETE CASCADE)
- `team_id` → `teams_v2.id` (ON DELETE RESTRICT)

**Indexes**:
- Composite index on (`pick_id`, `pick_number`)

**Note**: For write-in picks, teams must first be added to `teams_v2`.

---

### 8. `score_details_v2`
**Purpose**: Normalized score breakdown.

**Key Normalization**: Replaces denormalized `scores` table with columns (`first_place`, `second_place`, etc.) with a relation.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `user_id` (FK → `users.id`)
- `round_id` (FK → `rounds_v2.id`)
- `place` (INT, 0-10) - 0 = no pick, 1-10 = finishing places
- `count` (TINYINT, 0-2) - how many picks matched this place
- `created_at`, `updated_at` (timestamps)

**Constraints**:
- UNIQUE on (`user_id`, `round_id`, `place`)
- CHECK: `place >= 0 AND place <= 10`
- CHECK: `count >= 0 AND count <= 2`

**Foreign Keys**:
- `user_id` → `users.id` (ON DELETE CASCADE)
- `round_id` → `rounds_v2.id` (ON DELETE CASCADE)

**Indexes**:
- Composite index on (`user_id`, `round_id`) for leaderboard queries
- Index on `place`

**Example Data**:
```
user_id=1, round_id=5, place=1, count=1  → User got 1 first place
user_id=1, round_id=5, place=2, count=0  → User got 0 second place
user_id=1, round_id=5, place=0, count=1  → User had no pick
```

---

### 9. `scoring_rules_v2`
**Purpose**: Points per place per season (normalized scoring configuration).

**Key Normalization**: Replaces scoring data scattered in `numeric_settings` and `season_winners` tables.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `season_id` (FK → `seasons_v2.id`)
- `place` (INT, 1-10)
- `points` (INT, -10 to 20)
- `created_at`, `updated_at` (timestamps)

**Constraints**:
- UNIQUE on (`season_id`, `place`)
- CHECK: `place >= 1 AND place <= 10`
- CHECK: `points >= -10 AND points <= 20`

**Foreign Keys**:
- `season_id` → `seasons_v2.id` (ON DELETE CASCADE)

**Indexes**:
- Index on `season_id` for lookups

**Example Data**:
```
season_id=1, place=1, points=6
season_id=1, place=2, points=5
season_id=1, place=3, points=4
...
season_id=1, place=0, points=0  (no pick penalty, if applicable)
```

---

### 10. `season_participants_v2`
**Purpose**: Junction table for season-user participation.

**Columns**:
- `id` (PK, INT AUTO_INCREMENT)
- `season_id` (FK → `seasons_v2.id`)
- `user_id` (FK → `users.id`) - references existing `users` table
- `created_at` (timestamp)

**Constraints**:
- UNIQUE on (`season_id`, `user_id`)

**Foreign Keys**:
- `season_id` → `seasons_v2.id` (ON DELETE CASCADE)
- `user_id` → `users.id` (ON DELETE CASCADE)

**Indexes**:
- Indexes on `season_id` and `user_id`

---

## Schema Mapping: Old → New

### Round Results
| Old Schema | New Schema |
|------------|------------|
| `rounds.first_place_team` (VARCHAR) | `round_results_v2.place=1` → `teams_v2.id` |
| `rounds.second_place_team` (VARCHAR) | `round_results_v2.place=2` → `teams_v2.id` |
| `rounds.third_place_team` (VARCHAR) | `round_results_v2.place=3` → `teams_v2.id` |
| `rounds.fourth_place_team` (VARCHAR) | `round_results_v2.place=4` → `teams_v2.id` |
| `rounds.fifth_place_team` (VARCHAR) | `round_results_v2.place=5` → `teams_v2.id` |

### Teams
| Old Schema | New Schema |
|------------|------------|
| `round_teams.team_name` (VARCHAR) | `round_teams_v2.team_id` → `teams_v2.id` |
| `pick_items.pick_value` (VARCHAR) | `pick_items_v2.team_id` → `teams_v2.id` |

### Picks
| Old Schema | New Schema |
|------------|------------|
| `picks` (unchanged structure) | `picks_v2` (same structure, different FKs) |
| `pick_items.pick_id` → `picks.id` | `pick_items_v2.pick_id` → `picks_v2.id` |
| `pick_items.pick_value` (VARCHAR) | `pick_items_v2.team_id` → `teams_v2.id` |

### Scores
| Old Schema | New Schema |
|------------|------------|
| `scores.first_place` (TINYINT) | `score_details_v2.place=1, count=X` |
| `scores.second_place` (TINYINT) | `score_details_v2.place=2, count=X` |
| `scores.third_place` (TINYINT) | `score_details_v2.place=3, count=X` |
| `scores.fourth_place` (TINYINT) | `score_details_v2.place=4, count=X` |
| `scores.fifth_place` (TINYINT) | `score_details_v2.place=5, count=X` |
| `scores.sixth_plus_place` (TINYINT) | `score_details_v2.place=6, count=X` (or place=7,8,9,10) |
| `scores.no_pick` (TINYINT) | `score_details_v2.place=0, count=1` |

### Scoring Rules
| Old Schema | New Schema |
|------------|------------|
| `numeric_settings.points_first_place` | `scoring_rules_v2.place=1, points=X` |
| `numeric_settings.points_second_place` | `scoring_rules_v2.place=2, points=X` |
| `numeric_settings.points_third_place` | `scoring_rules_v2.place=3, points=X` |
| `numeric_settings.points_fourth_place` | `scoring_rules_v2.place=4, points=X` |
| `numeric_settings.points_fifth_place` | `scoring_rules_v2.place=5, points=X` |
| `numeric_settings.points_sixth_plus_place` | `scoring_rules_v2.place=6, points=X` (or multiple rows for 6-10) |
| `numeric_settings.points_no_pick` | `scoring_rules_v2.place=0, points=X` (if supported) |
| `season_winners.points_first_place` (per season) | `scoring_rules_v2.season_id=X, place=1, points=Y` |

### Seasons and Participants
| Old Schema | New Schema |
|------------|------------|
| `seasons` | `seasons_v2` (same structure) |
| `season_participants` | `season_participants_v2` (same structure) |

---

## Migration Strategy

### Phase 1: Schema Creation (Current)
- ✅ Create all `_v2` tables via migrations
- ✅ Tables are empty and ready for data

### Phase 2: Data Migration (Future)
1. **Teams Migration**:
   - Extract unique team names from `round_teams` and `pick_items.pick_value`
   - Insert into `teams_v2`
   - Create mapping: `team_name` → `team_id`

2. **Seasons Migration**:
   - Copy data from `seasons` → `seasons_v2`
   - Handle ID mapping if needed

3. **Rounds Migration**:
   - Copy from `rounds` → `rounds_v2` (excluding result columns)
   - Migrate results: `rounds.first_place_team` → `round_results_v2` rows

4. **Round Teams Migration**:
   - For each `round_teams` row, find `team_id` from `teams_v2`
   - Insert into `round_teams_v2`

5. **Picks Migration**:
   - Copy from `picks` → `picks_v2`
   - For each `pick_items`, find `team_id` from `teams_v2` by name
   - Insert into `pick_items_v2`

6. **Scores Migration**:
   - For each `scores` row, create `score_details_v2` rows:
     - `place=1, count=scores.first_place`
     - `place=2, count=scores.second_place`
     - etc.

7. **Scoring Rules Migration**:
   - Extract from `numeric_settings` and `season_winners`
   - Insert into `scoring_rules_v2`

### Phase 3: Code Migration (Future)
- Update application code to use `_v2` tables
- Can be done gradually with feature flags
- Keep old code paths for fallback

### Phase 4: Cleanup (Future, Optional)
- After verifying `_v2` is working correctly
- Remove old tables (if desired)
- Rename `_v2` tables to remove suffix (if desired)

---

## Query Examples

### Get Round Results (Old vs New)

**Old Schema**:
```sql
SELECT first_place_team, second_place_team, third_place_team
FROM rounds
WHERE id = 5;
```

**New Schema**:
```sql
SELECT rr.place, t.name as team_name
FROM round_results_v2 rr
JOIN teams_v2 t ON rr.team_id = t.id
WHERE rr.round_id = 5
ORDER BY rr.place;
```

### Get User Picks (Old vs New)

**Old Schema**:
```sql
SELECT pi.pick_value
FROM picks p
JOIN pick_items pi ON p.id = pi.pick_id
WHERE p.user_id = 1 AND p.round_id = 5;
```

**New Schema**:
```sql
SELECT pi.pick_number, t.name as team_name
FROM picks_v2 p
JOIN pick_items_v2 pi ON p.id = pi.pick_id
JOIN teams_v2 t ON pi.team_id = t.id
WHERE p.user_id = 1 AND p.round_id = 5
ORDER BY pi.pick_number;
```

### Calculate Leaderboard (Old vs New)

**Old Schema**:
```sql
SELECT 
  u.id,
  u.name,
  SUM(s.first_place * 6 + s.second_place * 5 + ...) as total_points
FROM users u
JOIN scores s ON u.id = s.user_id
JOIN rounds r ON s.round_id = r.id
WHERE r.season_id = 1
GROUP BY u.id, u.name
ORDER BY total_points DESC;
```

**New Schema**:
```sql
SELECT 
  u.id,
  u.name,
  SUM(sd.count * sr.points) as total_points
FROM users u
JOIN score_details_v2 sd ON u.id = sd.user_id
JOIN rounds_v2 r ON sd.round_id = r.id
JOIN scoring_rules_v2 sr ON r.season_id = sr.season_id AND sd.place = sr.place
WHERE r.season_id = 1
GROUP BY u.id, u.name
ORDER BY total_points DESC;
```

---

## Benefits of Normalization

1. **Data Integrity**: Foreign keys ensure referential integrity
2. **Consistency**: Teams are stored once, referenced everywhere
3. **Flexibility**: Easy to extend (e.g., add team metadata)
4. **Analytics**: Easier to query across rounds/seasons
5. **Maintainability**: Changes to team names propagate automatically
6. **Scalability**: Better query performance with proper indexes

---

## Assumptions and Open Questions

### Assumptions
1. **Users Table**: The new schema references the existing `users` table (not `users_v2`). This is intentional to avoid duplicating user data during parallel operation.
2. **Admins Table**: Similarly, `picks_v2.edited_by_admin_id` references the existing `admins` table.
3. **Write-in Picks**: For write-in picks, teams must first be added to `teams_v2`. This ensures all picks reference valid teams.
4. **No-Pick Handling**: `score_details_v2.place=0` represents "no pick" scenarios.

### Open Questions
1. **Team Name Normalization**: Should team names be case-insensitive or normalized (e.g., "Lakers" vs "lakers")? Currently, `teams_v2.name` is case-sensitive with a UNIQUE constraint.
2. **Historical Data**: Should historical champions be migrated to `teams_v2`? The `historical_champions` table could reference `teams_v2` in the future.
3. **Team Aliases**: Should we support team aliases or alternate names? (e.g., "Lakers" vs "Los Angeles Lakers")
4. **Scoring Rule Extensions**: Should we support different scoring rules per round (not just per season)?

---

## Indexes and Performance

All tables include appropriate indexes for common query patterns:

- **Foreign Key Columns**: Indexed for join performance
- **Unique Constraints**: Indexed automatically
- **Composite Indexes**: For common query patterns (e.g., `(user_id, round_id)`)
- **Lookup Indexes**: For filtering (e.g., `status`, `place`, `season_id`)

Query patterns optimized:
- Leaderboard calculations (user + round + place)
- Pick lookups (user + round)
- Round results (round + place)
- Team lookups (name)

---

## Next Steps

1. ✅ Create migration files (DONE)
2. ✅ Create documentation (DONE)
3. ⏳ Run migrations on development database
4. ⏳ Test schema creation
5. ⏳ Design data migration scripts (future)
6. ⏳ Update application code to use `_v2` tables (future)

---

## Notes

- All `_v2` tables use `InnoDB` engine and `utf8mb4` charset
- All timestamps use `TIMESTAMP` type with automatic defaults
- Foreign keys use appropriate `ON DELETE` behavior (CASCADE for dependent data, RESTRICT for critical references)
- All tables include `created_at` and/or `updated_at` timestamps for audit trails

---

## Operational: Database Health Admin Page (added)

- Backend endpoints (admin-only):
  - `GET /api/admin/db-health/status` — connection status, version, ping, uptime
  - `GET /api/admin/db-health/schema` — live schema via INFORMATION_SCHEMA (tables, columns, constraints, FKs, indexes)
- Frontend: Settings → "Database Health" tab, auto-polls every 60s only while visible.
- Purpose: observability and live schema inspection without hardcoding.

