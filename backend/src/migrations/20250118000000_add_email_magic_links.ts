import { Migration } from './Migration';
import db from '../config/database';

export default class AddEmailMagicLinks implements Migration {
  id = '20250118000000_add_email_magic_links';
  description = 'Add email_magic_links table for shared email pick functionality';

  async up(): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_magic_links (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        round_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_email_round (email, round_id),
        UNIQUE KEY unique_email_round (email, round_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(): Promise<void> {
    await db.query('DROP TABLE IF EXISTS email_magic_links');
  }
}
