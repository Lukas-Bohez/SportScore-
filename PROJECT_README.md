# 🎯 TeamScore - Real-time Scoreboard Applicatie

Een moderne, real-time scoreboard applicatie voor het bijhouden van team scores tijdens events, quizzen, en competities.

## ✨ Features

### Core Functionaliteit
- ✅ **Real-time updates** via Socket.IO
- ✅ **Herbruikbare teams** - maak teams één keer, gebruik in meerdere sessies
- ✅ **Flexibele scoring** - team-based of player-based scores
- ✅ **Multiple sessies** - beheer meerdere games tegelijkertijd
- ✅ **Live leaderboard** - groot scherm weergave met auto-refresh
- ✅ **Team management** - kleuren, iconen, spelers
- ✅ **Score tracking** - volledige score geschiedenis per sessie

### Recent Toegevoegd
- ✅ **Team herbruikbaarheid** - teams kunnen in meerdere sessies gebruikt worden
- ✅ **Player scoring mode** - individuele speler scores die optellen naar team totaal
- ✅ **Session-based scores** - elke sessie heeft eigen scores maar teams blijven consistent

## 🚀 Quick Start

### 1. Backend starten
```powershell
cd backend
python run.py
```

Backend draait op: `http://localhost:8000`

### 2. Frontend starten
```powershell
# In een nieuwe terminal
python serve_frontend.py
```

Frontend draait op: `http://localhost:5500`

### 3. Gebruik de applicatie
1. Open `http://localhost:5500/startscreen.html`
2. Maak een nieuwe sessie of selecteer bestaande
3. Voeg teams toe (nieuwe of bestaande)
4. Start de sessie
5. Begin met scoren!

## 📁 Project Structuur

```
team-project/
├── backend/
│   ├── app.py                      # FastAPI + Socket.IO server
│   ├── run.py                      # Start script
│   ├── database/
│   │   ├── datarepository.py      # Database operaties
│   │   ├── database.py            # Database connectie
│   │   └── config.py              # Database config
│   ├── models/
│   │   └── models.py              # Pydantic models
│   ├── database_schema_sqlite.sql # Database schema
│   ├── init_database.py           # Database initialisatie
│   ├── run_migration.py           # Migratie script
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── index.html                 # Landing page
│   ├── startscreen.html           # Sessie beheer
│   ├── teamsetup.html             # Team configuratie
│   ├── scoreinput.html            # Score invoer pagina
│   ├── leaderboard.html           # Live leaderboard
│   ├── js/
│   │   ├── api.js                 # API & Socket.IO client
│   │   ├── startscreen.js
│   │   ├── teamsetup.js
│   │   ├── scoreinput.js
│   │   └── leaderboard.js
│   └── css/                       # Styling
├── serve_frontend.py              # Frontend development server
├── launch_windows.bat             # Windows quick start script
└── TEAM_REUSABILITY_MIGRATION.md  # Migratie documentatie

```

## 🗄️ Database

### Belangrijke Tabellen

**teams** - Herbruikbare teams
- `id`, `name`, `color`, `icon`, `description`
- Teams zijn onafhankelijk van sessies

**games** - Sessies/matches
- `id`, `name`, `sport_id`, `game_type`, `status`, `scoring_mode`
- Een sessie = een quiz, match, of event

**game_teams** - Koppeltabel
- `game_id`, `team_id`, `is_eliminated`
- Verbindt teams met sessies

**scores** - Score entries
- `game_id`, `team_id`, `player_id`, `points`, `reason`, `round_number`
- Scores per sessie per team (optioneel per speler)

**players** - Spelers in teams
- `id`, `name`, `team_id`, `position`
- Voor player-based scoring mode

### Database Migratie

Als je een bestaande database hebt van vóór de team herbruikbaarheid feature:

```powershell
cd backend
python run_migration.py
```

Zie `TEAM_REUSABILITY_MIGRATION.md` voor details.

## 🎮 Gebruik

### Sessie Aanmaken
1. Ga naar startscreen
2. Klik "Nieuwe Sessie"
3. Vul naam in, kies sport en game type
4. Kies scoring mode (Team of Player)

### Teams Toevoegen
1. **Bestaand team**: Selecteer uit dropdown
2. **Nieuw team**: Vul naam in, kies kleur en icoon
3. Voor player scoring: voeg spelers toe aan elk team

### Scoren
1. Selecteer team (en optioneel speler)
2. Voer punten in
3. Optioneel: voeg reden toe
4. Submit - scores verschijnen real-time op leaderboard

### Leaderboard Weergeven
Open `leaderboard.html` op een tweede scherm voor live updates tijdens het event.

## 🔧 Configuratie

### Backend Poort Wijzigen
In `backend/run.py`:
```python
uvicorn.run("app:asgi", host="0.0.0.0", port=8000)
```

### Frontend Poort Wijzigen
In `serve_frontend.py`:
```python
server_address = ('', 5500)
```

### Database Locatie
In `backend/database/config.py`:
```python
DATABASE_PATH = os.path.join(backend_dir, 'scoreboard.db')
```

## 🛠️ Development

### Requirements
- Python 3.8+
- SQLite3
- Moderne webbrowser (Chrome, Firefox, Edge)

### Dependencies Installeren
```powershell
cd backend
pip install -r requirements.txt
```

### Nieuwe Database Aanmaken
```powershell
cd backend
python init_database.py
```

### API Documentatie
Met draaiende backend: `http://localhost:8000/docs`

## 📊 API Endpoints

### Sessies
- `GET /api/v1/sessions` - Lijst alle sessies
- `POST /api/v1/sessions` - Maak nieuwe sessie
- `GET /api/v1/sessions/{id}` - Haal sessie op
- `PUT /api/v1/sessions/{id}` - Update sessie
- `DELETE /api/v1/sessions/{id}` - Verwijder sessie

### Teams (Standalone)
- `GET /api/v1/standalone-teams` - Lijst alle teams
- `POST /api/v1/standalone-teams` - Maak nieuw team
- `PUT /api/v1/standalone-teams/{id}` - Update team
- `DELETE /api/v1/standalone-teams/{id}` - Verwijder team

### Session Teams
- `GET /api/v1/sessions/{id}/teams` - Teams in sessie
- `POST /api/v1/sessions/{id}/teams` - Voeg nieuw team toe
- `POST /api/v1/sessions/{id}/add-team` - Voeg bestaand team toe
- `DELETE /api/v1/sessions/{id}/remove-team/{team_id}` - Verwijder uit sessie

### Scores
- `GET /api/v1/sessions/{id}/scores` - Scores van sessie
- `POST /api/v1/sessions/{id}/scores` - Voeg score toe
- `GET /api/v1/sessions/{id}/leaderboard` - Leaderboard van sessie

### Live Updates
- `GET /api/v1/live/leaderboard` - Actieve sessie leaderboard

## 🔌 Socket.IO Events

### Client → Server
- `connect` - Verbinding gemaakt
- `disconnect` - Verbinding verbroken

### Server → Client
- `welcome` - Welkomstbericht bij connectie
- `team_update` - Team toegevoegd/gewijzigd/verwijderd
- `score_update` - Score toegevoegd
- `game_status_update` - Sessie status gewijzigd

## 🐛 Troubleshooting

### Backend start niet
- Check of poort 8000 vrij is
- Controleer Python versie: `python --version`
- Installeer dependencies: `pip install -r requirements.txt`

### Frontend kan niet verbinden
- Controleer of backend draait op http://localhost:8000
- Check browser console voor errors
- Verify CORS settings in `app.py`

### Database errors
- Verwijder `scoreboard.db` en run `python init_database.py`
- Voor migratie problemen: herstel backup met `Copy-Item scoreboard_backup_*.db scoreboard.db`

### Teams verschijnen niet in dropdown
- Controleer of teams bestaan: open `http://localhost:8000/api/v1/standalone-teams`
- Refresh de pagina
- Check browser console voor errors

## 📝 Release Notes

### v2.0 - Team Herbruikbaarheid (2025-11-07)
- ✅ Teams zijn nu herbruikbaar over meerdere sessies
- ✅ Nieuwe database structuur met `game_teams` koppeltabel
- ✅ Teams dropdown in team setup
- ✅ Verbeterde team management endpoints
- ✅ Migratie script voor bestaande databases

### v1.5 - Player Scoring
- ✅ Player-based scoring mode toegevoegd
- ✅ Spelers kunnen toegevoegd worden aan teams
- ✅ Individuele speler statistieken
- ✅ Scores tellen automatisch op naar team totaal

### v1.0 - Initial Release
- ✅ Basis scoreboard functionaliteit
- ✅ Real-time updates
- ✅ Multiple sessions support
- ✅ SQLite database

## 🤝 Contributing

1. Maak een branch voor je feature
2. Commit je wijzigingen
3. Push naar de branch
4. Open een Pull Request

## 📄 License

Dit project is ontwikkeld voor educatieve doeleinden.

## 👥 Authors

MCT Team Project - Semester 2 (2025)

---

**Veel succes met scoren! 🎯🏆**
