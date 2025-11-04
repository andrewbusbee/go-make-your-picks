### 1) Summary

- Overall verdict: Mostly relational with two minor exceptions called out below.
- Strengths:
  - All core game entities are fully normalized in v2: rounds, teams, picks, results, scoring, standings.
  - Backend logic consistently uses integer IDs and relational joins for correctness and scoring.
  - Non-game FKs (magic links, reminder_log) were migrated to reference `rounds_v2`.
  - Frontend treats names as display-only and consumes backend-provided results/places/IDs.
- Minor concerns:
  - Backend email helper computes per-user “email points” using string-equality of team names for display emails (not authoritative scoring).
  - `picks_v2.original_pick` is a string retained for backward compatibility; harmless but legacy-leaning.

No major concerns found that would break relational consistency.

### 2) Database Findings

Active v2 tables (from migrations):
- `backend/src/migrations/20250123000000_create_relational_schema_v2_core.ts`
- `backend/src/migrations/20250123000001_create_relational_schema_v2_picks_scoring.ts`
- `backend/src/migrations/20250123000002_create_season_winners_v2.ts`
- `backend/src/migrations/20250123000004_update_magic_links_fk_to_rounds_v2.ts`

Table-by-table relational summary:

- teams_v2
  - PK: id
  - Unique: unique_team_name(name)
  - FKs: none
  - Indices: idx_name(name)
  - Role: Team catalog; referenced everywhere by id.

- seasons_v2
  - PK: id
  - FKs: none
  - Indices: idx_active, idx_default, idx_ended, idx_deleted
  - Checks: year range constraint
  - Role: Seasons; parent of `rounds_v2`, source for scoring rules and winners.

- rounds_v2
  - PK: id
  - FKs: season_id → seasons_v2(id) ON DELETE CASCADE
  - Indices: idx_season, idx_status, idx_pick_type, idx_deleted, idx_season_status_deleted, idx_lock_time, idx_timezone, idx_reminder_type, idx_daily_reminder_time
  - Enums: pick_type('single'|'multiple'), reminder_type('daily'|'before_lock'), status('draft'|'active'|'locked'|'completed')
  - Role: Events; no denormalized results; results live in `round_results_v2`.

- round_teams_v2
  - PK: id
  - FKs:
    - round_id → rounds_v2(id) ON DELETE CASCADE
    - team_id → teams_v2(id) ON DELETE CASCADE
  - Unique: unique_round_team(round_id, team_id)
  - Indices: idx_round, idx_team
  - Role: Join table linking rounds to teams.

- round_results_v2
  - PK: id
  - FKs:
    - round_id → rounds_v2(id) ON DELETE CASCADE
    - team_id → teams_v2(id) ON DELETE RESTRICT
  - Unique: unique_round_place(round_id, place)
  - Indices: idx_round, idx_team, idx_place
  - Checks: place between 1 and 10
  - Role: Per-round podium/placements with team IDs.

- picks_v2
  - PK: id
  - FKs:
    - user_id → users(id) ON DELETE CASCADE
    - round_id → rounds_v2(id) ON DELETE CASCADE
    - edited_by_admin_id → admins(id) ON DELETE SET NULL
  - Unique: unique_user_round_pick_v2(user_id, round_id)
  - Indices: idx_user_v2, idx_round_v2, idx_user_round_v2
  - Notable columns: original_pick VARCHAR (legacy/back-compat only; not used for correctness)
  - Role: One pick record per user per round; items in `pick_items_v2`.

- pick_items_v2
  - PK: id
  - FKs:
    - pick_id → picks_v2(id) ON DELETE CASCADE
    - team_id → teams_v2(id) ON DELETE RESTRICT
  - Unique: unique_pick_number_v2(pick_id, pick_number)
  - Indices: idx_pick_id_v2, idx_team_id_v2, idx_pick_id_number_v2
  - Role: Individual selections with team IDs.

- score_details_v2
  - PK: id
  - FKs:
    - user_id → users(id) ON DELETE CASCADE
    - round_id → rounds_v2(id) ON DELETE CASCADE
  - Unique: unique_user_round_place_v2(user_id, round_id, place)
  - Indices: idx_user_v2, idx_round_v2, idx_user_round_v2, idx_place_v2
  - Checks: place between 0 and 10; count between 0 and 2
  - Role: Normalized breakdown of correctness by place (0=no pick, 1..5 podium, 6+).

- scoring_rules_v2
  - PK: id
  - FKs: season_id → seasons_v2(id) ON DELETE CASCADE
  - Unique: unique_season_place(season_id, place)
  - Indices: idx_season, idx_place
  - Checks: place between 1 and 10; points between -10 and 20
  - Role: Per-season point map for places.

- season_winners_v2
  - PK: id
  - FKs:
    - season_id → seasons_v2(id) ON DELETE CASCADE ON UPDATE RESTRICT
    - user_id → users(id) ON DELETE CASCADE ON UPDATE RESTRICT
  - Unique: unique_season_user_v2(season_id, user_id), unique_season_place_v2(season_id, place)
  - Indices: idx_season_user_v2, idx_season_place_v2, idx_season_v2, idx_user_v2, idx_place_v2
  - Checks: place ≥ 1 ≤ 100, total_points ≥ 0
  - Role: Final standings per season (derived from scores + rules).

- season_participants_v2
  - PK: id
  - FKs:
    - season_id → seasons_v2(id) ON DELETE CASCADE
    - user_id → users(id) ON DELETE CASCADE
  - Unique: unique_season_user_v2(season_id, user_id)
  - Indices: idx_season_v2, idx_user_v2
  - Role: Join of users to seasons.

Denormalization/design smells in active tables:
- picks_v2.original_pick (string)
  - Classification: OK (harmless / by design for back-compat) — not used for correctness.
- No “*_name” or winner text columns in v2 tables; winner data is normalized in `round_results_v2`.
- No comma-separated or multi-valued columns detected in v2 tables.

Foreign-key coverage (confirmed):
- picks_v2 → users, rounds_v2
- pick_items_v2 → picks_v2, teams_v2
- round_results_v2 → rounds_v2, teams_v2
- score_details_v2 → users, rounds_v2
- scoring_rules_v2 → seasons_v2
- season_winners_v2 → seasons_v2, users
- season_participants_v2 → seasons_v2, users

Non-game tables referencing rounds:
- Migration `20250123000004_update_magic_links_fk_to_rounds_v2.ts` adjusts FKs in `magic_links`, `email_magic_links`, and `reminder_log` to point to `rounds_v2`. This is acceptable and aligns with current code. It preserves relational correctness for the main game model.

### 3) Backend Findings

Active v2 usage (samples):
```28:176:backend/src/routes/rounds.ts
// ... many queries shown below ...
FROM round_results_v2 rr
JOIN teams_v2 t ON rr.team_id = t.id
// ...
LEFT JOIN pick_items_v2 pi ON p.id = pi.pick_id
LEFT JOIN teams_v2 t ON pi.team_id = t.id
// ...
JOIN round_teams_v2 rt ON ...
JOIN teams_v2 t ON rt.team_id = t.id
```

ID-based joins for correctness and scoring:
- Score calculation uses only IDs:
```925:975:backend/src/routes/rounds.ts
// Compare pick_items_v2.team_id with round_results_v2.team_id
// Insert into score_details_v2 by place
```

Authoritative scoring paths:
- ScoringService exclusively derives totals from `score_details_v2` + `scoring_rules_v2` (or settings fallback) and never compares names:
```112:166:backend/src/services/scoringService.ts
// score_details_v2 + scoring_rules_v2 map used; no string matches
```

Legacy fields avoided in logic:
- No `WHERE team_name = ?` or `WHERE pick_value = ?` patterns found in backend.
- Legacy tables are renamed and not referenced by runtime logic.
- Some queries select `t.name as pick_value` for display only.

Explicit lingering references and classification:
- Backend email helper uses string-based comparison to compute email-only “points”:
```181:206:backend/src/routes/rounds.ts
// lowerPickValue === first/second/third/... place team (string compare)
```
  - Classification: Minor concern. This does not affect persisted correctness or scoring; it’s for the email content only. Potential drift if display names differ from canonical names, but core scoring remains ID-based.

- Admin docs string mention (non-executable UI copy):
```463:466:backend/src/routes/api-docs.ts
// “Body: Final results (first_place_team, etc.)”
```
  - Classification: Harmless.

- Migrations rename legacy tables (not used at runtime):
```38:67:backend/src/migrations/20250123000003_rename_legacy_game_tables.ts
// picks → picks_legacy, pick_items → pick_items_legacy, etc.
```
  - Classification: Admin/migration only.

Helpers encourage relational usage:
- `teamHelpers.ts` looks up by `id` or case-insensitive `name`, returns IDs for storage:
```28:36:backend/src/utils/teamHelpers.ts
SELECT id FROM teams_v2 WHERE LOWER(name) = LOWER(?)
```

### 4) Frontend Findings

Scope inspected: picks UI, rounds admin, leaderboards, correctness display, write-in.

Backend-driven correctness:
- Frontend consumes `results: [{ place, teamId, teamName }]` and does not implement name-based matching for correctness.
```1105:1109:frontend/src/components/admin/RoundsManagement.tsx
const firstPlace = round.results.find(r => r.place === 1);
// ... similar for other places; used for display
```

Display-only usage of names:
- `pick_value` is used as a label only in UI and types explicitly note display-only.
```71:78:frontend/src/types/index.ts
pick_value: string; // Display-only
team_id?: number;   // Optional in response
```

Tolerance for legacy shape in UI lists (display only):
```1588:1782:frontend/src/components/admin/RoundsManagement.tsx
const teamName = team.name || team.team_name; // display fallback
```
- Classification: OK for display; IDs are used in authoritative flows.

No string-based correctness in the frontend:
- No comparisons of `teamName === ...` to decide correctness. Place/ID come from backend.

Types match v2 model:
- `Round.results: { place, teamId, teamName }[]`
- `RoundTeam: { id, name }` (team IDs from `teams_v2`)
- Scoring display uses backend-computed score flags/points; not recomputed by comparing strings.

### 5) Recommendations

- Tighten backend email helper to use IDs instead of strings for computing per-user “email points” during completion emails. Prefer joining user picks (IDs) with `round_results_v2` places rather than comparing lowercased team names. This removes residual name-dependence in any runtime path, even if display-only today.
  - Location to update:
```181:206:backend/src/routes/rounds.ts
// calculateUserPerformanceData(...) string comparisons
```

- Optional cleanup:
  - Document `picks_v2.original_pick` as deprecated and ensure it is never used for logic or correctness; consider removing when safe.
  - In frontend, gradually remove fallback to `team.team_name` once all responses consistently return `name`.

- Keep `scoring_rules_v2` population aligned with season lifecycle. Code already falls back to settings for active seasons and expects `scoring_rules_v2` when seasons end; this is good—just keep that operational checklist in place.

- Confirm all environments have run `20250123000004_update_magic_links_fk_to_rounds_v2.ts` so non-game FKs point to `rounds_v2`, consistent with the active code.

- Continue monitoring for string-based comparisons in any new features; enforce a guideline that correctness/scoring must be ID- and place-based.

That’s the complete read-only audit. 


