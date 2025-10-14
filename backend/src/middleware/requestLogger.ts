/**
 * Request Logging Middleware
 * Logs HTTP requests with timing information
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    // Determine log level based on status code
    let level: 'error' | 'warn' | 'info' | 'http' = 'http';
    if (statusCode >= 500) {
      level = 'error';
    } else if (statusCode >= 400) {
      level = 'warn';
    }
    // 2xx/3xx responses stay at 'http' level (default)
    
    const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;
    
    logger[level](message, {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

