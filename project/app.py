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

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Import repositories
from database.datarepository import (
    SportRepository, TeamRepository, PlayerRepository,
    ScoreTypeRepository, GameRepository, ScoreRepository
)

# Import models
from models.models import (
    SportBase, SportCreate, SportUpdate, SportResponse, SportListResponse,
    TeamBase, TeamCreate, TeamUpdate, TeamResponse, TeamListResponse,
    PlayerBase, PlayerCreate, PlayerUpdate, PlayerResponse, PlayerListResponse,
    ScoreTypeBase, ScoreTypeCreate, ScoreTypeUpdate, ScoreTypeResponse, ScoreTypeListResponse,
    GameBase, GameCreate, GameUpdate, GameResponse, GameListResponse,
    ScoreBase, ScoreCreate, ScoreUpdate, ScoreResponse, ScoreListResponse,
    ErrorMessage, ErrorNotFound, ScoreUpdateMessage, GameStatusUpdate
)

from typing import Dict, Any, Optional, List
from fastapi.responses import JSONResponse
from fastapi import Request
from fastapi import Query
import queue
from uuid import uuid4

# ----------------------------------------------------
# Logging Setup
# ----------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------------------------------
# App setup
# ----------------------------------------------------

app = FastAPI(title="Scoreboard Backend", version="1.0.0")

# CORS middleware for FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Socket.IO server setup
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi',
    logger=False
)

ENDPOINT = "/api/v1"  # API base endpoint

# Store connected clients
connected_clients = set()

# Mount Socket.IO on the same app
app.mount("/socket.io", socketio.ASGIApp(sio, app))

# ----------------------------------------------------
# Socket.IO event handlers
# ----------------------------------------------------

@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")
    connected_clients.add(sid)

    # Send welcome message
    await sio.emit('welcome', {
        'message': 'Successfully connected to scoreboard server',
        'client_id': sid,
        'timestamp': datetime.now().isoformat()
    }, room=sid)

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")
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

# ----------------------------------------------------
# Main
# ----------------------------------------------------

if __name__ == "__main__":
    print("🚀 Scoreboard Backend Starting...")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )