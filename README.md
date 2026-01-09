# SportScore
The repository for development for our SportScore! team project.

## Linux Setup

The application is set up to run on Linux with Apache2 hosting the frontend and a systemd service for the backend.

### Prerequisites
- Python 3
- Apache2
- SQLite

### Setup Steps
1. Virtual environment is created in `backend/venv/`
2. Dependencies installed from `backend/requirements.txt`
3. Database initialized in `backend/scoreboard.db`
4. Apache2 configured to serve frontend from `/var/www/sportscore`
5. Backend service created as `sportscore-backend.service`

### Running the Application
- Frontend: http://localhost
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

Run `./backend/launch_linux.sh` to ensure services are running.

### Services
- Backend: `sudo systemctl status sportscore-backend` (auto-reloads on code changes)
- Frontend: `sudo systemctl status apache2`

Both services start automatically on boot.
