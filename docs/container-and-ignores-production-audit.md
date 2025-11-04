### Container and Ignore Files Production Audit

Suggested filename: `docs/container-and-ignores-production-audit.md`

### 1) SUMMARY
- **Verdict**: Mostly production-ready with a good multi-stage build and minimal runtime image. A few important issues to address.
- **Strengths**:
  - Multi-stage build that copies only built artifacts into the final image.
  - Production-only dependencies installed in final image.
  - Runs as a non-root user.
  - Compose sets `NODE_ENV=production`.
- **Issues**:
  - Sensitive secrets are committed in `docker-compose.override.yml` (critical).
  - No explicit `ENV NODE_ENV=production` in Dockerfile.
  - No `HEALTHCHECK` for the app container.
  - `backend/database` is copied into the final image though likely not needed at runtime.
  - `.dockerignore` appears overly broad in places and may unintentionally exclude lockfiles or build config.

### 2) DOCKERFILE FINDINGS
- **File**: `Dockerfile`
- **Build structure**:
  - Multi-stage: Yes (`backend-builder`, `frontend-builder`, final runtime stage).
  - Clear separation: Yes. Build stages install dev tooling and compile; final stage copies only dist and installs prod deps.
- **NODE_ENV**: Not set in Dockerfile; set in compose for production.
- **What ends up in final image**:
  - Backend: `backend/dist`, `backend/package*.json`, prod `node_modules` (installed in final stage), and `backend/database` (copied from context).
  - Frontend: `frontend/dist`.
  - No source `.ts` files or dev tooling in final image.
- **Potential unnecessary items**:
  - `backend/database` likely not needed at runtime; consider excluding from final image unless runtime code reads these files.
- **Runtime**:
  - Non-root user: Yes.
  - CMD: `node dist/index.js` defined.
  - `HEALTHCHECK`: Not present.
  - Logging: Node defaults to stdout/stderr; ensure Winston (if used) logs to console in containers.

Key excerpts:
```
# Build stage for backend
FROM node:24-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build

# Build stage for frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:24-alpine
...
# Copy backend (only dist and necessary files)
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY backend/database ./backend/database
# Copy frontend build (only dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
...
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
```

### 3) .DOCKERIGNORE FINDINGS
- **File**: `.dockerignore`
- **Strengths**:
  - Excludes VCS, logs, `node_modules` in root and subprojects, test artifacts, docs, examples, IDE junk, etc.
  - Excludes Docker build metadata files so they aren’t sent to the daemon.
- **Risks/gaps**:
  - Excluding `package-lock.json` and `yarn.lock` globally can break reproducible `npm ci` and may cause errors (npm ci requires a lockfile). Allow lockfiles for backend/frontend builds or explicitly negate ignores (e.g., `!backend/package-lock.json`, `!frontend/package-lock.json`).
  - Excluding TypeScript and frontend configs at root may unintentionally exclude needed files under subfolders if patterns are not anchored. Scope ignores to root where intended (e.g., `/tsconfig.json`).
  - `*.md` and `docs/` excluded: fine to reduce build context.
  - `frontend/public/fonts` excluded: acceptable if all required fonts are bundled into `frontend/dist`.

### 4) .GITIGNORE FINDINGS
- **File**: `.gitignore`
- **Strengths**:
  - Comprehensive coverage: `node_modules`, dist/build, logs, IDE files, environment files, DB data, caches, coverage, temp files, etc.
  - Explicitly ignores `docker-compose.override.yml` (good).
- **Risks/gaps**:
  - Despite the ignore entry, `docker-compose.override.yml` is committed and contains real SMTP credentials, DB passwords, and a JWT secret. Immediate action recommended: remove from VCS and rotate credentials.

### 5) APP PRODUCTION BEHAVIOR
- **Compose (production)** sets environment:
```
NODE_ENV: production
PORT: 3003
```
- **Behavior**:
  - Starts app via image CMD (`node dist/index.js`).
  - Runs with `NODE_ENV=production` (via compose).
  - No dev servers or hot reload in the production Dockerfile.
  - Environment variables are provided externally; no `.env` baked into the image.
  - Logging: Node defaults to stdout/stderr; ensure any file-based transports also log to console.
- **Risks**:
  - No `HEALTHCHECK` for the app container.
  - `ENABLE_DEV_TOOLS` exists (enabled in override); confirm it defaults to disabled in production and is not set in main compose.

### 6) RECOMMENDATIONS
- **Important for production hardening**:
  - Remove `docker-compose.override.yml` from the repository and purge from git history; rotate all exposed credentials (SMTP user/password, DB passwords, JWT secret).
  - Add a `HEALTHCHECK` to the app container (Dockerfile or compose) that hits a lightweight health endpoint (e.g., `GET /healthz`).
  - Explicitly set `ENV NODE_ENV=production` in the Dockerfile final stage to enforce production defaults even outside compose.
- **Recommended**:
  - Avoid copying `backend/database` into the final image unless runtime code relies on it.
  - Consider installing prod dependencies in a builder stage and copying `node_modules` into the final stage (or keep current approach but ensure build toolchain is fully removed, which you already do).
  - Add `--chown=nodejs:nodejs` to COPY lines to avoid a separate `chown -R` layer.
- **Nice-to-have (cosmetic/size)**:
  - Use the existing `node` user provided by the base image instead of creating a custom user.
  - Pin the base image to a specific digest for reproducibility.
  - Tweak `.dockerignore`:
    - Ensure lockfiles in `backend/` and `frontend/` are included for deterministic installs.
    - Anchor config ignores to root to avoid excluding needed subproject configs.

### 7) WHAT THE FINAL IMAGE CONTAINS (CONCLUSION)
- **Backend**:
  - Compiled JS under `backend/dist`.
  - Production `node_modules` installed in the final stage.
  - `package.json` (and lockfile if included).
  - `backend/database` (likely unnecessary).
- **Frontend**:
  - Static assets under `frontend/dist`.
- **Not included**:
  - TypeScript source, dev dependencies, tests, docs. This is close to minimal and production-ready once the noted issues are addressed.

