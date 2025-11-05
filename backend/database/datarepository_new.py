"""
DataRepository - Nieuwe Eenvoudige Structuur
Alle repositories voor het werken met de nieuwe database structuur
"""

from .database import Database
from datetime import datetime
from typing import List, Optional, Dict, Any

# ===========================================
# SPORT REPOSITORY
# ===========================================
class SportRepository:
    """Repository voor het beheren van sporten"""

    @staticmethod
    def create(name: str, description: Optional[str] = None) -> int:
        """Maak een nieuwe sport aan"""
        sql = "INSERT INTO sports (name, description) VALUES (%s, %s)"
        return Database.execute_sql(sql, [name, description])

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Krijg alle sporten"""
        sql = "SELECT * FROM sports ORDER BY name ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_by_id(sport_id: int) -> Optional[Dict[str, Any]]:
        """Krijg sport op ID"""
        sql = "SELECT * FROM sports WHERE id = %s"
        return Database.get_one_row(sql, [sport_id])

    @staticmethod
    def update(sport_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        """Update een sport"""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
            
        if not updates:
            return False
            
        sql = f"UPDATE sports SET {', '.join(updates)} WHERE id = %s"
        params.append(sport_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete(sport_id: int) -> bool:
        """Verwijder een sport"""
        sql = "DELETE FROM sports WHERE id = %s"
        return Database.execute_sql(sql, [sport_id]) is not None


# ===========================================
# GAME REPOSITORY
# ===========================================
class GameRepository:
    """Repository voor het beheren van games/spellen"""

    @staticmethod
    def create(name: str, sport_id: int, game_type: str = 'custom', 
               total_rounds: int = 1, time_limit: Optional[int] = None,
               settings: Optional[Dict] = None) -> int:
        """Maak een nieuw spel aan"""
        sql = """INSERT INTO games (name, sport_id, game_type, total_rounds, time_limit, settings)
                 VALUES (%s, %s, %s, %s, %s, %s)"""
        import json
        settings_json = json.dumps(settings) if settings else None
        return Database.execute_sql(sql, [name, sport_id, game_type, total_rounds, time_limit, settings_json])

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Krijg alle spellen"""
        sql = """SELECT g.*, s.name as sport_name 
                 FROM games g 
                 JOIN sports s ON g.sport_id = s.id 
                 ORDER BY g.created_at DESC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_by_id(game_id: int) -> Optional[Dict[str, Any]]:
        """Krijg spel op ID"""
        sql = """SELECT g.*, s.name as sport_name 
                 FROM games g 
                 JOIN sports s ON g.sport_id = s.id 
                 WHERE g.id = %s"""
        return Database.get_one_row(sql, [game_id])

    @staticmethod
    def get_active() -> List[Dict[str, Any]]:
        """Krijg alle actieve spellen"""
        sql = """SELECT g.*, s.name as sport_name 
                 FROM games g 
                 JOIN sports s ON g.sport_id = s.id 
                 WHERE g.status IN ('setup', 'active', 'paused') 
                 ORDER BY g.updated_at DESC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_by_sport(sport_id: int) -> List[Dict[str, Any]]:
        """Krijg alle spellen voor een sport"""
        sql = """SELECT g.*, s.name as sport_name 
                 FROM games g 
                 JOIN sports s ON g.sport_id = s.id 
                 WHERE g.sport_id = %s 
                 ORDER BY g.start_time DESC"""
        return Database.get_rows(sql, [sport_id])

    @staticmethod
    def update(game_id: int, name: Optional[str] = None, status: Optional[str] = None,
               current_round: Optional[int] = None, end_time: Optional[datetime] = None,
               settings: Optional[Dict] = None) -> bool:
        """Update een spel"""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if current_round is not None:
            updates.append("current_round = %s")
            params.append(current_round)
        if end_time is not None:
            updates.append("end_time = %s")
            params.append(end_time)
        if settings is not None:
            import json
            updates.append("settings = %s")
            params.append(json.dumps(settings))
            
        if not updates:
            return False
            
        sql = f"UPDATE games SET {', '.join(updates)} WHERE id = %s"
        params.append(game_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def start(game_id: int) -> bool:
        """Start een spel"""
        sql = "UPDATE games SET status = 'active', start_time = %s WHERE id = %s"
        return Database.execute_sql(sql, [datetime.now(), game_id]) is not None

    @staticmethod
    def pause(game_id: int) -> bool:
        """Pauzeer een spel"""
        sql = "UPDATE games SET status = 'paused' WHERE id = %s"
        return Database.execute_sql(sql, [game_id]) is not None

    @staticmethod
    def complete(game_id: int) -> bool:
        """Voltooi een spel"""
        sql = "UPDATE games SET status = 'completed', end_time = %s WHERE id = %s"
        return Database.execute_sql(sql, [datetime.now(), game_id]) is not None

    @staticmethod
    def delete(game_id: int) -> bool:
        """Verwijder een spel (en alle bijbehorende teams, spelers, scores)"""
        sql = "DELETE FROM games WHERE id = %s"
        return Database.execute_sql(sql, [game_id]) is not None


# ===========================================
# TEAM REPOSITORY
# ===========================================
class TeamRepository:
    """Repository voor het beheren van teams"""

    @staticmethod
    def create(game_id: int, name: str, color: str = '#3B82F6', icon: str = 'team') -> int:
        """Maak een nieuw team aan"""
        sql = "INSERT INTO teams (game_id, name, color, icon) VALUES (%s, %s, %s, %s)"
        return Database.execute_sql(sql, [game_id, name, color, icon])

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Krijg alle teams"""
        sql = """SELECT t.*, g.name as game_name, g.status as game_status
                 FROM teams t
                 JOIN games g ON t.game_id = g.id
                 ORDER BY g.id, t.name"""
        return Database.get_rows(sql)

    @staticmethod
    def get_by_id(team_id: int) -> Optional[Dict[str, Any]]:
        """Krijg team op ID"""
        sql = """SELECT t.*, g.name as game_name, g.status as game_status
                 FROM teams t
                 JOIN games g ON t.game_id = g.id
                 WHERE t.id = %s"""
        return Database.get_one_row(sql, [team_id])

    @staticmethod
    def get_by_game(game_id: int, include_eliminated: bool = True) -> List[Dict[str, Any]]:
        """Krijg alle teams voor een spel"""
        if include_eliminated:
            sql = "SELECT * FROM teams WHERE game_id = %s ORDER BY name"
            return Database.get_rows(sql, [game_id])
        else:
            sql = "SELECT * FROM teams WHERE game_id = %s AND is_eliminated = FALSE ORDER BY name"
            return Database.get_rows(sql, [game_id])

    @staticmethod
    def get_leaderboard(game_id: int) -> List[Dict[str, Any]]:
        """Krijg leaderboard voor een spel"""
        sql = """SELECT * FROM v_game_leaderboard 
                 WHERE game_id = %s 
                 ORDER BY total_score DESC, team_name"""
        return Database.get_rows(sql, [game_id])

    @staticmethod
    def update(team_id: int, name: Optional[str] = None, color: Optional[str] = None,
               icon: Optional[str] = None, is_eliminated: Optional[bool] = None) -> bool:
        """Update een team"""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if color is not None:
            updates.append("color = %s")
            params.append(color)
        if icon is not None:
            updates.append("icon = %s")
            params.append(icon)
        if is_eliminated is not None:
            updates.append("is_eliminated = %s")
            params.append(is_eliminated)
            
        if not updates:
            return False
            
        sql = f"UPDATE teams SET {', '.join(updates)} WHERE id = %s"
        params.append(team_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def eliminate(team_id: int) -> bool:
        """Elimineer een team"""
        sql = "UPDATE teams SET is_eliminated = TRUE WHERE id = %s"
        return Database.execute_sql(sql, [team_id]) is not None

    @staticmethod
    def delete(team_id: int) -> bool:
        """Verwijder een team"""
        sql = "DELETE FROM teams WHERE id = %s"
        return Database.execute_sql(sql, [team_id]) is not None


# ===========================================
# PLAYER REPOSITORY
# ===========================================
class PlayerRepository:
    """Repository voor het beheren van spelers"""

    @staticmethod
    def create(team_id: int, name: str, position: Optional[str] = None) -> int:
        """Maak een nieuwe speler aan"""
        sql = "INSERT INTO players (team_id, name, position) VALUES (%s, %s, %s)"
        return Database.execute_sql(sql, [team_id, name, position])

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Krijg alle spelers"""
        sql = """SELECT p.*, t.name as team_name, g.name as game_name
                 FROM players p
                 JOIN teams t ON p.team_id = t.id
                 JOIN games g ON t.game_id = g.id
                 ORDER BY g.id, t.name, p.name"""
        return Database.get_rows(sql)

    @staticmethod
    def get_by_id(player_id: int) -> Optional[Dict[str, Any]]:
        """Krijg speler op ID"""
        sql = """SELECT p.*, t.name as team_name, g.name as game_name
                 FROM players p
                 JOIN teams t ON p.team_id = t.id
                 JOIN games g ON t.game_id = g.id
                 WHERE p.id = %s"""
        return Database.get_one_row(sql, [player_id])

    @staticmethod
    def get_by_team(team_id: int) -> List[Dict[str, Any]]:
        """Krijg alle spelers van een team"""
        sql = "SELECT * FROM players WHERE team_id = %s ORDER BY name"
        return Database.get_rows(sql, [team_id])

    @staticmethod
    def get_stats(game_id: int) -> List[Dict[str, Any]]:
        """Krijg speler statistieken voor een spel"""
        sql = "SELECT * FROM v_player_stats WHERE game_id = %s ORDER BY total_points DESC"
        return Database.get_rows(sql, [game_id])

    @staticmethod
    def update(player_id: int, name: Optional[str] = None, position: Optional[str] = None) -> bool:
        """Update een speler"""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if position is not None:
            updates.append("position = %s")
            params.append(position)
            
        if not updates:
            return False
            
        sql = f"UPDATE players SET {', '.join(updates)} WHERE id = %s"
        params.append(player_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete(player_id: int) -> bool:
        """Verwijder een speler"""
        sql = "DELETE FROM players WHERE id = %s"
        return Database.execute_sql(sql, [player_id]) is not None


# ===========================================
# SCORE REPOSITORY
# ===========================================
class ScoreRepository:
    """Repository voor het beheren van scores"""

    @staticmethod
    def create(game_id: int, team_id: int, points: int, 
               score_type: str = 'point', reason: Optional[str] = None,
               player_id: Optional[int] = None, round_number: int = 1) -> int:
        """Maak een nieuwe score aan"""
        sql = """INSERT INTO scores (game_id, team_id, player_id, points, score_type, reason, round_number)
                 VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        return Database.execute_sql(sql, [game_id, team_id, player_id, points, score_type, reason, round_number])

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Krijg alle scores"""
        sql = """SELECT s.*, t.name as team_name, g.name as game_name,
                        t.color as team_color, p.name as player_name
                 FROM scores s
                 JOIN teams t ON s.team_id = t.id
                 JOIN games g ON s.game_id = g.id
                 LEFT JOIN players p ON s.player_id = p.id
                 ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_by_id(score_id: int) -> Optional[Dict[str, Any]]:
        """Krijg score op ID"""
        sql = """SELECT s.*, t.name as team_name, g.name as game_name,
                        t.color as team_color, p.name as player_name
                 FROM scores s
                 JOIN teams t ON s.team_id = t.id
                 JOIN games g ON s.game_id = g.id
                 LEFT JOIN players p ON s.player_id = p.id
                 WHERE s.id = %s"""
        return Database.get_one_row(sql, [score_id])

    @staticmethod
    def get_by_game(game_id: int) -> List[Dict[str, Any]]:
        """Krijg alle scores voor een spel"""
        sql = """SELECT s.*, t.name as team_name, t.color as team_color, p.name as player_name
                 FROM scores s
                 JOIN teams t ON s.team_id = t.id
                 LEFT JOIN players p ON s.player_id = p.id
                 WHERE s.game_id = %s
                 ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql, [game_id])

    @staticmethod
    def get_by_team(team_id: int) -> List[Dict[str, Any]]:
        """Krijg alle scores voor een team"""
        sql = """SELECT s.*, p.name as player_name
                 FROM scores s
                 LEFT JOIN players p ON s.player_id = p.id
                 WHERE s.team_id = %s
                 ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql, [team_id])

    @staticmethod
    def get_by_player(player_id: int) -> List[Dict[str, Any]]:
        """Krijg alle scores voor een speler"""
        sql = "SELECT * FROM scores WHERE player_id = %s ORDER BY timestamp DESC"
        return Database.get_rows(sql, [player_id])

    @staticmethod
    def get_total_for_team(game_id: int, team_id: int) -> int:
        """Krijg totale score voor een team in een spel"""
        sql = "SELECT COALESCE(SUM(points), 0) as total FROM scores WHERE game_id = %s AND team_id = %s"
        result = Database.get_one_row(sql, [game_id, team_id])
        return result['total'] if result else 0

    @staticmethod
    def update(score_id: int, points: Optional[int] = None, reason: Optional[str] = None) -> bool:
        """Update een score"""
        updates = []
        params = []
        
        if points is not None:
            updates.append("points = %s")
            params.append(points)
        if reason is not None:
            updates.append("reason = %s")
            params.append(reason)
            
        if not updates:
            return False
            
        sql = f"UPDATE scores SET {', '.join(updates)} WHERE id = %s"
        params.append(score_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete(score_id: int) -> bool:
        """Verwijder een score"""
        sql = "DELETE FROM scores WHERE id = %s"
        return Database.execute_sql(sql, [score_id]) is not None
