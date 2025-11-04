import socketio
import asyncio
import uvicorn
import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Body, Header, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import time
import traceback
import threading
from threading import Thread, Event, Lock
import socket
import logging


# Import repositories
from database.datarepository import (
    SportRepository, TeamRepository, PlayerRepository,
    ScoreTypeRepository, GameRepository, ScoreRepository,
    SessionRepository, SessionTeamRepository, SessionScoreRepository
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
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------------------------------
# App setup
# ----------------------------------------------------

app = FastAPI(
    title="Scoreboard Backend",
    version="1.0.0",
    description="REST + Socket.IO backend for TeamScore. All REST endpoints are prefixed with /api/v1."
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

# CORS middleware - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (as requested)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi',
    logger=False
)

ENDPOINT = "/api/v1"  # API base endpoint

# Store connected clients
connected_clients = set()


# Expose Socket.IO as the top-level ASGI app to avoid duplicate CORS headers on /socket.io
asgi = socketio.ASGIApp(sio, app, socketio_path='socket.io')

# ----------------------------------------------------
# Socket.IO event handlers
# ----------------------------------------------------

@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected - Total clients: {len(connected_clients) + 1}")
    connected_clients.add(sid)

    # Send welcome message
    await sio.emit('welcome', {
        'message': 'Successfully connected to scoreboard server',
        'client_id': sid,
        'timestamp': datetime.now().isoformat()
    }, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected - Total clients: {len(connected_clients) - 1}")
    if sid in connected_clients:
        connected_clients.remove(sid)

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
    team_id = TeamRepository.create_team(team.name, team.sport_id)
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
    success = TeamRepository.update_team(team_id, team_update.name, team_update.sport_id)
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
    player_id = PlayerRepository.create_player(player.name, player.team_id)
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
    success = PlayerRepository.update_player(player_id, player_update.name, player_update.team_id)
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
        timestamp=datetime.now()
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
    session_id = SessionRepository.create_session(
        session.name, session.game_type, session.max_teams,
        session.total_rounds, session.time_limit
    )
    created_session = SessionRepository.get_session_by_id(session_id)

    # Emit real-time update for new session creation
    await sio.emit('session_created', _jsonable({
        'session_id': session_id,
        'session': created_session,
        'timestamp': datetime.now().isoformat()
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
        if session.get('max_teams') is None:
            session['max_teams'] = 10
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
        session_update.status, session_update.max_teams,
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
        'timestamp': datetime.now().isoformat()
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
    color = payload.get('color') or '#333333'
    icon = payload.get('icon') or 'team'

    if not name:
        raise HTTPException(status_code=422, detail="Field 'name' is required")

    # If body had a different session_id than the path, reject
    if body_session_id is not None and int(body_session_id) != int(session_id):
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    # Create team
    team_id = SessionTeamRepository.create_team(session_id, name, color, icon)
    created_team = SessionTeamRepository.get_team_by_id(team_id)

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
        'timestamp': datetime.now().isoformat()
    }))

    return SessionTeamResponse(**created_team)

@app.put(
    f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}",
    response_model=SessionTeamResponse,
    tags=["Session Teams"],
    summary="Update a team in a session"
)
async def update_session_team(session_id: int, team_id: int, team_update: SessionTeamUpdate):
    success = SessionTeamRepository.update_team(
        team_id, team_update.name, team_update.color, team_update.icon,
        team_update.score, team_update.is_eliminated
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    updated_team = SessionTeamRepository.get_team_by_id(team_id)

    # Emit real-time update for team changes
    print(f"Emitting team_update event for team update: session_id={session_id}, team_id={team_id}")
    total_score = SessionScoreRepository.get_team_total_score(session_id, team_id)
    await sio.emit('team_update', _jsonable({
        'session_id': session_id,
        'team_id': team_id,
        'team': {
            **updated_team,
            'total_score': total_score
        },
        'timestamp': datetime.now().isoformat()
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
        'timestamp': datetime.now().isoformat()
    })

    return {"message": "Team deleted successfully"}

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

    # Update team score
    SessionTeamRepository.update_team_score(score.team_id, score.points)

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
        score.reason, score.round_number
    )
    created_score = SessionScoreRepository.get_score_by_id(score_id)

    # Emit real-time update for score
    print(f"Emitting session_score_update event: session_id={session_id}, team_id={score.team_id}, points={score.points}")
    await sio.emit('session_score_update', {
        'session_id': session_id,
        'team_id': score.team_id,
        'points': score.points,
        'reason': score.reason,
        'round_number': score.round_number,
        'timestamp': created_score['timestamp'].isoformat()
    })

    # Also emit team update since score changed
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
        'timestamp': datetime.now().isoformat()
    }))

    return SessionScoreResponse(**created_score)

@app.get(f"{ENDPOINT}/sessions/{{session_id}}/leaderboard", tags=["Sessions"], summary="Get session leaderboard")
async def get_session_leaderboard(session_id: int):
    summary = SessionScoreRepository.get_session_score_summary(session_id)
    return {"leaderboard": summary}

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
        'timestamp': datetime.now().isoformat(),
        'connected_clients': len(connected_clients)
    })
    return {"message": "Test event sent", "connected_clients": len(connected_clients)}

# ----------------------------------------------------
# Main
# ----------------------------------------------------

# Health check endpoint (useful for uptime and debugging CORS/network issues)
@app.get(f"{ENDPOINT}/health", tags=["Health"], summary="Backend health check")
async def health():
    return {"status": "ok", "time": datetime.now().isoformat()}

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