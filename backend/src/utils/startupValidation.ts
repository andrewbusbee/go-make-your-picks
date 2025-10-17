/**
 * Startup Validation
 * Critical checks that must pass before the server starts
 */

import { MIN_JWT_SECRET_LENGTH } from '../config/constants';
import logger from './logger';

/**
 * Validates JWT_SECRET environment variable
 * Exits process if validation fails in production
 */
export function validateJwtSecret(): void {
  const JWT_SECRET = process.env.JWT_SECRET;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    logger.error('FATAL: JWT_SECRET environment variable is not set!');
    logger.error('This is a critical security requirement. The application cannot start without it.');
    logger.error('Please set JWT_SECRET in your environment or .env file.');
    process.exit(1);
  }

  if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    logger.error(`FATAL: JWT_SECRET is too short (minimum ${MIN_JWT_SECRET_LENGTH} characters required)`);
    logger.error(`Current length: ${JWT_SECRET.length} characters`);
    
    if (NODE_ENV === 'production') {
      logger.error('Cannot start in production with weak JWT_SECRET');
      process.exit(1);
    } else {
      logger.warn('⚠️  WARNING: JWT_SECRET is too short for development');
      logger.warn('This is NOT acceptable for production deployment');
    }
  }

  // Check for default/example values
  const dangerousDefaults = [
    'change-this-to-a-long-random-string',
    'your-secret-key-here',
    'jwt-secret',
    'secret',
    'password',
    '12345678901234567890123456789012'
  ];

  if (dangerousDefaults.some(bad => JWT_SECRET.toLowerCase().includes(bad.toLowerCase()))) {
    logger.error('FATAL: JWT_SECRET appears to be a default/example value!');
    logger.error('Please generate a secure random secret.');
    logger.error('Run: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"');
    
    if (NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️  WARNING: Using default JWT_SECRET in development');
    }
  }

  logger.info('✅ JWT_SECRET validation passed', { 
    length: JWT_SECRET.length,
    environment: NODE_ENV
  });
}

/**
 * Validates critical environment configuration on startup
 */
export function runStartupValidation(): void {
  logger.info('Running startup validation checks...');
  
  validateJwtSecret();
  
  // Add more startup checks here as needed
  
  logger.info('✅ All startup validation checks passed');
}

