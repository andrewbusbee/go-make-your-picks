## Relational Fixes Implementation Summary

Date: (commit date)

### Scope Covered
1) Refactor email helper to compute email points by IDs, not strings
2) Create migration to drop `picks_v2.original_pick` with annotation
3) Remove all code references to `original_pick` and update types/UI
4) Unify backend responses on team name field `name` (no `team_name`)
5) Remove frontend fallbacks `team.name || team.team_name` and adjust usages
6) Add documentation section: no string comparisons for correctness
7) Add backend guard (script) to detect forbidden `team_name`/`WHERE` patterns
8) Build back/front and run guard

---

### 1) Email helper refactor (IDs only)
- File: `backend/src/routes/rounds.ts`
  - `prepareCompletionEmailData`: now fetches `round_results_v2` including `team_id`, builds `resultPlaceByTeamId` map, aggregates user picks by `team_id` + display name, and returns these in shared data.
  - `calculateUserPerformanceData`: computes email points by matching `team_id` to place via `resultPlaceByTeamId`; no string comparisons.

Notes: Display names are still used for rendering only.

### 2) Migration to drop `picks_v2.original_pick`
- File: `backend/src/migrations/20250123000005_drop_original_pick.ts`
  - Annotated at top: rationale and historical context.
  - Idempotent check via `INFORMATION_SCHEMA` before `ALTER TABLE ... DROP COLUMN`.
- Registered in: `backend/src/migrations/index.ts`

### 3) Remove code references to `original_pick`
- File: `backend/src/routes/admin-picks.ts`
  - Removed `original_pick` write-back; retained admin edit metadata.
- UI text updated to reflect that original value is no longer tracked.

### 4) Backend responses unified to `name`
- File: `backend/src/routes/rounds.ts`
  - Season rounds teams listing: alias changed to `name`.
  - Complete-round teams endpoint: returns `{ id, name }` consistently.

### 5) Frontend fallback removal and usage fixes
- File: `frontend/src/components/admin/RoundsManagement.tsx`
  - Replaced all `team.name || team.team_name` with `team.name`.
- File: `frontend/src/components/admin/AdminPicksManagement.tsx`
  - Modal prefill: `find((t) => t.name === pickValue)` only.
  - Team option rendering uses `team.name` exclusively.
  - Admin edit display: shows “(Original Not Tracked)” instead of removed `original_pick`.

### 6) Documentation guardrail
- File: `docs/ARCHITECTURE.md`
  - Added "Data & Scoring Guidelines" section: correctness/scoring must be ID-based; names are display-only.

### 7) Backend guard (anti-regression)
- File: `backend/scripts/guard/no_string_teamname_check.ts`
  - Scans `backend/src` (excludes `migrations/**`) for forbidden patterns like `WHERE ... team_name`.
- NPM script: `backend/package.json` → `"guard:queries": "ts-node scripts/guard/no_string_teamname_check.ts"`.
- CI: `.github/workflows/backend-guard.yml` runs build + guard on pushes/PRs to main.

### 8) Builds/guard executed
- Backend build: OK.
- Installed dev deps for guard (`glob`, `@types/glob`).
- Guard run: OK (no violations).
- Frontend build: OK.

---

### Impact & Compatibility
- Scoring semantics unchanged; only correctness derivation in email context switched to IDs.
- API responses now consistently expose `name` for teams; frontend updated accordingly.
- `picks_v2.original_pick` dropped; startup migrations will apply automatically (migrations run at server start).
- CI guard helps prevent regressions to string-based correctness.


