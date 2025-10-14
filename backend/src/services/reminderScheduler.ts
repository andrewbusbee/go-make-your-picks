import cron from 'node-cron';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendMagicLink, sendLockedNotification, sendAdminReminderSummary } from './emailService';
import logger, { logSchedulerEvent, redactEmail } from '../utils/logger';
import { SettingsService } from './settingsService';

// Cleanup old login attempts (older than 30 days)
export const cleanupOldLoginAttempts = async () => {
  try {
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM login_attempts WHERE attempt_time < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    
    if (result.affectedRows > 0) {
      logger.info(`Cleaned up ${result.affectedRows} old login attempt(s)`, { 
        olderThan: '30 days' 
      });
      logSchedulerEvent(`Cleaned up ${result.affectedRows} old login attempts`);
    }
  } catch (error) {
    logger.error('Error cleaning up old login attempts', { error });
  }
};

// Check for rounds needing reminders and auto-lock expired rounds
export const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    logger.debug('📋 Checking for reminders to send...');
    
    // First, auto-lock any rounds that have passed their lock time
    logger.debug('🔒 Checking for expired rounds to auto-lock...');
    await autoLockExpiredRounds();
    
    // Get reminder settings
    logger.debug('⚙️ Loading reminder settings...');
    const reminderSettings = await SettingsService.getReminderSettings();
    logger.debug(`⚙️ Reminder settings loaded: type=${reminderSettings.reminderType}, firstHours=${reminderSettings.firstReminderHours}, finalHours=${reminderSettings.finalReminderHours}, dailyTime=${reminderSettings.dailyReminderTime}, timezone=${reminderSettings.reminderTimezone}`);
    
    // Get all active rounds that haven't been completed (with commissioner from season)
    logger.debug('🔍 Querying active rounds...');
    const [rounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner 
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
       WHERE r.status = 'active' AND r.lock_time > NOW()`,
      []
    );
    
    logger.debug(`📊 Found ${rounds.length} active round(s) to check`);

    for (const round of rounds) {
      const lockTime = new Date(round.lock_time);
      logger.debug(`🏈 Checking round: "${round.sport_name}" (ID: ${round.id}, Lock: ${lockTime.toISOString()})`);

      if (reminderSettings.reminderType === 'daily') {
        // Handle daily reminders - check if it's time to send based on daily_reminder_time
        logger.debug(`📅 Checking daily reminder for round ${round.id}`);
        await checkAndSendDailyReminder(round, now, reminderSettings);
      } else if (reminderSettings.reminderType === 'before_lock') {
        // Handle before-lock reminders (existing logic)
        const timeDiff = lockTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        logger.debug(`⏱️ Time until lock: ${hoursDiff.toFixed(2)} hours`);

        // Use global reminder settings
        const firstReminderHours = reminderSettings.firstReminderHours;
        const finalReminderHours = reminderSettings.finalReminderHours;

        // Check if we need to send first reminder (30-minute window to prevent duplicates)
        // Runs every 5 minutes, so 30-minute window is ~6 chances to send
        if (hoursDiff >= (firstReminderHours - 0.25) && 
            hoursDiff <= (firstReminderHours + 0.25)) {
          logger.debug(`⏰ First reminder window hit! Sending first reminder (${firstReminderHours}h before lock)`);
          await sendReminderIfNotSent(round, 'first', firstReminderHours);
        }

        // Check if we need to send final reminder (30-minute window to prevent duplicates)
        if (hoursDiff >= (finalReminderHours - 0.25) && 
            hoursDiff <= (finalReminderHours + 0.25)) {
          logger.debug(`🚨 Final reminder window hit! Sending final reminder (${finalReminderHours}h before lock)`);
          await sendReminderIfNotSent(round, 'final', finalReminderHours);
        }
        
        logger.debug(`✔️ Round ${round.id} check complete (no reminders needed at this time)`);
      } else if (reminderSettings.reminderType === 'none') {
        // No reminders to send - do nothing
        logger.debug(`⚠️ Reminder type is "none", skipping reminder checks for round ${round.id}`);
      }
    }

    // Check for rounds that just locked (locked in the last hour)
    logger.debug('🔐 Checking for recently locked rounds...');
    const [lockedRounds] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner 
       FROM rounds r
       JOIN seasons s ON r.season_id = s.id 
       WHERE r.status = 'locked' 
       AND r.lock_time <= NOW() 
       AND r.lock_time >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      []
    );

    logger.debug(`🔐 Found ${lockedRounds.length} recently locked round(s)`);
    for (const round of lockedRounds) {
      logger.debug(`🔒 Sending locked notification for round: "${round.sport_name}" (ID: ${round.id})`);
      await sendLockedNotificationIfNotSent(round);
    }

    logger.debug('✅ Reminder scheduler check complete');

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
      } catch (error: any) {
        logger.error('Error auto-locking round', { 
          error: error.message, 
          roundId: round.id, 
          sportName: round.sport_name 
        });
      }
    }

    if (expiredRounds.length > 0) {
      logSchedulerEvent(`Auto-locked ${expiredRounds.length} expired round(s)`);
    }

  } catch (error: any) {
    logger.error('Error in auto-lock expired rounds', { error });
  }
};

// Check and send daily reminder if it's time
export const checkAndSendDailyReminder = async (round: any, now: Date, reminderSettings: any) => {
  try {
    const dailyReminderTime = reminderSettings.dailyReminderTime || '10:00:00';
    const reminderTimezone = reminderSettings.reminderTimezone || 'America/New_York';
    const lockTime = new Date(round.lock_time);
    
    // Parse the daily reminder time (e.g., "10:00:00")
    const [hours, minutes, seconds] = dailyReminderTime.split(':').map(Number);
    
    // Create today's reminder time in the reminder timezone
    const moment = require('moment-timezone');
    const todayInReminderTz = moment.tz(now, reminderTimezone);
    const todayReminderTime = todayInReminderTz.clone().hour(hours).minute(minutes).second(seconds).millisecond(0);
    
    // Check if we're within 1 hour of the daily reminder time in the reminder timezone
    const timeDiff = Math.abs(todayReminderTime.diff(now));
    const oneHourInMs = 60 * 60 * 1000;
    
    if (timeDiff <= oneHourInMs) {
      // Check if we already sent a daily reminder today (in reminder timezone)
      const todayStart = todayInReminderTz.clone().startOf('day').toDate();
      
      const [existingToday] = await db.query<RowDataPacket[]>(
        'SELECT id FROM reminder_log WHERE round_id = ? AND reminder_type = ? AND sent_at >= ?',
        [round.id, 'daily', todayStart]
      );
      
      if (existingToday.length === 0) {
        // Send daily reminder
        await sendReminderIfNotSent(round, 'daily', 0);
      }
    }
  } catch (error) {
    logger.error('Error checking daily reminder', { roundId: round.id, error });
  }
};

// Send reminder to users who haven't picked yet
export const sendReminderIfNotSent = async (round: any, reminderType: 'first' | 'final' | 'daily', reminderHours?: number) => {
  try {
    logger.debug(`📧 sendReminderIfNotSent: Starting ${reminderType} reminder for round ${round.id}`);
    
    // Check if this reminder was already sent
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM reminder_log WHERE round_id = ? AND reminder_type = ?',
      [round.id, reminderType]
    );

    if (existing.length > 0) {
      logger.debug(`⏭️ ${reminderType} reminder already sent for round ${round.id}, skipping`);
      return; // Already sent
    }

    // Get users who are in this season but haven't made picks yet, excluding deactivated players
    // Use LEFT JOIN on magic_links to include users who don't have magic links yet
    logger.debug(`🔍 Querying users without picks for round ${round.id}...`);
    const [usersWithoutPicks] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT u.id, u.email, u.name, ml.token
       FROM users u
       JOIN season_participants sp ON u.id = sp.user_id
       LEFT JOIN magic_links ml ON u.id = ml.user_id AND ml.round_id = ?
       LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?
       WHERE sp.season_id = ? AND p.id IS NULL AND u.is_active = TRUE`,
      [round.id, round.id, round.season_id]
    );

    logger.debug(`👥 Found ${usersWithoutPicks.length} user(s) without picks`);
    
    if (usersWithoutPicks.length === 0) {
      logger.debug(`✅ Everyone has picked for round ${round.id}, no reminders needed`);
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
    let reminderText;
    if (reminderType === 'daily') {
      reminderText = `📅 Daily reminder: Don't forget to make your pick for ${round.sport_name}!`;
    } else if (reminderType === 'first') {
      reminderText = `⏰ Reminder: You have about ${reminderHours} hours left to make your pick!`;
    } else {
      reminderText = `🚨 Final reminder: You only have about ${reminderHours} hours left to make your pick!`;
    }

    // Send reminder emails in parallel
    logger.debug(`📤 Sending ${reminderType} reminder emails to ${usersWithoutPicks.length} user(s)...`);
    const emailStartTime = Date.now();
    await Promise.allSettled(
      usersWithoutPicks.map(user => {
        const magicLink = `${APP_URL}/pick/${user.token}`;
        const customMessage = round.email_message 
          ? `${reminderText}\n\n${round.email_message}`
          : reminderText;

        return sendMagicLink(user.email, user.name, round.sport_name, magicLink, customMessage, round.commissioner)
          .catch(emailError => {
            logger.error(`Failed to send reminder`, { emailError, emailRedacted: redactEmail(user.email) });
          });
      })
    );
    const emailDuration = Date.now() - emailStartTime;
    logger.debug(`✅ Finished sending ${reminderType} reminder emails in ${emailDuration}ms`);

    // Log the reminder
    await db.query<ResultSetHeader>(
      'INSERT INTO reminder_log (round_id, reminder_type, recipient_count) VALUES (?, ?, ?)',
      [round.id, reminderType, usersWithoutPicks.length]
    );

    logSchedulerEvent(`Sent ${reminderType} reminder`, {
      roundId: round.id,
      recipientCount: usersWithoutPicks.length,
    });
    logger.info(`📧 Sent ${reminderType} reminder to ${usersWithoutPicks.length} user(s) for round ${round.id}`);

    // Send admin reminder summary
    try {
      logger.debug(`📊 Preparing admin summary for round ${round.id}...`);
      
      // Get all participants in this season
      const [allParticipants] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name,
         CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END as hasPicked
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?
         WHERE sp.season_id = ? AND u.is_active = TRUE`,
        [round.id, round.season_id]
      );

      // Separate participants with and without picks
      const participantsWithPicks = allParticipants
        .filter(p => p.hasPicked)
        .map(p => ({ name: p.name }));
      
      const participantsMissingPicks = allParticipants
        .filter(p => !p.hasPicked)
        .map(p => ({ name: p.name }));

      logger.debug(`📊 Admin summary stats: ${participantsWithPicks.length} picked, ${participantsMissingPicks.length} missing`);

      // Get season name
      const [seasonResult] = await db.query<RowDataPacket[]>(
        'SELECT name FROM seasons WHERE id = ?',
        [round.season_id]
      );
      
      const seasonName = seasonResult.length > 0 ? seasonResult[0].name : 'Unknown Season';

      // Send admin summary
      logger.debug(`📧 Sending admin summary email for round ${round.id}...`);
      const adminEmailStartTime = Date.now();
      await sendAdminReminderSummary(
        round.sport_name,
        seasonName,
        round.lock_time,
        round.timezone,
        participantsWithPicks,
        participantsMissingPicks
      );
      const adminEmailDuration = Date.now() - adminEmailStartTime;
      
      logger.info(`📊 Admin summary sent for "${round.sport_name}" (${participantsWithPicks.length} picked, ${participantsMissingPicks.length} missing)`);
    } catch (summaryError) {
      logger.error('Failed to send admin reminder summary', {
        roundId: round.id,
        error: summaryError
      });
      // Don't throw - this is not critical enough to fail the reminder process
    }

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

    // Group users by email to merge notifications for shared emails
    const usersByEmail = new Map<string, string[]>();
    allUsers.forEach(user => {
      if (!usersByEmail.has(user.email)) {
        usersByEmail.set(user.email, []);
      }
      usersByEmail.get(user.email)!.push(user.name);
    });

    // Send locked notification (one per unique email, merged if shared)
    await Promise.allSettled(
      Array.from(usersByEmail.entries()).map(([email, names]) =>
        sendLockedNotification(email, names, round.sport_name, leaderboardLink)
          .catch(emailError => {
            logger.error(`Failed to send locked notification`, { emailError, emailRedacted: redactEmail(email) });
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
export const manualSendReminder = async (roundId: number, reminderType: 'first' | 'final') => {
  const [rounds] = await db.query<RowDataPacket[]>(
    'SELECT r.id, r.season_id, r.sport_name, r.lock_time, r.email_message, r.status, s.commissioner FROM rounds r JOIN seasons s ON r.season_id = s.id WHERE r.id = ?',
    [roundId]
  );

  if (rounds.length === 0) {
    throw new Error('Round not found');
  }

  // Get reminder settings to get the hours
  const reminderSettings = await SettingsService.getReminderSettings();
  const reminderHours = reminderType === 'first' 
    ? reminderSettings.firstReminderHours 
    : reminderSettings.finalReminderHours;

  // Remove existing log to allow resend
  await db.query('DELETE FROM reminder_log WHERE round_id = ? AND reminder_type = ?', [roundId, reminderType]);
  
  await sendReminderIfNotSent(rounds[0], reminderType, reminderHours);
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
            logger.error(`Failed to send reminder`, { emailError, emailRedacted: redactEmail(user.email) });
          });
      })
    );

    logSchedulerEvent('Sent manual reminder', {
      roundId: round.id,
      recipientCount: usersWithoutPicks.length,
    });

    // Send admin reminder summary for manual reminders too
    try {
      // Get all participants in this season
      const [allParticipants] = await db.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id, u.name,
         CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END as hasPicked
         FROM users u
         JOIN season_participants sp ON u.id = sp.user_id
         LEFT JOIN picks p ON u.id = p.user_id AND p.round_id = ?
         WHERE sp.season_id = ? AND u.is_active = TRUE`,
        [round.id, round.season_id]
      );

      // Separate participants with and without picks
      const participantsWithPicks = allParticipants
        .filter(p => p.hasPicked)
        .map(p => ({ name: p.name }));
      
      const participantsMissingPicks = allParticipants
        .filter(p => !p.hasPicked)
        .map(p => ({ name: p.name }));

      // Get season name
      const [seasonResult] = await db.query<RowDataPacket[]>(
        'SELECT name FROM seasons WHERE id = ?',
        [round.season_id]
      );
      
      const seasonName = seasonResult.length > 0 ? seasonResult[0].name : 'Unknown Season';

      // Send admin summary
      await sendAdminReminderSummary(
        round.sport_name,
        seasonName,
        round.lock_time,
        round.timezone,
        participantsWithPicks,
        participantsMissingPicks
      );

      logger.info('Admin reminder summary sent (manual)', {
        roundId: round.id,
        sportName: round.sport_name,
        seasonName,
        participantsWithPicks: participantsWithPicks.length,
        participantsMissingPicks: participantsMissingPicks.length
      });
    } catch (summaryError) {
      logger.error('Failed to send admin reminder summary (manual)', {
        roundId: round.id,
        error: summaryError
      });
      // Don't throw - this is not critical enough to fail the reminder process
    }
    
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

// Mutex flags to prevent concurrent executions
let isReminderJobRunning = false;
let isCleanupJobRunning = false;

// Helper function to run async operations with timeout
const runWithTimeout = async (asyncFn: () => Promise<void>, timeoutMs: number, operationName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    asyncFn()
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// Initialize the scheduler
export const startReminderScheduler = () => {
  // Run reminder checks every 5 minutes using node-cron v3
  // Cron format: */5 * * * * = every 5 minutes
  // Note: We do NOT call .start() - cron.schedule() starts automatically
  cron.schedule('*/5 * * * *', async () => {
    logger.info('🔔 CRON TRIGGERED! Reminder job callback executed');
    // Skip if previous execution is still running
    if (isReminderJobRunning) {
      logger.warn('⏭️ Skipping reminder check - previous execution still running');
      return;
    }

    isReminderJobRunning = true;
    const startTime = Date.now();
    
    try {
      logSchedulerEvent('Running reminder scheduler check');
      
      // Run without timeout - let it complete naturally (mutex prevents concurrent runs)
      await checkAndSendReminders();
      
      const duration = Date.now() - startTime;
      logSchedulerEvent(`Reminder scheduler check completed in ${duration}ms`);
      logger.info(`✅ Cron: Reminder scheduler check completed in ${duration}ms`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Cron job failed', { 
        error: error.message, 
        duration: `${duration}ms`,
        operation: 'reminder_check'
      });
    } finally {
      isReminderJobRunning = false;
      logger.debug(`🔓 Mutex released (isReminderJobRunning = false)`);
    }
  });

  // Run cleanup job daily at 3:00 AM
  // Cron format: 0 3 * * * = at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    // Skip if previous execution is still running
    if (isCleanupJobRunning) {
      logger.warn('⏭️ Skipping cleanup job - previous execution still running');
      return;
    }

    isCleanupJobRunning = true;
    const startTime = Date.now();
    
    try {
      logSchedulerEvent('Running daily cleanup job');
      
      // Run cleanup (no timeout - let it complete naturally)
      await cleanupOldLoginAttempts();
      
      const duration = Date.now() - startTime;
      logSchedulerEvent(`Daily cleanup job completed in ${duration}ms`);
      logger.info(`✅ Daily cleanup job completed in ${duration}ms`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Cleanup cron job failed', { 
        error: error.message, 
        duration: `${duration}ms`,
        operation: 'cleanup_job'
      });
    } finally {
      isCleanupJobRunning = false;
      logger.debug(`🔓 Cleanup mutex released (isCleanupJobRunning = false)`);
    }
  });

  // Log successful initialization
  logger.info('✅ Cron jobs initialized with node-cron v3.0.3 (stable)');
  logger.info('📅 Reminder job: Scheduled to run every 5 minutes');
  logger.info('📅 Cleanup job: Scheduled to run daily at 3:00 AM');

  logSchedulerEvent('Reminder scheduler started - checking every 5 minutes');
  logger.info('🔄 Reminder scheduler: Running every 5 minutes with mutex protection');
  logger.info('⏰ Cron jobs are now active and will execute on schedule');
  logSchedulerEvent('Cleanup scheduler started - running daily at 3:00 AM');
  logger.info('🧹 Cleanup scheduler: Running daily at 3:00 AM');
};

