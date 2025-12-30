#!/usr/bin/env python3
"""
Run a lightweight migration to add session_players table and make players.team_id nullable.
This attempts to preserve existing data. It will:
 - create `session_players` table if missing
 - if `players.team_id` is NOT NULL, recreate the `players` table allowing NULL and copy data

Use with caution and backup your `scoreboard.db` before running.
"""
import sqlite3
from pathlib import Path
import shutil
import sys

DB_PATH = Path(__file__).parent / "scoreboard.db"

def run_migration():
    if not DB_PATH.exists():
        print("Database not found, run init_database.py to create a fresh DB.")
        return 1

    backup = DB_PATH.with_suffix('.bak.db')
    print(f"Backing up database to {backup}")
    shutil.copy2(DB_PATH, backup)

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # Create session_players table if missing
    cur.execute('''
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
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_session_players_team_id ON session_players(team_id);')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_session_players_player_id ON session_players(player_id);')

    # Check players table nullability for team_id
    cur.execute("PRAGMA table_info(players);")
    cols = cur.fetchall()
    team_col = None
    for col in cols:
        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        if col[1] == 'team_id':
            team_col = col
            break

    if team_col and team_col[3] == 1:
        print("Players.team_id is NOT NULL - migrating to nullable column (preserving data)...")
        cur.executescript('''
        BEGIN;
        CREATE TABLE IF NOT EXISTS players_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NULL,
            name VARCHAR(100) NOT NULL,
            position VARCHAR(50) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
        );
        INSERT INTO players_new (id, team_id, name, position, created_at, updated_at)
            SELECT id, team_id, name, position, created_at, updated_at FROM players;
        DROP TABLE players;
        ALTER TABLE players_new RENAME TO players;
        COMMIT;
        ''')
        # recreate index and trigger
        try:
            cur.execute('CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);')
            cur.execute('''
            CREATE TRIGGER IF NOT EXISTS update_players_timestamp 
            AFTER UPDATE ON players
            BEGIN
                UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
            ''')
        except sqlite3.Error as e:
            print(f"Warning: could not recreate player indexes/triggers: {e}")
    else:
        print("Players.team_id already nullable or column missing; no players table migration needed.")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")
    return 0

if __name__ == '__main__':
    sys.exit(run_migration())
