// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import crypto from 'crypto';

/**
 * Magic Link Token Utilities
 * 
 * SECURITY: Magic link tokens are hashed before storage in the database.
 * The plain token is sent via email, and on validation we hash the incoming
 * token and compare it to the stored hash. This prevents token exposure
 * if the database is compromised.
 */

/**
 * Generate a secure random token for magic links
 * Returns the plain token (to be sent via email)
 */
export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a magic link token for secure storage in the database
 * Uses SHA-256 which is sufficient for high-entropy random tokens
 */
export function hashMagicLinkToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a magic link token against a stored hash
 * Returns true if the token matches the hash
 */
export function verifyMagicLinkToken(token: string, storedHash: string): boolean {
  const computedHash = hashMagicLinkToken(token);
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

