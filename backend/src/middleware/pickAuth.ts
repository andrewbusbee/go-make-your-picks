/**
 * Pick Authentication Middleware
 * Validates JWT tokens for pick/player authentication
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, isPickToken, PickTokenPayload } from '../utils/jwtToken';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger, { maskJwtToken } from '../utils/logger';

export interface PickAuthRequest extends Request {
  pickAuth?: PickTokenPayload;
  userId?: number;
  email?: string;
  roundId?: number;
  seasonId?: number;
}

/**
 * Middleware to authenticate pick/player requests via JWT
 */
export const authenticatePick = async (req: PickAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    
    if (!isPickToken(decoded)) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const payload = decoded as PickTokenPayload;
    
    // Verify round still exists and is accessible
    const [rounds] = await db.query<RowDataPacket[]>(
      'SELECT id, season_id, lock_time, timezone, status, pick_type FROM rounds_v2 WHERE id = ?',
      [payload.roundId]
    );

    if (rounds.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = rounds[0];

    // Verify season matches
    if (round.season_id !== payload.seasonId) {
      return res.status(403).json({ error: 'Round does not belong to this season' });
    }

    // Attach auth data to request
    req.pickAuth = payload;
    req.roundId = payload.roundId;
    req.seasonId = payload.seasonId;
    
    if (payload.userId) {
      req.userId = payload.userId;
    }
    
    if (payload.email) {
      req.email = payload.email;
    }
    
    next();
  } catch (error: any) {
    logger.warn('Pick authentication failed', {
      error: error.message,
      tokenMasked: maskJwtToken(token),
      url: req.url
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

