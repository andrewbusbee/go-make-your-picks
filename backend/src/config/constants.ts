/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// Security & Authentication
export const MIN_JWT_SECRET_LENGTH = 32;
export const JWT_TOKEN_EXPIRY = '24h'; // 24 hours - reduced from 7 days for security
export const PASSWORD_SALT_ROUNDS = 12; // Increased from 10 for better security
export const MAGIC_LINK_TOKEN_BYTES = 32;
export const ADMIN_MAGIC_LINK_TOKEN_BYTES = 32;
export const ADMIN_MAGIC_LINK_EXPIRY_MINUTES = 10;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_EXPIRY_HOURS = 1;

// Password Validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;

// Email Configuration
export const EMAIL_RETRY_ATTEMPTS = 3;
export const EMAIL_RETRY_FACTOR = 2;
export const EMAIL_RETRY_MIN_TIMEOUT = 1000; // 1 second
export const EMAIL_RETRY_MAX_TIMEOUT = 5000; // 5 seconds

// Database Limits
export const MAX_SPORT_NAME_LENGTH = 100;
export const MAX_TEAM_NAME_LENGTH = 255;
export const MAX_SEASON_NAME_LENGTH = 50;
export const MAX_USER_NAME_LENGTH = 100;
export const MAX_EMAIL_MESSAGE_LENGTH = 500;
export const MAX_PICK_VALUE_LENGTH = 100;

// Pick Constraints
export const MIN_NUM_PICKS = 1;
export const MAX_NUM_PICKS = 10;

// Rate Limiting
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const LOGIN_RATE_LIMIT_MAX = 5;
export const ADMIN_MAGIC_LINK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const ADMIN_MAGIC_LINK_RATE_LIMIT_MAX = 3;
export const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const PASSWORD_RESET_RATE_LIMIT_MAX = 3;
export const ACTIVATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const ACTIVATION_RATE_LIMIT_MAX = 10;
export const TEST_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const TEST_EMAIL_RATE_LIMIT_MAX = 5;
export const PICK_SUBMISSION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const PICK_SUBMISSION_RATE_LIMIT_MAX = 10;
export const PUBLIC_RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000; // 1 minute
export const PUBLIC_RATE_LIMIT_MAX = 100;

// Settings Cache
export const SETTINGS_CACHE_TTL = 60000; // 1 minute

// Database Connection Pool
export const DB_CONNECTION_LIMIT = 10;
export const DB_QUEUE_LIMIT = 0; // Unlimited queue

// Year Validation
export const MIN_VALID_YEAR = 1990;
export const MAX_VALID_YEAR = 2100;

// Points Range
export const MIN_POINTS_VALUE = 0;
export const MAX_POINTS_VALUE = 20;

// HTTP
export const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_JSON_PAYLOAD_SIZE = '1mb';

// Logging
export const LOG_FILE_MAX_SIZE = 5242880; // 5MB
export const LOG_FILE_MAX_FILES_ERROR = 5;
export const LOG_FILE_MAX_FILES_COMBINED = 10;

// Default Values
export const DEFAULT_TIMEZONE = 'America/New_York';
export const DEFAULT_PORT = 3003;
export const DEFAULT_DB_PORT = 3306;
export const DEFAULT_SMTP_PORT = 587;

// Common Messages (for security and consistency)
export const MAGIC_LINK_SENT_MESSAGE = 'If an admin account with that email exists, a login link will be sent';
export const PASSWORD_RESET_SENT_MESSAGE = 'If you entered a valid email, a password reset message will be sent';

