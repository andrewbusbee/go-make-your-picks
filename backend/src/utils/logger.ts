/**
 * Winston Logger Configuration
 * Provides structured logging with different transports for dev/prod
 */

import winston from 'winston';
import path from 'path';
import crypto from 'crypto';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

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
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
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

// Custom format for file output (JSON for easy parsing)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

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

// File transports (only in production or if LOG_TO_FILE is true)
const shouldLogToFile = process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true';

if (shouldLogToFile) {
  const logsDir = process.env.LOGS_DIR || 'logs';
  
  // Error log file (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // Combined log file (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
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

export const logError = (message: string, error?: any, metadata?: any) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...metadata,
  });
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

