// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import adminsRoutes from './routes/admins';
import usersRoutes from './routes/users';
import seasonsRoutes from './routes/seasons';
import seasonParticipantsRoutes from './routes/season-participants';
import roundsRoutes from './routes/rounds';
import picksRoutes from './routes/picks';
import adminPicksRoutes from './routes/admin-picks';
import leaderboardRoutes from './routes/leaderboard';
import testEmailRoutes from './routes/test-email';
import settingsRoutes from './routes/settings';
import configRoutes from './routes/config';
import historicalChampionsRoutes from './routes/historical-champions';
import apiDocsRoutes from './routes/api-docs';
import healthRoutes from './routes/health';
// ⚠️ TEMPORARY - ONLY LOAD IN DEVELOPMENT ⚠️
import adminSeedRoutes from './routes/admin-seed';
import { startReminderScheduler } from './services/reminderScheduler';
import { validateEnvironment, printEnvironmentSummary } from './utils/envValidator';
import { validateDatabaseConnection } from './utils/dbHealthCheck';
import { verifySmtpConnection } from './services/emailService';
import { runStartupValidation } from './utils/startupValidation';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { validateBodySize } from './middleware/validator';
import { corsOriginCallback, getAllowedOrigins } from './utils/corsConfig';
import { IS_PRODUCTION, IS_DEVELOPMENT, NODE_ENV } from './utils/env';
import packageJson from '../package.json';
import { DEFAULT_PORT, PUBLIC_RATE_LIMIT_WINDOW_MS, PUBLIC_RATE_LIMIT_MAX, MAX_JSON_PAYLOAD_SIZE } from './config/constants';
import { authLimiter, writeLimiter, readLimiter } from './middleware/rateLimiter';
import { migrationRunner, allMigrations } from './migrations';

// Load environment variables first
dotenv.config();

// Log startup process
logger.info('Starting Go Make Your Picks application', {
  nodeVersion: process.version,
  platform: process.platform,
  environment: NODE_ENV,
  logLevel: process.env.LOG_LEVEL || 'default'
});

// Log logging configuration details
logger.info('📊 Logging Configuration', {
  logLevel: process.env.LOG_LEVEL || 'default',
  environment: NODE_ENV,
  fileLogging: 'disabled (console only)',
  availableLevels: ['FATAL', 'ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG', 'SILENT']
});

// Validate environment variables before doing anything else
logger.info('Validating environment configuration');
validateEnvironment();
printEnvironmentSummary();

// Run startup validation (JWT_SECRET, etc.)
logger.info('Running startup validation checks');
runStartupValidation();

// 🔒 SECURITY: Fail hard if dev tools are enabled in production
// This prevents accidental exposure of development seed routes and admin tools
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_TOOLS === 'true') {
  logger.error('═══════════════════════════════════════════════');
  logger.error('❌ FATAL: ENABLE_DEV_TOOLS cannot be true in production.');
  logger.error('═══════════════════════════════════════════════');
  logger.error('');
  logger.error('This would expose developer seed routes and admin tools that should');
  logger.error('only be available in development environments.');
  logger.error('');
  logger.error('To fix this:');
  logger.error('  1. Set ENABLE_DEV_TOOLS=false in your .env file or environment');
  logger.error('  2. Restart the application');
  logger.error('');
  logger.error('The application cannot start in production with dev tools enabled.');
  logger.error('═══════════════════════════════════════════════');
  process.exit(1);
}

// Central enableDevTools flag - only enable dev routes when explicitly set to 'true'
const enableDevTools = process.env.ENABLE_DEV_TOOLS === 'true';

// 🔒 SECURITY: Additional runtime check to prevent dev seed routes in production
// This provides defense in depth alongside the earlier startup validation
if (enableDevTools && IS_PRODUCTION) {
  logger.error('FATAL: Dev tools (seed routes) enabled in production. Set ENABLE_DEV_TOOLS=false.');
  logger.error('Seed routes are a security risk and must not be accessible in production.');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT));

// Trust proxy - Important when behind reverse proxy (Nginx, Apache, load balancer)
// This allows Express to correctly read X-Forwarded-* headers
app.set('trust proxy', 1);

// Security headers for production
if (IS_PRODUCTION) {
  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy - Strict (Vite builds inline styles/scripts into external files)
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
    
    // Permissions Policy - Disable unnecessary browser features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Cross-Origin Policies - Prevent CORS attacks
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // Note: HSTS header should be set by reverse proxy, not here
    // The proxy terminates HTTPS, so it should control HSTS
    next();
  });
}

// Middleware
app.use(requestLogger); // Log all requests
app.use(compression()); // Compress responses (60-80% size reduction)

// CORS configuration with production-safe origin validation
const allowedOrigins = getAllowedOrigins();
const corsOrigin = Array.isArray(allowedOrigins) 
  ? (allowedOrigins.length === 1 && allowedOrigins[0] === '*' 
      ? '*' 
      : corsOriginCallback)
  : corsOriginCallback;

app.use(cors({
  origin: corsOrigin,
  credentials: false, // Disabled - we use JWT in Authorization header, not cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: MAX_JSON_PAYLOAD_SIZE })); // Limit payload size for security
app.use(validateBodySize); // Explicit validation with clear error messages

// Note: Public rate limiter removed - using tiered rate limiters (authLimiter, writeLimiter, readLimiter) instead

// Health check endpoint (lightweight, unauthenticated - for Docker HEALTHCHECK only)
app.use('/api', healthRoutes);

// API Routes - Clean structure with /admin, /public, /auth prefixes
// Rate limiters are applied at route group level for better control

// Auth routes (login, password reset, magic links) - strict auth rate limiting
// /api/auth/me uses readLimiter (frequent status checks shouldn't hit auth limits)
// All other auth routes use authLimiter
app.use('/api/auth', (req, res, next) => {
  // Apply readLimiter for /me endpoint (frequent auth status checks)
  // When mounted at /api/auth, req.path is relative: '/me' not '/api/auth/me'
  if (req.path === '/me') {
    return readLimiter(req, res, next);
  }
  // Apply authLimiter for all other auth endpoints
  return authLimiter(req, res, next);
}, authRoutes);

// Magic link pick submission (uses magic link token, not admin token) - auth rate limiting
// These endpoints validate magic links and exchange them for JWTs
app.use('/api/picks', authLimiter, picksRoutes);

// Public read routes (no authentication required) - relaxed read rate limiting
app.use('/api/public/config', readLimiter, configRoutes);
app.use('/api/public/seasons', readLimiter, seasonsRoutes);
app.use('/api/public/leaderboard', readLimiter, leaderboardRoutes);
app.use('/api/public/settings', readLimiter, settingsRoutes);

// API Documentation - read rate limiting (requires admin auth in production)
app.use('/api/docs', readLimiter, apiDocsRoutes);

// Admin write routes (require admin authentication) - moderate write rate limiting
app.use('/api/admin/admins', writeLimiter, adminsRoutes);
app.use('/api/admin/users', writeLimiter, usersRoutes);
app.use('/api/admin/seasons', writeLimiter, seasonsRoutes);
app.use('/api/admin/season-participants', writeLimiter, seasonParticipantsRoutes);
app.use('/api/admin/rounds', writeLimiter, roundsRoutes);
app.use('/api/admin/picks', writeLimiter, adminPicksRoutes);
app.use('/api/admin/leaderboard', writeLimiter, leaderboardRoutes);
app.use('/api/admin/test-email', writeLimiter, testEmailRoutes);
app.use('/api/admin/settings', writeLimiter, settingsRoutes);
app.use('/api/admin/historical-champions', writeLimiter, historicalChampionsRoutes);

// Seed routes - Only enabled when ENABLE_DEV_TOOLS=true
// Routes are protected by admin authentication
if (enableDevTools) {
  app.use('/api/admin/seed', adminSeedRoutes);
  logger.info('✅ Dev seed routes enabled (ENABLE_DEV_TOOLS=true)');
} else {
  logger.info('🔒 Dev seed routes disabled (ENABLE_DEV_TOOLS not set or false)');
}

// Serve frontend static files in production, or in development if dist folder exists
// This allows Docker/local deployments to work in both modes
const frontendPath = path.join(__dirname, '../../frontend/dist');
const frontendExists = fs.existsSync(frontendPath);

logger.info('Frontend serving configuration', {
  isProduction: IS_PRODUCTION,
  frontendPath,
  frontendExists,
  nodeEnv: NODE_ENV
});

if (IS_PRODUCTION || frontendExists) {
  if (!frontendExists) {
    logger.warn('Frontend dist folder not found, but serving in production mode', { frontendPath });
  }
  
  // Serve static assets (JS, CSS, images, etc.) but NOT index.html
  app.use(express.static(frontendPath, { index: false }));
  
  // SPA fallback - dynamically render index.html with correct meta tags
  // This ensures social media scrapers and link previews get the right info
  app.get('*', async (req, res) => {
    try {
      const { renderHtmlWithMeta } = await import('./utils/htmlRenderer');
      const html = await renderHtmlWithMeta(frontendPath);
      
      // Disable caching for dynamically rendered HTML
      // This ensures updated meta tags are always served fresh
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(html);
    } catch (error) {
      logger.error('Error rendering HTML', { error, frontendPath });
      // Fallback to static file on error
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        logger.error('Frontend index.html not found', { indexPath });
        res.status(503).send('Frontend not available. Please build the frontend or start the dev server.');
      }
    }
  });
} else if (IS_DEVELOPMENT) {
  // In development without dist folder, provide helpful message
  logger.warn('Frontend dist folder not found in development', { frontendPath });
  app.get('/', (req, res) => {
    res.status(503).send(`
      <html>
        <head><title>Frontend Not Available</title></head>
        <body>
          <h1>Frontend Development Server Required</h1>
          <p>In development mode, the frontend should be served by the Vite dev server.</p>
          <p>Please start the frontend dev server: <code>cd frontend && npm run dev</code></p>
          <p>Or build the frontend: <code>cd frontend && npm run build</code></p>
          <p>Expected path: ${frontendPath}</p>
        </body>
      </html>
    `);
  });
}

// Error handling - always return generic messages to clients
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).adminId ?? null,
  });
  // Always return generic error message to prevent information leakage
  res.status(500).json({ error: 'Server error' });
});

// Async startup with validation
async function startServer() {
  try {
    // Validate database connection before starting server
    await validateDatabaseConnection();
    
    // Run database migrations
    logger.info('🔄 Running database migrations...');
    await migrationRunner.runAll(allMigrations);
    logger.info('✅ Database migrations completed');
    
    // Verify SMTP connection (non-blocking)
    logger.info('📧 Verifying SMTP configuration...');
    try {
      await verifySmtpConnection();
      logger.info('✅ SMTP connection verified successfully');
    } catch (error: any) {
      logger.warn('⚠️ SMTP verification failed - email functionality may not work', { error: error.message });
    }
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info('🏆 Go Make Your Picks API Server');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`📡 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info('═══════════════════════════════════════════════');
      
      // Start the reminder scheduler
      logger.info('⏰ Starting reminder scheduler...');
      startReminderScheduler();
      
      logger.info('✨ Server ready to accept requests!');
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('💥 Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
