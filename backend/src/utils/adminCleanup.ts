/**
 * Security cleanup utility
 * Ensures default admin@example.com is removed if another main admin exists
 * Runs on every startup to prevent security issues
 */
import db from '../config/database';
import logger from '../utils/logger';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Clean up default admin@example.com if another main admin exists
 * 
 * IMPORTANT: Only deletes admin@example.com if:
 * - Another main admin exists (email != 'admin@example.com')
 * - This ensures we NEVER delete the default admin if first login hasn't happened yet
 * 
 * This is idempotent and safe to run on every startup
 */
export async function cleanupDefaultAdmin(): Promise<void> {
  try {
    // Step 1: Check if another main admin exists (not admin@example.com)
    const [otherMainAdmins] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM admins 
       WHERE is_main_admin = TRUE 
       AND email != 'admin@example.com'`
    );

    const otherMainAdminCount = otherMainAdmins[0]?.count || 0;
    
    // Step 2: Only delete admin@example.com if another main admin exists
    // If otherMainAdminCount === 0, admin@example.com is the ONLY main admin (first login not done yet)
    // In that case, we MUST NOT delete it - user needs it for initial setup
    if (otherMainAdminCount > 0) {
      // Another main admin exists - safe to delete default admin@example.com
      const [deleteResult] = await db.query<ResultSetHeader>(
        `DELETE FROM admins 
         WHERE email = 'admin@example.com' 
         AND is_main_admin = TRUE`
      );
      
      if (deleteResult.affectedRows > 0) {
        logger.info(`🔒 Security: Deleted default admin@example.com (${otherMainAdminCount} other main admin(s) exist)`);
      } else {
        logger.debug('Default admin@example.com not found or already deleted');
      }
    } else {
      // No other main admin exists - admin@example.com is the only one
      // Keep it for first login - do NOT delete
      logger.debug('Default admin@example.com kept (no other main admin exists yet - awaiting first login)');
    }
  } catch (error: any) {
    // Log error but don't fail startup - this is a cleanup operation
    logger.error('Error during default admin cleanup', { error: error.message });
  }
}

