// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_TOKEN_EXPIRY } from '../config/constants';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import { generateAdminToken } from '../utils/jwtToken';

// JWT_SECRET validation is now handled by startupValidation.ts on app start
const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  adminId?: number;
  email?: string;
  isMainAdmin?: boolean;
  user?: {
    id: number;
    email: string;
    name: string;
    isMainAdmin: boolean;
  };
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
      email: string;
      isMainAdmin: boolean;
    };
    
    // 🔒 SECURITY FIX: Verify admin still exists in database
    // This prevents old tokens from deleted admins from accessing the system
    const [admins] = await db.query<RowDataPacket[]>(
      'SELECT id, email, is_main_admin, must_change_password FROM admins WHERE id = ? AND email = ?',
      [decoded.adminId, decoded.email]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Admin account no longer exists' });
    }

    const admin = admins[0];
    
    // 🔒 SECURITY FIX: Enforce password change requirement
    // Block API access if password must be changed (except for password change endpoints)
    // This prevents bypassing frontend password change requirement via direct API calls
    if (admin.must_change_password) {
      // Allow access to password change endpoints only
      // Use originalUrl to get full path including /api prefix
      const originalUrl = req.originalUrl || req.url;
      const isPasswordChangeEndpoint = 
        originalUrl.includes('/auth/initial-setup') || 
        originalUrl.includes('/auth/change-password') ||
        originalUrl === '/api/auth/me' || originalUrl.startsWith('/api/auth/me?'); // Allow /auth/me to check status
      
      if (!isPasswordChangeEndpoint) {
        return res.status(403).json({ 
          error: 'Password change required before accessing this resource',
          mustChangePassword: true 
        });
      }
    }
    
    // Update request with verified admin data
    req.adminId = admin.id;
    req.email = admin.email;
    req.isMainAdmin = admin.is_main_admin;
    req.user = {
      id: admin.id,
      email: admin.email,
      name: admin.email, // We don't store names in admins table, use email
      isMainAdmin: admin.is_main_admin
    };
    
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

// Re-export for backward compatibility
export const generateToken = generateAdminToken;
