/**
 * Team Helper Utilities
 * Provides functions for working with teams_v2 table
 */

import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import logger from './logger';

/**
 * Gets or creates a team by name in teams_v2
 * Returns the team_id
 * 
 * @param connection - Database connection
 * @param teamName - Team name (case-insensitive lookup, but stored as provided)
 * @returns Team ID
 */
export async function getOrCreateTeam(
  connection: PoolConnection,
  teamName: string
): Promise<number> {
  if (!teamName || teamName.trim().length === 0) {
    throw new Error('Team name cannot be empty');
  }

  // Trim and normalize team name
  const normalizedName = teamName.trim();

  // Try to find existing team (case-insensitive)
  const [existing] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM teams_v2 WHERE LOWER(name) = LOWER(?)',
    [normalizedName]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Team doesn't exist, create it
  // Use INSERT IGNORE to handle race conditions (multiple concurrent requests)
  const [result] = await connection.query<ResultSetHeader>(
    'INSERT IGNORE INTO teams_v2 (name) VALUES (?)',
    [normalizedName]
  );

  if (result.insertId) {
    return result.insertId;
  }

  // If insertId is 0, it means another request created it between our check and insert
  // Fetch it now
  const [created] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM teams_v2 WHERE LOWER(name) = LOWER(?)',
    [normalizedName]
  );

  if (created.length > 0) {
    return created[0].id;
  }

  throw new Error(`Failed to create or find team: ${normalizedName}`);
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

