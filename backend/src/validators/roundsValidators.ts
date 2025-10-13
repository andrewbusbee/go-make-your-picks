/**
 * Rounds Route Validators
 */

import { body, param } from 'express-validator';
import { isValidTimezone } from '../utils/timezones';

export const createRoundValidators = [
  body('seasonId')
    .isInt({ min: 1 }).withMessage('Valid season ID is required'),
  
  body('sportName')
    .trim()
    .notEmpty().withMessage('Sport name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Sport name must be between 1 and 100 characters'),
  
  body('pickType')
    .optional()
    .isIn(['single', 'multiple']).withMessage('Pick type must be either "single" or "multiple"'),
  
  body('numWriteInPicks')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Number of write-in picks must be between 1 and 10'),
  
  body('emailMessage')
    .optional()
    .isLength({ max: 500 }).withMessage('Email message must be 500 characters or less'),
  
  body('lockTime')
    .notEmpty().withMessage('Lock time is required')
    .isISO8601().withMessage('Lock time must be a valid ISO 8601 date'),
  
  body('timezone')
    .optional()
    .custom((value) => {
      if (value && !isValidTimezone(value)) {
        throw new Error('Invalid timezone');
      }
      return true;
    }),
  
  body('teams')
    .optional()
    .isArray().withMessage('Teams must be an array')
    .custom((teams) => {
      if (teams && teams.some((team: string) => team.length > 100)) {
        throw new Error('Team names must be 100 characters or less');
      }
      return true;
    }),

  body('reminderType')
    .optional()
    .isIn(['daily', 'before_lock']).withMessage('Reminder type must be either "daily" or "before_lock"'),

  body('dailyReminderTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Daily reminder time must be in HH:MM:SS format'),

  body('firstReminderHours')
    .optional()
    .isInt({ min: 1, max: 168 }).withMessage('First reminder hours must be between 1 and 168'),

  body('finalReminderHours')
    .optional()
    .isInt({ min: 1, max: 48 }).withMessage('Final reminder hours must be between 1 and 48'),
];

export const updateRoundValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid round ID is required'),
  
  body('sportName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Sport name must be between 1 and 100 characters'),
  
  body('pickType')
    .optional()
    .isIn(['single', 'multiple']).withMessage('Pick type must be either "single" or "multiple"'),
  
  body('numWriteInPicks')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Number of write-in picks must be between 1 and 10'),
  
  body('emailMessage')
    .optional()
    .isLength({ max: 500 }).withMessage('Email message must be 500 characters or less'),
  
  body('lockTime')
    .optional()
    .isISO8601().withMessage('Lock time must be a valid ISO 8601 date'),
  
  body('timezone')
    .optional()
    .custom((value) => {
      if (value && !isValidTimezone(value)) {
        throw new Error('Invalid timezone');
      }
      return true;
    }),

  body('reminderType')
    .optional()
    .isIn(['daily', 'before_lock']).withMessage('Reminder type must be either "daily" or "before_lock"'),

  body('dailyReminderTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Daily reminder time must be in HH:MM:SS format'),

  body('firstReminderHours')
    .optional()
    .isInt({ min: 1, max: 168 }).withMessage('First reminder hours must be between 1 and 168'),

  body('finalReminderHours')
    .optional()
    .isInt({ min: 1, max: 48 }).withMessage('Final reminder hours must be between 1 and 48'),
];

export const completeRoundValidators = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid round ID is required'),
  
  body('firstPlaceTeam')
    .trim()
    .escape()
    .notEmpty().withMessage('Champion (1st place) is required')
    .isLength({ max: 255 }).withMessage('Team name must be 255 characters or less'),
  
  body('secondPlaceTeam')
    .optional()
    .isLength({ max: 255 }).withMessage('Team name must be 255 characters or less'),
  
  body('thirdPlaceTeam')
    .optional()
    .isLength({ max: 255 }).withMessage('Team name must be 255 characters or less'),
  
  body('fourthPlaceTeam')
    .optional()
    .isLength({ max: 255 }).withMessage('Team name must be 255 characters or less'),
  
  body('fifthPlaceTeam')
    .optional()
    .isLength({ max: 255 }).withMessage('Team name must be 255 characters or less'),
  
  body('manualScores')
    .optional()
    .isArray().withMessage('Manual scores must be an array')
    .custom((scores) => {
      if (scores && scores.some((s: any) => !s.userId || !s.placement)) {
        throw new Error('Each manual score must have userId and placement');
      }
      return true;
    }),
];

