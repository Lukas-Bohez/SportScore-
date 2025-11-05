# 🔄 Database Structuur Wijzigingen - Samenvatting

## ✨ WAT IS ER VERANDERD?

### ❌ OUD (Complex - 2 systemen)
```
SYSTEEM 1: Sport wedstrijden
- sports, teams, players, games, scores, score_types

SYSTEEM 2: Sessies (apart in de hoek)
- sessions, session_teams, session_scores
```

**Probleem:** Twee aparte systemen voor hetzelfde doel - verwarrend!

---

### ✅ NIEUW (Simpel - 1 systeem)
```
ALLES is een GAME:
sports → games → teams → players
              ↓
           scores
```

**Voordelen:**
- 🎯 Eenvoudiger - alles werkt hetzelfde
- 🔗 Beter verbonden - geen aparte sessies meer
- 🚀 Flexibeler - gemakkelijk uit te breiden
- 📊 Overzichtelijker - één leaderboard systeem

---

## 📋 NIEUWE TABEL STRUCTUUR

### 1. **sports** (ONGEWIJZIGD)
Verschillende sporten/activiteiten
- Voetbal, Basketbal, Quiz, Teambuilding, etc.

### 2. **games** (NIEUW - Vervangt `sessions` + oude `games`)
**HET HART VAN HET SYSTEEM**
- Elke wedstrijd/sessie/quiz is een "game"
- Heeft type: `match`, `tournament`, `quiz`, `challenge`, `custom`
- Heeft status: `setup`, `active`, `paused`, `completed`, `cancelled`
- Heeft rondes, tijdslimiet, flexibele settings (JSON)

### 3. **teams** (NIEUW - Vervangt `session_teams` + oude `teams`)
Teams verbonden aan een specifiek game
- Naam, kleur, icon
- Kan geëlimineerd worden
- **BELANGRIJK:** Altijd verbonden met EEN game

### 4. **players** (VERBETERD)
Spelers binnen teams
- Naam, positie
- Verbonden met team (die verbonden is met game)

### 5. **scores** (NIEUW - Vervangt `session_scores` + oude `scores`)
Alle scores
- Punten voor een team in een game
- Optioneel: welke speler scoorde
- Score type (goal, point, bonus, etc.)
- Reden waarom gescoord
- Ronde nummer

---

## 🚀 AUTOMATISCHE MIGRATIE

De `launch_windows.bat` controleert nu:

1. ✅ Bestaat de nieuwe `games` tabel?
2. ✅ Zijn er nog oude `sessions` tabellen?
3. ❌ Als structuur niet klopt → **REBUILD**

**Wat gebeurt er:**
```
1. Check database structuur
2. Als oud → Drop database
3. Maak nieuwe database aan
4. Laad nieuwe schema
5. Klaar! ✅
```

---

## 📊 NIEUWE VIEWS (Helper queries)

### `v_game_leaderboard`
Toont leaderboard per game met totale scores

```sql
SELECT * FROM v_game_leaderboard 
WHERE game_id = 1 
ORDER BY total_score DESC;
```

### `v_player_stats`
Toont speler statistieken per game

```sql
SELECT * FROM v_player_stats 
WHERE game_id = 1 
ORDER BY total_points DESC;
```

---

## 🔧 HOE TE GEBRUIKEN

### Een Quiz Starten (Voorbeeld)
```sql
-- 1. Maak game
INSERT INTO games (name, sport_id, game_type, total_rounds) 
VALUES ('Kerst Quiz 2025', 3, 'quiz', 5);

-- 2. Voeg teams toe
INSERT INTO teams (game_id, name, color) VALUES
(1, 'Team Rood', '#FF0000'),
(1, 'Team Blauw', '#0000FF');

-- 3. Start game
UPDATE games SET status = 'active' WHERE id = 1;

-- 4. Voeg scores toe
INSERT INTO scores (game_id, team_id, points, reason, round_number) 
VALUES (1, 1, 10, 'Correcte vraag over geschiedenis', 1);

-- 5. Bekijk leaderboard
SELECT * FROM v_game_leaderboard WHERE game_id = 1;
```

---

## 📁 NIEUWE BESTANDEN

1. **`database_schema.sql`** - Nieuwe database structuur ✅
2. **`DATABASE_STRUCTURE.md`** - Volledige documentatie ✅
3. **`datarepository_new.py`** - Nieuwe repository functies ✅
4. **`migrate_to_new_structure.sql`** - Migratie script (optioneel) ✅
5. **`launch_windows.bat`** - Updated met structuur validatie ✅
6. **`WIJZIGINGEN.md`** - Deze samenvatting ✅

---

## ⚠️ BELANGRIJKE WIJZIGINGEN VOOR CODE

### Oude Code (Sessions)
```python
SessionRepository.create_session(name, game_type, max_teams)
SessionTeamRepository.create_team(session_id, name, color)
SessionScoreRepository.create_score(session_id, team_id, points)
```

### Nieuwe Code (Games)
```python
GameRepository.create(name, sport_id, game_type)
TeamRepository.create(game_id, name, color)
ScoreRepository.create(game_id, team_id, points)
```

**Verschil:** `session_id` → `game_id` (alles is nu een game!)

---

## 🎯 VOLGENDE STAPPEN

1. ✅ Run `launch_windows.bat` - Database wordt automatisch gerebuild
2. 📝 Update je Python code om `datarepository_new.py` te gebruiken
3. 🧪 Test de nieuwe structuur
4. 🗑️ Verwijder oude repository code als alles werkt

---

## 💾 DATA EXPORT

Alle data kan geëxporteerd worden als:
- **Excel** - Voor rapportage
- **CSV** - Voor analyse
- **JSON** - Voor API's

Export functionaliteit blijft hetzelfde werken!

---

## ❓ VRAGEN?

Bekijk `DATABASE_STRUCTURE.md` voor:
- Gedetailleerde tabel beschrijvingen
- Voorbeeld queries
- Relatie diagrammen
- Veelgestelde vragen

---

## 🎉 KLAAR!

Je database is nu:
- ✅ Simpeler
- ✅ Beter georganiseerd
- ✅ Gemakkelijker te begrijpen
- ✅ Flexibeler voor de toekomst

**Happy coding! 🚀**
