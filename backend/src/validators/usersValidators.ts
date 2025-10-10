/**
 * Users Route Validators
 */

import { body, param } from 'express-validator';
import { MAX_USER_NAME_LENGTH } from '../config/constants';

export const createUserValidators = [
  body('name')
    .trim()
    .escape()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: MAX_USER_NAME_LENGTH }).withMessage(`Name must be ${MAX_USER_NAME_LENGTH} characters or less`),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

export const updateUserValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid user ID is required'),
  
  body('name')
    .trim()
    .escape()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: MAX_USER_NAME_LENGTH }).withMessage(`Name must be ${MAX_USER_NAME_LENGTH} characters or less`),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

export const userIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid user ID is required'),
];

