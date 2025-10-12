import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
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
// ⚠️ TEMPORARY - ONLY LOAD IN DEVELOPMENT ⚠️
import adminSeedRoutes from './routes/admin-seed';
import { startReminderScheduler } from './services/reminderScheduler';
import { validateEnvironment, printEnvironmentSummary } from './utils/envValidator';
import { validateDatabaseConnection, getDatabaseHealth } from './utils/dbHealthCheck';
import { verifySmtpConnection } from './services/emailService';
import { runStartupValidation } from './utils/startupValidation';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import packageJson from '../package.json';
import { DEFAULT_PORT, PUBLIC_RATE_LIMIT_WINDOW_MS, PUBLIC_RATE_LIMIT_MAX, MAX_JSON_PAYLOAD_SIZE } from './config/constants';

// Load environment variables first
dotenv.config();

// Validate environment variables before doing anything else
validateEnvironment();
printEnvironmentSummary();

// Run startup validation (JWT_SECRET, etc.)
runStartupValidation();

const app = express();
const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT));

// Trust proxy - Important when behind reverse proxy (Nginx, Apache, load balancer)
// This allows Express to correctly read X-Forwarded-* headers
app.set('trust proxy', 1);

// Security headers for production
if (process.env.NODE_ENV === 'production') {
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

app.use(cors({
  origin: process.env.APP_URL || `http://localhost:${process.env.PORT || 3003}`,
  credentials: false, // Disabled - we use JWT in Authorization header, not cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: MAX_JSON_PAYLOAD_SIZE })); // Limit payload size for security

// Rate limiter for public endpoints
const publicLimiter = rateLimit({
  windowMs: PUBLIC_RATE_LIMIT_WINDOW_MS,
  max: PUBLIC_RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const dbHealth = await getDatabaseHealth();
  
  // Check SMTP connection if configured
  let emailHealth: any = { status: 'not_configured' };
  if (process.env.SMTP_HOST) {
    const smtpCheck = await verifySmtpConnection();
    emailHealth = {
      status: smtpCheck.connected ? 'connected' : 'error',
      error: smtpCheck.error
    };
  }
  
  const health = {
    status: dbHealth.status === 'healthy' && (emailHealth.status === 'connected' || emailHealth.status === 'not_configured') 
      ? 'healthy' 
      : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: packageJson.version,
    services: {
      database: dbHealth,
      email: emailHealth
    }
  };
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API Routes - Clean structure with /admin, /public, /auth prefixes

// Auth routes (login, password reset, etc.)
app.use('/api/auth', authRoutes);

// Public routes (no authentication required) - with rate limiting
app.use('/api/public/config', publicLimiter, configRoutes);
app.use('/api/public/seasons', publicLimiter, seasonsRoutes);
app.use('/api/public/leaderboard', publicLimiter, leaderboardRoutes);
app.use('/api/public/settings', publicLimiter, settingsRoutes);

// Magic link pick submission (uses magic link token, not admin token)
app.use('/api/picks', picksRoutes);

// Admin routes (require admin authentication)
app.use('/api/admin/admins', adminsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/seasons', seasonsRoutes);
app.use('/api/admin/season-participants', seasonParticipantsRoutes);
app.use('/api/admin/rounds', roundsRoutes);
app.use('/api/admin/picks', adminPicksRoutes);
app.use('/api/admin/leaderboard', leaderboardRoutes);
app.use('/api/admin/test-email', testEmailRoutes);
app.use('/api/admin/settings', settingsRoutes);

// ⚠️ Seed routes - Only shown in UI when ENABLE_DEV_TOOLS=true ⚠️
// Routes are protected by admin authentication
app.use('/api/admin/seed', adminSeedRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  
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
      logger.error('Error rendering HTML', { error });
      // Fallback to static file on error
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Async startup with validation
async function startServer() {
  try {
    // Validate database connection before starting server
    await validateDatabaseConnection();
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info('🏆 Go Make Your Picks API Server');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`📡 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
      logger.info('═══════════════════════════════════════════════');
      
      // Start the reminder scheduler
      startReminderScheduler();
      
      logger.info('✨ Server ready to accept requests!');
    });
  } catch (error) {
    logger.error('💥 Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
