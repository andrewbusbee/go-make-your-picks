/**
 * Pick Authentication Middleware
 * Validates magic link tokens directly (simplified - no JWT exchange needed)
 */

import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger, { maskMagicToken } from '../utils/logger';
import { hashMagicLinkToken } from '../utils/magicLinkToken';
import moment from 'moment-timezone';

export interface PickAuthRequest extends Request {
  pickAuth?: {
    userId?: number;
    email?: string;
    roundId: number;
    seasonId: number;
    isSharedEmail: boolean;
  };
  userId?: number;
  email?: string;
  roundId?: number;
  seasonId?: number;
  isSharedEmail?: boolean;
}

/**
 * Middleware to authenticate pick/player requests via magic link token
 * Token can be provided in Authorization header or query parameter
 */
export const authenticatePick = async (req: PickAuthRequest, res: Response, next: NextFunction) => {
  // Get token from Authorization header or query parameter
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Hash the token to compare with stored hash
    const tokenHash = hashMagicLinkToken(token);
    
    // First try email-based magic links
    const [emailLinks] = await db.query<RowDataPacket[]>(
      `SELECT eml.*, r.season_id, r.lock_time, r.timezone, r.status, r.pick_type
       FROM email_magic_links eml
       JOIN rounds_v2 r ON eml.round_id = r.id
       WHERE eml.token = ?
       AND eml.expires_at > NOW()`,
      [tokenHash]
    );

    if (emailLinks.length > 0) {
      const link = emailLinks[0];
      
      // Validate magic link is still active
      const now = moment().tz(link.timezone);
      const lockTime = moment.utc(link.lock_time).tz(link.timezone);
      const expiresAt = moment.utc(link.expires_at).tz(link.timezone);
      
      if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
        return res.status(410).json({ 
          error: 'This magic link has expired or the round is now locked',
          locked: true
        });
      }

      // Attach auth data to request
      req.pickAuth = {
        email: link.email,
        roundId: link.round_id,
        seasonId: link.season_id,
        isSharedEmail: true
      };
      req.roundId = link.round_id;
      req.seasonId = link.season_id;
      req.email = link.email;
      req.isSharedEmail = true;
      
      next();
      return;
    }

    // Fallback to user-based magic links
    const [links] = await db.query<RowDataPacket[]>(
      `SELECT ml.*, r.season_id, r.lock_time, r.timezone, r.status, r.pick_type
       FROM magic_links ml
       JOIN rounds_v2 r ON ml.round_id = r.id
       WHERE ml.token = ?
       AND ml.expires_at > NOW()`,
      [tokenHash]
    );

    if (links.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired magic link' });
    }

    const link = links[0];
    
    // Validate magic link is still active
    const now = moment().tz(link.timezone);
    const lockTime = moment.utc(link.lock_time).tz(link.timezone);
    const expiresAt = moment.utc(link.expires_at).tz(link.timezone);
    
    if (link.status === 'locked' || link.status === 'completed' || now.isAfter(lockTime) || now.isAfter(expiresAt)) {
      return res.status(410).json({ 
        error: 'This magic link has expired or the round is now locked',
        locked: true
      });
    }

    // Attach auth data to request
    req.pickAuth = {
      userId: link.user_id,
      roundId: link.round_id,
      seasonId: link.season_id,
      isSharedEmail: false
    };
    req.roundId = link.round_id;
    req.seasonId = link.season_id;
    req.userId = link.user_id;
    req.isSharedEmail = false;
    
    next();
  } catch (error: any) {
    logger.warn('Pick authentication failed', {
      error: error.message,
      tokenMasked: maskMagicToken(token),
      url: req.url
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

