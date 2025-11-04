/**
 * User Route Validators
 */

import { body, param } from 'express-validator';

export const createUserValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
];

export const updateUserValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid user ID is required'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
];
