# Quick Start: Using Player-Based Scoring

## Step 1: Update Your Database

Run this command in your terminal (adjust username/database as needed):

```bash
mysql -u root -p scoreboard < backend/add_scoring_mode_migration.sql
```

Or manually in MySQL:
```sql
ALTER TABLE games 
ADD COLUMN scoring_mode ENUM('team', 'player') DEFAULT 'team' 
AFTER status;
```

## Step 2: Start the Backend

```bash
cd backend
python run.py
```

The server should start on http://localhost:8000

## Step 3: Open the Frontend

Open `frontend/startscreen.html` in your browser.

## Step 4: Create a Session

1. Fill in the form:
   - **Sessie Naam**: "My First Player Scoring Session"
   - **Speltype**: Choose any (e.g., "Aangepast")
   - **Score Modus**: You can select here, but you can also change it in the next step! ✨
   - **Maximum Aantal Teams**: 4
   - **Aantal Rondes**: 1

2. Click **"Sessie Aanmaken"**

## Step 5: Setup Teams & Choose Scoring Mode ⭐ NEW!

**This is where you make the important choice!**

1. On the Team Setup page, you'll see a **Score Modus** section on the right side with two options:

   - **👥 Team Scores** - Punten gaan direct naar teams
   - **👤 Speler Scores** - Punten per speler, geteld naar team totaal

2. Select **👤 Speler Scores** (Player Scores)
   
   💡 A yellow hint box will appear reminding you to add players!

3. Add your first team:
   - **Team naam**: "Red Team"
   - **Kleur**: 🔴 Rood
   - **Icoon**: 🔥 Vuur
   - Click **"Toevoegen"**

4. Add players to Red Team:
   - In the Red Team card, enter player name: "Alice"
   - Position: "Striker"
   - Click **"Voeg speler toe"**
   - Repeat for "Bob" (Midfielder), "Carol" (Goalie)

5. Add more teams with players (Blue Team, Green Team, etc.)

6. Click **"Start Sessie"**

## Step 6: Score with Player-Based Tracking

1. You'll see the score input page with a 👤 icon (indicating player mode)

2. Give Alice 5 points:
   - **Selecteer Team**: Red Team
   - **Selecteer Speler**: Alice ⭐ This matters now!
   - **Punten**: 5
   - **Reden**: "First goal"
   - Click **"Score Toevoegen"**

3. Look at the leaderboard - it now shows:
   ```
   #1 Red Team - 5 points
      [Alice (Striker): 5] [Bob (Midfielder): 0] [Carol (Goalie): 0]
   ```

4. Give Bob 3 points:
   - Team: Red Team
   - Player: Bob
   - Points: 3
   
5. Leaderboard updates to:
   ```
   #1 Red Team - 8 points
      [Alice (Striker): 5] [Bob (Midfielder): 3] [Carol (Goalie): 0]
   ```

## Comparison: Team Mode vs Player Mode

### Team Mode (Traditional):
```
#1 Red Team - 25 points
   [Alice] [Bob] [Carol]
```
- Shows team total only
- Players are just listed by name

### Player Mode (NEW!):
```
#1 Red Team - 25 points
   [Alice: 15] [Bob: 7] [Carol: 3]
```
- Shows team total (sum of all player scores)
- Each player shows their individual contribution
- You can see who's carrying the team! 🏆

## Pro Tips

1. **Change Mode Anytime**: You can switch between Team and Player scoring modes on the Team Setup page - just click the radio button! 🔄

2. **Quick Player Selection**: Click on a player badge in the leaderboard to auto-select that team and player

3. **Team-Wide Points**: In player mode, you can still leave the player dropdown empty to give points to the team as a whole

4. **Recent Scores**: The recent scores section will show which player scored (e.g., "Red Team - Alice - +5")

5. **Add Players Later**: If you start in team mode and switch to player mode, you can add players at any time during setup!

## When to Use Each Mode

### Use Team Mode When:
- ✅ You only care about team totals
- ✅ Quick, simple competitions
- ✅ Team building events where everyone contributes equally

### Use Player Mode When:
- ⭐ You want to recognize individual achievements
- ⭐ Sports/quiz competitions with rotating participants
- ⭐ You need detailed performance analytics
- ⭐ You want to motivate individual players while maintaining team spirit

## That's It!

You now have a powerful scoring system that can track both team AND individual performance. Perfect for making your team building events more engaging and fair! 🎉
