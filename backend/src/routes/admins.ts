import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { validatePasswordBasic } from '../utils/passwordValidator';
import { validateRequest } from '../middleware/validator';
import { changeEmailValidators } from '../validators/authValidators';
import logger from '../utils/logger';

const router = express.Router();

// Get all admins (main admin only)
router.get('/', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username, email, is_main_admin, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json(admins);
  } catch (error) {
    logger.error('Get admins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new admin (main admin only)
router.post('/', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO admins (username, email, password_hash, is_main_admin, must_change_password) VALUES (?, ?, ?, FALSE, FALSE)',
      [username, email, passwordHash]
    );

    res.status(201).json({ 
      message: 'Admin created successfully',
      id: result.insertId
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    logger.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset admin password (main admin only, cannot reset own password)
router.post('/:id/reset-password', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = parseInt(req.params.id);
  const { newPassword } = req.body;

  if (adminId === req.adminId) {
    return res.status(400).json({ error: 'Cannot reset your own password. Use the change password feature instead.' });
  }

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  // Validate password strength
  const passwordValidation = validatePasswordBasic(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      error: 'Password does not meet security requirements',
      details: passwordValidation.errors
    });
  }

  try {
    // Check if admin exists
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE admins SET password_hash = ?, must_change_password = FALSE WHERE id = ?',
      [passwordHash, adminId]
    );

    res.json({ 
      message: `Password reset successfully for ${admins[0].username}`,
      username: admins[0].username
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change admin email (main admin only, cannot change own email)
router.put('/:id/change-email', authenticateAdmin, requireMainAdmin, validateRequest(changeEmailValidators), async (req: AuthRequest, res: Response) => {
  const adminId = parseInt(req.params.id);
  const { newEmail } = req.body;

  if (adminId === req.adminId) {
    return res.status(400).json({ error: 'Cannot change your own email. Use the change email feature in your profile instead.' });
  }

  try {
    // Check if admin exists and is not a main admin
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username, email, is_main_admin FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    if (admin.is_main_admin) {
      return res.status(400).json({ error: 'Cannot change email for main admin accounts' });
    }

    // Check if new email is different from current email
    if (admin.email === newEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Check if email is already taken by another admin
    const [existingAdmins] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admins WHERE email = ? AND id != ?',
      [newEmail, adminId]
    );

    if (existingAdmins.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use by another admin' });
    }

    // Update email
    await db.query(
      'UPDATE admins SET email = ? WHERE id = ?',
      [newEmail, adminId]
    );

    logger.info('Admin email changed by main admin', { 
      adminId: req.adminId, 
      targetAdminId: adminId, 
      targetUsername: admin.username,
      newEmail 
    });

    res.json({ 
      message: `Email changed successfully for ${admin.username}`,
      username: admin.username,
      newEmail
    });
  } catch (error) {
    logger.error('Change admin email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete admin (main admin only, cannot delete self)
router.delete('/:id', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = parseInt(req.params.id);

  if (adminId === req.adminId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    await db.query('DELETE FROM admins WHERE id = ? AND is_main_admin = FALSE', [adminId]);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    logger.error('Delete admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
