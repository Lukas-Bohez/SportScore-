# Scoreboard System

## ⚠️ IMPORTANT: Admin Password
**Admin Password: `admin123`**

Use this password to access the start screen at `http://localhost:3000/startscreen.html`

---

A complete real-time scoreboard system with FastAPI backend and modern HTML/CSS/JavaScript frontend.

## Project Structure

```
project/
├── backend/                    # FastAPI backend
│   ├── app.py                 # Main FastAPI application
│   ├── database/              # Database configuration and models
│   ├── models/                # Pydantic models
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                 # Server startup script
│   └── database_schema.sql    # MySQL database schema
├── frontend/                  # Frontend application
│   ├── index.html            # Big screen display
│   ├── startscreen.html      # Start / session hub
│   ├── teamsetup.html        # Configure teams for a session
│   ├── scoreinput.html       # Input scores during a session
│   ├── leaderboard.html      # Live leaderboard
│   ├── css/
│   │   ├── styles.css        # Big screen styles
│   │   └── admin.css         # Admin interface styles
│   └── js/
│       ├── api.js            # API client and Socket.IO
│       ├── bigscreen.js      # Big screen functionality
│       ├── startscreen.js    # Start/session logic
│       ├── teamsetup.js      # Team setup logic
│       ├── scoreinput.js     # Score input logic
│       └── leaderboard.js    # Leaderboard logic
├── serve_frontend.py          # Simple HTTP server for frontend
└── README.md                 # This file
```

## Features

### Backend (FastAPI)
- RESTful API for managing sports, teams, players, games, and scores
- Real-time updates using Socket.IO
- MySQL database integration
- Rate limiting and CORS support
- Comprehensive error handling

### Frontend
- **Big Screen Display** (`index.html`): Live display with real-time updates
- **Start Screen** (`startscreen.html`): Create/continue sessions and see recent ones
- **Team Setup** (`teamsetup.html`): Manage teams within a session
- **Score Input** (`scoreinput.html`): Record points for teams
- **Leaderboard** (`leaderboard.html`): View session standings
- Responsive design for various screen sizes
- Real-time score updates and game status

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up MySQL database:
   - Create a MySQL database
   - Run the schema file:
     ```sql
     mysql -u your_username -p your_database < database_schema.sql
     ```

5. Configure database connection:
   - Edit `backend/database/config.py` with your database credentials

6. Start the backend server:
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:8000` (Swagger at `/docs`)

### 2. Frontend Setup

1. Start the frontend server:
   ```bash
   python serve_frontend.py
   ```
   The frontend will be available at `http://localhost:3000`

## Usage

### Big Screen Display
- Open `http://localhost:3000/index.html` in a browser
- Displays live game information with real-time updates
- Shows team names, scores, game time, and score breakdown

### Start Screen / Sessions
- Open `http://localhost:3000/startscreen.html` in a browser
- Create a new session or continue an active one; view recent sessions

## API Endpoints

All REST endpoints are prefixed with `/api/v1`.

### Sports
- `GET /api/v1/sports` - List all sports
- `POST /api/v1/sports` - Create new sport
- `PUT /api/v1/sports/{id}` - Update sport
- `DELETE /api/v1/sports/{id}` - Delete sport

### Teams
- `GET /api/v1/teams` - List all teams
- `POST /api/v1/teams` - Create new team
- `PUT /api/v1/teams/{id}` - Update team
- `DELETE /api/v1/teams/{id}` - Delete team

### Players
- `GET /api/v1/players` - List all players
- `POST /api/v1/players` - Create new player
- `PUT /api/v1/players/{id}` - Update player
- `DELETE /api/v1/players/{id}` - Delete player

### Games
- `GET /api/v1/games` - List all games
- `POST /api/v1/games` - Create new game
- `PUT /api/v1/games/{id}` - Update game
- `DELETE /api/v1/games/{id}` - Delete game
- `POST /api/v1/games/{id}/start` - Start game
- `POST /api/v1/games/{id}/end` - End game
- `POST /api/v1/games/{id}/pause` - Pause game
- `POST /api/v1/games/{id}/resume` - Resume game

### Scores
- `GET /api/v1/scores` - List all scores
- `POST /api/v1/scores` - Create new score
- `PUT /api/v1/scores/{id}` - Update score
- `DELETE /api/v1/scores/{id}` - Delete score

### Sessions
- `GET /api/v1/sessions` - List sessions
- `POST /api/v1/sessions` - Create session
- `GET /api/v1/sessions/active` - Get active session
- `PUT /api/v1/sessions/{id}` - Update session

### Live Data
- `GET /api/v1/live/leaderboard` - Get live leaderboard for active session

## Real-time Updates

The system uses Socket.IO for real-time communication:
- `session_created`: Fired when a new session is created
- `session_update`: Fired when a session is updated
- `team_update`: Fired when a session team is created/updated/deleted
- `session_score_update`: Fired when a session score is recorded
- `game_update`: Fired when game data changes (legacy)
- `score_update`: Fired when scores are updated (legacy)
- `game_status_change`: Fired when game status changes (legacy)

## Development

### Running Tests
```bash
cd backend
python -m pytest
```

### Database Migrations
When updating the database schema:
1. Update `database_schema.sql`
2. Run the SQL file against your database
3. Update the models if necessary

### Adding New Features
1. Backend: Add routes to `app.py` and models to `models/`
2. Frontend: Update HTML, CSS, and JavaScript files
3. Test thoroughly with both interfaces

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in the startup scripts
2. **Database connection failed**: Check credentials in `database/config.py`
3. **Frontend not loading**: Ensure both backend and frontend servers are running
4. **Real-time updates not working**: Check browser console for Socket.IO errors

### Logs
- Backend logs are displayed in the terminal
- Frontend errors appear in browser developer console
- Use `python test_connectivity.py` at repo root to quickly check ports 8000/3000 and API reachability

## Technologies Used

- **Backend**: Python, FastAPI, Socket.IO, MySQL, Pydantic
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Socket.IO client
- **Database**: MySQL
- **Real-time**: Socket.IO
- **Styling**: Modern CSS with gradients and animations

## License

This project is open source and available under the MIT License.