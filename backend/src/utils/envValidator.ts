/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before the app starts
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const productionConfig: EnvConfig = {
  required: [
    'JWT_SECRET',
    'MYSQL_HOST',
    'MYSQL_DATABASE',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'APP_URL',
    'NODE_ENV'
  ],
  optional: [
    'MYSQL_PORT',
    'PORT',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_FROM'
  ]
};

const developmentConfig: EnvConfig = {
  required: [
    'JWT_SECRET',
    'MYSQL_HOST',
    'MYSQL_DATABASE'
  ],
  optional: [
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_PORT',
    'PORT',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_FROM',
    'APP_URL'
  ]
};

export function validateEnvironment(): void {
  const env = process.env.NODE_ENV || 'development';
  const config = env === 'production' ? productionConfig : developmentConfig;
  
  console.log(`\n🔍 Validating environment variables for ${env.toUpperCase()} mode...`);
  
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
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\nThe application cannot start without these variables.');
    console.error('Please check your .env file or environment configuration.\n');
    process.exit(1);
  }
  
  // Report warnings for optional variables
  if (warnings.length > 0 && env === 'production') {
    console.warn('\n⚠️  WARNING: Missing optional environment variables:');
    warnings.forEach(key => {
      console.warn(`   - ${key} (using default)`);
    });
    console.warn('The application will use default values, but this may not be ideal for production.\n');
  }
  
  // Validate specific values
  validateSpecificValues();
  
  console.log('✅ Environment validation passed!\n');
}

function validateSpecificValues(): void {
  // Validate JWT_SECRET length
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.error('\n❌ CRITICAL: JWT_SECRET is too short');
    console.error(`   Current length: ${jwtSecret.length} characters`);
    console.error('   Minimum length: 32 characters');
    if (process.env.NODE_ENV === 'production') {
      console.error('   Cannot start in production with weak JWT_SECRET\n');
      process.exit(1);
    } else {
      console.warn('   ⚠️  WARNING: This is acceptable for development but NOT for production\n');
    }
  }
  
  // Validate MYSQL_PORT is a number
  const mysqlPort = process.env.MYSQL_PORT;
  if (mysqlPort && isNaN(parseInt(mysqlPort))) {
    console.error(`\n❌ CRITICAL: MYSQL_PORT must be a number (got: ${mysqlPort})\n`);
    process.exit(1);
  }
  
  // Validate PORT is a number
  const port = process.env.PORT;
  if (port && isNaN(parseInt(port))) {
    console.error(`\n❌ CRITICAL: PORT must be a number (got: ${port})\n`);
    process.exit(1);
  }
  
  // Validate APP_URL format
  const appUrl = process.env.APP_URL;
  if (appUrl && !appUrl.match(/^https?:\/\/.+/)) {
    console.error(`\n❌ CRITICAL: APP_URL must start with http:// or https:// (got: ${appUrl})\n`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('   ⚠️  WARNING: Invalid APP_URL format. Setting default for development...');
      process.env.APP_URL = 'http://localhost:3003';
      console.warn(`   Using: ${process.env.APP_URL}\n`);
    }
  }
  
  // Set default APP_URL for development if not provided
  if (!appUrl && process.env.NODE_ENV !== 'production') {
    process.env.APP_URL = 'http://localhost:3003';
    console.log(`   Using default APP_URL for development: ${process.env.APP_URL}`);
  }
  
  // Validate SMTP_PORT is a number
  const smtpPort = process.env.SMTP_PORT;
  if (smtpPort && isNaN(parseInt(smtpPort))) {
    console.error(`\n❌ CRITICAL: SMTP_PORT must be a number (got: ${smtpPort})\n`);
    process.exit(1);
  }
}

/**
 * Print environment summary (safe for logging - no secrets)
 */
export function printEnvironmentSummary(): void {
  console.log('📋 Environment Configuration:');
  console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database Host: ${process.env.MYSQL_HOST}`);
  console.log(`   Database Name: ${process.env.MYSQL_DATABASE}`);
  console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'not configured'}`);
  console.log(`   App URL: ${process.env.APP_URL || 'http://localhost:3003'}`);
  console.log(`   Port: ${process.env.PORT || '3003'}`);
  console.log('');
}

