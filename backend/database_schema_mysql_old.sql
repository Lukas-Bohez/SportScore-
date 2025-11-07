-- ===========================================
-- SCOREBOARD DATABASE SCHEMA
-- Eenvoudige, geïntegreerde structuur voor team scorebeheer
-- ===========================================

-- ===========================================
-- 1. SPORTEN (Sports)
-- Verschillende types sporten/activiteiten
-- ===========================================
CREATE TABLE IF NOT EXISTS sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 2. SPELLEN (Games) 
-- Centraal punt: alle wedstrijden/sessies
-- ===========================================
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sport_id INT NOT NULL,
    game_type ENUM('match', 'tournament', 'quiz', 'challenge', 'custom') DEFAULT 'custom',
    status ENUM('setup', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'setup',
    scoring_mode ENUM('team', 'player') DEFAULT 'team' COMMENT 'team = alleen team punten, player = individuele speler punten die optellen naar team totaal',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    current_round INT DEFAULT 1,
    total_rounds INT DEFAULT 1,
    time_limit INT NULL COMMENT 'Tijdslimiet in seconden',
    settings JSON NULL COMMENT 'Flexibele instellingen per spel',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT,
    INDEX idx_sport_id (sport_id),
    INDEX idx_status (status),
    INDEX idx_game_type (game_type),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 3. TEAMS
-- Teams die deelnemen aan spellen
-- ===========================================
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6' COMMENT 'Hex kleurcode',
    icon VARCHAR(50) DEFAULT 'team',
    is_eliminated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_id (game_id),
    INDEX idx_name (name),
    INDEX idx_eliminated (is_eliminated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 4. SPELERS (Players)
-- Spelers binnen teams
-- ===========================================
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NULL COMMENT 'Positie/rol in team',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_team_id (team_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- 5. SCORES
-- Alle scores voor teams in spellen
-- ===========================================
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    team_id INT NOT NULL,
    player_id INT NULL COMMENT 'Optioneel: welke speler scoorde',
    points INT NOT NULL DEFAULT 0,
    score_type VARCHAR(50) DEFAULT 'point' COMMENT 'Type score: goal, point, time, etc.',
    reason VARCHAR(200) NULL COMMENT 'Waarom deze punten? bv: "Goede vraag", "Goal"',
    round_number INT DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    INDEX idx_game_id (game_id),
    INDEX idx_team_id (team_id),
    INDEX idx_player_id (player_id),
    INDEX idx_round (round_number),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- STANDAARD DATA
-- ===========================================

-- Standaard sporten
INSERT INTO sports (name, description) VALUES
('Voetbal', 'Traditioneel balspel'),
('Basketbal', 'Balsport met basket'),
('Quiz', 'Trivia en kennisvragen'),
('Teambuilding', 'Algemene teambuilding activiteiten'),
('Custom', 'Aangepaste sport/activiteit')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ===========================================
-- NUTTIGE VIEWS
-- ===========================================

-- Leaderboard per spel
CREATE OR REPLACE VIEW v_game_leaderboard AS
SELECT 
    g.id as game_id,
    g.name as game_name,
    g.status as game_status,
    t.id as team_id,
    t.name as team_name,
    t.color as team_color,
    t.icon as team_icon,
    t.is_eliminated,
    COALESCE(SUM(s.points), 0) as total_score,
    COUNT(s.id) as score_count,
    MAX(s.timestamp) as last_score_time
FROM games g
JOIN teams t ON t.game_id = g.id
LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = g.id
GROUP BY g.id, g.name, g.status, t.id, t.name, t.color, t.icon, t.is_eliminated
ORDER BY g.id, total_score DESC, t.name;

-- Speler statistieken
CREATE OR REPLACE VIEW v_player_stats AS
SELECT 
    p.id as player_id,
    p.name as player_name,
    t.id as team_id,
    t.name as team_name,
    g.id as game_id,
    g.name as game_name,
    COUNT(s.id) as scores_made,
    COALESCE(SUM(s.points), 0) as total_points
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN games g ON t.game_id = g.id
LEFT JOIN scores s ON s.player_id = p.id
GROUP BY p.id, p.name, t.id, t.name, g.id, g.name
ORDER BY total_points DESC;

-- ===========================================
-- VOORBEELD QUERIES
-- ===========================================

-- Krijg leaderboard voor een specifiek spel:
-- SELECT * FROM v_game_leaderboard WHERE game_id = 1 ORDER BY total_score DESC;

-- Krijg alle scores van een team:
-- SELECT * FROM scores WHERE team_id = 1 ORDER BY timestamp DESC;

-- Krijg speler statistieken voor een spel:
-- SELECT * FROM v_player_stats WHERE game_id = 1 ORDER BY total_points DESC;

-- Tel aantal actieve teams in een spel:
-- SELECT COUNT(*) FROM teams WHERE game_id = 1 AND is_eliminated = FALSE;