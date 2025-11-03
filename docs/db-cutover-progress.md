# Database Cutover to V2 Schema - Implementation Progress

## Summary

This document tracks the progress of migrating the application codebase from legacy tables to the normalized `_v2` schema.

## ✅ Completed Components

### 1. Core Utilities
- **`backend/src/utils/teamHelpers.ts`** (NEW)
  - `getOrCreateTeam()` - Gets or creates team in teams_v2
  - `getTeamIdByName()` - Gets team ID by name
  - `getTeamNameById()` - Gets team name by ID
  - `getTeamIdsByNames()` - Bulk lookup team IDs

### 2. Services Layer
- **`backend/src/services/picksService.ts`** ✅
  - `validatePicksAgainstTeams()` - Uses `round_teams_v2` + `teams_v2`
  - `submitPick()` - Uses `picks_v2`, `pick_items_v2` with `team_id` references
  - `getPick()` - Uses `picks_v2`, `pick_items_v2` + `teams_v2` joins

- **`backend/src/services/scoringService.ts`** ✅
  - `calculateLeaderboard()` - Uses `rounds_v2`, `season_participants_v2`, `picks_v2`, `pick_items_v2`, `score_details_v2`, `scoring_rules_v2`
  - `calculateFinalStandings()` - Uses `score_details_v2` + `scoring_rules_v2`
  - `calculateCumulativeGraph()` - Uses `rounds_v2`, `score_details_v2`, `scoring_rules_v2`
  - `calculateUserTotalPoints()` - Uses `score_details_v2` + `scoring_rules_v2`

### 3. Route Handlers - Critical Path
- **`backend/src/routes/rounds.ts`** ⚠️ PARTIAL
  - ✅ Round completion logic (`POST /:id/complete`)
    - Writes to `round_results_v2` instead of `rounds.first_place_team`, etc.
    - Calculates scores and writes to `score_details_v2` instead of `scores`
    - Compares `pick_items_v2.team_id` with `round_results_v2.team_id`
  - ✅ `prepareCompletionEmailData()` helper - Uses v2 tables
  - ⚠️ Other round CRUD operations still need updating (GET, POST, PUT, DELETE, etc.)

- **`backend/src/routes/picks.ts`** ⚠️ PARTIAL
  - ✅ `GET /validate/:token` - Uses `rounds_v2`, `seasons_v2`, `season_participants_v2`, `round_teams_v2`, `picks_v2`, `pick_items_v2`
  - ⚠️ `POST /submit/:token` - Uses `PicksService` (already updated), but may need route-level updates

### 4. Analysis Document
- **`docs/db-cutover-analysis.md`** ✅
  - Complete analysis of all legacy table usage across the codebase

## ✅ Recently Completed (Step 2 Implementation)

### Major Updates Completed
- **`routes/rounds.ts`** ✅ COMPLETE
  - All GET routes updated to use `rounds_v2`, `round_teams_v2` + `teams_v2`, `picks_v2`, `pick_items_v2`
  - All POST routes (create, activate, lock, unlock, complete) updated
  - All PUT routes (update) updated
  - All DELETE routes (soft delete, restore, permanent delete) updated
  - Team management (add/delete teams) updated to use `round_teams_v2` + `teams_v2`
  - Round completion logic fully migrated to `round_results_v2` + `score_details_v2`
  - Helper functions (`prepareCompletionEmailData`, `calculateUserPerformanceData`) updated

- **`routes/seasons.ts`** ✅ COMPLETE
  - All GET routes updated to use `seasons_v2`, `rounds_v2`, `season_winners_v2`
  - POST create season updated to use `seasons_v2` + `season_participants_v2` + `rounds_v2`
  - POST end season updated to use `season_winners_v2` + `scoring_rules_v2` (stores point values historically)
  - POST reopen season updated to use `season_winners_v2`
  - All PUT routes (update, set default, toggle active) updated
  - All DELETE routes (soft delete, restore, permanent delete) updated
  - Champions query updated to use `seasons_v2` + `season_winners_v2`

## ⚠️ Remaining Work

### High Priority (Core Game Logic)

1. **`backend/src/routes/rounds.ts`** - Complete remaining operations
   - GET `/` - List all rounds
   - GET `/season/:seasonId` - Get rounds for season
   - GET `/:id` - Get single round
   - POST `/` - Create round
   - PUT `/:id` - Update round
   - POST `/:id/activate` - Activate round
   - POST `/:id/lock` - Lock round
   - POST `/:id/unlock` - Unlock round
   - POST `/:id/soft-delete` - Soft delete
   - POST `/:id/restore` - Restore deleted
   - DELETE `/:id` - Permanent delete
   - POST `/:id/copy` - Copy round
   - GET `/:id/participants` - Get participants
   - GET `/:id/teams` - Get teams for round
   - Update team management to use `round_teams_v2` + `teams_v2`

2. **`backend/src/routes/seasons.ts`** - Season operations
   - GET `/` - List seasons (uses `seasons_v2`)
   - POST `/` - Create season (uses `seasons_v2`)
   - PUT `/:id` - Update season (uses `seasons_v2`)
   - POST `/:id/end` - End season (uses `season_winners_v2`)
   - POST `/:id/reopen` - Reopen season (uses `season_winners_v2`)
   - All other season CRUD operations

3. **`backend/src/routes/season-participants.ts`** - Participant management
   - Update all queries to use `season_participants_v2`

### Medium Priority (Route Handlers)

4. **`backend/src/routes/admin-picks.ts`** - Admin pick management
   - Update to use `picks_v2`, `pick_items_v2` + `teams_v2`

5. **`backend/src/routes/picks.ts`** - Complete pick routes
   - `POST /submit/:token` - Verify uses v2 tables throughout

### Lower Priority (Supporting Services)

6. **`backend/src/services/reminderScheduler.ts`** - Email reminders
   - Update queries to use `rounds_v2`, `season_participants_v2`, `picks_v2`, `pick_items_v2`

7. **`backend/src/services/settingsService.ts`** - Settings management
   - `getPointsSettingsForSeason()` - Update to use `scoring_rules_v2` instead of `season_winners`

8. **`backend/src/routes/users.ts`** - User management
   - Update data counting queries to use v2 tables

9. **`backend/src/routes/admin-seed.ts`** - Seed data
   - Update seed data to use v2 tables (test/development only)

## Key Implementation Notes

### Scoring System Migration
- **Old**: `scores` table with columns `first_place`, `second_place`, etc.
- **New**: `score_details_v2` with rows `(user_id, round_id, place, count)`
  - `place=0` = no pick
  - `place=1-10` = finishing places
  - `count` = how many picks matched (typically 0 or 1)

### Team References
- **Old**: `pick_items.pick_value` (VARCHAR team name), `round_teams.team_name` (VARCHAR)
- **New**: `pick_items_v2.team_id` → `teams_v2.id`, `round_teams_v2.team_id` → `teams_v2.id`
- All reads must join `teams_v2` to get team names
- All writes must lookup/create team in `teams_v2` first

### Round Results
- **Old**: `rounds.first_place_team`, `rounds.second_place_team`, etc. (denormalized columns)
- **New**: `round_results_v2(round_id, place, team_id)` (normalized rows)

### Scoring Rules
- **Old**: `numeric_settings.points_*_place` (global) + `season_winners.points_*_place` (per season)
- **New**: `scoring_rules_v2(season_id, place, points)` (normalized per season)
- Fallback to `SettingsService` if `scoring_rules_v2` is empty (backward compatibility)

## Testing Checklist

After completing the migration, test:

1. ✅ Can create a new season (`seasons_v2`)
2. ✅ Can create rounds for a season (`rounds_v2`)
3. ✅ Can define teams for a round (`round_teams_v2` + `teams_v2`)
4. ✅ Can submit picks (`picks_v2` + `pick_items_v2` + `teams_v2`)
5. ✅ Can view picks (joins to `teams_v2` for names)
6. ✅ Can complete a round (writes to `round_results_v2` + `score_details_v2`)
7. ✅ Can view leaderboard (uses `score_details_v2` + `scoring_rules_v2`)
8. ✅ Can end a season (writes to `season_winners_v2`)
9. ✅ Can view season standings (uses `season_winners_v2`)

## Next Steps

1. Complete remaining route handlers in `routes/rounds.ts`
2. Complete `routes/seasons.ts` (especially season ending)
3. Complete `routes/season-participants.ts`
4. Update supporting services
5. Run full test suite
6. Manual smoke testing
7. Fix any regressions

## Files Modified

- `backend/src/utils/teamHelpers.ts` (NEW)
- `backend/src/services/picksService.ts`
- `backend/src/services/scoringService.ts`
- `backend/src/routes/rounds.ts` (partial)
- `backend/src/routes/picks.ts` (partial)
- `docs/db-cutover-analysis.md` (NEW)
- `docs/db-cutover-progress.md` (NEW)

