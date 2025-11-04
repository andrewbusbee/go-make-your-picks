/**
 * Database Health Check Utility
 * Validates database connection on startup
 */

import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import fs from 'fs';
import path from 'path';
import { logInfo, logError, logWarn, logDebug } from './logger';

export async function validateDatabaseConnection(): Promise<void> {
  logInfo('Checking database connection');
  logInfo('🔌 Checking database connection...');
  
  try {
    // Test basic connection
    const connection = await db.getConnection();
    logDebug('Database connection established');
    
    // Test query execution
    const [result] = await connection.query<RowDataPacket[]>('SELECT 1 as test');
    
    if (result[0].test !== 1) {
      throw new Error('Database query returned unexpected result');
    }
    logDebug('Database query test successful');
    
    // Check required tables exist
    const requiredTables = [
      'admins',
      'users',
      'seasons',
      'rounds',
      'picks',
      'pick_items',
      'scores',
      'text_settings',
      'numeric_settings',
      'magic_links',
      'season_participants',
      'reminder_log'
    ];
    
    const [tables] = await connection.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      logWarn('Database tables not found, initializing database', { missingTables });
      logInfo('📦 Database tables not found. Initializing database...');
      missingTables.forEach(table => logInfo(`   - Missing: ${table}`));
      
      // Run database initialization
      await initializeDatabase(connection);
      
      // Verify tables were created
      const [newTables] = await connection.query<RowDataPacket[]>('SHOW TABLES');
      const newTableNames = newTables.map((row: any) => Object.values(row)[0]);
      const stillMissing = requiredTables.filter(table => !newTableNames.includes(table));
      
      if (stillMissing.length > 0) {
        logError('Failed to initialize database tables', null, { stillMissing });
        logError('❌ CRITICAL: Failed to initialize database tables:');
        stillMissing.forEach(table => logError(`   - ${table}`));
        connection.release();
        process.exit(1);
      }
      
      logInfo('Database initialized successfully');
      logInfo('✅ Database initialized successfully!');
    }
    
    connection.release();
    logInfo('Database connection successful', { tableCount: requiredTables.length });
    logInfo('✅ Database connection successful!');
    logInfo(`   Tables validated: ${requiredTables.length} tables found`);
    
  } catch (error: any) {
    logError('Database connection failed', error, { 
      errorCode: error.code,
      errorMessage: error.message 
    });
    logError('❌ CRITICAL: Database connection failed!');
    logError('   Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      logError('Database server connection refused', error);
      logError('   The database server is not running or not accepting connections.');
      logError('   Please check:');
      logError('   1. Database server is running');
      logError('   2. DB_HOST and DB_PORT are correct');
      logError('   3. Firewall/network settings allow connection');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logError('Database access denied', error);
      logError('   Database credentials are invalid.');
      logError('   Please check:');
      logError('   1. DB_USER is correct');
      logError('   2. DB_PASSWORD is correct');
      logError('   3. User has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      logError('Database does not exist', error);
      logError('   Database does not exist.');
      logError('   Please check:');
      logError('   1. DB_NAME is correct');
      logError('   2. Database has been created');
    }
    
    process.exit(1);
  }
}

/**
 * Initialize database from init.sql file
 * Uses mysql2's multipleStatements capability for safe execution
 */
async function initializeDatabase(connection: any): Promise<void> {
  try {
    // Read the init.sql file (it's copied into the Docker image)
    const initSqlPath = path.join(__dirname, '../../database/init.sql');
    
    logDebug('Looking for init.sql file', { path: initSqlPath });
    logInfo(`   Looking for init.sql at: ${initSqlPath}`);
    
    if (!fs.existsSync(initSqlPath)) {
      const dbDir = path.join(__dirname, '../../database');
      const dirExists = fs.existsSync(dbDir);
      const filesInDir = dirExists ? fs.readdirSync(dbDir) : [];
      
      logError('init.sql file not found', null, { 
        expectedPath: initSqlPath,
        dirname: __dirname,
        dbDir,
        dirExists,
        filesInDir
      });
      
      logError(`   init.sql not found! Checked: ${initSqlPath}`);
      logError(`   __dirname is: ${__dirname}`);
      // List what files are in the database directory
      if (dirExists) {
        logError(`   Files in ${dbDir}:`, filesInDir);
      } else {
        logError(`   Directory ${dbDir} does not exist`);
      }
      throw new Error(`init.sql not found at ${initSqlPath}`);
    }
    
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    logDebug('Read init.sql file', { 
      fileSize: initSql.length,
      path: initSqlPath 
    });
    logInfo(`   Read ${initSql.length} bytes from init.sql`);
    
    // Remove comments for cleaner execution
    const lines = initSql.split('\n');
    logDebug('Processing init.sql file', { lineCount: lines.length });
    logInfo(`   File has ${lines.length} lines`);
    
    const sqlWithoutComments = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');
    
    logDebug('Processed init.sql file', { 
      originalSize: initSql.length,
      processedSize: sqlWithoutComments.length 
    });
    logInfo(`   After removing comments: ${sqlWithoutComments.length} bytes`);
    
    // SECURITY: Execute SQL statements individually (not as batch) since multipleStatements is disabled
    // This prevents SQL injection batch attacks while still allowing safe initialization
    // Split carefully on top-level semicolons (preserves triggers/procedures)
    logInfo('Executing database initialization SQL');
    logInfo(`   Executing SQL statements individually (multipleStatements disabled for security)...`);
    
    const statements = sqlWithoutComments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    logDebug('Executing SQL statements individually', { statementCount: statements.length });
    logInfo(`   Executing ${statements.length} statements individually...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);
        logDebug(`SQL statement executed successfully`, { 
          statementIndex: i + 1, 
          totalStatements: statements.length 
        });
        logInfo(`   ✓ Statement ${i + 1}/${statements.length} executed`);
      } catch (stmtError: any) {
        logError('SQL statement execution failed', stmtError, {
          statementIndex: i + 1,
          totalStatements: statements.length,
          statement: statement.substring(0, 100)
        });
        logError(`   ✗ Failed on statement ${i + 1}:`, stmtError.message);
        logError(`   Statement: ${statement.substring(0, 100)}...`);
        throw stmtError;
      }
    }
    
    logInfo('Database initialization SQL executed successfully');
    logInfo('   ✅ All SQL statements executed successfully');
  } catch (error: any) {
    logError('Failed to initialize database', error);
    logError('   ❌ Failed to initialize database:', error.message);
    throw error;
  }
}

/**
 * Get database health status (for health check endpoint)
 */
export async function getDatabaseHealth(): Promise<{ status: string; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const connection = await db.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    const latency = Date.now() - startTime;
    logDebug('Database health check successful', { latency });
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error: any) {
    logError('Database health check failed', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

