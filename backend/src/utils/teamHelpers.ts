/**
 * Team Helper Utilities
 * Provides functions for working with teams_v2 table
 */

import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import logger from './logger';

/**
 * Creates a new team in teams_v2 (always creates, never reuses)
 * Used for round-specific teams to ensure isolation per round
 * 
 * @param connection - Database connection
 * @param teamName - Team name
 * @returns Team ID
 */
export async function createTeam(
  connection: PoolConnection,
  teamName: string
): Promise<number> {
  if (!teamName || teamName.trim().length === 0) {
    throw new Error('Team name cannot be empty');
  }

  // Trim team name
  const normalizedName = teamName.trim();

  // Always create a new team (no lookup, no reuse)
  // This ensures teams are isolated per round
  const [result] = await connection.query<ResultSetHeader>(
    'INSERT INTO teams_v2 (name) VALUES (?)',
    [normalizedName]
  );

  if (!result.insertId) {
    throw new Error(`Failed to create team: ${normalizedName}`);
  }

  return result.insertId;
}

/**
 * Gets or creates a team by name in teams_v2
 * NOTE: This function now ALWAYS creates (for backward compatibility with write-in picks)
 * For round-specific teams, use createTeam() instead
 * 
 * @param connection - Database connection
 * @param teamName - Team name
 * @returns Team ID
 * @deprecated Use createTeam() for new code. This function is kept for backward compatibility.
 */
export async function getOrCreateTeam(
  connection: PoolConnection,
  teamName: string
): Promise<number> {
  // For write-in picks and backward compatibility, always create new teams
  // This ensures teams are isolated per round
  return createTeam(connection, teamName);
}

/**
 * Gets team ID by name (case-insensitive)
 * Returns null if team doesn't exist
 * 
 * @param connection - Database connection
 * @param teamName - Team name
 * @returns Team ID or null
 */
export async function getTeamIdByName(
  connection: PoolConnection,
  teamName: string
): Promise<number | null> {
  if (!teamName || teamName.trim().length === 0) {
    return null;
  }

  const [teams] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM teams_v2 WHERE LOWER(name) = LOWER(?)',
    [teamName.trim()]
  );

  return teams.length > 0 ? teams[0].id : null;
}

/**
 * Gets team name by ID
 * 
 * @param connection - Database connection
 * @param teamId - Team ID
 * @returns Team name or null
 */
export async function getTeamNameById(
  connection: PoolConnection,
  teamId: number
): Promise<string | null> {
  const [teams] = await connection.query<RowDataPacket[]>(
    'SELECT name FROM teams_v2 WHERE id = ?',
    [teamId]
  );

  return teams.length > 0 ? teams[0].name : null;
}

/**
 * Bulk get team IDs by names
 * Returns a map of team name (lowercase) -> team_id
 * 
 * @param connection - Database connection
 * @param teamNames - Array of team names
 * @returns Map of team name (lowercase) to team_id
 */
export async function getTeamIdsByNames(
  connection: PoolConnection,
  teamNames: string[]
): Promise<Map<string, number>> {
  if (teamNames.length === 0) {
    return new Map();
  }

  // Normalize names for lookup
  const normalizedNames = teamNames.map(name => name.trim().toLowerCase()).filter(Boolean);
  
  if (normalizedNames.length === 0) {
    return new Map();
  }

  // Query teams (case-insensitive)
  const placeholders = normalizedNames.map(() => '?').join(',');
  const [teams] = await connection.query<RowDataPacket[]>(
    `SELECT id, LOWER(name) as lower_name FROM teams_v2 WHERE LOWER(name) IN (${placeholders})`,
    normalizedNames
  );

  const teamMap = new Map<string, number>();
  teams.forEach(team => {
    teamMap.set(team.lower_name, team.id);
  });

  return teamMap;
}

