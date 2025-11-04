/**
 * Historical Champions Route Validators
 */

import { body, param } from 'express-validator';

const currentYear = new Date().getFullYear();
const minYear = 1900;
const maxYear = currentYear + 1; // Allow up to next year for planning

export const createHistoricalChampionValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  
  body('endYear')
    .isInt({ min: minYear, max: maxYear })
    .withMessage(`End year must be between ${minYear} and ${maxYear}`),
];

export const updateHistoricalChampionValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid champion ID is required'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters'),
  
  body('endYear')
    .isInt({ min: minYear, max: maxYear })
    .withMessage(`End year must be between ${minYear} and ${maxYear}`),
];

export const deleteHistoricalChampionValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid champion ID is required'),
];

