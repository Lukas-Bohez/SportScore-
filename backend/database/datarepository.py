from .database import Database
from datetime import datetime
from typing import List, Optional, Dict, Any
import json

class SportRepository:

    @staticmethod
    def create_sport(name: str, description: Optional[str] = None) -> int:
        sql = "INSERT INTO sports (name, description) VALUES (?, ?)"
        params = [name, description]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_sports() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM sports ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_sport_by_id(sport_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM sports WHERE id = ?"
        params = [sport_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def update_sport(sport_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        sql = "UPDATE sports SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = ?"
        params.append(sport_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_sport(sport_id: int) -> bool:
        sql = "DELETE FROM sports WHERE id = ?"
        params = [sport_id]
        return Database.execute_sql(sql, params) is not None

class TeamRepository:
    """
    LEGACY: Deze repository wordt niet meer gebruikt in de nieuwe structuur.
    Teams zijn nu direct gekoppeld aan games, niet aan sports.
    Gebruik SessionTeamRepository voor team beheer.
    """

    @staticmethod
    def create_team(name: str, sport_id: int) -> int:
        # Legacy functie - niet gebruiken in nieuwe code
        # Teams moeten nu via een game worden aangemaakt
        return None

    @staticmethod
    def get_all_teams() -> List[Dict[str, Any]]:
        # Geef alle teams terug (uit alle games) - LEGACY, gebruik SessionTeamRepository.get_all_teams()
        sql = """SELECT t.id, t.name, t.created_at, t.updated_at
                 FROM teams t ORDER BY t.id ASC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_team_by_id(team_id: int) -> Optional[Dict[str, Any]]:
        sql = """SELECT t.id, t.name, t.created_at, t.updated_at
                 FROM teams t WHERE t.id = ?"""
        return Database.get_one_row(sql, [team_id])

    @staticmethod
    def get_teams_by_sport(sport_id: int) -> List[Dict[str, Any]]:
        # Geef teams voor alle games van deze sport
        sql = """SELECT t.id, t.name, t.created_at, t.updated_at
                 FROM teams t
                 JOIN game_teams gt ON gt.team_id = t.id
                 JOIN games g ON g.id = gt.game_id
                 WHERE g.sport_id = ? ORDER BY t.id ASC"""
        return Database.get_rows(sql, [sport_id])

    @staticmethod
    def update_team(team_id: int, name: Optional[str] = None, sport_id: Optional[int] = None) -> bool:
        # In nieuwe structuur kunnen we alleen naam updaten
        if name is None:
            return False
        sql = "UPDATE teams SET name = ? WHERE id = ?"
        return Database.execute_sql(sql, [name, team_id]) is not None

    @staticmethod
    def delete_team(team_id: int) -> bool:
        sql = "DELETE FROM teams WHERE id = ?"
        return Database.execute_sql(sql, [team_id]) is not None

class PlayerRepository:

    @staticmethod
    def create_player(name: str, team_id: Optional[int] = None, position: Optional[str] = None) -> int:
        sql = "INSERT INTO players (name, team_id, position) VALUES (?, ?, ?)"
        params = [name, team_id, position]
        return Database.execute_sql(sql, params)

    @staticmethod
    def get_all_players() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM players ORDER BY id ASC"
        return Database.get_rows(sql)

    @staticmethod
    def get_player_by_id(player_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM players WHERE id = ?"
        params = [player_id]
        return Database.get_one_row(sql, params)

    @staticmethod
    def get_players_by_team(team_id: int) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM players WHERE team_id = ? ORDER BY id ASC"
        params = [team_id]
        return Database.get_rows(sql, params)

    @staticmethod
    def update_player(player_id: int, name: Optional[str] = None, team_id: Optional[int] = None,
                      position: Optional[str] = None) -> bool:
        sql = "UPDATE players SET "
        params = []
        updates = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if team_id is not None:
            updates.append("team_id = ?")
            params.append(team_id)
        if position is not None:
            updates.append("position = ?")
            params.append(position)

        if not updates:
            return False
        sql += ", ".join(updates) + " WHERE id = ?"
        params.append(player_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def update_player_fields(player_id: int, fields: Dict[str, Any]) -> bool:
        """
        Update player using an explicit fields dict. Allows setting fields to NULL
        by including the key with value None. Returns True on success.
        """
        if not fields:
            return False
        sql = "UPDATE players SET " + ", ".join(f"{k} = ?" for k in fields.keys()) + " WHERE id = ?"
        params = list(fields.values())
        params.append(player_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_player(player_id: int) -> bool:
        sql = "DELETE FROM players WHERE id = ?"
        params = [player_id]
        return Database.execute_sql(sql, params) is not None


class SessionPlayerRepository:
    """
    Manage per-session player assignments. A player can be assigned to at most
    one team per session. The default team for a player remains `players.team_id`.
    """

    @staticmethod
    def assign_player_to_session(session_id: int, team_id: int, player_id: int) -> int:
        """Assign a player to a team for a specific session. Returns the assignment id."""
        sql = "INSERT OR REPLACE INTO session_players (session_id, team_id, player_id) VALUES (?, ?, ?)"
        return Database.execute_sql(sql, [session_id, team_id, player_id])

    @staticmethod
    def remove_player_from_session(session_id: int, player_id: int) -> bool:
        sql = "DELETE FROM session_players WHERE session_id = ? AND player_id = ?"
        return Database.execute_sql(sql, [session_id, player_id]) is not None

    @staticmethod
    def get_players_by_session(session_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT sp.id, sp.session_id, sp.team_id, sp.player_id, sp.assigned_at, p.name as player_name
                 FROM session_players sp
                 JOIN players p ON p.id = sp.player_id
                 WHERE sp.session_id = ? ORDER BY p.name ASC"""
        return Database.get_rows(sql, [session_id])

    @staticmethod
    def get_players_by_session_team(session_id: int, team_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT sp.id, sp.session_id, sp.team_id, sp.player_id, sp.assigned_at, p.name as player_name
                 FROM session_players sp
                 JOIN players p ON p.id = sp.player_id
                 WHERE sp.session_id = ? AND sp.team_id = ? ORDER BY p.name ASC"""
        return Database.get_rows(sql, [session_id, team_id])

    @staticmethod
    def get_player_assignment(session_id: int, player_id: int) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM session_players WHERE session_id = ? AND player_id = ?"
        return Database.get_one_row(sql, [session_id, player_id])

class ScoreTypeRepository:
    """
    LEGACY: Score types tabel bestaat niet meer in nieuwe structuur.
    Score types zijn nu strings in de scores tabel (score_type kolom).
    Deze repository blijft beschikbaar voor backwards compatibility.
    """

    # Virtuele score types voor backwards compatibility
    _VIRTUAL_SCORE_TYPES = [
        {"id": 1, "name": "point", "description": "Algemene punten"},
        {"id": 2, "name": "goal", "description": "Doelpunt"},
        {"id": 3, "name": "bonus", "description": "Bonus punten"},
        {"id": 4, "name": "penalty", "description": "Strafpunten"},
    ]

    @staticmethod
    def create_score_type(name: str, description: Optional[str] = None) -> int:
        # Returneer een dummy ID - score types worden niet meer opgeslagen
        return len(ScoreTypeRepository._VIRTUAL_SCORE_TYPES) + 1

    @staticmethod
    def get_all_score_types() -> List[Dict[str, Any]]:
        # Returneer virtuele score types
        return ScoreTypeRepository._VIRTUAL_SCORE_TYPES.copy()

    @staticmethod
    def get_score_type_by_id(score_type_id: int) -> Optional[Dict[str, Any]]:
        for st in ScoreTypeRepository._VIRTUAL_SCORE_TYPES:
            if st["id"] == score_type_id:
                return st.copy()
        return None

    @staticmethod
    def update_score_type(score_type_id: int, name: Optional[str] = None, description: Optional[str] = None) -> bool:
        # Doe alsof update succesvol is
        return True

    @staticmethod
    def delete_score_type(score_type_id: int) -> bool:
        # Doe alsof delete succesvol is
        return True

class GameRepository:
    """
    LEGACY: Oude game API (voor 1-op-1 wedstrijden).
    In nieuwe structuur worden alle games opgeslagen in de games tabel,
    maar zonder team1_id/team2_id - teams worden apart opgeslagen.
    Deze repository blijft werken voor backwards compatibility.
    """

    @staticmethod
    def create_game(sport_id: int, team1_id: int, team2_id: int, start_time: datetime, status: str = "scheduled") -> int:
        # Maak een game aan en koppel de twee teams
        # Status mapping: scheduled -> setup, in_progress -> active, completed -> completed
        status_map = {
            "scheduled": "setup",
            "in_progress": "active",
            "ongoing": "active",
            "completed": "completed",
            "cancelled": "cancelled"
        }
        new_status = status_map.get(status, "setup")
        
        # Maak game aan
        sql = """INSERT INTO games (name, sport_id, game_type, status, start_time)
                 VALUES (?, ?, ?, ?, ?)"""
        # Genereer naam op basis van team namen
        game_name = f"Match {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        game_id = Database.execute_sql(sql, [game_name, sport_id, 'match', new_status, start_time])
        
        # Opmerking: team1_id en team2_id worden genegeerd omdat teams nu
        # via de teams tabel worden gekoppeld aan games
        return game_id

    @staticmethod
    def get_all_games() -> List[Dict[str, Any]]:
        # Haal alle games op, probeer team1 en team2 te simuleren
        sql = """SELECT g.id, g.sport_id, g.start_time, g.end_time,
                        CASE 
                            WHEN g.status = 'setup' THEN 'scheduled'
                            WHEN g.status = 'active' THEN 'in_progress'
                            WHEN g.status = 'paused' THEN 'in_progress'
                            ELSE g.status
                        END as status,
                        g.created_at, g.updated_at
                 FROM games g 
                 WHERE g.game_type = 'match'
                 ORDER BY g.start_time DESC"""
        games = Database.get_rows(sql)
        
        # Voeg dummy team IDs toe
        for game in games or []:
            teams = Database.get_rows("SELECT id FROM teams WHERE game_id = ? LIMIT 2", [game['id']])
            game['team1_id'] = teams[0]['id'] if len(teams) > 0 else None
            game['team2_id'] = teams[1]['id'] if len(teams) > 1 else None
        
        return games

    @staticmethod
    def get_game_by_id(game_id: int) -> Optional[Dict[str, Any]]:
        sql = """SELECT g.id, g.sport_id, g.start_time, g.end_time,
                        CASE 
                            WHEN g.status = 'setup' THEN 'scheduled'
                            WHEN g.status = 'active' THEN 'in_progress'
                            WHEN g.status = 'paused' THEN 'in_progress'
                            ELSE g.status
                        END as status,
                        g.created_at, g.updated_at
                 FROM games g WHERE g.id = ?"""
        game = Database.get_one_row(sql, [game_id])
        
        if game:
            teams = Database.get_rows("SELECT id FROM teams WHERE game_id = ? LIMIT 2", [game_id])
            game['team1_id'] = teams[0]['id'] if len(teams) > 0 else None
            game['team2_id'] = teams[1]['id'] if len(teams) > 1 else None
        
        return game

    @staticmethod
    def get_games_by_sport(sport_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT g.id, g.sport_id, g.start_time, g.end_time,
                        CASE 
                            WHEN g.status = 'setup' THEN 'scheduled'
                            WHEN g.status = 'active' THEN 'in_progress'
                            WHEN g.status = 'paused' THEN 'in_progress'
                            ELSE g.status
                        END as status,
                        g.created_at, g.updated_at
                 FROM games g 
                 WHERE g.sport_id = ? AND g.game_type = 'match'
                 ORDER BY g.start_time DESC"""
        games = Database.get_rows(sql, [sport_id])
        
        for game in games or []:
            teams = Database.get_rows("SELECT id FROM teams WHERE game_id = ? LIMIT 2", [game['id']])
            game['team1_id'] = teams[0]['id'] if len(teams) > 0 else None
            game['team2_id'] = teams[1]['id'] if len(teams) > 1 else None
        
        return games

    @staticmethod
    def update_game(game_id: int, sport_id: Optional[int] = None, team1_id: Optional[int] = None,
                   team2_id: Optional[int] = None, start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None, status: Optional[str] = None) -> bool:
        updates = []
        params = []
        
        if sport_id is not None:
            updates.append("sport_id = ?")
            params.append(sport_id)
        if start_time is not None:
            updates.append("start_time = ?")
            params.append(start_time)
        if end_time is not None:
            updates.append("end_time = ?")
            params.append(end_time)
        if status is not None:
            # Map old status to new status
            status_map = {
                "scheduled": "setup",
                "in_progress": "active",
                "ongoing": "active",
                "completed": "completed",
                "cancelled": "cancelled"
            }
            new_status = status_map.get(status, status)
            updates.append("status = ?")
            params.append(new_status)
        
        if not updates:
            return False
            
        sql = f"UPDATE games SET {', '.join(updates)} WHERE id = ?"
        params.append(game_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_game(game_id: int) -> bool:
        sql = "DELETE FROM games WHERE id = ?"
        return Database.execute_sql(sql, [game_id]) is not None

class ScoreRepository:
    """
    Score repository aangepast voor nieuwe structuur.
    score_type_id is nu score_type (string), value is nu points.
    """

    @staticmethod
    def create_score(game_id: int, team_id: int, score_type_id: int, value: int, player_id: Optional[int] = None) -> int:
        # Map score_type_id naar score_type string
        score_type_map = {
            1: "point",
            2: "goal",
            3: "bonus",
            4: "penalty"
        }
        score_type = score_type_map.get(score_type_id, "point")
        
        sql = """INSERT INTO scores (game_id, team_id, player_id, points, score_type)
                 VALUES (?, ?, ?, ?, ?)"""
        return Database.execute_sql(sql, [game_id, team_id, player_id, value, score_type])

    @staticmethod
    def get_all_scores() -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id, s.team_id, s.player_id, s.points as value,
                        CASE s.score_type
                            WHEN 'point' THEN 1
                            WHEN 'goal' THEN 2
                            WHEN 'bonus' THEN 3
                            WHEN 'penalty' THEN 4
                            ELSE 1
                        END as score_type_id,
                        s.timestamp
                 FROM scores s ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_score_by_id(score_id: int) -> Optional[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id, s.team_id, s.player_id, s.points as value,
                        CASE s.score_type
                            WHEN 'point' THEN 1
                            WHEN 'goal' THEN 2
                            WHEN 'bonus' THEN 3
                            WHEN 'penalty' THEN 4
                            ELSE 1
                        END as score_type_id,
                        s.timestamp
                 FROM scores s WHERE s.id = ?"""
        return Database.get_one_row(sql, [score_id])

    @staticmethod
    def get_scores_by_game(game_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id, s.team_id, s.player_id, s.points as value,
                        CASE s.score_type
                            WHEN 'point' THEN 1
                            WHEN 'goal' THEN 2
                            WHEN 'bonus' THEN 3
                            WHEN 'penalty' THEN 4
                            ELSE 1
                        END as score_type_id,
                        s.timestamp
                 FROM scores s WHERE s.game_id = ? ORDER BY s.timestamp ASC"""
        return Database.get_rows(sql, [game_id])

    @staticmethod
    def get_scores_by_team(team_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id, s.team_id, s.player_id, s.points as value,
                        CASE s.score_type
                            WHEN 'point' THEN 1
                            WHEN 'goal' THEN 2
                            WHEN 'bonus' THEN 3
                            WHEN 'penalty' THEN 4
                            ELSE 1
                        END as score_type_id,
                        s.timestamp
                 FROM scores s WHERE s.team_id = ? ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql, [team_id])

    @staticmethod
    def update_score(score_id: int, value: Optional[int] = None) -> bool:
        if value is None:
            return False
        sql = "UPDATE scores SET points = ? WHERE id = ?"
        return Database.execute_sql(sql, [value, score_id]) is not None

    @staticmethod
    def delete_score(score_id: int) -> bool:
        sql = "DELETE FROM scores WHERE id = ?"
        return Database.execute_sql(sql, [score_id]) is not None

    @staticmethod
    def get_game_score_summary(game_id: int) -> Dict[str, Any]:
        sql = """
        SELECT
            t.id as team_id,
            t.name as team_name,
            s.score_type as score_type,
            SUM(s.points) as total_score
        FROM scores s
        JOIN teams t ON s.team_id = t.id
        WHERE s.game_id = ?
        GROUP BY t.id, t.name, s.score_type
        ORDER BY t.id, s.score_type
        """
        results = Database.get_rows(sql, [game_id])
        return results if results else []

class SessionRepository:
    """
    Session repository - nu geïmplementeerd met de games tabel.
    Sessions zijn gewoon games met bepaalde game_types.
    """

    @staticmethod
    def create_session(name: str, game_type: str = "custom", max_teams: int = 10,
                      total_rounds: int = 1, time_limit: Optional[int] = None, scoring_mode: str = "team") -> int:
        # Sessies worden opgeslagen als games, sport_id = Teambuilding (ID 4)
        # Probeer teambuilding sport te vinden, anders gebruik custom (ID 5)
        sport_result = Database.get_one_row("SELECT id FROM sports WHERE name = 'Teambuilding' LIMIT 1")
        if not sport_result:
            sport_result = Database.get_one_row("SELECT id FROM sports WHERE name = 'Custom' LIMIT 1")
        sport_id = sport_result['id'] if sport_result else 4
        
        # Sla max_teams op in settings JSON
        settings = json.dumps({"max_teams": max_teams})
        
        sql = """INSERT INTO games (name, sport_id, game_type, status, total_rounds, time_limit, settings, scoring_mode)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        return Database.execute_sql(sql, [name, sport_id, game_type, 'setup', total_rounds, time_limit, settings, scoring_mode])

    @staticmethod
    def get_all_sessions() -> List[Dict[str, Any]]:
        sql = """SELECT g.id, g.name, g.game_type, g.status, g.current_round, g.total_rounds, g.time_limit,
                        g.scoring_mode, g.created_at, g.updated_at,
                        COALESCE(JSON_EXTRACT(g.settings, '$.max_teams'), 10) as max_teams
                 FROM games g
                 WHERE g.game_type IN ('quiz', 'challenge', 'custom', 'tournament')
                 ORDER BY g.created_at DESC"""
        sessions = Database.get_rows(sql)
        
        # Converteer JSON extract naar int
        for session in sessions or []:
            if 'max_teams' in session and isinstance(session['max_teams'], str):
                try:
                    session['max_teams'] = int(session['max_teams'])
                except:
                    session['max_teams'] = 10
        
        return sessions

    @staticmethod
    def get_session_by_id(session_id: int) -> Optional[Dict[str, Any]]:
        sql = """SELECT g.id, g.name, g.game_type, g.status, g.current_round, g.total_rounds, g.time_limit,
                        g.scoring_mode, g.created_at, g.updated_at,
                        COALESCE(JSON_EXTRACT(g.settings, '$.max_teams'), 10) as max_teams
                 FROM games g WHERE g.id = ?"""
        session = Database.get_one_row(sql, [session_id])
        
        if session and 'max_teams' in session and isinstance(session['max_teams'], str):
            try:
                session['max_teams'] = int(session['max_teams'])
            except:
                session['max_teams'] = 10
        
        return session

    @staticmethod
    def get_active_session() -> Optional[Dict[str, Any]]:
        sql = """SELECT g.id, g.name, g.game_type, g.status, g.current_round, g.total_rounds, g.time_limit,
                        g.scoring_mode, g.created_at, g.updated_at,
                        COALESCE(JSON_EXTRACT(g.settings, '$.max_teams'), 10) as max_teams
                 FROM games g
                 WHERE g.status IN ('setup', 'active', 'paused')
                 AND g.game_type IN ('quiz', 'challenge', 'custom', 'tournament')
                 ORDER BY g.updated_at DESC LIMIT 1"""
        session = Database.get_one_row(sql)
        
        if session and 'max_teams' in session and isinstance(session['max_teams'], str):
            try:
                session['max_teams'] = int(session['max_teams'])
            except:
                session['max_teams'] = 10
        
        return session

    @staticmethod
    def update_session(session_id: int, name: Optional[str] = None, game_type: Optional[str] = None,
                      status: Optional[str] = None, max_teams: Optional[int] = None,
                      current_round: Optional[int] = None, total_rounds: Optional[int] = None,
                      time_limit: Optional[int] = None, scoring_mode: Optional[str] = None) -> bool:
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if game_type is not None:
            updates.append("game_type = ?")
            params.append(game_type)
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if current_round is not None:
            updates.append("current_round = ?")
            params.append(current_round)
        if total_rounds is not None:
            updates.append("total_rounds = ?")
            params.append(total_rounds)
        if time_limit is not None:
            updates.append("time_limit = ?")
            params.append(time_limit)
        if scoring_mode is not None:
            updates.append("scoring_mode = ?")
            params.append(scoring_mode)
        
        # max_teams gaat in settings JSON
        if max_teams is not None:
            # Haal huidige settings op
            current = Database.get_one_row("SELECT settings FROM games WHERE id = ?", [session_id])
            current_settings = {}
            if current and current.get('settings'):
                try:
                    current_settings = json.loads(current['settings'])
                except:
                    pass
            current_settings['max_teams'] = max_teams
            updates.append("settings = ?")
            params.append(json.dumps(current_settings))
        
        if not updates:
            return False
            
        sql = f"UPDATE games SET {', '.join(updates)} WHERE id = ?"
        params.append(session_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_session(session_id: int) -> bool:
        sql = "DELETE FROM games WHERE id = ?"
        return Database.execute_sql(sql, [session_id]) is not None

class SessionTeamRepository:
    """
    Session team repository - beheer van teams in sessies.
    Teams zijn nu herbruikbaar en worden gekoppeld via game_teams.
    """

    @staticmethod
    def create_team(session_id: int, name: str, color: str = "#333333", icon: str = "team") -> int:
        """Maak een nieuw team aan en voeg het toe aan de sessie."""
        # Eerst: check of team al bestaat met deze naam
        existing_team = Database.get_one_row("SELECT id FROM teams WHERE name = ?", [name])
        
        if existing_team:
            team_id = existing_team['id']
            # Update kleur en icoon van bestaand team
            Database.execute_sql("UPDATE teams SET color = ?, icon = ? WHERE id = ?", [color, icon, team_id])
        else:
            # Maak nieuw team aan
            sql = """INSERT INTO teams (name, color, icon) VALUES (?, ?, ?)"""
            team_id = Database.execute_sql(sql, [name, color, icon])
        
        # Koppel team aan sessie via game_teams (als nog niet gekoppeld)
        sql_link = """INSERT OR IGNORE INTO game_teams (game_id, team_id) VALUES (?, ?)"""
        Database.execute_sql(sql_link, [session_id, team_id])
        
        return team_id

    @staticmethod
    def add_existing_team_to_session(session_id: int, team_id: int) -> bool:
        """Voeg een bestaand team toe aan een sessie."""
        sql = """INSERT OR IGNORE INTO game_teams (game_id, team_id) VALUES (?, ?)"""
        result = Database.execute_sql(sql, [session_id, team_id])
        return result is not None

    @staticmethod
    def remove_team_from_session(session_id: int, team_id: int) -> bool:
        """Verwijder een team uit een sessie (niet het team zelf)."""
        sql = """DELETE FROM game_teams WHERE game_id = ? AND team_id = ?"""
        return Database.execute_sql(sql, [session_id, team_id]) is not None

    @staticmethod
    def get_teams_by_session(session_id: int) -> List[Dict[str, Any]]:
        """Haal alle teams op die deelnemen aan een specifieke sessie."""
        sql = """SELECT t.id, ? as session_id, t.name, t.color, t.icon, 
                        gt.is_eliminated, t.created_at, t.updated_at,
                        COALESCE(SUM(s.points), 0) as score
                 FROM game_teams gt
                 JOIN teams t ON t.id = gt.team_id
                 LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = gt.game_id
                 WHERE gt.game_id = ?
                 GROUP BY t.id, t.name, t.color, t.icon, gt.is_eliminated, t.created_at, t.updated_at
                 ORDER BY score DESC, t.name ASC"""
        return Database.get_rows(sql, [session_id, session_id])

    @staticmethod
    def get_team_by_id(team_id: int) -> Optional[Dict[str, Any]]:
        """Haal een specifiek team op (zonder sessie context)."""
        sql = """SELECT t.id, t.name, t.color, t.icon, t.description,
                        t.created_at, t.updated_at
                 FROM teams t
                 WHERE t.id = ?"""
        return Database.get_one_row(sql, [team_id])

    @staticmethod
    def get_team_in_session(team_id: int, session_id: int) -> Optional[Dict[str, Any]]:
        """Haal een team op binnen de context van een specifieke sessie."""
        sql = """SELECT t.id, ? as session_id, t.name, t.color, t.icon, 
                        gt.is_eliminated, t.created_at, t.updated_at,
                        COALESCE(SUM(s.points), 0) as score
                 FROM teams t
                 JOIN game_teams gt ON gt.team_id = t.id AND gt.game_id = ?
                 LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = ?
                 WHERE t.id = ?
                 GROUP BY t.id, t.name, t.color, t.icon, gt.is_eliminated, t.created_at, t.updated_at"""
        return Database.get_one_row(sql, [session_id, session_id, session_id, team_id])

    @staticmethod
    def update_team(team_id: int, name: Optional[str] = None, color: Optional[str] = None,
                   icon: Optional[str] = None, description: Optional[str] = None,
                   score: Optional[int] = None, is_eliminated: Optional[bool] = None) -> bool:
        """Update team eigenschappen."""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if color is not None:
            updates.append("color = ?")
            params.append(color)
        if icon is not None:
            updates.append("icon = ?")
            params.append(icon)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        
        # is_eliminated is nu in game_teams, niet in teams
        # score wordt niet direct opgeslagen
        
        if not updates:
            return False
            
        sql = f"UPDATE teams SET {', '.join(updates)} WHERE id = ?"
        params.append(team_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def update_team_in_session(team_id: int, session_id: int, is_eliminated: Optional[bool] = None) -> bool:
        """Update team status binnen een specifieke sessie."""
        if is_eliminated is None:
            return False
        
        sql = "UPDATE game_teams SET is_eliminated = ? WHERE team_id = ? AND game_id = ?"
        return Database.execute_sql(sql, [is_eliminated, team_id, session_id]) is not None

    @staticmethod
    def update_team_score(team_id: int, points: int) -> bool:
        """
        DEPRECATED: Score wordt niet meer direct bijgewerkt.
        Gebruik SessionScoreRepository.add_score() in plaats daarvan.
        Deze functie blijft voor backwards compatibility.
        """
        # We hebben de game_id nodig om een score toe te voegen
        # Haal de eerste actieve game op waar dit team aan deelneemt
        game = Database.get_one_row(
            """SELECT gt.game_id FROM game_teams gt 
               JOIN games g ON g.id = gt.game_id 
               WHERE gt.team_id = ? AND g.status = 'active' 
               LIMIT 1""", 
            [team_id]
        )
        
        if not game:
            # Als geen actieve game, neem de meest recente game
            game = Database.get_one_row(
                """SELECT gt.game_id FROM game_teams gt 
                   JOIN games g ON g.id = gt.game_id 
                   WHERE gt.team_id = ? 
                   ORDER BY g.created_at DESC 
                   LIMIT 1""", 
                [team_id]
            )
        
        if not game:
            return False
        
        sql = """INSERT INTO scores (game_id, team_id, points, score_type, reason)
                 VALUES (?, ?, ?, ?, ?)"""
        result = Database.execute_sql(sql, [game['game_id'], team_id, points, 'point', 'Score update'])
        return result is not None

    @staticmethod
    def delete_team(team_id: int) -> bool:
        """Verwijder een team permanent (uit alle sessies)."""
        sql = "DELETE FROM teams WHERE id = ?"
        return Database.execute_sql(sql, [team_id]) is not None

    @staticmethod
    def get_all_teams() -> List[Dict[str, Any]]:
        """Haal alle teams op (los van sessies)."""
        sql = """SELECT t.id, t.name, t.color, t.icon, t.description,
                        t.created_at, t.updated_at,
                        COUNT(DISTINCT gt.game_id) as sessions_count
                 FROM teams t
                 LEFT JOIN game_teams gt ON gt.team_id = t.id
                 GROUP BY t.id, t.name, t.color, t.icon, t.description, t.created_at, t.updated_at
                 ORDER BY t.name ASC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_all_teams_with_session_info() -> List[Dict[str, Any]]:
        """Haal alle teams op met informatie over hun sessies."""
        sql = """SELECT t.id, t.name, t.color, t.icon, t.description,
                        t.created_at, t.updated_at,
                        gt.game_id as session_id, gt.is_eliminated,
                        g.name as session_name, g.game_type, g.status as session_status,
                        COALESCE(SUM(s.points), 0) as score
                 FROM teams t
                 LEFT JOIN game_teams gt ON gt.team_id = t.id
                 LEFT JOIN games g ON g.id = gt.game_id
                 LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = gt.game_id
                 WHERE g.game_type IN ('quiz', 'challenge', 'custom', 'tournament') OR g.game_type IS NULL
                 GROUP BY t.id, t.name, t.color, t.icon, t.description, t.created_at, t.updated_at,
                          gt.game_id, gt.is_eliminated, g.name, g.game_type, g.status
                 ORDER BY t.name ASC, g.created_at DESC"""
        return Database.get_rows(sql)

class SessionScoreRepository:
    """
    Session score repository - nu geïmplementeerd met de scores tabel.
    """

    @staticmethod
    def create_score(session_id: int, team_id: int, points: int, reason: Optional[str] = None,
                    round_number: int = 1, player_id: Optional[int] = None) -> int:
        sql = """INSERT INTO scores (game_id, team_id, player_id, points, score_type, reason, round_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"""
        return Database.execute_sql(sql, [session_id, team_id, player_id, points, 'point', reason, round_number])

    @staticmethod
    def get_scores_by_session(session_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id as session_id, s.team_id, s.player_id, s.points, s.reason, s.round_number, s.timestamp,
                        t.name as team_name, t.color as team_color,
                        p.name as player_name
                 FROM scores s
                 JOIN teams t ON s.team_id = t.id
                 LEFT JOIN players p ON s.player_id = p.id
                 WHERE s.game_id = ?
                 ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql, [session_id])

    @staticmethod
    def get_scores_by_team(team_id: int) -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id as session_id, s.team_id, s.points, s.reason, s.round_number, s.timestamp
                 FROM scores s WHERE s.team_id = ? ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql, [team_id])

    @staticmethod
    def get_session_score_summary(session_id: int) -> List[Dict[str, Any]]:
        sql = """
        SELECT
            t.id as team_id,
            t.name as team_name,
            t.color as team_color,
            t.icon as team_icon,
            COALESCE(SUM(s.points), 0) as total_score,
            COUNT(s.id) as score_count
        FROM game_teams gt
        JOIN teams t ON t.id = gt.team_id
        LEFT JOIN scores s ON t.id = s.team_id AND gt.game_id = s.game_id
        WHERE gt.game_id = ? AND gt.is_eliminated = 0
        GROUP BY t.id, t.name, t.color, t.icon
        ORDER BY total_score DESC, t.name ASC
        """
        return Database.get_rows(sql, [session_id])

    @staticmethod
    def get_score_by_id(score_id: int) -> Optional[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id as session_id, s.team_id, s.points, s.reason, s.round_number, s.timestamp
                 FROM scores s WHERE s.id = ?"""
        return Database.get_one_row(sql, [score_id])

    @staticmethod
    def update_score(score_id: int, points: Optional[int] = None, reason: Optional[str] = None,
                    round_number: Optional[int] = None) -> bool:
        updates = []
        params = []
        
        if points is not None:
            updates.append("points = ?")
            params.append(points)
        if reason is not None:
            updates.append("reason = ?")
            params.append(reason)
        if round_number is not None:
            updates.append("round_number = ?")
            params.append(round_number)
            
        if not updates:
            return False
            
        sql = f"UPDATE scores SET {', '.join(updates)} WHERE id = ?"
        params.append(score_id)
        return Database.execute_sql(sql, params) is not None

    @staticmethod
    def delete_score(score_id: int) -> bool:
        sql = "DELETE FROM scores WHERE id = ?"
        return Database.execute_sql(sql, [score_id]) is not None

    @staticmethod
    def get_all_scores_with_info() -> List[Dict[str, Any]]:
        sql = """SELECT s.id, s.game_id as session_id, s.team_id, s.points, s.reason, s.round_number, s.timestamp,
                        t.name as team_name, t.color as team_color,
                        g.name as session_name, g.game_type
                 FROM scores s
                 JOIN teams t ON s.team_id = t.id
                 JOIN games g ON s.game_id = g.id
                 WHERE g.game_type IN ('quiz', 'challenge', 'custom', 'tournament')
                 ORDER BY s.timestamp DESC"""
        return Database.get_rows(sql)

    @staticmethod
    def get_team_total_score(session_id: int, team_id: int) -> int:
        """Get the total score for a specific team in a session by summing all scores"""
        sql = """
        SELECT COALESCE(SUM(s.points), 0) as total_score
        FROM scores s
        WHERE s.game_id = ? AND s.team_id = ?
        """
        result = Database.get_one_row(sql, [session_id, team_id])
        return result['total_score'] if result else 0