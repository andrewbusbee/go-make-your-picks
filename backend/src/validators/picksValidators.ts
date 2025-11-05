/**
 * Picks Route Validators
 */

import { body, param } from 'express-validator';

// Validators for JWT-based pick submission (no token param needed)
export const submitPickValidators = [
  body('picks')
    .isArray({ min: 1, max: 10 }).withMessage('Picks must be an array with 1-10 items')
    .custom((picks) => {
      // Check that all picks are either strings or numbers (team IDs)
      const invalidPicks = picks.filter((pick: any) => {
        // Allow numbers (team IDs) or non-empty strings
        if (typeof pick === 'number') {
          return pick <= 0; // Reject invalid IDs
        }
        if (typeof pick === 'string') {
          return pick.trim().length === 0 || pick.length > 100;
        }
        return true; // Reject other types
      });
      if (invalidPicks.length > 0) {
        throw new Error('Each pick must be a valid team ID (number) or a non-empty string with max 100 characters');
      }
      return true;
    }),
  
  body('userId')
    .optional()
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
];

// Validators for legacy token-based pick submission (with token param)
export const submitPickWithTokenValidators = [
  param('token')
    .notEmpty().withMessage('Magic link token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
  
  body('picks')
    .isArray({ min: 1, max: 10 }).withMessage('Picks must be an array with 1-10 items')
    .custom((picks) => {
      // Check that all picks are either strings or numbers (team IDs)
      const invalidPicks = picks.filter((pick: any) => {
        // Allow numbers (team IDs) or non-empty strings
        if (typeof pick === 'number') {
          return pick <= 0; // Reject invalid IDs
        }
        if (typeof pick === 'string') {
          return pick.trim().length === 0 || pick.length > 100;
        }
        return true; // Reject other types
      });
      if (invalidPicks.length > 0) {
        throw new Error('Each pick must be a valid team ID (number) or a non-empty string with max 100 characters');
      }
      return true;
    }),
];

export const adminCreatePickValidators = [
  body('userId')
    .isInt({ min: 1 }).withMessage('Valid user ID is required'),
  
  body('roundId')
    .isInt({ min: 1 }).withMessage('Valid round ID is required'),
  
  body('picks')
    .isArray({ min: 0, max: 10 }).withMessage('Picks must be an array with 0-10 items')
    .custom((picks) => {
      // Allow empty array for clearing picks
      if (picks.length === 0) {
        return true;
      }
      
      const invalidPicks = picks.filter((pick: any) => 
        typeof pick !== 'string' || pick.trim().length === 0 || pick.length > 100
      );
      if (invalidPicks.length > 0) {
        throw new Error('Each pick must be a non-empty string with max 100 characters');
      }
      return true;
    }),
];

