# API Composables

Deze folder bevat alle Vue 3 composables voor API communicatie met de backend.

## 📁 Structuur

```
composables/
├── index.js           # Central export
├── useApi.js          # Base API functionaliteit
├── useActivities.js   # Activity endpoints
├── useSessions.js     # Session endpoints
├── useTeams.js        # Team endpoints
└── useScores.js       # Score endpoints
```

## 🚀 Gebruik

### 1. Import composable

```javascript
import { useActivities } from "@/composables";
// Of specifiek:
import { useActivities } from "@/composables/useActivities";
```

### 2. Gebruik in component

```vue
<script setup>
import { onMounted } from "vue";
import { useActivities } from "@/composables";

const {
  activities,
  loading,
  error,
  fetchActivities,
  createActivity,
  deleteActivity,
} = useActivities();

// Fetch activities on mount
onMounted(async () => {
  await fetchActivities();
});

// Create new activity
async function handleCreate() {
  try {
    await createActivity({
      name: "Voetbal Toernooi",
      scoring_mode: "team",
      game_type: "sport_challenge",
      sport_type: "voetbal",
      rounds: 3,
      time_limit: 60,
    });
  } catch (e) {
    console.error("Failed:", e);
  }
}

// Delete activity
async function handleDelete(id) {
  try {
    await deleteActivity(id);
  } catch (e) {
    console.error("Failed:", e);
  }
}
</script>

<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-if="error">Error: {{ error }}</div>

    <div v-for="activity in activities" :key="activity.id">
      {{ activity.name }}
      <button @click="handleDelete(activity.id)">Delete</button>
    </div>

    <button @click="handleCreate">Create Activity</button>
  </div>
</template>
```

## 📚 API Overzicht

### useActivities

```javascript
const {
  activities, // ref([]) - Lijst van activities
  currentActivity, // ref(null) - Huidige activity
  loading, // ref(false) - Loading state
  error, // ref(null) - Error message

  fetchActivities, // () => Promise - Haal alle activities op
  fetchActivity, // (id) => Promise - Haal specifieke activity op
  createActivity, // (data) => Promise - Maak nieuwe activity
  updateActivity, // (id, data) => Promise - Update activity
  deleteActivity, // (id) => Promise - Verwijder activity
} = useActivities();
```

**Activity Data Structure:**

```javascript
{
  name: 'string',              // Required
  scoring_mode: 'string',      // team, team_with_players, player
  game_type: 'string',         // sport_challenge, quiz, elimination, team_vs_time, golf
  sport_type: 'string',        // voetbal, basketbal, quiz, etc.
  rounds: number,              // Optional
  time_limit: number,          // Optional (in minutes)
}
```

### useSessions

```javascript
const {
  sessions, // ref([]) - Lijst van sessions
  currentSession, // ref(null) - Huidige session
  activeSessions, // ref([]) - Actieve sessions
  loading,
  error,

  fetchSessions, // () => Promise
  fetchActiveSessions, // () => Promise
  fetchSession, // (id) => Promise
  createSession, // (data) => Promise
  updateSession, // (id, data) => Promise
  startSession, // (id) => Promise
  stopSession, // (id) => Promise
  deleteSession, // (id) => Promise
} = useSessions();
```

**Session Data Structure:**

```javascript
{
  name: 'string',           // Required
  activities: [1, 2, 3],    // Array of activity IDs
  teams: [1, 2, 3],         // Array of team IDs
}
```

### useTeams

```javascript
const {
  teams, // ref([]) - Lijst van teams
  currentTeam, // ref(null) - Huidig team
  loading,
  error,

  fetchTeams, // () => Promise
  fetchTeamsBySession, // (sessionId) => Promise
  fetchTeam, // (id) => Promise
  createTeam, // (data) => Promise
  updateTeam, // (id, data) => Promise
  deleteTeam, // (id) => Promise
  addPlayer, // (teamId, data) => Promise
  removePlayer, // (teamId, playerId) => Promise
} = useTeams();
```

**Team Data Structure:**

```javascript
{
  name: 'string',     // Required
  emoji: 'string',    // Optional
  players: [          // Optional
    { name: 'string', emoji: 'string' }
  ]
}
```

### useScores

```javascript
const {
  scores, // ref([]) - Lijst van scores
  leaderboard, // ref([]) - Leaderboard data
  loading,
  error,

  fetchScoresBySession, // (sessionId) => Promise
  fetchScoresByActivity, // (activityId) => Promise
  fetchLeaderboard, // (sessionId) => Promise
  addScore, // (data) => Promise
  updateScore, // (id, data) => Promise
  deleteScore, // (id) => Promise
  addBonusPoints, // (teamId, sessionId, points) => Promise
} = useScores();
```

**Score Data Structure:**

```javascript
{
  session_id: number,    // Required
  activity_id: number,   // Required
  team_id: number,       // Optional (depends on scoring_mode)
  player_id: number,     // Optional (depends on scoring_mode)
  score: number,         // Required (punten of seconden)
  round: number,         // Optional
}
```

## 🔧 Configuratie

### Environment Variables

Maak een `.env` file in de frontend root:

```env
VITE_API_URL=http://localhost:8000
```

## ⚡ Tips

1. **Loading States**: Gebruik `loading` ref om loading spinners te tonen
2. **Error Handling**: Gebruik `error` ref om error messages te tonen
3. **Auto Refresh**: Sommige functies refreshen automatisch de data (bijv. `createActivity` refresh `activities`)
4. **Try-Catch**: Gebruik altijd try-catch blocks bij API calls
5. **Reactive Data**: Alle data is reactive via Vue refs

## 🎯 Voorbeelden

### NewActivity.vue - Activity aanmaken

```vue
<script setup>
import { useActivities } from "@/composables";
import { ref } from "vue";

const { createActivity, loading, error } = useActivities();

const activityName = ref("");
const selectedGameType = ref("");
const selectedSportStyle = ref("");

async function saveActivity() {
  try {
    await createActivity({
      name: activityName.value,
      scoring_mode: "team",
      game_type: selectedGameType.value,
      sport_type: selectedSportStyle.value,
      rounds: 3,
      time_limit: 30,
    });

    // Success! Go back
    router.back();
  } catch (e) {
    // Error wordt automatisch in error ref gezet
    console.error("Save failed:", e);
  }
}
</script>
```

### SessionManagement.vue - Scores toevoegen

```vue
<script setup>
import { useScores, useSessions } from "@/composables";
import { ref, onMounted } from "vue";

const { addScore, addBonusPoints } = useScores();
const { currentSession } = useSessions();

async function handleAddScore(teamId, score) {
  try {
    await addScore({
      session_id: currentSession.value.id,
      activity_id: selectedActivity.value,
      team_id: teamId,
      score: score,
    });
  } catch (e) {
    console.error("Failed to add score:", e);
  }
}

async function handleBonus() {
  await addBonusPoints(selectedTeam.value, currentSession.value.id, 5);
}
</script>
```

## 🐛 Debugging

Console logs zijn al ingebouwd in alle composables. Check de browser console voor details bij errors.
