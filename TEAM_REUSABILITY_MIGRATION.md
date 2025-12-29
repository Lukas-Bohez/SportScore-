# Migratie naar Herbruikbare Teams

## Overzicht
Deze migratie maakt teams herbruikbaar over meerdere sessies. Teams zijn nu los van sessies en kunnen in verschillende games gebruikt worden zonder dat ze opnieuw moeten worden aangemaakt.

## Wat is veranderd?

### Database Structuur

**Oude structuur:**
- `teams` tabel had een `game_id` foreign key
- Teams waren direct gekoppeld aan één game/sessie
- Bij verwijderen van een game werden alle teams ook verwijderd (CASCADE)

**Nieuwe structuur:**
- `teams` tabel is onafhankelijk (geen `game_id` meer)
- `game_teams` koppeltabel verbindt teams met games/sessies
- Teams kunnen in meerdere sessies gebruikt worden
- Scores blijven per sessie gescheiden (via `game_id` in scores tabel)
- `is_eliminated` is verplaatst naar `game_teams` (per sessie)

### Backend Wijzigingen

1. **SessionTeamRepository** aangepast:
   - `create_team()` - Controleert eerst of team al bestaat
   - `add_existing_team_to_session()` - Voegt bestaand team toe aan sessie
   - `remove_team_from_session()` - Verwijdert team uit sessie (team blijft bestaan)
   - `get_all_teams()` - Haalt alle teams op (los van sessies)
   - `get_teams_by_session()` - Gebruikt nu game_teams koppeltabel

2. **Nieuwe API Endpoints:**
   - `GET /api/v1/standalone-teams` - Lijst van alle teams
   - `POST /api/v1/standalone-teams` - Maak nieuw herbruikbaar team
   - `PUT /api/v1/standalone-teams/{team_id}` - Update team eigenschappen
   - `DELETE /api/v1/standalone-teams/{team_id}` - Verwijder team permanent
   - `POST /api/v1/sessions/{session_id}/add-team` - Voeg bestaand team toe
   - `DELETE /api/v1/sessions/{session_id}/remove-team/{team_id}` - Verwijder uit sessie

### Frontend Wijzigingen

1. **teamsetup.html** - Nieuwe sectie voor bestaande teams:
   - Dropdown om bestaand team te selecteren
   - Knop om geselecteerd team toe te voegen
   - Informatieve tekst over hergebruik

2. **teamsetup.js** - Nieuwe functionaliteit:
   - `loadAvailableTeams()` - Laadt teams die nog niet in sessie zitten
   - `updateAvailableTeamsSelect()` - Update dropdown met beschikbare teams
   - `addExistingTeam()` - Voegt geselecteerd team toe aan sessie
   - `deleteTeam()` - Verwijdert nu team uit sessie (niet permanent)

## Migratie Stappen

### 1. Backup maken
```powershell
# Maak backup van huidige database
Copy-Item "backend\scoreboard.db" "backend\scoreboard_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```

### 2. Migratiescript uitvoeren
```powershell
# Navigeer naar backend directory
cd backend

# Run migratie (SQLite CLI)
sqlite3 scoreboard.db < migrate_to_reusable_teams.sql
```

**OF** gebruik Python:
```python
import sqlite3

conn = sqlite3.connect('scoreboard.db')
with open('migrate_to_reusable_teams.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()
    conn.executescript(migration_sql)
conn.commit()
conn.close()
print("Migratie voltooid!")
```

### 3. Verificatie
Controleer of de migratie succesvol was:

```sql
-- Controleer aantal teams voor en na
SELECT 'Original teams' as type, COUNT(*) as count FROM teams_backup
UNION ALL
SELECT 'New teams' as type, COUNT(*) as count FROM teams
UNION ALL
SELECT 'Game-team relations' as type, COUNT(*) as count FROM game_teams;

-- Controleer of alle teams correct zijn gemigreerd
SELECT t.id, t.name, COUNT(gt.game_id) as sessions_count
FROM teams t
LEFT JOIN game_teams gt ON gt.team_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;
```

### 4. Test de applicatie
1. Start de backend: `python run.py`
2. Open frontend in browser
3. Maak een nieuwe sessie
4. Controleer of:
   - Bestaande teams zichtbaar zijn in dropdown
   - Bestaande teams kunnen worden toegevoegd
   - Nieuwe teams kunnen worden aangemaakt
   - Teams in meerdere sessies gebruikt kunnen worden
   - Scores per sessie gescheiden blijven

## Rollback (indien nodig)

Als er problemen zijn, gebruik deze SQL om terug te rollen:

```sql
-- Stop eerst de applicatie!

-- Herstel backup tabellen
DROP TABLE IF EXISTS game_teams;
DROP TABLE IF EXISTS teams;
ALTER TABLE teams_backup RENAME TO teams;

-- Herstel views (gebruik oude versie uit database_schema_sqlite.sql)
DROP VIEW IF EXISTS v_game_leaderboard;
DROP VIEW IF EXISTS v_player_stats;

-- Kopieer oude view definities hier...

-- Herstel scores en players indien nodig
UPDATE scores SET team_id = (SELECT team_id FROM scores_backup WHERE scores_backup.id = scores.id);
UPDATE players SET team_id = (SELECT team_id FROM players_backup WHERE players_backup.id = players.id);
```

## Voordelen van deze wijziging

1. **Herbruikbaarheid**: Teams hoeven maar één keer aangemaakt te worden
2. **Consistentie**: Teamnamen, kleuren en iconen blijven consistent over sessies
3. **Geschiedenis**: Zie alle sessies waarin een team heeft deelgenomen
4. **Efficiency**: Sneller nieuwe sessies opzetten met bekende teams
5. **Flexibiliteit**: Teams kunnen aan/uit sessies worden gehaald zonder data verlies

## Bekende Issues

1. **Team namen moeten uniek zijn**: Duplicate teamnamen krijgen een nummer toegevoegd (#1, #2, etc.)
2. **Oude endpoints**: Legacy team endpoints blijven werken voor backwards compatibility
3. **Spelers**: Spelers blijven gekoppeld aan teams (niet aan sessies)

## Support

Bij problemen:
1. Check de backend logs voor errors
2. Controleer database integriteit met verificatie queries
3. Gebruik rollback indien nodig
4. Maak issue aan in repository
