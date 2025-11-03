from mysql import connector
from typing import List, Dict, Any, Optional
import threading
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Database:
    # Thread-local storage prevents weak reference issues
    _local = threading.local()

    @classmethod
    def __open_connection(cls):
        """Open connection thread-safe"""
        try:
            if not hasattr(cls._local, 'db'):
                db_config = {
                    'host': os.getenv('DB_HOST', 'localhost'),
                    'user': os.getenv('DB_USER', 'root'),
                    'password': os.getenv('DB_PASSWORD', ''),
                    'database': os.getenv('DB_NAME', 'scoreboard'),
                    'port': int(os.getenv('DB_PORT', 3306))
                }
                cls._local.db = connector.connect(**db_config)
                cls._local.cursor = cls._local.db.cursor(dictionary=True, buffered=True)
        except connector.Error as err:
            if err.errno == connector.errorcode.ER_ACCESS_DENIED_ERROR:
                print("Error: Database access denied. Check credentials.")
            elif err.errno == connector.errorcode.ER_BAD_DB_ERROR:
                print("Error: Database does not exist.")
            else:
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
            cls._local.cursor.execute(sql_query, params)
            return cls._local.cursor.fetchall()
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
            cls._local.cursor.execute(sql_query, params)
            return cls._local.cursor.fetchone()
        except Exception as error:
            print(f"Query error: {error}")
            return None
        finally:
            cls.__close_connection()

    @classmethod
    def execute_sql(cls, sql_query, params=None):
        """Execute SQL query"""
        try:
            cls.__open_connection()
            cls._local.cursor.execute(sql_query, params)

            query_type = sql_query.strip().upper().split()[0]

            if query_type == 'SELECT':
                return cls._local.cursor.fetchall()
            else:
                cls._local.db.commit()
                if cls._local.cursor.lastrowid:
                    return cls._local.cursor.lastrowid
                return cls._local.cursor.rowcount

        except connector.Error as error:
            if hasattr(cls._local, 'db'):
                cls._local.db.rollback()
            print(f"Execute error: {error}")
            return None
        finally:
            cls.__close_connection()