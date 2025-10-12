-- Database optimization migration
-- Applies schema improvements to existing databases
-- Run this after updating to version 0.2.0

-- 1. Fix reminder_log ENUM - add 'daily', remove obsolete values
ALTER TABLE reminder_log 
MODIFY COLUMN reminder_type ENUM('first', 'final', 'locked', 'daily') NOT NULL;

-- 2. Change email_message from TEXT to VARCHAR(1000) for better performance
ALTER TABLE rounds 
MODIFY COLUMN email_message VARCHAR(1000) DEFAULT NULL;

-- 3. Add composite index to login_attempts for faster lockout checks
ALTER TABLE login_attempts
ADD INDEX idx_username_success_time (username, success, attempt_time);

