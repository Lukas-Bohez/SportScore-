# Rounds System - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SportScore Application                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐ │
│  │   Frontend Clients   │      │  Backend Server (FastAPI)│ │
│  │                      │      │                          │ │
│  │ ┌────────────────┐   │      │ ┌────────────────────┐   │ │
│  │ │ Score Input    │◄──┼─────►│ │ Round Control APIs │   │ │
│  │ │ Page (Timer)   │   │      │ │                    │   │ │
│  │ └────────────────┘   │      │ │ - /start           │   │ │
│  │                      │      │ │ - /pause           │   │ │
│  │ ┌────────────────┐   │      │ │ - /resume          │   │ │
│  │ │ Big Screen     │◄──┼─────►│ │ - /next            │   │ │
│  │ │ (Leaderboard)  │   │      │ │ - /status          │   │ │
│  │ └────────────────┘   │      │ └────────────────────┘   │ │
│  │                      │      │                          │ │
│  └──────────────────────┘      │ ┌────────────────────┐   │ │
│           ▲                     │ │ Background Task    │   │ │
│           │                     │ │ round_timer_       │   │ │
│           │ Socket.IO           │ │ monitor()          │   │ │
│           │ Events              │ │                    │   │ │
│           │                     │ │ Checks every 1s    │   │ │
│           │                     │ │ for active rounds  │   │ │
│           └─────────────────────┤ └────────────────────┘   │ │
│                                 │                          │ │
│                                 │ ┌────────────────────┐   │ │
│                                 │ │    Database        │   │ │
│                                 │ │  (SQLite/PostgreSQL)   │
│                                 │ │                    │   │ │
│                                 │ │ activities table   │   │ │
│                                 │ │ - current_round    │   │ │
│                                 │ │ - total_rounds     │   │ │
│                                 │ │ - round_status     │   │ │
│                                 │ │ - round_start_time │   │ │
│                                 │ │ - time_limit_...   │   │ │
│                                 │ └────────────────────┘   │ │
│                                 └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Starting a Round

```
User clicks "▶ Start Ronde"
    ↓
JavaScript: api.startActivityRound(activityId)
    ↓
HTTP POST: /api/v1/activities/{id}/rounds/start
    ↓
Backend: update_activity() with:
  - round_status = 'active'
  - round_start_time = NOW
  - status = 'active'
    ↓
Database: activities table updated
    ↓
Backend: await sio.emit('round_started', {...})
    ↓
Socket.IO broadcasts to all connected clients
    ↓
Frontend receives 'round_started' event
    ↓
JavaScript: handleRoundStarted() → loadRoundStatus()
    ↓
UI Updates:
  - Timer shows "01:00" (if time_limit = 60)
  - "Start Round" button hidden
  - "Pause" and "End Round" buttons shown
```

## Data Flow: Time Expiring (Automatic)

```
Backend: round_timer_monitor() task (every 1 second)
    ↓
Query: SELECT active rounds with time_limit WHERE...
    ↓
For each active round:
    elapsed = NOW - round_start_time
    remaining = time_limit - elapsed
    
    IF remaining <= 0:
        ↓
        Update DB:
        - current_round += 1
        - round_status = 'not_started'
        - round_start_time = NULL
        - round_end_time = NOW
        
        OR if last round:
        - status = 'completed'
        - round_status = 'completed'
        ↓
        Emit 'round_auto_advanced' event
        ↓
        All clients receive event and refresh
```

## Data Flow: Timer Display Updates

```
User in score input page or big screen
    ↓
Listening for 'round_time_update' event
    ↓
Backend task emits every 5 seconds (optimization):
{
  activity_id: 1,
  current_round: 1,
  time_remaining: 55,
  time_elapsed: 5,
  timestamp: "2026-01-19T15:30:00+01:00"
}
    ↓
Client receives event
    ↓
JavaScript: handleRoundTimeUpdate(data)
    ↓
updateTimerDisplay(data.time_remaining)
    ↓
DOM: display "00:55"
    ↓
Color update:
    60s remaining → 🟢 Green
    45s remaining → 🟠 Orange
    20s remaining → 🔴 Red
```

## Database Schema: Activity with Rounds

```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  name VARCHAR(200) NOT NULL,
  sport_type VARCHAR(50),
  
  -- ROUND CONFIGURATION
  total_rounds INTEGER DEFAULT 1,           -- Total rounds (1-20)
  time_limit_per_round INTEGER,              -- Seconds per round (NULL = no limit)
  
  -- ROUND STATE
  current_round INTEGER DEFAULT 1,           -- Which round (1 to total_rounds)
  round_status TEXT,                         -- 'not_started'|'active'|'paused'|'completed'
  round_start_time TIMESTAMP,                -- When current round started
  round_end_time TIMESTAMP,                  -- When current round ended
  
  status TEXT,                               -- Overall activity status
  
  -- ... other fields ...
);
```

## State Machine: Round Status

```
INITIALIZATION
    ↓
    ┌─────────────────────┐
    │  not_started        │
    │  (ready to start)   │
    └──────────┬──────────┘
               │
        [Start Round] or [Next Round]
               │
               ▼
    ┌─────────────────────┐
    │     active          │
    │  (running, timer)   │
    └──────┬───────────┬──┘
           │           │
      [Pause]    [Time expires or End Round]
           │           │
           ▼           ▼
    ┌─────────────┐ ┌────────────────────┐
    │   paused    │ │   completed        │
    │ (timer off) │ │ (round ended)      │
    └──────┬──────┘ └────────┬───────────┘
           │                 │
        [Resume]        [Next Round] (if not last)
           │                 │
           └────────┬────────┘
                    ▼
            ┌──────────────┐
            │ not_started  │
            │  (next round)│
            └──────────────┘
                    ▼
            [repeat until total_rounds reached]
```

## Socket.IO Events: Round Timeline

```
Timeline of events during a 3-round activity with 60s per round:

t=0s      Admin clicks "Start Round"
          ↓
          Server: round_started
          {"activity_id": 1, "current_round": 1, "round_start_time": "..."}
          
t=5s      Timer update (periodic, every 5s)
          ↓
          Server: round_time_update
          {"activity_id": 1, "time_remaining": 55, "time_elapsed": 5}
          
t=10s     Another timer update
          ↓
          Server: round_time_update
          {"activity_id": 1, "time_remaining": 50, "time_elapsed": 10}

... (5 more updates)

t=60s     Time expired!
          ↓
          Server: round_auto_advanced
          {"activity_id": 1, "previous_round": 1, "current_round": 2, "total_rounds": 3}
          ↓
          Server: round_time_update
          {"activity_id": 1, "time_remaining": 60, "time_elapsed": 0}
          
t=65s     Another timer update for Round 2
          ↓
          Server: round_time_update
          {"activity_id": 1, "time_remaining": 55, "time_elapsed": 5}

... (repeat for Round 2 and 3)

t=180s    Round 3 time expires
          ↓
          Server: activity_completed
          {"activity_id": 1, "total_rounds": 3, "reason": "all_rounds_completed"}
```

## File Synchronization Map

When a round-related action occurs, these files interact:

```
User Action: Click "Start Round"
    ↓
Frontend: simple-scoreinput.js (startRound())
    ↓
Frontend: api.js (startActivityRound())
    ↓
HTTP POST → Backend: app.py (start_activity_round())
    ↓
Backend: datarepository.py (ActivityRepository.update_activity())
    ↓
Database: database.py (execute_sql)
    ↓
DB: SQLite/PostgreSQL activities table
    ↓
Backend: app.py emits 'round_started' via Socket.IO
    ↓
Socket.IO: broadcasts to all connected clients
    ↓
Frontend: api.js registers event listener
    ↓
Frontend: simple-scoreinput.js (handleRoundStarted())
    ↓
Frontend: bigscreen.js (handleRoundStarted())
    ↓
UI Updates: displays round status, shows timer
```

## Performance Considerations

### Optimization: Why Not Update Every Second?

❌ **Without optimization** (update every second):
- 100 activities × 60 seconds/minute × 1 message/second = 6,000 messages/minute
- 100 clients × 6,000 = 600,000 socket messages/minute
- Network: 40-50 Mbps for typical setup
- Database: 100 queries/minute (reads are cheap)

✅ **With optimization** (update every 5 seconds):
- 100 activities × 60 seconds/minute × 0.2 message/second = 1,200 messages/minute
- 100 clients × 1,200 = 120,000 socket messages/minute
- Network: 8-10 Mbps (5x improvement)
- Database: 20 queries/minute
- **Client-side timer still smooth** due to local setTimeout updates

### Database Indexing

```sql
-- Indexes for round timer monitoring
CREATE INDEX idx_activities_round_status 
  ON activities(round_status, time_limit_per_round)
  WHERE round_status = 'active';

CREATE INDEX idx_activities_session_round 
  ON activities(session_id, current_round);
```

These indexes enable the background task to quickly find:
1. Active rounds that need timing (for auto-advance)
2. Rounds within a session (for filtering)

## Error Handling

### Scenario: Client Receives Old round_time_update

```
Problem:
  - Network lag causes delayed message
  - Client receives: time_remaining = 55 at t=10s
  - But actual time is t=20s

Solution:
  - Calculate time_remaining client-side from timestamp
  - actual_remaining = time_remaining - (NOW - event.timestamp)
  - Protects against stale updates
```

### Scenario: Server Crash During Active Round

```
Problem:
  - Server restarts
  - Active round stuck in 'active' status
  - Timer doesn't resume

Solution:
  - On startup, check for stale active rounds
  - If round is "too old" (>24 hours), mark as completed
  - Otherwise allow resume from where it was
  - Alternative: Admin manually advances round
```

### Scenario: Timezone Mismatch

```
Problem:
  - Client in UTC, server in CET (+1 hour)
  - Time calculations are off

Solution:
  - All timestamps stored in ISO 8601 format with timezone
  - "2026-01-19T15:30:00+01:00" includes timezone info
  - Python datetime handles conversions automatically
  - Client calculates: elapsed = NOW - parsed_timestamp (handles tz)
```

## Testing Strategy

### Unit Tests for Round Logic

```python
def test_round_advancement():
    activity = create_activity(total_rounds=3, time_limit=60)
    
    # Start round
    start_round(activity.id)
    assert activity.round_status == 'active'
    
    # Fast-forward time
    set_fake_time(now + 61 seconds)
    
    # Run background task
    round_timer_monitor()
    
    # Check advancement
    assert activity.current_round == 2
    assert activity.round_status == 'not_started'

def test_auto_completion():
    activity = create_activity(total_rounds=1, time_limit=60)
    start_round(activity.id)
    
    set_fake_time(now + 61 seconds)
    round_timer_monitor()
    
    # Should complete, not just advance
    assert activity.status == 'completed'
```

### Integration Tests

```javascript
// Frontend integration test
it('should display countdown timer', async () => {
  const activity = await createActivity({
    total_rounds: 1,
    time_limit_per_round: 60
  });
  
  await api.startActivityRound(activity.id);
  
  // Wait for event
  const event = await listenForEvent('round_started');
  expect(event.activity_id).toBe(activity.id);
  
  // Check UI
  expect(document.getElementById('timer').textContent).toMatch(/01:00|00:59/);
});
```

## Monitoring & Debugging

### Backend Logs

```python
# In app.py round_timer_monitor()
logger.info(f"Activity {activity_id} round {current_round} time limit reached")
logger.error(f"Error processing round timer for activity {activity_id}: {e}")
```

Check with:
```bash
tail -f app.log | grep "round_timer"
```

### Frontend Debugging

```javascript
// Enable debug logging
window.DEBUG_ROUNDS = true;

// In handleRoundTimeUpdate()
if (window.DEBUG_ROUNDS) {
  console.log('Round time update:', data);
  console.log('Remaining:', data.time_remaining, 'Elapsed:', data.time_elapsed);
}
```

### WebSocket Monitoring

Browser DevTools → Network → WS tab:
- Filter by "socket.io"
- Look for round_* events
- Check payload size and frequency

### Database Queries

```sql
-- Check current round state
SELECT id, name, current_round, total_rounds, round_status, 
       round_start_time, time_limit_per_round
FROM activities
WHERE round_status = 'active'
ORDER BY round_start_time;

-- Check pending rounds
SELECT id, name, current_round, total_rounds, round_status
FROM activities
WHERE round_status IN ('not_started', 'paused')
  AND total_rounds > 1;
```

