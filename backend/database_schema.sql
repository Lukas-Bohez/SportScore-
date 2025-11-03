-- Scoreboard Database Schema
-- MySQL Database Setup for Scoreboard Backend Application

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE scoreboard;

-- ===========================================
-- Table: sports
-- Stores different types of sports
-- ===========================================
CREATE TABLE IF NOT EXISTS sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================================
-- Table: teams
-- Teams participating in sports
-- ===========================================
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sport_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    INDEX idx_sport_id (sport_id),
    INDEX idx_team_name (name)
);

-- ===========================================
-- Table: players
-- Players belonging to teams
-- ===========================================
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_team_id (team_id),
    INDEX idx_player_name (name)
);

-- ===========================================
-- Table: score_types
-- Different types of scoring (goals, points, etc.)
-- ===========================================
CREATE TABLE IF NOT EXISTS score_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================================
-- Table: games
-- Individual games/matches between teams
-- ===========================================
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_id INT NOT NULL,
    team1_id INT NOT NULL,
    team2_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_sport_id (sport_id),
    INDEX idx_start_time (start_time),
    INDEX idx_status (status),
    CHECK (team1_id != team2_id)
);

-- ===========================================
-- Table: scores
-- Individual scores recorded during games
-- ===========================================
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    team_id INT NOT NULL,
    score_type_id INT NOT NULL,
    value INT NOT NULL DEFAULT 0,
    player_id INT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (score_type_id) REFERENCES score_types(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    INDEX idx_game_id (game_id),
    INDEX idx_team_id (team_id),
    INDEX idx_score_type_id (score_type_id),
    INDEX idx_player_id (player_id),
    INDEX idx_timestamp (timestamp)
);

-- ===========================================
-- Insert sample data
-- ===========================================

-- Insert sample sports
INSERT INTO sports (name, description) VALUES
('Voetbal', 'Traditioneel balspel met twee teams van 11 spelers'),
('Basketbal', 'Balsport gespeeld met een basket'),
('Tennis', 'Racketsport tussen twee of vier spelers'),
('Zwemsport', 'Wedstrijdzwemmen in verschillende disciplines')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert sample score types
INSERT INTO score_types (name, description) VALUES
('Goal', 'Doelpunt in voetbal'),
('Point', 'Punten in basketbal of tennis'),
('Set', 'Set winst in tennis'),
('Length', 'Afstand in zwemsport (in meters)')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ===========================================
-- Table: sessions
-- Teambuilding sessions with multiple teams and game types
-- ===========================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    game_type ENUM('quiz', 'sport_challenge', 'random_bonus', 'elimination', 'team_vs_time', 'custom') DEFAULT 'custom',
    status ENUM('setup', 'active', 'paused', 'completed') DEFAULT 'setup',
    max_teams INT DEFAULT 10,
    current_round INT DEFAULT 1,
    total_rounds INT DEFAULT 1,
    time_limit INT NULL, -- in seconds, NULL for no time limit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_game_type (game_type)
);

-- ===========================================
-- Table: session_teams
-- Teams participating in a session
-- ===========================================
CREATE TABLE IF NOT EXISTS session_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#333333', -- hex color code
    icon VARCHAR(50) DEFAULT 'team', -- icon name
    score INT DEFAULT 0,
    is_eliminated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_score (score DESC)
);

-- ===========================================
-- Table: session_scores
-- Individual score entries for sessions
-- ===========================================
CREATE TABLE IF NOT EXISTS session_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    team_id INT NOT NULL,
    points INT NOT NULL,
    reason VARCHAR(200), -- e.g., "Quiz question correct", "Bonus points", etc.
    round_number INT DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES session_teams(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_team_id (team_id),
    INDEX idx_round_number (round_number),
    INDEX idx_timestamp (timestamp)
);

-- Get all games with team names
-- SELECT g.id, s.name as sport, t1.name as team1, t2.name as team2,
--        g.start_time, g.status
-- FROM games g
-- JOIN sports s ON g.sport_id = s.id
-- JOIN teams t1 ON g.team1_id = t1.id
-- JOIN teams t2 ON g.team2_id = t2.id
-- ORDER BY g.start_time DESC;

-- Get score summary for a game
-- SELECT t.name as team, st.name as score_type, SUM(s.value) as total
-- FROM scores s
-- JOIN teams t ON s.team_id = t.id
-- JOIN score_types st ON s.score_type_id = st.id
-- WHERE s.game_id = ?
-- GROUP BY t.id, st.name
-- ORDER BY t.id;

-- Get player statistics
-- SELECT p.name as player, t.name as team, COUNT(s.id) as scores,
--        SUM(s.value) as total_points
-- FROM players p
-- JOIN teams t ON p.team_id = t.id
-- LEFT JOIN scores s ON p.id = s.player_id
-- GROUP BY p.id, p.name, t.name
-- ORDER BY total_points DESC;