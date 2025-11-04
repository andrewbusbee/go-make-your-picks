### Production Hardening Changes

Date: 2025-11-04

#### Files Modified
- `Dockerfile`
- `.dockerignore`

#### 1) Set production mode in final image
- Added `ENV NODE_ENV=production` in the final runtime stage of `Dockerfile` to ensure production behavior even outside compose.

Snippet:
```Dockerfile
FROM node:24-alpine
ENV NODE_ENV=production
```

#### 2) Added container health check
- Added a `HEALTHCHECK` hitting the existing unauthenticated endpoint `GET /api/health` on port 3003.

Snippet:
```Dockerfile
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3003/api/health || exit 1
```

Notes:
- The health endpoint already exists in `backend/src/index.ts` and returns 200 when healthy.

#### 3) Ensure lockfiles are included for reproducible builds
- Adjusted `.dockerignore` so backend/frontend lockfiles are included in the Docker build context while keeping other lockfiles ignored by default.

Changes:
```diff
# Package lock files (allow subproject lockfiles for reproducible builds)
 package-lock.json
 yarn.lock
 !backend/package-lock.json
 !frontend/package-lock.json
```

#### 4) Kept `backend/database` in final image (required at runtime)
- Analysis found runtime code reads `backend/database/init.sql` during startup initialization:
  - `backend/src/utils/dbHealthCheck.ts` uses `path.join(__dirname, '../../database/init.sql')`.
- Therefore, the line copying `backend/database` into the final image was retained.

Relevant reference:
```ts
// backend/src/utils/dbHealthCheck.ts
const initSqlPath = path.join(__dirname, '../../database/init.sql');
```

#### Result
- The final image now enforces production mode and exposes an active health check.
- Docker builds remain reproducible due to included subproject lockfiles.
- No unrelated refactors or behavioral changes were introduced.

