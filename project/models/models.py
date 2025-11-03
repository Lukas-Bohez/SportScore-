from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Sport Models
class SportBase(BaseModel):
    name: str
    description: Optional[str] = None

class SportCreate(SportBase):
    pass

class SportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SportResponse(SportBase):
    id: int

# Team Models
class TeamBase(BaseModel):
    name: str
    sport_id: int

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    sport_id: Optional[int] = None

class TeamResponse(TeamBase):
    id: int

# Player Models
class PlayerBase(BaseModel):
    name: str
    team_id: int

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    team_id: Optional[int] = None

class PlayerResponse(PlayerBase):
    id: int

# ScoreType Models
class ScoreTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class ScoreTypeCreate(ScoreTypeBase):
    pass

class ScoreTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ScoreTypeResponse(ScoreTypeBase):
    id: int

# Game Models
class GameBase(BaseModel):
    sport_id: int
    team1_id: int
    team2_id: int
    start_time: datetime
    status: str = "scheduled"  # scheduled, ongoing, finished

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    sport_id: Optional[int] = None
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None

class GameResponse(GameBase):
    id: int
    end_time: Optional[datetime] = None

# Score Models
class ScoreBase(BaseModel):
    game_id: int
    team_id: int
    score_type_id: int
    value: int
    player_id: Optional[int] = None

class ScoreCreate(ScoreBase):
    pass

class ScoreUpdate(BaseModel):
    value: Optional[int] = None

class ScoreResponse(ScoreBase):
    id: int
    timestamp: datetime

# Response models for lists
class SportListResponse(BaseModel):
    sports: List[SportResponse]

class TeamListResponse(BaseModel):
    teams: List[TeamResponse]

class PlayerListResponse(BaseModel):
    players: List[PlayerResponse]

class ScoreTypeListResponse(BaseModel):
    score_types: List[ScoreTypeResponse]

class GameListResponse(BaseModel):
    games: List[GameResponse]

class ScoreListResponse(BaseModel):
    scores: List[ScoreResponse]

# Error models
class ErrorMessage(BaseModel):
    detail: str

class ErrorNotFound(ErrorMessage):
    pass

# Additional models for real-time updates
class ScoreUpdateMessage(BaseModel):
    game_id: int
    team_id: int
    score_type: str
    value: int
    player_name: Optional[str] = None
    timestamp: datetime

class GameStatusUpdate(BaseModel):
    game_id: int
    status: str
    timestamp: datetime