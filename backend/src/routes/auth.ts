// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticateAdmin, generateToken, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendPasswordResetEmail, sendAdminMagicLink } from '../services/emailService';
import { loginLimiter, passwordResetLimiter, adminMagicLinkLimiter, resetAdminMagicLinkLimit } from '../middleware/rateLimiter';
import { validatePasswordBasic } from '../utils/passwordValidator';
import { validateRequest } from '../middleware/validator';
import {
  requestLoginValidators,
  loginValidators,
  verifyMagicLinkValidators,
  initialSetupValidators,
  changePasswordValidators,
  changeEmailValidators,
  changeNameValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../validators/authValidators';
import logger, { redactEmail, maskMagicToken } from '../utils/logger';
import { 
  PASSWORD_SALT_ROUNDS, 
  ADMIN_MAGIC_LINK_TOKEN_BYTES,
  ADMIN_MAGIC_LINK_EXPIRY_MINUTES,
  MAGIC_LINK_SENT_MESSAGE,
  PASSWORD_RESET_SENT_MESSAGE
} from '../config/constants';

const router = express.Router();

// Step 1: Request login - check if email requires password or magic link
router.post('/request-login', validateRequest(requestLoginValidators), async (req, res) => {
  const { email } = req.body;

  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin, password_hash FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      // Email not found - return generic success message to prevent enumeration
      return res.json({ message: MAGIC_LINK_SENT_MESSAGE });
    }

    const admin = admins[0];

    // Main admin - requires password
    if (admin.is_main_admin) {
      return res.json({ 
        requiresPassword: true,
        message: 'Please enter your password'
      });
    }

    // Secondary admin - send magic link (passwordless)
    // This endpoint has rate limiting via adminMagicLinkLimiter
    return res.json({ 
      requiresPassword: false,
      magicLinkFlow: true,
      message: 'Please proceed to request a login link'
    });

  } catch (error) {
    logger.error('Request login error', { error, emailRedacted: redactEmail(email) });
    res.status(500).json({ error: 'Server error' });
  }
});

// Step 2a: Send magic link for secondary admins
router.post('/send-magic-link', adminMagicLinkLimiter, validateRequest(requestLoginValidators), async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin, password_hash FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      return res.json({ message: MAGIC_LINK_SENT_MESSAGE });
    }

    const admin = admins[0];

    // Only secondary admins get magic links
    if (admin.is_main_admin) {
      return res.json({ message: MAGIC_LINK_SENT_MESSAGE });
    }

    // Generate secure token
    const token = crypto.randomBytes(ADMIN_MAGIC_LINK_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + ADMIN_MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    // SECURITY: Hash the token before storing (same as user magic links)
    // The plain token is sent via email, and on validation we hash the incoming
    // token and compare it to the stored hash. This prevents token exposure
    // if the database is compromised.
    const { hashMagicLinkToken } = await import('../utils/magicLinkToken');
    const tokenHash = hashMagicLinkToken(token);

    // Delete any existing unused magic links for this admin
    await db.query(
      'DELETE FROM admin_magic_links WHERE admin_id = ? AND used_at IS NULL',
      [admin.id]
    );

    // Store hashed token (not plain text)
    await db.query(
      'INSERT INTO admin_magic_links (admin_id, token, expires_at, ip_address) VALUES (?, ?, ?, ?)',
      [admin.id, tokenHash, expiresAt, ipAddress]
    );

    // Send magic link email
    const magicLink = `${process.env.APP_URL}/admin/login?token=${token}`;
    await sendAdminMagicLink(email, admin.name || 'Admin', magicLink);

    logger.info('Magic link sent', { 
      adminId: admin.id, 
      emailRedacted: redactEmail(email), 
      expiresAt,
      tokenMasked: maskMagicToken(token)
    });
    res.json({ message: MAGIC_LINK_SENT_MESSAGE });

  } catch (error: any) {
    logger.error('Send magic link error', { error: error.message, emailRedacted: redactEmail(email) });
    res.json({ message: MAGIC_LINK_SENT_MESSAGE });
  }
});

// Step 2b: Main admin login with email + password (with rate limiting)
router.post('/login', loginLimiter, validateRequest(loginValidators), async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      // Log failed attempt for non-existent user (prevents enumeration timing)
      await db.query(
        'INSERT INTO login_attempts (identifier, success, ip_address) VALUES (?, FALSE, ?)',
        [email, ipAddress]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];

    // Check if account is currently locked
    if (admin.account_locked_until) {
      const lockUntil = new Date(admin.account_locked_until);
      const now = new Date();
      
      if (now < lockUntil) {
        const minutesLeft = Math.ceil((lockUntil.getTime() - now.getTime()) / 60000);
        return res.status(403).json({ 
          error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          lockedUntil: lockUntil.toISOString()
        });
      } else {
        // Lock expired, clear it
        await db.query(
          'UPDATE admins SET account_locked_until = NULL WHERE id = ?',
          [admin.id]
        );
      }
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      // Log failed attempt
      await db.query(
        'INSERT INTO login_attempts (identifier, success, ip_address) VALUES (?, FALSE, ?)',
        [email, ipAddress]
      );

      // Count failed attempts in last hour
      const [failedAttempts] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM login_attempts WHERE identifier = ? AND success = FALSE AND attempt_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        [email]
      );

      const failCount = failedAttempts[0].count;

      // Lock account after 10 failed attempts
      if (failCount >= 10) {
        const lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        await db.query(
          'UPDATE admins SET account_locked_until = ? WHERE id = ?',
          [lockUntil, admin.id]
        );
        
        logger.warn('Account locked due to failed login attempts', { 
          email: redactEmail(email), 
          failCount, 
          ipAddress 
        });

        return res.status(403).json({ 
          error: 'Account locked due to too many failed attempts. Try again in 60 minutes.',
          lockedUntil: lockUntil.toISOString()
        });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login - log it and clear any lock
    await db.query(
      'INSERT INTO login_attempts (identifier, success, ip_address) VALUES (?, TRUE, ?)',
      [email, ipAddress]
    );

    await db.query(
      'UPDATE admins SET account_locked_until = NULL WHERE id = ?',
      [admin.id]
    );

    const token = generateToken(admin.id, admin.email, admin.is_main_admin);

    res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isMainAdmin: admin.is_main_admin,
        mustChangePassword: admin.must_change_password
      }
    });
  } catch (error) {
    logger.error('Login error', { error, emailRedacted: redactEmail(email) });
    res.status(500).json({ error: 'Server error' });
  }
});

// Step 3: Verify magic link token for secondary admins
router.post('/verify-magic-link', validateRequest(verifyMagicLinkValidators), async (req, res) => {
  const { token } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    // SECURITY: Hash the incoming token and compare to stored hash
    // Also support legacy plain-text tokens for backward compatibility during migration
    const { hashMagicLinkToken } = await import('../utils/magicLinkToken');
    const tokenHash = hashMagicLinkToken(token);
    
    // Find magic link by hashed token (or plain text for legacy tokens)
    const [links] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admin_magic_links WHERE token = ? OR token = ?',
      [tokenHash, token] // Try hash first, then plain text for legacy tokens
    );

    if (links.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired login link' });
    }

    const link = links[0];

    // Check if already used
    if (link.used_at) {
      return res.status(401).json({ error: 'This login link has already been used. Please request a new one.' });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    
    if (now > expiresAt) {
      // Clean up expired link
      await db.query(
        'DELETE FROM admin_magic_links WHERE id = ?',
        [link.id]
      );
      return res.status(401).json({ error: 'This login link has expired. Please request a new one.' });
    }

    // Get admin details
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [link.admin_id]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Admin account no longer exists' });
    }

    const admin = admins[0];

    // Verify this is actually a secondary admin (extra security)
    if (admin.is_main_admin) {
      logger.error('Attempted to use magic link for main admin', { adminId: admin.id });
      return res.status(401).json({ error: 'Invalid authentication method' });
    }

    // Mark link as used
    await db.query(
      'UPDATE admin_magic_links SET used_at = NOW() WHERE id = ?',
      [link.id]
    );

    // Log successful login
    await db.query(
      'INSERT INTO login_attempts (identifier, success, ip_address) VALUES (?, TRUE, ?)',
      [admin.email, ipAddress]
    );

    // Generate JWT token (use centralized utility)
    const jwtToken = generateToken(admin.id, admin.email, admin.is_main_admin);

    logger.info('Magic link authentication successful', { 
      adminId: admin.id, 
      emailRedacted: redactEmail(admin.email) 
    });

    // Reset rate limiter for this email after successful login
    await resetAdminMagicLinkLimit(admin.email);

    res.json({
      token: jwtToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isMainAdmin: admin.is_main_admin,
        mustChangePassword: false
      }
    });

  } catch (error) {
    logger.error('Verify magic link error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Initial setup - change email and password (main admin only, no current password required)
router.post('/initial-setup', authenticateAdmin, validateRequest(initialSetupValidators), async (req: AuthRequest, res: Response) => {
  const { newName, newEmail, newPassword } = req.body;

  try{
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // Only main admin can use initial setup
    if (!admin.is_main_admin) {
      return res.status(403).json({ error: 'Only main admin can use initial setup' });
    }

    // 🔒 SECURITY: Block default admin email address
    if (newEmail.toLowerCase() === 'admin@example.com') {
      return res.status(400).json({ error: 'This email address is reserved and cannot be used' });
    }

    // Check if new email already exists
    const [existingEmails] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE email = ? AND id != ?',
      [newEmail, req.adminId]
    );

    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 🔒 SECURITY: Validate password strength (including weak password check)
    const passwordValidation = validatePasswordBasic(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password validation failed',
        details: passwordValidation.errors 
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await db.query(
      'UPDATE admins SET name = ?, email = ?, password_hash = ?, is_commissioner = TRUE, must_change_password = FALSE WHERE id = ?',
      [newName, newEmail, newPasswordHash, req.adminId]
    );

    // Generate new token with updated email
    const token = generateToken(admin.id, newEmail, admin.is_main_admin);

    res.json({ 
      message: 'Setup completed successfully',
      token,
      name: newName,
      email: newEmail
    });
  } catch (error) {
    logger.error('Initial setup error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (for main admin only - secondary admins are passwordless)
router.post('/change-password', authenticateAdmin, validateRequest(changePasswordValidators), async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // Only main admin can change password (secondary admins are passwordless)
    if (!admin.is_main_admin) {
      return res.status(403).json({ error: 'Secondary admins do not have passwords. You use magic links to log in.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // 🔒 SECURITY: Validate password strength (including weak password check)
    const passwordValidation = validatePasswordBasic(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password validation failed',
        details: passwordValidation.errors 
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await db.query(
      'UPDATE admins SET password_hash = ?, must_change_password = FALSE WHERE id = ?',
      [newPasswordHash, req.adminId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Change email (for regular email changes)
router.post('/change-email', authenticateAdmin, validateRequest(changeEmailValidators), async (req: AuthRequest, res: Response) => {
  const { newEmail } = req.body;

  try {
    // Check if admin exists
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // 🔒 SECURITY: Block default admin email address
    if (newEmail.toLowerCase() === 'admin@example.com') {
      return res.status(400).json({ error: 'This email address is reserved and cannot be used' });
    }

    // Check if new email is different from current email
    if (admin.email === newEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Check if email is already taken by another admin
    const [existingAdmins] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE email = ? AND id != ?',
      [newEmail, req.adminId]
    );

    if (existingAdmins.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use by another admin' });
    }

    // Update email
    await db.query(
      'UPDATE admins SET email = ? WHERE id = ?',
      [newEmail, req.adminId]
    );

    logger.info('Admin email changed successfully', { adminId: req.adminId, emailRedacted: redactEmail(newEmail) });
    res.json({ message: 'Email changed successfully' });
  } catch (error) {
    logger.error('Change email error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Change name
router.post('/change-name', authenticateAdmin, validateRequest(changeNameValidators), async (req: AuthRequest, res: Response) => {
  const { newName } = req.body;

  try {
    // Check if admin exists
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // Check if new name is different from current name
    if (admin.name === newName) {
      return res.status(400).json({ error: 'New name must be different from current name' });
    }

    // Update name
    await db.query(
      'UPDATE admins SET name = ? WHERE id = ?',
      [newName, req.adminId]
    );

    logger.info('Admin name changed successfully', { adminId: req.adminId });
    res.json({ message: 'Name changed successfully' });
  } catch (error) {
    logger.error('Change name error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password - send reset email (public endpoint)
router.post('/forgot-password', passwordResetLimiter, validateRequest(forgotPasswordValidators), async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // Check if admin exists with this email and is main admin (only main admins can reset passwords)
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM admins WHERE email = ? AND is_main_admin = TRUE',
      [email]
    );

    if (admins.length === 0) {
      // Email not found or not main admin, but return success message anyway for security
      return res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
    }

    const admin = admins[0];

    // Generate a cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in dedicated fields (does NOT overwrite password)
    await db.query(
      'UPDATE admins SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, resetExpiry, admin.id]
    );

    // Send reset email
    const resetLink = `${process.env.APP_URL}/admin/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, admin.name, resetLink);

    res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
  } catch (error) {
    logger.error('Forgot password error', { error, emailRedacted: redactEmail(email) });
    res.json({ message: PASSWORD_RESET_SENT_MESSAGE });
  }
});

// Reset password with token (public endpoint)
router.post('/reset-password', passwordResetLimiter, validateRequest(resetPasswordValidators), async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Find admin with this reset token and check expiration
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, password_reset_expires FROM admins WHERE password_reset_token = ?',
      [token]
    );

    if (admins.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const admin = admins[0];

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(admin.password_reset_expires);
    
    if (now > expiresAt) {
      // Clear expired token
      await db.query(
        'UPDATE admins SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
        [admin.id]
      );
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // 🔒 SECURITY: Validate password strength (including weak password check)
    const passwordValidation = validatePasswordBasic(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password validation failed',
        details: passwordValidation.errors 
      });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    // Update password and clear reset token
    await db.query(
      'UPDATE admins SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, must_change_password = FALSE WHERE id = ?',
      [newPasswordHash, admin.id]
    );

    logger.info('Password reset successfully', { adminId: admin.id });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current admin info
// Note: This endpoint is allowed even when must_change_password = true
// so the frontend can check the password change requirement status
router.get('/me', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // 🔒 ADDITIONAL SECURITY: Double-check admin exists (redundant but explicit)
    // The authenticateAdmin middleware already verifies this, but this provides extra validation
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin, must_change_password FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin account no longer exists' });
    }

    // Return admin data including must_change_password flag
    // Frontend uses this to determine if password change dialog should be shown
    res.json(admins[0]);
  } catch (error) {
    logger.error('Get admin error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
