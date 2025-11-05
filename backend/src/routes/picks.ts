// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express from 'express';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import moment from 'moment-timezone';
import { pickSubmissionLimiter, magicLinkValidationLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validator';
import { submitPickValidators } from '../validators/picksValidators';
import { body } from 'express-validator';
import logger, { maskMagicToken } from '../utils/logger';
import { PicksService } from '../services/picksService';
import { withTransaction } from '../utils/transactionWrapper';
import { generatePickToken } from '../utils/jwtToken';
import { authenticatePick, PickAuthRequest } from '../middleware/pickAuth';
import { hashMagicLinkToken, verifyMagicLinkToken } from '../utils/magicLinkToken';

const router = express.Router();

/**
 * Shared validation logic for magic link tokens
 * Returns validation result for email-based or user-based magic links
 */
async function validateMagicLinkToken(token: string): Promise<{
  type: 'email' | 'user';
  data: any;
} | null> {
  // First try email-based magic links
  const validateEmailTokenHash = hashMagicLinkToken(token);
  const [emailLinks] = await db.query<RowDataPacket[]>(
    `SELECT eml.*, r.*, s.name as season_name
     FROM email_magic_links eml
     JOIN rounds_v2 r ON eml.round_id = r.id
     JOIN seasons_v2 s ON r.season_id = s.id
     WHERE (eml.token = ? OR eml.token = ?)`,
    [validateEmailTokenHash, token] // Try hash first, then plain text for legacy tokens
  );

  if (emailLinks.length > 0) {
    return { type: 'email', data: emailLinks[0] };
  }

  // Fallback to user-based magic links
  const userTokenHash = hashMagicLinkToken(token);
  const [links] = await db.query<RowDataPacket[]>(
    `SELECT ml.*, u.name as user_name, u.email, r.*, s.name as season_name
     FROM magic_links ml
     JOIN users u ON ml.user_id = u.id
     JOIN rounds_v2 r ON ml.round_id = r.id
     JOIN seasons_v2 s ON r.season_id = s.id
     WHERE (ml.token = ? OR ml.token = ?)`,
    [userTokenHash, token] // Try hash first, then plain text for legacy tokens
  );

  if (links.length > 0) {
    return { type: 'user', data: links[0] };
  }

  return null;
}

/**
 * @deprecated: Legacy GET magic link validation; prefer POST /api/picks/validate
 * 
 * This endpoint is kept for backward compatibility but tokens in URL paths can be
 * exposed in browser history, server logs, and referrer headers. Use the POST
 * endpoint instead for better security.
 * 
 * Validate magic link and get round info
 * 
 * Magic links are multi-use until the round locks. This endpoint validates the token and returns
 * round/user information without issuing a JWT. Use /exchange to get a JWT access token.
 * 
 * The magic link remains valid until the round's lock_time or the magic link's expires_at.
 */
router.get('/validate/:token', magicLinkValidationLimiter, async (req, res) => {
  const { token } = req.params;

  try {
    const validationResult = await validateMagicLinkToken(token);
    
    if (!validationResult) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    if (validationResult.type === 'email') {
      // Handle email-based magic link (shared email scenario)
      const link = validationResult.data;
      
      // Validate magic link is still active
      // Check both round lock time and magic link expires_at (use stricter of the two)
      const now = moment.tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);
      const expiresAt = moment.utc(link.expires_at).tz(link.timezone);

      // Magic link is invalid if round is locked/completed OR if expires_at has passed
      if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
        return res.status(410).json({ 
          error: 'This magic link has expired or the round is now locked',
          locked: true
        });
      }

      // Get all users with this email address
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id
         WHERE u.email = ? AND sp.season_id = ? AND u.is_active = TRUE
         ORDER BY u.name ASC`,
        [link.email, link.season_id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'No active users found for this email' });
      }

      // Get available teams from round_teams_v2 + teams_v2 (with IDs for dropdown)
      const [teams] = await db.query<RowDataPacket[]>(
        `SELECT t.id, t.name
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id = ?
         ORDER BY t.name`,
        [link.round_id]
      );

      // Get current picks for all users from picks_v2
      const userIds = users.map(u => u.id);
      const [picks] = await db.query<RowDataPacket[]>(
        'SELECT * FROM picks_v2 WHERE user_id IN (?) AND round_id = ?',
        [userIds, link.round_id]
      );

      // Get pick items for all picks from pick_items_v2 + teams_v2
      const pickIds = picks.map(p => p.id);
      let pickItems: RowDataPacket[] = [];
      if (pickIds.length > 0) {
        [pickItems] = await db.query<RowDataPacket[]>(
          `SELECT pi.pick_id, pi.pick_number, t.name as pick_value
           FROM pick_items_v2 pi
           JOIN teams_v2 t ON pi.team_id = t.id
           WHERE pi.pick_id IN (?)
           ORDER BY pi.pick_id, pi.pick_number`,
          [pickIds]
        );
      }

      // Group picks by user
      const userPicks = users.map(user => {
        const userPick = picks.find(p => p.user_id === user.id);
        let currentPick = null;
        
        if (userPick) {
          const items = pickItems.filter(item => item.pick_id === userPick.id);
          currentPick = {
            id: userPick.id,
            pickItems: items.map(item => ({
              pickNumber: item.pick_number,
              pickValue: item.pick_value
            }))
          };
        }

        return {
          id: user.id,
          name: user.name,
          currentPick
        };
      });

      return res.json({
        valid: true,
        isSharedEmail: true,
        email: link.email,
        users: userPicks,
        round: {
          id: link.round_id,
          sportName: link.sport_name,
          pickType: link.pick_type || 'single',
          numWriteInPicks: link.num_write_in_picks,
          lockTime: link.lock_time,
          timezone: link.timezone,
          status: link.status,
          seasonName: link.season_name,
          email_message: link.email_message
        },
        teams: teams.map(t => ({ id: t.id, name: t.name }))
      });
    } else {
      // Handle user-based magic link
      const link = validationResult.data;
      
      // Get current time in the round's timezone
      const now = moment.tz(link.timezone);
      
      // Parse lock time from database (stored as UTC) and convert to round's timezone
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);

      // Check if expired
      if (now.isAfter(lockTime)) {
        return res.status(403).json({ 
          error: 'This round is now locked',
          locked: true
        });
      }

      // Get available teams from round_teams_v2 + teams_v2 (with IDs for dropdown)
      const [teams] = await db.query<RowDataPacket[]>(
      `SELECT t.id, t.name
       FROM round_teams_v2 rt
       JOIN teams_v2 t ON rt.team_id = t.id
       WHERE rt.round_id = ?
       ORDER BY t.name`,
      [link.round_id]
    );

    // Get user's current pick if exists from picks_v2
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT * FROM picks_v2 WHERE user_id = ? AND round_id = ?',
      [link.user_id, link.round_id]
    );

    let currentPick = null;
    if (picks.length > 0) {
      // Get pick items for this pick from pick_items_v2 + teams_v2
      const [pickItems] = await db.query<RowDataPacket[]>(
        `SELECT pi.pick_number, t.name as pick_value
         FROM pick_items_v2 pi
         JOIN teams_v2 t ON pi.team_id = t.id
         WHERE pi.pick_id = ?
         ORDER BY pi.pick_number`,
        [picks[0].id]
      );
      
      currentPick = {
        id: picks[0].id,
        pickItems: pickItems.map(item => ({
          pickNumber: item.pick_number,
          pickValue: item.pick_value
        }))
      };
    }

    res.json({
      valid: true,
      isSharedEmail: false,
      user: {
        id: link.user_id,
        name: link.user_name
        // Email removed for privacy - not needed for pick submission
      },
      round: {
        id: link.round_id,
        sportName: link.sport_name,
        pickType: link.pick_type || 'single',
        numWriteInPicks: link.num_write_in_picks,
        lockTime: link.lock_time,
        timezone: link.timezone,
        status: link.status,
        seasonName: link.season_name,
        email_message: link.email_message
      },
      teams: teams.map(t => ({ id: t.id, name: t.name })),
      currentPick
    });
  } catch (error) {
    logger.error('Validate magic link error', { error, tokenMasked: maskMagicToken(token) });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/picks/validate - Validate magic link token (preferred method)
 * 
 * This endpoint accepts the token in the request body instead of the URL path,
 * which reduces token exposure in logs, browser history, and referrer headers.
 * 
 * Request body: { "token": "<magicLinkToken>" }
 * 
 * Magic links are multi-use until the round locks. This endpoint validates the token 
 * and returns round/user information without issuing a JWT. Use /exchange to get a JWT access token.
 * 
 * The magic link remains valid until the round's lock_time or the magic link's expires_at.
 */
router.post('/validate', magicLinkValidationLimiter, validateRequest([
  body('token')
    .notEmpty().withMessage('Token is required')
    .isString().withMessage('Token must be a string')
]), async (req, res) => {
  const { token } = req.body;

  try {
    const validationResult = await validateMagicLinkToken(token);
    
    if (!validationResult) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    if (validationResult.type === 'email') {
      // Handle email-based magic link (shared email scenario)
      const link = validationResult.data;
      
      // Validate magic link is still active
      const now = moment.tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);
      const expiresAt = moment.utc(link.expires_at).tz(link.timezone);

      if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
        return res.status(410).json({ 
          error: 'This magic link has expired or the round is now locked',
          locked: true
        });
      }

      // Get all users with this email address
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email
         FROM users u
         JOIN season_participants_v2 sp ON u.id = sp.user_id
         WHERE u.email = ? AND sp.season_id = ? AND u.is_active = TRUE
         ORDER BY u.name ASC`,
        [link.email, link.season_id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'No active users found for this email' });
      }

      // Get available teams
      const [teams] = await db.query<RowDataPacket[]>(
        `SELECT t.id, t.name
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id = ?
         ORDER BY t.name`,
        [link.round_id]
      );

      // Get current picks for all users
      const userIds = users.map(u => u.id);
      const [picks] = await db.query<RowDataPacket[]>(
        'SELECT * FROM picks_v2 WHERE user_id IN (?) AND round_id = ?',
        [userIds, link.round_id]
      );

      const pickIds = picks.map(p => p.id);
      let pickItems: RowDataPacket[] = [];
      if (pickIds.length > 0) {
        [pickItems] = await db.query<RowDataPacket[]>(
          `SELECT pi.pick_id, pi.pick_number, t.name as pick_value
           FROM pick_items_v2 pi
           JOIN teams_v2 t ON pi.team_id = t.id
           WHERE pi.pick_id IN (?)
           ORDER BY pi.pick_id, pi.pick_number`,
          [pickIds]
        );
      }

      const userPicks = users.map(user => {
        const userPick = picks.find(p => p.user_id === user.id);
        let currentPick = null;
        
        if (userPick) {
          const items = pickItems.filter(item => item.pick_id === userPick.id);
          currentPick = {
            id: userPick.id,
            pickItems: items.map(item => ({
              pickNumber: item.pick_number,
              pickValue: item.pick_value
            }))
          };
        }

        return {
          id: user.id,
          name: user.name,
          currentPick
        };
      });

      return res.json({
        valid: true,
        isSharedEmail: true,
        email: link.email,
        users: userPicks,
        round: {
          id: link.round_id,
          sportName: link.sport_name,
          pickType: link.pick_type || 'single',
          numWriteInPicks: link.num_write_in_picks,
          lockTime: link.lock_time,
          timezone: link.timezone,
          status: link.status,
          seasonName: link.season_name,
          email_message: link.email_message
        },
        teams: teams.map(t => ({ id: t.id, name: t.name }))
      });
    } else {
      // Handle user-based magic link
      const link = validationResult.data;
      
      const now = moment.tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);

      if (now.isAfter(lockTime)) {
        return res.status(403).json({ 
          error: 'This round is now locked',
          locked: true
        });
      }

      // Get available teams
      const [teams] = await db.query<RowDataPacket[]>(
        `SELECT t.id, t.name
         FROM round_teams_v2 rt
         JOIN teams_v2 t ON rt.team_id = t.id
         WHERE rt.round_id = ?
         ORDER BY t.name`,
        [link.round_id]
      );

      // Get user's current pick
      const [picks] = await db.query<RowDataPacket[]>(
        'SELECT * FROM picks_v2 WHERE user_id = ? AND round_id = ?',
        [link.user_id, link.round_id]
      );

      let currentPick = null;
      if (picks.length > 0) {
        const [pickItems] = await db.query<RowDataPacket[]>(
          `SELECT pi.pick_number, t.name as pick_value
           FROM pick_items_v2 pi
           JOIN teams_v2 t ON pi.team_id = t.id
           WHERE pi.pick_id = ?
           ORDER BY pi.pick_number`,
          [picks[0].id]
        );
        
        currentPick = {
          id: picks[0].id,
          pickItems: pickItems.map(item => ({
            pickNumber: item.pick_number,
            pickValue: item.pick_value
          }))
        };
      }

      return res.json({
        valid: true,
        isSharedEmail: false,
        user: {
          id: link.user_id,
          name: link.user_name
        },
        round: {
          id: link.round_id,
          sportName: link.sport_name,
          pickType: link.pick_type || 'single',
          numWriteInPicks: link.num_write_in_picks,
          lockTime: link.lock_time,
          timezone: link.timezone,
          status: link.status,
          seasonName: link.season_name,
          email_message: link.email_message
        },
        teams: teams.map(t => ({ id: t.id, name: t.name })),
        currentPick
      });
    }
  } catch (error) {
    logger.error('Validate magic link error (POST)', { error, tokenMasked: maskMagicToken(token) });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Exchange magic link token for JWT access token
 * 
 * Magic links are multi-use: the same link can be used multiple times (mobile, desktop, etc.)
 * until the round locks. Each successful exchange issues a fresh JWT access token (default: 8h expiry).
 * 
 * The magic link remains valid until:
 * - The round's lock_time is reached, OR
 * - The magic link's expires_at is reached (whichever comes first)
 * 
 * This endpoint is idempotent: repeated calls with the same valid token will succeed and issue new JWTs.
 */
router.post('/exchange/:token', magicLinkValidationLimiter, async (req, res) => {
  const { token } = req.params;

  try {
    // First try email-based magic links
    // SECURITY: Hash the incoming token and compare to stored hash
    // Also support legacy plain-text tokens for backward compatibility during migration
    const exchangeEmailTokenHash = hashMagicLinkToken(token);
    const [emailLinks] = await db.query<RowDataPacket[]>(
      `SELECT eml.*, r.season_id, r.lock_time, r.timezone, r.status
       FROM email_magic_links eml
       JOIN rounds_v2 r ON eml.round_id = r.id
       WHERE (eml.token = ? OR eml.token = ?)
       AND eml.expires_at > NOW()`,
      [exchangeEmailTokenHash, token] // Try hash first, then plain text for legacy tokens
    );

    if (emailLinks.length > 0) {
      const link = emailLinks[0];
      
      // Validate magic link is still active
      // Check both round lock time and magic link expires_at (use stricter of the two)
      const now = moment.tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);
      const expiresAt = moment.utc(link.expires_at).tz(link.timezone);
      
      // Magic link is invalid if round is locked/completed OR if expires_at has passed
      if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
        return res.status(410).json({ 
          error: 'This magic link has expired or the round is now locked',
          locked: true
        });
      }

      // Magic link is valid - issue a fresh JWT (8h expiry by default)
      // This does NOT invalidate the magic link - it can be used again
      const jwtToken = generatePickToken(link.round_id, link.season_id, undefined, link.email);
      
      logger.info('Magic link exchanged for JWT (email-based)', {
        roundId: link.round_id,
        emailRedacted: link.email ? link.email.substring(0, 3) + '****' : 'N/A',
        tokenMasked: maskMagicToken(token)
      });

      return res.json({
        token: jwtToken,
        roundId: link.round_id,
        seasonId: link.season_id,
        isSharedEmail: true
      });
    }

    // Fallback to user-based magic links
    // SECURITY: Hash the incoming token and compare to stored hash
    // Also support legacy plain-text tokens for backward compatibility during migration
    const exchangeUserTokenHash = hashMagicLinkToken(token);
    const [links] = await db.query<RowDataPacket[]>(
      `SELECT ml.*, r.season_id, r.lock_time, r.timezone, r.status
       FROM magic_links ml
       JOIN rounds_v2 r ON ml.round_id = r.id
       WHERE (ml.token = ? OR ml.token = ?)
       AND ml.expires_at > NOW()`,
      [exchangeUserTokenHash, token] // Try hash first, then plain text for legacy tokens
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    const link = links[0];
    
    // Validate magic link is still active
    // Check both round lock time and magic link expires_at (use stricter of the two)
    const now = moment.tz(link.timezone);
    const lockTime = moment.utc(link.lock_time).tz(link.timezone);
    const expiresAt = moment.utc(link.expires_at).tz(link.timezone);
    
    // Magic link is invalid if round is locked/completed OR if expires_at has passed
    if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
      return res.status(410).json({ 
        error: 'This magic link has expired or the round is now locked',
        locked: true
      });
    }

    // Magic link is valid - issue a fresh JWT (8h expiry by default)
    // This does NOT invalidate the magic link - it can be used again
    const jwtToken = generatePickToken(link.round_id, link.season_id, link.user_id);
    
    logger.info('Magic link exchanged for JWT (user-based)', {
      roundId: link.round_id,
      userId: link.user_id,
      tokenMasked: maskMagicToken(token)
    });

    return res.json({
      token: jwtToken,
      roundId: link.round_id,
      seasonId: link.season_id,
      userId: link.user_id,
      isSharedEmail: false
    });
  } catch (error) {
    logger.error('Exchange magic link error', { error, tokenMasked: maskMagicToken(token) });
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit or update pick via JWT (new endpoint - replaces POST /:token)
router.post('/submit', authenticatePick, pickSubmissionLimiter, validateRequest(submitPickValidators), async (req: PickAuthRequest, res) => {
  const { picks, userId } = req.body;
  const roundId = req.roundId!;
  const seasonId = req.seasonId!;

  try {
    await withTransaction(async (connection) => {
      // Get round details
      const [rounds] = await connection.query<RowDataPacket[]>(
        `SELECT r.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks
         FROM rounds_v2 r
         WHERE r.id = ?`,
        [roundId]
      );

      if (rounds.length === 0) {
        throw new Error('Round not found');
      }

      const round = rounds[0];
      const pickType = round.pick_type || 'single';
      
      // Get current time in the round's timezone
      const now = moment.tz(round.timezone);
      
      // Parse lock time from database (stored as UTC) and convert to round's timezone
      const lockTime = moment.utc(round.lock_time).tz(round.timezone);

      // Check if expired
      if (now.isAfter(lockTime) || round.status === 'locked' || round.status === 'completed') {
        throw new Error('This round is now locked');
      }

      // Determine which user to submit for
      let targetUserId: number;
      
      if (req.pickAuth!.isSharedEmail) {
        // Shared email scenario - userId must be provided
        if (!userId) {
          throw new Error('User ID is required for shared email scenarios');
        }
        
        // Verify user belongs to the email/season
        const [users] = await connection.query<RowDataPacket[]>(
          `SELECT u.id FROM users u
           JOIN season_participants_v2 sp ON u.id = sp.user_id
           WHERE u.email = ? AND u.id = ? AND sp.season_id = ? AND u.is_active = TRUE`,
          [req.email!, userId, seasonId]
        );

        if (users.length === 0) {
          throw new Error('Invalid user for this email address');
        }
        
        targetUserId = userId;
      } else {
        // Single user scenario - use userId from JWT
        if (!req.pickAuth!.userId) {
          throw new Error('User ID missing from token');
        }
        targetUserId = req.pickAuth!.userId;
      }

      // Submit pick using centralized service
      const shouldValidateTeams = pickType === 'single';
      
      await PicksService.submitPick(connection, {
        userId: targetUserId,
        roundId,
        picks,
        validateTeams: shouldValidateTeams
      });

      logger.info('Pick submitted successfully via JWT', {
        userId: targetUserId,
        roundId,
        pickCount: picks.length
      });
    });

    res.json({ message: 'Pick submitted successfully' });
  } catch (error: any) {
    logger.error('Submit pick error', { error, roundId: req.roundId });
    
    // Handle specific error messages (safe to expose)
    if (error.message === 'Round not found') {
      return res.status(404).json({ error: 'Round not found' });
    } else if (error.message === 'This round is now locked') {
      return res.status(403).json({ error: 'This round is now locked' });
    } else if (error.message.includes('User ID')) {
      return res.status(400).json({ error: error.message });
    }
    
    // Generic error for all other cases
    res.status(500).json({ error: 'Server error' });
  }
});

// Legacy endpoint: Submit or update pick via magic link token (deprecated but kept for backward compatibility)
// This endpoint will be removed in a future version - use POST /picks/submit with JWT instead
router.post('/:token', pickSubmissionLimiter, validateRequest(submitPickValidators), async (req, res) => {
  const { token } = req.params;
  const { picks, userId } = req.body;

  try {
    await withTransaction(async (connection) => {
      // First try email-based magic links
      // SECURITY: Hash the incoming token and compare to stored hash
      // Also support legacy plain-text tokens for backward compatibility during migration
      const legacyEmailTokenHash = hashMagicLinkToken(token);
      const [emailLinks] = await connection.query<RowDataPacket[]>(
        `SELECT eml.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks, r.season_id
         FROM email_magic_links eml
         JOIN rounds_v2 r ON eml.round_id = r.id
         WHERE (eml.token = ? OR eml.token = ?)
         AND eml.expires_at > NOW()`,
        [legacyEmailTokenHash, token] // Try hash first, then plain text for legacy tokens
      );

      logger.debug('Magic link lookup (legacy endpoint)', { 
        tokenMasked: maskMagicToken(token), 
        emailLinksFound: emailLinks.length,
        hasUserId: !!userId,
        userId: userId
      });

      if (emailLinks.length > 0) {
        // Handle email-based magic link (shared email scenario)
        if (!userId) {
          logger.warn('Email magic link found but no userId provided', { 
            tokenMasked: maskMagicToken(token),
            emailRedacted: emailLinks[0].email 
          });
          throw new Error('User ID is required for shared email scenarios');
        }
        
        const link = emailLinks[0];
        const pickType = link.pick_type || 'single';
        
        // Validate magic link is still active
        // Check both round lock time and magic link expires_at (use stricter of the two)
        const now = moment.tz(link.timezone);
        const lockTime = moment.utc(link.lock_time).tz(link.timezone);
        const expiresAt = moment.utc(link.expires_at).tz(link.timezone);

        // Magic link is invalid if round is locked/completed OR if expires_at has passed
        if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
          throw new Error('This round is now locked');
        }

        const [users] = await connection.query<RowDataPacket[]>(
          `SELECT u.id FROM users u
           JOIN season_participants_v2 sp ON u.id = sp.user_id
           WHERE u.email = ? AND u.id = ? AND sp.season_id = ? AND u.is_active = TRUE`,
          [link.email, userId, link.season_id]
        );

        if (users.length === 0) {
          throw new Error('Invalid user for this email address');
        }

        // Submit pick using centralized service
        const shouldValidateTeams = pickType === 'single';
        
        await PicksService.submitPick(connection, {
          userId: userId,
          roundId: link.round_id,
          picks,
          validateTeams: shouldValidateTeams
        });

        logger.info('Shared email pick submitted successfully (legacy endpoint)', { 
          tokenMasked: maskMagicToken(token), 
          userId, 
          pickCount: picks.length 
        });
        return;
      }

      // Fallback to user-based magic links
      // SECURITY: Hash the incoming token and compare to stored hash
      // Also support legacy plain-text tokens for backward compatibility during migration
      const legacyUserTokenHash = hashMagicLinkToken(token);
      const [links] = await connection.query<RowDataPacket[]>(
        `SELECT ml.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks
         FROM magic_links ml
         JOIN rounds_v2 r ON ml.round_id = r.id
         WHERE (ml.token = ? OR ml.token = ?)
         AND ml.expires_at > NOW()`,
        [legacyUserTokenHash, token] // Try hash first, then plain text for legacy tokens
      );

      if (links.length === 0) {
        throw new Error('Invalid magic link');
      }

      const link = links[0];
      const pickType = link.pick_type || 'single';
      
      // Get current time in the round's timezone
      const now = moment.tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);

      // Check if expired
      if (now.isAfter(lockTime) || link.status === 'locked' || link.status === 'completed') {
        throw new Error('This round is now locked');
      }

      // Submit pick using centralized service
      const shouldValidateTeams = pickType === 'single';
      
      await PicksService.submitPick(connection, {
        userId: link.user_id,
        roundId: link.round_id,
        picks,
        validateTeams: shouldValidateTeams
      });

      logger.info('Pick submitted successfully (legacy endpoint)', { 
        tokenMasked: maskMagicToken(token), 
        pickCount: picks.length 
      });
    });

    res.json({ message: 'Pick submitted successfully' });
  } catch (error: any) {
    logger.error('Submit pick error (legacy endpoint)', { error, tokenMasked: maskMagicToken(token) });
    
    // Handle specific error messages (safe to expose)
    if (error.message === 'Invalid magic link') {
      return res.status(404).json({ error: 'Invalid magic link' });
    } else if (error.message === 'This round is now locked') {
      return res.status(403).json({ error: 'This round is now locked' });
    }
    
    // Generic error for all other cases
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
