/**
 * Startup Validation
 * Critical checks that must pass before the server starts
 */

import { MIN_JWT_SECRET_LENGTH } from '../config/constants';
import logger from './logger';
import { NODE_ENV, IS_PRODUCTION } from './env';

/**
 * Validates JWT_SECRET environment variable
 * Exits process if validation fails in production
 */
export function validateJwtSecret(): void {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    logger.error('FATAL: JWT_SECRET environment variable is not set!');
    logger.error('This is a critical security requirement. The application cannot start without it.');
    logger.error('Please set JWT_SECRET in your environment or .env file.');
    process.exit(1);
  }

  if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    logger.error(`FATAL: JWT_SECRET is too short (minimum ${MIN_JWT_SECRET_LENGTH} characters required)`);
    logger.error(`Current length: ${JWT_SECRET.length} characters`);
    
    if (IS_PRODUCTION) {
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
    
    if (IS_PRODUCTION) {
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
 * Validates database password environment variable
 * Exits process if validation fails in production
 */
export function validateDatabasePassword(): void {
  const dbPassword = process.env.MARIADB_PASSWORD;
  
  if (IS_PRODUCTION) {
    if (!dbPassword || dbPassword.trim() === '') {
      logger.error('FATAL: MARIADB_PASSWORD environment variable is not set!');
      logger.error('This is a critical security requirement. The application cannot start without it in production.');
      logger.error('Please set MARIADB_PASSWORD in your environment or .env file.');
      process.exit(1);
    }
    
    // Check for default/example passwords
    const dangerousDefaults = [
      'pickspass',
      'password',
      'root',
      'admin',
      'changeme',
      '123456',
      ''
    ];
    
    if (dangerousDefaults.some(bad => dbPassword.toLowerCase() === bad.toLowerCase())) {
      logger.error('FATAL: MARIADB_PASSWORD appears to be a default/example value!');
      logger.error('Please set a strong, unique database password.');
      logger.error('This is a critical security requirement for production.');
      process.exit(1);
    }
    
    logger.info('✅ MARIADB_PASSWORD validation passed', { 
      environment: NODE_ENV
    });
  } else {
    // In non-production, allow empty password but warn
    if (!dbPassword || dbPassword.trim() === '') {
      logger.warn('⚠️  WARNING: MARIADB_PASSWORD is not set');
      logger.warn('Using default password for development (NOT for production)');
    }
  }
}

/**
 * Validates CORS configuration
 * Exits process if validation fails in production
 */
export function validateCorsConfiguration(): void {
  if (IS_PRODUCTION) {
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    const appUrl = process.env.APP_URL;
    
    // In production, we must have at least one explicit origin configured
    if (!allowedOriginsEnv && !appUrl) {
      logger.error('FATAL: CORS configuration is missing in production!');
      logger.error('Either ALLOWED_ORIGINS or APP_URL must be set in production.');
      logger.error('This is a critical security requirement to prevent CSRF attacks.');
      logger.error('Please set ALLOWED_ORIGINS (comma-separated list) or APP_URL in your environment.');
      process.exit(1);
    }
    
    if (allowedOriginsEnv) {
      const origins = allowedOriginsEnv
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
      
      if (origins.length === 0) {
        logger.error('FATAL: ALLOWED_ORIGINS is set but contains no valid origins!');
        logger.error('Please provide at least one valid origin in ALLOWED_ORIGINS.');
        process.exit(1);
      }
    }
    
    logger.info('✅ CORS configuration validation passed', { 
      hasAllowedOrigins: !!allowedOriginsEnv,
      hasAppUrl: !!appUrl
    });
  }
}

/**
 * Validates critical environment configuration on startup
 */
export function runStartupValidation(): void {
  logger.info('Running startup validation checks...');
  
  validateJwtSecret();
  validateDatabasePassword();
  validateCorsConfiguration();
  
  // Add more startup checks here as needed
  
  logger.info('✅ All startup validation checks passed');
}

