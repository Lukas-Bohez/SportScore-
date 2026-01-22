from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.database.datarepository import PlayerRepository
from backend.models.models import PlayerListResponse, PlayerResponse, PlayerCreate, PlayerUpdate

router = APIRouter()
ENDPOINT = "/api/v1"


@router.get(f"{ENDPOINT}/players", response_model=PlayerListResponse, tags=["Players"], summary="List players")
async def get_players(team_id: Optional[int] = Query(None)):
    if team_id:
        players = PlayerRepository.get_players_by_team(team_id)
    else:
        players = PlayerRepository.get_all_players()
    return {"players": [PlayerResponse(**player) for player in players]}


@router.post(f"{ENDPOINT}/players", response_model=PlayerResponse, tags=["Players"], summary="Create player")
async def create_player(player: PlayerCreate):
    player_id = PlayerRepository.create_player(player.name, player.team_id, player.position)
    if not player_id:
        raise HTTPException(status_code=400, detail="Failed to create player")
    created_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**created_player)


@router.get(f"{ENDPOINT}/players/{{player_id}}", response_model=PlayerResponse, tags=["Players"], summary="Get player by id")
async def get_player(player_id: int):
    player = PlayerRepository.get_player_by_id(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return PlayerResponse(**player)


@router.put(f"{ENDPOINT}/players/{{player_id}}", response_model=PlayerResponse, tags=["Players"], summary="Update player")
async def update_player(player_id: int, player_update: PlayerUpdate):
    update_data = player_update.dict(exclude_unset=True)
    success = PlayerRepository.update_player_fields(player_id, update_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update player")
    updated_player = PlayerRepository.get_player_by_id(player_id)
    return PlayerResponse(**updated_player)


@router.delete(f"{ENDPOINT}/players/{{player_id}}", tags=["Players"], summary="Delete player")
async def delete_player(player_id: int):
    success = PlayerRepository.delete_player(player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete player")
    return {"message": "Player deleted successfully"}
