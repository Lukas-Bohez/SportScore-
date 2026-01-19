# Rounds and Time Limits Implementation Guide

## Overview
This implementation adds comprehensive rounds and time limit support to activities in the SportScore application. Activities can now be configured with multiple rounds, and each round can have an optional time limit that automatically advances to the next round when time expires.

## Key Features

### 1. **Multiple Rounds**
- Activities can be configured with 1-20 rounds
- When a round ends, the system automatically advances to the next round
- Admin can manually skip to the next round at any time

### 2. **Time Limits per Round**
- Each activity can have an optional time limit (in seconds)
- When active, a countdown timer is displayed on both the score input page and big screen
- When time expires, the activity automatically advances to the next round or completes if it's the last round

### 3. **Real-time Updates**
- Socket.IO events broadcast round changes to all connected clients
- Countdown timer updates every second with automatic color coding:
  - Green: > 60 seconds remaining
  - Orange: 30-60 seconds remaining
  - Red: < 30 seconds remaining

### 4. **Admin Controls**
- Start Round: Begin the current round and start the timer
- Pause/Resume: Temporarily pause a running round
- End Round: Manually end the current round
- Next Round: Advance to the next round
- Status Display: Shows current round, total rounds, and time remaining

## Database Changes

### New Columns Added to `activities` Table:
- `time_limit_per_round`: Time limit per round in seconds (NULL if no limit)
- `round_status`: Current status of the round ('not_started', 'active', 'paused', 'completed')
- `round_start_time`: Timestamp when the round started
- `round_end_time`: Timestamp when the round ended

### Migration Script
Run the migration to add these columns:
```bash
python migrations/migrate_add_round_timing.py
```

## API Endpoints

### Get Round Status
```
GET /api/v1/activities/{activity_id}/rounds/status
```
Returns current round info, time remaining, and status.

### Start Round
```
POST /api/v1/activities/{activity_id}/rounds/start
```
Starts the current round and begins the timer.

### End Round
```
POST /api/v1/activities/{activity_id}/rounds/end
```
Ends the current round.

### Next Round
```
POST /api/v1/activities/{activity_id}/rounds/next
```
Advances to the next round (only if not on the last round).

### Pause Round
```
POST /api/v1/activities/{activity_id}/rounds/pause
```
Pauses a running round.

### Resume Round
```
POST /api/v1/activities/{activity_id}/rounds/resume
```
Resumes a paused round.

## Socket.IO Events

The backend emits the following real-time events:

- `round_started`: Sent when a round starts
- `round_ended`: Sent when a round ends
- `round_changed`: Sent when advancing to a new round
- `round_paused`: Sent when a round is paused
- `round_resumed`: Sent when a paused round is resumed
- `round_time_update`: Sent every second with time remaining (only when active with time limit)
- `round_auto_advanced`: Sent when the system automatically advances due to time limit
- `activity_completed`: Sent when all rounds are complete

## Frontend Updates

### Activity Creation Form
The activity creation/edit form now includes:
- **Aantal Rondes** (Number of Rounds): 1-20 rounds
- **Tijd per Ronde (sec)** (Time per Round): Optional time limit in seconds

### Score Input Page (`simple-scoreinput.html`)
New UI elements added:
- Round indicator showing current round (e.g., "Ronde 3/5")
- Countdown timer with color coding
- Round control buttons:
  - ▶ Start Ronde (Start Round)
  - ⏸ Pauzeer (Pause)
  - ▶ Hervatten (Resume)
  - ⏹ Einde Ronde (End Round)
  - ⏭ Volgende Ronde (Next Round)

### Big Screen Display (`SportScoreBigScreen.html`)
New UI elements:
- Round indicator at the top
- Countdown timer with live updates

## Backend Features

### Automatic Round Progression
The backend includes a background task (`round_timer_monitor`) that:
- Runs every second and checks for active rounds with time limits
- Emits time update events periodically (every 5 seconds for efficiency)
- Automatically advances to the next round when time expires
- Automatically marks the activity as completed when all rounds are done

### Example: Setting up a 3-Round Activity with 2-Minute Rounds

1. **Create Activity:**
```json
{
  "name": "Penalty Shootout",
  "sport_type": "voetbal",
  "game_type": "custom",
  "scoring_mode": "team",
  "total_rounds": 3,
  "time_limit_per_round": 120,  // 2 minutes per round
  "description": "3 rounds of penalty kicks"
}
```

2. **Admin Starts Round:**
- Click "▶ Start Ronde" button
- Timer counts down from 2:00
- Scores can be entered while timer is running

3. **When Time Expires:**
- System automatically advances to round 2
- Broadcast notification to all clients
- New round countdown starts

4. **After Round 3 Complete:**
- Activity marked as completed
- Final scores calculated

## Technical Implementation Details

### Round Status Machine
```
not_started → active ↔ paused → completed
      ↓         ↓
      └─────────→ (end_round)
```

### Time Calculation
- Elapsed time = current time - round_start_time
- Time remaining = time_limit_per_round - elapsed_time
- Over time flag when time_remaining < 0

### Background Task
The `round_timer_monitor()` task in `app.py`:
1. Runs continuously in the background
2. Checks active rounds every 1 second
3. Emits time updates every 5 seconds (optimization)
4. Detects time expiration and advances rounds
5. Handles edge cases (timezone conversion, invalid dates, etc.)

## Configuration Examples

### Single Activity (No Rounds/Time)
```json
{
  "name": "Quiz Night",
  "total_rounds": 1,
  "time_limit_per_round": null
}
```
- Single round, no timer
- Admin can use "End Round" to manually finish

### Timed Sprint (1 Round with Time Limit)
```json
{
  "name": "Speed Challenge",
  "total_rounds": 1,
  "time_limit_per_round": 60  // 1 minute
}
```
- One round with 1-minute timer
- Auto-completes when time expires

### Tournament (Multiple Rounds)
```json
{
  "name": "Football Tournament",
  "total_rounds": 4,
  "time_limit_per_round": 300  // 5 minutes per round
}
```
- 4 rounds, each with 5-minute timer
- Auto-advances between rounds
- Completes after round 4

## Frontend API Usage

### JavaScript API
```javascript
// Start a round
await api.startActivityRound(activityId);

// Pause/Resume
await api.pauseActivityRound(activityId);
await api.resumeActivityRound(activityId);

// Advance to next round
await api.nextActivityRound(activityId);

// Get current round status
const status = await api.getRoundStatus(activityId);
// Returns: { current_round, total_rounds, round_status, time_remaining, ... }

// Listen for round events
api.on('round_time_update', (data) => {
  console.log(`${data.time_remaining} seconds remaining`);
});

api.on('round_auto_advanced', (data) => {
  console.log(`Advanced from round ${data.previous_round} to ${data.current_round}`);
});
```

## Troubleshooting

### Timer Not Showing
- Check that `total_rounds > 1` OR `time_limit_per_round` is set
- Verify round status is 'active'
- Check browser console for errors

### Auto-Advance Not Working
- Verify backend round_timer_monitor task is running (check logs)
- Ensure `round_status = 'active'` and `round_start_time` is set
- Check that `time_limit_per_round` is a valid number > 0

### Time Discrepancies
- Timer uses server timezone (CET/CEST for Belgium)
- Client-side display may vary slightly from server time
- Countdown is approximate; authoritative time is on server

### Socket Events Not Received
- Check that Socket.IO connection is active
- Verify browser hasn't blocked WebSocket connections
- Check firewall/proxy settings for `/socket.io` path

## Future Enhancements

Possible improvements:
1. **Round Presets**: Save common round configurations
2. **Pause All**: Pause all active rounds at once
3. **Round History**: View statistics from previous rounds
4. **Time Adjustment**: Allow admin to extend/reduce time mid-round
5. **Audio Alerts**: Play sound when time is running out
6. **Visual Alerts**: Flash screens on time expiration

## Files Modified

### Backend
- `/backend/database_schema_sqlite.sql` - Added new columns
- `/backend/migrations/migrate_add_round_timing.py` - Migration script
- `/backend/models/models.py` - Updated Activity models
- `/backend/database/datarepository.py` - Updated ActivityRepository
- `/backend/app.py` - Added round endpoints and background task

### Frontend - Homepage Management
- `/backend/voorbeeldGebruikBackend/frontend/index.html` - Unhid round form fields
- `/backend/voorbeeldGebruikBackend/frontend/js/homepageManagement.js` - Updated form handling

### Frontend - Score Input
- `/backend/voorbeeldGebruikBackend/frontend/simple-scoreinput.html` - Added round controls UI
- `/backend/voorbeeldGebruikBackend/frontend/js/simple-scoreinput.js` - Added round management

### Frontend - Big Screen
- `/backend/voorbeeldGebruikBackend/frontend/SportScoreBigScreen.html` - Added round display
- `/backend/voorbeeldGebruikBackend/frontend/js/bigscreen.js` - Added round event handling

### Frontend - API
- `/backend/voorbeeldGebruikBackend/frontend/js/api.js` - Added round API methods

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Activity creation with rounds/time works
- [ ] Round start button visible when configured
- [ ] Timer counts down when round is active
- [ ] Timer color changes (green → orange → red)
- [ ] Auto-advance works when time expires
- [ ] Next round button works manually
- [ ] Pause/Resume buttons work
- [ ] Round events broadcast to all connected clients
- [ ] Big screen shows round info and timer
- [ ] Score input page shows round info and timer
- [ ] Activity completes after last round
- [ ] Socket events are logged correctly
- [ ] Multiple activities with different round configs work together

