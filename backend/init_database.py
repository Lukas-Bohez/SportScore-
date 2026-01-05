#!/usr/bin/env python3
"""
Initialize SQLite database for TeamScore application.
Reads the schema from database_schema_sqlite.sql and creates all tables.
"""
import sqlite3
import os
from pathlib import Path

# Get the backend directory
BACKEND_DIR = Path(__file__).parent
DB_PATH = BACKEND_DIR / "scoreboard.db"
SCHEMA_PATH = BACKEND_DIR / "database_schema_sqlite.sql"


def init_database():
    """Initialize the SQLite database with the schema"""
    print(f"Initializing SQLite database at: {DB_PATH}")
    
    # Remove old database if it exists
    if DB_PATH.exists():
        print(f"Removing existing database: {DB_PATH}")
        os.remove(DB_PATH)
    
    # Read the schema file
    if not SCHEMA_PATH.exists():
        print(f"ERROR: Schema file not found at {SCHEMA_PATH}")
        return False
    
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    # Create database and execute schema
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Execute the schema (split by semicolon to handle multiple statements)
        cursor.executescript(schema_sql)
        
        conn.commit()
        conn.close()
        
        print("Database initialized successfully!")
        print(f"Database file created at: {DB_PATH}")
        
        # Verify tables were created
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        conn.close()
        
        print(f"Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"ERROR: Failed to initialize database: {e}")
        return False


if __name__ == "__main__":
    success = init_database()
    exit(0 if success else 1)
