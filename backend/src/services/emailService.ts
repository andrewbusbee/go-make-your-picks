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
