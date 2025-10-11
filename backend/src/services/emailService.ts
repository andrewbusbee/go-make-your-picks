import nodemailer from 'nodemailer';
import retry from 'async-retry';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger, { logEmailSent } from '../utils/logger';
import { SettingsService } from './settingsService';
import { 
  EMAIL_RETRY_ATTEMPTS, 
  EMAIL_RETRY_FACTOR, 
  EMAIL_RETRY_MIN_TIMEOUT, 
  EMAIL_RETRY_MAX_TIMEOUT 
} from '../config/constants';

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
 */
async function sendEmailWithRetry(
  mailOptions: any, 
  context: string
): Promise<void> {
  await retry(
    async (bail) => {
      try {
        await transporter.sendMail(mailOptions);
      } catch (error: any) {
        // Don't retry on authentication errors or invalid recipient
        if (error.code === 'EAUTH' || error.code === 'EMESSAGE' || error.responseCode === 550) {
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
        logger.warn(`${context} attempt ${attempt} failed, retrying...`, { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );
}

const getSettings = async () => {
  try {
    const settings = await SettingsService.getTextSettings();
    return {
      app_title: settings.appTitle,
      app_tagline: settings.appTagline
    };
  } catch (error) {
    logger.error('Error loading settings for email', { error });
    return {
      app_title: 'Go Make Your Picks',
      app_tagline: 'Predict. Compete. Win.'
    };
  }
};

export const sendMagicLink = async (
  email: string,
  name: string,
  sportName: string,
  magicLink: string,
  customMessage?: string
): Promise<void> => {
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - Make Your ${sportName} Pick!`,
    html: `
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
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${settings.app_title}</h1>
              <div style="font-size: 48px; margin-top: 10px;">🏆</div>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
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
            </div>
            <div class="footer">
              <p>${settings.app_title} - ${settings.app_tagline}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Magic link email');
    logEmailSent(email, `${settings.app_title} - Make Your ${sportName} Pick!`, true);
  } catch (error: any) {
    logger.error('Error sending magic link email after retries', { 
      error: error.message, 
      to: email, 
      sportName 
    });
    logEmailSent(email, `${settings.app_title} - Make Your ${sportName} Pick!`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendLockedNotification = async (
  email: string,
  name: string,
  sportName: string,
  leaderboardLink: string,
  customMessage?: string
): Promise<void> => {
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - ${sportName} picks are now locked!`,
    html: `
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
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .locked-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${settings.app_title}</h1>
              <div style="font-size: 48px; margin-top: 10px;">🏆</div>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <div class="locked-notice">
                <h3 style="margin-top: 0; color: #856404;">📋 ${sportName} picks are now locked!</h3>
                <p style="margin-bottom: 0; color: #856404;">The deadline has passed and no further picks can be submitted for this sport.</p>
              </div>
              
              ${customMessage ? `<div class="custom-message">${customMessage.replace(/\n/g, '<br>')}</div>` : ''}
              
              <p>You can view the current standings and leaderboard on our website.</p>
              
              <div style="text-align: center;">
                <a href="${leaderboardLink}" class="button">View Leaderboard</a>
              </div>
              
              <p style="text-align: center; margin-top: 30px; color: #666;">
                Thank you for participating!
              </p>
            </div>
            <div class="footer">
              <p>${settings.app_title} - ${settings.app_tagline}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Locked notification email');
    logEmailSent(email, `${settings.app_title} - ${sportName} picks are now locked!`, true);
  } catch (error: any) {
    logger.error('Error sending locked notification email after retries', { 
      error: error.message, 
      to: email, 
      sportName 
    });
    logEmailSent(email, `${settings.app_title} - ${sportName} picks are now locked!`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendSportCompletionEmail = async (
  email: string,
  name: string,
  sportName: string,
  userPick: string,
  userPoints: number,
  finalResults: Array<{place: number, team: string}>,
  leaderboard: Array<{name: string, points: number, isCurrentUser: boolean}>,
  leaderboardLink: string
): Promise<void> => {
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  // Format final results with medals
  const formatResults = (results: Array<{place: number, team: string}>) => {
    return results.map(result => {
      const medal = result.place === 1 ? '🥇' : result.place === 2 ? '🥈' : result.place === 3 ? '🥉' : '';
      return `${result.place}${result.place <= 3 ? 'st' : result.place === 2 ? 'nd' : result.place === 3 ? 'rd' : 'th'}: ${result.team} ${medal}`;
    }).join('<br>');
  };

  // Format leaderboard with user highlight
  const formatLeaderboard = (leaderboard: Array<{name: string, points: number, isCurrentUser: boolean}>) => {
    return leaderboard.map((entry, index) => {
      const highlight = entry.isCurrentUser ? ' (You)' : '';
      return `${index + 1}. ${entry.name}${highlight} - ${entry.points} points`;
    }).join('<br>');
  };

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - ${sportName} Complete - You earned ${userPoints} points!`,
    html: `
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
            .results-box { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .leaderboard-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .user-highlight { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196F3; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${settings.app_title}</h1>
              <div style="font-size: 48px; margin-top: 10px;">🏆</div>
            </div>
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p><strong>📊 ${sportName} has been completed!</strong></p>
              
              <div class="user-highlight">
                <div class="section-title">🎯 Your Result:</div>
                <p>✅ Your pick: <strong>${userPick}</strong></p>
                <p>🏆 You earned <strong>${userPoints} points</strong>!</p>
              </div>
              
              <div class="results-box">
                <div class="section-title">📊 Final Results:</div>
                <p>${formatResults(finalResults)}</p>
              </div>
              
              <div class="leaderboard-box">
                <div class="section-title">📈 Current Leaderboard (Top 5):</div>
                <p>${formatLeaderboard(leaderboard)}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${leaderboardLink}" class="button">View Full Leaderboard</a>
              </div>
            </div>
            <div class="footer">
              <p>${settings.app_title} - ${settings.app_tagline}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Sport completion email');
    logEmailSent(email, `${settings.app_title} - ${sportName} Complete - You earned ${userPoints} points!`, true);
  } catch (error: any) {
    logger.error('Error sending sport completion email after retries', { 
      error: error.message, 
      to: email, 
      sportName 
    });
    logEmailSent(email, `${settings.app_title} - ${sportName} Complete - You earned ${userPoints} points!`, false);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetLink: string
): Promise<void> => {
  const settings = await getSettings();
  const fromName = process.env.SMTP_FROM_NAME || settings.app_title;
  const fromEmail = process.env.SMTP_FROM || 'noreply@gomakeyourpicks.com';
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `${settings.app_title} - Password Reset Request`,
    html: `
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
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${settings.app_title}</h1>
              <div style="font-size: 48px; margin-top: 10px;">🔐</div>
            </div>
            <div class="content">
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
            </div>
            <div class="footer">
              <p>${settings.app_title} - ${settings.app_tagline}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await sendEmailWithRetry(mailOptions, 'Password reset email');
    logEmailSent(email, 'Password Reset Request', true);
  } catch (error: any) {
    logger.error('Error sending password reset email after retries', { 
      error: error.message, 
      to: email 
    });
    logEmailSent(email, 'Password Reset Request', false);
    throw new Error(`Failed to send password reset email: ${error.message}`);
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
