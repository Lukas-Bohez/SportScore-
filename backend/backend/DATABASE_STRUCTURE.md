# 📊 Database Structuur

## Overzicht

De nieuwe database structuur is **simpel en geïntegreerd**. Alle verschillende soorten wedstrijden, sessies, en activiteiten worden nu centraal beheerd in één systeem.

## 🎯 Kern Concept

Alles draait om **GAMES** (spellen/wedstrijden):
- Een quiz is een game
- Een voetbalwedstrijd is een game  
- Een teambuilding sessie is een game
- Een tournament is een game

Dit maakt het systeem **veel eenvoudiger** - geen aparte tabellen meer voor sessies!

## 📋 Tabellen

### 1. **sports** - Sporten/Activiteiten
Verschillende types sporten of activiteiten.

**Kolommen:**
- `id` - Unieke identifier
- `name` - Naam van de sport (bijv. "Voetbal", "Quiz", "Teambuilding")
- `description` - Beschrijving
- `created_at`, `updated_at` - Timestamps

**Voorbeeld data:**
```sql
INSERT INTO sports (name, description) VALUES 
('Voetbal', 'Traditioneel balspel'),
('Quiz', 'Trivia en kennisvragen'),
('Teambuilding', 'Algemene teambuilding activiteiten');
```

---

### 2. **games** - Spellen/Wedstrijden (CENTRAAL)
Dit is het **hart** van het systeem. Alle wedstrijden, sessies, en activiteiten.

**Kolommen:**
- `id` - Unieke identifier
- `name` - Naam van het spel (bijv. "Kerst Quiz 2025")
- `sport_id` - Welke sport (verwijst naar sports tabel)
- `game_type` - Type spel: `match`, `tournament`, `quiz`, `challenge`, `custom`
- `status` - Status: `setup`, `active`, `paused`, `completed`, `cancelled`
- `start_time`, `end_time` - Wanneer begint/eindigt het
- `current_round` - Huidige ronde
- `total_rounds` - Totaal aantal rondes
- `time_limit` - Tijdslimiet in seconden (NULL = geen limiet)
- `settings` - JSON veld voor flexibele instellingen
- `created_at`, `updated_at` - Timestamps

**Voorbeeld:**
```sql
INSERT INTO games (name, sport_id, game_type, status, total_rounds) VALUES
('Kerst Quiz 2025', 3, 'quiz', 'setup', 5),
('Voetbal Toernooi', 1, 'tournament', 'active', 1);
```

---

### 3. **teams** - Teams
Teams die deelnemen aan een specifiek spel.

**Kolommen:**
- `id` - Unieke identifier
- `game_id` - Bij welk spel hoort dit team
- `name` - Teamnaam
- `color` - Hex kleurcode (bijv. "#3B82F6")
- `icon` - Icon naam
- `is_eliminated` - Is het team geëlimineerd?
- `created_at`, `updated_at` - Timestamps

**Belangrijke relatie:** Teams horen altijd bij EEN specifiek spel.

**Voorbeeld:**
```sql
INSERT INTO teams (game_id, name, color) VALUES
(1, 'Team Alpha', '#FF6B6B'),
(1, 'Team Beta', '#4ECDC4'),
(1, 'Team Gamma', '#45B7D1');
```

---

### 4. **players** - Spelers
Spelers binnen teams.

**Kolommen:**
- `id` - Unieke identifier
- `team_id` - Bij welk team hoort deze speler
- `name` - Naam van de speler
- `position` - Positie/rol (optioneel)
- `created_at`, `updated_at` - Timestamps

**Voorbeeld:**
```sql
INSERT INTO players (team_id, name) VALUES
(1, 'Jan De Vries'),
(1, 'Maria Peeters'),
(2, 'Pieter Janssens');
```

---

### 5. **scores** - Scores
Alle scores voor teams in spellen.

**Kolommen:**
- `id` - Unieke identifier
- `game_id` - Bij welk spel
- `team_id` - Welk team
- `player_id` - Welke speler (optioneel)
- `points` - Aantal punten
- `score_type` - Type score: "goal", "point", "time", etc.
- `reason` - Waarom deze punten? (bijv. "Goede vraag")
- `round_number` - In welke ronde
- `timestamp` - Wanneer gescoord

**Voorbeeld:**
```sql
INSERT INTO scores (game_id, team_id, points, score_type, reason, round_number) VALUES
(1, 1, 10, 'point', 'Correcte vraag over geschiedenis', 1),
(1, 2, 5, 'point', 'Half correct antwoord', 1),
(1, 1, 15, 'bonus', 'Snelheidsbonus', 1);
```

---

## 🔗 Relaties

```
sports (1) ----< games (1) ----< teams (1) ----< players
                   |                |
                   |                |
                   +-----< scores <-+
```

**Uitleg:**
- Eén sport kan meerdere games hebben
- Eén game kan meerdere teams hebben
- Eén team kan meerdere spelers hebben
- Scores zijn verbonden met zowel games als teams
- Scores kunnen optioneel verbonden zijn met een specifieke speler

---

## 📊 Handige Views

### `v_game_leaderboard` - Leaderboard per spel
Toont de huidige stand per spel met totale scores per team.

**Gebruik:**
```sql
SELECT * FROM v_game_leaderboard 
WHERE game_id = 1 
ORDER BY total_score DESC;
```

**Geeft:**
- game_id, game_name, game_status
- team_id, team_name, team_color, team_icon
- total_score (totaal aantal punten)
- score_count (aantal keer gescoord)
- last_score_time (laatste score timestamp)

---

### `v_player_stats` - Speler Statistieken
Toont statistieken per speler.

**Gebruik:**
```sql
SELECT * FROM v_player_stats 
WHERE game_id = 1 
ORDER BY total_points DESC;
```

**Geeft:**
- player_id, player_name
- team_id, team_name
- game_id, game_name
- scores_made (aantal keer gescoord)
- total_points (totaal aantal punten)

---

## 🚀 Veelgebruikte Queries

### Een nieuw spel starten
```sql
-- 1. Maak het spel
INSERT INTO games (name, sport_id, game_type, status, total_rounds) 
VALUES ('Nieuwjaarsquiz 2025', 3, 'quiz', 'setup', 5);

-- 2. Voeg teams toe
INSERT INTO teams (game_id, name, color) VALUES
(LAST_INSERT_ID(), 'Rood', '#FF0000'),
(LAST_INSERT_ID(), 'Blauw', '#0000FF'),
(LAST_INSERT_ID(), 'Groen', '#00FF00');

-- 3. Start het spel
UPDATE games SET status = 'active', start_time = NOW() WHERE id = LAST_INSERT_ID();
```

### Score toevoegen
```sql
INSERT INTO scores (game_id, team_id, points, reason, round_number) 
VALUES (1, 2, 10, 'Correcte vraag', 1);
```

### Leaderboard ophalen
```sql
SELECT * FROM v_game_leaderboard 
WHERE game_id = 1 AND is_eliminated = FALSE
ORDER BY total_score DESC;
```

### Speler toevoegen aan team
```sql
INSERT INTO players (team_id, name) 
VALUES (1, 'Nieuwe Speler');
```

### Actieve spellen ophalen
```sql
SELECT * FROM games 
WHERE status IN ('active', 'paused') 
ORDER BY start_time DESC;
```

---

## 🔄 Migratie van Oude Structuur

De oude database had aparte tabellen voor:
- `sessions`, `session_teams`, `session_scores` (voor teambuilding)
- `games`, `teams`, `players`, `scores` (voor sporten)

De nieuwe structuur **verenigt** deze twee systemen:
- Sessions worden nu `games` met `game_type = 'quiz'` of `'challenge'`
- Session_teams worden gewoon `teams`
- Session_scores worden gewoon `scores`

**Voordelen:**
1. ✅ Eenvoudiger - één systeem voor alles
2. ✅ Beter onderhouden - minder code duplicatie
3. ✅ Flexibeler - eenvoudig nieuwe types toevoegen
4. ✅ Duidelijker - alles is verbonden

---

## 📤 Export Mogelijkheden

Alle data kan geëxporteerd worden als:
- **Excel** - Voor presentaties
- **CSV** - Voor data-analyse
- **JSON** - Voor API's en integraties

---

## 🛠️ Database Reset

Als de structuur niet correct is, wordt de database automatisch opnieuw aangemaakt bij het starten van `launch_windows.bat`.

De batch file controleert:
1. Of de `games` tabel bestaat
2. Of er geen oude `sessions` tabel is
3. Als de structuur niet klopt → volledige rebuild

**Handmatige reset:**
```bash
# In MySQL
DROP DATABASE scoreboard;
CREATE DATABASE scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scoreboard;
SOURCE backend/database_schema.sql;
```

---

## ✅ Checklist Nieuwe Structuur

- [x] Eén centraal punt: `games` tabel
- [x] Teams altijd verbonden met een game
- [x] Scores altijd verbonden met game EN team
- [x] Flexibele instellingen via JSON veld
- [x] Views voor veelgebruikte queries
- [x] Automatische database validatie
- [x] Eenvoudige export mogelijkheden
