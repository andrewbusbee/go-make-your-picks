import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticateAdmin, generateToken, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sendPasswordResetEmail } from '../services/emailService';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { validatePasswordBasic } from '../utils/passwordValidator';
import { validateRequest } from '../middleware/validator';
import {
  loginValidators,
  initialSetupValidators,
  changePasswordValidators,
  changeEmailValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../validators/authValidators';
import logger from '../utils/logger';

const router = express.Router();

// Admin login (with rate limiting)
router.post('/login', loginLimiter, validateRequest(loginValidators), async (req, res) => {
  const { username, password } = req.body;

  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(admin.id, admin.username, admin.is_main_admin);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        isMainAdmin: admin.is_main_admin,
        mustChangePassword: admin.must_change_password
      }
    });
  } catch (error) {
    logger.error('Login error', { error, username });
    res.status(500).json({ error: 'Server error' });
  }
});

// Initial setup - change username, email, and password (no current password required)
router.post('/initial-setup', authenticateAdmin, validateRequest(initialSetupValidators), async (req: AuthRequest, res: Response) => {
  const { newUsername, newEmail, newPassword } = req.body;

  try{
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT * FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // Check if new username already exists
    const [existingUsers] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE username = ? AND id != ?',
      [newUsername, req.adminId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if new email already exists
    const [existingEmails] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE email = ? AND id != ?',
      [newEmail, req.adminId]
    );

    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE admins SET username = ?, email = ?, password_hash = ?, must_change_password = FALSE WHERE id = ?',
      [newUsername, newEmail, newPasswordHash, req.adminId]
    );

    // Generate new token with updated username
    const token = generateToken(admin.id, newUsername, admin.is_main_admin);

    res.json({ 
      message: 'Setup completed successfully',
      token,
      username: newUsername
    });
  } catch (error) {
    logger.error('Initial setup error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (for regular password changes)
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
    const validPassword = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
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

    logger.info('Admin email changed successfully', { adminId: req.adminId, newEmail });
    res.json({ message: 'Email changed successfully' });
  } catch (error) {
    logger.error('Change email error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password - send reset email (public endpoint)
router.post('/forgot-password', passwordResetLimiter, validateRequest(forgotPasswordValidators), async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    // Check if admin exists with this email
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username FROM admins WHERE email = ?',
      [email]
    );

    // Always return the same response for security (don't reveal if email exists)
    const responseMessage = 'If you entered a valid email, a password reset message will be sent';

    if (admins.length === 0) {
      // Email not found, but return success message anyway
      return res.json({ message: responseMessage });
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
    await sendPasswordResetEmail(email, admin.username, resetLink);

    res.json({ message: responseMessage });
  } catch (error) {
    logger.error('Forgot password error', { error, email });
    res.json({ message: 'If you entered a valid email, a password reset message will be sent' });
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
      'SELECT id, username, password_reset_expires FROM admins WHERE password_reset_token = ?',
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

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(password, 10);

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
router.get('/me', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username, email, is_main_admin, must_change_password FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admins[0]);
  } catch (error) {
    logger.error('Get admin error', { error, adminId: req.adminId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
