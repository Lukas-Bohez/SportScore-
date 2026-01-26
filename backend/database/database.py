import sqlite3
from typing import List, Dict, Any, Optional
import threading
from .config import DB_PATH

class Database:
    # Thread-local storage prevents weak reference issues
    _local = threading.local()

    @classmethod
    def __open_connection(cls):
        """Open connection thread-safe using thread-local storage"""
        try:
            if not hasattr(cls._local, 'db'):
                # Connect to SQLite database with proper thread safety
                cls._local.db = sqlite3.connect(DB_PATH, timeout=10.0)
                # Enable dictionary-style row access
                cls._local.db.row_factory = sqlite3.Row
                cls._local.cursor = cls._local.db.cursor()
        except sqlite3.Error as err:
            print(f"Database connection error: {err}")
            raise

    @classmethod
    def __close_connection(cls):
        """Close connection"""
        if hasattr(cls._local, 'cursor'):
            cls._local.cursor.close()
            del cls._local.cursor
        if hasattr(cls._local, 'db'):
            cls._local.db.close()
            del cls._local.db

    @classmethod
    def get_rows(cls, sql_query, params=None):
        """Get multiple rows"""
        try:
            cls.__open_connection()
            cls._local.cursor.execute(sql_query, params or [])
            # Convert Row objects to dictionaries
            rows = cls._local.cursor.fetchall()
            return [dict(row) for row in rows] if rows else []
        except Exception as error:
            print(f"Query error: {error}")
            return None
        finally:
            cls.__close_connection()

    @classmethod
    def get_one_row(cls, sql_query, params=None):
        """Get single row"""
        try:
            cls.__open_connection()
            cls._local.cursor.execute(sql_query, params or [])
            row = cls._local.cursor.fetchone()
            # Convert Row object to dictionary
            return dict(row) if row else None
        except Exception as error:
            print(f"Query error: {error}")
            return None
        finally:
            cls.__close_connection()

    @classmethod
    def execute_sql(cls, sql_query, params=None):
        """Execute SQL query. Returns results for SELECT, rowid/count for INSERT/UPDATE/DELETE. Raises on error."""
        try:
            cls.__open_connection()
            cls._local.cursor.execute(sql_query, params or [])

            query_type = sql_query.strip().upper().split()[0]

            if query_type == 'SELECT':
                rows = cls._local.cursor.fetchall()
                return [dict(row) for row in rows] if rows else []
            else:
                cls._local.db.commit()
                if cls._local.cursor.lastrowid:
                    return cls._local.cursor.lastrowid
                return cls._local.cursor.rowcount

        except sqlite3.Error as error:
            if hasattr(cls._local, 'db'):
                cls._local.db.rollback()
            print(f"Execute error: {error}")
            raise  # Re-raise so caller can handle appropriately
        finally:
            cls.__close_connection()