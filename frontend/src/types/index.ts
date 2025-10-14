/**
 * TypeScript Type Definitions
 * Centralized type safety for the application
 */

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface Season {
  id: number;
  name: string;
  year_start: number;
  year_end: number;
  is_active: boolean;
  is_default: boolean;
  ended_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: number;
  season_id: number;
  sport_name: string;
  pick_type: 'single' | 'multiple';
  num_write_in_picks: number | null;
  email_message: string | null;
  lock_time: string;
  timezone: string;
  status: 'draft' | 'active' | 'locked' | 'completed';
  first_place_team: string | null;
  second_place_team: string | null;
  third_place_team: string | null;
  fourth_place_team: string | null;
  fifth_place_team: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  is_main_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pick {
  id: number;
  user_id: number;
  round_id: number;
  created_at: string;
  updated_at: string;
}

export interface PickItem {
  id: number;
  pick_id: number;
  pick_number: number;
  pick_value: string;
  created_at: string;
}

export interface Score {
  id: number;
  user_id: number;
  round_id: number;
  first_place: number;
  second_place: number;
  third_place: number;
  fourth_place: number;
  fifth_place: number;
  sixth_plus_place: number;
  created_at: string;
  updated_at: string;
}

export interface RoundTeam {
  id: number;
  round_id: number;
  team_name: string;
  created_at: string;
}

export interface SeasonParticipant {
  id: number;
  season_id: number;
  user_id: number;
  created_at: string;
}

export interface SeasonWinner {
  id: number;
  season_id: number;
  place: number;
  user_id: number;
  total_points: number;
  created_at: string;
  user_name?: string;
}

export interface MagicLink {
  id: number;
  user_id: number;
  round_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  picks: Record<number, PickWithItems | null>;
  scores: Record<number, ScoreWithTotal | null>;
  totalPoints: number;
  rank: number;
}

export interface PickWithItems extends Pick {
  pickItems: Array<{
    pickNumber: number;
    pickValue: string;
  }>;
}

export interface ScoreWithTotal extends Score {
  total_points: number;
}

export interface LeaderboardResponse {
  rounds: Round[];
  leaderboard: LeaderboardEntry[];
}

export interface GraphDataPoint {
  roundId: number;
  roundName: string;
  points: number;
}

export interface GraphData {
  userId: number;
  userName: string;
  points: GraphDataPoint[];
}

export interface RoundWithTeams extends Round {
  teams: RoundTeam[];
}

export interface MagicLinkValidation {
  user: {
    userId: number;
    userName: string;
    userEmail: string;
  };
  round: {
    roundId: number;
    sportName: string;
    pickType: 'single' | 'multiple';
    numWriteInPicks: number | null;
    lockTime: string;
    timezone: string;
    status: string;
    seasonName: string;
  };
  teams: string[];
  currentPick: PickWithItems | null;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface InitialSetupFormData {
  newName: string;
  newEmail: string;
  newPassword: string;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateSeasonFormData {
  name: string;
  yearStart: number;
  yearEnd: number;
  participantIds: number[];
}

export interface CreateRoundFormData {
  seasonId: number;
  sportName: string;
  pickType: 'single' | 'multiple';
  numWriteInPicks?: number;
  emailMessage?: string;
  lockTime: string;
  timezone: string;
  teams?: string[];
}

export interface CompleteRoundFormData {
  firstPlaceTeam: string;
  secondPlaceTeam?: string;
  thirdPlaceTeam?: string;
  fourthPlaceTeam?: string;
  fifthPlaceTeam?: string;
  manualScores?: Array<{
    userId: number;
    placement: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'none';
  }>;
}

// ============================================================================
// APP SETTINGS
// ============================================================================

export interface AppSettings {
  app_title: string;
  app_tagline: string;
  footer_message: string;
  theme_mode: 'dark_only' | 'light_only' | 'user_choice';
  points_first_place: number;
  points_second_place: number;
  points_third_place: number;
  points_fourth_place: number;
  points_fifth_place: number;
  points_sixth_plus_place: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ApiSuccess {
  message: string;
  [key: string]: any;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: string;
      latency?: number;
      error?: string;
    };
    email: {
      status: string;
    };
  };
}

export interface Config {
  enableDevTools: boolean;
}

