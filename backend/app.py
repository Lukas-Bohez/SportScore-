import socketio
import asyncio
import uvicorn
import time
from datetime import datetime, timezone, timedelta
import pytz
from fastapi import FastAPI, HTTPException, status, Body, Header, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import threading
from threading import Lock
import logging




# Import the new repository
from backend.database.datarepository import (
    SportRepository, TeamRepository, PlayerRepository,
    ScoreTypeRepository, GameRepository, ScoreRepository,
    SessionRepository, SessionTeamRepository, SessionScoreRepository,
    SessionPlayerRepository, SessionTemplateRepository,
    ActivityRepository, ActivityTeamRepository, ActivityPlayerRepository, ActivityScoreRepository
)

# Import models
from backend.models.models import (
    SportBase, SportCreate, SportUpdate, SportResponse, SportListResponse,
    TeamBase, TeamCreate, TeamUpdate, TeamResponse, TeamListResponse,
    PlayerBase, PlayerCreate, PlayerUpdate, PlayerResponse, PlayerListResponse,
    ScoreTypeBase, ScoreTypeCreate, ScoreTypeUpdate, ScoreTypeResponse, ScoreTypeListResponse,
    GameBase, GameCreate, GameUpdate, GameResponse, GameListResponse,
    ScoreBase, ScoreCreate, ScoreUpdate, ScoreResponse, ScoreListResponse,
    SessionBase, SessionCreate, SessionUpdate, SessionResponse, SessionListResponse,
    SessionTeamBase, SessionTeamCreate, SessionTeamUpdate, SessionTeamResponse, SessionTeamListResponse,
    SessionScoreBase, SessionScoreCreate, SessionScoreUpdate, SessionScoreResponse, SessionScoreListResponse,
    SessionPlayerBase, SessionPlayerCreate, SessionPlayerUpdate, SessionPlayerResponse, SessionPlayerListResponse,
    ActivityCreate, ActivityUpdate, ActivityResponse, ActivityListResponse,
    ActivityTeamResponse, ActivityTeamListResponse,
    ActivityPlayerResponse, ActivityPlayerListResponse,
    ActivityScoreCreate, ActivityScoreResponse, ActivityScoreListResponse,
    ErrorMessage, ErrorNotFound, ScoreUpdateMessage, GameStatusUpdate
)

from typing import Dict, Any, Optional, List
from fastapi.responses import JSONResponse, Response
from fastapi import Request
from fastapi import Query
import queue
from uuid import uuid4
import json
import os
import subprocess

# ----------------------------------------------------
# Logging Setup
# ----------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# Admin secret for sensitive operations; set in environment for production
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "changeme")

# ----------------------------------------------------
# App setup
# ----------------------------------------------------

app = FastAPI(
    title="Scoreboard Backend",
    version="1.0.0",
    description="REST + Socket.IO backend for SportScore. All REST endpoints are prefixed with /api/v1."
)

# -----------------------------------------------------------------------------
# Developer TOC / Module layout
# -----------------------------------------------------------------------------
# Sections in this module (helpful pointers for contributors):
# - Socket.IO setup & event handlers
# - Background tasks (round timer monitor)
# - API Routes (grouped): Sessions, Session Teams, Activities, Activity Rounds,
#   Activity Teams/Players/Scores, Teams (standalone), Players, Scores (session scoped),
#   Admin/System, Health
# - Utilities & misc (test endpoints, preflight handler)
#
# For larger refactors, consider moving related endpoints to FastAPI routers
# in `backend/routes/` and importing them here to keep this file concise.
# -----------------------------------------------------------------------------

# ----------------------------------------------------
# Helpers (moved to `backend/api_helpers.py` to improve readability and avoid clutter)
# ----------------------------------------------------
from backend.utils.api_helpers import _jsonable, _normalize_activity, CET

# CORS middleware - allow all origins for development
ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers (moved routes live in backend/routes/*.py)
from backend.routes.sessions import router as sessions_router
app.include_router(sessions_router)



sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi',
    logger=False
)
# Register sio instance in central manager so other modules can emit events without importing app
from backend.utils.socketio_manager import set_sio, add_client, remove_client, set_client_type, is_admin, get_connected_count, get_admin_count, get_sio
set_sio(sio)

ENDPOINT = "/api/v1"  # API base endpoint



# Expose Socket.IO as the top-level ASGI app to avoid duplicate CORS headers on /socket.io
asgi = socketio.ASGIApp(sio, app, socketio_path='socket.io')

# ----------------------------------------------------
# Socket.IO event handlers
# ----------------------------------------------------

@sio.event
async def connect(sid, environ):
    # Register client in central manager
    add_client(sid, None)
    print(f"Client {sid} connected - Total clients: {get_connected_count()}")

    # Send welcome message
    await sio.emit('welcome', {
        'message': 'Successfully connected to scoreboard server',
        'client_id': sid,
        'timestamp': datetime.now(CET).isoformat()
    }, room=sid)

@sio.event
async def disconnect(sid, reason=None):
    # Check admin state before removal
    was_admin = is_admin(sid)
    remove_client(sid)
    print(f"Client {sid} disconnected - Total clients: {get_connected_count()}")

    if was_admin:
        print(f"Admin {sid} removed - Remaining admins: {get_admin_count()}")
        # If no more admins, show QR code
        if get_admin_count() == 0:
            print("No admins connected - showing QR code")
            sio = get_sio()
            if sio:
                await sio.emit('set-qr', True)

@sio.event
async def admin_connected(sid):
    print(f"Admin connected: {sid}")
    set_client_type(sid, 'admin')
    print(f"Total admins: {get_admin_count()}")
    
    # Hide QR code when admin connects
    sio = get_sio()
    if sio:
        await sio.emit('set-qr', False)

@sio.event
async def admin_disconnected(sid):
    print(f"Admin disconnected: {sid}")
    was_admin = is_admin(sid)
    remove_client(sid)
    if was_admin:
        print(f"Remaining admins: {get_admin_count()}")
        
        # If no more admins, show QR code
        if get_admin_count() == 0:
            print("No admins connected - showing QR code")
            sio = get_sio()
            if sio:
                await sio.emit('set-qr', True)

@sio.on('set-qr')
async def set_qr(sid, data=None):
    print(f"Set QR requested: {data}")
    sio = get_sio()
    if sio:
        await sio.emit('set-qr', data)

@sio.on('qr-state')
async def qr_state(sid, data=None):
    print(f"QR state update: {data}")
    sio = get_sio()
    if sio:
        await sio.emit('qr-state', data)

@sio.on('set_active_activity')
async def set_active_activity(sid, data=None):
    print(f"Admin set active activity: {data}")
    # Broadcast to all connected clients (including BigScreen)
    sio = get_sio()
    if sio:
        await sio.emit('set_active_activity', data)

# ----------------------------------------------------
# Background Task: Round Timer Monitor
# ----------------------------------------------------

async def round_timer_monitor():
    """
    Background task that monitors active rounds with time limits
    and automatically advances them when time expires.
    """
    logger.info("Round timer monitor started")
    
    while True:
        try:
            # Check every 1 second
            await asyncio.sleep(1)
            
            # Get all active rounds with time limits
            from backend.database.database import Database
            sql = """
            SELECT id, current_round, total_rounds, round_start_time, time_limit_per_round, session_id
            FROM activities
            WHERE round_status = 'active' 
            AND time_limit_per_round IS NOT NULL 
            AND round_start_time IS NOT NULL
            """
            active_rounds = Database.get_rows(sql)
            
            if not active_rounds:
                continue
            
            now = datetime.now(CET)
            
            for activity in active_rounds:
                activity_id = activity['id']
                round_start_time = activity['round_start_time']
                time_limit = activity['time_limit_per_round']
                current_round = activity['current_round']
                total_rounds = activity['total_rounds']
                
                try:
                    # Parse start time
                    start_dt = datetime.fromisoformat(round_start_time.replace('Z', '+00:00'))
                    if start_dt.tzinfo is None:
                        start_dt = CET.localize(start_dt)
                    
                    # Calculate elapsed time
                    elapsed_seconds = (now - start_dt).total_seconds()
                    remaining_seconds = time_limit - elapsed_seconds
                    
                    # Emit periodic time updates (every 5 seconds for efficiency)
                    if int(elapsed_seconds) % 5 == 0 and remaining_seconds > 0:
                        await sio.emit('round_time_update', _jsonable({
                            'activity_id': activity_id,
                            'current_round': current_round,
                            'time_remaining': int(remaining_seconds),
                            'time_elapsed': int(elapsed_seconds),
                            'timestamp': now.isoformat()
                        }))
                    
                    # Time's up - advance or complete the activity
                    if elapsed_seconds >= time_limit:
                        logger.info(f"Activity {activity_id} round {current_round} time limit reached")
                        
                        if current_round < total_rounds:
                            # Advance to next round
                            logger.info(f"Advancing activity {activity_id} to round {current_round + 1}")
                            ActivityRepository.update_activity(
                                activity_id,
                                current_round=current_round + 1,
                                round_status='not_started',
                                round_start_time=None,
                                round_end_time=now.isoformat()
                            )
                            
                            await sio.emit('round_auto_advanced', _jsonable({
                                'activity_id': activity_id,
                                'previous_round': current_round,
                                'current_round': current_round + 1,
                                'total_rounds': total_rounds,
                                'reason': 'time_limit_reached',
                                'timestamp': now.isoformat()
                            }))
                        else:
                            # Last round complete - mark activity as completed
                            logger.info(f"Activity {activity_id} all rounds completed")
                            ActivityRepository.update_activity(
                                activity_id,
                                round_status='completed',
                                status='completed',
                                round_end_time=now.isoformat()
                            )
                            
                            await sio.emit('activity_completed', _jsonable({
                                'activity_id': activity_id,
                                'total_rounds': total_rounds,
                                'reason': 'all_rounds_completed',
                                'timestamp': now.isoformat()
                            }))
                
                except Exception as e:
                    logger.error(f"Error processing round timer for activity {activity_id}: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error in round_timer_monitor: {e}")
            await asyncio.sleep(5)  # Wait before retrying

# Start background task when app starts
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(round_timer_monitor())

    # Developer-friendly: log available API routes (helps during development)
    try:
        api_routes = [r for r in app.routes if getattr(r, 'path', '').startswith(ENDPOINT)]
        logger.info(f"Registered API routes ({len(api_routes)}):")
        for r in api_routes:
            methods = getattr(r, 'methods', None)
            logger.info(f"  {', '.join(sorted(methods)) if methods else ''} {r.path}")
    except Exception:
        logger.exception("Failed to enumerate routes on startup")

    logger.info("Application startup complete")

# ----------------------------------------------------
# API Routes
# ----------------------------------------------------

# (Sports endpoints removed) — unused by frontend and removed to declutter API docs

# Teams and Players routes moved to `backend/routes/teams.py` and `backend/routes/players.py` for improved modularity.
from backend.routes.teams import router as teams_router
from backend.routes.players import router as players_router
from backend.routes.bigscreen import router as bigscreen_router
app.include_router(teams_router)
app.include_router(players_router)
app.include_router(bigscreen_router)

async def delete_player(player_id: int):
    success = PlayerRepository.delete_player(player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete player")
    return {"message": "Player deleted successfully"}


# Session assignment endpoints moved to `backend/routes/sessions.py` (see `sessions_router`).
# GET /api/v1/sessions/{session_id}/participants moved to `backend/routes/sessions.py` as well.


@app.get(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players")
async def get_session_team_players(session_id: int, team_id: int):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    players = SessionPlayerRepository.get_players_by_session_team(session_id, team_id)
    return {"players": players}


# Removed: /players/{player_id}/team endpoint (unused). Use player update flows via /players/{id} instead.

# Score Types endpoints removed — not referenced by frontend and removed to simplify API surface.

# Games endpoints removed — not used by frontend. Reintroduced only if required by external integrations.
# (Game score summary removed along with game CRUD.)

# ===========================================
# Session Endpoints (Teambuilding)
# ===========================================

# GET /api/v1/sessions moved to `backend/routes/sessions.py` (see `sessions_router`).

# POST /api/v1/sessions moved to `backend/routes/sessions.py` (see `sessions_router`).

# GET /api/v1/sessions/active moved to `backend/routes/sessions.py` (see `sessions_router`).

# GET /api/v1/sessions/{session_id} moved to `backend/routes/sessions.py` (see `sessions_router`).

# PUT /api/v1/sessions/{session_id} moved to `backend/routes/sessions.py` (see `sessions_router`).

# DELETE /api/v1/sessions/{session_id} moved to `backend/routes/sessions.py` (see `sessions_router`).

# Session Teams endpoints moved to `backend/routes/sessions.py` (see `sessions_router`).

# POST /api/v1/sessions/{session_id}/teams moved to `backend/routes/sessions.py` (see `sessions_router`).


# GET /api/v1/sessions/{session_id}/teams/{team_id}/players moved to `backend/routes/sessions.py` (see `sessions_router`).


# POST /api/v1/sessions/{session_id}/teams/{team_id}/players moved to `backend/routes/sessions.py` (see `sessions_router`).

# PUT /api/v1/sessions/{session_id}/teams/{team_id} moved to `backend/routes/sessions.py` (see `sessions_router`).

# DELETE /api/v1/sessions/{session_id}/teams/{team_id} moved to `backend/routes/sessions.py` (see `sessions_router`).

# Activities routes moved to `backend/routes/activities.py` to improve readability and modularity.
from backend.routes.activities import router as activities_router
app.include_router(activities_router)
app.include_router(teams_router)
app.include_router(players_router)
from backend.routes.system import router as system_router
app.include_router(system_router)

# Delete activity endpoint moved to `backend/routes/activities.py` (see `activities_router`)

# ============================================================================
# Round Control endpoints moved to `backend/routes/activities.py` (see `activities_router`) - start/end/next/pause/resume/status are implemented there.

# ============================================================================
# End Round Control Endpoints
# ============================================================================



# Activity Teams moved to `backend/routes/activities.py` (see `activities_router`)

# Activity Teams endpoints moved to `backend/routes/activities.py` (see `activities_router`) — add/remove handled there.

# Activity Players moved to `backend/routes/activities.py` (see `activities_router`)

# Activity Scores endpoints moved to `backend/routes/activities.py` (see `activities_router`) — scoring handled there.


# Activity leaderboard moved to `backend/routes/activities.py` (see `activities_router`)

# Session Scores Endpoints
@app.get(
    f"{ENDPOINT}/sessions/{{session_id}}/scores",
    response_model=SessionScoreListResponse,
    tags=["Session Scores"],
    summary="List scores for a session"
)
async def get_session_scores(session_id: int):
    scores = SessionScoreRepository.get_scores_by_session(session_id)
    return SessionScoreListResponse(scores=[SessionScoreResponse(**score) for score in scores])

@app.post(
    f"{ENDPOINT}/sessions/{{session_id}}/scores",
    response_model=SessionScoreResponse,
    tags=["Session Scores"],
    summary="Create a score in a session"
)
async def create_session_score(session_id: int, score: SessionScoreCreate):
    if score.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    # NOTE: Previously we updated team score here which created a duplicate score entry
    # (SessionTeamRepository.update_team_score now creates a score row for backwards compatibility).
    # Creating the session score below already inserts the score row, so calling
    # update_team_score here results in two rows per submission. Remove the extra call.

    # Check if team should be eliminated (only for elimination mode)
    session = SessionRepository.get_session_by_id(session_id)
    if session and session['game_type'] == 'elimination':
        team = SessionTeamRepository.get_team_by_id(score.team_id)
        if team:
            new_score = team['score'] + score.points
            if new_score < 0:
                SessionTeamRepository.update_team(score.team_id, is_eliminated=True)
            elif new_score >= 0:
                SessionTeamRepository.update_team(score.team_id, is_eliminated=False)

    # Create score record
    score_id = SessionScoreRepository.create_score(
        score.session_id, score.team_id, score.points,
        score.reason, score.round_number, score.player_id,
        datetime.now(CET)
    )
    created_score = SessionScoreRepository.get_score_by_id(score_id)

    # Get player name if player_id is provided
    player_name = None
    if score.player_id:
        try:
            player = PlayerRepository.get_player_by_id(score.player_id)
            if player:
                player_name = player['name']
        except:
            pass

    # Emit real-time update for score with player info
    print(f"Emitting session_score_update event: session_id={session_id}, team_id={score.team_id}, points={score.points}, player_id={score.player_id}, player_name={player_name}")
    await sio.emit('session_score_update', _jsonable({
        'session_id': session_id,
        'team_id': score.team_id,
        'player_id': score.player_id,
        'player_name': player_name,
        'points': score.points,
        'reason': score.reason,
        'round_number': score.round_number,
        'timestamp': created_score['timestamp']
    }))

    # Also emit team update since score changed - with updated total score
    updated_team = SessionTeamRepository.get_team_by_id(score.team_id)
    total_score = SessionScoreRepository.get_team_total_score(session_id, score.team_id)
    print(f"Emitting team_update event for score change: session_id={session_id}, team_id={score.team_id}, total_score={total_score}")
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': score.team_id,
        'team': {
            **updated_team,
            'total_score': total_score  # Add calculated total score
        },
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionScoreResponse(**created_score)

# Participant leaderboard moved to `backend/routes/sessions.py`


# Live leaderboard moved to `backend/routes/sessions.py`


# Session score delete moved to `backend/routes/sessions.py`

# Test socket endpoint moved to `backend/routes/system.py` (see `system_router`) - use centralized socket manager to send test events.
# ----------------------------------------------------
# Standalone Teams Management Endpoints
# ----------------------------------------------------

@app.get(
    f"{ENDPOINT}/standalone-teams",
    tags=["Standalone Teams"],
    summary="List all teams (independent of sessions)"
)
async def get_all_standalone_teams():
    """Get all teams that can be reused across sessions."""
    teams = SessionTeamRepository.get_all_teams()
    return {"teams": teams}

@app.get(
    f"{ENDPOINT}/standalone-teams/{{team_id}}",
    tags=["Standalone Teams"],
    summary="Get a standalone team by ID"
)
async def get_standalone_team(team_id: int):
    """Get a specific team that can be reused across sessions."""
    team = SessionTeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"team": team}

# Standalone team write endpoints removed (POST/PUT/DELETE). The GET endpoints remain to support listing available teams in UIs.

# Add existing team to session moved to `backend/routes/sessions.py`

# Remove team from session moved to `backend/routes/sessions.py`

# ----------------------------------------------------
# Main
# ----------------------------------------------------

# Session templates endpoints removed — not referenced by frontend and removed to reduce API doc clutter.


# Health and system control endpoints moved to `backend/routes/system.py` (see `system_router`) - health and shutdown implemented there.

# Live Leaderboard
# Duplicate live-leaderboard endpoint (hyphen variant) removed in favor of /api/v1/live/leaderboard.

# Explicit CORS preflight handler (helps when running behind the Socket.IO ASGI wrapper)
@app.options("/{full_path:path}")
async def preflight(full_path: str):
    # Manually add CORS headers to be extra safe when routed via the Socket.IO ASGI wrapper
    resp = Response(status_code=204)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "*"
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp

if __name__ == "__main__":
    print("Scoreboard Backend Starting...")
    uvicorn.run(
        "app:asgi",
        host="0.0.0.0",
        port=8000,
        reload=True
    )