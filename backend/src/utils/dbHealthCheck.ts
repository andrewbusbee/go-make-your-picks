/**
 * Database Health Check Utility
 * Validates database connection on startup
 */

import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import fs from 'fs';
import path from 'path';

export async function validateDatabaseConnection(): Promise<void> {
  console.log('🔌 Checking database connection...');
  
  try {
    // Test basic connection
    const connection = await db.getConnection();
    
    // Test query execution
    const [result] = await connection.query<RowDataPacket[]>('SELECT 1 as test');
    
    if (result[0].test !== 1) {
      throw new Error('Database query returned unexpected result');
    }
    
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
      console.log('\n📦 Database tables not found. Initializing database...');
      missingTables.forEach(table => console.log(`   - Missing: ${table}`));
      
      // Run database initialization
      await initializeDatabase(connection);
      
      // Verify tables were created
      const [newTables] = await connection.query<RowDataPacket[]>('SHOW TABLES');
      const newTableNames = newTables.map((row: any) => Object.values(row)[0]);
      const stillMissing = requiredTables.filter(table => !newTableNames.includes(table));
      
      if (stillMissing.length > 0) {
        console.error('\n❌ CRITICAL: Failed to initialize database tables:');
        stillMissing.forEach(table => console.error(`   - ${table}`));
        connection.release();
        process.exit(1);
      }
      
      console.log('✅ Database initialized successfully!');
    }
    
    connection.release();
    console.log('✅ Database connection successful!');
    console.log(`   Tables validated: ${requiredTables.length} tables found\n`);
    
  } catch (error: any) {
    console.error('\n❌ CRITICAL: Database connection failed!');
    console.error('   Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n   The database server is not running or not accepting connections.');
      console.error('   Please check:');
      console.error('   1. Database server is running');
      console.error('   2. DB_HOST and DB_PORT are correct');
      console.error('   3. Firewall/network settings allow connection\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n   Database credentials are invalid.');
      console.error('   Please check:');
      console.error('   1. DB_USER is correct');
      console.error('   2. DB_PASSWORD is correct');
      console.error('   3. User has proper permissions\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n   Database does not exist.');
      console.error('   Please check:');
      console.error('   1. DB_NAME is correct');
      console.error('   2. Database has been created\n');
    }
    
    process.exit(1);
  }
}

/**
 * Initialize database from init.sql file
 */
async function initializeDatabase(connection: any): Promise<void> {
  try {
    // Read the init.sql file (it's copied into the Docker image)
    const initSqlPath = path.join(__dirname, '../../database/init.sql');
    
    console.log(`   Looking for init.sql at: ${initSqlPath}`);
    
    if (!fs.existsSync(initSqlPath)) {
      console.error(`   init.sql not found! Checked: ${initSqlPath}`);
      console.error(`   __dirname is: ${__dirname}`);
      // List what files are in the database directory
      const dbDir = path.join(__dirname, '../../database');
      if (fs.existsSync(dbDir)) {
        console.error(`   Files in ${dbDir}:`, fs.readdirSync(dbDir));
      } else {
        console.error(`   Directory ${dbDir} does not exist`);
      }
      throw new Error(`init.sql not found at ${initSqlPath}`);
    }
    
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    console.log(`   Read ${initSql.length} bytes from init.sql`);
    
    // Remove comments and split into statements
    const lines = initSql.split('\n');
    console.log(`   File has ${lines.length} lines`);
    
    const sqlWithoutComments = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');
    
    console.log(`   After removing comments: ${sqlWithoutComments.length} bytes`);
    
    // Split by semicolon and filter out empty statements
    const statements = sqlWithoutComments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`   Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);
        console.log(`   ✓ Statement ${i + 1}/${statements.length} executed`);
      } catch (error: any) {
        console.error(`   ✗ Failed on statement ${i + 1}:`, error.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
    
    console.log('   ✅ All SQL statements executed successfully');
  } catch (error: any) {
    console.error('   ❌ Failed to initialize database:', error.message);
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
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

