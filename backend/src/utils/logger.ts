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

/**
 * Mask magic link token for safe logging
 * Shows first 6 characters and masks the rest
 */
export function maskMagicToken(token: string): string {
  if (!token || token.length < 6) {
    return '****';
  }
  return `${token.substring(0, 6)}****`;
}

/**
 * Mask JWT token for safe logging
 * Shows first 10 characters and masks the rest
 */
export function maskJwtToken(token: string): string {
  if (!token || token.length < 10) {
    return '****';
  }
  return `${token.substring(0, 10)}****`;
}

/**
 * Mask token in URL for safe logging
 * Replaces token values in query params and path params
 */
export function maskTokenInUrl(url: string): string {
  // Mask query params like ?token=... or &token=...
  let masked = url.replace(/[?&]token=[^&$]*/gi, (match) => {
    return match.substring(0, match.indexOf('=') + 1) + '****';
  });
  
  // Mask path params like /pick/TOKEN or /validate/TOKEN
  // This is a simple heuristic - replace long hex strings in path (64+ chars for magic links)
  masked = masked.replace(/\/([a-f0-9]{64,})/gi, '/****');
  
  return masked;
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
  // Note: Import IS_DEVELOPMENT here would cause circular dependency, so use process.env directly
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Determine if JSON logging is enabled
const useJsonFormat = process.env.LOG_JSON === 'true';

// Custom format for console output (human-readable)
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  // Show stack traces in development for easier debugging
  // Note: Import IS_PRODUCTION here would cause circular dependency, so use process.env directly
  if (stack && process.env.NODE_ENV !== 'production') {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// JSON format for structured logging (used when LOG_JSON=true or centralized logging enabled)
const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
// Use JSON format if LOG_JSON=true, otherwise use human-readable format
transports.push(
  new winston.transports.Console({
    format: useJsonFormat
      ? jsonFormat
      : combine(
          colorize({ all: true }),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          consoleFormat
        ),
  })
);

// Optional centralized logging transport (HTTP endpoint)
// Only enabled when LOG_DESTINATION is set to an HTTP URL
if (process.env.LOG_DESTINATION && process.env.LOG_DESTINATION.startsWith('http')) {
  try {
    // For HTTP logging, we'll use a custom transport that sends logs via HTTP POST
    // This is a simple implementation - in production, consider using winston-http or similar
    const logUrl = new URL(process.env.LOG_DESTINATION);
    const httpTransport = new winston.transports.Http({
      host: logUrl.hostname,
      port: logUrl.port ? parseInt(logUrl.port, 10) : (logUrl.protocol === 'https:' ? 443 : 80),
      path: logUrl.pathname || '/logs',
      ssl: logUrl.protocol === 'https:',
      format: jsonFormat,
    });
    transports.push(httpTransport);
    // Note: Logger not yet created, so we'll log this after logger initialization
  } catch (error) {
    console.error('Failed to configure HTTP logging transport:', error);
    // Continue without centralized logging if configuration fails
  }
}

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

// Extend logger with fatal and security/alert methods
const logger = Object.assign(baseLogger, {
  fatal: baseLogger.error,
  // Security/alert method: logs at error level with special metadata for security events
  security: (message: string, metadata?: any) => {
    baseLogger.error(`[SECURITY] ${message}`, {
      ...metadata,
      securityEvent: true,
      severity: 'high',
    });
  },
  alert: (message: string, metadata?: any) => {
    baseLogger.error(`[ALERT] ${message}`, {
      ...metadata,
      alertEvent: true,
      severity: 'high',
    });
  },
}) as winston.Logger & { 
  fatal: LeveledLogMethod;
  security: (message: string, metadata?: any) => void;
  alert: (message: string, metadata?: any) => void;
};

// Log the selected log level on startup
const selectedLevel = level();
const envLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'default';
const hasCentralizedLogging = !!process.env.LOG_DESTINATION;
logger.info(`🔧 Logger initialized with level: ${selectedLevel.toUpperCase()}`, {
  selectedLevel: selectedLevel.toUpperCase(),
  envLogLevel,
  availableLevels: ['FATAL', 'ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG', 'SILENT'],
  environment: process.env.NODE_ENV || 'development',
  jsonFormat: useJsonFormat,
  centralizedLogging: hasCentralizedLogging,
});
if (hasCentralizedLogging) {
  logger.info('Centralized logging enabled', { destination: process.env.LOG_DESTINATION });
}

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

/**
 * Security and alert logging functions
 * Use these for high-severity security events that should be monitored closely
 */

/**
 * Log a security event (e.g., repeated auth failures, account lockouts, suspicious activity)
 * This logs at error level with special metadata for log aggregation systems
 */
export const logSecurityEvent = (message: string, metadata?: any) => {
  logger.security(message, metadata);
};

/**
 * Log an alert-level event (e.g., rate limit abuse, unexpected 5xx bursts)
 * This logs at error level with special metadata for alerting systems
 */
export const logAlert = (message: string, metadata?: any) => {
  logger.alert(message, metadata);
};

export default logger;

