import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_TOKEN_EXPIRY } from '../config/constants';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';

// JWT_SECRET validation is now handled by startupValidation.ts on app start
const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  adminId?: number;
  username?: string;
  isMainAdmin?: boolean;
}

export const authenticateAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      adminId: number;
      username: string;
      isMainAdmin: boolean;
    };
    
    // 🔒 SECURITY FIX: Verify admin still exists in database
    // This prevents old tokens from deleted admins from accessing the system
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, username, is_main_admin FROM admins WHERE id = ? AND username = ?',
      [decoded.adminId, decoded.username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Admin account no longer exists' });
    }

    const admin = admins[0];
    
    // Update request with verified admin data
    req.adminId = admin.id;
    req.username = admin.username;
    req.isMainAdmin = admin.is_main_admin;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireMainAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.isMainAdmin) {
    return res.status(403).json({ error: 'Only main admin can perform this action' });
  }
  next();
};

export const generateToken = (adminId: number, username: string, isMainAdmin: boolean): string => {
  return jwt.sign(
    { adminId, username, isMainAdmin },
    JWT_SECRET,
    { expiresIn: JWT_TOKEN_EXPIRY }
  );
};
