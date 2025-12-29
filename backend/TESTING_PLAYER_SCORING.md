# Testing the Player Scoring Feature

## Prerequisites
1. Make sure your MySQL database is running
2. Apply the database migration:
   ```bash
   mysql -u root -p scoreboard < backend/add_scoring_mode_migration.sql
   ```
   Or run the full schema to recreate:
   ```bash
   mysql -u root -p scoreboard < backend/database_schema.sql
   ```

## Test Steps

### Test 1: Create Session with Team Scoring (Default)
1. Start the backend: `python backend/run.py`
2. Open `frontend/startscreen.html` in browser
3. Fill in session form:
   - Name: "Test Team Scoring"
   - Scoring Mode: **Team Scores**
   - Max Teams: 4
4. Click "Sessie Aanmaken"
5. You should be redirected to team setup

### Test 2: Add Teams and Players
1. Add Team "Red Team" with color red, icon fire
2. Add players to Red Team:
   - Alice (Forward)
   - Bob (Midfielder)
3. Add Team "Blue Team" with color blue, icon star
4. Add players to Blue Team:
   - Charlie (Forward)
   - Dana (Goalie)
5. Click "Start Sessie"

### Test 3: Score with Team Mode
1. On score input page, check header shows: 👥 (team icon)
2. Select "Red Team"
3. Add +5 points with reason "First goal"
4. Check leaderboard shows:
   - Red Team: 5 points
   - Players shown as clickable badges: [Alice (Forward)] [Bob (Midfielder)]
   - **No individual scores shown** (just names)
5. Select "Blue Team" and add +3 points
6. Verify leaderboard updates correctly

### Test 4: Create Session with Player Scoring
1. Go back to start screen
2. End previous session if active
3. Create new session:
   - Name: "Test Player Scoring"
   - Scoring Mode: **Player Scores**
   - Max Teams: 3
4. Add teams and players as before

### Test 5: Score with Player Mode
1. On score input page, check header shows: 👤 (player icon)
2. Select "Red Team"
3. Select player "Alice"
4. Add +5 points with reason "Goal by Alice"
5. Check leaderboard shows:
   - Red Team: 5 points
   - **[Alice (Forward): 5]** [Bob (Midfielder): 0]
   - Individual scores are displayed!
6. Select "Red Team" and "Bob"
7. Add +3 points
8. Verify leaderboard shows:
   - Red Team: 8 points
   - [Alice (Forward): 5] [Bob (Midfielder): 3]

### Test 6: Recent Scores Display
1. In player mode, verify recent scores show:
   - "Red Team - Bob - +3 points"
   - "Red Team - Alice - +5 points"
2. Compare with team mode where it should show:
   - "Red Team - +5 points" (no player name)

### Test 7: Mixed Scoring (Player Mode)
1. With player scoring enabled
2. Select a team but **don't select a player**
3. Add points
4. Verify: Points go to team total but not to any specific player's individual score

### Test 8: Quick Actions
1. Test that quick action buttons work in both modes
2. In player mode, select a player first
3. Click a quick action (e.g., "+5 Bonus")
4. Verify points are assigned correctly to the selected player

## Expected Results

### Team Mode Leaderboard:
```
#1 Red Team - 25 points
   [Alice (Forward)] [Bob (Midfielder)]

#2 Blue Team - 20 points
   [Charlie (Forward)] [Dana (Goalie)]
```

### Player Mode Leaderboard:
```
#1 Red Team - 25 points
   [Alice (Forward): 15] [Bob (Midfielder): 10]

#2 Blue Team - 20 points
   [Charlie (Forward): 12] [Dana (Goalie): 8]
```

## Common Issues

### Issue: Scoring mode not showing
- **Solution**: Make sure you ran the migration to add the `scoring_mode` column

### Issue: Player scores not displaying
- **Solution**: Check that players were added to teams and that the session was created with player scoring mode

### Issue: Database errors
- **Solution**: Verify the migration ran successfully and the column exists:
  ```sql
  DESCRIBE games;
  ```
  Look for `scoring_mode` column

## API Testing

You can also test via API:

### Create session with player scoring:
```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Session",
    "game_type": "custom",
    "scoring_mode": "player",
    "max_teams": 4,
    "total_rounds": 1
  }'
```

### Get session details:
```bash
curl http://localhost:8000/api/v1/sessions/1
```

### Add score with player:
```bash
curl -X POST http://localhost:8000/api/v1/sessions/1/scores \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "team_id": 1,
    "player_id": 1,
    "points": 5,
    "reason": "Great play",
    "round_number": 1
  }'
```
