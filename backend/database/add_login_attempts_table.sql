-- Add login_attempts table for account lockout feature
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45) NULL,
    INDEX idx_username (username),
    INDEX idx_attempt_time (attempt_time),
    INDEX idx_username_time (username, attempt_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add account lockout columns to admins table
ALTER TABLE admins 
ADD COLUMN account_locked_until TIMESTAMP NULL DEFAULT NULL AFTER must_change_password,
ADD INDEX idx_locked_until (account_locked_until);

