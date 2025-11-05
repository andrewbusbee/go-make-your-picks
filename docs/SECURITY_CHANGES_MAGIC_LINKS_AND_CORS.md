# Security Hardening Changes

**Date:** January 2025  
**Purpose:** Production security hardening based on security audit findings

---

## Overview

This document describes the security hardening changes implemented to address critical and high-priority security issues identified in the production security audit.

---

## Critical Changes (C-1, H-4)

### 1. Database Password Security (C-1)

**Issue:** Default database password fallback (`'pickspass'`) was a security risk if environment variable was not set.

**Changes:**
- **`backend/src/config/database.ts`**: Removed default password fallback
- **`backend/src/utils/startupValidation.ts`**: Added `validateDatabasePassword()` function
  - In **production**: Fails startup if `MARIADB_PASSWORD` is not set or is a default value
  - In **development/test**: Allows fallback with warning for local development
  - Validates against dangerous default passwords (pickspass, password, root, admin, etc.)

**Impact:**
- **Breaking Change:** Production deployments **MUST** set `MARIADB_PASSWORD` environment variable
- Application will not start in production without a valid database password
- Prevents accidental deployment with default credentials

**Migration:**
- Ensure `MARIADB_PASSWORD` is set in production `.env` file or environment
- Verify password is strong and unique (not a default value)

---

### 2. CORS Configuration Enforcement (H-4)

**Issue:** CORS could fall back to wildcard (`*`) in production if `ALLOWED_ORIGINS` or `APP_URL` were not configured.

**Changes:**
- **`backend/src/utils/corsConfig.ts`**: Removed wildcard fallback in production
  - Throws error if no origins configured (fail-safe)
- **`backend/src/utils/startupValidation.ts`**: Added `validateCorsConfiguration()` function
  - In **production**: Fails startup if neither `ALLOWED_ORIGINS` nor `APP_URL` is set
  - Validates that `ALLOWED_ORIGINS` contains at least one valid origin if set
  - In **development**: Allows localhost origins for flexibility

**Impact:**
- **Breaking Change:** Production deployments **MUST** set either `ALLOWED_ORIGINS` or `APP_URL`
- Prevents CSRF attacks by ensuring only trusted origins can make requests
- Application will not start in production without explicit CORS configuration

**Migration:**
- Set `APP_URL` in production (e.g., `APP_URL=https://yourdomain.com`)
- OR set `ALLOWED_ORIGINS` with comma-separated list (e.g., `ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com`)

---

## High Priority Changes (H-1, H-2, H-3, H-5)

### 3. Admin Magic Link Token Hashing (H-1)

**Issue:** Admin magic link tokens were stored as plain text in the database, exposing them if the database was compromised.

**Changes:**
- **`backend/src/routes/auth.ts`**: 
  - Admin magic link tokens are now hashed before storage (using `hashMagicLinkToken()`)
  - Validation compares hashed incoming token against stored hash
  - Supports legacy plain-text tokens for backward compatibility during migration

**Impact:**
- **Security Improvement:** Admin magic links are now as secure as user magic links
- **Backward Compatible:** Existing plain-text tokens in database will still work (legacy support)
- Tokens are no longer exposed if database is compromised

**Migration:**
- No migration required - new tokens are automatically hashed
- Legacy plain-text tokens will continue to work until they expire
- Consider running a cleanup script to hash existing tokens if desired (optional)

---

### 4. Magic Link Token in POST Body (H-2)

**Issue:** Magic link tokens in URL paths (`GET /api/picks/validate/:token`) can be exposed in browser history, server logs, and referrer headers.

**Changes:**
- **`backend/src/routes/picks.ts`**: 
  - Added new `POST /api/picks/validate` endpoint that accepts token in request body
  - GET endpoint marked as `@deprecated` but kept for backward compatibility
  - Shared validation logic extracted to `validateMagicLinkToken()` function
  - Added validation for POST endpoint (token must be non-empty string)

**Impact:**
- **New Endpoint:** `POST /api/picks/validate` with body `{ "token": "<token>" }`
- **Backward Compatible:** GET endpoint still works but is deprecated
- **Security Improvement:** Tokens in POST body are not exposed in URLs/logs/referrers

**Migration:**
- Frontend should migrate to POST endpoint: `POST /api/picks/validate` with JSON body
- GET endpoint will continue to work but should be phased out
- No breaking changes - existing links will continue to work

---

### 5. Admin Magic Link Cleanup (H-3)

**Issue:** Expired admin magic links were not automatically cleaned up from the database.

**Changes:**
- **`backend/src/services/reminderScheduler.ts`**: 
  - Added `cleanupExpiredAdminMagicLinks()` function
  - Runs daily at 3:00 AM (same schedule as login attempts cleanup)
  - Deletes admin magic links where `expires_at <= NOW()`

**Impact:**
- **Automatic Cleanup:** Expired admin magic links are automatically removed
- **No Breaking Changes:** Cleanup is automatic and transparent
- Improves database hygiene and prevents accumulation of expired tokens

**Migration:**
- No migration required - cleanup runs automatically
- First cleanup will run on next scheduled execution (3:00 AM)

---

### 6. API Documentation Protection (H-5)

**Status:** Already implemented correctly

**Current Implementation:**
- **`backend/src/routes/api-docs.ts`**: 
  - API docs (`/api/docs`) require admin authentication in production
  - Publicly accessible in development mode for easier API exploration
  - JSON spec endpoint (`/api/docs/json`) also protected in production

**Impact:**
- **No Changes Required:** Protection is already in place
- API documentation is properly secured in production
- Development access remains convenient for local development

---

## Files Changed

### Backend Files Modified:
1. `backend/src/config/database.ts` - Removed default password fallback
2. `backend/src/utils/startupValidation.ts` - Added DB password and CORS validation
3. `backend/src/utils/corsConfig.ts` - Removed wildcard fallback in production
4. `backend/src/routes/auth.ts` - Hash admin magic link tokens
5. `backend/src/routes/picks.ts` - Added POST endpoint for magic link validation
6. `backend/src/services/reminderScheduler.ts` - Added admin magic link cleanup

### New Endpoints:
- `POST /api/picks/validate` - Validate magic link token (preferred method)
  - Body: `{ "token": "<magicLinkToken>" }`
  - Returns: Same response format as GET endpoint

### Deprecated Endpoints:
- `GET /api/picks/validate/:token` - Still works but deprecated
  - Use POST endpoint instead for better security

---

## Environment Variables Required

### Production (Required):
- `MARIADB_PASSWORD` - Database password (must be set, no default)
- `ALLOWED_ORIGINS` OR `APP_URL` - At least one must be set for CORS

### All Environments:
- `JWT_SECRET` - Already required (no changes)

---

## Breaking Changes

1. **Database Password (C-1)**
   - Production deployments **MUST** set `MARIADB_PASSWORD`
   - Application will not start without it

2. **CORS Configuration (H-4)**
   - Production deployments **MUST** set `APP_URL` or `ALLOWED_ORIGINS`
   - Application will not start without CORS configuration

---

## Non-Breaking Changes

All other changes are backward compatible:
- Admin magic link hashing (supports legacy tokens)
- POST magic link endpoint (GET still works)
- Admin magic link cleanup (automatic, transparent)
- API docs protection (already implemented)

---

## Testing Recommendations

1. **Startup Validation:**
   - Test that production mode fails without `MARIADB_PASSWORD`
   - Test that production mode fails without CORS configuration
   - Test that development mode allows fallbacks with warnings

2. **Admin Magic Links:**
   - Test creating new admin magic link (should be hashed)
   - Test validating admin magic link (should work with hashed tokens)
   - Test legacy plain-text tokens still work (if any exist)

3. **Magic Link Validation:**
   - Test GET endpoint still works (backward compatibility)
   - Test new POST endpoint works correctly
   - Test validation errors return appropriate status codes

4. **Cleanup Job:**
   - Verify expired admin magic links are cleaned up
   - Check logs for cleanup confirmation messages

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `MARIADB_PASSWORD` environment variable (strong, unique password)
- [ ] Set `APP_URL` or `ALLOWED_ORIGINS` environment variable
- [ ] Verify `JWT_SECRET` is set (already required)
- [ ] Test startup validation fails gracefully with missing config
- [ ] Test admin magic link creation and validation
- [ ] Test POST magic link validation endpoint
- [ ] Verify cleanup job runs (check logs after 3:00 AM)
- [ ] Monitor logs for any security warnings

---

## Rollback Plan

If issues are encountered:

1. **Database Password:** 
   - Revert `backend/src/config/database.ts` to use default fallback (NOT RECOMMENDED)
   - Or set `MARIADB_PASSWORD` environment variable

2. **CORS Configuration:**
   - Revert `backend/src/utils/corsConfig.ts` to allow wildcard (NOT RECOMMENDED)
   - Or set `APP_URL` or `ALLOWED_ORIGINS` environment variable

3. **Admin Magic Links:**
   - No rollback needed - legacy tokens still work
   - New tokens will be hashed, old tokens remain functional

4. **POST Endpoint:**
   - No rollback needed - GET endpoint still works
   - Frontend can continue using GET if needed

---

## Additional Notes

- All changes maintain backward compatibility where possible
- Security improvements are transparent to end users
- Only environment configuration changes are required for deployment
- No database migrations required
- No frontend changes required (optional: migrate to POST endpoint)

---

**End of Document**

