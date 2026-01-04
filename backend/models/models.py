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
    team_id: Optional[int] = None
    position: Optional[str] = None

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    team_id: Optional[int] = None
    position: Optional[str] = None

class PlayerResponse(PlayerBase):
    id: int

# Session player assignment models
class SessionPlayerBase(BaseModel):
    session_id: int
    team_id: int
    player_id: int

class SessionPlayerCreate(BaseModel):
    """Request model for assigning a player to a team within a session"""
    team_id: int
    player_id: int

class SessionPlayerUpdate(BaseModel):
    team_id: Optional[int] = None

class SessionPlayerResponse(SessionPlayerBase):
    id: int
    assigned_at: Optional[datetime] = None

class SessionPlayerListResponse(BaseModel):
    assignments: List[SessionPlayerResponse]

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

class GameStatusUpdate(BaseModel):
    game_id: int
    status: str
    timestamp: datetime

# Session Models (for teambuilding activities)
class SessionBase(BaseModel):
    name: str
    sport_type: str = "custom"  # Type of sport/activity for theming
    game_type: str = "custom"
    max_teams: int = 10
    total_rounds: int = 1
    time_limit: Optional[int] = None
    scoring_mode: str = "team"  # "team", "team_with_players", or "player"
    show_players: bool = True  # Whether to show players on scoreboard

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    name: Optional[str] = None
    sport_type: Optional[str] = None
    game_type: Optional[str] = None
    status: Optional[str] = None
    max_teams: Optional[int] = None
    current_round: Optional[int] = None
    total_rounds: Optional[int] = None
    time_limit: Optional[int] = None
    scoring_mode: Optional[str] = None
    show_players: Optional[bool] = None

class SessionResponse(SessionBase):
    id: int
    status: str = "setup"
    current_round: int = 1
    created_at: datetime
    updated_at: datetime

# Session Team Models
class SessionTeamBase(BaseModel):
    session_id: int
    name: str
    color: str = "#333333"
    icon: str = "team"

class SessionTeamCreate(SessionTeamBase):
    pass

class SessionTeamUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    score: Optional[int] = None
    is_eliminated: Optional[bool] = None

class SessionTeamResponse(SessionTeamBase):
    id: int
    score: int = 0
    is_eliminated: bool = False
    created_at: datetime
    updated_at: datetime

# Session Score Models
class SessionScoreBase(BaseModel):
    session_id: int
    team_id: int
    points: int
    reason: Optional[str] = None
    round_number: int = 1
    player_id: Optional[int] = None

class SessionScoreCreate(SessionScoreBase):
    pass

class SessionScoreUpdate(BaseModel):
    points: Optional[int] = None
    reason: Optional[str] = None
    round_number: Optional[int] = None
    player_id: Optional[int] = None

class SessionScoreResponse(SessionScoreBase):
    id: int
    timestamp: datetime

# Response models for lists (updated)
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

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]

class SessionTeamListResponse(BaseModel):
    teams: List[SessionTeamResponse]

class SessionScoreListResponse(BaseModel):
    scores: List[SessionScoreResponse]

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