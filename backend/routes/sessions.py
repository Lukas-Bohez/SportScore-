from fastapi import APIRouter, HTTPException, Request, Query
from typing import Dict, Any, Optional, List
from datetime import datetime

from backend.database.datarepository import (
    SessionRepository, SessionTeamRepository, SessionPlayerRepository, SessionScoreRepository, PlayerRepository,
    ActivityRepository, ActivityScoreRepository
)
import json
from backend.database.database import Database
from backend.models.models import (
    SessionCreate, SessionUpdate, SessionResponse, SessionListResponse,
    SessionTeamResponse, SessionTeamListResponse, SessionTeamUpdate,
    PlayerCreate, PlayerResponse, PlayerListResponse, SessionPlayerCreate,
    SessionPlayerResponse, SessionScoreCreate, SessionScoreResponse, SessionScoreListResponse
)
from backend.utils.api_helpers import _jsonable, CET
from backend.utils.socketio_manager import get_sio

router = APIRouter()

ENDPOINT = "/api/v1"

sio = get_sio()


@router.get(f"{ENDPOINT}/sessions", response_model=SessionListResponse, tags=["Sessions"], summary="List sessions")
async def get_sessions():
    sessions = SessionRepository.get_all_sessions()
    return SessionListResponse(sessions=[SessionResponse(**session) for session in sessions])


@router.post(f"{ENDPOINT}/sessions", response_model=SessionResponse, tags=["Sessions"], summary="Create a new session")
async def create_session(session: SessionCreate):
    # End any currently active session only if we're creating an active session
    if session.status == 'active':
        active_session = SessionRepository.get_active_session()
        if active_session and active_session.get('status') == 'active':
            SessionRepository.update_session(active_session['id'], status='completed')

    session_id = SessionRepository.create_session(
        session.name, session.game_type,
        session.total_rounds, session.time_limit, session.scoring_mode,
        session.sport_type, session.show_players
    )
    created_session = SessionRepository.get_session_by_id(session_id)

    # Set the session status to the requested status (default is 'active' from SessionCreate)
    SessionRepository.update_session(session_id, status=session.status or 'active')

    # Emit real-time update for new session creation
    if sio:
        await sio.emit('session_created', _jsonable({
            'session_id': session_id,
            'session': created_session,
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionResponse(**created_session)


@router.get(f"{ENDPOINT}/sessions/active", tags=["Sessions"], summary="Get active session")
async def get_active_session():
    session = SessionRepository.get_active_session()
    if session:
        # Ensure defaults for fields that might be None
        if session.get('current_round') is None:
            session['current_round'] = 1
        if session.get('total_rounds') is None:
            session['total_rounds'] = 1
        if session.get('status') is None:
            session['status'] = 'setup'
        if session.get('game_type') is None:
            session['game_type'] = 'custom'
        for key, value in session.items():
            if isinstance(value, datetime):
                session[key] = value.isoformat()
        return session
    return None


@router.get(f"{ENDPOINT}/sessions/{{session_id}}", response_model=SessionResponse, tags=["Sessions"], summary="Get a session by id")
async def get_session(session_id: int):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**session)


@router.put(f"{ENDPOINT}/sessions/{{session_id}}", response_model=SessionResponse, tags=["Sessions"], summary="Update a session")
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
    if sio:
        await sio.emit('session_update', _jsonable({
            'session_id': session_id,
            'session': updated_session,
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionResponse(**updated_session)


@router.delete(f"{ENDPOINT}/sessions/{{session_id}}", tags=["Sessions"], summary="Delete a session")
async def delete_session(session_id: int):
    success = SessionRepository.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete session")
    return {"message": "Session deleted successfully"}


# Session Teams Endpoints
@router.get(f"{ENDPOINT}/sessions/{{session_id}}/teams", response_model=SessionTeamListResponse, tags=["Session Teams"], summary="List teams for a session")
async def get_session_teams(session_id: int):
    teams = SessionTeamRepository.get_teams_by_session(session_id)
    return SessionTeamListResponse(teams=[SessionTeamResponse(**team) for team in teams])


@router.post(f"{ENDPOINT}/sessions/{{session_id}}/teams", response_model=SessionTeamResponse, tags=["Session Teams"], summary="Create a team in a session")
async def create_session_team(session_id: int, request: Request):
    payload: Dict[str, Any]
    try:
        payload = await request.json()
    except Exception:
        try:
            raw = await request.body()
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode('utf-8', errors='ignore')
            payload = json.loads(raw or '{}')
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")

    body_session_id = payload.get('session_id')
    name = (payload.get('name') or '').strip()
    color = (payload.get('color') or '').strip() or '#FF6B6B'
    icon = (payload.get('icon') or '').strip() or 'team'

    if not name:
        raise HTTPException(status_code=422, detail="Field 'name' is required")

    if body_session_id is not None and int(body_session_id) != int(session_id):
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    team_id = SessionTeamRepository.create_team(session_id, name, color, icon)
    created_team = SessionTeamRepository.get_team_in_session(team_id, session_id)

    # Emit event
    if sio:
        total_score = SessionScoreRepository.get_team_total_score(session_id, team_id)
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': team_id,
            'team': { **created_team, 'total_score': total_score },
            'action': 'created',
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionTeamResponse(**created_team)


# Backwards-compatible endpoint to add an existing team to a session
@router.post(f"{ENDPOINT}/sessions/{{session_id}}/add-team", tags=["Session Teams"], summary="Add an existing team to a session by team_id")
async def add_existing_team_to_session(session_id: int, request: Request):
    payload: Dict[str, Any]
    try:
        payload = await request.json()
    except Exception:
        try:
            raw = await request.body()
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode('utf-8', errors='ignore')
            payload = json.loads(raw or '{}')
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")

    team_id = payload.get('team_id')
    if team_id is None:
        raise HTTPException(status_code=422, detail="Field 'team_id' is required")

    # Ensure session exists
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure team exists
    team = SessionTeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    success = SessionTeamRepository.add_existing_team_to_session(session_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add team to session")

    created_team = SessionTeamRepository.get_team_in_session(team_id, session_id)

    if sio:
        total_score = SessionScoreRepository.get_team_total_score(session_id, team_id)
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': team_id,
            'team': { **created_team, 'total_score': total_score },
            'action': 'linked',
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionTeamResponse(**created_team)


# Endpoint to remove/unlink a team from a session without deleting the team itself
@router.post(f"{ENDPOINT}/sessions/{{session_id}}/remove-team", tags=["Session Teams"], summary="Remove/unlink a team from a session by team_id")
async def remove_team_from_session_endpoint(session_id: int, request: Request):
    payload: Dict[str, Any]
    try:
        payload = await request.json()
    except Exception:
        try:
            raw = await request.body()
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode('utf-8', errors='ignore')
            payload = json.loads(raw or '{}')
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")

    team_id = payload.get('team_id')
    if team_id is None:
        raise HTTPException(status_code=422, detail="Field 'team_id' is required")

    # Ensure session exists
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    success = SessionTeamRepository.remove_team_from_session(session_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove team from session")

    if sio:
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': team_id,
            'action': 'removed',
            'timestamp': datetime.now(CET).isoformat()
        }))

    return {"success": True, "team_id": team_id}

@router.get(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players", response_model=PlayerListResponse, tags=["Session Team Players"], summary="List players for a session team")
async def get_players_for_team(session_id: int, team_id: int):
    team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in session")
    players = PlayerRepository.get_players_by_team(team_id)
    return PlayerListResponse(players=[PlayerResponse(**p) for p in players])


@router.post(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players", response_model=PlayerResponse, tags=["Session Team Players"], summary="Create player for a session team")
async def create_player_for_team(session_id: int, team_id: int, player: PlayerCreate):
    team = SessionTeamRepository.get_team_in_session(team_id, session_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in session")

    if player.team_id and int(player.team_id) != int(team_id):
        raise HTTPException(status_code=400, detail="Team ID mismatch")

    player_id = PlayerRepository.create_player(player.name, team_id, player.position)
    if not player_id:
        raise HTTPException(status_code=400, detail="Failed to create player")
    try:
        SessionPlayerRepository.assign_player_to_session(session_id, team_id, player_id)
    except Exception:
        pass
    created_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**created_player)


@router.put(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}", response_model=SessionTeamResponse, tags=["Session Teams"], summary="Update a team in a session")
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

    if sio:
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': team_id,
            'team': updated_team,
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionTeamResponse(**updated_team)


@router.delete(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}", tags=["Session Teams"], summary="Delete a session team")
async def delete_session_team(session_id: int, team_id: int):
    success = SessionTeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")

    if sio:
        await sio.emit('team_update', {
            'session_id': session_id,
            'team_id': team_id,
            'action': 'deleted',
            'timestamp': datetime.now(CET).isoformat()
        })

    return {"message": "Team deleted successfully"}


# Session Scores Endpoints
@router.get(f"{ENDPOINT}/sessions/{{session_id}}/scores", response_model=SessionScoreListResponse, tags=["Session Scores"], summary="List scores for a session")
async def get_session_scores(session_id: int):
    scores = SessionScoreRepository.get_scores_by_session(session_id)
    return SessionScoreListResponse(scores=[SessionScoreResponse(**score) for score in scores])


@router.post(f"{ENDPOINT}/sessions/{{session_id}}/scores", response_model=SessionScoreResponse, tags=["Session Scores"], summary="Create a score in a session")
async def create_session_score(session_id: int, score: SessionScoreCreate):
    if score.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    session = SessionRepository.get_session_by_id(session_id)
    if session and session['game_type'] == 'elimination':
        team = SessionTeamRepository.get_team_by_id(score.team_id)
        if team:
            new_score = team['score'] + score.points
            if new_score < 0:
                SessionTeamRepository.update_team(score.team_id, is_eliminated=True)
            elif new_score >= 0:
                SessionTeamRepository.update_team(score.team_id, is_eliminated=False)

    score_id = SessionScoreRepository.create_score(
        score.session_id, score.team_id, score.points,
        score.reason, score.round_number, score.player_id,
        datetime.now(CET)
    )
    created_score = SessionScoreRepository.get_score_by_id(score_id)

    # Emit real-time update for score
    player_name = None
    if score.player_id:
        try:
            player = PlayerRepository.get_player_by_id(score.player_id)
            if player:
                player_name = player['name']
        except Exception:
            pass

    if sio:
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

        updated_team = SessionTeamRepository.get_team_by_id(score.team_id)
        total_score = SessionScoreRepository.get_team_total_score(session_id, score.team_id)
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': score.team_id,
            'team': { **updated_team, 'total_score': total_score },
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionScoreResponse(**created_score)


@router.delete(f"{ENDPOINT}/sessions/{{session_id}}/scores/{{score_id}}")
async def delete_session_score(session_id: int, score_id: int):
    success = SessionScoreRepository.delete_score(score_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete score")
    return {"message": "Score deleted successfully"}


# Assignment endpoints
@router.post(f"{ENDPOINT}/sessions/{{session_id}}/assign-player", response_model=SessionPlayerResponse)
async def assign_player(session_id: int, assignment: SessionPlayerCreate):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    player = PlayerRepository.get_player_by_id(assignment.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    team_in_session = SessionTeamRepository.get_team_in_session(assignment.team_id, session_id)
    if not team_in_session:
        raise HTTPException(status_code=400, detail="Team is not part of this session")

    assign_id = SessionPlayerRepository.assign_player_to_session(session_id, assignment.team_id, assignment.player_id)
    created = SessionPlayerRepository.get_player_assignment(session_id, assignment.player_id)

    updated_team = SessionTeamRepository.get_team_in_session(assignment.team_id, session_id)
    total_score = SessionScoreRepository.get_team_total_score(session_id, assignment.team_id)
    if sio:
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': assignment.team_id,
            'team': { **updated_team, 'total_score': total_score },
            'timestamp': datetime.now(CET).isoformat()
        }))

    return SessionPlayerResponse(**created)


@router.delete(f"{ENDPOINT}/sessions/{{session_id}}/assign-player/{{player_id}}")
async def remove_player_assignment(session_id: int, player_id: int):
    removed = SessionPlayerRepository.remove_player_from_session(session_id, player_id)
    if not removed:
        raise HTTPException(status_code=400, detail="Failed to remove assignment or assignment not found")
    return {"message": "Assignment removed"}


@router.delete(f"{ENDPOINT}/sessions/{{session_id}}/teams/{{team_id}}/players/{{player_id}}")
async def remove_player_from_session_team(session_id: int, team_id: int, player_id: int):
    removed = SessionPlayerRepository.remove_player_from_session_team(session_id, team_id, player_id)
    if not removed:
        raise HTTPException(status_code=400, detail="Failed to remove assignment or assignment not found")
    return {"message": "Assignment removed"}


@router.get(f"{ENDPOINT}/sessions/{{session_id}}/participants", response_model=List[str])
async def get_session_participants(session_id: int):
    session = SessionRepository.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    sql = """
    SELECT DISTINCT player_name 
    FROM activity_scores 
    WHERE game_id = ? AND player_name IS NOT NULL AND player_name != ''
    ORDER BY player_name
    """
    from backend.database.database import Database
    participants = Database.get_rows(sql, [session_id])
    return [p['player_name'] for p in participants]


# Participant leaderboard (moved from app.py)
@router.get(f"{ENDPOINT}/sessions/{'{'}session_id{'}'}/participant-leaderboard", tags=["Sessions"], summary="Get session participant leaderboard")
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
        player_name = score.get('player_name') or f'Player {player_id}'
        
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


# Live leaderboard (moved from app.py)
@router.get(f"{ENDPOINT}/live/leaderboard", tags=["Live"], summary="Get live leaderboard", description="Return leaderboard for the currently active session (if any).")
async def get_live_leaderboard():
    session = SessionRepository.get_active_session()
    if not session:
        return {"leaderboard": [], "session": None}
    
    activities = [_normalize_activity(a) for a in ActivityRepository.get_activities_by_session(session['id'])]
    session['activities'] = activities
    if activities:
        leaderboard_data = await get_session_participant_leaderboard(session['id'])
        return {"leaderboard": leaderboard_data["leaderboard"], "session": session, "activities": leaderboard_data["activities"]}
    else:
        summary = SessionScoreRepository.get_session_score_summary(session['id'])
        return {"leaderboard": summary, "session": session}

# Additional utility: endpoint to list teams in session (already above) can be extended here

# Add an existing standalone team into a session
@router.post(
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
    # Emit real-time update
    if sio:
        await sio.emit('team_update', _jsonable({
            'session_id': session_id,
            'team_id': team_id,
            'team': team,
            'action': 'added',
            'timestamp': datetime.now(CET).isoformat()
        }))
    
    return {"team": team}


@router.delete(
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
    if sio:
        await sio.emit('team_update', {
            'session_id': session_id,
            'team_id': team_id,
            'action': 'removed',
            'timestamp': datetime.now(CET).isoformat()
        })
    
    return {"message": "Team removed from session"}
