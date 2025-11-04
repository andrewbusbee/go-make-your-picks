// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import logger from './logger';
import { IS_PRODUCTION } from './env';

/**
 * Compute allowed CORS origins based on environment
 * 
 * SECURITY: In production, only explicitly allowed origins are permitted.
 * In development, localhost variations are allowed for easier frontend development.
 * 
 * @returns Array of allowed origin strings, or a callback function for dynamic origin checking
 */
export function getAllowedOrigins(): string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void) {
  if (IS_PRODUCTION) {
    // Production: Use explicit allowlist from ALLOWED_ORIGINS env var or fallback to APP_URL
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    
    if (allowedOriginsEnv) {
      // Support comma-separated list of origins
      const origins = allowedOriginsEnv
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
      
      if (origins.length > 0) {
        logger.info('CORS: Using explicit ALLOWED_ORIGINS from environment', {
          originCount: origins.length,
          origins: origins.map(o => o.replace(/\/\/.*@/, '//***@')) // Mask credentials in logs
        });
        return origins;
      }
    }
    
    // Fallback to APP_URL if ALLOWED_ORIGINS not set
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      logger.info('CORS: Using APP_URL as single allowed origin', {
        origin: appUrl.replace(/\/\/.*@/, '//***@') // Mask credentials in logs
      });
      return [appUrl];
    }
    
    // No origins configured - log warning but allow requests (for backward compatibility)
    logger.warn('CORS: No ALLOWED_ORIGINS or APP_URL set in production - allowing all origins (not recommended)');
    return ['*'];
  } else {
    // Development: Allow localhost variations for frontend dev server flexibility
    const defaultPort = parseInt(process.env.PORT || '3003');
    const allowedOrigins = [
      `http://localhost:${defaultPort}`,
      `http://localhost:3003`, // Frontend dev server
      `http://localhost:3004`, // Backend dev server
      `http://127.0.0.1:${defaultPort}`,
      `http://127.0.0.1:3003`,
      `http://127.0.0.1:3004`,
    ];
    
    // Also allow APP_URL if set (useful for testing with custom URLs)
    const appUrl = process.env.APP_URL;
    if (appUrl && !allowedOrigins.includes(appUrl)) {
      allowedOrigins.push(appUrl);
    }
    
    logger.info('CORS: Development mode - allowing localhost origins', {
      originCount: allowedOrigins.length
    });
    
    return allowedOrigins;
  }
}

/**
 * CORS origin validation callback
 * Logs warnings for unexpected origins in production
 */
export function corsOriginCallback(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  const allowedOrigins = getAllowedOrigins();
  
  // Handle undefined origin (e.g., same-origin requests, mobile apps, Postman)
  if (!origin) {
    callback(null, true);
    return;
  }
  
  // If allowedOrigins is an array, check if origin is in the list
  if (Array.isArray(allowedOrigins)) {
    // Allow wildcard in development
    if (allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Origin not in allowlist
    if (IS_PRODUCTION) {
      logger.warn('CORS: Rejected origin not in allowlist', {
        origin: origin.replace(/\/\/.*@/, '//***@'), // Mask credentials in logs
        allowedOrigins: allowedOrigins.map(o => o.replace(/\/\/.*@/, '//***@'))
      });
    }
    callback(null, false);
    return;
  }
  
  // If allowedOrigins is a function, call it (shouldn't happen with current implementation)
  logger.error('CORS: Unexpected allowedOrigins type', { type: typeof allowedOrigins });
  callback(null, false);
}

