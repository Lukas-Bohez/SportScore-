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
    color: str = "#333333"
    icon: str = "team"
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None

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

# Activity Models (NEW)
class ActivityBase(BaseModel):
    name: str
    sport_type: str = "custom"
    game_type: str = "custom"
    scoring_mode: str = "team"  # "team", "team_with_players", or "player"
    # For time-based activities (e.g., team_vs_time): 'lower' means lower time wins, 'higher' means higher time wins
    time_winner: str = "lower"
    # If true, aggregate individual player times to produce a team total
    aggregate_player_times: bool = False
    total_rounds: int = 1
    time_limit: Optional[int] = None
    description: Optional[str] = None

class ActivityCreate(ActivityBase):
    session_id: Optional[int] = None

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    sport_type: Optional[str] = None
    game_type: Optional[str] = None
    scoring_mode: Optional[str] = None
    time_winner: Optional[str] = None
    aggregate_player_times: Optional[bool] = None
    status: Optional[str] = None
    current_round: Optional[int] = None
    total_rounds: Optional[int] = None
    time_limit: Optional[int] = None
    description: Optional[str] = None

class ActivityResponse(ActivityBase):
    id: int
    session_id: Optional[int] = None
    status: str = "setup"
    current_round: int = 1
    created_at: datetime
    updated_at: datetime

class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]

# Activity Team Models (NEW)
class ActivityTeamBase(BaseModel):
    activity_id: int
    team_id: int
    opted_in: int = 1

class ActivityTeamCreate(ActivityTeamBase):
    pass

class ActivityTeamUpdate(BaseModel):
    opted_in: Optional[int] = None

class ActivityTeamResponse(ActivityTeamBase):
    id: int
    joined_at: datetime

class ActivityTeamListResponse(BaseModel):
    teams: List[ActivityTeamResponse]

# Activity Player Models (NEW)
class ActivityPlayerBase(BaseModel):
    activity_id: int
    player_id: int
    opted_in: int = 1

class ActivityPlayerCreate(ActivityPlayerBase):
    pass

class ActivityPlayerUpdate(BaseModel):
    opted_in: Optional[int] = None

class ActivityPlayerResponse(ActivityPlayerBase):
    id: int
    joined_at: datetime

class ActivityPlayerListResponse(BaseModel):
    players: List[ActivityPlayerResponse]

# Activity Score Models (NEW)
class ActivityScoreBase(BaseModel):
    activity_id: int
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    points: int
    reason: Optional[str] = None
    round_number: int = 1

class ActivityScoreCreate(ActivityScoreBase):
    pass

class ActivityScoreUpdate(BaseModel):
    points: Optional[int] = None
    reason: Optional[str] = None
    round_number: Optional[int] = None

class ActivityScoreResponse(ActivityScoreBase):
    id: int
    score_type: str
    timestamp: datetime

class ActivityScoreListResponse(BaseModel):
    scores: List[ActivityScoreResponse]

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
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None

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