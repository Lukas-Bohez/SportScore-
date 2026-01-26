from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any
from datetime import datetime

from backend.database.datarepository import (
    ActivityRepository, ActivityTeamRepository, ActivityPlayerRepository, ActivityScoreRepository, SessionRepository, SessionTeamRepository
)
from backend.models.models import (
    ActivityCreate, ActivityUpdate, ActivityResponse, ActivityListResponse,
    ActivityPlayerResponse, ActivityPlayerListResponse, ActivityScoreCreate, ActivityScoreResponse, ActivityScoreListResponse, ActivityTeamResponse, ActivityTeamListResponse
)
from backend.utils.api_helpers import _jsonable, _normalize_activity, CET
from backend.utils.socketio_manager import get_sio

router = APIRouter()
ENDPOINT = "/api/v1"

sio = get_sio()


@router.get(f"{ENDPOINT}/activities", response_model=ActivityListResponse, tags=["Activities"], summary="List global activities")
async def get_global_activities():
    activities = ActivityRepository.get_activities_by_session(None)
    normalized = [_normalize_activity(a) for a in activities]
    return ActivityListResponse(activities=[ActivityResponse(**a) for a in normalized])


@router.post(f"{ENDPOINT}/activities", response_model=ActivityResponse, tags=["Activities"], summary="Create global activity")
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
        time_limit_per_round=activity.time_limit_per_round,
        description=activity.description
    )
    created = ActivityRepository.get_activity_by_id(activity_id)
    return ActivityResponse(**created)


@router.get(f"{ENDPOINT}/sessions/{{session_id}}/activities", response_model=ActivityListResponse, tags=["Activities"], summary="List activities in a session")
async def get_session_activities(session_id: int):
    activities = ActivityRepository.get_activities_by_session(session_id)
    normalized = [_normalize_activity(a) for a in activities]
    return ActivityListResponse(activities=[ActivityResponse(**a) for a in normalized])


@router.post(f"{ENDPOINT}/sessions/{{session_id}}/activities", response_model=ActivityResponse, tags=["Activities"], summary="Create activity in a session")
async def create_activity_in_session(session_id: int, activity: ActivityCreate):
    if activity.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    time_limit = activity.time_limit_per_round
    if time_limit is None and activity.name:
        try:
            match = ActivityRepository.get_global_activity_by_name(activity.name)
            if match and match.get('time_limit_per_round') is not None:
                time_limit = match.get('time_limit_per_round')
        except Exception:
            pass

    activity_id = ActivityRepository.create_activity(
        session_id=activity.session_id,
        name=activity.name,
        sport_type=activity.sport_type,
        game_type=activity.game_type,
        scoring_mode=activity.scoring_mode,
        time_winner=(activity.time_winner or 'lower'),
        aggregate_player_times=1 if activity.aggregate_player_times else 0,
        total_rounds=activity.total_rounds,
        time_limit_per_round=time_limit,
        description=activity.description
    )
    created = ActivityRepository.get_activity_by_id(activity_id)

    try:
        if sio:
            await sio.emit('activity_created', _jsonable({'activity': created, 'timestamp': datetime.now(CET).isoformat()}))
    except Exception:
        pass

    return ActivityResponse(**created)


@router.get(f"{ENDPOINT}/activities/{{activity_id}}", response_model=ActivityResponse, tags=["Activities"], summary="Get activity by id")
async def get_activity(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return ActivityResponse(**_normalize_activity(activity))


@router.put(f"{ENDPOINT}/activities/{{activity_id}}", response_model=ActivityResponse, tags=["Activities"], summary="Update activity")
async def update_activity(activity_id: int, activity_update: ActivityUpdate, request: Request):
    if activity_update.aggregate_player_times is not None:
        aggregate_as_int = 1 if activity_update.aggregate_player_times else 0
    else:
        aggregate_as_int = None

    time_winner_value = activity_update.time_winner if activity_update.time_winner is not None else None

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
        time_limit_per_round=activity_update.time_limit_per_round,
        round_status=activity_update.round_status,
        description=activity_update.description
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update activity")

    updated = ActivityRepository.get_activity_by_id(activity_id)
    try:
        updated['time_winner'] = updated.get('time_winner') or 'lower'
        updated['aggregate_player_times'] = bool(int(updated.get('aggregate_player_times') or 0))
    except Exception:
        pass

    try:
        if sio:
            await sio.emit('activity_update', _jsonable({'activity': updated, 'timestamp': datetime.now(CET).isoformat()}))
    except Exception:
        pass

    return ActivityResponse(**updated)


@router.delete(f"{ENDPOINT}/activities/{{activity_id}}", tags=["Activities"], summary="Delete activity")
async def delete_activity(activity_id: int):
    success = ActivityRepository.delete_activity(activity_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete activity")
    try:
        if sio:
            await sio.emit('activity_deleted', {'activity_id': activity_id, 'timestamp': datetime.now(CET).isoformat()})
    except Exception:
        pass
    return {"message": "Activity deleted successfully"}


# Round control
@router.post(f"{ENDPOINT}/activities/{{activity_id}}/rounds/start", response_model=ActivityResponse, tags=["Activities","Rounds"], summary="Start the current round")
async def start_activity_round(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.get('round_status') == 'active':
        raise HTTPException(status_code=400, detail="Round is already active")
    now = datetime.now(CET).isoformat()
    ActivityRepository.update_activity(activity_id, round_status='active', round_start_time=now, round_end_time=None, status='active')
    updated = ActivityRepository.get_activity_by_id(activity_id)
    try:
        time_limit = updated.get('time_limit_per_round')
        time_remaining = int(time_limit) if time_limit is not None else None
        if sio:
            await sio.emit('round_started', _jsonable({'activity_id': activity_id, 'current_round': updated.get('current_round',1), 'round_start_time': now, 'round_status': 'active','time_limit_per_round': time_limit,'time_remaining': time_remaining,'timestamp': now}))
    except Exception:
        pass
    return ActivityResponse(**_normalize_activity(updated))


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/rounds/end", response_model=ActivityResponse, tags=["Activities","Rounds"], summary="End the current round")
async def end_activity_round(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.get('round_status') != 'active':
        raise HTTPException(status_code=400, detail="No active round to end")

    now = datetime.now(CET)
    now_iso = now.isoformat()
    current_round = activity.get('current_round',1)
    total_rounds = activity.get('total_rounds',1)

    if current_round < total_rounds:
        ActivityRepository.update_activity(activity_id, current_round=current_round+1, round_status='not_started', round_start_time=None, round_end_time=now_iso)
        updated = ActivityRepository.get_activity_by_id(activity_id)
        try:
            if sio:
                await sio.emit('round_ended', _jsonable({'activity_id': activity_id, 'current_round': current_round, 'round_end_time': now_iso, 'timestamp': now_iso}))
                await sio.emit('round_changed', _jsonable({'activity_id': activity_id, 'previous_round': current_round, 'current_round': current_round+1, 'total_rounds': total_rounds, 'timestamp': now_iso}))
        except Exception:
            pass
        return ActivityResponse(**_normalize_activity(updated))
    else:
        ActivityRepository.update_activity(activity_id, round_status='completed', status='completed', round_end_time=now_iso)
        updated = ActivityRepository.get_activity_by_id(activity_id)
        try:
            if sio:
                await sio.emit('round_ended', _jsonable({'activity_id': activity_id, 'current_round': current_round, 'round_end_time': now_iso, 'timestamp': now_iso}))
                await sio.emit('activity_completed', _jsonable({'activity_id': activity_id, 'total_rounds': total_rounds, 'reason': 'manual_end', 'timestamp': now_iso}))
        except Exception:
            pass
        return ActivityResponse(**_normalize_activity(updated))


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/rounds/next", response_model=ActivityResponse, tags=["Activities","Rounds"], summary="Advance to the next round")
async def next_activity_round(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    current_round = activity.get('current_round',1)
    total_rounds = activity.get('total_rounds',1)
    if current_round >= total_rounds:
        raise HTTPException(status_code=400, detail="Already at the last round")
    now = datetime.now(CET).isoformat()
    ActivityRepository.update_activity(activity_id, current_round=current_round+1, round_status='not_started', round_start_time=None, round_end_time=now)
    updated = ActivityRepository.get_activity_by_id(activity_id)
    try:
        if sio:
            await sio.emit('round_changed', _jsonable({'activity_id': activity_id, 'previous_round': current_round, 'current_round': current_round+1, 'total_rounds': total_rounds, 'timestamp': now}))
    except Exception:
        pass
    return ActivityResponse(**_normalize_activity(updated))


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/rounds/pause", response_model=ActivityResponse, tags=["Activities","Rounds"], summary="Pause the current round")
async def pause_activity_round(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.get('round_status') != 'active':
        raise HTTPException(status_code=400, detail="No active round to pause")
    ActivityRepository.update_activity(activity_id, round_status='paused')
    updated = ActivityRepository.get_activity_by_id(activity_id)
    try:
        if sio:
            await sio.emit('round_paused', _jsonable({'activity_id': activity_id, 'current_round': updated.get('current_round',1), 'timestamp': datetime.now(CET).isoformat()}))
    except Exception:
        pass
    return ActivityResponse(**_normalize_activity(updated))


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/rounds/resume", response_model=ActivityResponse, tags=["Activities","Rounds"], summary="Resume a paused round")
async def resume_activity_round(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.get('round_status') != 'paused':
        raise HTTPException(status_code=400, detail="Round is not paused")
    ActivityRepository.update_activity(activity_id, round_status='active')
    updated = ActivityRepository.get_activity_by_id(activity_id)
    try:
        time_limit = updated.get('time_limit_per_round')
        time_remaining = None
        if time_limit and updated.get('round_start_time'):
            try:
                start_dt = datetime.fromisoformat(updated.get('round_start_time').replace('Z', '+00:00'))
                elapsed_seconds = (datetime.now(CET) - start_dt).total_seconds()
                time_remaining = max(0, int(time_limit - elapsed_seconds))
            except Exception:
                time_remaining = int(time_limit)
        if sio:
            await sio.emit('round_resumed', _jsonable({'activity_id': activity_id, 'current_round': updated.get('current_round',1), 'round_status': 'active', 'time_limit_per_round': time_limit, 'time_remaining': time_remaining, 'timestamp': datetime.now(CET).isoformat()}))
    except Exception:
        pass
    return ActivityResponse(**_normalize_activity(updated))


@router.get(f"{ENDPOINT}/activities/{{activity_id}}/rounds/status", tags=["Activities","Rounds"], summary="Get current round status and time remaining")
async def get_round_status(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    current_round = activity.get('current_round',1)
    total_rounds = activity.get('total_rounds',1)
    round_status = activity.get('round_status','not_started')
    round_start_time = activity.get('round_start_time')
    time_limit_per_round = activity.get('time_limit_per_round')
    response = {'activity_id': activity_id, 'current_round': current_round, 'total_rounds': total_rounds, 'round_status': round_status, 'round_start_time': round_start_time, 'time_limit_per_round': time_limit_per_round, 'time_remaining': time_limit_per_round, 'time_elapsed': None}
    if round_status == 'active' and round_start_time and time_limit_per_round:
        try:
            start_dt = datetime.fromisoformat(round_start_time.replace('Z','+00:00'))
            now = datetime.now(CET)
            elapsed_seconds = (now - start_dt).total_seconds()
            remaining_seconds = max(0, time_limit_per_round - elapsed_seconds)
            response['time_elapsed'] = int(elapsed_seconds)
            response['time_remaining'] = int(remaining_seconds)
            response['is_overtime'] = elapsed_seconds > time_limit_per_round
        except Exception:
            pass
    return response


# Activity Teams (opt-in)
@router.get(f"{ENDPOINT}/activities/{{activity_id}}/teams", response_model=ActivityTeamListResponse, tags=["Activity Teams"], summary="List teams for activity")
async def get_activity_teams(activity_id: int):
    teams = ActivityTeamRepository.get_teams(activity_id)
    return ActivityTeamListResponse(teams=[ActivityTeamResponse(**t) for t in teams])


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/teams", response_model=ActivityTeamResponse, tags=["Activity Teams"], summary="Add team to activity")
async def add_team_to_activity(activity_id: int, request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    team_id = payload.get('team_id')
    if not team_id:
        raise HTTPException(status_code=422, detail="Field 'team_id' is required")
    ActivityTeamRepository.add_team(activity_id, team_id, 1)
    teams = ActivityTeamRepository.get_teams(activity_id)
    team = next((t for t in teams if int(t['id']) == int(team_id)), None)
    return ActivityTeamResponse(**team) if team else ActivityTeamResponse(activity_id=activity_id, team_id=team_id, opted_in=1, id=-1, joined_at=datetime.now(CET))


@router.delete(f"{ENDPOINT}/activities/{{activity_id}}/teams/{{team_id}}", tags=["Activity Teams"], summary="Remove team from activity")
async def remove_team_from_activity(activity_id: int, team_id: int):
    success = ActivityTeamRepository.remove_team(activity_id, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove team from activity")
    return {"message": "Team removed from activity"}


# Activity Players (opt-in)
@router.get(f"{ENDPOINT}/activities/{{activity_id}}/players", response_model=ActivityPlayerListResponse, tags=["Activity Players"], summary="List players for activity")
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


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/players", response_model=ActivityPlayerResponse, tags=["Activity Players"], summary="Add player to activity")
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


@router.delete(f"{ENDPOINT}/activities/{{activity_id}}/players/{{player_id}}", tags=["Activity Players"], summary="Remove player from activity")
async def remove_player_from_activity(activity_id: int, player_id: int):
    success = ActivityPlayerRepository.remove_player(activity_id, player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove player from activity")
    return {"message": "Player removed from activity"}


# Activity Scores and Leaderboard
@router.get(f"{ENDPOINT}/activities/{{activity_id}}/scores", response_model=ActivityScoreListResponse, tags=["Activity Scores"], summary="List scores for activity")
async def get_activity_scores(activity_id: int):
    scores = ActivityScoreRepository.get_scores_by_activity(activity_id)
    return ActivityScoreListResponse(scores=[ActivityScoreResponse(**s) for s in scores])


@router.post(f"{ENDPOINT}/activities/{{activity_id}}/scores", response_model=ActivityScoreResponse, tags=["Activity Scores"], summary="Create score for activity")
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
    try:
        activity_obj = ActivityRepository.get_activity_by_id(activity_id)
        session_for_activity = activity_obj.get('session_id') if activity_obj else None
    except Exception:
        session_for_activity = None

    if sio:
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


@router.get(f"{ENDPOINT}/activities/{{activity_id}}/leaderboard", tags=["Activities"], summary="Get activity leaderboard")
async def get_activity_leaderboard(activity_id: int):
    activity = ActivityRepository.get_activity_by_id(activity_id)
    session = None
    if activity and activity.get('session_id'):
        session = SessionRepository.get_session_by_id(activity['session_id'])
        scores = ActivityScoreRepository.get_scores_by_activity(activity_id) or []
        team_level_totals = {}
        player_totals = {}
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
        teams = SessionTeamRepository.get_teams_by_session(activity['session_id'])
        team_player_values = {}
        for pid, info in player_totals.items():
            t = info.get('team_id')
            if t is None:
                continue
            team_player_values.setdefault(t, []).append({'player_id': pid, 'total': info.get('total', 0)})
        leaderboard = []
        is_time = (activity and activity.get('game_type') == 'team_vs_time')
        aggregate_player_times = bool(activity.get('aggregate_player_times'))
        time_winner = (activity.get('time_winner') or 'lower').lower()
        for team in teams:
            tid = team['id']
            name = team['name']
            icon = team.get('icon')
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
                    score_val = team_level_totals.get(tid, 0)
            else:
                score_val = team_level_totals.get(tid, 0)
                score_val += sum([p['total'] for p in team_player_values.get(tid, [])])
            leaderboard.append({'team_id': tid, 'name': name, 'icon': icon, 'score': score_val, 'team_color': team.get('color'), 'players': [], 'playerScores': { str(p['player_id']): p['total'] for p in team_player_values.get(tid, []) }})
        return {"leaderboard": leaderboard, "session": session}
    else:
        leaderboard = ActivityScoreRepository.get_leaderboard(activity_id)
        return {"leaderboard": leaderboard, "session": session}
