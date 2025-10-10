/**
 * Transaction Wrapper Utility
 * Eliminates duplicate transaction handling code across routes
 */

import db from '../config/database';
import { PoolConnection } from 'mysql2/promise';
import logger from './logger';

/**
 * Executes a callback function within a database transaction
 * Handles commit, rollback, and connection release automatically
 * 
 * @param callback - Function to execute within the transaction
 * @returns Result from the callback function
 * @throws Error if transaction fails
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(async (connection) => {
 *   await connection.query('INSERT INTO ...');
 *   await connection.query('UPDATE ...');
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction failed', { 
      error: error instanceof Error ? error.message : error 
    });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Executes a callback function with a database connection (no transaction)
 * Handles connection release automatically
 * 
 * @param callback - Function to execute with the connection
 * @returns Result from the callback function
 * @throws Error if query fails
 * 
 * @example
 * ```typescript
 * const users = await withConnection(async (connection) => {
 *   const [rows] = await connection.query('SELECT * FROM users');
 *   return rows;
 * });
 * ```
 */
export async function withConnection<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await db.getConnection();
  
  try {
    return await callback(connection);
  } catch (error) {
    logger.error('Connection query failed', { 
      error: error instanceof Error ? error.message : error 
    });
    throw error;
  } finally {
    connection.release();
  }
}

