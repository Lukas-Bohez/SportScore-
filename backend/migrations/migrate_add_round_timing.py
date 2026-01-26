"""
Migration script to add round timing and status fields to activities table
Run this script to update the database schema for round support
"""

import sqlite3
import os
from datetime import datetime

def migrate_database(db_path='sportscore.db'):
    """Add round timing and status fields to activities table"""
    
    print(f"[{datetime.now()}] Starting migration: Add round timing fields")
    
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(activities)")
        columns = [row[1] for row in cursor.fetchall()]
        
        migrations_applied = []
        
        # Add time_limit_per_round if it doesn't exist
        if 'time_limit_per_round' not in columns:
            print("Adding column: time_limit_per_round")
            cursor.execute("ALTER TABLE activities ADD COLUMN time_limit_per_round INTEGER NULL")
            migrations_applied.append('time_limit_per_round')
            
            # Migrate data from old time_limit column if it exists
            if 'time_limit' in columns:
                print("Migrating data from time_limit to time_limit_per_round")
                cursor.execute("UPDATE activities SET time_limit_per_round = time_limit WHERE time_limit IS NOT NULL")
        
        # Add round_status if it doesn't exist
        if 'round_status' not in columns:
            print("Adding column: round_status")
            cursor.execute("ALTER TABLE activities ADD COLUMN round_status TEXT DEFAULT 'not_started'")
            cursor.execute("UPDATE activities SET round_status = 'not_started' WHERE round_status IS NULL")
            migrations_applied.append('round_status')
        
        # Add round_start_time if it doesn't exist
        if 'round_start_time' not in columns:
            print("Adding column: round_start_time")
            cursor.execute("ALTER TABLE activities ADD COLUMN round_start_time TIMESTAMP NULL")
            migrations_applied.append('round_start_time')
        
        # Add round_end_time if it doesn't exist
        if 'round_end_time' not in columns:
            print("Adding column: round_end_time")
            cursor.execute("ALTER TABLE activities ADD COLUMN round_end_time TIMESTAMP NULL")
            migrations_applied.append('round_end_time')
        
        # Ensure default values for existing records
        print("Setting default values for existing activities")
        cursor.execute("UPDATE activities SET current_round = 1 WHERE current_round IS NULL")
        cursor.execute("UPDATE activities SET total_rounds = 1 WHERE total_rounds IS NULL")
        cursor.execute("UPDATE activities SET round_status = 'not_started' WHERE round_status IS NULL")
        
        conn.commit()
        
        if migrations_applied:
            print(f"✓ Migration completed successfully. Added columns: {', '.join(migrations_applied)}")
        else:
            print("✓ All columns already exist. No migration needed.")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(activities)")
        print("\nCurrent activities table structure:")
        for row in cursor.fetchall():
            print(f"  - {row[1]} ({row[2]})")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    import sys
    
    # Allow custom database path as argument
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'sportscore.db'
    
    print("=" * 60)
    print("MIGRATION: Add Round Timing and Status Fields")
    print("=" * 60)
    
    success = migrate_database(db_path)
    
    if success:
        print("\n✓ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Migration failed!")
        sys.exit(1)
