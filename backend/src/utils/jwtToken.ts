/**
 * JWT Token Utilities
 * Handles JWT generation and verification for both admin and pick authentication
 */

import jwt from 'jsonwebtoken';
import { JWT_TOKEN_EXPIRY } from '../config/constants';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Payload for admin JWT tokens
 */
export interface AdminTokenPayload {
  adminId: number;
  email: string;
  isMainAdmin: boolean;
  type: 'admin';
}

/**
 * Payload for pick/player JWT tokens
 */
export interface PickTokenPayload {
  userId?: number; // For single-user magic links
  email?: string; // For shared email magic links
  roundId: number;
  seasonId: number;
  type: 'pick';
  isSharedEmail?: boolean; // Flag to indicate shared email scenario
}

export type TokenPayload = AdminTokenPayload | PickTokenPayload;

/**
 * Generate JWT token for admin authentication
 */
export function generateAdminToken(adminId: number, email: string, isMainAdmin: boolean): string {
  const payload: AdminTokenPayload = {
    adminId,
    email,
    isMainAdmin,
    type: 'admin'
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_TOKEN_EXPIRY
  } as jwt.SignOptions);
}

/**
 * Generate JWT token for pick/player authentication
 * 
 * Magic links are reusable per (user_id, round_id) or (email, round_id) until the round locks.
 * Each successful magic link validation issues a fresh JWT access token with configurable expiry
 * (default: 8h). If the JWT expires, users can click the same magic link again to get a new JWT.
 * 
 * The magic link itself remains valid until:
 * - The round's lock_time is reached, OR
 * - The magic link's expires_at is reached (typically set to round.lock_time)
 * 
 * This separation allows:
 * - Multi-device access (same link works on mobile, desktop, etc.)
 * - Session expiry (JWT expires independently for security)
 * - Convenient re-authentication (click link again if JWT expired)
 */
export function generatePickToken(
  roundId: number,
  seasonId: number,
  userId?: number,
  email?: string
): string {
  const payload: PickTokenPayload = {
    roundId,
    seasonId,
    type: 'pick',
    isSharedEmail: !!email && !userId // Shared email if email provided but no userId
  };
  
  if (userId) {
    payload.userId = userId;
  }
  
  if (email) {
    payload.email = email;
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_TOKEN_EXPIRY // Default 8h - configurable via JWT_EXPIRY env var
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Check if token is an admin token
 */
export function isAdminToken(payload: TokenPayload): payload is AdminTokenPayload {
  return payload.type === 'admin';
}

/**
 * Check if token is a pick token
 */
export function isPickToken(payload: TokenPayload): payload is PickTokenPayload {
  return payload.type === 'pick';
}

