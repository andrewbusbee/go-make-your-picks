// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express from 'express';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import moment from 'moment-timezone';
import { pickSubmissionLimiter, magicLinkValidationLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validator';
import { submitPickValidators } from '../validators/picksValidators';
import logger from '../utils/logger';
import { PicksService } from '../services/picksService';
import { withTransaction } from '../utils/transactionWrapper';

const router = express.Router();

// Validate magic link and get round info
router.get('/validate/:token', magicLinkValidationLimiter, async (req, res) => {
  const { token } = req.params;

  try {
    // First try email-based magic links
    const [emailLinks] = await db.query<RowDataPacket[]>(
      `SELECT eml.*, r.*, s.name as season_name
       FROM email_magic_links eml
       JOIN rounds r ON eml.round_id = r.id
       JOIN seasons s ON r.season_id = s.id
       WHERE eml.token = ?`,
      [token]
    );

    if (emailLinks.length > 0) {
      // Handle email-based magic link (shared email scenario)
      const link = emailLinks[0];
      
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

      // Get all users with this email address
      const [users] = await db.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         WHERE u.email = ? AND sp.season_id = ? AND u.is_active = TRUE
         ORDER BY u.name ASC`,
        [link.email, link.season_id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'No active users found for this email' });
      }

      // Get available teams
      const [teams] = await db.query<RowDataPacket[]>(
        'SELECT team_name FROM round_teams WHERE round_id = ? ORDER BY team_name',
        [link.round_id]
      );

      // Get current picks for all users
      const userIds = users.map(u => u.id);
      const [picks] = await db.query<RowDataPacket[]>(
        'SELECT * FROM picks WHERE user_id IN (?) AND round_id = ?',
        [userIds, link.round_id]
      );

      // Get pick items for all picks
      const pickIds = picks.map(p => p.id);
      let pickItems: RowDataPacket[] = [];
      if (pickIds.length > 0) {
        [pickItems] = await db.query<RowDataPacket[]>(
          'SELECT pick_id, pick_number, pick_value FROM pick_items WHERE pick_id IN (?) ORDER BY pick_id, pick_number',
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
        teams: teams.map(t => t.team_name)
      });
    }

    // Fallback to user-based magic links (legacy support)
    const [links] = await db.query<RowDataPacket[]>(
      `SELECT ml.*, u.name as user_name, u.email, r.*, s.name as season_name
       FROM magic_links ml
       JOIN users u ON ml.user_id = u.id
       JOIN rounds r ON ml.round_id = r.id
       JOIN seasons s ON r.season_id = s.id
       WHERE ml.token = ?`,
      [token]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    const link = links[0];
    
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

    // Get available teams
    const [teams] = await db.query<RowDataPacket[]>(
      'SELECT team_name FROM round_teams WHERE round_id = ? ORDER BY team_name',
      [link.round_id]
    );

    // Get user's current pick if exists
    const [picks] = await db.query<RowDataPacket[]>(
      'SELECT * FROM picks WHERE user_id = ? AND round_id = ?',
      [link.user_id, link.round_id]
    );

    let currentPick = null;
    if (picks.length > 0) {
      // Get pick items for this pick
      const [pickItems] = await db.query<RowDataPacket[]>(
        'SELECT pick_number, pick_value FROM pick_items WHERE pick_id = ? ORDER BY pick_number',
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
      teams: teams.map(t => t.team_name),
      currentPick
    });
  } catch (error) {
    logger.error('Validate magic link error', { error, token });
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit or update pick via magic link
router.post('/:token', pickSubmissionLimiter, validateRequest(submitPickValidators), async (req, res) => {
  const { token } = req.params;
  const { picks, userId } = req.body; // picks: Array of pick values, userId: for shared email scenarios

  try {
    await withTransaction(async (connection) => {
      // First try email-based magic links
      const [emailLinks] = await connection.query<RowDataPacket[]>(
        `SELECT eml.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks, r.season_id
         FROM email_magic_links eml
         JOIN rounds r ON eml.round_id = r.id
         WHERE eml.token = ?`,
        [token]
      );

      logger.debug('Magic link lookup', { 
        token: token.substring(0, 8) + '...', 
        emailLinksFound: emailLinks.length,
        hasUserId: !!userId,
        userId: userId,
        picks: picks
      });

      if (emailLinks.length > 0) {
        // Handle email-based magic link (shared email scenario)
        // Only process if we have a userId (indicating this is a shared email scenario)
        if (!userId) {
          // This token exists in email_magic_links but no userId provided
          // This shouldn't happen in normal flow, but let's fall through to legacy logic
          logger.warn('Email magic link found but no userId provided', { 
            token: token.substring(0, 8) + '...',
            email: emailLinks[0].email 
          });
        } else {
          const link = emailLinks[0];
          const pickType = link.pick_type || 'single';
          
          // Get current time in the round's timezone
          const now = moment.tz(link.timezone);
          
          // Parse lock time from database (stored as UTC) and convert to round's timezone
          const lockTime = moment.utc(link.lock_time).tz(link.timezone);

          // Check if expired
          if (now.isAfter(lockTime) || link.status === 'locked' || link.status === 'completed') {
            throw new Error('This round is now locked');
          }

          const [users] = await connection.query<RowDataPacket[]>(
            `SELECT u.id FROM users u
             JOIN season_participants sp ON u.id = sp.user_id
             WHERE u.email = ? AND u.id = ? AND sp.season_id = ? AND u.is_active = TRUE`,
            [link.email, userId, link.season_id]
          );

          logger.debug('Shared email user validation', {
            email: link.email,
            userId: userId,
            seasonId: link.season_id,
            roundId: link.round_id,
            usersFound: users.length,
            token: token.substring(0, 8) + '...'
          });

          if (users.length === 0) {
            // Let's also check what users exist for this email
            const [allUsersForEmail] = await connection.query<RowDataPacket[]>(
              `SELECT u.id, u.name, u.email, u.is_active, sp.season_id 
               FROM users u
               LEFT JOIN season_participants sp ON u.id = sp.user_id
               WHERE u.email = ?`,
              [link.email]
            );
            
            logger.error('User validation failed - debugging info', {
              email: link.email,
              requestedUserId: userId,
              seasonId: link.season_id,
              allUsersForEmail: allUsersForEmail,
              token: token.substring(0, 8) + '...'
            });
            
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

          logger.info('Shared email pick submitted successfully', { token, userId, pickCount: picks.length });
          return;
        }
      }

      // Fallback to user-based magic links (legacy support)
      const [links] = await connection.query<RowDataPacket[]>(
        `SELECT ml.*, r.lock_time, r.timezone, r.status, r.pick_type, r.num_write_in_picks
         FROM magic_links ml
         JOIN rounds r ON ml.round_id = r.id
         WHERE ml.token = ?`,
        [token]
      );

      if (links.length === 0) {
        throw new Error('Invalid magic link');
      }

      const link = links[0];
      const pickType = link.pick_type || 'single';
      
      // Get current time in the round's timezone
      const now = moment.tz(link.timezone);
      
      // Parse lock time from database (stored as UTC) and convert to round's timezone
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

      logger.info('Pick submitted successfully', { token, pickCount: picks.length });
    });

    res.json({ message: 'Pick submitted successfully' });
  } catch (error: any) {
    logger.error('Submit pick error', { error, token });
    
    // Handle specific error messages
    if (error.message === 'Invalid magic link') {
      return res.status(404).json({ error: 'Invalid magic link' });
    } else if (error.message === 'This round is now locked') {
      return res.status(403).json({ error: 'This round is now locked' });
    }
    
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;
