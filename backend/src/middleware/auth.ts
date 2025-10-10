import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_TOKEN_EXPIRY } from '../config/constants';

// JWT_SECRET validation is now handled by startupValidation.ts on app start
const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  adminId?: number;
  username?: string;
  isMainAdmin?: boolean;
}

export const authenticateAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
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
    
    req.adminId = decoded.adminId;
    req.username = decoded.username;
    req.isMainAdmin = decoded.isMainAdmin;
    
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
