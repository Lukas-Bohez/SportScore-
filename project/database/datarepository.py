from .database import Database
from datetime import datetime
from typing import List, Optional, Dict, Any

class SportRepository:

    @staticmethod
    def create_sport(name: str, description: Optional[str] = None) -> int:
        sql = "INSERT INTO sports (name, description) VALUES (%s, %s)"
        params = [name, description]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_sports() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM sports ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_sport_by_id(sport_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM sports WHERE id = %s"
        params = [sport_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def update_sport(sport_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        sql = "UPDATE sports SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = %s"
        params.append(sport_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_sport(sport_id: int) -> bool:
        sql = "DELETE FROM sports WHERE id = %s"
        params = [sport_id]
        return Database.execute_sql(sql, params) is not None

class TeamRepository:

    @staticmethod
    def create_team(name: str, sport_id: int) -> int:
        sql = "INSERT INTO teams (name, sport_id) VALUES (%s, %s)"
        params = [name, sport_id]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_teams() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM teams ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_team_by_id(team_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM teams WHERE id = %s"
        params = [team_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_teams_by_sport(sport_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM teams WHERE sport_id = %s ORDER BY id ASC"
        params = [sport_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def update_team(team_id: int, name: Optional[str] = None, sport_id: Optional[int] = None) -> bool:
        sql = "UPDATE teams SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if sport_id is not None:
            updates.append("sport_id = %s")
            params.append(sport_id)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = %s"
        params.append(team_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_team(team_id: int) -> bool:
        sql = "DELETE FROM teams WHERE id = %s"
        params = [team_id]
        return Database.execute_sql(sql, params) is not None

class PlayerRepository:

    @staticmethod
    def create_player(name: str, team_id: int) -> int:
        sql = "INSERT INTO players (name, team_id) VALUES (%s, %s)"
        params = [name, team_id]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_players() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM players ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_player_by_id(player_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM players WHERE id = %s"
        params = [player_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_players_by_team(team_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM players WHERE team_id = %s ORDER BY id ASC"
        params = [team_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def update_player(player_id: int, name: Optional[str] = None, team_id: Optional[int] = None) -> bool:
        sql = "UPDATE players SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if team_id is not None:
            updates.append("team_id = %s")
            params.append(team_id)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = %s"
        params.append(player_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_player(player_id: int) -> bool:
        sql = "DELETE FROM players WHERE id = %s"
        params = [player_id]
        return Database.execute_sql(sql, params) is not None

class ScoreTypeRepository:

    @staticmethod
    def create_score_type(name: str, description: Optional[str] = None) -> int:
        sql = "INSERT INTO score_types (name, description) VALUES (%s, %s)"
        params = [name, description]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_score_types() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM score_types ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_score_type_by_id(score_type_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM score_types WHERE id = %s"
        params = [score_type_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def update_score_type(score_type_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        sql = "UPDATE score_types SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = %s"
        params.append(score_type_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_score_type(score_type_id: int) -> bool:
        sql = "DELETE FROM score_types WHERE id = %s"
        params = [score_type_id]
        return Database.execute_sql(sql, params) is not None

class GameRepository:

    @staticmethod
    def create_game(sport_id: int, team1_id: int, team2_id: int, start_time: datetime, status: str = "scheduled") -> int:
        sql = "INSERT INTO games (sport_id, team1_id, team2_id, start_time, status) VALUES (%s, %s, %s, %s, %s)"
        params = [sport_id, team1_id, team2_id, start_time, status]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_games() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM games ORDER BY start_time DESC"
        return Database.get_rows(sql)

    @staticmethod
    def get_game_by_id(game_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM games WHERE id = %s"
        params = [game_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_games_by_sport(sport_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM games WHERE sport_id = %s ORDER BY start_time DESC"
        params = [sport_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def update_game(game_id: int, sport_id: Optional[int] = None, team1_id: Optional[int] = None,
                   team2_id: Optional[int] = None, start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None, status: Optional[str] = None) -> bool:
        sql = "UPDATE games SET "
        params = []
        updates = []
        if sport_id is not None:
            updates.append("sport_id = %s")
            params.append(sport_id)
        if team1_id is not None:
            updates.append("team1_id = %s")
            params.append(team1_id)
        if team2_id is not None:
            updates.append("team2_id = %s")
            params.append(team2_id)
        if start_time is not None:
            updates.append("start_time = %s")
            params.append(start_time)
        if end_time is not None:
            updates.append("end_time = %s")
            params.append(end_time)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = %s"
        params.append(game_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_game(game_id: int) -> bool:
        sql = "DELETE FROM games WHERE id = %s"
        params = [game_id]
        return Database.execute_sql(sql, params) is not None

class ScoreRepository:

    @staticmethod
    def create_score(game_id: int, team_id: int, score_type_id: int, value: int, player_id: Optional[int] = None) -> int:
        sql = "INSERT INTO scores (game_id, team_id, score_type_id, value, player_id) VALUES (%s, %s, %s, %s, %s)"
        params = [game_id, team_id, score_type_id, value, player_id]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_scores() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM scores ORDER BY timestamp DESC"
        return Database.get_rows(sql)

    @staticmethod
    def get_score_by_id(score_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM scores WHERE id = %s"
        params = [score_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_scores_by_game(game_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM scores WHERE game_id = %s ORDER BY timestamp ASC"
        params = [game_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def get_scores_by_team(team_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM scores WHERE team_id = %s ORDER BY timestamp DESC"
        params = [team_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def update_score(score_id: int, value: Optional[int] = None) -> bool:
        if value is None:
            return False
        sql = "UPDATE scores SET value = %s WHERE id = %s"
        params = [value, score_id]
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_score(score_id: int) -> bool:
        sql = "DELETE FROM scores WHERE id = %s"
        params = [score_id]
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def get_game_score_summary(game_id: int) -> Dict[str, Any]:
        sql = """
        SELECT
            t.id as team_id,
            t.name as team_name,
            st.name as score_type,
            SUM(s.value) as total_score
        FROM scores s
        JOIN teams t ON s.team_id = t.id
        JOIN score_types st ON s.score_type_id = st.id
        WHERE s.game_id = %s
        GROUP BY t.id, t.name, st.name
        ORDER BY t.id, st.name
        """
        params = [game_id]
        results = Database.get_rows(sql, params)
        return results if results else []