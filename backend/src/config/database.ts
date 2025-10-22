import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.MARIADB_PORT || '3306'),
  database: process.env.MARIADB_DATABASE || 'sports_picks',
  user: process.env.MARIADB_USER || 'picksuser',
  password: process.env.MARIADB_PASSWORD || 'pickspass',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'), // Increased from 10 for production load
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '100'), // Prevents unlimited queue memory growth
  maxIdle: 10, // Maximum idle connections to keep in pool
  idleTimeout: 60000, // Close idle connections after 60 seconds
  enableKeepAlive: true, // Prevent connection drops
  keepAliveInitialDelay: 0, // Start keep-alive immediately
  timezone: '+00:00'
});

export default pool;
