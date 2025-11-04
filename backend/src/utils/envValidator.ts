/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before the app starts
 */

import { logInfo, logWarn, logError, logFatal } from './logger';

interface EnvConfig {
  required: string[];
  optional: string[];
}

const productionConfig: EnvConfig = {
  required: [
    'JWT_SECRET',
    'MARIADB_HOST',
    'MARIADB_DATABASE',
    'MARIADB_USER',
    'MARIADB_PASSWORD',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'APP_URL',
    'NODE_ENV'
  ],
  optional: [
    'MARIADB_PORT',
    'SMTP_PORT',
    'SMTP_SECURE'
  ]
};

const developmentConfig: EnvConfig = {
  required: [
    'JWT_SECRET',
    'MARIADB_HOST',
    'MARIADB_DATABASE'
  ],
  optional: [
    'MARIADB_USER',
    'MARIADB_PASSWORD',
    'MARIADB_PORT',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_PORT',
    'SMTP_SECURE',
    'APP_URL'
  ]
};

export function validateEnvironment(): void {
  const env = process.env.NODE_ENV || 'development';
  const config = env === 'production' ? productionConfig : developmentConfig;
  
  logInfo(`Validating environment variables for ${env.toUpperCase()} mode`);
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  config.required.forEach(key => {
    if (!process.env[key] || process.env[key]?.trim() === '') {
      missing.push(key);
    }
  });
  
  // Check optional variables (warnings only)
  config.optional.forEach(key => {
    if (!process.env[key]) {
      warnings.push(key);
    }
  });
  
  // Report missing required variables
  if (missing.length > 0) {
    logFatal('Missing required environment variables', null, { missing });
    logFatal('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => {
      logFatal(`   - ${key}`);
    });
    logFatal('The application cannot start without these variables.');
    logFatal('Please check your .env file or environment configuration.');
    process.exit(1);
  }
  
  // Report warnings for optional variables
  if (warnings.length > 0 && env === 'production') {
    logWarn('Missing optional environment variables in production', { warnings });
    logWarn('⚠️  WARNING: Missing optional environment variables:');
    warnings.forEach(key => {
      logWarn(`   - ${key} (using default)`);
    });
    logWarn('The application will use default values, but this may not be ideal for production.');
  }
  
  // Validate specific values
  validateSpecificValues();
  
  logInfo('Environment validation passed');
  logInfo('✅ Environment validation passed!');
}

function validateSpecificValues(): void {
  // Validate JWT_SECRET length
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    const errorMsg = 'JWT_SECRET is too short';
    logFatal(errorMsg, null, { 
      currentLength: jwtSecret.length, 
      minimumLength: 32,
      environment: process.env.NODE_ENV 
    });
    logFatal('❌ CRITICAL: JWT_SECRET is too short');
    logFatal(`   Current length: ${jwtSecret.length} characters`);
    logFatal('   Minimum length: 32 characters');
    if (process.env.NODE_ENV === 'production') {
      logFatal('   Cannot start in production with weak JWT_SECRET');
      process.exit(1);
    } else {
      logWarn('JWT_SECRET is weak but acceptable for development', { 
        currentLength: jwtSecret.length 
      });
      logWarn('   ⚠️  WARNING: This is acceptable for development but NOT for production');
    }
  }
  
  // Validate MARIADB_PORT is a number
  const mariadbPort = process.env.MARIADB_PORT;
  if (mariadbPort && isNaN(parseInt(mariadbPort))) {
    logFatal('MARIADB_PORT must be a number', null, { providedValue: mariadbPort });
    logFatal(`❌ CRITICAL: MARIADB_PORT must be a number (got: ${mariadbPort})`);
    process.exit(1);
  }
  
  // Validate PORT is a number
  const port = process.env.PORT;
  if (port && isNaN(parseInt(port))) {
    logFatal('PORT must be a number', null, { providedValue: port });
    logFatal(`❌ CRITICAL: PORT must be a number (got: ${port})`);
    process.exit(1);
  }
  
  // Validate APP_URL format
  const appUrl = process.env.APP_URL;
  if (appUrl && !appUrl.match(/^https?:\/\/.+/)) {
    logFatal('APP_URL must start with http:// or https://', null, { providedValue: appUrl });
    logFatal(`❌ CRITICAL: APP_URL must start with http:// or https:// (got: ${appUrl})`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logWarn('Invalid APP_URL format, setting default for development', { 
        providedValue: appUrl,
        defaultValue: 'http://localhost:3003'
      });
      logWarn('   ⚠️  WARNING: Invalid APP_URL format. Setting default for development...');
      process.env.APP_URL = 'http://localhost:3003';
      logWarn(`   Using: ${process.env.APP_URL}`);
    }
  }
  
  // Set default APP_URL for development if not provided
  if (!appUrl && process.env.NODE_ENV !== 'production') {
    process.env.APP_URL = 'http://localhost:3003';
    logInfo('Using default APP_URL for development', { 
      defaultValue: process.env.APP_URL 
    });
    logInfo(`   Using default APP_URL for development: ${process.env.APP_URL}`);
  }
  
  // Validate SMTP_PORT is a number
  const smtpPort = process.env.SMTP_PORT;
  if (smtpPort && isNaN(parseInt(smtpPort))) {
    logFatal('SMTP_PORT must be a number', null, { providedValue: smtpPort });
    logFatal(`❌ CRITICAL: SMTP_PORT must be a number (got: ${smtpPort})`);
    process.exit(1);
  }
}

/**
 * Print environment summary (safe for logging - no secrets)
 */
export function printEnvironmentSummary(): void {
  const summary = {
    nodeEnvironment: process.env.NODE_ENV || 'development',
    databaseHost: process.env.MARIADB_HOST,
    databaseName: process.env.MARIADB_DATABASE,
    smtpHost: process.env.SMTP_HOST || 'not configured',
    appUrl: process.env.APP_URL || 'http://localhost:3003',
    port: process.env.PORT || '3003'
  };
  
  logInfo('Environment configuration summary', summary);
  logInfo('📋 Environment Configuration:');
  logInfo(`   Node Environment: ${summary.nodeEnvironment}`);
  logInfo(`   Database Host: ${summary.databaseHost}`);
  logInfo(`   Database Name: ${summary.databaseName}`);
  logInfo(`   SMTP Host: ${summary.smtpHost}`);
  logInfo(`   App URL: ${summary.appUrl}`);
  logInfo(`   Port: ${summary.port}`);
}

