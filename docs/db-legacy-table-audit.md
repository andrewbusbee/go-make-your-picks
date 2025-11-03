# Legacy Database Table Usage Audit

**Date**: January 2025  
**Purpose**: Identify remaining references to legacy tables (without `_v2`) that should be migrated

---

## Summary

### Legacy Tables Still Referenced

| Legacy Table | Read Queries | Write Queries | Total References |
|-------------|--------------|---------------|------------------|
| `seasons` | 3 | 0 | 3 |
| `rounds` | 5 | 2 | 7 |
| `round_teams` | 2 | 0 | 2 |
| `season_participants` | 2 | 1 | 3 |
| `picks` | 4 | 0 | 4 |
| `pick_items` | 2 | 0 | 2 |
| `scores` | 2 | 0 | 2 |
| `season_winners` | 0 | 0 | 0 |

**Total Legacy Table References**: 23 SQL queries

### Files Performing Writes to Legacy Tables

⚠️ **CRITICAL**: The following files still perform WRITES to legacy tables:

1. **`backend/src/routes/seasons.ts`** (3 write operations)
   - Line 498: `INSERT INTO rounds` - Copy sports from source season
   - Line 1284: `INSERT INTO rounds` - Copy sports from source season
   - Note: These are in the season copying functionality

2. **`backend/src/routes/season-participants.ts`** (1 write operation)
   - Line 85: `INSERT IGNORE INTO season_participants` - Bulk add all users to season

---

## Detailed Findings

### 1. `seasons` Table

#### File: `backend/src/routes/seasons.ts`

**Line 650** - READ (SELECT)
```sql
SELECT * FROM seasons WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
```
- **Context**: `GET /deleted` endpoint - Get deleted seasons (admin only)
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `seasons_v2`**

**Line 1227** - READ (SELECT)
```sql
SELECT id, name FROM seasons WHERE id IN (?, ?) AND deleted_at IS NULL
```
- **Context**: `POST /copy-sports` endpoint - Verify both seasons exist
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `seasons_v2`**

**Line 1331** - READ (SELECT - in comment/query)
```sql
FROM seasons 
```
- **Context**: Part of a larger query (line 1331)
- **Operation**: SELECT (appears to be incomplete in audit)
- **Status**: ⚠️ **Should use `seasons_v2`**

---

### 2. `rounds` Table

#### File: `backend/src/routes/seasons.ts`

**Line 498** - WRITE (INSERT)
```sql
INSERT INTO rounds (season_id, sport_name, lock_time, status, created_at) VALUES ...
```
- **Context**: `POST /` (create season) - Copy sports from source season
- **Operation**: INSERT
- **Status**: 🔴 **CRITICAL - Should use `rounds_v2`**

**Line 1244** - READ (SELECT)
```sql
SELECT sport_name FROM rounds WHERE season_id = ? AND deleted_at IS NULL
```
- **Context**: `POST /copy-sports` - Get sports from source season
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `rounds_v2`**

**Line 1254** - READ (SELECT)
```sql
SELECT sport_name FROM rounds WHERE season_id = ? AND deleted_at IS NULL
```
- **Context**: `POST /copy-sports` - Get existing sports in target season
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `rounds_v2`**

**Line 1284** - WRITE (INSERT)
```sql
INSERT INTO rounds (season_id, sport_name, lock_time, status, created_at) VALUES ...
```
- **Context**: `POST /copy-sports` - Insert new sports into target season
- **Operation**: INSERT
- **Status**: 🔴 **CRITICAL - Should use `rounds_v2`**

#### File: `backend/src/routes/rounds.ts`

**Line 1233** - READ (SELECT)
```sql
SELECT * FROM rounds WHERE id = ? AND deleted_at IS NULL
```
- **Context**: `POST /:id/soft-delete` - Check if round exists before soft delete
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `rounds_v2`** (Note: The actual UPDATE uses `rounds_v2` on line 1243)

**Line 1261** - READ (SELECT)
```sql
SELECT * FROM rounds WHERE id = ? AND deleted_at IS NOT NULL
```
- **Context**: `POST /:id/restore` - Check if round exists and is deleted before restore
- **Operation**: SELECT
- **Status**: ⚠️ **Should use `rounds_v2`**

#### File: `backend/src/routes/picks.ts`

**Line 245** - READ (JOIN)
```sql
JOIN rounds r ON eml.round_id = r.id
```
- **Context**: `GET /validate/:token` - Join with email_magic_links to get round details
- **Operation**: JOIN (SELECT)
- **Status**: ⚠️ **Should use `rounds_v2`**

**Line 339** - READ (JOIN)
```sql
JOIN rounds r ON ml.round_id = r.id
```
- **Context**: `GET /validate/:token` - Fallback join with magic_links to get round details
- **Operation**: JOIN (SELECT)
- **Status**: ⚠️ **Should use `rounds_v2`**

---

### 3. `round_teams` Table

#### File: `backend/src/routes/seasons.ts`

**Line 1014** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM round_teams WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Count cascade deletes before permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `round_teams_v2`**

**Line 1100** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM round_teams WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Verify cascade deletes after permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `round_teams_v2`**

---

### 4. `season_participants` Table

#### File: `backend/src/routes/season-participants.ts`

**Line 85** - WRITE (INSERT)
```sql
INSERT IGNORE INTO season_participants (season_id, user_id) VALUES ?
```
- **Context**: `POST /bulk-add-all` - Bulk add all users to season
- **Operation**: INSERT
- **Status**: 🔴 **CRITICAL - Should use `season_participants_v2`**

#### File: `backend/src/routes/picks.ts`

**Line 285** - READ (JOIN)
```sql
JOIN season_participants sp ON u.id = sp.user_id
```
- **Context**: `GET /validate/:token` - Validate user is participant in season
- **Operation**: JOIN (SELECT)
- **Status**: ⚠️ **Should use `season_participants_v2`**

**Line 304** - READ (LEFT JOIN)
```sql
LEFT JOIN season_participants sp ON u.id = sp.user_id
```
- **Context**: `GET /validate/:token` - Debug query for user validation
- **Operation**: LEFT JOIN (SELECT)
- **Status**: ⚠️ **Should use `season_participants_v2`**

---

### 5. `picks` Table

#### File: `backend/src/routes/seasons.ts`

**Line 1006** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM picks WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Count cascade deletes before permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `picks_v2`**

**Line 1030** - READ (JOIN)
```sql
JOIN picks p ON pi.pick_id = p.id
```
- **Context**: `DELETE /:id` - Count pick_items via picks join
- **Operation**: JOIN (SELECT)
- **Status**: ⚠️ **Should use `picks_v2`**

**Line 1092** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM picks WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Verify cascade deletes after permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `picks_v2`**

**Line 1115** - READ (JOIN)
```sql
JOIN picks p ON pi.pick_id = p.id
```
- **Context**: `DELETE /:id` - Verify pick_items cascade deletes after permanent deletion
- **Operation**: JOIN (SELECT)
- **Status**: ⚠️ **Should use `picks_v2`**

---

### 6. `pick_items` Table

#### File: `backend/src/routes/seasons.ts`

**Line 1029** - READ (SELECT with JOIN)
```sql
SELECT COUNT(*) as count FROM pick_items pi 
JOIN picks p ON pi.pick_id = p.id 
WHERE p.round_id IN (?)
```
- **Context**: `DELETE /:id` - Count cascade deletes before permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `pick_items_v2`**

**Line 1114** - READ (SELECT with JOIN)
```sql
SELECT COUNT(*) as count FROM pick_items pi 
JOIN picks p ON pi.pick_id = p.id 
WHERE p.round_id IN (?)
```
- **Context**: `DELETE /:id` - Verify cascade deletes after permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `pick_items_v2`**

---

### 7. `scores` Table

#### File: `backend/src/routes/seasons.ts`

**Line 1010** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM scores WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Count cascade deletes before permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `score_details_v2`**

**Line 1096** - READ (SELECT)
```sql
SELECT COUNT(*) as count FROM scores WHERE round_id IN (?)
```
- **Context**: `DELETE /:id` - Verify cascade deletes after permanent deletion
- **Operation**: SELECT (count check)
- **Status**: ⚠️ **Should use `score_details_v2`**

---

### 8. `season_winners` Table

**No SQL references found** ✅

---

## Files with Mixed Legacy and V2 References

### `backend/src/routes/seasons.ts`
- **Uses `seasons_v2`** for most operations ✅
- **Uses `rounds_v2`** for most operations ✅
- **Still uses `seasons`** for:
  - GET deleted seasons (line 650)
  - POST copy-sports verification (line 1227)
- **Still uses `rounds`** for:
  - POST copy-sports reads (lines 1244, 1254)
  - POST copy-sports writes (lines 498, 1284)
- **Still uses legacy tables** for cascade delete counting (lines 1006-1014, 1092-1100)

### `backend/src/routes/rounds.ts`
- **Uses `rounds_v2`** for most operations ✅
- **Still uses `rounds`** for existence checks (lines 1233, 1261) - Note: These are read-only checks before operations that use `rounds_v2`

### `backend/src/routes/picks.ts`
- **Uses `picks_v2`** and `pick_items_v2` for most operations ✅
- **Still uses `rounds`** for JOINs in magic link validation (lines 245, 339)
- **Still uses `season_participants`** for JOINs in validation (lines 285, 304)

### `backend/src/routes/season-participants.ts`
- **Uses `season_participants_v2`** for most operations ✅
- **Still uses `season_participants`** for bulk add all users (line 85)

---

## Priority Classification

### 🔴 HIGH PRIORITY (Write Operations)

These operations WRITE to legacy tables and must be fixed immediately:

1. **`routes/seasons.ts`** - Line 498: `INSERT INTO rounds` (copy sports when creating season)
2. **`routes/seasons.ts`** - Line 1284: `INSERT INTO rounds` (copy sports endpoint)
3. **`routes/season-participants.ts`** - Line 85: `INSERT IGNORE INTO season_participants` (bulk add all users)

### ⚠️ MEDIUM PRIORITY (Read Operations - Core Functionality)

These operations READ from legacy tables in critical paths:

1. **`routes/seasons.ts`**:
   - Line 650: Get deleted seasons
   - Line 1227: Verify seasons exist (copy sports)
   - Lines 1244, 1254: Read rounds for copy sports
   
2. **`routes/rounds.ts`**:
   - Lines 1233, 1261: Existence checks before soft delete/restore
   
3. **`routes/picks.ts`**:
   - Lines 245, 339: JOINs with rounds for magic link validation
   - Lines 285, 304: JOINs with season_participants for validation

### ⚠️ LOW PRIORITY (Read Operations - Cascade Delete Validation)

These operations are only used for counting/validation before/after cascade deletes:

1. **`routes/seasons.ts`**:
   - Lines 1006, 1010, 1014: Count cascade deletes before deletion
   - Lines 1029, 1030: Count pick_items via picks join
   - Lines 1092, 1096, 1100: Verify cascade deletes after deletion
   - Lines 1114, 1115: Verify pick_items cascade deletes

**Note**: These could potentially be removed or updated to use `_v2` tables if the foreign key CASCADE constraints are working correctly.

---

## Recommended Action Plan

### Phase 1: Fix Write Operations (Critical)
1. Update `routes/season-participants.ts` line 85 to use `season_participants_v2`
2. Update `routes/seasons.ts` lines 498 and 1284 to use `rounds_v2`

### Phase 2: Fix Read Operations (Core Functionality)
1. Update `routes/seasons.ts`:
   - Line 650: Use `seasons_v2` for deleted seasons
   - Lines 1227, 1244, 1254: Use `seasons_v2` and `rounds_v2` for copy sports
2. Update `routes/rounds.ts`:
   - Lines 1233, 1261: Use `rounds_v2` for existence checks
3. Update `routes/picks.ts`:
   - Lines 245, 339: Use `rounds_v2` for JOINs
   - Lines 285, 304: Use `season_participants_v2` for JOINs

### Phase 3: Fix Cascade Delete Validation (Optional)
1. Update `routes/seasons.ts` cascade delete counting to use `_v2` tables
2. Consider removing these validations if foreign key CASCADE constraints are reliable

---

## Notes

- All migration files (in `backend/src/migrations/`) contain references to legacy tables in comments/documentation - these are **intentional** and **should not be changed**.
- The `dbHealthCheck.ts` utility lists legacy table names for health monitoring - this may need updating to include `_v2` tables.
- Most references in `routes/seasons.ts` for cascade delete validation are read-only checks that could be updated to use `_v2` tables or removed if CASCADE constraints are trusted.

