/**
 * Seasons Route Validators
 */

import { body, param } from 'express-validator';
import { MIN_VALID_YEAR, MAX_VALID_YEAR, MAX_SEASON_NAME_LENGTH } from '../config/constants';

export const createSeasonValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Season name is required')
    .isLength({ max: MAX_SEASON_NAME_LENGTH }).withMessage(`Season name must be ${MAX_SEASON_NAME_LENGTH} characters or less`),
  
  body('yearStart')
    .isInt({ min: MIN_VALID_YEAR, max: MAX_VALID_YEAR }).withMessage(`Year start must be between ${MIN_VALID_YEAR} and ${MAX_VALID_YEAR}`),
  
  body('yearEnd')
    .isInt({ min: MIN_VALID_YEAR, max: MAX_VALID_YEAR }).withMessage(`Year end must be between ${MIN_VALID_YEAR} and ${MAX_VALID_YEAR}`)
    .custom((value, { req }) => {
      if (value < req.body.yearStart) {
        throw new Error('Year end must be greater than or equal to year start');
      }
      return true;
    }),
  
  body('participantIds')
    .optional()
    .isArray().withMessage('Participant IDs must be an array')
    .custom((ids) => {
      if (ids && ids.some((id: any) => !Number.isInteger(id) || id < 1)) {
        throw new Error('All participant IDs must be positive integers');
      }
      return true;
    }),
];

export const seasonIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid season ID is required'),
];

export const permanentDeleteValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid season ID is required'),
  
  body('confirmation')
    .equals('PERMANENT DELETE').withMessage('Confirmation must be exactly "PERMANENT DELETE"'),
];

