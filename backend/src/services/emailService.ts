import nodemailer from 'nodemailer';
import retry from 'async-retry';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger, { logEmailSent, redactEmail } from '../utils/logger';
import { SettingsService } from './settingsService';
import { 
  EMAIL_RETRY_ATTEMPTS, 
  EMAIL_RETRY_FACTOR, 
  EMAIL_RETRY_MIN_TIMEOUT, 
  EMAIL_RETRY_MAX_TIMEOUT 
} from '../config/constants';

async function getSettings() {
  const settings = await SettingsService.getAllSettings();
  return {
    app_title: settings.appTitle,
    app_tagline: settings.appTagline
  };
}

/**
 * Check if email notifications are enabled globally
 * Returns true if enabled, false if disabled
 */
async function areEmailNotificationsEnabled(): Promise<boolean> {
  try {
    const [settings] = await db.query<RowDataPacket[]>(
      'SELECT setting_value FROM text_settings WHERE setting_key = ?',
      ['email_notifications_enabled']
    );
    
    if (settings.length === 0) {
      return true; // Default to enabled if not set
    }
    
    return settings[0].setting_value === 'true';
  } catch (error) {
    logger.error('Error checking email notifications setting', { error });
    return true; // Default to enabled on error
  }
}

/**
 * Check if an email address is shared by multiple active users
 * @param email - Email address to check
 * @returns true if email is used by 2+ active users
 */
async function isEmailShared(email: string): Promise<boolean> {
  try {
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    return users[0].count > 1;
  } catch (error) {
    logger.error('Error checking if email is shared', { error });
    return false; // Default to not shared on error
  }
}

/**
 * Get all active users with a specific email address
 * @param email - Email address to look up
 * @returns Array of users sharing this email
 */
async function getUsersWithEmail(email: string): Promise<Array<{ id: number; name: string; email: string }>> {
  try {
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email FROM users WHERE email = ? AND is_active = TRUE ORDER BY name ASC',
      [email]
    );
    return users as Array<{ id: number; name: string; email: string }>;
  } catch (error) {
    logger.error('Error getting users with email', { error });
    return [];
  }
}

function getCommissionerSignature(commissioner?: string, appTitle?: string): string {
  // Shown centered just below header. Two-line variant depending on presence of commissioner
  const baseStyle = 'text-align: center; margin: 18px 0 22px 0; color: #666; font-style: italic;';
  if (commissioner && commissioner.trim()) {
    return `
      <div style="${baseStyle}">
        <div>From the desk of ${commissioner}</div>
        <div>Commissioner of ${appTitle || ''}</div>
      </div>
    `;
  }
  return `
    <div style="${baseStyle}">
      <div>From the desk of The Commissioner</div>
      <div>${appTitle || ''}</div>
    </div>
  `;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Sends an email with automatic retry logic
 * Retries on network errors and temporary SMTP issues
 * Does not retry on authentication errors or invalid recipients
 * Logs all retry attempts for debugging
 */
async function sendEmailWithRetry(
  mailOptions: any, 
  context: string
): Promise<void> {
  let attemptNumber = 0;
  const maxAttempts = EMAIL_RETRY_ATTEMPTS + 1; // +1 for initial attempt
  
  logger.debug(`${context} - Starting email send`, { 
    to: redactEmail(mailOptions.to),
    subject: mailOptions.subject,
    maxAttempts 
  });

  await retry(
    async (bail) => {
      attemptNumber++;
      
      try {
        logger.debug(`${context} - Attempt ${attemptNumber}/${maxAttempts}`, {
          to: redactEmail(mailOptions.to)
        });
        
        await transporter.sendMail(mailOptions);
        
        logger.info(`${context} - Email sent successfully`, {
          to: redactEmail(mailOptions.to),
          attempts: attemptNumber
        });
      } catch (error: any) {
        logger.warn(`${context} - Attempt ${attemptNumber} failed`, {
          error: error.message,
          code: error.code,
          responseCode: error.responseCode,
          to: redactEmail(mailOptions.to)
        });
        
        // Don't retry on authentication errors or invalid recipient
        if (error.code === 'EAUTH' || error.code === 'EMESSAGE' || error.responseCode === 550) {
          logger.error(`${context} - Non-retryable error, aborting`, {
            error: error.message,
            code: error.code,
            to: redactEmail(mailOptions.to)
          });
          bail(error);
          return;
        }
        
        // Retry on network errors, timeouts, and temporary SMTP errors
        throw error;
      }
    },
    {
      retries: EMAIL_RETRY_ATTEMPTS,
      factor: EMAIL_RETRY_FACTOR,
      minTimeout: EMAIL_RETRY_MIN_TIMEOUT,
      maxTimeout: EMAIL_RETRY_MAX_TIMEOUT,
      onRetry: (error: unknown, attempt) => {
        logger.warn(`${context} - Retry ${attempt}/${EMAIL_RETRY_ATTEMPTS} after failure`, { 
          error: error instanceof Error ? error.message : String(error),
          nextAttemptIn: `${EMAIL_RETRY_MIN_TIMEOUT * Math.pow(EMAIL_RETRY_FACTOR, attempt - 1)}ms`
        });
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Common Email Template Renderer
// ---------------------------------------------------------------------------
function buildEmailHtml(params: {
  appTitle: string;
  headerIcon?: string; // emoji
  headerTitle?: string; // optional H2 just under the header
  headerSubtitle?: string; // small line under title
  bodyHtml: string; // main content fragment (already HTML)
  footerText?: string; // optional footer override
}): string {
  const { appTitle, headerIcon, headerTitle, headerSubtitle, bodyHtml, footerText } = params;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .custom-message { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .locked-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .results-box { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .leaderboard-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .user-highlight { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196F3; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .stats-container { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; }
          .participant-list { background-color: #f8f9fa; padding: 15px; border-radius: 6px; max-height: 300px; overflow-y: auto; margin-bottom: 25px; }
          .participant-item { padding: 5px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
          .notes-box { background-color: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3; }
          .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appTitle}</h1>
            ${headerIcon ? `<div style="font-size: 48px; margin-top: 10px;">${headerIcon}</div>` : ''}
          </div>
          <div class="content">
            ${headerTitle ? `<h2>${headerTitle}</h2>` : ''}
            ${headerSubtitle ? `<p style="margin-top: -6px; color: #e5e7eb;">${headerSubtitle}</p>` : ''}
            ${bodyHtml}
          </div>
          <div class="footer">
            <p>${footerText || appTitle}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}


export const sendMagicLink = async (
  email: string,
  name: string,
  sportName: string,
  magicLink: string,
  customMessage?: string,
  commissioner?: string
): Promise<void> => {
  // Check if email notifications are globally enabled
  const notificationsEnabled = await areEmailNotificationsEnabled();
  if (!notificationsEnabled) {
    logger.info('Email notifications disabled - skipping magic link email', { 
      to: redactEmail(email), 
      sportName 
    });
    return;
  }

  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  // Check if email is shared by multiple players
  const emailIsShared = await isEmailShared(email);
  const nameFormatted = emailIsShared 
    ? `<span style="color: #dc2626; font-weight: bold;">${name}</span>`
    : name;
  
  const sharedEmailNote = emailIsShared 
    ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Note:</strong> This email is shared with multiple players. This link is specifically for <strong>${name}</strong>.</p>
      </div>`
    : '';
  
  const commissionerHeader = getCommissionerSignature(commissioner, settings.app_title);
  const bodyHtml = `
    ${commissionerHeader}
    <h2>Hi ${nameFormatted}!</h2>
    <p>It's time to make your pick for <strong>${sportName}</strong>!</p>
    ${customMessage ? `<div class="custom-message">${customMessage.replace(/\n/g, '<br>')}</div>` : ''}
    <p>Click the button below to submit or update your championship prediction:</p>
    <div style="text-align: center;">
      <a href="${magicLink}" class="button">Make Your Pick</a>
    </div>
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <span style="word-break: break-all;">${magicLink}</span>
    </p>
    <p><strong>Important:</strong> This link is unique to you and will expire once picks are locked. You can update your pick as many times as you want before the deadline.</p>
    ${sharedEmailNote}
    
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '🏆',
    bodyHtml,
    footerText: `${settings.app_title} - ${settings.app_tagline}`
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - Make Your ${sportName} Pick!`,
    html,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Magic link email');
    logEmailSent(email, `${settings.app_title} - Make Your ${sportName} Pick!`, true);
  } catch (error: any) {
    logger.error('Error sending magic link email after retries', { 
      error: error.message, 
      toRedacted: redactEmail(email), 
      sportName 
    });
    logEmailSent(email, `${settings.app_title} - Make Your ${sportName} Pick!`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendLockedNotification = async (
  email: string,
  names: string[], // Changed to array to support merged emails
  sportName: string,
  leaderboardLink: string,
  customMessage?: string
): Promise<void> => {
  // Check if email notifications are globally enabled
  const notificationsEnabled = await areEmailNotificationsEnabled();
  if (!notificationsEnabled) {
    logger.info('Email notifications disabled - skipping locked notification email', { 
      to: redactEmail(email), 
      sportName 
    });
    return;
  }

  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  // Format names for greeting
  const isShared = names.length > 1;
  const namesFormatted = isShared
    ? names.map(n => `<span style="color: #dc2626; font-weight: bold;">${n}</span>`).join(', ')
    : names[0];
  
  const commissionerHeader = getCommissionerSignature(undefined, settings.app_title);
  const bodyHtml = `
    ${commissionerHeader}
    <h2>Hi ${namesFormatted}!</h2>
    <div class="locked-notice">
      <h3 style="margin-top: 0; color: #856404;">📋 ${sportName} picks are now locked!</h3>
      <p style="margin-bottom: 0; color: #856404;">The deadline to pick for ${sportName} has passed, so picks can no longer be submitted.</p>
    </div>
    <p>You can view the current standings and leaderboard on our website.</p>
    <div style="text-align: center;">
      <a href="${leaderboardLink}" class="button">View Leaderboard</a>
    </div>
    
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '🏆',
    bodyHtml,
    footerText: `${settings.app_title} - ${settings.app_tagline}`
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - ${sportName} picks are now locked!`,
    html,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Locked notification email');
    logEmailSent(email, `${settings.app_title} - ${sportName} picks are now locked!`, true);
  } catch (error: any) {
    logger.error('Error sending locked notification email after retries', { 
      error: error.message, 
      toRedacted: redactEmail(email),
      sportName
    });
    logEmailSent(email, `${settings.app_title} - ${sportName} picks are now locked!`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendSportCompletionEmail = async (
  email: string,
  users: Array<{ name: string; pick: string; points: number }>, // Changed to array to support merged emails
  sportName: string,
  finalResults: Array<{place: number, team: string}>,
  leaderboard: Array<{name: string, points: number, isCurrentUser: boolean}>,
  leaderboardLink: string,
  commissioner?: string
): Promise<void> => {
  // Check if email notifications are globally enabled
  const notificationsEnabled = await areEmailNotificationsEnabled();
  if (!notificationsEnabled) {
    logger.info('Email notifications disabled - skipping completion email', { 
      to: redactEmail(email), 
      sportName 
    });
    return;
  }

  const settings = await getSettings();
  const pointsSettings = await SettingsService.getPointsSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  // Format final results with medals and points
  const formatResults = (results: Array<{place: number, team: string}>) => {
    const formattedResults = results.map(result => {
      const medal = result.place === 1 ? '🥇' : result.place === 2 ? '🥈' : result.place === 3 ? '🥉' : '';
      let points = 0;
      let placeText = '';
      
      switch (result.place) {
        case 1:
          points = pointsSettings.pointsFirst;
          placeText = `Champion (${points} Points)`;
          break;
        case 2:
          points = pointsSettings.pointsSecond;
          placeText = `2nd (${points} Points)`;
          break;
        case 3:
          points = pointsSettings.pointsThird;
          placeText = `3rd (${points} Points)`;
          break;
        case 4:
          points = pointsSettings.pointsFourth;
          placeText = `4th (${points} Points)`;
          break;
        case 5:
          points = pointsSettings.pointsFifth;
          placeText = `5th (${points} Points)`;
          break;
        default:
          points = pointsSettings.pointsSixthPlus;
          placeText = `${result.place}th (${points} Points)`;
      }
      
      return `${placeText}: ${result.team} ${medal}`;
    });
    
    // Add the line about other picks
    const otherPicksLine = `All other picks received ${pointsSettings.pointsSixthPlus} point${pointsSettings.pointsSixthPlus !== 1 ? 's' : ''}`;
    formattedResults.push(otherPicksLine);
    
    return formattedResults.join('<br>');
  };

  // Format leaderboard with user highlight
  const formatLeaderboard = (leaderboard: Array<{name: string, points: number, isCurrentUser: boolean}>) => {
    return leaderboard.map((entry, index) => {
      const highlight = entry.isCurrentUser ? ' (You)' : '';
      return `${index + 1}. ${entry.name}${highlight} - ${entry.points} points`;
    }).join('<br>');
  };

  // Format names for greeting
  const isShared = users.length > 1;
  const namesFormatted = isShared
    ? users.map(u => `<span style="color: #dc2626; font-weight: bold;">${u.name}</span>`).join(', ')
    : users[0].name;
  
  // Build individual result sections for each user
  const userResultsSections = users.map(user => `
    <div class="user-highlight">
      <div class="section-title">🎯 ${isShared ? `Results for <span style="color: #dc2626; font-weight: bold;">${user.name}</span>` : 'Your Result'}:</div>
      <p>✅ Your pick: <strong>${user.pick}</strong></p>
      <p>🏆 You earned <strong>${user.points} points</strong>!</p>
    </div>
  `).join('');
  
  // Calculate total points for subject line
  const totalPoints = users.reduce((sum, user) => sum + user.points, 0);
  const subjectPoints = users.length === 1 
    ? `You earned ${users[0].points} points!`
    : `Results!`;
  
  const commissionerHeader = getCommissionerSignature(commissioner, settings.app_title);
  const bodyHtml = `
    ${commissionerHeader}
    <h2>Hi ${namesFormatted}!</h2>
    <p><strong>${sportName} has been completed!</strong></p>
    ${userResultsSections}
    <div class="results-box">
      <div class="section-title">📊 ${sportName} Results:</div>
      <p>${formatResults(finalResults)}</p>
    </div>
    <div class="leaderboard-box">
      <div class="section-title">📈 Current Leaderboard (Top 5):</div>
      <p>${formatLeaderboard(leaderboard)}</p>
    </div>
    <div style="text-align: center;">
      <a href="${leaderboardLink}" class="button">View Full Leaderboard</a>
    </div>
    
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '🏆',
    bodyHtml,
    footerText: `${settings.app_title} - ${settings.app_tagline}`
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - ${sportName} Complete - ${subjectPoints}`,
    html,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Sport completion email');
    logEmailSent(email, `${settings.app_title} - ${sportName} Complete - ${subjectPoints}`, true);
  } catch (error: any) {
    logger.error('Error sending sport completion email after retries', { 
      error: error.message, 
      toRedacted: redactEmail(email), 
      sportName 
    });
    logEmailSent(email, `${settings.app_title} - ${sportName} Complete - ${subjectPoints}`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetLink: string
): Promise<void> => {
  // NOTE: Password reset emails are ALWAYS sent (authentication/security)
  // They are not affected by the email notifications toggle
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  const bodyHtml = `
    <h2>Password Reset Request</h2>
    <p>Hi ${username},</p>
    <p>We received a request to reset your password for your admin account.</p>
    <p>Click the button below to reset your password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <span style="word-break: break-all;">${resetLink}</span>
    </p>
    <div class="warning">
      <strong>⚠️ Important:</strong>
      <ul>
        <li>This link will expire in 1 hour</li>
        <li>If you didn't request this reset, please ignore this email</li>
        <li>Your password will remain unchanged until you click the link above</li>
      </ul>
    </div>
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '🔐',
    bodyHtml,
    footerText: `${settings.app_title} - ${settings.app_tagline}`
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - Password Reset Request`,
    html,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Password reset email');
    logEmailSent(email, 'Password Reset Request', true);
  } catch (error: any) {
    logger.error('Error sending password reset email after retries', { 
      error: error.message,
      toRedacted: redactEmail(email)
    });
    logEmailSent(email, 'Password Reset Request', false);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

export const sendAdminMagicLink = async (
  email: string,
  name: string,
  magicLink: string
): Promise<void> => {
  // NOTE: Admin login emails are ALWAYS sent (authentication/security)
  // They are not affected by the email notifications toggle
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  const bodyHtml = `
    <h2>Admin Login Request</h2>
    <p>Hi ${name},</p>
    <p>Click the button below to securely log in to your admin account:</p>
    <div style=\"text-align: center;\"> 
      <a href=\"${magicLink}\" class=\"button\">Log In to Admin Dashboard</a>
    </div>
    <p style=\"color: #666; font-size: 14px;\">
      Or copy and paste this link into your browser:<br>
      <span style=\"word-break: break-all;\">${magicLink}</span>
    </p>
    <div class=\"warning\">
      <strong>⚠️ Important:</strong>
      <ul>
        <li>This link will expire in 10 minutes</li>
        <li>This link can only be used once</li>
        <li>If you didn't request this login, please ignore this email</li>
        <li>Never share this link with anyone</li>
      </ul>
    </div>
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '🔑',
    bodyHtml,
    footerText: `${settings.app_title} - ${settings.app_tagline}`
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - Admin Login Link`,
    html,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Admin magic link email');
    logEmailSent(email, 'Admin Login Link', true);
  } catch (error: any) {
    logger.error('Error sending admin magic link email after retries', { 
      error: error.message,
      toRedacted: redactEmail(email)
    });
    logEmailSent(email, 'Admin Login Link', false);
    throw new Error(`Failed to send admin login email: ${error.message}`);
  }
};

/**
 * Sends admin reminder summary email to main admin
 * @param sportName - Name of the sport
 * @param seasonName - Name of the season
 * @param lockTime - Lock time for the sport
 * @param timezone - Timezone for lock time
 * @param participantsWithPicks - Array of participants who have made picks
 * @param participantsMissingPicks - Array of participants who haven't made picks
 */
export const sendAdminReminderSummary = async (
  sportName: string,
  seasonName: string,
  lockTime: string,
  timezone: string,
  participantsWithPicks: Array<{ name: string }>,
  participantsMissingPicks: Array<{ name: string }>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const settings = await getSettings();
    const reminderSettings = await SettingsService.getReminderSettings();
    
    // Get main admin and commissioner emails
    const [adminResult] = await db.query<RowDataPacket[]>(
      'SELECT email, is_commissioner FROM admins WHERE is_main_admin = 1 OR is_commissioner = 1'
    );
    
    logger.debug('Admin reminder summary query result', { 
      adminCount: adminResult.length,
      admins: adminResult.map(a => ({ email: redactEmail(a.email), isCommissioner: a.is_commissioner }))
    });
    
    if (adminResult.length === 0) {
      logger.warn('No main admin found to send reminder summary');
      return { success: false, error: 'No main admin found' };
    }
    
    // Collect unique email addresses (deduplicate if main admin is also commissioner)
    const recipientEmails = new Set<string>();
    adminResult.forEach(admin => {
      if (admin.email) {
        recipientEmails.add(admin.email);
      }
    });
    
    logger.debug('Recipient emails for admin summary', { 
      recipientCount: recipientEmails.size,
      recipients: Array.from(recipientEmails).map(email => redactEmail(email))
    });
    
    if (recipientEmails.size === 0) {
      logger.warn('No recipient emails found for reminder summary');
      return { success: false, error: 'No recipient emails found' };
    }
  
  // Use system reminder timezone as fallback if round doesn't have one
  const effectiveTimezone = timezone || reminderSettings.reminderTimezone || 'America/New_York';
  
  // Format lock time
  const lockDate = new Date(lockTime).toLocaleString('en-US', {
    timeZone: effectiveTimezone,
    dateStyle: 'short',
    timeStyle: 'short'
  });
  
  // Limit lists to 25 each
  const limitedWithPicks = participantsWithPicks.slice(0, 25);
  const limitedMissingPicks = participantsMissingPicks.slice(0, 25);
  
  const totalParticipants = participantsWithPicks.length + participantsMissingPicks.length;
  const picksSubmitted = participantsWithPicks.length;
  const missingPicks = participantsMissingPicks.length;
  
  const bodyHtml = `
    <h2>Reminder Summary for ${sportName}</h2>
    <p style=\"margin-top: -6px; color: #666;\">Lock time: ${lockDate} (${effectiveTimezone.replace('_', ' ')})</p>
    <div class=\"stats-container\">
      <h3 style=\"margin: 0 0 15px 0; color: #333; font-size: 16px;\">Quick Stats</h3>
      <div style=\"display: flex; justify-content: space-around; text-align: center;\">
        <div>
          <div style=\"font-size: 24px; font-weight: bold; color: #667eea;\">${totalParticipants}</div>
          <div style=\"font-size: 12px; color: #666;\">Total participants</div>
        </div>
        <div>
          <div style=\"font-size: 24px; font-weight: bold; color: #28a745;\">${picksSubmitted}</div>
          <div style=\"font-size: 12px; color: #666;\">Picks submitted</div>
        </div>
        <div>
          <div style=\"font-size: 24px; font-weight: bold; color: #dc3545;\">${missingPicks}</div>
          <div style=\"font-size: 12px; color: #666;\">Missing picks</div>
        </div>
      </div>
    </div>
    <div>
      <h3 style=\"margin: 0 0 15px 0; color: #333; font-size: 16px;\">Participants With Picks</h3>
      <div class=\"participant-list\">
        ${limitedWithPicks.length > 0 ? limitedWithPicks.map(participant => 
          `<div class=\"participant-item\"> <span style=\"margin-right: 8px; color: #28a745;\">✅</span> <span>${participant.name}</span> </div>`
        ).join('') : '<p style=\"color: #666; font-style: italic;\">No participants have made picks yet.</p>'}
        ${participantsWithPicks.length > 25 ? `<p style=\"margin-top: 10px; color: #666; font-style: italic;\">+ ${participantsWithPicks.length - 25} more</p>` : ''}
      </div>
    </div>
    <div>
      <h3 style=\"margin: 0 0 15px 0; color: #333; font-size: 16px;\">Participants Missing Picks</h3>
      <div class=\"participant-list\">
        ${limitedMissingPicks.length > 0 ? limitedMissingPicks.map(participant => 
          `<div class=\"participant-item\"> <span style=\"margin-right: 8px; color: #dc3545;\">❌</span> <span>${participant.name}</span> </div>`
        ).join('') : '<p style=\"color: #666; font-style: italic;\">All participants have made their picks!</p>'}
        ${participantsMissingPicks.length > 25 ? `<p style=\"margin-top: 10px; color: #666; font-style: italic;\">+ ${participantsMissingPicks.length - 25} more</p>` : ''}
      </div>
    </div>
    <div class=\"notes-box\">
      <h4 style=\"margin: 0 0 10px 0; color: #1976d2; font-size: 14px;\">Notes</h4>
      <p style=\"margin: 0; font-size: 13px; color: #1976d2; line-height: 1.4;\">
        This summary was sent automatically when reminder emails were sent to players who have not picked.<br>
        Reminder settings can be adjusted in the settings section of the admin dashboard.
      </p>
    </div>
  `;

  const html = buildEmailHtml({
    appTitle: settings.app_title,
    headerIcon: '📊',
    bodyHtml,
  });

  const timezoneDisplay = timezone ? timezone.replace('_', ' ') : 'Unknown';
  const subject = `${settings.app_title} Reminder Summary: ${seasonName} — ${sportName} (locks ${lockDate} ${timezoneDisplay})`;

  // Send to all recipients (main admin and commissioner, deduplicated)
  logger.debug('Starting to send admin reminder summary emails', {
    recipientCount: recipientEmails.size,
    sportName,
    seasonName,
    participantsWithPicks: participantsWithPicks.length,
    participantsMissingPicks: participantsMissingPicks.length,
    subject
  });
  
  const emailPromises = Array.from(recipientEmails).map(async (recipientEmail) => {
    logger.debug('Preparing admin reminder summary email', {
      recipientEmail: redactEmail(recipientEmail),
      sportName,
      seasonName
    });
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: recipientEmail,
      subject,
      html,
    };

    try {
      await sendEmailWithRetry(mailOptions, 'Admin reminder summary email');
      logEmailSent(recipientEmail, 'Admin Reminder Summary', true);
      logger.info('Admin reminder summary sent', { 
        sportName, 
        seasonName, 
        totalParticipants, 
        picksSubmitted, 
        missingPicks,
        recipientEmail: redactEmail(recipientEmail)
      });
      return { success: true, recipientEmail };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      logger.error('Error sending admin reminder summary email', { 
        error: errorMessage,
        errorType: typeof error,
        errorKeys: Object.keys(error || {}),
        sportName,
        seasonName,
        recipientEmail: redactEmail(recipientEmail)
      });
      logEmailSent(recipientEmail, 'Admin Reminder Summary', false);
      return { success: false, recipientEmail, error: errorMessage };
    }
  });

  // Wait for all emails to be sent and check results
  const results = await Promise.allSettled(emailPromises);
  
  logger.debug('Admin reminder summary email results', {
    totalPromises: emailPromises.length,
    results: results.map((result, index) => ({
      index,
      status: result.status,
      fulfilled: result.status === 'fulfilled' ? {
        success: result.value?.success,
        recipientEmail: result.value?.recipientEmail ? redactEmail(result.value.recipientEmail) : 'unknown',
        error: result.value?.error
      } : {
        reason: result.status === 'rejected' ? result.reason?.message || result.reason?.toString() || 'Unknown rejection' : 'unknown'
      }
    }))
  });
  
  // Check if any emails failed
  const failedEmails = results
    .filter((result): result is PromiseFulfilledResult<{ success: boolean; recipientEmail: string; error?: string }> => 
      result.status === 'fulfilled' && !result.value.success)
    .map(result => result.value);
  
  if (failedEmails.length > 0) {
    const errorMessage = `Failed to send to ${failedEmails.length} recipient(s): ${failedEmails.map(f => f.error).join(', ')}`;
    logger.error('Admin reminder summary failed for some recipients', { 
      failedCount: failedEmails.length,
      totalRecipients: recipientEmails.size,
      errors: failedEmails.map(f => ({ email: redactEmail(f.recipientEmail), error: f.error })),
      failedEmailsDetails: failedEmails
    });
    return { success: false, error: errorMessage };
  }
  
  return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    logger.error('Exception in sendAdminReminderSummary', { 
      error: errorMessage,
      errorType: typeof error,
      errorKeys: Object.keys(error || {}),
      sportName,
      seasonName,
      participantsWithPicks: participantsWithPicks.length,
      participantsMissingPicks: participantsMissingPicks.length
    });
    return { success: false, error: errorMessage };
  }
};

/**
 * Verifies SMTP connection for health checks
 * @returns Promise<{ connected: boolean; error?: string }>
 */
export const verifySmtpConnection = async (): Promise<{ connected: boolean; error?: string }> => {
  try {
    await transporter.verify();
    return { connected: true };
  } catch (error: any) {
    logger.error('SMTP verification failed', { error: error.message });
    return { 
      connected: false, 
      error: error.message 
    };
  }
};
