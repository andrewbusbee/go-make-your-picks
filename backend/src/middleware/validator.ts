/**
 * Input Validation Middleware
 * Uses express-validator for robust input validation
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';

/**
 * Middleware to check validation results
 * Use this after validation chains
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg,
    }));
    
    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages,
    });
  }
  
  next();
};

/**
 * Wrapper to run validation chains and check results
 * Usage: router.post('/route', validateRequest(validationChains), handler)
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.type === 'field' ? (err as any).path : 'unknown',
        message: err.msg,
      }));
      
      logger.warn('Validation failed', {
        url: req.url,
        method: req.method,
        errors: errorMessages,
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages,
      });
    }
    
    next();
  };
};

