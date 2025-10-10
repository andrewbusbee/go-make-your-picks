# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY backend/database ./backend/database

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install only production dependencies for backend
WORKDIR /app/backend
RUN npm ci --omit=dev

# Clean up build dependencies to reduce image size
RUN apk del python3 make g++

# Install a simple static file server for frontend
WORKDIR /app
RUN npm install -g concurrently

# Expose port
EXPOSE 3003

# Backend serves the frontend in production
WORKDIR /app/backend

CMD ["node", "dist/index.js"]
