-- ===========================================
-- SCOREBOARD DATABASE SCHEMA - SQLite Version
-- Eenvoudige, geïntegreerde structuur voor team scorebeheer
-- ===========================================

-- ===========================================
-- 1. SPORTEN (Sports)
-- Verschillende types sporten/activiteiten
-- ===========================================
CREATE TABLE IF NOT EXISTS sports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sports_name ON sports(name);

-- Trigger voor updated_at in sports
CREATE TRIGGER IF NOT EXISTS update_sports_timestamp 
AFTER UPDATE ON sports
BEGIN
    UPDATE sports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================
-- 2. SPELLEN (Games) 
-- Centraal punt: alle wedstrijden/sessies
-- ===========================================
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    sport_id INTEGER NOT NULL,
    game_type TEXT CHECK(game_type IN ('match', 'tournament', 'quiz', 'challenge', 'custom', 'sport_challenge', 'random_bonus', 'elimination', 'team_vs_time')) DEFAULT 'custom',
    status TEXT CHECK(status IN ('setup', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'setup',
    scoring_mode TEXT CHECK(scoring_mode IN ('team', 'team_with_players', 'player')) DEFAULT 'team',
    sport_type VARCHAR(50) DEFAULT 'custom',
    show_players INTEGER DEFAULT 1,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    current_round INTEGER DEFAULT 1,
    total_rounds INTEGER DEFAULT 1,
    time_limit INTEGER NULL,
    settings TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_games_sport_id ON games(sport_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);

-- Trigger voor updated_at in games
CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
AFTER UPDATE ON games
BEGIN
    UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================
-- 3. TEAMS
-- Herbruikbare teams die in meerdere sessies kunnen deelnemen
-- ===========================================
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'team',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Trigger voor updated_at in teams
CREATE TRIGGER IF NOT EXISTS update_teams_timestamp 
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================
-- 3B. GAME_TEAMS (Koppeltabel)
-- Koppelt teams aan specifieke games/sessies
-- ===========================================
CREATE TABLE IF NOT EXISTS game_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    is_eliminated INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_game_teams_game_id ON game_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_team_id ON game_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_eliminated ON game_teams(is_eliminated);

-- ===========================================
-- SESSION_PLAYERS (Session-specific player assignments)
-- Maps players to teams for a specific session (game).
-- Ensures a player can only be assigned to one team per session.
-- ===========================================
CREATE TABLE IF NOT EXISTS session_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_team_id ON session_players(team_id);
CREATE INDEX IF NOT EXISTS idx_session_players_player_id ON session_players(player_id);

-- ===========================================
-- 4. SPELERS (Players)
-- Spelers binnen teams
-- ===========================================
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- Trigger voor updated_at in players
CREATE TRIGGER IF NOT EXISTS update_players_timestamp 
AFTER UPDATE ON players
BEGIN
    UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================
-- 5. SCORES
-- Alle scores voor teams in spellen
-- ===========================================
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NULL,
    points INTEGER NOT NULL DEFAULT 0,
    score_type VARCHAR(50) DEFAULT 'point',
    reason VARCHAR(200) NULL,
    round_number INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_team_id ON scores(team_id);
CREATE INDEX IF NOT EXISTS idx_scores_player_id ON scores(player_id);
CREATE INDEX IF NOT EXISTS idx_scores_round ON scores(round_number);
CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON scores(timestamp);

-- ===========================================
-- STANDAARD DATA
-- ===========================================

-- Standaard sporten
INSERT OR IGNORE INTO sports (name, description) VALUES
('Voetbal', 'Traditioneel balspel'),
('Basketbal', 'Balsport met basket'),
('Quiz', 'Trivia en kennisvragen'),
('Teambuilding', 'Algemene teambuilding activiteiten'),
('Custom', 'Aangepaste sport/activiteit');

-- ===========================================
-- NUTTIGE VIEWS
-- ===========================================

-- Leaderboard per spel
CREATE VIEW IF NOT EXISTS v_game_leaderboard AS
SELECT 
    g.id as game_id,
    g.name as game_name,
    g.status as game_status,
    t.id as team_id,
    t.name as team_name,
    t.color as team_color,
    t.icon as team_icon,
    gt.is_eliminated,
    COALESCE(SUM(s.points), 0) as total_score,
    COUNT(s.id) as score_count,
    MAX(s.timestamp) as last_score_time
FROM games g
JOIN game_teams gt ON gt.game_id = g.id
JOIN teams t ON t.id = gt.team_id
LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = g.id
GROUP BY g.id, g.name, g.status, t.id, t.name, t.color, t.icon, gt.is_eliminated
ORDER BY g.id, total_score DESC, t.name;

-- Speler statistieken
CREATE VIEW IF NOT EXISTS v_player_stats AS
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
JOIN game_teams gt ON gt.team_id = t.id
JOIN games g ON gt.game_id = g.id
LEFT JOIN scores s ON s.player_id = p.id
GROUP BY p.id, p.name, t.id, t.name, g.id, g.name
ORDER BY total_points DESC;

-- ===========================================
-- VOORBEELD QUERIES
-- ===========================================

-- ===========================================
-- SESSION TEMPLATES
-- Saved session configurations for reuse
-- ===========================================
CREATE TABLE IF NOT EXISTS session_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    template_data TEXT NOT NULL,  -- JSON string with session settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_templates_name ON session_templates(name);

-- Trigger voor updated_at in session_templates
CREATE TRIGGER IF NOT EXISTS update_session_templates_timestamp 
AFTER UPDATE ON session_templates
BEGIN
    UPDATE session_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Krijg leaderboard voor een specifiek spel:
-- SELECT * FROM v_game_leaderboard WHERE game_id = 1 ORDER BY total_score DESC;

-- Krijg alle scores van een team:
-- SELECT * FROM scores WHERE team_id = 1 ORDER BY timestamp DESC;

-- Krijg speler statistieken voor een spel:
-- SELECT * FROM v_player_stats WHERE game_id = 1 ORDER BY total_points DESC;

-- Tel aantal actieve teams in een spel:
-- SELECT COUNT(*) FROM game_teams WHERE game_id = 1 AND is_eliminated = 0;
