import { Migration } from './Migration';
import db from '../config/database';

export default class AddEmailMagicLinks implements Migration {
  id = '20250118000000_add_email_magic_links';
  description = 'Add email_magic_links table for shared email pick functionality';

  async up(): Promise<void> {
    await db.query(`
      -- Email-based magic links for shared email scenarios
      -- Magic links are multi-use: same link can be used multiple times (mobile, desktop, etc.)
      -- until the round locks. Each validation issues a fresh JWT (8h expiry by default).
      -- There is at most one active magic link per (email, round_id) - enforced by unique constraint.
      -- Magic links expire when the round's lock_time is reached (expires_at is set to lock_time).
      CREATE TABLE IF NOT EXISTS email_magic_links (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        round_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL, -- Set to round.lock_time - link valid until round locks
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_email_round (email, round_id),
        UNIQUE KEY unique_email_round (email, round_id) -- Ensures one active link per email+round
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(): Promise<void> {
    await db.query('DROP TABLE IF EXISTS email_magic_links');
  }
}
