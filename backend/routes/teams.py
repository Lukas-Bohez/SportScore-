from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.database.datarepository import TeamRepository, PlayerRepository, SessionTeamRepository
from backend.models.models import TeamListResponse, TeamResponse, TeamCreate, TeamUpdate, PlayerResponse

router = APIRouter()
ENDPOINT = "/api/v1"


@router.get(f"{ENDPOINT}/teams", response_model=TeamListResponse, tags=["Teams"], summary="List teams")
async def get_teams(sport_id: Optional[int] = Query(None)):
    if sport_id:
        teams = TeamRepository.get_teams_by_sport(sport_id)
    else:
        teams = TeamRepository.get_all_teams()
    return {"teams": [TeamResponse(**team) for team in teams]}


@router.post(f"{ENDPOINT}/teams", response_model=TeamResponse, tags=["Teams"], summary="Create team")
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


@router.get(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse, tags=["Teams"], summary="Get team by id")
async def get_team(team_id: int):
    team = TeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)


@router.put(f"{ENDPOINT}/teams/{{team_id}}", response_model=TeamResponse, tags=["Teams"], summary="Update team")
async def update_team(team_id: int, team_update: TeamUpdate):
    success = TeamRepository.update_team(team_id, team_update.name, team_update.color, team_update.icon, team_update.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update team")
    updated_team = TeamRepository.get_team_by_id(team_id)
    return TeamResponse(**updated_team)


@router.delete(f"{ENDPOINT}/teams/{{team_id}}", tags=["Teams"], summary="Delete team")
async def delete_team(team_id: int):
    success = TeamRepository.delete_team(team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete team")
    return {"message": "Team deleted successfully"}


@router.put(f"{ENDPOINT}/teams/{{team_id}}/players/{{player_id}}", response_model=PlayerResponse, tags=["Teams"], summary="Assign player to team")
async def assign_player_to_team(team_id: int, player_id: int):
    team = TeamRepository.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    player = PlayerRepository.get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    success = PlayerRepository.update_player(player_id, None, team_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign player to team")

    updated_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**updated_player)


# Standalone Teams (list-only)
@router.get(
    f"{ENDPOINT}/standalone-teams",
    tags=["Standalone Teams"],
    summary="List all teams (independent of sessions)"
)
async def get_all_standalone_teams():
    """Get all teams that can be reused across sessions."""
    teams = SessionTeamRepository.get_all_teams()
    return {"teams": teams}


@router.get(
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
