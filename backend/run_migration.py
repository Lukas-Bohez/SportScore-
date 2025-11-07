"""
Database migration script: Teams herbruikbaar maken
Bevat de volledige migratie inline
"""

import sqlite3
import os
import sys
from datetime import datetime

MIGRATION_SQL = """
-- ===========================================
-- MIGRATIE: Teams Herbruikbaar Maken
-- ===========================================

-- Stap 1: Maak backup van oude teams tabel
CREATE TABLE IF NOT EXISTS teams_backup AS SELECT * FROM teams;

-- Stap 2: Drop oude views die afhankelijk zijn van teams
DROP VIEW IF EXISTS v_game_leaderboard;
DROP VIEW IF EXISTS v_player_stats;

-- Stap 3: Maak tijdelijke nieuwe teams tabel
CREATE TABLE IF NOT EXISTS teams_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'team',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stap 4: Kopieer unieke teams naar nieuwe tabel
INSERT INTO teams_new (id, name, color, icon, created_at, updated_at)
SELECT 
    id,
    name,
    color,
    icon,
    created_at,
    updated_at
FROM teams
GROUP BY name, color, icon;

-- Stap 5: Maak game_teams koppeltabel
CREATE TABLE IF NOT EXISTS game_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    is_eliminated INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams_new(id) ON DELETE CASCADE,
    UNIQUE(game_id, team_id)
);

-- Stap 6: Vul game_teams koppeltabel met bestaande relaties
INSERT INTO game_teams (game_id, team_id, is_eliminated, joined_at)
SELECT 
    game_id,
    id as team_id,
    is_eliminated,
    created_at as joined_at
FROM teams;

-- Stap 7: Update scores - niet nodig, team_id blijft hetzelfde

-- Stap 8: Update players - niet nodig, team_id blijft hetzelfde

-- Stap 9: Drop oude teams tabel en hernoem nieuwe
DROP TABLE teams;
ALTER TABLE teams_new RENAME TO teams;

-- Stap 10: Maak indexes voor nieuwe structuur
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_game_teams_game_id ON game_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_team_id ON game_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_eliminated ON game_teams(is_eliminated);

-- Stap 11: Maak trigger voor updated_at
CREATE TRIGGER IF NOT EXISTS update_teams_timestamp 
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Stap 12: Herstel views met nieuwe structuur
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
"""

def run_migration():
    db_path = 'scoreboard.db'
    
    # Check if files exist
    if not os.path.exists(db_path):
        print(f"❌ Database niet gevonden: {db_path}")
        sys.exit(1)
    
    print("=" * 60)
    print("TEAM HERBRUIKBAARHEID MIGRATIE")
    print("=" * 60)
    print(f"Database: {db_path}")
    print()
    
    # Connect to database
    print("🔌 Verbinden met database...")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Check current state
        print("\n📊 Huidige database status:")
        cursor.execute("SELECT COUNT(*) as count FROM teams")
        old_team_count = cursor.fetchone()['count']
        print(f"   Teams in oude structuur: {old_team_count}")
        
        # Check if migration already done
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='game_teams'")
        if cursor.fetchone():
            print("\n⚠️  Migratie lijkt al uitgevoerd te zijn (game_teams tabel bestaat)!")
            response = input("Wil je toch doorgaan? Dit kan data dupliceren! (ja/nee): ")
            if response.lower() != 'ja':
                print("❌ Migratie geannuleerd.")
                conn.close()
                sys.exit(0)
        
        # Execute migration
        print("\n🚀 Uitvoeren migratie...")
        conn.executescript(MIGRATION_SQL)
        conn.commit()
        print("✅ Migratie SQL uitgevoerd!")
        
        # Verify results
        print("\n🔍 Verificatie resultaten:")
        
        cursor.execute("SELECT COUNT(*) as count FROM teams")
        new_team_count = cursor.fetchone()['count']
        print(f"   Teams in nieuwe structuur: {new_team_count}")
        
        cursor.execute("SELECT COUNT(*) as count FROM game_teams")
        relation_count = cursor.fetchone()['count']
        print(f"   Game-team relaties: {relation_count}")
        
        # Show sample teams
        cursor.execute("SELECT id, name, color FROM teams LIMIT 5")
        teams = cursor.fetchall()
        if teams:
            print("\n   Voorbeeld teams:")
            for team in teams:
                print(f"     - {team['id']}: {team['name']} ({team['color']})")
        
        # Check scores
        cursor.execute("SELECT COUNT(*) as count FROM scores")
        score_count = cursor.fetchone()['count']
        print(f"\n   Scores behouden: {score_count}")
        
        # Check players
        cursor.execute("SELECT COUNT(*) as count FROM players")
        player_count = cursor.fetchone()['count']
        print(f"   Spelers behouden: {player_count}")
        
        print("\n" + "=" * 60)
        print("✅ MIGRATIE SUCCESVOL VOLTOOID!")
        print("=" * 60)
        print("\n💡 Je kunt nu de backend herstarten en teams hergebruiken!")
        print("   Backup is opgeslagen als: scoreboard_backup_*.db")
        
    except Exception as e:
        print(f"\n❌ ERROR tijdens migratie:")
        print(f"   {str(e)}")
        print("\n🔄 Database wordt niet gecommit (rollback)")
        conn.rollback()
        print("\n💡 Je kunt de backup gebruiken om te herstellen:")
        print("   Copy-Item scoreboard_backup_*.db scoreboard.db")
        sys.exit(1)
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("\n⚠️  BELANGRIJK: Stop eerst de backend server!")
    print("   (Druk Ctrl+C in het terminal waar de server draait)\n")
    
    response = input("Is de backend gestopt? (ja/nee): ")
    if response.lower() != 'ja':
        print("❌ Migratie geannuleerd. Stop eerst de backend.")
        sys.exit(0)
    
    run_migration()
