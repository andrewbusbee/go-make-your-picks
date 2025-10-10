/**
 * Picks Route Validators
 */

import { body, param } from 'express-validator';

export const submitPickValidators = [
  param('token')
    .notEmpty().withMessage('Magic link token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
  
  body('picks')
    .isArray({ min: 1, max: 10 }).withMessage('Picks must be an array with 1-10 items')
    .custom((picks) => {
      // Check that all picks are non-empty strings
      const invalidPicks = picks.filter((pick: any) => 
        typeof pick !== 'string' || pick.trim().length === 0 || pick.length > 100
      );
      if (invalidPicks.length > 0) {
        throw new Error('Each pick must be a non-empty string with max 100 characters');
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
    .isArray({ min: 1, max: 10 }).withMessage('Picks must be an array with 1-10 items')
    .custom((picks) => {
      const invalidPicks = picks.filter((pick: any) => 
        typeof pick !== 'string' || pick.trim().length === 0 || pick.length > 100
      );
      if (invalidPicks.length > 0) {
        throw new Error('Each pick must be a non-empty string with max 100 characters');
      }
      return true;
    }),
];

