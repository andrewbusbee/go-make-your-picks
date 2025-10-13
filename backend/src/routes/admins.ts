import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { validatePasswordBasic } from '../utils/passwordValidator';
import { validateRequest } from '../middleware/validator';
import { changeEmailValidators, changeNameValidators } from '../validators/authValidators';
import logger, { redactEmail } from '../utils/logger';
import { PASSWORD_SALT_ROUNDS } from '../config/constants';

const router = express.Router();

// Get all admins (main admin only)
router.get('/', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json(admins);
  } catch (error) {
    logger.error('Get admins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get basic admin list for email testing (all authenticated admins)
router.get('/for-email-test', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email FROM admins ORDER BY name ASC'
    );
    res.json(admins);
  } catch (error) {
    logger.error('Get admins for email test error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new secondary admin (main admin only, passwordless)
router.post('/', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Secondary admins are passwordless - they use magic links
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO admins (name, email, password_hash, is_main_admin, must_change_password) VALUES (?, ?, NULL, FALSE, FALSE)',
      [name, email]
    );

    logger.info('Secondary admin created', { 
      adminId: result.insertId, 
      name, 
      emailRedacted: redactEmail(email),
      createdBy: req.adminId
    });

    res.status(201).json({ 
      message: 'Secondary admin created successfully. They will receive a magic link to log in.',
      id: result.insertId,
      name,
      email
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    logger.error('Create admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset admin password (main admin only, cannot reset own password)
// Only works for main admin - secondary admins are passwordless
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
    // Check if admin exists and is main admin
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    // Secondary admins don't have passwords
    if (!admin.is_main_admin) {
      return res.status(400).json({ error: 'Cannot reset password for secondary admins. They use magic links to log in.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await db.query(
      'UPDATE admins SET password_hash = ?, must_change_password = FALSE WHERE id = ?',
      [passwordHash, adminId]
    );

    res.json({ 
      message: `Password reset successfully for ${admin.name}`,
      name: admin.name
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
    // Check if admin exists
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin FROM admins WHERE id = ?',
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
      targetName: admin.name,
      emailRedacted: redactEmail(newEmail)
    });

    res.json({ 
      message: `Email changed successfully for ${admin.name}`,
      name: admin.name,
      newEmail
    });
  } catch (error) {
    logger.error('Change admin email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change admin name (main admin only, cannot change own name)
router.put('/:id/change-name', authenticateAdmin, requireMainAdmin, validateRequest(changeNameValidators), async (req: AuthRequest, res: Response) => {
  const adminId = parseInt(req.params.id);
  const { newName } = req.body;

  if (adminId === req.adminId) {
    return res.status(400).json({ error: 'Cannot change your own name. Use the change name feature in your profile instead.' });
  }

  try {
    // Check if admin exists
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, name, email, is_main_admin FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = admins[0];

    if (admin.is_main_admin) {
      return res.status(400).json({ error: 'Cannot change name for main admin accounts' });
    }

    // Check if new name is different from current name
    if (admin.name === newName) {
      return res.status(400).json({ error: 'New name must be different from current name' });
    }

    // Update name
    await db.query(
      'UPDATE admins SET name = ? WHERE id = ?',
      [newName, adminId]
    );

    logger.info('Admin name changed by main admin', { 
      adminId: req.adminId, 
      targetAdminId: adminId, 
      oldName: admin.name,
      newName
    });

    res.json({ 
      message: `Name changed successfully for ${admin.email}`,
      email: admin.email,
      newName
    });
  } catch (error) {
    logger.error('Change admin name error:', error);
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
