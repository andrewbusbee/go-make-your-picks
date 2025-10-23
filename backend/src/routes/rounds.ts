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

const router = express.Router();

// Helper function to prepare shared data for all completion emails (calculated once)
const prepareCompletionEmailData = async (roundId: number, seasonId: number) => {
  try {
    // Get round data with final results
    const [roundData] = await db.query<RowDataPacket[]>(
      `SELECT sport_name, first_place_team, second_place_team, third_place_team, fourth_place_team, fifth_place_team 
       FROM rounds WHERE id = ?`,
      [roundId]
    );

    const round = roundData[0];
    const finalResults = [
      { place: 1, team: round.first_place_team },
      { place: 2, team: round.second_place_team },
      { place: 3, team: round.third_place_team },
      { place: 4, team: round.fourth_place_team },
      { place: 5, team: round.fifth_place_team }
    ].filter(result => result.team);

    // Get points settings once for all calculations
    const pointsSettings = await SettingsService.getPointsSettings();

    // Get all picks for this round (single query for all users)
    const [allPicks] = await db.query<RowDataPacket[]>(
      `SELECT p.user_id, pi.pick_value 
       FROM picks p 
       LEFT JOIN pick_items pi ON p.id = pi.pick_id 
       WHERE p.round_id = ?`,
      [roundId]
    );

    // Build user picks map for O(1) lookup
    const userPicksMap = new Map<number, string>();
    allPicks.forEach(pick => {
      if (pick.pick_value) {
        userPicksMap.set(pick.user_id, pick.pick_value);
      }
    });

    // Get all completed rounds for this season
    const [completedRounds] = await db.query<RowDataPacket[]>(
      'SELECT id FROM rounds WHERE season_id = ? AND status = ?',
      [seasonId, 'completed']
    );

    const completedRoundIds = completedRounds.map(r => r.id);

    // Get leaderboard data for all participants (single query)
    const [leaderboardData] = await db.query<RowDataPacket[]>(
      `SELECT u.name, u.id, s.round_id, s.first_place, s.second_place, s.third_place, s.fourth_place, s.fifth_place, s.sixth_plus_place, s.no_pick
       FROM users u
       LEFT JOIN scores s ON u.id = s.user_id AND s.round_id IN (${completedRoundIds.map(() => '?').join(',')})
       JOIN season_participants sp ON u.id = sp.user_id AND sp.season_id = ?
       WHERE u.is_active = TRUE`,
      [...completedRoundIds, seasonId]
    );

    // Calculate total points for each user
    const userTotals = new Map<number, { name: string; points: number }>();
    
    leaderboardData.forEach(entry => {
      if (!userTotals.has(entry.id)) {
        userTotals.set(entry.id, { name: entry.name, points: 0 });
      }
      
      if (entry.round_id) {
        // Calculate points for this round
        const roundPoints = 
          (entry.first_place || 0) * pointsSettings.pointsFirst +
          (entry.second_place || 0) * pointsSettings.pointsSecond +
          (entry.third_place || 0) * pointsSettings.pointsThird +
          (entry.fourth_place || 0) * pointsSettings.pointsFourth +
          (entry.fifth_place || 0) * pointsSettings.pointsFifth +
          (entry.sixth_plus_place || 0) * pointsSettings.pointsSixthPlus +
          (entry.no_pick || 0) * pointsSettings.pointsNoPick;
        
        userTotals.get(entry.id)!.points += roundPoints;
      }
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
      sortedLeaderboard,
      sportName: round.sport_name
    };
  } catch (error) {
    logger.error('Error preparing completion email data', { error, roundId, seasonId });
    throw error;
  }
};

// Helper function to calculate user-specific performance data from shared data
const calculateUserPerformanceData = (
  userId: number,
  sharedData: {
    round: any;
    finalResults: any[];
    pointsSettings: any;
    userPicksMap: Map<number, string>;
    sortedLeaderboard: any[];
    sportName: string;
  }
) => {
  const { round, finalResults, pointsSettings, userPicksMap, sortedLeaderboard, sportName } = sharedData;
  
  // Get user's pick
  const userPickValue = userPicksMap.get(userId);
  let userPoints = 0;
  let userPick = 'No pick';
  
  if (userPickValue) {
    userPick = userPickValue;
    const lowerPickValue = userPickValue.toLowerCase();
    
    // Calculate points based on placement
    if (round.first_place_team && lowerPickValue === round.first_place_team.toLowerCase()) {
      userPoints = pointsSettings.pointsFirst;
    } else if (round.second_place_team && lowerPickValue === round.second_place_team.toLowerCase()) {
      userPoints = pointsSettings.pointsSecond;
    } else if (round.third_place_team && lowerPickValue === round.third_place_team.toLowerCase()) {
      userPoints = pointsSettings.pointsThird;
    } else if (round.fourth_place_team && lowerPickValue === round.fourth_place_team.toLowerCase()) {
      userPoints = pointsSettings.pointsFourth;
    } else if (round.fifth_place_team && lowerPickValue === round.fifth_place_team.toLowerCase()) {
      userPoints = pointsSettings.pointsFifth;
    } else {
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
    userPick,
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
      'SELECT * FROM rounds WHERE deleted_at IS NULL ORDER BY created_at DESC'
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
      'SELECT * FROM rounds WHERE season_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [seasonId]
    );
    
    // Optimize: Get participants once for the entire season (not per round)
    const [participants] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       WHERE sp.season_id = ? AND u.is_active = TRUE
       ORDER BY u.name ASC`,
      [seasonId]
    );
    
    // Optimize: Get all picks for all active rounds in this season (single query)
    const activeRoundIds = rounds.filter(r => r.status === 'active').map(r => r.id);
    let picksMap = new Map<number, Set<number>>(); // roundId -> Set of userIds who picked
    
    if (activeRoundIds.length > 0) {
      const [allPicks] = await db.query<RowDataPacket[]>(
        'SELECT round_id, user_id FROM picks WHERE round_id IN (?)',
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
    
    // Get all teams for all rounds in this season (single query)
    const teamsMap = new Map<number, any[]>();
    
    if (rounds.length > 0) {
      const [allTeams] = await db.query<RowDataPacket[]>(
        'SELECT round_id, team_name FROM round_teams WHERE round_id IN (?)',
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
      'SELECT * FROM rounds WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const [teams] = await db.query<RowDataPacket[]>(
      'SELECT * FROM round_teams WHERE round_id = ? ORDER BY team_name',
      [roundId]
    );

    res.json({
      ...rounds[0],
      teams
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
        'INSERT INTO rounds (season_id, sport_name, pick_type, num_write_in_picks, email_message, lock_time, timezone, reminder_type, daily_reminder_time, first_reminder_hours, final_reminder_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [seasonId, sportName, validPickType, validPickType === 'multiple' ? numWriteInPicks : null, emailMessage || null, mysqlLockTime, validTimezone, validReminderType, validDailyReminderTime, validFirstReminderHours, validFinalReminderHours, 'draft']
      );

      const roundId = result.insertId;

      // Add teams if provided (only for single pick type)
      if (validPickType === 'single' && teams && Array.isArray(teams) && teams.length > 0) {
        // Validate team name lengths
        for (const team of teams) {
          if (team.length > 100) {
            throw new Error('Team names must be 100 characters or less');
          }
        }
        // Sanitize inputs without HTML-encoding characters like '/'
        const cleanedTeams = sanitizePlainTextArray(teams);
        const teamValues = cleanedTeams.map((team: string) => [roundId, team]);
        await connection.query(
          'INSERT INTO round_teams (round_id, team_name) VALUES ?',
          [teamValues]
        );
      }

      return roundId;
    });

    res.status(201).json({
      message: 'Round created successfully',
      id: roundId
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
      'SELECT id, is_active, ended_at FROM seasons WHERE id = ? AND deleted_at IS NULL',
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
      'SELECT timezone FROM rounds WHERE id = ?',
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
      `UPDATE rounds SET 
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

  try {
    // Get round details
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT r.* FROM rounds r WHERE r.id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    // Update round status
    await db.query('UPDATE rounds SET status = ? WHERE id = ?', ['active', roundId]);

    // Get season participants only (not all users), excluding deactivated players
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT u.* FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       WHERE sp.season_id = (SELECT season_id FROM rounds WHERE id = ?)
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
    await db.query('DELETE FROM email_magic_links WHERE round_id = ?', [roundId]);
    await db.query('DELETE FROM magic_links WHERE round_id = ?', [roundId]);

    const expiresAt = round.lock_time;
    const magicLinksData: Array<{ email: string; users: any[]; token: string; magicLink: string }> = [];
    const userMagicLinkValues: Array<[number, number, string, Date]> = [];
    const emailMagicLinkValues: Array<[string, number, string, Date]> = [];

    // Generate email-based magic links for shared emails
    for (const { email, users } of sharedEmails) {
      const token = crypto.randomBytes(32).toString('hex');
      magicLinksData.push({
        email,
        users,
        token,
        magicLink: `${APP_URL}/pick/${token}`
      });
      emailMagicLinkValues.push([email, roundId, token, expiresAt]);
    }

    // Generate user-based magic links for single-user emails
    for (const { user } of singleUserEmails) {
      const token = crypto.randomBytes(32).toString('hex');
      magicLinksData.push({
        email: user.email,
        users: [user],
        token,
        magicLink: `${APP_URL}/pick/${token}`
      });
      userMagicLinkValues.push([user.id, roundId, token, expiresAt]);
    }

    // Create email-based magic links for shared emails
    if (emailMagicLinkValues.length > 0) {
      await db.query(
        'INSERT INTO email_magic_links (email, round_id, token, expires_at) VALUES ?',
        [emailMagicLinkValues]
      );
    }

    // Create user-based magic links for single users
    if (userMagicLinkValues.length > 0) {
      await db.query(
        'INSERT INTO magic_links (user_id, round_id, token, expires_at) VALUES ?',
        [userMagicLinkValues]
      );
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
      // Get round details
      const [rounds] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM rounds WHERE id = ?',
        [roundId]
      );

      if (rounds.length === 0) {
        throw new Error('Round not found');
      }

      const round = rounds[0];
      const pickType = round.pick_type || 'single';

      // Update round with results
      await connection.query(
        'UPDATE rounds SET status = ?, first_place_team = ?, second_place_team = ?, third_place_team = ?, fourth_place_team = ?, fifth_place_team = ? WHERE id = ?',
        ['completed', firstPlaceTeam, secondPlaceTeam || null, thirdPlaceTeam || null, fourthPlaceTeam || null, fifthPlaceTeam || null, roundId]
      );

      // Get all picks for this round
      const [picks] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM picks WHERE round_id = ?',
        [roundId]
      );

      // Get all pick items
      const pickIds = picks.map(p => p.id);
      let pickItems: RowDataPacket[] = [];
      if (pickIds.length > 0) {
        [pickItems] = await connection.query<RowDataPacket[]>(
          'SELECT * FROM pick_items WHERE pick_id IN (?)',
          [pickIds]
        );
      }

      // Calculate scores based on pick type
      if (pickType === 'single') {
        // Automatic scoring for single pick type
        const placements = [firstPlaceTeam, secondPlaceTeam, thirdPlaceTeam, fourthPlaceTeam, fifthPlaceTeam].filter(Boolean);
        
        for (const pick of picks) {
          let first = 0, second = 0, third = 0, fourth = 0, fifth = 0, sixthPlus = 0;

          // Get pick items for this pick
          const userPickItems = pickItems.filter(pi => pi.pick_id === pick.id);
          
          // Check each pick against placements (case insensitive)
          let matched = false;
          for (const item of userPickItems) {
            const pickValue = item.pick_value.toLowerCase();
            
            if (firstPlaceTeam && pickValue === firstPlaceTeam.toLowerCase()) {
              first = 1;
              matched = true;
              break;
            } else if (secondPlaceTeam && pickValue === secondPlaceTeam.toLowerCase()) {
              second = 1;
              matched = true;
              break;
            } else if (thirdPlaceTeam && pickValue === thirdPlaceTeam.toLowerCase()) {
              third = 1;
              matched = true;
              break;
            } else if (fourthPlaceTeam && pickValue === fourthPlaceTeam.toLowerCase()) {
              fourth = 1;
              matched = true;
              break;
            } else if (fifthPlaceTeam && pickValue === fifthPlaceTeam.toLowerCase()) {
              fifth = 1;
              matched = true;
              break;
            }
          }

          // If no match in top 5, they get 6th+ place point
          if (!matched) {
            sixthPlus = 1;
          }

          // Insert or update score (flags only, points calculated dynamically)
          await connection.query(
            `INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place, no_pick)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE 
             first_place = VALUES(first_place),
             second_place = VALUES(second_place),
             third_place = VALUES(third_place),
             fourth_place = VALUES(fourth_place),
             fifth_place = VALUES(fifth_place),
             sixth_plus_place = VALUES(sixth_plus_place),
             no_pick = 0`,
            [pick.user_id, roundId, first, second, third, fourth, fifth, sixthPlus]
          );
        }
      } else {
        // Manual scoring for multiple pick type
        if (!manualScores || !Array.isArray(manualScores)) {
          throw new Error('Manual scores are required for multiple pick rounds');
        }

        for (const scoreData of manualScores) {
          const { userId, placement } = scoreData;
          let first = 0, second = 0, third = 0, fourth = 0, fifth = 0, sixthPlus = 0;
          
          // Set the appropriate placement flag based on selection
          switch(placement) {
            case 'first': first = 1; break;
            case 'second': second = 1; break;
            case 'third': third = 1; break;
            case 'fourth': fourth = 1; break;
            case 'fifth': fifth = 1; break;
            case 'sixth_plus': sixthPlus = 1; break;
            default: sixthPlus = 1; break; // Fallback for legacy or undefined
          }

          await connection.query(
            `INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place, no_pick)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE 
             first_place = VALUES(first_place),
             second_place = VALUES(second_place),
             third_place = VALUES(third_place),
             fourth_place = VALUES(fourth_place),
             fifth_place = VALUES(fifth_place),
             sixth_plus_place = VALUES(sixth_plus_place),
             no_pick = 0`,
            [userId, roundId, first, second, third, fourth, fifth, sixthPlus]
          );
        }
      }

      // Handle participants who didn't make picks (for both single and multiple pick types)
      // Get all season participants
      const [allParticipants] = await connection.query<RowDataPacket[]>(
        `SELECT u.id
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         WHERE sp.season_id = ? AND u.is_active = TRUE`,
        [round.season_id]
      );

      // Get user IDs who made picks
      const userIdsWithPicks = picks.map(p => p.user_id);

      // Find participants who didn't make picks
      const nonPickers = allParticipants.filter(p => !userIdsWithPicks.includes(p.id));

      // Create score records for non-pickers with no_pick = 1
      for (const nonPicker of nonPickers) {
        await connection.query(
          `INSERT INTO scores (user_id, round_id, first_place, second_place, third_place, fourth_place, fifth_place, sixth_plus_place, no_pick)
           VALUES (?, ?, 0, 0, 0, 0, 0, 0, 1)
           ON DUPLICATE KEY UPDATE 
           first_place = 0,
           second_place = 0,
           third_place = 0,
           fourth_place = 0,
           fifth_place = 0,
           sixth_plus_place = 0,
           no_pick = 1`,
          [nonPicker.id, roundId]
        );
      }
    });

    // Send completion emails to all participants (batched for performance)
    try {
      logger.info('Starting completion email process', { roundId });
      
      // Get all season participants for this round
      const [seasonId] = await db.query<RowDataPacket[]>(
        'SELECT season_id FROM rounds WHERE id = ?',
        [roundId]
      );

      logger.info('Got season ID for round', { roundId, seasonId: seasonId[0]?.season_id });

      const [participants] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email 
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id 
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
      'SELECT * FROM rounds WHERE id = ?',
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
    await db.query('UPDATE rounds SET status = ? WHERE id = ?', ['locked', roundId]);

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
      'SELECT * FROM rounds WHERE id = ?',
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
      'UPDATE rounds SET status = ? WHERE id = ?',
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
    await db.query('DELETE FROM round_teams WHERE round_id = ?', [roundId]);
    res.json({ message: 'Teams deleted successfully' });
  } catch (error) {
    logger.error('Delete teams error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Add round teams (admin only)
router.post('/:id/teams', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);
  const { teams } = req.body;

  if (!teams || !Array.isArray(teams) || teams.length === 0) {
    return res.status(400).json({ error: 'Teams array is required' });
  }

  try {
    const cleaned = sanitizePlainTextArray(teams);
    const teamValues = cleaned.map((team: string) => [roundId, team]);
    await db.query(
      'INSERT INTO round_teams (round_id, team_name) VALUES ?',
      [teamValues]
    );

    res.json({ message: 'Teams added successfully' });
  } catch (error) {
    logger.error('Add teams error', { error, roundId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete round (admin only)
router.post('/:id/soft-delete', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Check if round exists
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    // Soft delete by setting deleted_at timestamp
    await db.query(
      'UPDATE rounds SET deleted_at = NOW() WHERE id = ?',
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
      'SELECT * FROM rounds WHERE id = ? AND deleted_at IS NOT NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Deleted sport not found' });
    }

    // Restore by clearing deleted_at timestamp
    await db.query(
      'UPDATE rounds SET deleted_at = NULL WHERE id = ?',
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
      'SELECT * FROM rounds WHERE season_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
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
      'SELECT * FROM rounds WHERE id = ? AND deleted_at IS NOT NULL',
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
      'SELECT COUNT(*) as count FROM picks WHERE round_id = ?',
      [roundId]
    );
    const [scoreCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM scores WHERE round_id = ?',
      [roundId]
    );
    const [teamCounts] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM round_teams WHERE round_id = ?',
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
      'DELETE FROM rounds WHERE id = ?',
      [roundId]
    );

    if (result.affectedRows === 0) {
      logger.error('Permanent delete failed - no rows affected', { roundId });
      return res.status(500).json({ error: 'Delete operation failed - round may have already been deleted' });
    }

    // Verify CASCADE deleted related data
    const [pickCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM picks WHERE round_id = ?',
      [roundId]
    );
    const [scoreCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM scores WHERE round_id = ?',
      [roundId]
    );
    const [teamCountsAfter] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM round_teams WHERE round_id = ?',
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
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Force send daily reminder (main admin only) - for testing
router.post('/force-send-daily-reminders', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { checkAndSendReminders } = await import('../services/reminderScheduler');
    const { SettingsService } = await import('../services/settingsService');
    
    // Get all active rounds
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.timezone, r.email_message, r.status
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
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
    res.status(500).json({ error: error.message || 'Server error' });
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
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/:id/send-locked-notification', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    await manualSendLockedNotification(roundId);
    res.json({ message: 'Locked notification sent successfully' });
  } catch (error: any) {
    logger.error('Send locked notification error', { error, roundId });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get teams for complete round modal (admin only)
router.get('/:id/complete-teams', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const roundId = parseInt(req.params.id);

  try {
    // Get round details
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT * FROM rounds WHERE id = ? AND deleted_at IS NULL',
      [roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    // Get the complete round selection method setting
    const settings = await SettingsService.getTextSettings();
    const selectionMethod = settings.completeRoundSelectionMethod || 'player_picks';

    // Get all available teams for this round
    const [allTeams] = await db.query<RowDataPacket[]>(
      'SELECT * FROM round_teams WHERE round_id = ? ORDER BY team_name',
      [roundId]
    );

    // If using current approach, return all teams
    if (selectionMethod === 'current') {
      return res.json({
        championTeams: allTeams,
        otherTeams: allTeams
      });
    }

    // If using player picks approach, get teams that were actually picked
    const [picks] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT pi.pick_value 
       FROM picks p 
       JOIN pick_items pi ON p.id = pi.pick_id 
       WHERE p.round_id = ? AND pi.pick_value IS NOT NULL`,
      [roundId]
    );

    const pickedTeams = picks.map(pick => pick.pick_value);
    const playerPickTeams = allTeams.filter(team => pickedTeams.includes(team.team_name));

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
