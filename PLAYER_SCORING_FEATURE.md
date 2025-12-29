# Player-Based Scoring Feature

## Overview
The webapp now supports two scoring modes:
- **Team Scoring**: Points are assigned directly to teams (traditional mode)
- **Player Scoring**: Points are assigned to individual players within teams, and the team's total score is the sum of all player scores

## How It Works

### 1. Creating a Session with Scoring Mode
When creating a new session on the start screen, you can now select the scoring mode:
- **Team Scores**: Traditional team-only scoring
- **Player Scores**: Individual player tracking with team aggregation

### 2. Team Setup
- Add teams as usual
- Add players to each team (optional but recommended for player scoring mode)
- The session status bar will indicate the scoring mode (e.g., "Status: Setup | Player Scores")

### 3. Score Input
#### Team Mode
- Select a team
- Optionally select a player (for informational purposes)
- Enter points - they go directly to the team total

#### Player Mode
- Select a team
- Select a specific player (or leave blank for team-wide points)
- Enter points
- **Key difference**: The leaderboard shows each player's individual score alongside the team total

### 4. Leaderboard Display

#### Team Mode:
```
#1 Team A - 25 points
   [Player 1] [Player 2] [Player 3]
```

#### Player Mode:
```
#1 Team A - 25 points
   [Player 1: 15] [Player 2: 5] [Player 3: 5]
```

### 5. Recent Scores
Recent scores will show player names when points were assigned to specific players:
- Team Mode: "Team A - +5 points"
- Player Mode: "Team A - Player 1 - +5 points"

## Technical Implementation

### Database Changes
- Added `scoring_mode` column to `games` table (ENUM: 'team', 'player')
- `scores` table already supports `player_id` (optional foreign key)

### Backend Changes
- `SessionRepository.create_session()` now accepts `scoring_mode` parameter
- `SessionRepository.update_session()` can update `scoring_mode`
- `SessionScoreRepository.create_score()` now accepts `player_id` parameter
- Session queries now include `scoring_mode` field

### Frontend Changes
- Start screen: Added scoring mode selector
- Team setup: Shows scoring mode in status bar
- Score input:
  - Header shows icon indicating mode (👥 for team, 👤 for player)
  - Leaderboard displays player scores when in player mode
  - Recent scores show player names when applicable

## Migration

To update an existing database, run the migration script:

```bash
mysql -u your_username -p your_database < backend/add_scoring_mode_migration.sql
```

Or manually run:
```sql
ALTER TABLE games 
ADD COLUMN scoring_mode ENUM('team', 'player') DEFAULT 'team' 
AFTER status;

UPDATE games SET scoring_mode = 'team' WHERE scoring_mode IS NULL;
```

## Use Cases

### Team Scoring
Best for:
- Simple team competitions
- When individual contributions don't matter
- Quick scoring scenarios

### Player Scoring
Best for:
- Sports competitions where individual stats matter
- Quiz competitions with rotating players
- Detailed performance tracking
- Gamified team building where you want to recognize individual achievements

## Example Workflow

1. **Create Session**: Choose "Player Scores" mode
2. **Setup Teams**: Add Team A with players Alice, Bob, Carol
3. **Add Scores**:
   - Alice answers correctly: Team A - Alice +5 (Team total: 5)
   - Bob answers correctly: Team A - Bob +5 (Team total: 10)
   - Carol gets penalty: Team A - Carol -2 (Team total: 8)
4. **View Leaderboard**:
   ```
   #1 Team A - 8 points
      [Alice: 5] [Bob: 5] [Carol: -2]
   ```

This allows you to see both team performance AND individual contributions!
