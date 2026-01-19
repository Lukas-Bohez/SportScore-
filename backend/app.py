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


# Define CET/CEST timezone for Belgium
CET = pytz.timezone('Europe/Brussels')


# Import the new repository
from database.datarepository import (
    SportRepository, TeamRepository, PlayerRepository,
    ScoreTypeRepository, GameRepository, ScoreRepository,
    SessionRepository, SessionTeamRepository, SessionScoreRepository,
    SessionPlayerRepository, SessionTemplateRepository,
    ActivityRepository, ActivityTeamRepository, ActivityPlayerRepository, ActivityScoreRepository
)

# Import models
from models.models import (
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

# ----------------------------------------------------
# Logging Setup
# ----------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----------------------------------------------------
# App setup
# ----------------------------------------------------

app = FastAPI(
    title="Scoreboard Backend",
    version="1.0.0",
    description="REST + Socket.IO backend for SportScore. All REST endpoints are prefixed with /api/v1."
)

# ----------------------------------------------------
# Helpers
# ----------------------------------------------------
def _jsonable(value):
    """Recursively convert datetimes and nested structures to JSON-serializable types."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        t = type(value)
        return t(_jsonable(v) for v in value)
    if isinstance(value, set):
        # sets aren't JSON serializable; turn into list
        return [_jsonable(v) for v in value]
    return value

def _normalize_activity(activity: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Normalize activity row values for consistent API output."""
    if not activity:
        return activity
    # Ensure time_winner always has a default
    activity['time_winner'] = activity.get('time_winner') or 'lower'
    # Convert SQLite 0/1 into Python bool for JSON clients
    try:
        raw_agg = activity.get('aggregate_player_times')
        activity['aggregate_player_times'] = bool(int(raw_agg)) if raw_agg is not None else False
    except Exception:
        activity['aggregate_player_times'] = bool(activity.get('aggregate_player_times'))
    return activity

# CORS middleware - allow all origins for development
ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)



sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi',
    logger=False
)

ENDPOINT = "/api/v1"  # API base endpoint

# Store connected clients
connected_clients = {}  # sid: type ('admin' or 'bigscreen')
admin_clients = set()  # Track admin client sids


# Expose Socket.IO as the top-level ASGI app to avoid duplicate CORS headers on /socket.io
asgi = socketio.ASGIApp(sio, app, socketio_path='socket.io')

# ----------------------------------------------------
# Socket.IO event handlers
# ----------------------------------------------------

@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected - Total clients: {len(connected_clients) + 1}")
    connected_clients[sid] = None  # not identified yet

    # Send welcome message
    await sio.emit('welcome', {
        'message': 'Successfully connected to scoreboard server',
        'client_id': sid,
        'timestamp': datetime.now(CET).isoformat()
    }, room=sid)

@sio.event
async def disconnect(sid, reason=None):
    print(f"Client {sid} disconnected - Total clients: {len(connected_clients) - 1}")
    
    # Check if this was an admin
    was_admin = sid in admin_clients
    if was_admin:
        admin_clients.discard(sid)
        print(f"Admin {sid} removed - Remaining admins: {len(admin_clients)}")
        
        # If no more admins, show QR code
        if len(admin_clients) == 0:
            print("No admins connected - showing QR code")
            await sio.emit('set-qr', True)
    
    if sid in connected_clients:
        del connected_clients[sid]

@sio.event
async def admin_connected(sid):
    print(f"Admin connected: {sid}")
    admin_clients.add(sid)
    connected_clients[sid] = 'admin'
    print(f"Total admins: {len(admin_clients)}")
    
    # Hide QR code when admin connects
    await sio.emit('set-qr', False)

@sio.event
async def admin_disconnected(sid):
    print(f"Admin disconnected: {sid}")
    if sid in admin_clients:
        admin_clients.discard(sid)
        print(f"Remaining admins: {len(admin_clients)}")
        
        # If no more admins, show QR code
        if len(admin_clients) == 0:
            print("No admins connected - showing QR code")
            await sio.emit('set-qr', True)

@sio.on('set-qr')
async def set_qr(sid, data=None):
    print(f"Set QR requested: {data}")
    await sio.emit('set-qr', data)

@sio.on('qr-state')
async def qr_state(sid, data=None):
    print(f"QR state update: {data}")
    await sio.emit('qr-state', data)

@sio.on('set_active_activity')
async def set_active_activity(sid, data=None):
    print(f"Admin set active activity: {data}")
    # Broadcast to all connected clients (including BigScreen)
    await sio.emit('set_active_activity', data)

# ----------------------------------------------------
# API Routes
# ----------------------------------------------------

# Sports endpoints
@app.get(f"{ENDPOINT}/sports", response_model=SportListResponse)
async def get_sports():
    sports = SportRepository.get_all_sports()
    return {"sports": [SportResponse(**sport) for sport in sports]}

@app.post(f"{ENDPOINT}/sports", response_model=SportResponse)
async def create_sport(sport: SportCreate):
    sport_id = SportRepository.create_sport(sport.name, sport.description)
    if not sport_id:
        raise HTTPException(status_code=400, detail="Failed to create sport")
    created_sport = SportRepository.get_sport_by_id(sport_id)
    return SportResponse(**created_sport)

@app.get(f"{ENDPOINT}/sports/{{sport_id}}", response_model=SportResponse)
async def get_sport(sport_id: int):
    sport = SportRepository.get_sport_by_id(sport_id)
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    return SportResponse(**sport)

@app.put(f"{ENDPOINT}/sports/{{sport_id}}", response_model=SportResponse)
async def update_sport(sport_id: int, sport_update: SportUpdate):
    success = SportRepository.update_sport(sport_id, sport_update.name, sport_update.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update sport")
    updated_sport = SportRepository.get_sport_by_id(sport_id)
    return SportResponse(**updated_sport)

@app.delete(f"{ENDPOINT}/sports/{{sport_id}}")
async def delete_sport(sport_id: int):
    success = SportRepository.delete_sport(sport_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete sport")
    return {"message": "Sport deleted successfully"}

# Teams endpoints
@app.get(f"{ENDPOINT}/teams", response_model=TeamListResponse)
async def get_teams(sport_id: Optional[int] = Query(None)):
    if sport_id:
        teams = TeamRepository.get_teams_by_sport(sport_id)
    else:
        teams = TeamRepository.get_all_teams()
    return {"teams": [TeamResponse(**team) for team in teams]}

@app.post(f"{ENDPOINT}/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate):
    try:
        team_id = TeamRepository.create_team(team.name, team.color, team.icon, team.description)
        if not team_id:
            raise HTTPException(status_code=400, detail="Failed to create team")
        created_team = TeamRepository.get_team_by_id(team_id)
        if not created_team:
            raise HTTPException(status_code=500, detail="Team created but could not be retrieved")
        return TeamResponse(**created_team)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=409, detail="Team with this name already exists")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse)
async def get_team(team_id: int):
    team = TeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)

@app.put(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse)
async def update_team(team_id: int, team_update: TeamUpdate):
    # Pass the expected fields (name, color, icon, description) to the repository
    success = TeamRepository.update_team(team_id, team_update.name, team_update.color, team_update.icon, team_update.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    updated_team = TeamRepository.get_team_by_id(team_id)
    return TeamResponse(**updated_team)

@app.delete(f"{ENDPOINT}/teams/{{team_id}}")
async def delete_team(team_id: int):
    success = TeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")
    return {"message": "Team deleted successfully"}

@app.put(f"{ENDPOINT}/teams/{{team_id}}/players/{{player_id}}", response_model=PlayerResponse)
async def assign_player_to_team(team_id: int, player_id: int):
    # Check if team exists
    team = TeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if player exists
    player = PlayerRepository.get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Update player's team_id
    success = PlayerRepository.update_player(player_id, None, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign player to team")
    
    updated_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**updated_player)

# Players endpoints
@app.get(f"{ENDPOINT}/players", response_model=PlayerListResponse)
async def get_players(team_id: Optional[int] = Query(None)):
    if team_id:
        players = PlayerRepository.get_players_by_team(team_id)
    else:
        players = PlayerRepository.get_all_players()
    return {"players": [PlayerResponse(**player) for player in players]}

@app.post(f"{ENDPOINT}/players", response_model=PlayerResponse)
async def create_player(player: PlayerCreate):
    player_id = PlayerRepository.create_player(player.name, player.team_id, player.position)
    if not player_id:
        raise HTTPException(status_code=400, detail="Failed to create player")
    created_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**created_player)

@app.get(f"{ENDPOINT}/players/{{player_id}}", response_model=PlayerResponse)
async def get_player(player_id: int):
    player = PlayerRepository.get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerResponse(**player)

@app.put(f"{ENDPOINT}/players/{{player_id}}", response_model=PlayerResponse)
async def update_player(player_id: int, player_update: PlayerUpdate):
    update_data = player_update.dict(exclude_unset=True)
    success = PlayerRepository.update_player_fields(player_id, update_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update player")
    updated_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**updated_player)

@app.delete(f"{ENDPOINT}/players/{{player_id}}")
async def delete_player(player_id: int):
    success = PlayerRepository.delete_player(player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete player")
    return {"message": "Player deleted successfully"}


# Teams endpoints
@app.get(f"{ENDPOINT}/teams", response_model=TeamListResponse)
async def get_teams():
    teams = TeamRepository.get_all_teams()
    return {"teams": [TeamResponse(**team) for team in teams]}

@app.post(f"{ENDPOINT}/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate):
    team_id = TeamRepository.create_team(team.name, team.color, team.icon, team.description)
    if not team_id:
        raise HTTPException(status_code=400, detail="Failed to create team")
    created_team = TeamRepository.get_team_by_id(team_id)
    return TeamResponse(**created_team)

@app.get(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse)
async def get_team(team_id: int):
    team = TeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)

@app.put(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse)
async def update_team(team_id: int, team_update: TeamUpdate):
    success = TeamRepository.update_team(team_id, team_update.name, team_update.color, team_update.icon, team_update.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    updated_team = TeamRepository.get_team_by_id(team_id)
    return TeamResponse(**updated_team)

@app.delete(f"{ENDPOINT}/teams/{{team_id}}")
async def delete_team(team_id: int):
    success = TeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")
    return {"message": "Team deleted successfully"}


# Session player assignments endpoints
@app.post(f"{ENDPOINT}/sessions/{{session_id}}/assign-player", response_model=SessionPlayerResponse)
async def assign_player(session_id: int, assignment: SessionPlayerCreate):
    # Ensure session exists
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure player exists
    player = PlayerRepository.get_player_by_id(assignment.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Ensure team is part of session
    team_in_session = SessionTeamRepository.get_team_in_session(assignment.team_id, session_id)
    if not team_in_session:
        raise HTTPException(status_code=400, detail="Team is not part of this session")

    assign_id = SessionPlayerRepository.assign_player_to_session(session_id, assignment.team_id, assignment.player_id)
    created = SessionPlayerRepository.get_player_assignment(session_id, assignment.player_id)

    # Emit real-time update for team (since players changed)
    updated_team = SessionTeamRepository.get_team_in_session(assignment.team_id, session_id)
    total_score = SessionScoreRepository.get_team_total_score(session_id, assignment.team_id)
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': assignment.team_id,
        'team': {
            **updated_team,
            'total_score': total_score  # Add calculated total score
        },
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionPlayerResponse(**created)


@app.delete(f"{ENDPOINT}/sessions/{{session_id}}/assign-player/{{player_id}}")
async def remove_player_assignment(session_id: int, player_id: int):
    removed = SessionPlayerRepository.remove_player_from_session(session_id, player_id)
    if not removed:
        raise HTTPException(status_code=400, detail="Failed to remove assignment or assignment not found")
    return {"message": "Assignment removed"}

@app.delete(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players/{{player_id}}")
async def remove_player_from_session_team(session_id: int, team_id: int, player_id: int):
    removed = SessionPlayerRepository.remove_player_from_session_team(session_id, team_id, player_id)
    if not removed:
        raise HTTPException(status_code=400, detail="Failed to remove assignment or assignment not found")
    return {"message": "Assignment removed"}


@app.get(f"{ENDPOINT}/sessions/{{session_id}}/participants", response_model=List[str])
async def get_session_participants(session_id: int):
    """Get unique participant names for a session"""
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get unique player names from activity scores
    sql = """
    SELECT DISTINCT player_name 
    FROM activity_scores 
    WHERE game_id = ? AND player_name IS NOT NULL AND player_name != ''
    ORDER BY player_name
    """
    participants = Database.get_rows(sql, [session_id])
    return [p['player_name'] for p in participants]


@app.get(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players")
async def get_session_team_players(session_id: int, team_id: int):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    players = SessionPlayerRepository.get_players_by_session_team(session_id, team_id)
    return {"players": players}


@app.put(f"{ENDPOINT}/players/{{player_id}}/team", response_model=PlayerResponse)
async def set_player_default_team(player_id: int, payload: PlayerUpdate):
    # Update player's default team
    success = PlayerRepository.update_player(player_id, None, payload.team_id, None)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update player's default team")
    updated = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**updated)

# Score Types endpoints
@app.get(f"{ENDPOINT}/score-types", response_model=ScoreTypeListResponse)
async def get_score_types():
    score_types = ScoreTypeRepository.get_all_score_types()
    return {"score_types": [ScoreTypeResponse(**st) for st in score_types]}

@app.post(f"{ENDPOINT}/score-types", response_model=ScoreTypeResponse)
async def create_score_type(score_type: ScoreTypeCreate):
    st_id = ScoreTypeRepository.create_score_type(score_type.name, score_type.description)
    if not st_id:
        raise HTTPException(status_code=400, detail="Failed to create score type")
    created_st = ScoreTypeRepository.get_score_type_by_id(st_id)
    return ScoreTypeResponse(**created_st)

@app.get(f"{ENDPOINT}/score-types/{{score_type_id}}", response_model=ScoreTypeResponse)
async def get_score_type(score_type_id: int):
    st = ScoreTypeRepository.get_score_type_by_id(score_type_id)
    if not st:
        raise HTTPException(status_code=404, detail="Score type not found")
    return ScoreTypeResponse(**st)

@app.put(f"{ENDPOINT}/score-types/{{score_type_id}}", response_model=ScoreTypeResponse)
async def update_score_type(score_type_id: int, st_update: ScoreTypeUpdate):
    success = ScoreTypeRepository.update_score_type(score_type_id, st_update.name, st_update.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update score type")
    updated_st = ScoreTypeRepository.get_score_type_by_id(score_type_id)
    return ScoreTypeResponse(**updated_st)

@app.delete(f"{ENDPOINT}/score-types/{{score_type_id}}")
async def delete_score_type(score_type_id: int):
    success = ScoreTypeRepository.delete_score_type(score_type_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete score type")
    return {"message": "Score type deleted successfully"}

# Games endpoints
@app.get(f"{ENDPOINT}/games", response_model=GameListResponse)
async def get_games(sport_id: Optional[int] = Query(None)):
    if sport_id:
        games = GameRepository.get_games_by_sport(sport_id)
    else:
        games = GameRepository.get_all_games()
    return {"games": [GameResponse(**game) for game in games]}

@app.post(f"{ENDPOINT}/games", response_model=GameResponse)
async def create_game(game: GameCreate):
    game_id = GameRepository.create_game(game.sport_id, game.team1_id, game.team2_id, game.start_time, game.status)
    if not game_id:
        raise HTTPException(status_code=400, detail="Failed to create game")
    created_game = GameRepository.get_game_by_id(game_id)
    return GameResponse(**created_game)

@app.get(f"{ENDPOINT}/games/{{game_id}}", response_model=GameResponse)
async def get_game(game_id: int):
    game = GameRepository.get_game_by_id(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameResponse(**game)

@app.put(f"{ENDPOINT}/games/{{game_id}}", response_model=GameResponse)
async def update_game(game_id: int, game_update: GameUpdate):
    success = GameRepository.update_game(
        game_id, game_update.sport_id, game_update.team1_id, game_update.team2_id,
        game_update.start_time, game_update.end_time, game_update.status
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update game")
    updated_game = GameRepository.get_game_by_id(game_id)
    return GameResponse(**updated_game)

@app.delete(f"{ENDPOINT}/games/{{game_id}}")
async def delete_game(game_id: int):
    success = GameRepository.delete_game(game_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete game")
    return {"message": "Game deleted successfully"}

# Scores endpoints
@app.get(f"{ENDPOINT}/scores", response_model=ScoreListResponse)
async def get_scores(game_id: Optional[int] = Query(None), team_id: Optional[int] = Query(None)):
    if game_id:
        scores = ScoreRepository.get_scores_by_game(game_id)
    elif team_id:
        scores = ScoreRepository.get_scores_by_team(team_id)
    else:
        scores = ScoreRepository.get_all_scores()
    return {"scores": [ScoreResponse(**score) for score in scores]}

@app.post(f"{ENDPOINT}/scores", response_model=ScoreResponse)
async def create_score(score: ScoreCreate):
    score_id = ScoreRepository.create_score(score.game_id, score.team_id, score.score_type_id, score.value, score.player_id)
    if not score_id:
        raise HTTPException(status_code=400, detail="Failed to create score")
    created_score = ScoreRepository.get_score_by_id(score_id)

    # Emit real-time update
    score_type = ScoreTypeRepository.get_score_type_by_id(score.score_type_id)
    player_name = None
    if score.player_id:
        player = PlayerRepository.get_player_by_id(score.player_id)
        player_name = player['name'] if player else None

    update_message = ScoreUpdateMessage(
        game_id=score.game_id,
        team_id=score.team_id,
        score_type=score_type['name'] if score_type else 'Unknown',
        value=score.value,
        player_name=player_name,
        timestamp=datetime.now(CET)
    )
    await sio.emit('score_update', update_message.dict())

    return ScoreResponse(**created_score)

@app.get(f"{ENDPOINT}/scores/{{score_id}}", response_model=ScoreResponse)
async def get_score(score_id: int):
    score = ScoreRepository.get_score_by_id(score_id)
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return ScoreResponse(**score)

@app.put(f"{ENDPOINT}/scores/{{score_id}}", response_model=ScoreResponse)
async def update_score(score_id: int, score_update: ScoreUpdate):
    success = ScoreRepository.update_score(score_id, score_update.value)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update score")
    updated_score = ScoreRepository.get_score_by_id(score_id)
    return ScoreResponse(**updated_score)

@app.delete(f"{ENDPOINT}/scores/{{score_id}}")
async def delete_score(score_id: int):
    success = ScoreRepository.delete_score(score_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete score")
    return {"message": "Score deleted successfully"}

@app.get(f"{ENDPOINT}/games/{{game_id}}/score-summary")
async def get_game_score_summary(game_id: int):
    summary = ScoreRepository.get_game_score_summary(game_id)
    return {"summary": summary}

# ===========================================
# Session Endpoints (Teambuilding)
# ===========================================

@app.get(
    f"{ENDPOINT}/sessions",
    response_model=SessionListResponse,
    tags=["Sessions"],
    summary="List sessions",
    description="Return all sessions ordered by creation time."
)
async def get_sessions():
    sessions = SessionRepository.get_all_sessions()
    return SessionListResponse(sessions=[SessionResponse(**session) for session in sessions])

@app.post(
    f"{ENDPOINT}/sessions",
    response_model=SessionResponse,
    tags=["Sessions"],
    summary="Create a new session",
    description="Create a new teambuilding session and broadcast a session_created event."
)
async def create_session(session: SessionCreate):
    # End any currently active session
    active_session = SessionRepository.get_active_session()
    if active_session and active_session.get('status') == 'active':
        SessionRepository.update_session(active_session['id'], status='completed')
        logger.info(f"Ended active session {active_session['id']} as new session is being created")
    
    session_id = SessionRepository.create_session(
        session.name, session.game_type,
        session.total_rounds, session.time_limit, session.scoring_mode,
        session.sport_type, session.show_players
    )
    created_session = SessionRepository.get_session_by_id(session_id)

    # Set the new session as active
    SessionRepository.update_session(session_id, status='active')

    # Emit real-time update for new session creation
    await sio.emit('session_created', _jsonable({
        'session_id': session_id,
        'session': created_session,
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionResponse(**created_session)

@app.get(
    f"{ENDPOINT}/sessions/active",
    tags=["Sessions"],
    summary="Get active session",
    description="Return the currently active session or null if none is active."
)
async def get_active_session():
    """Return the currently active session or null when none exists."""
    session = SessionRepository.get_active_session()
    print(f"Active session from DB: {session}")
    if session:
        # Ensure defaults for fields that might be None from database
        if session.get('current_round') is None:
            session['current_round'] = 1
        if session.get('total_rounds') is None:
            session['total_rounds'] = 1
        if session.get('status') is None:
            session['status'] = 'setup'
        if session.get('game_type') is None:
            session['game_type'] = 'custom'
        # Convert datetime to str for JSON serialization
        for key, value in session.items():
            if isinstance(value, datetime):
                session[key] = value.isoformat()
        print(f"Returning session: {session}")
        return session
    print("No active session, returning None")
    return None

@app.get(f"{ENDPOINT}/sessions/{{session_id}}", response_model=SessionResponse, tags=["Sessions"], summary="Get a session by id")
async def get_session(session_id: int):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**session)

@app.put(
    f"{ENDPOINT}/sessions/{{session_id}}",
    response_model=SessionResponse,
    tags=["Sessions"],
    summary="Update a session",
    description="Update mutable fields of a session and broadcast a session_update event."
)
async def update_session(session_id: int, session_update: SessionUpdate):
    success = SessionRepository.update_session(
        session_id, session_update.name, session_update.game_type,
        session_update.status,
        session_update.current_round, session_update.total_rounds,
        session_update.time_limit
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update session")
    updated_session = SessionRepository.get_session_by_id(session_id)

    # Emit real-time update for session changes
    await sio.emit('session_update', _jsonable({
        'session_id': session_id,
        'session': updated_session,
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionResponse(**updated_session)

@app.delete(f"{ENDPOINT}/sessions/{{session_id}}", tags=["Sessions"], summary="Delete a session")
async def delete_session(session_id: int):
    success = SessionRepository.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete session")
    return {"message": "Session deleted successfully"}

# Session Teams Endpoints
@app.get(
    f"{ENDPOINT}/sessions/{{session_id}}/teams",
    response_model=SessionTeamListResponse,
    tags=["Session Teams"],
    summary="List teams for a session"
)
async def get_session_teams(session_id: int):
    teams = SessionTeamRepository.get_teams_by_session(session_id)
    return SessionTeamListResponse(teams=[SessionTeamResponse(**team) for team in teams])

@app.post(
    f"{ENDPOINT}/sessions/{{session_id}}/teams",
    response_model=SessionTeamResponse,
    tags=["Session Teams"],
    summary="Create a team in a session"
)
async def create_session_team(session_id: int, request: Request):
    """Create a team in a session.

    Accepts standard JSON (application/json) and also tolerates plain text bodies
    containing JSON to be resilient against strict CORS/preflight behaviors on some setups.
    """
    payload: Dict[str, Any]
    try:
        # Prefer normal JSON parsing
        payload = await request.json()
    except Exception:
        # Fallback: try parsing raw body as JSON even if content-type is not application/json
        try:
            raw = await request.body()
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode('utf-8', errors='ignore')
            payload = json.loads(raw or '{}')
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")

    # Extract and validate fields
    body_session_id = payload.get('session_id')
    name = (payload.get('name') or '').strip()
    color = (payload.get('color') or '').strip() or '#FF6B6B'
    icon = (payload.get('icon') or '').strip() or 'team'

    if not name:
        raise HTTPException(status_code=422, detail="Field 'name' is required")

    # If body had a different session_id than the path, reject
    if body_session_id is not None and int(body_session_id) != int(session_id):
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    # Create team
    team_id = SessionTeamRepository.create_team(session_id, name, color, icon)
    created_team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    logger.info(f"Created team {team_id} ({name}) in session {session_id} with color: {created_team.get('color') if created_team else 'None'}")

    # Emit real-time update for new team creation
    print(f"Emitting team_update event for team creation: session_id={session_id}, team_id={team_id}")
    total_score = SessionScoreRepository.get_team_total_score(session_id, team_id)
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': team_id,
        'team': {
            **created_team,
            'total_score': total_score
        },
        'action': 'created',
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionTeamResponse(**created_team)


@app.get(
    f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players",
    response_model=PlayerListResponse,
    tags=["Session Team Players"],
    summary="List players for a session team"
)
async def get_players_for_team(session_id: int, team_id: int):
    # Validate team exists in this session using get_team_in_session
    team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in session")
    players = PlayerRepository.get_players_by_team(team_id)
    return PlayerListResponse(players=[PlayerResponse(**p) for p in players])


@app.post(
    f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players",
    response_model=PlayerResponse,
    tags=["Session Team Players"],
    summary="Create player for a session team"
)
async def create_player_for_team(session_id: int, team_id: int, player: PlayerCreate):
    # Validate team exists in this session using get_team_in_session
    team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in session")

    # Ensure team_id matches path
    if player.team_id and int(player.team_id) != int(team_id):
        raise HTTPException(status_code=400, detail="Team ID mismatch")

    player_id = PlayerRepository.create_player(player.name, team_id, player.position)
    if not player_id:
        raise HTTPException(status_code=400, detail="Failed to create player")
    # Also assign this new player to the session/team mapping for the session
    try:
        SessionPlayerRepository.assign_player_to_session(session_id, team_id, player_id)
    except Exception:
        # Ignore failures here (e.g., if already assigned) to preserve idempotency
        pass
    created_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**created_player)

@app.put(
    f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}",
    response_model=SessionTeamResponse,
    tags=["Session Teams"],
    summary="Update a team in a session"
)
async def update_session_team(session_id: int, team_id: int, team_update: SessionTeamUpdate):
    success = SessionTeamRepository.update_team(
        team_id, team_update.name, team_update.color, team_update.icon,
        None, team_update.score, team_update.is_eliminated
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    updated_team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    if not updated_team:
        raise HTTPException(status_code=404, detail="Team not found in session")

    # Emit real-time update for team changes
    print(f"Emitting team_update event for team update: session_id={session_id}, team_id={team_id}")
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': team_id,
        'team': updated_team,
        'timestamp': datetime.now(CET).isoformat()
    }))

    return SessionTeamResponse(**updated_team)

@app.delete(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}", tags=["Session Teams"], summary="Delete a session team")
async def delete_session_team(session_id: int, team_id: int):
    success = SessionTeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")

    # Emit real-time update for team deletion
    print(f"Emitting team_update event for team deletion: session_id={session_id}, team_id={team_id}")
    await sio.emit('team_update', {
        'session_id': session_id,
        'team_id': team_id,
        'action': 'deleted',
        'timestamp': datetime.now(CET).isoformat()
    })

    return {"message": "Team deleted successfully"}

# Activities Endpoints
@app.get(
    f"{ENDPOINT}/activities",
    response_model=ActivityListResponse,
    tags=["Activities"],
    summary="List global activities"
)
async def get_global_activities():
    activities = ActivityRepository.get_activities_by_session(None)
    normalized = [_normalize_activity(a) for a in activities]
    return ActivityListResponse(activities=[ActivityResponse(**a) for a in normalized])

@app.post(
    f"{ENDPOINT}/activities",
    response_model=ActivityResponse,
    tags=["Activities"],
    summary="Create global activity"
)
async def create_global_activity(activity: ActivityCreate):
    if activity.session_id is not None:
        raise HTTPException(status_code=400, detail="Use session-specific endpoint for session activities")
    activity_id = ActivityRepository.create_activity(
        session_id=None,
        name=activity.name,
        sport_type=activity.sport_type,
        game_type=activity.game_type,
        scoring_mode=activity.scoring_mode,
        time_winner=(activity.time_winner or 'lower'),
        aggregate_player_times=1 if activity.aggregate_player_times else 0,
        total_rounds=activity.total_rounds,
        time_limit=activity.time_limit,
        description=activity.description
    )
    created = ActivityRepository.get_activity_by_id(activity_id)
    return ActivityResponse(**created)

@app.get(
    f"{ENDPOINT}/sessions/{{session_id}}/activities",
    response_model=ActivityListResponse,
    tags=["Activities"],
    summary="List activities in a session"
)
async def get_session_activities(session_id: int):
    activities = ActivityRepository.get_activities_by_session(session_id)
    normalized = [_normalize_activity(a) for a in activities]
    return ActivityListResponse(activities=[ActivityResponse(**a) for a in normalized])

@app.post(
    f"{ENDPOINT}/sessions/{{session_id}}/activities",
    response_model=ActivityResponse,
    tags=["Activities"],
    summary="Create activity in a session"
)
async def create_activity_in_session(session_id: int, activity: ActivityCreate):
    if activity.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")
    activity_id = ActivityRepository.create_activity(
        session_id=activity.session_id,
        name=activity.name,
        sport_type=activity.sport_type,
        game_type=activity.game_type,
        scoring_mode=activity.scoring_mode,
        time_winner=(activity.time_winner or 'lower'),
        aggregate_player_times=1 if activity.aggregate_player_times else 0,
        total_rounds=activity.total_rounds,
        time_limit=activity.time_limit,
        description=activity.description
    )
    created = ActivityRepository.get_activity_by_id(activity_id)

    # Emit real-time update for activity creation
    try:
        await sio.emit('activity_created', _jsonable({
            'activity': created,
            'timestamp': datetime.now(CET).isoformat()
        }))
    except Exception:
        logger.exception("Failed to emit activity_created event")

    return ActivityResponse(**created)

@app.get(f"{ENDPOINT}/activities/{{activity_id}}", response_model=ActivityResponse, tags=["Activities"], summary="Get activity by id")
async def get_activity(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return ActivityResponse(**_normalize_activity(activity))

@app.put(f"{ENDPOINT}/activities/{{activity_id}}", response_model=ActivityResponse, tags=["Activities"], summary="Update activity")
async def update_activity(activity_id: int, activity_update: ActivityUpdate, request: Request):
    # Debug: log incoming activity update fields
    try:
        print(f"Activity update received for id={activity_id}")
        print(f"  time_winner={activity_update.time_winner} (type: {type(activity_update.time_winner)})")
        print(f"  aggregate_player_times={activity_update.aggregate_player_times} (type: {type(activity_update.aggregate_player_times)})")
    except Exception as e:
        print(f"Failed to log activity update: {e}")

    # Log raw request body
    try:
        raw = await request.json()
        print(f"Activity update raw body: {raw}")
    except Exception as e:
        print(f"Failed to parse raw request body: {e}")

    # CRITICAL FIX: Explicitly convert aggregate_player_times to integer for SQLite
    # Keep None if not provided
    if activity_update.aggregate_player_times is not None:
        aggregate_as_int = 1 if activity_update.aggregate_player_times else 0
    else:
        aggregate_as_int = None

    # CRITICAL FIX: Ensure time_winner is passed through only when provided
    time_winner_value = activity_update.time_winner if activity_update.time_winner is not None else None

    print(f"  Converted values: aggregate_player_times={aggregate_as_int}, time_winner={time_winner_value}")

    success = ActivityRepository.update_activity(
        activity_id,
        name=activity_update.name,
        sport_type=activity_update.sport_type,
        game_type=activity_update.game_type,
        scoring_mode=activity_update.scoring_mode,
        time_winner=time_winner_value,
        aggregate_player_times=aggregate_as_int,
        status=activity_update.status,
        current_round=activity_update.current_round,
        total_rounds=activity_update.total_rounds,
        time_limit=activity_update.time_limit,
        description=activity_update.description
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update activity")

    updated = ActivityRepository.get_activity_by_id(activity_id)

    # Normalize values for JSON and client consumers
    try:
        # Ensure time_winner defaults to 'lower' if missing
        updated['time_winner'] = updated.get('time_winner') or 'lower'
        # Convert numeric sqlite stored 0/1 to boolean for JSON
        updated['aggregate_player_times'] = bool(int(updated.get('aggregate_player_times') or 0))
    except Exception as e:
        print(f"Failed to normalize updated activity values: {e}")

    print(f"Activity after update: time_winner={updated.get('time_winner')}, aggregate_player_times={updated.get('aggregate_player_times')}")

    # Emit real-time update for activity change
    try:
        await sio.emit('activity_update', _jsonable({
            'activity': updated,
            'timestamp': datetime.now(CET).isoformat()
        }))
    except Exception:
        logger.exception("Failed to emit activity_update event")

    return ActivityResponse(**updated)
    try:
        await sio.emit('activity_update', _jsonable({
            'activity': updated,
            'timestamp': datetime.now(CET).isoformat()
        }))
    except Exception:
        logger.exception("Failed to emit activity_update event")

    return ActivityResponse(**updated)

@app.delete(f"{ENDPOINT}/activities/{{activity_id}}", tags=["Activities"], summary="Delete activity")
async def delete_activity(activity_id: int):
    success = ActivityRepository.delete_activity(activity_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete activity")

    # Emit deletion event so clients can refresh
    try:
        await sio.emit('activity_deleted', {'activity_id': activity_id, 'timestamp': datetime.now(CET).isoformat()})
    except Exception:
        logger.exception("Failed to emit activity_deleted event")

    return {"message": "Activity deleted successfully"}

# Temporary debug endpoint to inspect raw DB values for an activity
@app.get(f"{ENDPOINT}/debug/activity/{{activity_id}}")
async def debug_activity(activity_id: int):
    from database.database import Database
    sql = "SELECT * FROM activities WHERE id = ?"
    row = Database.get_one_row(sql, [activity_id])
    return {"raw_db_row": row}

# Activity Teams (opt-in)
@app.get(f"{ENDPOINT}/activities/{{activity_id}}/teams", response_model=ActivityTeamListResponse, tags=["Activity Teams"], summary="List teams for activity")
async def get_activity_teams(activity_id: int):
    teams = ActivityTeamRepository.get_teams(activity_id)
    return ActivityTeamListResponse(teams=[ActivityTeamResponse(**t) for t in teams])

@app.post(f"{ENDPOINT}/activities/{{activity_id}}/teams", response_model=ActivityTeamResponse, tags=["Activity Teams"], summary="Add team to activity")
async def add_team_to_activity(activity_id: int, request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    team_id = payload.get('team_id')
    if not team_id:
        raise HTTPException(status_code=422, detail="Field 'team_id' is required")
    ActivityTeamRepository.add_team(activity_id, team_id, 1)
    # Return joined record
    teams = ActivityTeamRepository.get_teams(activity_id)
    team = next((t for t in teams if int(t['id']) == int(team_id)), None)
    return ActivityTeamResponse(**team) if team else ActivityTeamResponse(activity_id=activity_id, team_id=team_id, opted_in=1, id=-1, joined_at=datetime.now(CET))

@app.delete(f"{ENDPOINT}/activities/{{activity_id}}/teams/{{team_id}}", tags=["Activity Teams"], summary="Remove team from activity")
async def remove_team_from_activity(activity_id: int, team_id: int):
    success = ActivityTeamRepository.remove_team(activity_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove team from activity")
    return {"message": "Team removed from activity"}

# Activity Players (opt-in)
@app.get(f"{ENDPOINT}/activities/{{activity_id}}/players", response_model=ActivityPlayerListResponse, tags=["Activity Players"], summary="List players for activity")
async def get_activity_players(activity_id: int):
    rows = ActivityPlayerRepository.get_players(activity_id)
    players = []
    for r in rows:
        player_obj = {
            'id': r.get('id', -1),
            'activity_id': r.get('activity_id', activity_id),
            'player_id': r.get('player_id'),
            'opted_in': r.get('opted_in', 1),
            'joined_at': r.get('joined_at')
        }
        players.append(ActivityPlayerResponse(**player_obj))
    return ActivityPlayerListResponse(players=players)

@app.post(f"{ENDPOINT}/activities/{{activity_id}}/players", response_model=ActivityPlayerResponse, tags=["Activity Players"], summary="Add player to activity")
async def add_player_to_activity(activity_id: int, request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    player_id = payload.get('player_id')
    if not player_id:
        raise HTTPException(status_code=422, detail="Field 'player_id' is required")
    ActivityPlayerRepository.add_player(activity_id, player_id, 1)
    rows = ActivityPlayerRepository.get_players(activity_id)
    player_row = next((r for r in rows if int(r.get('player_id')) == int(player_id)), None)
    if player_row:
        player_obj = {
            'id': player_row.get('id', -1),
            'activity_id': activity_id,
            'player_id': player_row.get('player_id'),
            'opted_in': player_row.get('opted_in', 1),
            'joined_at': player_row.get('joined_at')
        }
        return ActivityPlayerResponse(**player_obj)
    return ActivityPlayerResponse(activity_id=activity_id, player_id=player_id, opted_in=1, id=-1, joined_at=datetime.now(CET))

@app.delete(f"{ENDPOINT}/activities/{{activity_id}}/players/{{player_id}}", tags=["Activity Players"], summary="Remove player from activity")
async def remove_player_from_activity(activity_id: int, player_id: int):
    success = ActivityPlayerRepository.remove_player(activity_id, player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove player from activity")
    return {"message": "Player removed from activity"}

# Activity Scores and Leaderboard
@app.get(f"{ENDPOINT}/activities/{{activity_id}}/scores", response_model=ActivityScoreListResponse, tags=["Activity Scores"], summary="List scores for activity")
async def get_activity_scores(activity_id: int):
    # Always return activity-scoped scores from the activity_scores table; this is the authoritative source
    scores = ActivityScoreRepository.get_scores_by_activity(activity_id)
    return ActivityScoreListResponse(scores=[ActivityScoreResponse(**s) for s in scores])

@app.post(f"{ENDPOINT}/activities/{{activity_id}}/scores", response_model=ActivityScoreResponse, tags=["Activity Scores"], summary="Create score for activity")
async def create_activity_score(activity_id: int, score: ActivityScoreCreate):
    if score.activity_id != activity_id:
        raise HTTPException(status_code=400, detail="Activity ID mismatch")
    score_id = ActivityScoreRepository.create_score(
        activity_id=score.activity_id,
        points=score.points,
        team_id=score.team_id,
        player_id=score.player_id,
        reason=score.reason,
        round_number=score.round_number,
        timestamp=datetime.now(CET),
    )
    created_list = ActivityScoreRepository.get_scores_by_activity(activity_id)
    created = next((s for s in created_list if s['id'] == score_id), None)
    response = ActivityScoreResponse(**created) if created else ActivityScoreResponse(activity_id=activity_id, team_id=score.team_id, player_id=score.player_id, points=score.points, reason=score.reason, round_number=score.round_number, id=score_id, score_type='point', timestamp=datetime.now(CET))
    
    # Broadcast score update to all connected clients (BigScreen, etc.)
    # Include both activity_id and session_id when available so clients can filter correctly
    try:
        activity_obj = ActivityRepository.get_activity_by_id(activity_id)
        session_for_activity = activity_obj.get('session_id') if activity_obj else None
    except Exception:
        session_for_activity = None

    await sio.emit('session_score_update', _jsonable({
        'activity_id': activity_id,
        'session_id': session_for_activity,
        'team_id': score.team_id,
        'player_id': score.player_id,
        'points': score.points,
        'reason': score.reason,
        'timestamp': datetime.now(CET).isoformat()
    }))
    
    return response

@app.get(f"{ENDPOINT}/activities/{{activity_id}}/leaderboard", tags=["Activities"], summary="Get activity leaderboard")
async def get_activity_leaderboard(activity_id: int):
    # Get activity to find session_id
    activity = ActivityRepository.get_activity_by_id(activity_id)
    session = None
    if activity and activity.get('session_id'):
        session = SessionRepository.get_session_by_id(activity['session_id'])
        # For session activities, compute leaderboard from activity_scores and respect activity.time_winner and aggregate_player_times
        scores = ActivityScoreRepository.get_scores_by_activity(activity_id) or []

        # Build per-team and per-player totals from activity_scores
        team_level_totals = {}  # team_id -> sum of team-level points (player_id is null)
        player_totals = {}  # player_id -> { team_id, total }
        for s in scores:
            tid = s.get('team_id')
            pid = s.get('player_id')
            pts = s.get('points') or 0
            if pid is None or pid == 0:
                if tid is not None:
                    team_level_totals[tid] = team_level_totals.get(tid, 0) + pts
            else:
                entry = player_totals.get(pid, {'team_id': tid, 'total': 0})
                entry['total'] = entry.get('total', 0) + pts
                entry['team_id'] = tid
                player_totals[pid] = entry

        # Prepare a lookup of players per team (to include players without scores)
        teams = SessionTeamRepository.get_teams_by_session(activity['session_id'])
        players_by_team = {}
        for team in teams:
            tid = team['id']
            players_by_team[tid] = []
            try:
                resp = SessionTeamRepository.get_team_players(team_id=tid, session_id=activity['session_id'])
                # If repository method not available, fallback to API endpoints (frontend will fetch players anyway)
            except Exception:
                resp = None

        # Compute leaderboard entries respecting time aggregation rules when relevant
        leaderboard = []
        is_time = (activity and activity.get('game_type') == 'team_vs_time')
        aggregate_player_times = bool(activity.get('aggregate_player_times'))
        time_winner = (activity.get('time_winner') or 'lower').lower()

        # Map players to teams using player_totals entries or session players if available
        team_player_values = {}  # team_id -> list of player totals
        for pid, info in player_totals.items():
            t = info.get('team_id')
            if t is None:
                continue
            team_player_values.setdefault(t, []).append({'player_id': pid, 'total': info.get('total', 0)})

        for team in teams:
            tid = team['id']
            name = team['name']
            icon = team.get('icon')
            # Compute team score
            if is_time:
                pvals = [p['total'] for p in team_player_values.get(tid, [])]
                if pvals and len(pvals) > 0:
                    if aggregate_player_times:
                        score_val = sum(pvals)
                    else:
                        if time_winner == 'higher':
                            score_val = max(pvals)
                        else:
                            score_val = min(pvals)
                else:
                    # Fallback to team-level totals
                    score_val = team_level_totals.get(tid, 0)
            else:
                # Non-time activities: sum team-level and player-level points
                score_val = team_level_totals.get(tid, 0)
                # include player totals for completeness
                score_val += sum([p['total'] for p in team_player_values.get(tid, [])])

            leaderboard.append({
                'team_id': tid,
                'name': name,
                'icon': icon,
                'score': score_val,
                'team_color': team.get('color'),
                'players': [],
                'playerScores': { str(p['player_id']): p['total'] for p in team_player_values.get(tid, []) }
            })
        return {"leaderboard": leaderboard, "session": session}
    else:
        # Global activity
        leaderboard = ActivityScoreRepository.get_leaderboard(activity_id)
        return {"leaderboard": leaderboard, "session": session}

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

@app.get(f"{ENDPOINT}/sessions/{{session_id}}/participant-leaderboard", tags=["Sessions"], summary="Get session participant leaderboard")
async def get_session_participant_leaderboard(session_id: int):
    # Get all activities for the session
    activities = [_normalize_activity(a) for a in ActivityRepository.get_activities_by_session(session_id)]
    activity_ids = [a['id'] for a in activities]
    
    if not activity_ids:
        return {"leaderboard": []}
    
    # Get all scores for these activities
    scores = []
    for activity_id in activity_ids:
        activity_scores = ActivityScoreRepository.get_scores_by_activity(activity_id)
        scores.extend(activity_scores)
    
    # Group by player
    from collections import defaultdict
    player_scores = defaultdict(lambda: {'player_name': '', 'activity_scores': {}, 'total_score': 0})
    
    for score in scores:
        player_id = score['player_id']
        activity_id = score['activity_id']
        points = score['points']
        player_name = score['player_name'] or f'Player {player_id}'
        
        player_scores[player_id]['player_name'] = player_name
        player_scores[player_id]['activity_scores'][activity_id] = points
        player_scores[player_id]['total_score'] += points
    
    # Convert to list and sort by total score
    leaderboard = []
    for player_id, data in player_scores.items():
        leaderboard.append({
            'player_id': player_id,
            'player_name': data['player_name'],
            'activity_scores': data['activity_scores'],
            'total_score': data['total_score']
        })
    
    leaderboard.sort(key=lambda x: x['total_score'], reverse=True)
    
    return {"leaderboard": leaderboard, "activities": activities}

@app.get(
    f"{ENDPOINT}/live/leaderboard",
    tags=["Live"],
    summary="Get live leaderboard",
    description="Return leaderboard for the currently active session (if any)."
)
async def get_live_leaderboard():
    """Get leaderboard for the currently active session"""
    session = SessionRepository.get_active_session()
    if not session:
        return {"leaderboard": [], "session": None}
    
    # For participant-based scoring, return participant leaderboard
    # Check if session has activities (indicating station-based scoring)
    activities = [_normalize_activity(a) for a in ActivityRepository.get_activities_by_session(session['id'])]
    # Ensure activities are attached to the session object for clients that expect session.activities
    session['activities'] = activities
    if activities:
        # Participant-based leaderboard
        leaderboard_data = await get_session_participant_leaderboard(session['id'])
        # Keep backwards-compatible top-level activities but also include in session
        return {"leaderboard": leaderboard_data["leaderboard"], "session": session, "activities": leaderboard_data["activities"]}
    else:
        # Fallback to team-based leaderboard
        summary = SessionScoreRepository.get_session_score_summary(session['id'])
        return {"leaderboard": summary, "session": session}

@app.delete(f"{ENDPOINT}/sessions/{{session_id}}/scores/{{score_id}}")
async def delete_session_score(session_id: int, score_id: int):
    success = SessionScoreRepository.delete_score(score_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete score")
    return {"message": "Score deleted successfully"}

@app.get("/test-socket")
async def test_socket():
    """Test endpoint to send a test Socket.IO event"""
    print(f"Sending test event to {len(connected_clients)} connected clients")
    await sio.emit('test_event', {
        'message': 'This is a test event',
        'timestamp': datetime.now(CET).isoformat(),
        'connected_clients': len(connected_clients)
    })
    return {"message": "Test event sent", "connected_clients": len(connected_clients)}

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

@app.post(
    f"{ENDPOINT}/standalone-teams",
    tags=["Standalone Teams"],
    summary="Create a new standalone team"
)
async def create_standalone_team(request: Request):
    """Create a new team that can be reused in multiple sessions."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    name = (payload.get('name') or '').strip()
    color = payload.get('color') or '#3B82F6'
    icon = payload.get('icon') or 'team'
    description = payload.get('description') or None
    
    if not name:
        raise HTTPException(status_code=422, detail="Field 'name' is required")
    
    # Create team zonder sessie koppeling
    # We gebruiken een dummy session_id 0 en verwijderen later de koppeling
    from database.database import Database
    
    # Check of team al bestaat
    existing = Database.get_one_row("SELECT id FROM teams WHERE name = ?", [name])
    if existing:
        raise HTTPException(status_code=400, detail="Team with this name already exists")
    
    sql = "INSERT INTO teams (name, color, icon, description) VALUES (?, ?, ?, ?)"
    team_id = Database.execute_sql(sql, [name, color, icon, description])
    
    team = SessionTeamRepository.get_team_by_id(team_id)
    return {"team": team}

@app.put(
    f"{ENDPOINT}/standalone-teams/{{team_id}}",
    tags=["Standalone Teams"],
    summary="Update a standalone team"
)
async def update_standalone_team(team_id: int, request: Request):
    """Update team properties (affects all sessions using this team)."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    name = payload.get('name')
    color = payload.get('color')
    icon = payload.get('icon')
    description = payload.get('description')
    
    success = SessionTeamRepository.update_team(
        team_id, name=name, color=color, icon=icon, description=description
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    
    team = SessionTeamRepository.get_team_by_id(team_id)
    return {"team": team}

@app.delete(
    f"{ENDPOINT}/standalone-teams/{{team_id}}",
    tags=["Standalone Teams"],
    summary="Delete a standalone team"
)
async def delete_standalone_team(team_id: int):
    """Permanently delete a team (removes from all sessions)."""
    success = SessionTeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")
    return {"message": "Team deleted successfully"}

@app.post(
    f"{ENDPOINT}/sessions/{{session_id}}/add-team",
    tags=["Session Teams"],
    summary="Add an existing team to a session"
)
async def add_existing_team_to_session(session_id: int, request: Request):
    """Add an existing team to a session."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    team_id = payload.get('team_id')
    if not team_id:
        raise HTTPException(status_code=422, detail="Field 'team_id' is required")
    
    success = SessionTeamRepository.add_existing_team_to_session(session_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add team to session (may already be added)")
    
    team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    logger.info(f"Team {team_id} added to session {session_id}, retrieved color: {team.get('color') if team else 'None'}")
    
    # Emit real-time update
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': team_id,
        'team': team,
        'action': 'added',
        'timestamp': datetime.now(CET).isoformat()
    }))
    
    return {"team": team}

@app.delete(
    f"{ENDPOINT}/sessions/{{session_id}}/remove-team/{{team_id}}",
    tags=["Session Teams"],
    summary="Remove a team from a session (team stays available)"
)
async def remove_team_from_session(session_id: int, team_id: int):
    """Remove a team from a session without deleting the team itself."""
    success = SessionTeamRepository.remove_team_from_session(session_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove team from session")
    
    # Emit real-time update
    await sio.emit('team_update', {
        'session_id': session_id,
        'team_id': team_id,
        'action': 'removed',
        'timestamp': datetime.now(CET).isoformat()
    })
    
    return {"message": "Team removed from session"}

# ----------------------------------------------------
# Main
# ----------------------------------------------------

# Session Templates Endpoints
@app.get(f"{ENDPOINT}/session-templates", tags=["Session Templates"], summary="List all session templates")
async def get_session_templates():
    templates = SessionTemplateRepository.get_all_templates()
    return {"templates": templates}

@app.post(f"{ENDPOINT}/session-templates", tags=["Session Templates"], summary="Create a new session template")
async def create_session_template(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    name = payload.get('name')
    template_data = payload.get('template_data')
    
    if not name or not template_data:
        raise HTTPException(status_code=422, detail="Name and template_data are required")
    
    template_id = SessionTemplateRepository.create_template(name, template_data)
    if not template_id:
        raise HTTPException(status_code=400, detail="Failed to create template")
    
    return {"template_id": template_id}

@app.get(f"{ENDPOINT}/session-templates/{{template_id}}", tags=["Session Templates"], summary="Get a session template by ID")
async def get_session_template(template_id: int):
    template = SessionTemplateRepository.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.put(f"{ENDPOINT}/session-templates/{{template_id}}", tags=["Session Templates"], summary="Update a session template")
async def update_session_template(template_id: int, request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    name = payload.get('name')
    template_data = payload.get('template_data')
    
    success = SessionTemplateRepository.update_template(template_id, name, template_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update template")
    
    return {"message": "Template updated"}

@app.delete(f"{ENDPOINT}/session-templates/{{template_id}}", tags=["Session Templates"], summary="Delete a session template")
async def delete_session_template(template_id: int):
    success = SessionTemplateRepository.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete template")
    return {"message": "Template deleted"}

# Health check endpoint (useful for uptime and debugging CORS/network issues)
@app.get(f"{ENDPOINT}/health", tags=["Health"], summary="Backend health check")
async def health():
    return {"status": "ok", "time": datetime.now(CET).isoformat()}

# Live Leaderboard
@app.get(f"{ENDPOINT}/live-leaderboard", tags=["Live"])
async def get_live_leaderboard():
    active_session = SessionRepository.get_active_session()
    if not active_session:
        raise HTTPException(status_code=404, detail="No active session")
    
    # Get teams for the session
    teams = SessionTeamRepository.get_teams_by_session(active_session['id'])
    
    # Get scores for the session
    scores = SessionScoreRepository.get_scores_by_session(active_session['id'])
    
    # Sum scores per team
    team_scores = {}
    for score in scores:
        tid = score['team_id']
        if tid not in team_scores:
            team_scores[tid] = 0
        team_scores[tid] += score.get('points', 0) or 0
    
    leaderboard = []
    for team in teams:
        leaderboard.append({
            'team_id': team['id'],
            'name': team['name'],
            'icon': team.get('icon'),
            'score': team_scores.get(team['id'], 0),
            'players': [],  # Will be loaded by frontend
            'playerScores': {}
        })
    
    return {'session': active_session, 'leaderboard': leaderboard}

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