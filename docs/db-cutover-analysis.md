# Database Cutover Analysis: Legacy Tables → `_v2` Schema

## Overview

This document analyzes all references to legacy tables in the codebase that need to be migrated to the `_v2` schema. The analysis is organized by table for systematic migration.

---

## 1. `seasons` → `seasons_v2`

### Files and Functions Using `seasons`:

#### `backend/src/routes/seasons.ts`
- **Function**: `GET /` (get all seasons)
  - **Usage**: `SELECT * FROM seasons WHERE deleted_at IS NULL` - Fetches all active seasons with round counts
  - **Line**: ~43-49
  
- **Function**: `GET /default` (get default season)
  - **Usage**: `SELECT * FROM seasons WHERE is_default = TRUE` - Finds default season
  - **Line**: ~110
  
- **Function**: `GET /latest` (get latest season)
  - **Usage**: `SELECT * FROM seasons WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`
  - **Line**: ~119
  
- **Function**: `GET /active` (get active seasons)
  - **Usage**: `SELECT * FROM seasons WHERE is_active = TRUE AND deleted_at IS NULL`
  - **Line**: ~133
  
- **Function**: `POST /` (create season)
  - **Usage**: `UPDATE seasons SET is_default = FALSE` then `INSERT INTO seasons`
  - **Line**: ~294, 298
  
- **Function**: `PUT /:id` (update season)
  - **Usage**: `UPDATE seasons SET name = ?, year_start = ?, year_end = ?, is_default = ? WHERE id = ?`
  - **Line**: ~447
  
- **Function**: `POST /:id/set-default` (set default season)
  - **Usage**: `UPDATE seasons SET is_default = FALSE` then `UPDATE seasons SET is_default = TRUE WHERE id = ?`
  - **Line**: ~576, 579
  
- **Function**: `POST /:id/toggle-active` (toggle active status)
  - **Usage**: `UPDATE seasons SET is_active = ? WHERE id = ?`
  - **Line**: ~623
  
- **Function**: `POST /:id/end` (end season)
  - **Usage**: `UPDATE seasons SET ended_at = NOW() WHERE id = ?` - Sets ended timestamp
  - **Line**: ~767
  
- **Function**: `POST /:id/reopen` (reopen season)
  - **Usage**: `UPDATE seasons SET ended_at = NULL WHERE id = ?` - Clears ended timestamp
  - **Line**: ~835
  
- **Function**: `POST /:id/soft-delete` (soft delete)
  - **Usage**: `UPDATE seasons SET deleted_at = NOW(), is_active = FALSE, is_default = FALSE WHERE id = ?`
  - **Line**: ~880
  
- **Function**: `POST /:id/restore` (restore deleted)
  - **Usage**: `UPDATE seasons SET deleted_at = NULL WHERE id = ?`
  - **Line**: ~911
  
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `DELETE FROM seasons WHERE id = ?`
  - **Line**: ~1033
  
- **Function**: `GET /:id/copy-rounds` (copy rounds from another season)
  - **Usage**: Multiple SELECT queries on `seasons` for validation
  - **Line**: ~1203, 1211
  
- **Function**: `POST /:id/copy-rounds` (copy rounds)
  - **Usage**: `SELECT id, name FROM seasons WHERE id IN (?, ?)` - Validates source and target seasons
  - **Line**: ~1203

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (complete round)
  - **Usage**: `SELECT id, is_active, ended_at FROM seasons WHERE id = ?` - Validates season status
  - **Line**: ~474

#### `backend/src/routes/picks.ts`
- **Function**: `GET /validate/:token` (validate magic link)
  - **Usage**: `JOIN seasons s ON r.season_id = s.id` - Gets season name for display
  - **Line**: ~27, 136

#### `backend/src/services/settingsService.ts`
- **Function**: `getPointsSettingsForSeason(seasonId)`
  - **Usage**: `LEFT JOIN seasons s ON ... WHERE s.id = ?` - Checks if season is ended for historical settings
  - **Line**: ~274

#### `backend/src/services/reminderScheduler.ts`
- **Function**: Multiple functions
  - **Usage**: `JOIN seasons s ON r.season_id = s.id` - Gets season name for email context
  - **Line**: ~46, 103, 134, 448, 558, 694, 745

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data creation
  - **Usage**: `SELECT id FROM seasons WHERE is_default = TRUE` and `INSERT INTO seasons`
  - **Line**: ~22, 30, 431

**Summary**: 75+ references across 5 files. Main operations: CRUD on seasons, joins for season names, validation checks.

---

## 2. `rounds` → `rounds_v2`

### Files and Functions Using `rounds`:

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (complete round helper)
  - **Usage**: `SELECT sport_name, first_place_team, second_place_team, third_place_team, fourth_place_team, fifth_place_team FROM rounds WHERE id = ?`
  - **Note**: Uses denormalized result columns - these need to come from `round_results_v2` + `teams_v2`
  - **Line**: ~27-29
  
- **Function**: `GET /` (get all rounds)
  - **Usage**: `SELECT * FROM rounds WHERE deleted_at IS NULL ORDER BY created_at DESC`
  - **Line**: ~183
  
- **Function**: `GET /season/:seasonId` (get rounds for season)
  - **Usage**: `SELECT * FROM rounds WHERE season_id = ? AND deleted_at IS NULL`
  - **Line**: ~198
  
- **Function**: `GET /:id` (get single round)
  - **Usage**: `SELECT * FROM rounds WHERE id = ? AND deleted_at IS NULL`
  - **Line**: ~304
  
- **Function**: `POST /` (create round)
  - **Usage**: `INSERT INTO rounds (season_id, sport_name, pick_type, ...) VALUES (?, ?, ?, ...)`
  - **Note**: Does NOT insert result teams (those go to `round_results_v2` now)
  - **Line**: ~391
  
- **Function**: `PUT /:id` (update round)
  - **Usage**: `UPDATE rounds SET ... WHERE id = ?`
  - **Line**: ~512
  
- **Function**: `POST /:id/activate` (activate round)
  - **Usage**: `UPDATE rounds SET status = ? WHERE id = ?`
  - **Line**: ~553
  
- **Function**: `POST /:id/complete` (complete round)
  - **Usage**: 
    - `UPDATE rounds SET status = ?, first_place_team = ?, second_place_team = ?, ... WHERE id = ?`
    - **CRITICAL**: This writes to denormalized columns that don't exist in `rounds_v2`. Must write to `round_results_v2` + `teams_v2` instead.
    - **Line**: ~707
  
- **Function**: `POST /:id/lock` (lock round)
  - **Usage**: `UPDATE rounds SET status = ? WHERE id = ?`
  - **Line**: ~1034
  
- **Function**: `POST /:id/unlock` (unlock round)
  - **Usage**: `UPDATE rounds SET status = ? WHERE id = ?`
  - **Line**: ~1069
  
- **Function**: `POST /:id/soft-delete` (soft delete)
  - **Usage**: `UPDATE rounds SET deleted_at = NOW() WHERE id = ?`
  - **Line**: ~1134
  
- **Function**: `POST /:id/restore` (restore deleted)
  - **Usage**: `UPDATE rounds SET deleted_at = NULL WHERE id = ?`
  - **Line**: ~1162
  
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `DELETE FROM rounds WHERE id = ?`
  - **Line**: ~1249

#### `backend/src/services/scoringService.ts`
- **Function**: `calculateLeaderboard(seasonId)`
  - **Usage**: `SELECT id, sport_name, status, first_place_team, second_place_team, ... FROM rounds WHERE season_id = ?`
  - **Note**: Reads denormalized result columns - must join `round_results_v2` + `teams_v2`
  - **Line**: ~60
  
- **Function**: `calculateFinalStandings(seasonId)`
  - **Usage**: `LEFT JOIN rounds r ON r.season_id = ? AND r.deleted_at IS NULL`
  - **Line**: ~246
  
- **Function**: `calculateCumulativeGraph(seasonId)`
  - **Usage**: `SELECT id, sport_name, lock_time, updated_at FROM rounds WHERE season_id = ? AND status = 'completed'`
  - **Line**: ~287
  
- **Function**: `calculateUserTotalPoints(userId, seasonId)`
  - **Usage**: `JOIN rounds r ON s.round_id = r.id WHERE r.season_id = ?`
  - **Line**: ~389

#### `backend/src/routes/seasons.ts`
- **Function**: Multiple functions
  - **Usage**: Various queries counting rounds, copying rounds, checking round status
  - **Line**: ~45, 330, 348, 468, 475, 498, 684, 957, 967, 1048, 1056, 1161, 1220, 1230, 1260

#### `backend/src/services/reminderScheduler.ts`
- **Function**: Multiple reminder functions
  - **Usage**: `SELECT ... FROM rounds r WHERE ...` - Queries active/locked rounds for reminders
  - **Line**: ~45, 102, 133, 147, 223, 311, 558, 582, 620, 745

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO rounds` - Creates test rounds
  - **Line**: ~77, 95, 171, 425

**Summary**: 99+ references. **Critical**: Round completion logic writes to `first_place_team`, etc. which must be replaced with `round_results_v2` inserts.

---

## 3. `round_teams` → `round_teams_v2` + `teams_v2`

### Files and Functions Using `round_teams`:

#### `backend/src/routes/picks.ts`
- **Function**: `GET /validate/:token`
  - **Usage**: `SELECT team_name FROM round_teams WHERE round_id = ? ORDER BY team_name`
  - **Purpose**: Gets available teams for pick submission
  - **Line**: ~66, 163

#### `backend/src/routes/rounds.ts`
- **Function**: `GET /season/:seasonId`
  - **Usage**: `SELECT round_id, team_name FROM round_teams WHERE round_id IN (?)`
  - **Purpose**: Gets teams for all rounds in season
  - **Line**: ~236
  
- **Function**: `GET /:id`
  - **Usage**: `SELECT * FROM round_teams WHERE round_id = ? ORDER BY team_name`
  - **Purpose**: Gets teams for a specific round
  - **Line**: ~313
  
- **Function**: `POST /` (create round)
  - **Usage**: `INSERT INTO round_teams (round_id, team_name) VALUES ?`
  - **Purpose**: Adds teams to a new round
  - **Note**: Must change to: (1) Insert/get team_id from `teams_v2`, (2) Insert into `round_teams_v2`
  - **Line**: ~409
  
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `DELETE FROM round_teams WHERE round_id = ?`
  - **Line**: ~1085
  
- **Function**: `POST /:id/copy` (copy round)
  - **Usage**: `INSERT INTO round_teams (round_id, team_name) VALUES ?`
  - **Line**: ~1106
  
- **Function**: `GET /:id/teams` (get teams)
  - **Usage**: `SELECT * FROM round_teams WHERE round_id = ? ORDER BY team_name`
  - **Line**: ~1483

#### `backend/src/services/picksService.ts`
- **Function**: `validatePicksAgainstTeams(connection, roundId, picks)`
  - **Usage**: `SELECT team_name FROM round_teams WHERE round_id = ?`
  - **Purpose**: Validates picks against available teams
  - **Line**: ~66

#### `backend/src/routes/seasons.ts`
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM round_teams WHERE round_id IN (?)`
  - **Purpose**: Counts teams for cascade validation
  - **Line**: ~990, 1076

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO round_teams (round_id, team_name) VALUES ?`
  - **Line**: ~191

**Summary**: 14 references. **Critical**: All team name reads must join `round_teams_v2` → `teams_v2`. Team inserts must create/find team in `teams_v2` first.

---

## 4. `season_participants` → `season_participants_v2`

### Files and Functions Using `season_participants`:

#### `backend/src/services/scoringService.ts`
- **Function**: `calculateLeaderboard(seasonId)`
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id WHERE sp.season_id = ?`
  - **Line**: ~76
  
- **Function**: `calculateFinalStandings(seasonId)`
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id`
  - **Line**: ~245
  
- **Function**: `calculateCumulativeGraph(seasonId)`
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id WHERE sp.season_id = ?`
  - **Line**: ~297

#### `backend/src/routes/picks.ts`
- **Function**: `GET /validate/:token`
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id WHERE sp.season_id = ?`
  - **Purpose**: Gets users for email-based magic links
  - **Line**: ~54, 269, 288

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (completion email helper)
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id AND sp.season_id = ?`
  - **Line**: ~75, 206, 558, 828, 872

#### `backend/src/services/reminderScheduler.ts`
- **Function**: Multiple reminder functions
  - **Usage**: `JOIN season_participants sp ON u.id = sp.user_id` - Gets participants for reminders
  - **Line**: ~285, 425, 508, 597, 673

#### `backend/src/routes/seasons.ts`
- **Function**: `POST /:id/copy-rounds` (copy rounds)
  - **Usage**: `INSERT INTO season_participants (season_id, user_id) VALUES ?`
  - **Line**: ~308
  
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM season_participants WHERE season_id = ?`
  - **Line**: ~953, 1044

#### `backend/src/routes/season-participants.ts`
- **Function**: `GET /season/:seasonId` (get participants)
  - **Usage**: `SELECT ... FROM season_participants sp WHERE sp.season_id = ?`
  - **Line**: ~19
  
- **Function**: `POST /` (add participant)
  - **Usage**: `INSERT IGNORE INTO season_participants (season_id, user_id) VALUES (?, ?)`
  - **Line**: ~54
  
- **Function**: `POST /bulk` (bulk add)
  - **Usage**: `INSERT IGNORE INTO season_participants (season_id, user_id) VALUES ?`
  - **Line**: ~85
  
- **Function**: `DELETE /:seasonId/:userId` (remove participant)
  - **Usage**: `DELETE FROM season_participants WHERE season_id = ? AND user_id = ?`
  - **Line**: ~112

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO season_participants (season_id, user_id) VALUES ?`
  - **Line**: ~70

**Summary**: 25 references. Mainly joins to get participants and bulk inserts. Structure is same, just needs FK to `seasons_v2`.

---

## 5. `picks` → `picks_v2`

### Files and Functions Using `picks`:

#### `backend/src/services/scoringService.ts`
- **Function**: `calculateLeaderboard(seasonId)`
  - **Usage**: `SELECT p.*, r.status as round_status, ... FROM picks p JOIN rounds r ON p.round_id = r.id WHERE p.round_id IN (?)`
  - **Line**: ~88-95

#### `backend/src/services/picksService.ts`
- **Function**: `submitPick(connection, options)`
  - **Usage**: 
    - `INSERT INTO picks (user_id, round_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`
    - `SELECT id FROM picks WHERE user_id = ? AND round_id = ?`
  - **Purpose**: Creates or updates pick record
  - **Line**: ~121, 132
  
- **Function**: `getPick(connection, userId, roundId)`
  - **Usage**: `SELECT * FROM picks WHERE user_id = ? AND round_id = ?`
  - **Line**: ~175

#### `backend/src/routes/picks.ts`
- **Function**: `GET /validate/:token`
  - **Usage**: `SELECT * FROM picks WHERE user_id IN (?) AND round_id = ?`
  - **Purpose**: Gets existing picks for validation
  - **Line**: ~73
  
- **Function**: `POST /submit/:token`
  - **Usage**: `SELECT * FROM picks WHERE user_id = ? AND round_id = ?`
  - **Purpose**: Checks for existing pick before submission
  - **Line**: ~169

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (completion email helper)
  - **Usage**: `SELECT p.user_id, pi.pick_value FROM picks p LEFT JOIN pick_items pi ON p.id = pi.pick_id WHERE p.round_id = ?`
  - **Line**: ~48
  
- **Function**: `POST /:id/complete` (complete round)
  - **Usage**: `SELECT * FROM picks WHERE round_id = ?`
  - **Purpose**: Gets all picks for scoring calculation
  - **Line**: ~713
  
- **Function**: `GET /:id/participants` (get participants)
  - **Usage**: `SELECT round_id, user_id FROM picks WHERE round_id IN (?)`
  - **Line**: ~218
  
- **Function**: `GET /:id/teams` (get picked teams)
  - **Usage**: `SELECT ... FROM picks p JOIN pick_items pi ON p.id = pi.pick_id WHERE p.round_id = ?`
  - **Line**: ~1498

#### `backend/src/routes/admin-picks.ts`
- **Function**: `POST /` (create admin pick)
  - **Usage**: 
    - `SELECT p.id, pi.pick_value FROM picks p LEFT JOIN pick_items pi ON p.id = pi.pick_id WHERE p.round_id = ? AND p.user_id = ?`
    - `UPDATE picks SET admin_edited = TRUE, original_pick = ?, edited_by_admin_id = ?, edited_at = NOW() WHERE round_id = ? AND user_id = ?`
  - **Line**: ~41-44, 68-75
  
- **Function**: `GET /:roundId/:userId` (get admin pick)
  - **Usage**: `SELECT * FROM picks WHERE round_id = ? AND user_id = ?`
  - **Line**: ~101

#### `backend/src/services/reminderScheduler.ts`
- **Function**: Multiple reminder functions
  - **Usage**: `LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?` - Finds users without picks
  - **Line**: ~288, 426, 600, 674

#### `backend/src/routes/seasons.ts`
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM picks WHERE round_id IN (?)`
  - **Purpose**: Counts picks for cascade validation
  - **Line**: ~982, 1068

#### `backend/src/routes/users.ts`
- **Function**: `GET /:id/has-data` (check if user has data)
  - **Usage**: `SELECT COUNT(*) as count FROM picks WHERE user_id = ?`
  - **Line**: ~29, 180

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO picks (user_id, round_id) VALUES (?, ?)`
  - **Line**: ~219, 289, 319

**Summary**: 93 references. Main operations: Create/update picks, check for existing picks, join with pick_items for display.

---

## 6. `pick_items` → `pick_items_v2` + `teams_v2`

### Files and Functions Using `pick_items`:

#### `backend/src/services/picksService.ts`
- **Function**: `submitPick(connection, options)`
  - **Usage**: 
    - `DELETE FROM pick_items WHERE pick_id = ?`
    - `INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES ?`
  - **Purpose**: Deletes old pick items, inserts new ones
  - **Note**: `pick_value` is team name string - must change to `team_id` with lookup in `teams_v2`
  - **Line**: ~145, 156
  
- **Function**: `getPick(connection, userId, roundId)`
  - **Usage**: `SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number`
  - **Purpose**: Gets pick items for a pick
  - **Note**: Must join `teams_v2` to get `name` from `team_id`
  - **Line**: ~184

#### `backend/src/services/scoringService.ts`
- **Function**: `calculateLeaderboard(seasonId)`
  - **Usage**: `SELECT * FROM pick_items WHERE pick_id IN (?)`
  - **Purpose**: Gets pick items for leaderboard display
  - **Line**: ~102

#### `backend/src/routes/picks.ts`
- **Function**: `GET /validate/:token`
  - **Usage**: `SELECT pick_id, pick_number, pick_value FROM pick_items WHERE pick_id IN (?) ORDER BY pick_id, pick_number`
  - **Purpose**: Gets pick items for email-based magic links
  - **Line**: ~82
  
- **Function**: `POST /submit/:token`
  - **Usage**: `SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number`
  - **Purpose**: Gets existing pick items
  - **Line**: ~177

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (completion email helper)
  - **Usage**: `LEFT JOIN pick_items pi ON p.id = pi.pick_id`
  - **Line**: ~49
  
- **Function**: `POST /:id/complete` (complete round)
  - **Usage**: `SELECT * FROM pick_items WHERE pick_id IN (?)`
  - **Purpose**: Gets pick items for scoring calculation
  - **Line**: ~722
  
- **Function**: `GET /:id/teams` (get picked teams)
  - **Usage**: `JOIN pick_items pi ON p.id = pi.pick_id WHERE p.round_id = ?`
  - **Line**: ~1499

#### `backend/src/routes/admin-picks.ts`
- **Function**: `POST /` (create admin pick)
  - **Usage**: `LEFT JOIN pick_items pi ON p.id = pi.pick_id`
  - **Line**: ~44
  
- **Function**: `GET /:roundId/:userId` (get admin pick)
  - **Usage**: `SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number`
  - **Line**: ~111

#### `backend/src/services/reminderScheduler.ts`
- **Function**: Reminder functions
  - **Usage**: `LEFT JOIN pick_items pi ON p.id = pi.pick_id`
  - **Purpose**: Checks if user has picks
  - **Line**: ~288, 600

#### `backend/src/routes/seasons.ts`
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM pick_items pi JOIN picks p ON pi.pick_id = p.id WHERE p.round_id IN (?)`
  - **Line**: ~1005, 1090

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO pick_items (pick_id, pick_number, pick_value) VALUES (?, ?, ?)`
  - **Line**: ~231, 307, 331

**Summary**: 18 references. **Critical**: All `pick_value` (team name string) must be replaced with `team_id` lookups. When reading, must join `teams_v2` to get `name`.

---

## 7. `scores` → `score_details_v2` + `scoring_rules_v2` + `round_results_v2`

### Files and Functions Using `scores`:

#### `backend/src/services/scoringService.ts`
- **Function**: `calculateLeaderboard(seasonId)`
  - **Usage**: `SELECT * FROM scores WHERE round_id IN (?)`
  - **Purpose**: Gets all scores for leaderboard calculation
  - **Note**: Reads denormalized columns (`first_place`, `second_place`, etc.) - must use `score_details_v2` instead
  - **Line**: ~112
  
- **Function**: `calculateFinalStandings(seasonId)`
  - **Usage**: Complex SQL with `LEFT JOIN scores s ON u.id = s.user_id AND s.round_id = r.id` and SUM of `s.first_place * points`, etc.
  - **Purpose**: Calculates final standings for ending a season
  - **Note**: Entire calculation must be rewritten to use `score_details_v2` + `scoring_rules_v2`
  - **Line**: ~236-251
  
- **Function**: `calculateCumulativeGraph(seasonId)`
  - **Usage**: `SELECT * FROM scores WHERE round_id IN (?)`
  - **Purpose**: Gets scores for cumulative graph
  - **Line**: ~308
  
- **Function**: `calculateUserTotalPoints(userId, seasonId)`
  - **Usage**: `SELECT ... SUM(COALESCE(s.first_place, 0) * ?) + SUM(COALESCE(s.second_place, 0) * ?) + ... FROM scores s JOIN rounds r ON s.round_id = r.id`
  - **Purpose**: Calculates total points for a user
  - **Note**: Must rewrite to use `score_details_v2` + `scoring_rules_v2`
  - **Line**: ~378-391

#### `backend/src/routes/rounds.ts`
- **Function**: `POST /:id/complete` (completion email helper)
  - **Usage**: `LEFT JOIN scores s ON u.id = s.user_id AND s.round_id IN (...)`
  - **Purpose**: Gets scores for email leaderboard
  - **Line**: ~74
  
- **Function**: `POST /:id/complete` (complete round) - **CRITICAL FUNCTION**
  - **Usage**: 
    - `INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place, no_pick) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    - **Purpose**: Calculates and stores scores for each user's picks
    - **Logic**: 
      - For single pick type: Compares `pick_items.pick_value` against `rounds.first_place_team`, etc. to determine placement
      - For multiple pick type: Uses manual scores from request
      - Creates score records with flags (first_place=1, second_place=1, etc.)
    - **Note**: This entire function must be rewritten:
      - Instead of writing to `scores`, write to `score_details_v2` with `(user_id, round_id, place, count)`
      - Instead of reading `rounds.first_place_team`, read from `round_results_v2` + `teams_v2`
      - Instead of comparing `pick_items.pick_value` (string), compare `pick_items_v2.team_id` with `round_results_v2.team_id`
    - **Line**: ~773, 808, 842

#### `backend/src/routes/seasons.ts`
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM scores WHERE round_id IN (?)`
  - **Purpose**: Counts scores for cascade validation
  - **Line**: ~986, 1072

#### `backend/src/routes/users.ts`
- **Function**: `GET /:id/has-data` (check if user has data)
  - **Usage**: `SELECT COUNT(*) as count FROM scores WHERE user_id = ?`
  - **Line**: ~35, 185

#### `backend/src/routes/admin-seed.ts`
- **Function**: Seed data
  - **Usage**: `INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  - **Line**: ~252

**Summary**: 18 references. **MOST CRITICAL**: Round completion logic in `routes/rounds.ts` must be completely rewritten to use normalized scoring.

---

## 8. `season_winners` → `season_winners_v2`

### Files and Functions Using `season_winners`:

#### `backend/src/routes/seasons.ts`
- **Function**: `POST /:id/end` (end season) - **CRITICAL FUNCTION**
  - **Usage**: 
    - `INSERT INTO season_winners (season_id, place, user_id, total_points, points_first_place, points_second_place, points_third_place, points_fourth_place, points_fifth_place, points_sixth_plus_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    - **Purpose**: Stores final season standings with historical point settings
    - **Note**: v2 table does NOT have per-place point columns - those are in `scoring_rules_v2`. Must insert only `(season_id, user_id, place, total_points)`
    - **Line**: ~758
  
- **Function**: `POST /:id/end` (after insert)
  - **Usage**: `SELECT sw.*, u.name as user_name FROM season_winners sw JOIN users u ON sw.user_id = u.id WHERE sw.season_id = ? ORDER BY sw.place ASC`
  - **Purpose**: Retrieves winners for response
  - **Line**: ~773
  
- **Function**: `POST /:id/reopen` (reopen season)
  - **Usage**: `DELETE FROM season_winners WHERE season_id = ?`
  - **Line**: ~841
  
- **Function**: `GET /:id/standings` (get standings)
  - **Usage**: `SELECT ... FROM season_winners sw WHERE sw.season_id = ?`
  - **Purpose**: Gets historical standings for ended seasons
  - **Line**: ~149, 178

#### `backend/src/services/settingsService.ts`
- **Function**: `getPointsSettingsForSeason(seasonId)`
  - **Usage**: `LEFT JOIN season_winners sw ON s.id = sw.season_id WHERE sw.place = 1 LIMIT 1`
  - **Purpose**: Gets historical point settings from ended seasons
  - **Note**: This logic must change - historical points are in `scoring_rules_v2`, not `season_winners_v2`
  - **Line**: ~275

#### `backend/src/routes/users.ts`
- **Function**: `GET /:id/has-data` (check if user has data)
  - **Usage**: `SELECT COUNT(*) as count FROM season_winners WHERE user_id = ?`
  - **Line**: ~41, 190

#### `backend/src/routes/seasons.ts`
- **Function**: `DELETE /:id` (permanent delete)
  - **Usage**: `SELECT COUNT(*) as count FROM season_winners WHERE season_id = ?`
  - **Line**: ~961, 1052

**Summary**: 16 references. **Critical**: End season logic must be updated to not store point settings (those are in `scoring_rules_v2`). Historical settings lookup must use `scoring_rules_v2` instead.

---

## Key Findings Summary

### Most Complex Migrations:

1. **Scoring System** (`scores` → `score_details_v2` + `scoring_rules_v2`):
   - `ScoringService.calculateLeaderboard()` - Full rewrite
   - `ScoringService.calculateFinalStandings()` - Full rewrite  
   - `ScoringService.calculateCumulativeGraph()` - Full rewrite
   - `ScoringService.calculateUserTotalPoints()` - Full rewrite
   - `routes/rounds.ts POST /:id/complete` - Complete rewrite of scoring logic

2. **Round Results** (`rounds.first_place_team` → `round_results_v2` + `teams_v2`):
   - `routes/rounds.ts POST /:id/complete` - Must write to `round_results_v2` instead of denormalized columns
   - All reads of `rounds.first_place_team`, etc. must join `round_results_v2` + `teams_v2`

3. **Team References** (`pick_items.pick_value` → `pick_items_v2.team_id` + `teams_v2`):
   - `PicksService.submitPick()` - Must lookup/create team in `teams_v2`, store `team_id`
   - All reads of `pick_items.pick_value` must join `teams_v2` to get `name`
   - `round_teams.team_name` → `round_teams_v2` + `teams_v2` joins

4. **Season Winners** (`season_winners` → `season_winners_v2`):
   - `routes/seasons.ts POST /:id/end` - Remove point columns from INSERT
   - `SettingsService.getPointsSettingsForSeason()` - Use `scoring_rules_v2` instead

### Files Requiring Changes (Priority Order):

**High Priority (Core Game Logic):**
1. `backend/src/services/scoringService.ts` - Complete rewrite
2. `backend/src/routes/rounds.ts` - Round completion, team management
3. `backend/src/services/picksService.ts` - Team lookups
4. `backend/src/routes/seasons.ts` - Season ending, standings

**Medium Priority (Route Handlers):**
5. `backend/src/routes/picks.ts` - Pick submission/validation
6. `backend/src/routes/season-participants.ts` - Participant management
7. `backend/src/routes/admin-picks.ts` - Admin pick management

**Lower Priority (Supporting):**
8. `backend/src/services/reminderScheduler.ts` - Reminder queries
9. `backend/src/services/settingsService.ts` - Historical settings lookup
10. `backend/src/routes/users.ts` - Data counting queries
11. `backend/src/routes/admin-seed.ts` - Seed data (test only)

---

## Next Steps

After this analysis, proceed with Step 2: Implementation, starting with the highest priority items and working through systematically.

