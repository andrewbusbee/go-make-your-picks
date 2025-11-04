# FULL PRODUCTION SECURITY AUDIT REPORT

**Date:** January 2025  
**Application:** Go Make Your Picks  
**Auditor:** Senior Application Security Engineer  
**Status:** Pre-Production Security Review

---

## Executive Summary

This comprehensive security audit was performed on the Go Make Your Picks application before production deployment. The audit covers authentication, authorization, input validation, API security, secrets management, Docker security, and deployment configuration.

**Overall Assessment:** The application demonstrates strong security fundamentals with proper use of parameterized queries, JWT authentication, rate limiting, and input validation. However, **several critical issues must be addressed before production deployment**, including development seed routes that should be disabled and a database schema exposure endpoint.

**Security Posture:** GOOD (with critical fixes required)

---

## 1. ATTACK SURFACE MAPPING

### Public Endpoints (No Authentication Required)

1. `GET /api/health` - Health check endpoint (includes DB/SMTP status)
2. `GET /api/public/config` - Public configuration endpoint
3. `GET /api/public/seasons` - Season listing
4. `GET /api/public/leaderboard` - Leaderboard data
5. `GET /api/public/settings` - Public settings
6. `GET /api/docs` - API documentation (Swagger)
7. `POST /api/auth/request-login` - Login flow initiation
8. `POST /api/auth/send-magic-link` - Admin magic link request
9. `POST /api/auth/login` - Main admin login (password-based)
10. `POST /api/auth/verify-magic-link` - Magic link verification
11. `POST /api/auth/forgot-password` - Password reset request
12. `POST /api/auth/reset-password` - Password reset with token
13. `GET /api/picks/validate/:token` - Magic link validation (public)
14. `POST /api/picks/:token` - Pick submission via magic link

### Admin-Protected Endpoints

All `/api/admin/*` routes require `authenticateAdmin` middleware. Critical admin routes include:
- `/api/admin/admins` - Admin management
- `/api/admin/users` - User management
- `/api/admin/seasons` - Season management
- `/api/admin/rounds` - Round/sport management
- `/api/admin/picks` - Pick management
- `/api/admin/seed/*` - **DEV ROUTES (SHOULD BE DISABLED IN PROD)**
- `/api/admin/db-health/schema` - **EXPOSES FULL DATABASE SCHEMA**
- `/api/admin/test-email` - Email testing endpoint
- `/api/admin/settings` - Settings management

---

## 2. CRITICAL SECURITY ISSUES (HIGH RISK)

### 🔴 HIGH RISK: Development Seed Routes Enabled in Production

**Location:** `backend/src/routes/admin-seed.ts`, `backend/src/index.ts:202`

**Issue:**
Development seed data routes are loaded and accessible even when `ENABLE_DEV_TOOLS=false`. While the route is protected by admin authentication, the endpoint still exists:
- `POST /api/admin/seed/seed-test-data` - Creates sample data
- `POST /api/admin/seed/clear-test-data` - Deletes sample data
- `GET /api/admin/seed/check-sample-data` - Checks for sample data

**Risk:**
- Accidental data corruption in production
- Test data contamination in production database
- Potential abuse if admin credentials are compromised
- Violates principle of least privilege

**Evidence:**
```typescript
// backend/src/index.ts:200-202
// ⚠️ Seed routes - Only shown in UI when ENABLE_DEV_TOOLS=true ⚠️
// Routes are protected by admin authentication
app.use('/api/admin/seed', adminSeedRoutes);
```

**Recommendation:**
```typescript
// Conditionally load routes based on environment
if (process.env.ENABLE_DEV_TOOLS === 'true' && process.env.NODE_ENV !== 'production') {
  app.use('/api/admin/seed', adminSeedRoutes);
}
```

**Risk Level:** 🔴 **HIGH**

---

### 🔴 HIGH RISK: Database Schema Exposure Endpoint

**Location:** `backend/src/routes/db-health.ts:27-95`

**Issue:**
Admin endpoint `/api/admin/db-health/schema` exposes complete database schema including:
- All table names and structures
- Column names, types, and constraints
- Foreign key relationships
- Indexes and constraints
- Table row counts

**Risk:**
- Information disclosure aids attackers in crafting targeted SQL injection attacks
- Reveals database structure and relationships
- Exposes internal data model

**Evidence:**
```typescript
// backend/src/routes/db-health.ts:27-95
router.get('/schema', authenticateAdmin, async (req: Request, res: Response) => {
  // Returns full schema from INFORMATION_SCHEMA
  // Including tables, columns, constraints, indexes, foreign keys
});
```

**Recommendation:**
- Remove endpoint entirely if not needed
- Or restrict to minimal health information only
- Add rate limiting if kept
- Consider requiring main admin (`requireMainAdmin`)
- Add IP whitelist if needed for debugging

**Risk Level:** 🔴 **HIGH**

---

## 3. MEDIUM RISK SECURITY ISSUES

### 🟡 MEDIUM RISK: SQL Injection Risk via Dynamic Placeholder Construction

**Location:** `backend/src/utils/teamHelpers.ts:132`

**Issue:**
Dynamic placeholder construction for `IN` clause could theoretically be vulnerable if input validation is bypassed:
```typescript
const placeholders = normalizedNames.map(() => '?').join(',');
const [teams] = await connection.query<RowDataPacket[]>(
  `SELECT id, LOWER(name) as lower_name FROM teams_v2 WHERE LOWER(name) IN (${placeholders})`,
  normalizedNames
);
```

**Risk:**
- If `normalizedNames` array is ever manipulated, this could be vulnerable
- Currently mitigated by input validation in callers
- Array length limits provide additional protection
- Parameterized queries via mysql2 provide protection

**Recommendation:**
Add explicit length validation:
```typescript
if (normalizedNames.length > 1000) {
  throw new Error('Too many team names requested');
}
```

**Risk Level:** 🟡 **MEDIUM** (Low exploitation likelihood due to validation, but worth hardening)

---

### 🟡 MEDIUM RISK: Multiple Statements Enabled in Database Pool

**Location:** `backend/src/config/database.ts:20`

**Issue:**
```typescript
multipleStatements: true // Required for MariaDB to execute multiple SQL statements
```

**Risk:**
- If SQL injection exists anywhere, this enables batch attacks
- Example: `'; DROP TABLE users; --` could execute multiple statements
- Only needed for migrations/initialization scripts

**Recommendation:**
- Disable `multipleStatements: false` for main application pool
- Use separate connection pool for migrations/init scripts
- Keep main pool secure

**Risk Level:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM RISK: Error Message Information Leakage

**Location:** Multiple route files

**Issue:**
Some endpoints return detailed error messages that could leak information:
- Database errors may expose schema details
- File paths in error messages
- Internal logic details

**Examples:**
```typescript
// backend/src/routes/picks.ts:386
res.status(500).json({ error: error.message || 'Server error' });

// backend/src/routes/admin-seed.ts:449
details: process.env.NODE_ENV === 'development' ? error.message : 'Check server logs for details'
```

**Recommendation:**
Standardize error responses:
```typescript
// Production: Generic messages only
res.status(500).json({ error: 'Server error' });

// Log detailed errors server-side
logger.error('Operation failed', { error, userId, details: error.message });
```

**Risk Level:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM RISK: Magic Link Tokens in URL

**Location:** `backend/src/routes/auth.ts:114`, `backend/src/routes/picks.ts:18`

**Issue:**
Magic link tokens appear in URLs:
- `/admin/login?token=...`
- `/pick/:token`

**Risk:**
- Tokens logged in browser history
- Server access logs
- Proxy/load balancer logs
- Referrer headers (if navigating to external sites)

**Recommendation:**
- Use POST body for token validation instead of URL params
- Or implement token exchange: short-lived token in URL → exchange for session token
- Add `Referrer-Policy: no-referrer` (already present in CSP)

**Risk Level:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM RISK: Missing Validation Middleware on Some Admin Endpoints

**Location:** `backend/src/routes/users.ts:64-100`

**Issue:**
User creation/update endpoints have manual validation instead of `validateRequest` middleware:
```typescript
// Current: manual checks
if (!name) {
  return res.status(400).json({ error: 'Name is required' });
}
```

**Recommendation:**
Use `validateRequest` middleware consistently:
```typescript
const createUserValidators = [
  body('name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail(),
];

router.post('/', authenticateAdmin, validateRequest(createUserValidators), async (req, res) => {
  // Handler
});
```

**Risk Level:** 🟡 **MEDIUM** (Validation exists but inconsistent)

---

### 🟡 MEDIUM RISK: Health Check Endpoint Information Disclosure

**Location:** `backend/src/index.ts:139-168`

**Issue:**
`/api/health` endpoint exposes:
- Database connection status
- SMTP connection status
- Environment (development/production)
- Uptime

**Risk:**
- Information disclosure about infrastructure
- Environment detection

**Recommendation:**
- Return minimal status (healthy/unhealthy)
- Remove environment and uptime in production
- Or make it admin-only

**Risk Level:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM RISK: .env File Management

**Location:** `.dockerignore:3`

**Issue:**
`.env` file is in `.dockerignore`, but need to ensure it's never committed.

**Recommendation:**
- Verify `.gitignore` includes `.env`
- Add pre-commit hook to prevent committing secrets
- Consider using secrets management service (Docker secrets, AWS Secrets Manager, etc.)

**Risk Level:** 🟡 **MEDIUM** (if `.env` is accidentally committed)

---

## 4. LOW RISK SECURITY ISSUES

### 🟢 LOW RISK: JWT Token Expiry

**Location:** `backend/src/config/constants.ts:8`

**Issue:** JWT tokens expire in 24 hours.

**Assessment:** Reasonable for a sports picks application. Consider:
- Refresh tokens for longer sessions
- Shorter expiry for sensitive operations
- Token revocation on logout

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: HTML Escaping Usage

**Location:** `backend/src/validators/authValidators.ts:37, 101`

**Issue:** `.escape()` used on name fields, which may be unnecessary if:
- Data is stored as plain text
- Rendered via React (auto-escaping)

**Assessment:** Not a security issue, but may double-escape. Consider removing `.escape()` if React handles it.

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: CORS Configuration

**Location:** `backend/src/index.ts:120-125`

**Issue:** CORS allows single origin, but `credentials: false` is correct for JWT.

**Assessment:** Acceptable. Consider:
- Validating `APP_URL` format strictly
- Using allowlist for multiple environments

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: Default Database Credentials in Code

**Location:** `backend/src/config/database.ts:10-11`

**Issue:** Fallback defaults:
```typescript
user: process.env.MARIADB_USER || 'picksuser',
password: process.env.MARIADB_PASSWORD || 'pickspass',
```

**Assessment:** Development convenience only. Production requires env vars via `envValidator.ts`. Consider removing defaults in production mode.

**Risk Level:** 🟢 **LOW** (Production requires env vars)

---

### 🟢 LOW RISK: Missing .dockerignore Coverage

**Location:** `.dockerignore`

**Issue:** Some files may be included unnecessarily.

**Recommendation:** Review to ensure no source files or secrets are copied.

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: Database Connection Pool Settings

**Location:** `backend/src/config/database.ts:13-14`

**Issue:** `connectionLimit: 20` and `queueLimit: 100` may need tuning for production.

**Recommendation:** Monitor and tune based on load.

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: Missing Security Headers in Development

**Location:** `backend/src/index.ts:75`

**Issue:** Security headers only applied when `NODE_ENV === 'production'`.

**Assessment:** Acceptable for development, but ensure production is set correctly.

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: Rate Limit Configuration

**Location:** `backend/src/config/constants.ts:53-54`

**Issue:** Public rate limit: 100 requests per minute may be too high for some endpoints.

**Recommendation:** Consider tiered limits:
- Public read endpoints: 100/min
- Public write endpoints: 10/min
- Admin endpoints: 30/min

**Risk Level:** 🟢 **LOW**

---

### 🟢 LOW RISK: No Log Aggregation

**Issue:** Logs go to console only (Docker-friendly) but no centralized aggregation.

**Recommendation:**
- Use Docker logging drivers
- Integrate with logging service (ELK, Datadog, CloudWatch)
- Set up alerts for security events (failed logins, etc.)

**Risk Level:** 🟢 **LOW** (Operational, not a security flaw)

---

## 5. AUTHENTICATION & AUTHORIZATION REVIEW

### ✅ Strengths

1. **JWT Authentication** - Properly implemented with secret validation
2. **Password Hashing** - bcrypt with 12 rounds (strong)
3. **Account Lockout** - Locks after 10 failed attempts for 1 hour
4. **Rate Limiting** - Implemented on all login endpoints
5. **Token Verification** - Admin verification on token validation (checks DB)
6. **Main Admin Protection** - Distinction between main admin and secondary admins
7. **Magic Link Security** - Tokens are single-use and expire (10 minutes)

### ⚠️ Issues Found

See "Magic Link Tokens in URL" under Medium Risk issues above.

---

## 6. INPUT VALIDATION & OUTPUT ENCODING

### ✅ Strengths

1. **express-validator** - Used consistently throughout application
2. **Input Sanitization** - `textSanitizer.ts` strips HTML tags
3. **Length Limits** - Enforced on all inputs
4. **Email Validation** - Format validation
5. **Password Requirements** - Complexity requirements enforced

### ⚠️ Issues Found

See "Missing Validation Middleware" under Medium Risk issues above.

---

## 7. API SECURITY & DATA LEAKS

### ✅ Strengths

1. **CORS Configuration** - Single origin allowed
2. **Rate Limiting** - Public endpoints rate-limited
3. **Request Size Limits** - 1MB limit enforced
4. **Security Headers** - Comprehensive headers in production
5. **Email Redaction** - Email addresses redacted in logs

### ⚠️ Issues Found

See "Health Check Endpoint Information Disclosure" under Medium Risk issues above.

---

## 8. SECRETS MANAGEMENT

### ✅ Strengths

1. **No Hardcoded Secrets** - All secrets in environment variables
2. **Environment Validation** - `envValidator.ts` validates required vars
3. **JWT_SECRET Validation** - Minimum length and default value checks
4. **Startup Validation** - Application won't start with weak secrets

### ⚠️ Issues Found

See ".env File Management" under Medium Risk issues above.

---

## 9. DOCKER & DEPLOYMENT SECURITY

### ✅ Strengths

1. **Multi-Stage Build** - Reduces image size
2. **Non-Root User** - Runs as `nodejs:1001`
3. **Minimal Base Image** - `node:24-alpine`
4. **Build Dependencies Removed** - Clean final image
5. **Health Check** - Container health monitoring

### ⚠️ Issues Found

See ".dockerignore Coverage" under Low Risk issues above.

---

## 10. RATE LIMITING & ABUSE PROTECTION

### ✅ Strengths

1. **Login Rate Limiting** - 10 attempts per 15 minutes
2. **Password Reset Limiting** - 3 attempts per hour
3. **Magic Link Limiting** - 3 requests per hour
4. **Pick Submission Limiting** - 100 per hour
5. **Public Endpoint Limiting** - 100 requests per minute

### ⚠️ Issues Found

See "Rate Limit Configuration" under Low Risk issues above.

---

## 11. LOGGING & MONITORING

### ✅ Strengths

1. **Structured Logging** - Winston logger with levels
2. **Email Redaction** - PII protection in logs
3. **Request Logging** - All requests logged with timing
4. **Error Logging** - Appropriate log levels
5. **Stack Traces** - Only in development mode

### ⚠️ Issues Found

See "No Log Aggregation" under Low Risk issues above.

---

## 12. DEPENDENCY VULNERABILITIES

**Action Required:** Run dependency audits:
```bash
cd backend && npm audit
cd frontend && npm audit
```

**Recommendation:**
- Fix all HIGH and CRITICAL vulnerabilities
- Review MEDIUM vulnerabilities case-by-case
- Consider automated dependency updates (Dependabot, Renovate)

**Risk Level:** ⚠️ **UNKNOWN** (requires audit)

---

## 13. ADDITIONAL RECOMMENDATIONS

### Missing Security Features

1. **CSRF Protection**
   - Not needed if using JWT in Authorization header (current setup)
   - Consider for cookie-based auth if added later

2. **Security.txt File**
   - Add `/.well-known/security.txt` for responsible disclosure
   - Format: `https://example.com/.well-known/security.txt`

3. **API Versioning**
   - Consider `/api/v1/` for future changes
   - Helps with breaking changes

4. **Request ID Tracking**
   - Add correlation IDs for request tracing
   - Helps with debugging and security incident response

5. **Security Monitoring**
   - Alert on:
     - Multiple failed login attempts
     - Unusual admin activity
     - Rate limit violations
     - Error rate spikes

---

## 14. SECURITY READINESS SUMMARY

### Critical Issues (Must Fix Before Production)

1. ❌ **Disable development seed routes in production**
2. ❌ **Remove or restrict database schema exposure endpoint**
3. ❌ **Disable `multipleStatements` in database pool (or use separate pool)**
4. ❌ **Standardize error messages (no information leakage)**

### High Priority (Fix Soon)

5. ⚠️ Move magic link tokens from URL to POST body
6. ⚠️ Add validation middleware to all admin endpoints
7. ⚠️ Run dependency audit and fix vulnerabilities

### Medium Priority (Address in Next Sprint)

8. ⚠️ Reduce health check information disclosure
9. ⚠️ Harden SQL placeholder construction
10. ⚠️ Review .dockerignore coverage

### Low Priority (Nice to Have)

11. ⚠️ Implement security.txt
12. ⚠️ Add request ID tracking
13. ⚠️ Tune rate limiting configuration
14. ⚠️ Set up log aggregation

---

## 15. PRODUCTION CHECKLIST

Before deploying to production, ensure:

### Environment Configuration
- [ ] All HIGH RISK issues are fixed
- [ ] `ENABLE_DEV_TOOLS=false` in production
- [ ] `NODE_ENV=production` is set
- [ ] Strong `JWT_SECRET` (64+ characters) is set
- [ ] Database credentials are strong and unique
- [ ] SMTP credentials are configured
- [ ] `APP_URL` is set to production domain

### Security Configuration
- [ ] All environment variables validated
- [ ] Dependency vulnerabilities audited and fixed
- [ ] Security headers are working (test with securityheaders.com)
- [ ] Rate limiting is tested
- [ ] Error messages don't leak information
- [ ] Logs are being collected

### Endpoint Security
- [ ] Health check endpoint is minimal
- [ ] Database schema endpoint is removed/restricted
- [ ] Seed routes are disabled
- [ ] All admin endpoints require authentication

### Deployment
- [ ] Docker image is built and tested
- [ ] Reverse proxy (Nginx/Traefik) is configured with HTTPS
- [ ] HSTS is enabled in reverse proxy
- [ ] Database connection is encrypted (TLS)
- [ ] Backups are configured

### Monitoring
- [ ] Log aggregation is set up
- [ ] Error tracking is configured
- [ ] Security alerts are configured
- [ ] Health checks are monitored

---

## FINAL VERDICT

**Overall Security Posture:** ✅ **GOOD** (with critical fixes required)

The application demonstrates strong security fundamentals including:
- Proper use of parameterized SQL queries
- JWT authentication with secret validation
- Rate limiting on sensitive endpoints
- Input validation with express-validator
- Security headers in production
- Email redaction in logs
- Non-root user in Docker

However, **critical issues must be addressed** before production:
1. Development seed routes must be disabled
2. Database schema exposure endpoint must be removed/restricted
3. `multipleStatements` should be disabled or isolated
4. Error messages must not leak information

**Estimated Time to Production-Ready:** 4-8 hours of focused security hardening

---

## NEXT STEPS

1. **Review this report** with the development team
2. **Prioritize fixes** based on risk levels
3. **Implement fixes** for all HIGH RISK issues
4. **Run dependency audit** and fix vulnerabilities
5. **Test security fixes** thoroughly
6. **Re-audit** after fixes are implemented
7. **Deploy to production** once all critical issues are resolved

---

**Report Generated:** January 2025  
**Auditor:** Senior Application Security Engineer  
**Confidentiality:** This report contains sensitive security information and should be handled accordingly.

