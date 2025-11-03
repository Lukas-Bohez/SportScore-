# Scoreboard System

## ⚠️ IMPORTANT: Admin Password
**Admin Password: `admin123`**

Use this password to access the admin interface at `http://localhost:3000/startscreen.html`

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
│   ├── admin.html            # Admin interface
│   ├── css/
│   │   ├── styles.css        # Big screen styles
│   │   └── admin.css         # Admin interface styles
│   └── js/
│       ├── api.js            # API client and Socket.IO
│       ├── bigscreen.js      # Big screen functionality
│       └── admin.js          # Admin interface functionality
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
- **Big Screen Display** (`index.html`): Live game display with real-time updates
- **Admin Interface** (`admin.html`): Complete management system for all data
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
   The API will be available at `http://localhost:8000`

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

### Admin Interface
- Open `http://localhost:3000/admin.html` in a browser
- Manage all aspects of the scoreboard system:
  - **Sports**: Add/edit/delete sports
  - **Teams**: Create teams and assign to sports
  - **Players**: Manage team rosters
  - **Games**: Schedule and manage games
  - **Scores**: Record scores and track game progress
  - **History**: View completed games

## API Endpoints

### Sports
- `GET /sports` - List all sports
- `POST /sports` - Create new sport
- `PUT /sports/{id}` - Update sport
- `DELETE /sports/{id}` - Delete sport

### Teams
- `GET /teams` - List all teams
- `POST /teams` - Create new team
- `PUT /teams/{id}` - Update team
- `DELETE /teams/{id}` - Delete team

### Players
- `GET /players` - List all players
- `POST /players` - Create new player
- `PUT /players/{id}` - Update player
- `DELETE /players/{id}` - Delete player

### Games
- `GET /games` - List all games
- `POST /games` - Create new game
- `PUT /games/{id}` - Update game
- `DELETE /games/{id}` - Delete game
- `POST /games/{id}/start` - Start game
- `POST /games/{id}/end` - End game
- `POST /games/{id}/pause` - Pause game
- `POST /games/{id}/resume` - Resume game

### Scores
- `GET /scores` - List all scores
- `POST /scores` - Create new score
- `PUT /scores/{id}` - Update score
- `DELETE /scores/{id}` - Delete score

### Live Data
- `GET /live` - Get current live game data
- `GET /history` - Get game history

## Real-time Updates

The system uses Socket.IO for real-time communication:
- `game_update`: Fired when game data changes
- `score_update`: Fired when scores are updated
- `game_status_change`: Fired when game status changes

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

## Technologies Used

- **Backend**: Python, FastAPI, Socket.IO, MySQL, Pydantic
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Socket.IO client
- **Database**: MySQL
- **Real-time**: Socket.IO
- **Styling**: Modern CSS with gradients and animations

## License

This project is open source and available under the MIT License.