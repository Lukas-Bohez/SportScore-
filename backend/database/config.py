from pathlib import Path

# Path to the SQLite database file (backend/scoreboard.db)
DB_PATH = str((Path(__file__).parent.parent / "scoreboard.db").resolve())
