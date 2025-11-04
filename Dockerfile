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
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="Go Make Your Picks"
LABEL org.opencontainers.image.description="Self-hosted sports picks app"
LABEL org.opencontainers.image.url="https://github.com/andrewbusbee/go-make-your-picks"
LABEL org.opencontainers.image.source="https://github.com/andrewbusbee/go-make-your-picks"
LABEL org.opencontainers.image.authors="Andrew Busbee <andrew@andrewbusbee.com>"
LABEL org.opencontainers.image.licenses="MIT"

# Install build dependencies for native modules (like bcrypt) in one layer
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy backend (only dist and necessary files)
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY backend/database ./backend/database

# Copy frontend build (only dist)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy LICENSE file
COPY LICENSE /app/LICENSE

# Install only production dependencies for backend
WORKDIR /app/backend
RUN npm ci --omit=dev --no-audit --no-fund

# Clean up build dependencies and npm cache to reduce image size
WORKDIR /app
RUN apk del python3 make g++ && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership of app directory to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3003/api/health || exit 1

# Backend serves the frontend in production
WORKDIR /app/backend

CMD ["node", "dist/index.js"]
