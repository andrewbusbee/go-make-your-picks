// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express, { Response } from 'express';
import crypto from 'crypto';
import moment from 'moment-timezone';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendMagicLink, sendSportCompletionEmail } from '../services/emailService';
import { manualSendReminder, manualSendLockedNotification, manualSendGenericReminder } from '../services/reminderScheduler';
import { activationLimiter, pickSubmissionLimiter } from '../middleware/rateLimiter';
import { isValidTimezone } from '../utils/timezones';
import { validateRequest } from '../middleware/validator';
import { createRoundValidators, updateRoundValidators, completeRoundValidators } from '../validators/roundsValidators';
import { SettingsService } from '../services/settingsService';
import logger, { redactEmail } from '../utils/logger';
import { withTransaction } from '../utils/transactionWrapper';
import { sanitizePlainText, sanitizePlainTextArray } from '../utils/textSanitizer';
import { getOrCreateTeam, createTeam } from '../utils/teamHelpers';
import { generateMagicLinkToken, hashMagicLinkToken } from '../utils/magicLinkToken';

const router = express.Router();

// Helper function to prepare shared data for all completion emails (calculated once)
// Updated to use v2 schema and ID-based correctness
const prepareCompletionEmailData = async (roundId: number, seasonId: number) => {
  try {
    // Get round data from rounds_v2
    const [roundData] = await db.query<RowDataPacket[]>(
      `SELECT sport_name FROM rounds_v2 WHERE id = ?`,
      [roundId]
    );

    const round = roundData[0];
    
    // Get final results from round_results_v2 + teams_v2 (include team_id for ID-based scoring)
    const [roundResults] = await db.query<RowDataPacket[]>(
      `SELECT rr.place, rr.team_id, t.name as team
       FROM round_results_v2 rr
       JOIN teams_v2 t ON rr.team_id = t.id
       WHERE rr.round_id = ?
       ORDER BY rr.place`,
      [roundId]
    );

    const finalResults = roundResults.map(rr => ({
      place: rr.place,
      team: rr.team,
      team_id: rr.team_id
    }));

    // Build map of teamId -> place for quick ID-based lookup
    const resultPlaceByTeamId = new Map<number, number>();
    roundResults.forEach(rr => {
      if (typeof rr.team_id === 'number') {
        resultPlaceByTeamId.set(rr.team_id, rr.place);
      }
    });

    // Get points settings once for all calculations
    const pointsSettings = await SettingsService.getPointsSettings();

    // Get all picks for this round from picks_v2 + pick_items_v2 (IDs) and join teams for display
    const [allPicks] = await db.query<RowDataPacket[]>(
      `SELECT p.user_id, pi.team_id, t.name as team_name
       FROM picks_v2 p
       LEFT JOIN pick_items_v2 pi ON p.id = pi.pick_id
       LEFT JOIN teams_v2 t ON pi.team_id = t.id
       WHERE p.round_id = ?
       ORDER BY pi.pick_number`,
      [roundId]
    );

    // Build user picks map for O(1) lookup (take first pick per user)
    const userPicksMap = new Map<number, { teamId: number | null; teamName: string | null }>();
    allPicks.forEach(pick => {
      if (!userPicksMap.has(pick.user_id)) {
        const teamId = (pick.team_id ?? null) as number | null;
        const teamName = (pick.team_name ?? null) as string | null;
        userPicksMap.set(pick.user_id, { teamId, teamName });
      }
    });

    // Get all completed rounds for this season from rounds_v2
    const [completedRounds] = await db.query<RowDataPacket[]>(
      'SELECT id FROM rounds_v2 WHERE season_id = ? AND status = ? AND deleted_at IS NULL',
      [seasonId, 'completed']
    );

    const completedRoundIds = completedRounds.map(r => r.id);

    // Get leaderboard data for all participants using score_details_v2 + scoring_rules_v2
    // For simplicity, we'll use ScoringService or calculate directly
    // Get scoring rules for this season
    const [scoringRules] = await db.query<RowDataPacket[]>(
      'SELECT place, points FROM scoring_rules_v2 WHERE season_id = ?',
      [seasonId]
    );

    // Build scoring rules map
    const scoringRulesMap = new Map<number, number>();
    scoringRules.forEach(rule => {
      scoringRulesMap.set(rule.place, rule.points);
    });

    // If no scoring rules, use SettingsService
    if (scoringRulesMap.size === 0) {
      scoringRulesMap.set(1, pointsSettings.pointsFirst);
      scoringRulesMap.set(2, pointsSettings.pointsSecond);
      scoringRulesMap.set(3, pointsSettings.pointsThird);
      scoringRulesMap.set(4, pointsSettings.pointsFourth);
      scoringRulesMap.set(5, pointsSettings.pointsFifth);
      scoringRulesMap.set(6, pointsSettings.pointsSixthPlus);
      scoringRulesMap.set(0, pointsSettings.pointsNoPick);
    }

    // Get score details for completed rounds
    let scoreDetails: RowDataPacket[] = [];
    if (completedRoundIds.length > 0) {
      [scoreDetails] = await db.query<RowDataPacket[]>(
        `SELECT sd.user_id, sd.round_id, sd.place, sd.count
         FROM score_details_v2 sd
         WHERE sd.round_id IN (${completedRoundIds.map(() => '?').join(',')})`,
        completedRoundIds
      );
    }

    // Get participants
    const [participants] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name
       FROM users u
       JOIN season_participants_v2 sp ON u.id = sp.user_id AND sp.season_id = ?
       WHERE u.is_active = TRUE`,
      [seasonId]
    );

    // Calculate total points for each user
    const userTotals = new Map<number, { name: string; points: number }>();
    
    participants.forEach(participant => {
      userTotals.set(participant.id, { name: participant.name, points: 0 });
    });

    scoreDetails.forEach(sd => {
      const points = scoringRulesMap.get(sd.place) || 0;
      const total = (userTotals.get(sd.user_id)?.points || 0) + (sd.count * points);
      userTotals.set(sd.user_id, {
        name: userTotals.get(sd.user_id)?.name || '',
        points: total
      });
    });

    // Sort by total points for leaderboard
    const sortedLeaderboard = Array.from(userTotals.entries())
      .sort((a, b) => b[1].points - a[1].points)
      .map(([userId, data]) => ({ userId, ...data }));

    return {
      round,
      finalResults,
      pointsSettings,
      userPicksMap,
      resultPlaceByTeamId,
      sortedLeaderboard,
      sportName: round.sport_name
    };
  } catch (error) {
    logger.error('Error preparing completion email data', { error, roundId, seasonId });
    throw error;
  }
};

// Helper function to calculate user-specific performance data from shared data
// Updated to use v2 schema and ID-based correctness (no name comparisons)
const calculateUserPerformanceData = (
  userId: number,
  sharedData: {
    round: any;
    finalResults: any[];
    pointsSettings: any;
    userPicksMap: Map<number, { teamId: number | null; teamName: string | null }>;
    resultPlaceByTeamId: Map<number, number>;
    sortedLeaderboard: any[];
    sportName: string;
  }
) => {
  const { round, finalResults, pointsSettings, userPicksMap, resultPlaceByTeamId, sortedLeaderboard, sportName } = sharedData;
  
  // Get user's pick (team ID + display name)
  const userPick = userPicksMap.get(userId);
  let userPoints = 0;
  let userPickDisplay = 'No pick';
  
  if (userPick && (userPick.teamId || userPick.teamName)) {
    userPickDisplay = userPick.teamName || 'Unknown';

    // If we have a teamId, match it to a place via the canonical results map
    if (userPick.teamId) {
      const place = resultPlaceByTeamId.get(userPick.teamId) || null;
      if (place === 1) userPoints = pointsSettings.pointsFirst;
      else if (place === 2) userPoints = pointsSettings.pointsSecond;
      else if (place === 3) userPoints = pointsSettings.pointsThird;
      else if (place === 4) userPoints = pointsSettings.pointsFourth;
      else if (place === 5) userPoints = pointsSettings.pointsFifth;
      else if (place && place >= 6) userPoints = pointsSettings.pointsSixthPlus;
      else userPoints = pointsSettings.pointsSixthPlus;
    } else {
      // No team ID (e.g., no pick), treat as sixth plus/default
      userPoints = pointsSettings.pointsSixthPlus;
    }
  }

  // Format top 5 leaderboard with current user highlighted
  const formattedLeaderboard = sortedLeaderboard
    .slice(0, 5)
    .map(entry => ({
      name: entry.name,
      points: entry.points,
      isCurrentUser: entry.userId === userId
    }));

  return {
    userPick: userPickDisplay,
    userPoints,
    finalResults,
    leaderboard: formattedLeaderboard,
    sportName
  };
};

// Get all rounds (admin only) - for checking system status
router.get('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    res.json(rounds);
  } catch (error) {
    logger.error('Get all rounds error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all rounds for a season (public) - excludes deleted
router.get('/season/:seasonId', async (req, res) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [seasonId]
    );
    
    // Optimize: Get participants once for the entire season (not per round) from season_participants_v2
    const [participants] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN season_participants_v2 sp ON u.id = sp.user_id
       WHERE sp.season_id = ? AND u.is_active = TRUE
       ORDER BY u.name ASC`,
      [seasonId]
    );
    
    // Optimize: Get all picks for all active rounds in this season (single query) from picks_v2
    // Only count picks that have pick_items_v2 records (actual picks, not empty picks_v2 records)
    const activeRoundIds = rounds.filter(r => r.status === 'active').map(r => r.id);
    let picksMap = new Map<number, Set<number>>(); // roundId -> Set of userIds who picked
    
    if (activeRoundIds.length > 0) {
      const [allPicks] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT p.round_id, p.user_id 
         FROM picks_v2 p
         INNER JOIN pick_items_v2 pi ON p.id = pi.pick_id
         WHERE p.round_id IN (?)`,
        [activeRoundIds]
      );
      
      // Build picks map for O(1) lookup
      allPicks.forEach(pick => {
        if (!picksMap.has(pick.round_id)) {
          picksMap.set(pick.round_id, new Set());
        }
        picksMap.get(pick.round_id)!.add(pick.user_id);
      });
    }
    
    // Get all teams for all rounds in this season (single query) from round_teams_v2 + teams_v2
    const teamsMap = new Map<number, any[]>();
    
    if (rounds.length > 0) {
    const [allTeams] = await db.query<RowDataPacket[]>(
      `SELECT rt.round_id, t.name as name
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id IN (?)`,
        [rounds.map(r => r.id)]
      );
      
      // Build teams map for O(1) lookup
      allTeams.forEach(team => {
        if (!teamsMap.has(team.round_id)) {
          teamsMap.set(team.round_id, []);
        }
        teamsMap.get(team.round_id)!.push(team);
      });
    }
    
    // Build response with O(1) lookups (no queries in loop)
    const roundsWithParticipants = rounds.map(round => {
      const teams = teamsMap.get(round.id) || [];
      
      if (round.status === 'draft' || round.status === 'active') {
        if (round.status === 'active') {
          // Active round - include pick status
          const userIdsWithPicks = picksMap.get(round.id) || new Set();
          
          const participantsWithPickStatus = participants.map(p => ({
            id: p.id,
            name: p.name,
            hasPicked: userIdsWithPicks.has(p.id)
          }));
          
          const pickedCount = participantsWithPickStatus.filter(p => p.hasPicked).length;
          
          return {
            ...round,
            participants: participantsWithPickStatus,
            pickedCount,
            totalParticipants: participants.length,
            teams
          };
        } else {
          // Draft - just return participant names
          return {
            ...round,
            participants: participants.map(p => ({ id: p.id, name: p.name })),
            totalParticipants: participants.length,
            teams
          };
        }
      }
      
      // For locked/completed rounds, include teams but no participants
      return {
        ...round,
        teams
      };
    });
    
    res.json(roundsWithParticipants);
  } catch (error) {
    logger.error('Get rounds error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get round details with teams (public) - excludes deleted
router.get('/:id', async (req, res) => {
  const roundId = parseInt(req.params.id);

  try {
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    // Get teams from round_teams_v2 + teams_v2 with IDs for editing
    const [teams] = await db.query<RowDataPacket[]>(
      `SELECT t.id, t.name
       FROM round_teams_v2 rt
       JOIN teams_v2 t ON rt.team_id = t.id
       WHERE rt.round_id = ?
       ORDER BY t.name`,
      [roundId]
    );

    // Get round results from round_results_v2 + teams_v2 (for completed rounds)
    const [roundResults] = await db.query<RowDataPacket[]>(
      `SELECT rr.place, rr.team_id, t.name as team_name
       FROM round_results_v2 rr
       JOIN teams_v2 t ON rr.team_id = t.id
       WHERE rr.round_id = ?
       ORDER BY rr.place`,
      [roundId]
    );

    const results = roundResults.map(rr => ({
      place: rr.place,
      teamId: rr.team_id,
      teamName: rr.team_name
    }));

    res.json({
      ...round,
      teams: teams.map(t => ({ id: t.id, name: t.name })),
      results: results.length > 0 ? results : undefined
    });
  } catch (error) {
    logger.error('Get round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new round (admin only)
router.post('/', authenticateAdmin, validateRequest(createRoundValidators), async (req: AuthRequest, res: Response) => {
  const { seasonId, sportName, pickType, numWriteInPicks, emailMessage, lockTime, timezone, teams, reminderType, dailyReminderTime, firstReminderHours, finalReminderHours } = req.body;

  if (!seasonId || !sportName || !lockTime) {
    return res.status(400).json({ error: 'Season ID, sport name, and lock time are required' });
  }

  // Validate string lengths
  if (sportName.length > 100) {
    return res.status(400).json({ error: 'Sport name must be 100 characters or less' });
  }

  // Validate pickType
  const validPickType = pickType || 'single';
  if (!['single', 'multiple'].includes(validPickType)) {
    return res.status(400).json({ error: 'Pick type must be either "single" or "multiple"' });
  }

  // Validate numWriteInPicks for multiple pick type
  if (validPickType === 'multiple') {
    if (!numWriteInPicks || numWriteInPicks < 1 || numWriteInPicks > 10) {
      return res.status(400).json({ error: 'Number of write-in picks must be between 1 and 10' });
    }
  }

  // Validate timezone if provided
  const validTimezone = timezone || 'America/New_York';
  if (!isValidTimezone(validTimezone)) {
    return res.status(400).json({ error: 'Invalid timezone. Please select a valid IANA timezone.' });
  }

  // Validate reminder settings
  const validReminderType = reminderType || 'daily';
  if (!['daily', 'before_lock'].includes(validReminderType)) {
    return res.status(400).json({ error: 'Reminder type must be either "daily" or "before_lock"' });
  }

  const validDailyReminderTime = dailyReminderTime || '10:00:00';
  const validFirstReminderHours = firstReminderHours || 48;
  const validFinalReminderHours = finalReminderHours || 6;

  // Validate reminder hours for before_lock type
  if (validReminderType === 'before_lock') {
    if (validFirstReminderHours < 1 || validFirstReminderHours > 168) {
      return res.status(400).json({ error: 'First reminder hours must be between 1 and 168' });
    }
    if (validFinalReminderHours < 1 || validFinalReminderHours > 48) {
      return res.status(400).json({ error: 'Final reminder hours must be between 1 and 48' });
    }
    if (validFinalReminderHours >= validFirstReminderHours) {
      return res.status(400).json({ error: 'Final reminder hours must be less than first reminder hours' });
    }
  }

  // Parse datetime in the selected timezone, not browser timezone
  // lockTime comes as "2024-10-15T12:00" from datetime-local input
  // Interpret this as 12:00 in the selected timezone, then convert to UTC for storage
  const lockTimeMoment = moment.tz(lockTime, validTimezone);
  const mysqlLockTime = lockTimeMoment.utc().format('YYYY-MM-DD HH:mm:ss');

  try {
    const roundId = await withTransaction(async (connection) => {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO rounds_v2 (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, reminder_type, daily_reminder_time, first_reminder_hours, final_reminder_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [seasonId, sportName, validPickType, validPickType === 'multiple' ? numWriteInPicks : null, emailMessage || null, mysqlLockTime, validTimezone, validReminderType, validDailyReminderTime, validFirstReminderHours, validFinalReminderHours, 'draft']
      );

      const roundId = result.insertId;

      // Add teams if provided (only for single pick type)
      // Accept either string array (legacy) or team objects with IDs
      if (validPickType === 'single' && teams && Array.isArray(teams) && teams.length > 0) {
        let teamIds: number[] = [];

        // Check if teams are objects with id/name or just strings (legacy format)
        if (typeof teams[0] === 'object' && teams[0] !== null) {
          // New format: array of {id?, name}
          for (const team of teams) {
            if (!team.name || typeof team.name !== 'string') {
              throw new Error('Each team must have a name');
            }
            if (team.name.length > 100) {
              throw new Error('Team names must be 100 characters or less');
            }

            const sanitizedName = sanitizePlainTextArray([team.name])[0];

            if (team.id) {
              // Update existing team name if changed
              const [existing] = await connection.query<RowDataPacket[]>(
                'SELECT id, name FROM teams_v2 WHERE id = ?',
                [team.id]
              );

              if (existing.length === 0) {
                throw new Error(`Team with ID ${team.id} not found`);
              }

              if (existing[0].name !== sanitizedName) {
                await connection.query(
                  'UPDATE teams_v2 SET name = ? WHERE id = ?',
                  [sanitizedName, team.id]
                );
              }

              teamIds.push(team.id);
            } else {
              // Create new team (always create, never reuse for round isolation)
              const teamId = await createTeam(connection, sanitizedName);
              teamIds.push(teamId);
            }
          }
        } else {
          // Legacy format: array of strings
          const cleanedTeams = sanitizePlainTextArray(teams as string[]);
          
          // Create new teams in teams_v2 (always create, never reuse for round isolation)
          for (const team of cleanedTeams) {
            if (team.length > 100) {
              throw new Error('Team names must be 100 characters or less');
            }
            const teamId = await createTeam(connection, team);
            teamIds.push(teamId);
          }
        }
        
        if (teamIds.length > 0) {
          // Remove duplicates (in case frontend sent duplicate teams)
          const uniqueTeamIds = [...new Set(teamIds)];
          
          if (uniqueTeamIds.length !== teamIds.length) {
            logger.warn('Duplicate teams detected in round creation', {
              roundId,
              originalCount: teamIds.length,
              uniqueCount: uniqueTeamIds.length,
              teamIds
            });
          }
          
          const teamValues = uniqueTeamIds.map(teamId => [roundId, teamId]);
          
          // Use INSERT IGNORE to handle potential race conditions or duplicates
          await connection.query(
            'INSERT IGNORE INTO round_teams_v2 (round_id, team_id) VALUES ?',
            [teamValues]
          );
          
          // Verify all teams were properly linked
          const [linkedTeams] = await connection.query<RowDataPacket[]>(
            'SELECT team_id FROM round_teams_v2 WHERE round_id = ?',
            [roundId]
          );
          
          const linkedTeamIds = linkedTeams.map(t => t.team_id);
          const missingTeams = uniqueTeamIds.filter(id => !linkedTeamIds.includes(id));
          
          if (missingTeams.length > 0) {
            logger.error('Failed to link all teams to round', {
              roundId,
              expectedTeamIds: uniqueTeamIds,
              linkedTeamIds,
              missingTeamIds: missingTeams
            });
            throw new Error(`Failed to link ${missingTeams.length} team(s) to round. Please try again.`);
          }
          
          logger.info('Teams successfully linked to round', {
            roundId,
            teamCount: uniqueTeamIds.length,
            teamIds: uniqueTeamIds
          });
        }
      }

      return roundId;
    });

    // Return the created round with teams for frontend verification
    const [roundData] = await db.query<RowDataPacket[]>(
      `SELECT r.*, 
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name))
        FROM round_teams_v2 rt
        JOIN teams_v2 t ON rt.team_id = t.id
        WHERE rt.round_id = r.id) as teams
       FROM rounds_v2 r
       WHERE r.id = ?`,
      [roundId]
    );
    
    const round = roundData[0] || { id: roundId };
    const roundTeams = round.teams ? (typeof round.teams === 'string' ? JSON.parse(round.teams) : round.teams) : [];
    
    res.status(201).json({
      message: 'Round created successfully',
      id: roundId,
      teams: roundTeams // Include teams so frontend can verify they match
    });
  } catch (error: any) {
    logger.error('Create round error', { error, seasonId, sportName });
    
    if (error.message === 'Team names must be 100 characters or less') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Update round (admin only)
router.put('/:id', authenticateAdmin, validateRequest(updateRoundValidators), async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);
  const { seasonId, sportName, pickType, numWriteInPicks, emailMessage, lockTime, timezone, reminderType, dailyReminderTime, firstReminderHours, finalReminderHours } = req.body;

  // Validate pickType if provided
  if (pickType && !['single', 'multiple'].includes(pickType)) {
    return res.status(400).json({ error: 'Pick type must be either "single" or "multiple"' });
  }

  // Validate numWriteInPicks if provided
  if (pickType === 'multiple' && numWriteInPicks) {
    if (numWriteInPicks < 1 || numWriteInPicks > 10) {
      return res.status(400).json({ error: 'Number of write-in picks must be between 1 and 10' });
    }
  }

  // Validate timezone if provided
  if (timezone && !isValidTimezone(timezone)) {
    return res.status(400).json({ error: 'Invalid timezone. Please select a valid timezone.' });
  }

  // Validate reminder settings if provided
  if (reminderType && !['daily', 'before_lock'].includes(reminderType)) {
    return res.status(400).json({ error: 'Reminder type must be either "daily" or "before_lock"' });
  }

  if (reminderType === 'before_lock') {
    if (firstReminderHours && (firstReminderHours < 1 || firstReminderHours > 168)) {
      return res.status(400).json({ error: 'First reminder hours must be between 1 and 168' });
    }
    if (finalReminderHours && (finalReminderHours < 1 || finalReminderHours > 48)) {
      return res.status(400).json({ error: 'Final reminder hours must be between 1 and 48' });
    }
    if (firstReminderHours && finalReminderHours && finalReminderHours >= firstReminderHours) {
      return res.status(400).json({ error: 'Final reminder hours must be less than first reminder hours' });
    }
  }

  // Validate season if provided
  if (seasonId) {
    const [seasons] = await db.query<RowDataPacket[]>(
      'SELECT id, is_active, ended_at FROM seasons_v2 WHERE id = ? AND deleted_at IS NULL',
      [seasonId]
    );

    if (seasons.length === 0) {
      return res.status(400).json({ error: 'Season not found' });
    }

    if (seasons[0].ended_at) {
      return res.status(400).json({ error: 'Cannot move sport to an ended season' });
    }

    if (!seasons[0].is_active) {
      return res.status(400).json({ error: 'Cannot move sport to an inactive season' });
    }
  }

  // Parse datetime in the selected timezone if both lockTime and timezone are provided
  let mysqlLockTime = lockTime;
  if (lockTime && timezone) {
    // Interpret the datetime string in the selected timezone, then convert to UTC
    const lockTimeMoment = moment.tz(lockTime, timezone);
    mysqlLockTime = lockTimeMoment.utc().format('YYYY-MM-DD HH:mm:ss');
  } else if (lockTime) {
    // If only lockTime provided (no timezone change), get the current timezone from DB
    const [currentRound] = await db.query<RowDataPacket[]>(
      'SELECT timezone FROM rounds_v2 WHERE id = ?',
      [roundId]
    );
    if (currentRound.length > 0) {
      const currentTimezone = currentRound[0].timezone || 'America/New_York';
      const lockTimeMoment = moment.tz(lockTime, currentTimezone);
      mysqlLockTime = lockTimeMoment.utc().format('YYYY-MM-DD HH:mm:ss');
    }
  }

  try {
    await db.query(
      `UPDATE rounds_v2 SET 
        season_id = COALESCE(?, season_id),
        sport_name = COALESCE(?, sport_name),
        pick_type = COALESCE(?, pick_type),
        num_write_in_picks = ?,
        email_message = ?,
        lock_time = COALESCE(?, lock_time),
        timezone = COALESCE(?, timezone),
        reminder_type = COALESCE(?, reminder_type),
        daily_reminder_time = COALESCE(?, daily_reminder_time),
        first_reminder_hours = COALESCE(?, first_reminder_hours),
        final_reminder_hours = COALESCE(?, final_reminder_hours)
      WHERE id = ?`,
      [seasonId, sportName, pickType, pickType === 'multiple' ? numWriteInPicks : null, emailMessage || null, mysqlLockTime, timezone, reminderType, dailyReminderTime, firstReminderHours, finalReminderHours, roundId]
    );

    res.json({ message: 'Round updated successfully' });
  } catch (error) {
    logger.error('Update round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Activate round and send magic links (admin only, with rate limiting)
router.post('/:id/activate', authenticateAdmin, activationLimiter, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  logger.info('Activating round', { 
    roundId, 
    urlRoundId: req.params.id,
    adminId: req.adminId 
  });

  try {
    // Get round details
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT r.* FROM rounds_v2 r WHERE r.id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      logger.warn('Round not found for activation', { roundId, urlRoundId: req.params.id });
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];
    
    logger.debug('Round found for activation', {
      roundId,
      sportName: round.sport_name,
      seasonId: round.season_id,
      status: round.status
    });

    // Update round status
    await db.query('UPDATE rounds_v2 SET status = ? WHERE id = ?', ['active', roundId]);

    // Get season participants only (not all users), excluding deactivated players
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT u.* FROM users u
       JOIN season_participants_v2 sp ON u.id = sp.user_id
       WHERE sp.season_id = (SELECT season_id FROM rounds_v2 WHERE id = ?)
       AND u.is_active = TRUE`,
      [roundId]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'No participants in this season. Add participants first.' });
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3003';

    // Group users by email address
    const usersByEmail = new Map<string, any[]>();
    users.forEach(user => {
      if (!usersByEmail.has(user.email)) {
        usersByEmail.set(user.email, []);
      }
      usersByEmail.get(user.email)!.push(user);
    });

    // Separate shared emails from single-user emails
    const sharedEmails: Array<{ email: string; users: any[] }> = [];
    const singleUserEmails: Array<{ user: any }> = [];
    
    for (const [email, emailUsers] of usersByEmail) {
      if (emailUsers.length > 1) {
        // Multiple users share this email - use email-based magic links
        sharedEmails.push({ email, users: emailUsers });
      } else {
        // Single user with this email - use user-based magic links
        singleUserEmails.push({ user: emailUsers[0] });
      }
    }

    // Delete all old magic links for this round (both types)
    // Magic links are multi-use per (user_id, round_id) or (email, round_id) until round locks
    // When a round is reactivated, old links are deleted and new ones created
    // Each magic link validation issues a fresh JWT (8h expiry), but the magic link itself
    // remains valid until the round locks, enabling multi-device access
    await db.query('DELETE FROM email_magic_links WHERE round_id = ?', [roundId]);
    await db.query('DELETE FROM magic_links WHERE round_id = ?', [roundId]);

    // Set magic link expiry to round lock time
    // Magic links remain valid until the round locks, allowing multi-device access
    // Each successful validation exchanges the magic link for a fresh JWT (8h expiry)
    const expiresAt = round.lock_time;
    const magicLinksData: Array<{ email: string; users: any[]; token: string; magicLink: string }> = [];
    const userMagicLinkValues: Array<[number, number, string, string, Date]> = [];
    const emailMagicLinkValues: Array<[string, number, string, string, Date]> = [];

    // Generate email-based magic links for shared emails
    // SECURITY: Store both hashed token (for validation) and plain token (for email URLs) in DB
    for (const { email, users } of sharedEmails) {
      const plainToken = generateMagicLinkToken();
      const tokenHash = hashMagicLinkToken(plainToken);
      magicLinksData.push({
        email,
        users,
        token: plainToken, // Plain token for email
        magicLink: `${APP_URL}/pick/${plainToken}`
      });
      emailMagicLinkValues.push([email, roundId, tokenHash, plainToken, expiresAt]); // Store hash and plain token in DB
      logger.debug('Created email magic link', { email: redactEmail(email), roundId, userCount: users.length });
    }

    // Generate user-based magic links for single-user emails
    // SECURITY: Store both hashed token (for validation) and plain token (for email URLs) in DB
    for (const { user } of singleUserEmails) {
      const plainToken = generateMagicLinkToken();
      const tokenHash = hashMagicLinkToken(plainToken);
      magicLinksData.push({
        email: user.email,
        users: [user],
        token: plainToken, // Plain token for email
        magicLink: `${APP_URL}/pick/${plainToken}`
      });
      userMagicLinkValues.push([user.id, roundId, tokenHash, plainToken, expiresAt]); // Store hash and plain token in DB
      logger.debug('Created user magic link', { userId: user.id, roundId, email: redactEmail(user.email) });
    }

    // Create email-based magic links for shared emails
    if (emailMagicLinkValues.length > 0) {
      await db.query(
        'INSERT INTO email_magic_links (email, round_id, token, plain_token, expires_at) VALUES ?',
        [emailMagicLinkValues]
      );
      logger.info('Inserted email magic links', { 
        roundId, 
        count: emailMagicLinkValues.length,
        roundIds: [...new Set(emailMagicLinkValues.map(v => v[1]))] // Verify all use same roundId
      });
    }

    // Create user-based magic links for single users
    if (userMagicLinkValues.length > 0) {
      await db.query(
        'INSERT INTO magic_links (user_id, round_id, token, plain_token, expires_at) VALUES ?',
        [userMagicLinkValues]
      );
      logger.info('Inserted user magic links', { 
        roundId, 
        count: userMagicLinkValues.length,
        roundIds: [...new Set(userMagicLinkValues.map(v => v[1]))] // Verify all use same roundId
      });
    }

    // Send all emails in parallel (much faster than sequential)
    await Promise.allSettled(
      magicLinksData.map(({ email, users, magicLink }) => {
        // Use the first user's name for the email, or create a family name
        const primaryUser = users[0];
        const displayName = users.length > 1 
          ? `${primaryUser.name} Family` 
          : primaryUser.name;
        
        return sendMagicLink(email, displayName, round.sport_name, magicLink, round.email_message, round.commissioner, users)
          .catch(emailError => {
            logger.error(`Failed to send email`, { emailError, emailRedacted: redactEmail(email) });
          });
      })
    );

    logger.info('Round activated', { 
      roundId, 
      sportName: round.sport_name, 
      participantCount: users.length 
    });

    res.json({ 
      message: 'Round activated and magic links sent successfully',
      userCount: users.length
    });
  } catch (error) {
    logger.error('Activate round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark round as completed and calculate scores (admin only)
router.post('/:id/complete', authenticateAdmin, validateRequest(completeRoundValidators), async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);
  const { 
    firstPlaceTeam, 
    secondPlaceTeam, 
    thirdPlaceTeam, 
    fourthPlaceTeam, 
    fifthPlaceTeam,
    manualScores 
  } = req.body;

  if (!firstPlaceTeam) {
    return res.status(400).json({ error: 'First place (champion) is required' });
  }

  try {
    await withTransaction(async (connection) => {
      // Get round details from rounds_v2
      const [rounds] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM rounds_v2 WHERE id = ?',
        [roundId]
      );

      if (rounds.length === 0) {
        throw new Error('Round not found');
      }

      const round = rounds[0];
      const pickType = round.pick_type || 'single';

      // Update round status to completed
      await connection.query(
        'UPDATE rounds_v2 SET status = ? WHERE id = ?',
        ['completed', roundId]
      );

      // Get or create teams for results and store in round_results_v2
      // Accept either team IDs (numbers) or team names (strings)
      const resultTeams: { place: number; teamId: number | null }[] = [];
      
      // Helper to convert team ID or name to team ID
      const getTeamId = async (teamInput: string | number): Promise<number> => {
        // Handle numeric strings (from HTML select elements which always return strings)
        if (typeof teamInput === 'string') {
          const numValue = parseInt(teamInput, 10);
          if (!isNaN(numValue) && numValue > 0 && String(numValue) === teamInput.trim()) {
            // It's a numeric string representing a team ID
            const [teams] = await connection.query<RowDataPacket[]>(
              'SELECT id FROM teams_v2 WHERE id = ?',
              [numValue]
            );
            if (teams.length === 0) {
              throw new Error(`Team with ID ${numValue} not found`);
            }
            return numValue;
          }
          // String name, get or create team
          return await getOrCreateTeam(connection, teamInput);
        } else if (typeof teamInput === 'number') {
          // Already an ID, validate it exists
          const [teams] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM teams_v2 WHERE id = ?',
            [teamInput]
          );
          if (teams.length === 0) {
            throw new Error(`Team with ID ${teamInput} not found`);
          }
          return teamInput;
        } else {
          throw new Error('Invalid team input: must be a number (team ID) or string (team name)');
        }
      };
      
      if (firstPlaceTeam) {
        const teamId = await getTeamId(firstPlaceTeam);
        resultTeams.push({ place: 1, teamId });
      }
      if (secondPlaceTeam) {
        const teamId = await getTeamId(secondPlaceTeam);
        resultTeams.push({ place: 2, teamId });
      }
      if (thirdPlaceTeam) {
        const teamId = await getTeamId(thirdPlaceTeam);
        resultTeams.push({ place: 3, teamId });
      }
      if (fourthPlaceTeam) {
        const teamId = await getTeamId(fourthPlaceTeam);
        resultTeams.push({ place: 4, teamId });
      }
      if (fifthPlaceTeam) {
        const teamId = await getTeamId(fifthPlaceTeam);
        resultTeams.push({ place: 5, teamId });
      }

      // Delete existing round results and insert new ones
      await connection.query(
        'DELETE FROM round_results_v2 WHERE round_id = ?',
        [roundId]
      );

      if (resultTeams.length > 0) {
        const resultValues = resultTeams.map(rt => [roundId, rt.place, rt.teamId]);
        await connection.query(
          'INSERT INTO round_results_v2 (round_id, place, team_id) VALUES ?',
          [resultValues]
        );
      }

      // Get all picks for this round from picks_v2
      const [picks] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM picks_v2 WHERE round_id = ?',
        [roundId]
      );

      // Get all pick items from pick_items_v2 (with team_id, not pick_value)
      const pickIds = picks.map(p => p.id);
      let pickItems: RowDataPacket[] = [];
      if (pickIds.length > 0) {
        [pickItems] = await connection.query<RowDataPacket[]>(
          'SELECT pick_id, pick_number, team_id FROM pick_items_v2 WHERE pick_id IN (?)',
          [pickIds]
        );
      }

      // Get round results (team_id per place) for comparison
      const [roundResults] = await connection.query<RowDataPacket[]>(
        'SELECT place, team_id FROM round_results_v2 WHERE round_id = ? ORDER BY place',
        [roundId]
      );
      
      // Build map of place -> team_id for quick lookup
      const resultsByPlace = new Map<number, number>();
      roundResults.forEach(rr => {
        resultsByPlace.set(rr.place, rr.team_id);
      });

      // Delete existing score details for this round
      await connection.query(
        'DELETE FROM score_details_v2 WHERE round_id = ?',
        [roundId]
      );

      // Calculate scores based on pick type
      if (pickType === 'single') {
        // Automatic scoring for single pick type
        // Compare pick_items_v2.team_id with round_results_v2.team_id
        
        for (const pick of picks) {
          // Get pick items for this pick (with team_id)
          const userPickItems = pickItems.filter(pi => pi.pick_id === pick.id);
          
          if (userPickItems.length === 0) {
            // No pick - insert place=0, count=1
            await connection.query(
              `INSERT INTO score_details_v2 (user_id, round_id, place, count)
               VALUES (?, ?, 0, 1)
               ON DUPLICATE KEY UPDATE count = 1`,
              [pick.user_id, roundId]
            );
            continue;
          }

          // Check each pick against round results (compare team_id)
          let matchedPlace: number | null = null;
          for (const item of userPickItems) {
            // Find which place this team_id matches in round_results_v2
            for (const [place, resultTeamId] of resultsByPlace.entries()) {
              if (item.team_id === resultTeamId) {
                matchedPlace = place;
                break;
              }
            }
            if (matchedPlace !== null) break;
          }

          if (matchedPlace !== null) {
            // Match found - insert score_details_v2 with place and count=1
            await connection.query(
              `INSERT INTO score_details_v2 (user_id, round_id, place, count)
               VALUES (?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE count = 1`,
              [pick.user_id, roundId, matchedPlace]
            );
          } else {
            // No match in top 5 - insert place=6 (sixth_plus_place), count=1
            await connection.query(
              `INSERT INTO score_details_v2 (user_id, round_id, place, count)
               VALUES (?, ?, 6, 1)
               ON DUPLICATE KEY UPDATE count = 1`,
              [pick.user_id, roundId]
            );
          }
        }
      } else {
        // Manual scoring for multiple pick type
        if (!manualScores || !Array.isArray(manualScores)) {
          throw new Error('Manual scores are required for multiple pick rounds');
        }

        for (const scoreData of manualScores) {
          const { userId, placement } = scoreData;
          let place: number;
          
          // Map placement string to place number
          switch(placement) {
            case 'first': place = 1; break;
            case 'second': place = 2; break;
            case 'third': place = 3; break;
            case 'fourth': place = 4; break;
            case 'fifth': place = 5; break;
            case 'sixth_plus': place = 6; break;
            default: place = 6; break; // Fallback
          }

          // Insert into score_details_v2
          await connection.query(
            `INSERT INTO score_details_v2 (user_id, round_id, place, count)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE count = 1`,
            [userId, roundId, place]
          );
        }
      }

      // Handle participants who didn't make picks (for both single and multiple pick types)
      // Get all season participants from season_participants_v2
      const [allParticipants] = await connection.query<RowDataPacket[]>(
        `SELECT u.id
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id
         WHERE sp.season_id = ? AND u.is_active = TRUE`,
        [round.season_id]
      );

      // Get user IDs who made picks
      const userIdsWithPicks = picks.map(p => p.user_id);

      // Find participants who didn't make picks
      const nonPickers = allParticipants.filter(p => !userIdsWithPicks.includes(p.id));

      // Create score records for non-pickers with place=0 (no_pick), count=1
      for (const nonPicker of nonPickers) {
        await connection.query(
          `INSERT INTO score_details_v2 (user_id, round_id, place, count)
           VALUES (?, ?, 0, 1)
           ON DUPLICATE KEY UPDATE count = 1`,
          [nonPicker.id, roundId]
        );
      }
    });

    // Send completion emails to all participants (batched for performance)
    try {
      logger.info('Starting completion email process', { roundId });
      
      // Get all season participants for this round
      const [seasonId] = await db.query<RowDataPacket[]>(
        'SELECT season_id FROM rounds_v2 WHERE id = ?',
        [roundId]
      );

      logger.info('Got season ID for round', { roundId, seasonId: seasonId[0]?.season_id });

      const [participants] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email 
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id 
         WHERE sp.season_id = ? AND u.is_active = TRUE`,
        [seasonId[0].season_id]
      );

      logger.info('Found participants for completion email', { 
        roundId, 
        participantCount: participants.length
      });

      const APP_URL = process.env.APP_URL || 'http://localhost:3003';
      const leaderboardLink = `${APP_URL}`;

      // Get current commissioner from admins table
      const [commissionerRows] = await db.query<RowDataPacket[]>(
        'SELECT name FROM admins WHERE is_commissioner = TRUE LIMIT 1'
      );
      const currentCommissioner = commissionerRows[0]?.name || null;

      // Prepare shared data once (reduces 500+ queries to ~5 queries)
      const sharedData = await prepareCompletionEmailData(roundId, seasonId[0].season_id);
      
      logger.info('Prepared shared completion email data', { 
        roundId, 
        participantCount: participants.length 
      });

      // Group participants by email to merge completion emails for shared addresses
      const participantsByEmail = new Map<string, Array<{ id: number; name: string }>>();
      participants.forEach((p: any) => {
        if (!participantsByEmail.has(p.email)) {
          participantsByEmail.set(p.email, []);
        }
        participantsByEmail.get(p.email)!.push({ id: p.id, name: p.name });
      });

      logger.info('Grouped participants by email', {
        roundId,
        uniqueEmails: participantsByEmail.size,
        totalParticipants: participants.length
      });

      // Send emails in batches to prevent overwhelming SMTP server and database
      const BATCH_SIZE = 10;
      const emailResults: PromiseSettledResult<void>[] = [];
      const emailEntries = Array.from(participantsByEmail.entries());
      
      for (let i = 0; i < emailEntries.length; i += BATCH_SIZE) {
        const batch = emailEntries.slice(i, i + BATCH_SIZE);
        
        logger.info(`Processing email batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(emailEntries.length / BATCH_SIZE)}`, {
          roundId,
          batchSize: batch.length,
          startIndex: i
        });

        const batchResults = await Promise.allSettled(
          batch.map(async ([email, users]) => {
            try {
              // Calculate performance data for each user sharing this email
              const usersData = users.map(user => {
                const performanceData = calculateUserPerformanceData(user.id, sharedData);
                return {
                  name: user.name,
                  pick: performanceData.userPick,
                  points: performanceData.userPoints
                };
              });

              // Get shared data from first user (same for all)
              const firstUserData = calculateUserPerformanceData(users[0].id, sharedData);
              
              await sendSportCompletionEmail(
                email,
                usersData,
                firstUserData.sportName,
                firstUserData.finalResults,
                firstUserData.leaderboard,
                leaderboardLink,
                currentCommissioner
              );
              
              logger.debug('Successfully sent completion email', { 
                roundId, 
                email: redactEmail(email),
                userCount: users.length
              });
            } catch (emailError) {
              logger.error(`Failed to send completion email`, { 
                emailRedacted: redactEmail(email), 
                emailError, 
                roundId,
                userCount: users.length
              });
              throw emailError;
            }
          })
        );

        emailResults.push(...batchResults);
        
        // Small delay between batches to avoid SMTP rate limiting
        if (i + BATCH_SIZE < emailEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Log results
      const successful = emailResults.filter(result => result.status === 'fulfilled').length;
      const failed = emailResults.filter(result => result.status === 'rejected').length;
      
      logger.info('Completion email process finished', { 
        roundId, 
        totalParticipants: participants.length,
        successful,
        failed
      });
    } catch (emailError) {
      // Don't fail the round completion if emails fail
      logger.error('Error sending completion emails', { 
        error: emailError, 
        roundId 
      });
    }

    res.json({ message: 'Round completed and scores calculated successfully' });
  } catch (error: any) {
    logger.error('Complete round error', { error, roundId });
    
    // Handle specific error messages
    if (error.message === 'Round not found') {
      return res.status(404).json({ error: 'Round not found' });
    } else if (error.message === 'Manual scores are required for multiple pick rounds') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Manually lock a round and send notifications (admin only)
router.post('/:id/lock', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Check if round exists and is active
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    if (round.status !== 'active') {
      return res.status(400).json({ error: 'Only active sports can be locked' });
    }

    // Lock the round
    await db.query('UPDATE rounds_v2 SET status = ? WHERE id = ?', ['locked', roundId]);

    // Send locked notifications to all participants
    await manualSendLockedNotification(roundId);

    res.json({ message: 'Sport locked and notifications sent successfully' });
  } catch (error) {
    logger.error('Lock round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlock completed round (admin only)
router.post('/:id/unlock', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Check if round exists and is completed
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    if (round.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed rounds can be unlocked' });
    }

    // Update round status to 'locked' (can be edited but picks are still locked)
    await db.query(
      'UPDATE rounds_v2 SET status = ? WHERE id = ?',
      ['locked', roundId]
    );

    res.json({ message: 'Round unlocked successfully' });
  } catch (error) {
    logger.error('Unlock round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete round teams (admin only)
router.delete('/:id/teams', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    await db.query('DELETE FROM round_teams_v2 WHERE round_id = ?', [roundId]);
    res.json({ message: 'Teams deleted successfully' });
  } catch (error) {
    logger.error('Delete teams error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teams with picks status for a round (admin only) - used to determine which teams can be deleted
router.get('/:id/teams-with-picks', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Get all teams for this round and check if any have picks
    const [teamsWithPicks] = await db.query<RowDataPacket[]>(
      `SELECT 
        t.id,
        t.name,
        MAX(CASE WHEN pi.team_id IS NOT NULL THEN 1 ELSE 0 END) as has_picks
      FROM round_teams_v2 rt
      JOIN teams_v2 t ON rt.team_id = t.id
      LEFT JOIN picks_v2 p ON p.round_id = ?
      LEFT JOIN pick_items_v2 pi ON pi.pick_id = p.id AND pi.team_id = t.id
      WHERE rt.round_id = ?
      GROUP BY t.id, t.name
      ORDER BY t.name`,
      [roundId, roundId]
    );

    res.json({
      teams: teamsWithPicks.map(t => ({
        id: t.id,
        name: t.name,
        hasPicks: t.has_picks === 1
      }))
    });
  } catch (error) {
    logger.error('Get teams with picks error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Add or update round teams (admin only) - accepts team objects with IDs
router.post('/:id/teams', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);
  const { teams } = req.body;

  if (!teams || !Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ error: 'Teams array is required' });
  }

  try {
    await withTransaction(async (connection) => {
      // Validate team objects: must have name, id is optional
      for (const team of teams) {
        if (!team.name || typeof team.name !== 'string') {
          throw new Error('Each team must have a name');
        }
        if (team.name.length > 100) {
          throw new Error('Team names must be 100 characters or less');
        }
        if (team.id !== undefined && typeof team.id !== 'number') {
          throw new Error('Team ID must be a number if provided');
        }
      }

      // Sanitize team names
      const sanitizedTeams = teams.map(t => ({
        id: t.id,
        name: sanitizePlainTextArray([t.name])[0]
      }));

      const teamIds: number[] = [];

      // Process each team: update existing (if it belongs to this round) or create new
      for (const team of sanitizedTeams) {
        if (team.id) {
          // Team has ID - verify it belongs to this round before updating
          const [roundTeam] = await connection.query<RowDataPacket[]>(
            'SELECT rt.team_id, t.name FROM round_teams_v2 rt JOIN teams_v2 t ON rt.team_id = t.id WHERE rt.round_id = ? AND rt.team_id = ?',
            [roundId, team.id]
          );

          if (roundTeam.length === 0) {
            // Team ID exists but doesn't belong to this round - create new team instead
            logger.warn('Team ID does not belong to this round, creating new team', {
              teamId: team.id,
              roundId,
              teamName: team.name
            });
            const newTeamId = await createTeam(connection, team.name);
            teamIds.push(newTeamId);
          } else {
            // Team belongs to this round - update name if changed
            if (roundTeam[0].name !== team.name) {
              await connection.query(
                'UPDATE teams_v2 SET name = ? WHERE id = ?',
                [team.name, team.id]
              );
              logger.info('Updated team name', { 
                teamId: team.id, 
                roundId,
                oldName: roundTeam[0].name, 
                newName: team.name 
              });
            }
            teamIds.push(team.id);
          }
        } else {
          // New team - create it (always create, never reuse for round isolation)
          const teamId = await createTeam(connection, team.name);
          teamIds.push(teamId);
        }
      }

      // Delete all existing round-team relationships
      await connection.query(
        'DELETE FROM round_teams_v2 WHERE round_id = ?',
        [roundId]
      );

      // Insert new relationships
      if (teamIds.length > 0) {
        // Remove duplicates (in case frontend sent duplicate teams)
        const uniqueTeamIds = [...new Set(teamIds)];
        
        if (uniqueTeamIds.length !== teamIds.length) {
          logger.warn('Duplicate teams detected in round update', {
            roundId,
            originalCount: teamIds.length,
            uniqueCount: uniqueTeamIds.length,
            teamIds
          });
        }
        
        const teamValues = uniqueTeamIds.map(teamId => [roundId, teamId]);
        
        // Use INSERT IGNORE to handle potential race conditions or duplicates
        await connection.query(
          'INSERT IGNORE INTO round_teams_v2 (round_id, team_id) VALUES ?',
          [teamValues]
        );
        
        // Verify all teams were properly linked
        const [linkedTeams] = await connection.query<RowDataPacket[]>(
          'SELECT team_id FROM round_teams_v2 WHERE round_id = ?',
          [roundId]
        );
        
        const linkedTeamIds = linkedTeams.map(t => t.team_id);
        const missingTeams = uniqueTeamIds.filter(id => !linkedTeamIds.includes(id));
        
        if (missingTeams.length > 0) {
          logger.error('Failed to link all teams to round during update', {
            roundId,
            expectedTeamIds: uniqueTeamIds,
            linkedTeamIds,
            missingTeamIds: missingTeams
          });
          throw new Error(`Failed to link ${missingTeams.length} team(s) to round. Please try again.`);
        }
        
        logger.info('Teams successfully updated for round', {
          roundId,
          teamCount: uniqueTeamIds.length,
          teamIds: uniqueTeamIds
        });
      }
    });

    res.json({ message: 'Teams updated successfully' });
  } catch (error: any) {
    logger.error('Update teams error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete round (admin only)
router.post('/:id/soft-delete', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Check if round exists
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await db.query(
      'UPDATE rounds_v2 SET deleted_at = NOW() WHERE id = ?',
      [roundId]
    );

    res.json({ message: 'Sport deleted successfully (can be restored)' });
  } catch (error) {
    logger.error('Soft delete round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore a deleted round (admin only)
router.post('/:id/restore', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Check if round exists and is deleted
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ? AND deleted_at IS NOT NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Deleted sport not found' });
    }

    // Restore by clearing deleted_at timestamp
    await db.query(
      'UPDATE rounds_v2 SET deleted_at = NULL WHERE id = ?',
      [roundId]
    );

    res.json({ message: 'Sport restored successfully' });
  } catch (error) {
    logger.error('Restore round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get deleted rounds for a season (admin only)
router.get('/season/:seasonId/deleted', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE season_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [seasonId]
    );
    res.json(rounds);
  } catch (error) {
    logger.error('Get deleted rounds error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Permanently delete a round (main admin only)
router.delete('/:id/permanent', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);
  const { confirmation } = req.body;

  try {
    // Check if user is main admin
    if (!req.isMainAdmin) {
      return res.status(403).json({ error: 'Only the Main Admin can permanently delete sports. Please contact the Main Admin to permanently delete this sport.' });
    }

    // Check if round exists and is already soft-deleted
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ? AND deleted_at IS NOT NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Deleted sport not found. Only soft-deleted sports can be permanently deleted.' });
    }

    // Verify confirmation
    if (confirmation !== 'PERMANENT DELETE') {
      return res.status(400).json({ error: 'Invalid confirmation. Must type "PERMANENT DELETE" exactly.' });
    }

    // Log pre-delete counts for verification
    const [pickCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM picks_v2 WHERE round_id = ?',
      [roundId]
    );
    const [scoreCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM score_details_v2 WHERE round_id = ?',
      [roundId]
    );
    const [teamCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM round_teams_v2 WHERE round_id = ?',
      [roundId]
    );
    const [linkCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM magic_links WHERE round_id = ?',
      [roundId]
    );
    const [reminderCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM reminder_log WHERE round_id = ?',
      [roundId]
    );

    logger.info('Pre-delete data counts', {
      roundId,
      sportName: rounds[0].sport_name,
      picks: pickCounts[0].count,
      scores: scoreCounts[0].count,
      teams: teamCounts[0].count,
      magicLinks: linkCounts[0].count,
      reminders: reminderCounts[0].count
    });

    // Permanently delete (CASCADE will handle all related data)
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM rounds_v2 WHERE id = ?',
      [roundId]
    );

    if (result.affectedRows === 0) {
      logger.error('Permanent delete failed - no rows affected', { roundId });
      return res.status(500).json({ error: 'Delete operation failed - round may have already been deleted' });
    }

    // Verify CASCADE deleted related data
    const [pickCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM picks_v2 WHERE round_id = ?',
      [roundId]
    );
    const [scoreCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM score_details_v2 WHERE round_id = ?',
      [roundId]
    );
    const [teamCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM round_teams_v2 WHERE round_id = ?',
      [roundId]
    );
    const [linkCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM magic_links WHERE round_id = ?',
      [roundId]
    );
    const [reminderCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM reminder_log WHERE round_id = ?',
      [roundId]
    );

    const cascadeSuccess = 
      pickCountsAfter[0].count === 0 &&
      scoreCountsAfter[0].count === 0 &&
      teamCountsAfter[0].count === 0 &&
      linkCountsAfter[0].count === 0 &&
      reminderCountsAfter[0].count === 0;

    if (!cascadeSuccess) {
      logger.error('CASCADE DELETE failed - orphaned data detected!', {
        roundId,
        orphanedPicks: pickCountsAfter[0].count,
        orphanedScores: scoreCountsAfter[0].count,
        orphanedTeams: teamCountsAfter[0].count,
        orphanedLinks: linkCountsAfter[0].count,
        orphanedReminders: reminderCountsAfter[0].count
      });
      return res.status(500).json({ 
        error: 'CASCADE DELETE failed - orphaned data remains. Database constraints may not be configured correctly.' 
      });
    }

    logger.info('Sport permanently deleted successfully', {
      roundId,
      sportName: rounds[0].sport_name,
      deletedRows: result.affectedRows,
      cascadeSuccess: true,
      deletedPicks: pickCounts[0].count,
      deletedScores: scoreCounts[0].count,
      deletedTeams: teamCounts[0].count,
      deletedLinks: linkCounts[0].count,
      deletedReminders: reminderCounts[0].count
    });

    res.json({ message: 'Sport permanently deleted' });
  } catch (error) {
    logger.error('Permanent delete round error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual generic reminder trigger (admin only)
router.post('/:id/send-reminder', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    const result = await manualSendGenericReminder(roundId);
    res.json(result);
  } catch (error: any) {
    logger.error('Send reminder error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Force send daily reminder (main admin only) - for testing
router.post('/force-send-daily-reminders', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { checkAndSendReminders } = await import('../services/reminderScheduler');
    const { SettingsService } = await import('../services/settingsService');
    
    // Get all active rounds from rounds_v2 + seasons_v2
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.timezone, r.email_message, r.status
       FROM rounds_v2 r
       JOIN seasons_v2 s ON r.season_id = s.id 
       WHERE r.status = 'active' 
       AND r.lock_time > NOW()
       AND r.deleted_at IS NULL
       AND s.is_active = TRUE
       AND s.deleted_at IS NULL
       AND s.ended_at IS NULL`,
      []
    );
    
    if (rounds.length === 0) {
      return res.json({ message: 'No active rounds found', sent: 0 });
    }
    
    // Get reminder settings
    const reminderSettings = await SettingsService.getReminderSettings();
    
    if (reminderSettings.reminderType !== 'daily') {
      return res.status(400).json({ error: 'Reminder type must be set to "daily" to force send daily reminders' });
    }
    
    // Force send daily reminders for all active rounds
    const { checkAndSendDailyReminder } = await import('../services/reminderScheduler');
    const now = new Date();
    let sentCount = 0;
    
    for (const round of rounds) {
      try {
        await checkAndSendDailyReminder(round, now, reminderSettings, true); // force = true
        sentCount++;
      } catch (error) {
        logger.error('Error forcing daily reminder', { roundId: round.id, error });
      }
    }
    
    logger.info('Forced daily reminders sent', { 
      adminId: req.adminId, 
      roundCount: sentCount 
    });
    
    res.json({ 
      message: `Force sent daily reminders to ${sentCount} active round(s)`,
      sent: sentCount
    });
  } catch (error: any) {
    logger.error('Force send daily reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auto-lock expired rounds (admin only) - for immediate testing
router.post('/auto-lock-expired', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { autoLockExpiredRounds } = await import('../services/reminderScheduler');
    await autoLockExpiredRounds();
    res.json({ message: 'Auto-lock check completed' });
  } catch (error: any) {
    logger.error('Auto-lock expired rounds error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test completion email (admin only) - for debugging
router.post('/test-completion-email', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { sendSportCompletionEmail } = await import('../services/emailService');
    
    // Test data
    const testData = {
      email: 'test@example.com', // You can change this to your email for testing
      users: [
        { name: 'Test User', pick: 'Yankees', points: 6 }
      ],
      sportName: 'Test Sport',
      finalResults: [
        { place: 1, team: 'Yankees' },
        { place: 2, team: 'Red Sox' },
        { place: 3, team: 'Dodgers' }
      ],
      leaderboard: [
        { name: 'Sarah Johnson', points: 24, isCurrentUser: false },
        { name: 'Mike Chen', points: 22, isCurrentUser: false },
        { name: 'Test User', points: 18, isCurrentUser: true },
        { name: 'Emily Davis', points: 16, isCurrentUser: false },
        { name: 'Alex Wilson', points: 14, isCurrentUser: false }
      ],
      leaderboardLink: process.env.APP_URL || 'http://localhost:3003'
    };
    
    await sendSportCompletionEmail(
      testData.email,
      testData.users,
      testData.sportName,
      testData.finalResults,
      testData.leaderboard,
      testData.leaderboardLink
    );
    
    res.json({ message: 'Test completion email sent successfully' });
  } catch (error: any) {
    logger.error('Test completion email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/send-locked-notification', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    await manualSendLockedNotification(roundId);
    res.json({ message: 'Locked notification sent successfully' });
  } catch (error: any) {
    logger.error('Send locked notification error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teams for complete round modal (admin only)
router.get('/:id/complete-teams', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Get round details from rounds_v2
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds_v2 WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    // Get the complete round selection method setting
    const settings = await SettingsService.getTextSettings();
    const selectionMethod = settings.completeRoundSelectionMethod || 'player_picks';

    // Get all available teams for this round from round_teams_v2 + teams_v2
    // Also include write-in teams from pick_items_v2 that aren't in round_teams_v2
    const [allTeams] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT combined.id, combined.name
       FROM (
         -- Teams linked to the round (from round_teams_v2)
         SELECT t.id, t.name
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id = ?
         
         UNION
         
         -- Write-in teams from picks (from pick_items_v2)
         SELECT DISTINCT t.id, t.name
         FROM picks_v2 p
         JOIN pick_items_v2 pi ON p.id = pi.pick_id
         JOIN teams_v2 t ON pi.team_id = t.id
         WHERE p.round_id = ?
           AND pi.team_id NOT IN (
             SELECT rt.team_id 
             FROM round_teams_v2 rt 
             WHERE rt.round_id = ?
           )
       ) as combined
       ORDER BY combined.name`,
      [roundId, roundId, roundId]
    );

    // If using current approach, return all teams
    if (selectionMethod === 'current') {
      return res.json({
        championTeams: allTeams,
        otherTeams: allTeams
      });
    }

    // If using player picks approach, get teams that were actually picked from picks_v2 + pick_items_v2 + teams_v2
    const [picks] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT t.name as pick_value 
       FROM picks_v2 p 
       JOIN pick_items_v2 pi ON p.id = pi.pick_id
       JOIN teams_v2 t ON pi.team_id = t.id
       WHERE p.round_id = ? AND t.name IS NOT NULL`,
      [roundId]
    );

    const pickedTeams = picks.map(pick => pick.pick_value);
    const playerPickTeams = allTeams.filter(team => pickedTeams.includes(team.name));

    return res.json({
      championTeams: allTeams, // Champion always gets full list
      otherTeams: playerPickTeams.length > 0 ? playerPickTeams : allTeams // 2nd-5th get player picks, fallback to all if none
    });

  } catch (error) {
    logger.error('Get complete round teams error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
