import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { 
  ADMIN_MAGIC_LINK_RATE_LIMIT_WINDOW_MS, 
  ADMIN_MAGIC_LINK_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX,
  RATE_LIMIT_AUTH_WINDOW_MS,
  RATE_LIMIT_AUTH_MAX,
  RATE_LIMIT_WRITE_WINDOW_MS,
  RATE_LIMIT_WRITE_MAX,
  RATE_LIMIT_READ_WINDOW_MS,
  RATE_LIMIT_READ_MAX,
} from '../config/constants';
import { logError } from '../utils/logger';

// Login rate limiter - prevent brute force attacks
export const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  max: LOGIN_RATE_LIMIT_MAX, // 10 attempts per window (matches account lockout threshold)
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter - prevent email spam
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Round activation limiter - prevent magic link email spam
export const activationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 activations per hour
  message: { error: 'Too many activations. Please wait before activating more sports.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Test email limiter - prevent email spam
export const testEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 test emails per hour
  message: { error: 'Too many test emails. Please wait before sending more.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pick submission limiter - prevent spam
export const pickSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 50 submissions per hour (allows updates and shared email auto-save)
  message: { error: 'Too many pick submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Magic link validation limiter - prevent token enumeration attacks
export const magicLinkValidationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 validation attempts per minute
  message: { error: 'Too many validation attempts. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin magic link request limiter - prevent email spam for admin logins
// Note: Counter is reset on successful login (see auth routes)
export const adminMagicLinkLimiter = rateLimit({
  windowMs: ADMIN_MAGIC_LINK_RATE_LIMIT_WINDOW_MS, // 1 hour
  max: ADMIN_MAGIC_LINK_RATE_LIMIT_MAX, // 3 attempts per hour
  message: { error: 'Too many login link requests. Please try again later or contact the main administrator.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by email from request body, fallback to IP with proper IPv6 handling
  keyGenerator: (req) => {
    return req.body.email || ipKeyGenerator(req.ip || 'unknown');
  },
  // Skip on successful attempts (handled manually in auth routes)
  skipSuccessfulRequests: false,
});

// Helper function to reset rate limit for a specific email after successful login
export const resetAdminMagicLinkLimit = async (email: string) => {
  try {
    // Get the store from the rate limiter
    const store = (adminMagicLinkLimiter as any).store;
    if (store && store.resetKey) {
      await store.resetKey(email);
    }
  } catch (error) {
    // If reset fails, log but don't throw - this is not critical
    logError('Failed to reset rate limit', error, { email });
  }
};

// Tiered Rate Limiters by Endpoint Type
// These provide different limits for auth, write, and read operations

// Auth rate limiter - strict limits for authentication endpoints
// Used for login, magic link exchange, password reset, etc.
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_AUTH_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX,
  message: { error: 'Too many authentication requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Write rate limiter - moderate limits for write operations
// Used for picks submission, admin changes, updates, etc.
// Skip successful requests to allow legitimate admin operations without hitting limits
export const writeLimiter = rateLimit({
  windowMs: RATE_LIMIT_WRITE_WINDOW_MS,
  max: RATE_LIMIT_WRITE_MAX,
  message: { error: 'Too many write requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests (legitimate operations)
});

// Read rate limiter - relaxed limits for read-only operations
// Used for leaderboards, public data, health checks, etc.
// Skip successful requests to allow legitimate usage without hitting limits
export const readLimiter = rateLimit({
  windowMs: RATE_LIMIT_READ_WINDOW_MS,
  max: RATE_LIMIT_READ_MAX,
  message: { error: 'Too many read requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests (legitimate usage)
});