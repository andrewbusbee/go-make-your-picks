-- Go Make Your Picks Database Schema

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_main_admin BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT FALSE,
    password_reset_token VARCHAR(255) NULL DEFAULT NULL,
    password_reset_expires TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_reset_token (password_reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users (family members) table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    year_start INT NOT NULL,
    year_end INT NOT NULL,
    commissioner VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    ended_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_default (is_default),
    INDEX idx_ended (ended_at),
    INDEX idx_deleted (deleted_at),
    CONSTRAINT check_years CHECK (year_start >= 2020 AND year_start <= 2100 AND year_end >= year_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Season participants junction table
CREATE TABLE IF NOT EXISTS season_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_season_user (season_id, user_id),
    INDEX idx_season (season_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sports/rounds table
CREATE TABLE IF NOT EXISTS rounds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    sport_name VARCHAR(100) NOT NULL,
    pick_type ENUM('single', 'multiple') DEFAULT 'single',
    num_write_in_picks INT DEFAULT NULL,
    email_message TEXT DEFAULT NULL,
    lock_time TIMESTAMP NOT NULL,
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    status ENUM('draft', 'active', 'locked', 'completed') DEFAULT 'draft',
    first_place_team VARCHAR(255),
    second_place_team VARCHAR(255),
    third_place_team VARCHAR(255),
    fourth_place_team VARCHAR(255),
    fifth_place_team VARCHAR(255),
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    INDEX idx_season (season_id),
    INDEX idx_status (status),
    INDEX idx_pick_type (pick_type),
    INDEX idx_deleted (deleted_at),
    INDEX idx_season_status_deleted (season_id, status, deleted_at),
    INDEX idx_lock_time (lock_time),
    INDEX idx_timezone (timezone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Available teams for each round
CREATE TABLE IF NOT EXISTS round_teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    round_id INT NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    INDEX idx_round (round_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Magic links table
CREATE TABLE IF NOT EXISTS magic_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    round_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    INDEX idx_user_round (user_id, round_id),
    UNIQUE KEY unique_user_round (user_id, round_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Picks table
CREATE TABLE IF NOT EXISTS picks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    round_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_round_pick (user_id, round_id),
    INDEX idx_user (user_id),
    INDEX idx_round (round_id),
    INDEX idx_user_round (user_id, round_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pick items table (individual picks for each user/round)
CREATE TABLE IF NOT EXISTS pick_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pick_id INT NOT NULL,
    pick_number INT NOT NULL,
    pick_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pick_id) REFERENCES picks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pick_number (pick_id, pick_number),
    INDEX idx_pick_id (pick_id),
    INDEX idx_pick_value (pick_value),
    INDEX idx_pick_id_number (pick_id, pick_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scores table (calculated after round completion)
CREATE TABLE IF NOT EXISTS scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    round_id INT NOT NULL,
    first_place TINYINT DEFAULT 0,
    second_place TINYINT DEFAULT 0,
    third_place TINYINT DEFAULT 0,
    fourth_place TINYINT DEFAULT 0,
    fifth_place TINYINT DEFAULT 0,
    sixth_plus_place TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_round_score (user_id, round_id),
    INDEX idx_user (user_id),
    INDEX idx_round (round_id),
    INDEX idx_user_round_composite (user_id, round_id),
    CONSTRAINT check_score_values CHECK (
        first_place IN (0, 1, 2) AND
        second_place IN (0, 1, 2) AND
        third_place IN (0, 1, 2) AND
        fourth_place IN (0, 1, 2) AND
        fifth_place IN (0, 1, 2) AND
        sixth_plus_place IN (0, 1, 2)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Text settings table for string values
CREATE TABLE IF NOT EXISTS text_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Numeric settings table for integer values
CREATE TABLE IF NOT EXISTS numeric_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value INT NOT NULL DEFAULT 0,
    min_value INT DEFAULT 0,
    max_value INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key),
    CONSTRAINT check_min_max CHECK (
        (min_value IS NULL OR setting_value >= min_value) AND
        (max_value IS NULL OR setting_value <= max_value)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reminder log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS reminder_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    round_id INT NOT NULL,
    reminder_type ENUM('first', 'final', 'locked', '48h', '6h') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recipient_count INT NOT NULL DEFAULT 0,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    INDEX idx_round_type (round_id, reminder_type),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Season winners table for permanent podium records
-- Point settings are stored per season to preserve historical accuracy
CREATE TABLE IF NOT EXISTS season_winners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    place INT NOT NULL,
    user_id INT NOT NULL,
    total_points INT NOT NULL,
    points_first_place INT NOT NULL DEFAULT 6,
    points_second_place INT NOT NULL DEFAULT 5,
    points_third_place INT NOT NULL DEFAULT 4,
    points_fourth_place INT NOT NULL DEFAULT 3,
    points_fifth_place INT NOT NULL DEFAULT 2,
    points_sixth_plus_place INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_season_user (season_id, user_id),
    INDEX idx_season (season_id),
    CONSTRAINT check_place CHECK (place >= 1 AND place <= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin (username: user, password: password)
-- Password hash for "password" using bcrypt with salt rounds = 10
INSERT INTO admins (username, email, password_hash, is_main_admin, must_change_password) 
VALUES ('user', 'admin@gomakeyourpicks.com', '$2b$10$sYvBpErqTeSuAEB5OOHML.N.W6yT3YNiHLhu91ffcCt.qJW5mqFHq', TRUE, TRUE)
ON DUPLICATE KEY UPDATE username=username;

-- Default seasons will be created by admin through the UI

-- Insert default text settings
INSERT INTO text_settings (setting_key, setting_value) VALUES 
('app_title', 'Go Make Your Picks'),
('app_tagline', 'Predict. Compete. Win.'),
('footer_message', 'Built for Sports Fans'),
('reminder_type', 'before_lock'),
('daily_reminder_time', '10:00:00')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Insert default numeric settings
INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES 
('points_first_place', 6, 0, 20),
('points_second_place', 5, 0, 20),
('points_third_place', 4, 0, 20),
('points_fourth_place', 3, 0, 20),
('points_fifth_place', 2, 0, 20),
('points_sixth_plus_place', 1, 0, 20),
('reminder_first_hours', 48, 2, 168),
('reminder_final_hours', 6, 1, 48)
ON DUPLICATE KEY UPDATE setting_key=setting_key;
