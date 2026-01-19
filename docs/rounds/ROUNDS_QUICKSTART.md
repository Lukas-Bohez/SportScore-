# Quick Start: Rounds and Time Limits

## Installation Steps

### 1. Update Your Database
```bash
cd /home/lukas/Documents/backend
python migrations/migrate_add_round_timing.py
```

This adds 4 new columns to the `activities` table:
- `time_limit_per_round` (seconds)
- `round_status` (not_started, active, paused, completed)
- `round_start_time` (timestamp)
- `round_end_time` (timestamp)

### 2. Restart Your Backend
```bash
# Kill the existing process
pkill -f "uvicorn.*app.py"

# Start the backend again
cd /home/lukas/Documents/backend
python app.py
# or use: uvicorn app:app --reload
```

The background round timer task will automatically start.

### 3. Test the Frontend

#### Create an Activity with Rounds
1. Go to **Admin Dashboard** → **Beheer** tab
2. Click **Nieuw Activiteit** (New Activity)
3. Fill in the form:
   - **Naam**: "Test Activity"
   - **Aantal Rondes**: 3
   - **Tijd per Ronde (sec)**: 60 (1 minute)
4. Click **Activiteit Opslaan** (Save Activity)

#### Run the Activity
1. Create a new session
2. Add the activity with rounds to the session
3. Go to the score input page
4. You should see:
   - Round indicator: "Ronde 1/3"
   - Countdown timer: "01:00"
   - Round control buttons
5. Click **▶ Start Ronde** (Start Round)
6. Watch the timer count down
7. After 60 seconds, observe auto-advance to Round 2

## How It Works

### Configuration
When creating an activity:
- **Aantal Rondes** (1-20): Sets the total number of rounds
- **Tijd per Ronde** (seconds, optional): Sets the time limit per round
  - If left empty: No time limit, admin controls when to advance
  - If set: Auto-advances when time expires

### Lifecycle of a Round

```
Activity Created
    ↓
Round Status: "not_started" | Current Round: 1/3
    ↓
Admin clicks "Start Round"
    ↓
Round Status: "active" | Timer starts counting down
    ↓
[Scores can be entered while timer runs]
    ↓
Time Expires OR Admin clicks "End Round"
    ↓
Admin clicks "Next Round" OR Auto-advances
    ↓
Current Round: 2/3 | Round Status: "not_started"
    ↓
Repeat until Round 3...
    ↓
After Last Round Ends
    ↓
Activity Status: "completed"
```

## Control Buttons

| Button | When Visible | Action |
|--------|-------------|--------|
| **▶ Start Ronde** | Round not started | Begin the round, start timer |
| **⏸ Pauzeer** | Round active | Pause the timer |
| **▶ Hervatten** | Round paused | Resume the paused timer |
| **⏹ Einde Ronde** | Round active/paused | End the round manually |
| **⏭ Volgende Ronde** | After round ends | Advance to next round |

## Real-Time Features

### Timer Color Coding
- 🟢 **Green**: > 60 seconds remaining
- 🟠 **Orange**: 30-60 seconds remaining  
- 🔴 **Red**: < 30 seconds remaining

### Automatic Progression
When a round has a time limit:
- Backend task monitors active rounds every second
- When time expires, system automatically:
  1. Ends the current round
  2. Advances to next round (or completes activity)
  3. Broadcasts events to all clients
  4. Refreshes leaderboards

### Multi-Device Sync
- Score input page shows timer and round info
- Big screen also shows timer and round info
- All devices stay in sync via WebSocket

## Example Scenarios

### Scenario 1: Timed Sprint (No Rounds)
```json
{
  "name": "Speed Challenge",
  "total_rounds": 1,
  "time_limit_per_round": 120  // 2 minutes
}
```
- Single round, 2-minute timer
- Auto-completes when time runs out

### Scenario 2: Multi-Round Tournament
```json
{
  "name": "Quiz Tournament",
  "total_rounds": 5,
  "time_limit_per_round": 300  // 5 minutes per round
}
```
- 5 rounds, each 5 minutes
- Auto-advances between rounds
- Admin can skip rounds with "Next Round" button

### Scenario 3: Flexible Activity (No Time)
```json
{
  "name": "Relay Race",
  "total_rounds": 3,
  "time_limit_per_round": null  // No time limit
}
```
- 3 rounds, but admin controls duration
- Manual round progression
- No countdown timer

## Troubleshooting

### "Round Controls Not Showing"
- Check if `total_rounds > 1` OR `time_limit_per_round` is set
- If total_rounds = 1 and no time limit: controls are hidden (single activity)
- Go to activity edit and add rounds/time limit

### "Timer Not Counting Down"
1. Verify you clicked "Start Round" button
2. Check browser console for errors (`F12` → Console tab)
3. Verify backend is running (`python app.py`)
4. Check that `round_status = 'active'`

### "Auto-Advance Not Working"
1. Ensure `time_limit_per_round` is set to a number > 0
2. Check backend logs for errors
3. Restart backend (`pkill -f uvicorn`)
4. Try manually clicking "Next Round"

### "Timer Showing on Big Screen But Not Score Input"
- Manually select the activity on the score input page
- Click activity in the list to load round status

## API Testing (for developers)

### Test Round Status
```bash
curl http://localhost:8000/api/v1/activities/1/rounds/status
```
Response:
```json
{
  "activity_id": 1,
  "current_round": 1,
  "total_rounds": 3,
  "round_status": "not_started",
  "time_remaining": null,
  "time_elapsed": null
}
```

### Start a Round
```bash
curl -X POST http://localhost:8000/api/v1/activities/1/rounds/start
```

### Test Socket Events
Open browser DevTools → Console and run:
```javascript
api.on('round_time_update', (data) => {
  console.log('Time remaining:', data.time_remaining);
});

api.on('round_auto_advanced', (data) => {
  console.log('Auto-advanced to round:', data.current_round);
});
```

## Performance Notes

- Background task checks rounds every 1 second
- Time updates broadcast every 5 seconds (not every second) for efficiency
- Supports unlimited concurrent activities with different round configurations
- Database queries are indexed for quick lookups

## Next Steps

1. ✅ Run the migration script
2. ✅ Restart the backend
3. ✅ Create an activity with rounds
4. ✅ Test round progression
5. ✅ Monitor big screen and score input pages
6. Consider custom styling for timer (update CSS in `themes.css`)
7. Add sound effects when time is almost up (optional feature)

## Support

If you encounter issues:
1. Check the implementation guide: `/home/lukas/Documents/ROUNDS_IMPLEMENTATION.md`
2. Review the code comments in modified files
3. Check browser console and backend logs for errors
4. Test with a simple 2-round activity first
