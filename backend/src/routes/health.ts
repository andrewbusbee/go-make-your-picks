// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint for Docker HEALTHCHECK
 * 
 * This endpoint is lightweight, unauthenticated, and returns a simple status.
 * It's used by Docker's HEALTHCHECK instruction to verify the container is running.
 * 
 * SECURITY: This endpoint intentionally does NOT expose:
 * - Database connection status
 * - SMTP/email service status
 * - Internal application state
 * 
 * This prevents information disclosure that could be useful to attackers.
 */
router.get('/healthz', (req: Request, res: Response) => {
  // Simple health check - just confirm the server is responding
  res.status(200).json({ status: 'ok' });
});

export default router;

