/**
 * Winston Logger Configuration
 * Provides structured logging with different transports for dev/prod
 */

import winston, { LeveledLogMethod } from 'winston';
import crypto from 'crypto';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Redact email addresses for privacy/GDPR compliance
 * Converts: john.doe@example.com -> j****@e*****.com
 */
export function redactEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '[REDACTED]';
  }
  
  const [localPart, domain] = email.split('@');
  const redactedLocal = localPart.length > 2 
    ? `${localPart[0]}****` 
    : '****';
  
  const domainParts = domain.split('.');
  const redactedDomain = domainParts.length > 1
    ? `${domainParts[0][0]}*****`
    : '*****';
  
  return `${redactedLocal}@${redactedDomain}`;
}

/**
 * Hash email for tracking without exposing PII
 * Use this when you need to correlate logs but preserve privacy
 */
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email).digest('hex').substring(0, 12);
}

// Define log levels
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
};

// Define colors for each level
const colors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on LOG_LEVEL environment variable
const level = () => {
  const logLevel = process.env.LOG_LEVEL?.toUpperCase();
  
  // Validate log level
  const validLevels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG', 'SILENT'];
  if (logLevel && !validLevels.includes(logLevel)) {
    console.warn(`Invalid LOG_LEVEL "${logLevel}". Valid levels: ${validLevels.join(', ')}. Using INFO.`);
    return 'info';
  }
  
  // Handle SILENT level
  if (logLevel === 'SILENT') {
    return 'fatal'; // Only show fatal errors when silent
  }
  
  // Return the specified level or default based on environment
  if (logLevel) {
    return logLevel.toLowerCase();
  }
  
  // Fallback to environment-based defaults
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Custom format for console output (human-readable)
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  // Show stack traces in development for easier debugging
  if (stack && process.env.NODE_ENV !== 'production') {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// File logging is disabled - no file format needed

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
  })
);

// File logging is DISABLED - logs only go to console
// This ensures logs are captured by Docker/container logging systems
// and don't create files that need to be managed

// Create the logger
const baseLogger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Extend logger with fatal method
const logger = Object.assign(baseLogger, {
  fatal: baseLogger.error
}) as winston.Logger & { fatal: LeveledLogMethod };

// Log the selected log level on startup
const selectedLevel = level();
const envLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'default';
logger.info(`🔧 Logger initialized with level: ${selectedLevel.toUpperCase()}`, {
  selectedLevel: selectedLevel.toUpperCase(),
  envLogLevel,
  availableLevels: ['FATAL', 'ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG', 'SILENT'],
  environment: process.env.NODE_ENV || 'development'
});

// Create a stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Helper functions for common logging patterns
 */

export const logFatal = (message: string, error?: any, metadata?: any) => {
  logger.fatal(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...metadata,
  });
};

export const logError = (message: string, error?: any, metadata?: any) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...metadata,
  });
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, metadata);
};

export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, metadata);
};

export const logRequest = (req: any, message: string) => {
  logger.http(message, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

export const logDatabaseQuery = (query: string, duration?: number) => {
  logger.debug('Database query', {
    query: query.substring(0, 100), // Truncate long queries
    duration: duration ? `${duration}ms` : undefined,
  });
};

export const logEmailSent = (to: string, subject: string, success: boolean) => {
  logger.info(`Email ${success ? 'sent' : 'failed'}`, {
    to: redactEmail(to),
    subject,
    success,
  });
};

export const logSchedulerEvent = (event: string, metadata?: any) => {
  logger.info(`Scheduler: ${event}`, metadata);
};

export default logger;

