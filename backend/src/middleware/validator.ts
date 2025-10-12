/**
 * Input Validation Middleware
 * Uses express-validator for robust input validation
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';
import { MAX_JSON_PAYLOAD_SIZE } from '../config/constants';

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

/**
 * Middleware to validate request body size
 * Provides explicit error message for oversized payloads
 * Works in conjunction with express.json({ limit }) for defense in depth
 */
export const validateBodySize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.headers['content-length'];
  
  if (contentLength) {
    const sizeInBytes = parseInt(contentLength);
    const maxSizeInBytes = 1048576; // 1MB (matches MAX_JSON_PAYLOAD_SIZE)
    
    if (sizeInBytes > maxSizeInBytes) {
      logger.warn('Request body too large', {
        url: req.url,
        method: req.method,
        size: `${(sizeInBytes / 1048576).toFixed(2)}MB`,
        maxSize: '1MB',
        ip: req.ip
      });
      
      return res.status(413).json({
        error: 'Request body too large',
        maxSize: '1MB',
        yourSize: `${(sizeInBytes / 1048576).toFixed(2)}MB`
      });
    }
  }
  
  next();
};

