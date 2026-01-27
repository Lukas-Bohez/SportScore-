#!/usr/bin/env python3
"""Recreate the SQLite database from the provided SQL schema.

Usage: python3 recreate_database.py

This script will:
- Backup existing `backend/scoreboard.db` to `backend/scoreboard.db.bak.YYYYMMDD_HHMMSS` if it exists
- Create a fresh `backend/scoreboard.db` and apply `database_schema_sqlite.sql`
"""

from pathlib import Path
import sqlite3
import shutil
import sys
import datetime

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "scoreboard.db"
SCHEMA_PATH = ROOT / "database_schema_sqlite.sql"


def main():
    if not SCHEMA_PATH.exists():
        print(f"Schema file not found: {SCHEMA_PATH}")
        sys.exit(2)

    # Backup existing DB if present
    if DB_PATH.exists():
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = DB_PATH.with_suffix(f".db.bak.{stamp}")
        shutil.copy2(DB_PATH, backup)
        print(f"Existing DB backed up to: {backup}")
        DB_PATH.unlink()
        print(f"Removed existing DB: {DB_PATH}")

    # Create new DB and apply schema
    try:
        sql = SCHEMA_PATH.read_text(encoding="utf-8")
        conn = sqlite3.connect(str(DB_PATH))
        conn.executescript(sql)
        conn.commit()
        conn.close()
        print(f"New database created and schema applied at: {DB_PATH}")

        # Quick verification: list tables
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        cur.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name;")
        rows = cur.fetchall()
        print("Created objects:")
        for name, objtype in rows:
            print(f" - {objtype}: {name}")
        conn.close()

    except Exception as e:
        print(f"Error creating database: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
