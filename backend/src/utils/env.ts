// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

/**
 * Environment Configuration Utilities
 * 
 * Centralized environment variable helpers for consistent NODE_ENV usage across the application.
 * 
 * NODE_ENV controls runtime behavior:
 * - production: Production-safe settings (optimized builds, tighter CORS, less verbose logging, limited error details)
 * - development: Development-friendly settings (verbose logging, permissive CORS for localhost, detailed error messages)
 */

/**
 * The current NODE_ENV value (defaults to 'development' if not set)
 */
export const NODE_ENV: string = process.env.NODE_ENV ?? 'development';

/**
 * Whether the application is running in production mode
 */
export const IS_PRODUCTION: boolean = NODE_ENV === 'production';

/**
 * Whether the application is running in development mode
 */
export const IS_DEVELOPMENT: boolean = NODE_ENV === 'development';

