import cron from 'node-cron';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendMagicLink, sendLockedNotification } from './emailService';
import logger, { logSchedulerEvent } from '../utils/logger';

// Check for rounds needing reminders and auto-lock expired rounds
export const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    
    // First, auto-lock any rounds that have passed their lock time
    await autoLockExpiredRounds();
    
    // Get all active rounds that haven't been completed (with commissioner from season)
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner 
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
       WHERE r.status = 'active' AND r.lock_time > NOW()`,
      []
    );

    for (const round of rounds) {
      const lockTime = new Date(round.lock_time);
      const timeDiff = lockTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Check if we need to send 48-hour reminder (between 47-49 hours)
      if (hoursDiff >= 47 && hoursDiff <= 49) {
        await sendReminderIfNotSent(round, '48h');
      }

      // Check if we need to send 6-hour reminder (between 5-7 hours)
      if (hoursDiff >= 5 && hoursDiff <= 7) {
        await sendReminderIfNotSent(round, '6h');
      }
    }

    // Check for rounds that just locked (locked in the last hour)
    const [lockedRounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner 
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
       WHERE r.status = 'locked' 
       AND r.lock_time <= NOW() 
       AND r.lock_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      []
    );

    for (const round of lockedRounds) {
      await sendLockedNotificationIfNotSent(round);
    }

  } catch (error) {
    logger.error('Error in reminder scheduler', { error });
  }
};

// Auto-lock rounds that have passed their lock time
export const autoLockExpiredRounds = async () => {
  try {
    // Find active rounds that have passed their lock time (with commissioner from season)
    const [expiredRounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner 
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
       WHERE r.status = 'active' AND r.lock_time <= NOW()`,
      []
    );

    for (const round of expiredRounds) {
      try {
        // Update status to locked
        await db.query('UPDATE rounds SET status = ? WHERE id = ?', ['locked', round.id]);
        
        // Send locked notifications
        await sendLockedNotificationIfNotSent(round);
        
        logSchedulerEvent(`Auto-locked round: ${round.sport_name} (ID: ${round.id})`);
        logger.info('Auto-locked expired round', { 
          roundId: round.id, 
          sportName: round.sport_name,
          lockTime: round.lock_time 
        });
      } catch (error) {
        logger.error('Error auto-locking round', { 
          error, 
          roundId: round.id, 
          sportName: round.sport_name 
        });
      }
    }

    if (expiredRounds.length > 0) {
      logSchedulerEvent(`Auto-locked ${expiredRounds.length} expired round(s)`);
    }

  } catch (error) {
    logger.error('Error in auto-lock expired rounds', { error });
  }
};

// Send reminder to users who haven't picked yet
export const sendReminderIfNotSent = async (round: any, reminderType: '48h' | '6h') => {
  try {
    // Check if this reminder was already sent
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM reminder_log WHERE round_id = ? AND reminder_type = ?',
      [round.id, reminderType]
    );

    if (existing.length > 0) {
      return; // Already sent
    }

    // Get users who are in this season but haven't made picks yet, excluding deactivated players
    // Use LEFT JOIN on magic_links to include users who don't have magic links yet
    const [usersWithoutPicks] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT u.id, u.email, u.name, ml.token
       FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       LEFT JOIN magic_links ml ON u.id = ml.user_id AND ml.round_id = ?
       LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?
       WHERE sp.season_id = ? AND p.id IS NULL AND u.is_active = TRUE`,
      [round.id, round.id, round.season_id]
    );

    if (usersWithoutPicks.length === 0) {
      return; // Everyone has picked
    }

    // Identify users who need magic links created
    const usersNeedingLinks = usersWithoutPicks.filter(user => !user.token);
    
    if (usersNeedingLinks.length > 0) {
      logger.info(`Creating magic links for ${usersNeedingLinks.length} new participant(s)`, {
        roundId: round.id,
        userIds: usersNeedingLinks.map(u => u.id)
      });

      // Get round details for expires_at
      const [roundDetails] = await db.query<RowDataPacket[]>(
        'SELECT lock_time FROM rounds WHERE id = ?',
        [round.id]
      );
      
      const expiresAt = roundDetails[0].lock_time;

      // Create magic links for users who don't have them
      const crypto = require('crypto');
      const magicLinkValues = usersNeedingLinks.map(user => {
        const token = crypto.randomBytes(32).toString('hex');
        // Store the token on the user object so we can use it below
        user.token = token;
        return [user.id, round.id, token, expiresAt];
      });

      await db.query(
        'INSERT INTO magic_links (user_id, round_id, token, expires_at) VALUES ?',
        [magicLinkValues]
      );

      logger.info(`Created ${magicLinkValues.length} magic link(s)`, { roundId: round.id });
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3003';
    const reminderText = reminderType === '48h' 
      ? '⏰ Reminder: You have about 48 hours left to make your pick!'
      : '🚨 Final reminder: You only have about 6 hours left to make your pick!';

    // Send reminder emails in parallel
    await Promise.allSettled(
      usersWithoutPicks.map(user => {
        const magicLink = `${APP_URL}/pick/${user.token}`;
        const customMessage = round.email_message 
          ? `${reminderText}\n\n${round.email_message}`
          : reminderText;

        return sendMagicLink(user.email, user.name, round.sport_name, magicLink, customMessage, round.commissioner)
          .catch(emailError => {
            logger.error(`Failed to send reminder to ${user.email}`, { emailError });
          });
      })
    );

    // Log the reminder
    await db.query<ResultSetHeader>(
      'INSERT INTO reminder_log (round_id, reminder_type, recipient_count) VALUES (?, ?, ?)',
      [round.id, reminderType, usersWithoutPicks.length]
    );

    logSchedulerEvent(`Sent ${reminderType} reminder`, {
      roundId: round.id,
      recipientCount: usersWithoutPicks.length,
    });

  } catch (error) {
    logger.error(`Error sending ${reminderType} reminder`, { roundId: round.id, error });
  }
};

// Send locked notification to all participants
export const sendLockedNotificationIfNotSent = async (round: any) => {
  try {
    // Check if this notification was already sent
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM reminder_log WHERE round_id = ? AND reminder_type = ?',
      [round.id, 'locked']
    );

    if (existing.length > 0) {
      return; // Already sent
    }

    // Get all users in this season
    const [allUsers] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT u.id, u.email, u.name
       FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       WHERE sp.season_id = ?`,
      [round.season_id]
    );

    if (allUsers.length === 0) {
      return;
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3003';
    const leaderboardLink = `${APP_URL}`;

    // Send locked notification to all users in parallel
    await Promise.allSettled(
      allUsers.map(user =>
        sendLockedNotification(user.email, user.name, round.sport_name, leaderboardLink)
          .catch(emailError => {
            logger.error(`Failed to send locked notification to ${user.email}`, { emailError });
          })
      )
    );

    // Log the notification
    await db.query<ResultSetHeader>(
      'INSERT INTO reminder_log (round_id, reminder_type, recipient_count) VALUES (?, ?, ?)',
      [round.id, 'locked', allUsers.length]
    );

    logSchedulerEvent('Sent locked notification', {
      roundId: round.id,
      recipientCount: allUsers.length,
    });

  } catch (error) {
    logger.error('Error sending locked notification', { roundId: round.id, error });
  }
};

// Manual trigger functions for admin use
export const manualSendReminder = async (roundId: number, reminderType: '48h' | '6h') => {
  const [rounds] = await db.query<RowDataPacket[]>(
    'SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner FROM rounds r JOIN seasons s ON r.season_id = s.id WHERE r.id = ?',
    [roundId]
  );

  if (rounds.length === 0) {
    throw new Error('Round not found');
  }

  // Remove existing log to allow resend
  await db.query('DELETE FROM reminder_log WHERE round_id = ? AND reminder_type = ?', [roundId, reminderType]);
  
  await sendReminderIfNotSent(rounds[0], reminderType);
};

// Manual generic reminder - send to all users who haven't picked yet
export const manualSendGenericReminder = async (roundId: number) => {
  try {
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner FROM rounds r JOIN seasons s ON r.season_id = s.id WHERE r.id = ?',
      [roundId]
    );

    if (rounds.length === 0) {
      throw new Error('Round not found');
    }

    const round = rounds[0];

    // Get users who are in this season but haven't made picks yet, excluding deactivated players
    // Use LEFT JOIN on magic_links to include users who don't have magic links yet
    const [usersWithoutPicks] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT u.id, u.email, u.name, ml.token
       FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       LEFT JOIN magic_links ml ON u.id = ml.user_id AND ml.round_id = ?
       LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?
       WHERE sp.season_id = ? AND p.id IS NULL AND u.is_active = TRUE`,
      [round.id, round.id, round.season_id]
    );

    if (usersWithoutPicks.length === 0) {
      return { sent: 0, message: 'All players have already made their picks!' };
    }

    // Identify users who need magic links created
    const usersNeedingLinks = usersWithoutPicks.filter(user => !user.token);
    
    if (usersNeedingLinks.length > 0) {
      logger.info(`Creating magic links for ${usersNeedingLinks.length} new participant(s)`, {
        roundId: round.id,
        userIds: usersNeedingLinks.map(u => u.id)
      });

      // Get round details for expires_at
      const [roundDetails] = await db.query<RowDataPacket[]>(
        'SELECT lock_time FROM rounds WHERE id = ?',
        [round.id]
      );
      
      const expiresAt = roundDetails[0].lock_time;

      // Create magic links for users who don't have them
      const crypto = require('crypto');
      const magicLinkValues = usersNeedingLinks.map(user => {
        const token = crypto.randomBytes(32).toString('hex');
        // Store the token on the user object so we can use it below
        user.token = token;
        return [user.id, round.id, token, expiresAt];
      });

      await db.query(
        'INSERT INTO magic_links (user_id, round_id, token, expires_at) VALUES ?',
        [magicLinkValues]
      );

      logger.info(`Created ${magicLinkValues.length} magic link(s)`, { roundId: round.id });
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3003';
    const reminderText = '📢 Reminder: Please make your pick ASAP. The picks are about to lock!';

    // Send reminder emails in parallel
    await Promise.allSettled(
      usersWithoutPicks.map(user => {
        const magicLink = `${APP_URL}/pick/${user.token}`;
        const customMessage = round.email_message 
          ? `${reminderText}\n\n${round.email_message}`
          : reminderText;

        return sendMagicLink(user.email, user.name, round.sport_name, magicLink, customMessage, round.commissioner)
          .catch(emailError => {
            logger.error(`Failed to send reminder to ${user.email}`, { emailError });
          });
      })
    );

    logSchedulerEvent('Sent manual reminder', {
      roundId: round.id,
      recipientCount: usersWithoutPicks.length,
    });
    
    return { sent: usersWithoutPicks.length, message: `Reminder sent to ${usersWithoutPicks.length} player(s)` };

  } catch (error) {
    logger.error('Error sending manual reminder', { roundId, error });
    throw error;
  }
};

export const manualSendLockedNotification = async (roundId: number) => {
  const [rounds] = await db.query<RowDataPacket[]>(
    'SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner FROM rounds r JOIN seasons s ON r.season_id = s.id WHERE r.id = ?',
    [roundId]
  );

  if (rounds.length === 0) {
    throw new Error('Round not found');
  }

  // Remove existing log to allow resend
  await db.query('DELETE FROM reminder_log WHERE round_id = ? AND reminder_type = ?', [roundId, 'locked']);
  
  await sendLockedNotificationIfNotSent(rounds[0]);
};

// Initialize the scheduler
export const startReminderScheduler = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logSchedulerEvent('Running reminder scheduler check');
      await checkAndSendReminders();
    } catch (error) {
      logger.error('Cron job failed', { error });
    }
  });

  logSchedulerEvent('Reminder scheduler started - checking every hour');
};

