# Frontend V2 Schema Analysis Report

## Executive Summary

This analysis identifies all frontend code that deals with picks, teams, results, winners, and correctness logic. The goal is to ensure the frontend uses ID-based comparisons for normal teams and backend-provided scoring for custom/write-in entries, rather than relying on string comparisons or legacy schema fields.

## Findings

### ✅ GOOD: No String-Based Correctness Logic Found

The frontend does **NOT** perform any string-based comparisons to determine pick correctness. All scoring and correctness is handled by the backend, and the frontend simply displays:
- Pick values (team names/custom text) for display
- Scores/points returned from the backend
- Round results (winners) for display

### ❌ ISSUES FOUND: Legacy Schema Field References

#### 1. **TypeScript Type Definitions** (`frontend/src/types/index.ts`)

**Legacy fields still defined:**

```typescript
// Round interface (lines 23-41)
export interface Round {
  // ... other fields ...
  first_place_team: string | null;      // ❌ LEGACY - doesn't exist in rounds_v2
  second_place_team: string | null;     // ❌ LEGACY
  third_place_team: string | null;      // ❌ LEGACY
  fourth_place_team: string | null;    // ❌ LEGACY
  fifth_place_team: string | null;     // ❌ LEGACY
}

// PickItem interface (lines 70-76)
export interface PickItem {
  pick_value: string;  // ❌ LEGACY - should be team_id + name (or pickValue for display)
}

// RoundTeam interface (lines 92-97)
export interface RoundTeam {
  team_name: string;  // ❌ LEGACY - should be {id: number, name: string}
}
```

**Problem:** These types don't match the v2 schema. The backend returns:
- `round_results_v2` data (not `first_place_team` fields on rounds)
- `pick_items_v2` with `team_id` references (not just `pick_value` strings)
- Teams as `{id: number, name: string}` objects (not `team_name` strings)

#### 2. **LeaderboardTable Component** (`frontend/src/components/LeaderboardTable.tsx`)

**Lines 21-30: Legacy Round interface definition**
```typescript
interface Round {
  first_place_team: string | null;  // ❌ LEGACY
  // ... other legacy fields ...
}
```

**Lines 85-89: Display of legacy field**
```typescript
{round.first_place_team && (
  <div className={textXsGrayNormalClasses}>
    ({round.first_place_team})  // ❌ Using legacy field
  </div>
)}
```

**Problem:** The component expects `first_place_team` on the Round object, but:
- The backend's `rounds_v2` table doesn't have this field
- Results are stored in `round_results_v2` with `team_id` references
- The leaderboard API response should include round results separately

#### 3. **RoundsManagement Component** (`frontend/src/components/admin/RoundsManagement.tsx`)

**Lines 505-509: Loading legacy fields**
```typescript
setFirstPlaceTeam(roundRes.data.first_place_team || '');  // ❌ LEGACY
setSecondPlaceTeam(roundRes.data.second_place_team || ''); // ❌ LEGACY
setThirdPlaceTeam(roundRes.data.third_place_team || '');  // ❌ LEGACY
// ... etc
```

**Lines 1088-1102: Displaying legacy fields**
```typescript
{round.first_place_team && (  // ❌ LEGACY
  <div className={`${alertSuccessClasses} mb-3`}>
    <p>🏆 Champion: {round.first_place_team}</p>  // ❌ LEGACY
    {round.second_place_team && `🥈 2nd: ${round.second_place_team}`}  // ❌ LEGACY
    // ... etc
  </div>
)}
```

**Problem:** The component tries to read `first_place_team` etc. from the round object, but:
- `GET /admin/rounds/:id` doesn't return these fields (they don't exist in `rounds_v2`)
- Results should come from `round_results_v2` via a separate query or included in the response

### ✅ GOOD: No String Comparison Logic

**LeaderboardTable.tsx:**
- Lines 109-142: Only displays `pickValue` (for display) and `score.total_points` (from backend)
- No string comparisons for correctness
- Correctly uses backend-provided scores

**RoundsManagement.tsx:**
- Lines 1789-1812: Only displays pick values and scores from backend
- No correctness logic in frontend

**AdminPicksManagement.tsx:**
- Lines 370-398: Only displays pick values for viewing
- No correctness comparisons

**PickPage.tsx:**
- Lines 461-480: Only displays pick values for confirmation
- No correctness logic

### ⚠️ BACKEND API GAPS

**Missing API Response Data:**

1. **GET `/admin/rounds/:id`** (`backend/src/routes/rounds.ts:349-380`)
   - Currently returns: `rounds_v2` row + teams array
   - **Missing:** Round results (`round_results_v2`) for completed rounds
   - Should include: `results: Array<{place: number, teamId: number, teamName: string}>`

2. **GET `/admin/leaderboard/season/:seasonId`** (via `ScoringService.calculateLeaderboard`)
   - Returns: rounds array, leaderboard with picks and scores
   - **Rounds array missing:** Results for completed rounds
   - Should include: `results` field on each completed round

### 📊 Current Data Flow

#### For Normal Teams:
1. **Backend:** Stores picks with `team_id` in `pick_items_v2`
2. **Backend:** Stores results with `team_id` in `round_results_v2`
3. **Backend:** Calculates scores by comparing `pick_items_v2.team_id` with `round_results_v2.team_id`
4. **Backend:** Returns scores in `score_details_v2` + `scoring_rules_v2`
5. **Frontend:** Displays `pickValue` (team name from join) and `score.total_points`
6. **✅ Frontend correctly relies on backend scoring - no string comparisons**

#### For Custom/Write-In Entries:
1. **Backend:** Creates team in `teams_v2` via `getOrCreateTeam()` (normalized)
2. **Backend:** Stores as `team_id` in `pick_items_v2` (same as normal teams)
3. **Backend:** Calculates scores the same way (ID-based)
4. **Frontend:** Displays `pickValue` (custom text) and `score.total_points`
5. **✅ Frontend correctly relies on backend scoring - no text matching**

### 🔍 Detailed File-by-File Analysis

#### `frontend/src/types/index.ts`

**Issues:**
- `Round.first_place_team`, etc. (lines 33-37): Legacy fields that don't exist in v2
- `PickItem.pick_value` (line 74): Should indicate this is display-only, backend uses `team_id`
- `RoundTeam.team_name` (line 95): Should be `{id: number, name: string}`

**Current Usage:**
- Types are used for type safety, but actual API responses may not match
- No correctness logic uses these types

#### `frontend/src/components/LeaderboardTable.tsx`

**Issues:**
- Line 28: Local `Round` interface defines `first_place_team`
- Lines 85-89: Tries to display `round.first_place_team` (may be undefined)

**Current Behavior:**
- Displays pick values and scores correctly
- No correctness logic

**Fix Needed:**
- Update Round interface to match v2 schema
- Get round results from API response (new field) or separate query
- Display results from `round.results` array instead of `round.first_place_team`

#### `frontend/src/components/admin/RoundsManagement.tsx`

**Issues:**
- Lines 505-509: Tries to load `first_place_team` etc. from API response (doesn't exist)
- Lines 1088-1102: Tries to display `round.first_place_team` etc. (undefined)

**Current Behavior:**
- Complete round modal likely fails to load existing results
- Round list display doesn't show winners for completed rounds

**Fix Needed:**
- Update API call to fetch round results separately or include in response
- Display results from `round_results_v2` data structure

#### `frontend/src/pages/PickPage.tsx`

**Status:** ✅ No issues
- Only displays pick values for user confirmation
- No correctness logic
- Uses `pickValue` from API (display-only)

#### `frontend/src/components/admin/AdminPicksManagement.tsx`

**Status:** ✅ No issues
- Only displays pick values for viewing
- No correctness logic
- Uses `pickValue` from API (display-only)

#### `frontend/src/pages/HomePage.tsx`

**Status:** ✅ No issues
- Displays winners from `season_winners_v2` (correct)
- Uses backend-provided data

### 🎯 Summary of Required Changes

#### 1. Backend API Updates (Required for frontend fixes)

**GET `/admin/rounds/:id`** - Add round results:
```typescript
// Should return:
{
  ...round,
  teams: [...],
  results: [  // NEW: Round results from round_results_v2
    { place: 1, teamId: 5, teamName: "Dodgers" },
    { place: 2, teamId: 12, teamName: "Yankees" },
    // ...
  ]
}
```

**GET `/admin/leaderboard/season/:seasonId`** - Add results to rounds:
```typescript
// Should return:
{
  rounds: [
    {
      ...round,
      results: [...] // NEW: For completed rounds
    }
  ],
  leaderboard: [...]
}
```

#### 2. Frontend Type Updates

**Update `Round` interface:**
- Remove: `first_place_team`, `second_place_team`, etc.
- Add: `results?: Array<{place: number, teamId: number, teamName: string}>`

**Update `PickItem` interface:**
- Add: `teamId?: number` (for normal teams)
- Keep: `pickValue: string` (for display, marked as display-only)

**Update `RoundTeam` interface:**
- Change from: `team_name: string`
- Change to: `{id: number, name: string}`

#### 3. Frontend Component Updates

**LeaderboardTable.tsx:**
- Remove local `Round` interface with legacy fields
- Use `round.results` array instead of `round.first_place_team`
- Display champion from `round.results.find(r => r.place === 1)`

**RoundsManagement.tsx:**
- Update `openCompleteModal` to fetch results separately if not in API response
- Update round list display to use `round.results` instead of legacy fields
- Update complete round modal to load results from new structure

### ✅ What's Already Correct

1. **No string-based correctness logic** - Frontend doesn't compare team names
2. **Uses backend scores** - All scoring comes from `score.total_points` in API responses
3. **Display-only usage** - `pickValue` is only used for display, not logic
4. **Custom entries handled correctly** - Backend normalizes them to teams_v2, frontend just displays

### 🚨 Critical Issues

1. **Round results not displayed** - Completed rounds don't show winners because `first_place_team` doesn't exist
2. **Complete round modal broken** - Can't load existing results when editing completed round
3. **Type mismatches** - TypeScript types don't match actual API responses

### 📝 Recommendations

1. **Priority 1:** Update backend API to include round results in responses
2. **Priority 2:** Update TypeScript types to match v2 schema
3. **Priority 3:** Update frontend components to use new results structure
4. **Priority 4:** Remove all references to legacy `*_place_team` fields

---

**Next Steps:** Proceed to Step 2 (Implementation) to fix these issues.

