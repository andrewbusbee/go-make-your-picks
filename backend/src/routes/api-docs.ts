// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger';
import logger from '../utils/logger';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

/**
 * API Documentation using Swagger/OpenAPI
 * 
 * Interactive API documentation is available at /api/docs
 * Raw OpenAPI JSON spec is available at /api/docs/json
 * 
 * SECURITY: In production, these endpoints require admin authentication.
 * In development, they are publicly accessible for easier API exploration.
 * 
 * To document new endpoints:
 * 1. Add JSDoc-style @openapi comments above your route handler in route files, OR
 * 2. Add the endpoint definition directly to src/config/swagger.ts in the paths object
 * 
 * Example JSDoc format (add above route handler):
 * /**
 *  * @openapi
 *  * /api/example:
 *  *   get:
 *  *     summary: Example endpoint
 *  *     tags: [Examples]
 *  *     responses:
 *  *       200:
 *  *         description: Success
 *  * /
 */

// Serve Swagger UI at /api/docs
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .topbar-wrapper { display: none !important; }
    .swagger-ui .swagger-ui-wrap { margin-top: 0 !important; padding-top: 0 !important; }
    .swagger-ui .info { margin-top: 0 !important; padding-top: 20px !important; }
    .swagger-ui .info .title { color: #3b82f6 !important; }
    .swagger-ui .info .title small { color: #6b7280 !important; }
    .swagger-ui .scheme-container { margin-top: 20px !important; }
    .swagger-ui .info .base-url { color: #6b7280 !important; }
    .swagger-ui .info .description { color: #374151 !important; }
    .swagger-ui .info .description p { color: #374151 !important; }
    @media (prefers-color-scheme: dark) {
      .swagger-ui { background: #1f2937 !important; }
      .swagger-ui .info .title { color: #60a5fa !important; }
      .swagger-ui .info .title small { color: #9ca3af !important; }
      .swagger-ui .info .base-url { color: #9ca3af !important; }
      .swagger-ui .info .description { color: #d1d5db !important; }
      .swagger-ui .info .description p { color: #d1d5db !important; }
      .swagger-ui .opblock-tag { color: #e5e7eb !important; }
      .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3b82f6 !important; }
      .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #10b981 !important; }
      .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #f59e0b !important; }
      .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444 !important; }
    }
  `,
  customSiteTitle: 'Go Make Your Picks API Documentation',
  customfavIcon: '/favicon.ico',
};

// Apply admin authentication in production only
const middleware = isProduction ? [authenticateAdmin] : [];

router.use('/', ...middleware, swaggerUi.serve);
router.get('/', ...middleware, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Serve raw OpenAPI JSON spec at /api/docs/json
router.get('/json', ...middleware, (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  } catch (error) {
    logger.error('Error serving OpenAPI spec', { error });
    res.status(500).json({ error: 'Failed to generate OpenAPI specification' });
  }
});

export default router;
