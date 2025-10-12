import rateLimit from 'express-rate-limit';
import { 
  ADMIN_MAGIC_LINK_RATE_LIMIT_WINDOW_MS, 
  ADMIN_MAGIC_LINK_RATE_LIMIT_MAX 
} from '../config/constants';

// Login rate limiter - prevent brute force attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (matches account lockout threshold)
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
  max: 10, // 10 submissions per hour (allows updates)
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
  // Key by email from request body
  keyGenerator: (req) => {
    return req.body.email || req.ip;
  },
});