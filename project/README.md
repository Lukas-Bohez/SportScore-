# Scoreboard Backend

A FastAPI-based backend for managing sports scoreboards with real-time updates via Socket.IO.

## ✅ Compatibility

This application is fully compatible with both **Windows** and **Linux** systems. All tests pass on Windows 11 and should work identically on Linux distributions.

### Tested Components:
- ✅ Python imports and dependencies
- ✅ Pydantic model validation
- ✅ Cross-platform path operations
- ✅ Socket.IO setup
- ✅ FastAPI application structure

## Setup

### 1. Clone/Download the Project

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

Copy `.env` and update database credentials:
```bash
cp .env .env.local  # Optional: create local config
```

Edit `.env` with your database settings:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=scoreboard
DB_PORT=3306
```

### 5. Database Setup

Run the SQL schema to create tables:
```bash
mysql -u your_username -p < database_schema.sql
```

### 6. Run the Application

**Option 1: Using the cross-platform run script**
```bash
python run.py
```

**Option 2: Direct execution**
```bash
python app.py
```

**Option 3: Using uvicorn directly**
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

Test compatibility and basic functionality:
```bash
python test_compatibility.py
```

## API Endpoints

### Sports
- `GET /api/v1/sports` - List all sports
- `POST /api/v1/sports` - Create a new sport
- `GET /api/v1/sports/{id}` - Get sport by ID
- `PUT /api/v1/sports/{id}` - Update sport
- `DELETE /api/v1/sports/{id}` - Delete sport

### Teams
- `GET /api/v1/teams` - List all teams (filter by sport_id)
- `POST /api/v1/teams` - Create a new team
- `GET /api/v1/teams/{id}` - Get team by ID
- `PUT /api/v1/teams/{id}` - Update team
- `DELETE /api/v1/teams/{id}` - Delete team

### Players
- `GET /api/v1/players` - List all players (filter by team_id)
- `POST /api/v1/players` - Create a new player
- `GET /api/v1/players/{id}` - Get player by ID
- `PUT /api/v1/players/{id}` - Update player
- `DELETE /api/v1/players/{id}` - Delete player

### Score Types
- `GET /api/v1/score-types` - List all score types
- `POST /api/v1/score-types` - Create a new score type
- `GET /api/v1/score-types/{id}` - Get score type by ID
- `PUT /api/v1/score-types/{id}` - Update score type
- `DELETE /api/v1/score-types/{id}` - Delete score type

### Games
- `GET /api/v1/games` - List all games (filter by sport_id)
- `POST /api/v1/games` - Create a new game
- `GET /api/v1/games/{id}` - Get game by ID
- `PUT /api/v1/games/{id}` - Update game
- `DELETE /api/v1/games/{id}` - Delete game
- `GET /api/v1/games/{id}/score-summary` - Get score summary for a game

### Scores
- `GET /api/v1/scores` - List all scores (filter by game_id or team_id)
- `POST /api/v1/scores` - Create a new score (triggers real-time update)
- `GET /api/v1/scores/{id}` - Get score by ID
- `PUT /api/v1/scores/{id}` - Update score
- `DELETE /api/v1/scores/{id}` - Delete score

## Real-time Events

Connect to `/socket.io` for real-time updates:

- `score_update`: Emitted when a new score is added
- `welcome`: Sent to new clients upon connection

## Database Schema

The application expects the following tables:

- `sports` (id, name, description)
- `teams` (id, name, sport_id)
- `players` (id, name, team_id)
- `score_types` (id, name, description)
- `games` (id, sport_id, team1_id, team2_id, start_time, end_time, status)
- `scores` (id, game_id, team_id, score_type_id, value, player_id, timestamp)

## Development

- The app runs on port 8000 by default
- Auto-reload is enabled for development
- CORS is configured to allow all origins
- API documentation available at `/docs`
- Alternative API docs at `/redoc`

## Project Structure

```
project/
├── app.py                    # Main FastAPI application
├── run.py                    # Cross-platform run script
├── test_compatibility.py     # Compatibility test suite
├── requirements.txt          # Python dependencies
├── .env                      # Environment configuration
├── database_schema.sql       # Database schema
├── README.md                 # This file
├── database/
│   ├── __init__.py
│   ├── database.py           # MySQL connection class
│   └── datarepository.py     # Data access layer
└── models/
    ├── __init__.py
    └── models.py             # Pydantic models
```