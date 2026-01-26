<template>
  <div class="scorescreen-container">
    <div class="scorescreen-header">
      <!-- Timer and Round Info Section -->
      <div
        class="timer-round-info"
        v-if="currentActivity && currentActivity.total_rounds > 1"
      >
        <div class="round-display">
          <span class="round-label">Ronde</span>
          <span class="round-numbers"
            >{{ currentRound }} / {{ currentActivity.total_rounds }}</span
          >
        </div>
        <div v-if="currentActivity.time_limit_per_round" class="timer-display">
          <span class="timer-value">{{ formatTime(timeRemaining) }}</span>
        </div>
      </div>

      <h2>Leaderboard</h2>
      <h2 v-if="currentActivity">{{ currentActivity.name }}</h2>
      <h2 v-else>-</h2>
    </div>
    <div v-if="!currentActivity" class="scorescreen-no-activity">
      <p>Geen activiteit geselecteerd</p>
      <p class="subtitle">Selecteer een activiteit in Sessie Beheren</p>
    </div>
    <div v-else class="scorescreen-content">
      <div class="scorescreen-content-header">
        <div class="scorescreen-content-header-left">
          <h2>#</h2>
          <h2>{{ headerTitle }}</h2>
        </div>
        <div
          class="scorescreen-content-header-right"
          :style="{ gap: headerRightGap }"
        >
          <h2 v-if="showTeamColumn">Team</h2>
          <h2>{{ scoreLabel }}</h2>
        </div>
      </div>
      <div class="scorescreen-content-results">
        <GenericResult
          v-for="(score, index) in rankedScores"
          :key="score.id || index"
          :rank="score.rank || index + 1"
          :player="score.displayName"
          :score="formatScore(score.points)"
          :emoji="score.emoji"
          :isSubItem="score.isSubItem"
          :teamName="score.teamName"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import GenericResult from "../../components/Generic/GenericResult.vue";
import { useApi } from "@/composables/useApi";
const { get } = useApi();

const currentActivity = ref(null);
const scores = ref([]);
const teams = ref([]);
const players = ref([]);
const activeSession = ref(null);
const lastUpdateCheck = ref(0);
const currentRound = ref(1);
const timeRemaining = ref(0);

let pollingInterval = null;
let timerInterval = null;

// Poll for active session and activity
const pollActiveSession = async () => {
  try {
    // Get active session
    const sessionData = await get('/api/v1/sessions');
    const activeSessions = (sessionData.sessions || sessionData || []).filter(
      (s) => s.status === 'active',
    );

    if (activeSessions.length === 0) {
      console.log("No active session found");
      currentActivity.value = null;
      activeSession.value = null;
      return;
    }

    const session = activeSessions[0];

    // Check if session changed
    if (!activeSession.value || activeSession.value.id !== session.id) {
      activeSession.value = session;
      console.log("✅ Active session:", session);
    }

    // Load activities for this session
    const activitiesData = await get(`/api/v1/sessions/${session.id}/activities`);
    const activities = activitiesData.activities || activitiesData || [];

    if (activities.length === 0) {
      console.log("No activities found");
      currentActivity.value = null;
      return;
    }

    // Check localStorage for selected activity
    const selectedActivityId = localStorage.getItem("selectedActivityId");
    const lastActivityUpdate = localStorage.getItem("lastActivityUpdate");

    let activityToShow = null;

    // If there's a selected activity in localStorage, use that
    if (selectedActivityId) {
      activityToShow = activities.find(
        (a) => a.id === parseInt(selectedActivityId),
      );
    }

    // Fallback to first activity if no selection or activity not found
    if (!activityToShow) {
      activityToShow = activities[0];
    }

    // Check if activity changed
    const activityChanged =
      !currentActivity.value ||
      currentActivity.value.activity_id !== activityToShow.id ||
      lastActivityUpdate !== lastUpdateCheck.value;

    if (activityChanged) {
      currentActivity.value = {
        activity_id: activityToShow.id,
        name: activityToShow.name,
        game_type: activityToShow.game_type,
        scoring_mode: activityToShow.scoring_mode,
        time_winner: activityToShow.time_winner,
        session_id: session.id,
        total_rounds: activityToShow.total_rounds || 1,
        time_limit_per_round: activityToShow.time_limit_per_round || null,
      };
      lastUpdateCheck.value = lastActivityUpdate;

      // Load round info from localStorage
      const storedRound = localStorage.getItem("currentRound");
      currentRound.value = storedRound ? parseInt(storedRound) : 1;

      // Set timer if activity has time limit
      if (activityToShow.time_limit_per_round) {
        timeRemaining.value = activityToShow.time_limit_per_round;
        startTimer();
      } else {
        stopTimer();
      }

      console.log(
        "✅ Activity selected:",
        currentActivity.value,
        "Round:",
        currentRound.value,
      );

      // Load data for this activity
      await loadActivityData(activityToShow.id, session.id);
    } else {
      // Update round info from localStorage
      const storedRound = localStorage.getItem("currentRound");
      if (storedRound && parseInt(storedRound) !== currentRound.value) {
        currentRound.value = parseInt(storedRound);
        // Reset timer for new round
        if (currentActivity.value.time_limit_per_round) {
          timeRemaining.value = currentActivity.value.time_limit_per_round;
        }
      }

      // Always refresh scores (even if activity is the same)
      await loadScores(currentActivity.value.activity_id);
    }
  } catch (error) {
    console.error("❌ Failed to poll active session:", error);
  }
};

// Load activity data
const loadActivityData = async (activityId, sessionId) => {
  try {
    // Load scores
    await loadScores(activityId);

    // Load teams
    const teamsData = await get(`/api/v1/sessions/${sessionId}/teams`);
    teams.value = teamsData.teams || teamsData || [];
    console.log('✅ Teams loaded:', teams.value);

    // Load all players
    players.value = [];
    for (const team of teams.value) {
      const playersData = await get(`/api/v1/sessions/${sessionId}/teams/${team.id}/players`);
      if (playersData.players) {
        players.value.push(
          ...playersData.players.map((p) => ({ ...p, team_id: team.id })),
        );
      }
    }
    console.log('✅ Players loaded:', players.value);

    console.log("✅ Activity data loaded");
  } catch (error) {
    console.error("❌ Failed to load activity data:", error);
  }
};

// Load scores only
const loadScores = async (activityId) => {
  try {
    const scoresData = await get(`/api/v1/activities/${activityId}/scores`);
    scores.value = scoresData.scores || scoresData || [];
  } catch (error) {
    console.error("❌ Failed to load scores:", error);
  }
};

// Header title based on scoring mode
const headerTitle = computed(() => {
  if (!currentActivity.value) return "Speler";

  const scoringMode = currentActivity.value.scoring_mode;
  if (scoringMode === "team") return "Teams";
  if (scoringMode === "player" || scoringMode === "team_with_players")
    return "Spelers";
  if (scoringMode === "team_player") return "Teams & Spelers";
  return "Deelnemers";
});

// Score label (Punten or Tijd)
const scoreLabel = computed(() => {
  if (!currentActivity.value) return "Punten";
  return currentActivity.value.game_type === "team_vs_time" ? "Tijd" : "Punten";
});

// Check if team vs time mode
const isTeamVsTime = computed(() => {
  return currentActivity.value?.game_type === "team_vs_time";
});

// Check if we should show team column
const showTeamColumn = computed(() => {
  // Show if team_player mode OR if any score has a teamName
  if (currentActivity.value?.scoring_mode === "team_player") return true;

  // Check if any score in rankedScores has a teamName
  return rankedScores.value.some((score) => score.teamName);
});

// Dynamic gap for header right section
const headerRightGap = computed(() => {
  return showTeamColumn.value ? "var(--space-8)" : "var(--space-3)";
});

// Ranked scores with aggregation
const rankedScores = computed(() => {
  if (!scores.value || scores.value.length === 0) {
    console.log("⚠️ No scores to display");
    return [];
  }

  const scoringMode = currentActivity.value?.scoring_mode;
  console.log("📊 Scoring mode:", scoringMode);
  console.log("📊 Raw Scores:", JSON.stringify(scores.value, null, 2));
  console.log("👥 Teams available:", JSON.stringify(teams.value, null, 2));
  console.log("🎮 Players available:", JSON.stringify(players.value, null, 2));

  // For team_player mode, we need hierarchical structure
  if (scoringMode === "team_player") {
    return buildTeamPlayerHierarchy();
  }

  // For other modes, use flat grouping
  return buildFlatGrouping(scoringMode);
});

// Build hierarchical structure for team_player mode
const buildTeamPlayerHierarchy = () => {
  const teamScores = {};

  // Group scores by team and player
  for (const score of scores.value) {
    const teamId = score.team_id;
    const playerId = score.player_id;

    // Initialize team if not exists
    if (!teamScores[teamId]) {
      const team = teams.value.find((t) => t.id === teamId);
      teamScores[teamId] = {
        id: `team_${teamId}`,
        teamId: teamId,
        teamName: team?.name || `Team ${teamId}`,
        teamIcon: team?.icon || "",
        totalPoints: 0,
        players: {},
      };
    }

    // Add to team total
    teamScores[teamId].totalPoints += score.points;

    // Group by player within team
    if (playerId) {
      if (!teamScores[teamId].players[playerId]) {
        const player = players.value.find((p) => p.id === playerId);
        teamScores[teamId].players[playerId] = {
          id: `player_${playerId}_team_${teamId}`,
          playerId: playerId,
          playerName: player?.name || `Speler ${playerId}`,
          playerIcon: player?.icon || player?.position || "",
          points: 0,
        };
      }
      teamScores[teamId].players[playerId].points += score.points;
    }
  }

  // Convert to array and sort teams
  const teamsArray = Object.values(teamScores);

  if (isTeamVsTime.value) {
    const timeWinner = currentActivity.value?.time_winner || "lower";
    teamsArray.sort((a, b) =>
      timeWinner === "lower"
        ? a.totalPoints - b.totalPoints
        : b.totalPoints - a.totalPoints,
    );
  } else {
    teamsArray.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Build flat array with teams and their players
  const result = [];
  let rankCounter = 1;

  for (const team of teamsArray) {
    // Add team row
    result.push({
      id: team.id,
      rank: rankCounter++,
      displayName: team.teamName,
      emoji: team.teamIcon,
      points: team.totalPoints,
      isTeam: true,
      isSubItem: false,
    });

    // Sort and add player rows
    const playersArray = Object.values(team.players);
    if (isTeamVsTime.value) {
      const timeWinner = currentActivity.value?.time_winner || "lower";
      playersArray.sort((a, b) =>
        timeWinner === "lower" ? a.points - b.points : b.points - a.points,
      );
    } else {
      playersArray.sort((a, b) => b.points - a.points);
    }

    for (const player of playersArray) {
      result.push({
        id: player.id,
        rank: "↳",
        displayName: player.playerName,
        emoji: player.playerIcon,
        teamName: team.teamName,
        points: player.points,
        isTeam: false,
        isSubItem: true,
      });
      console.log(`   → Player: ${player.playerName}, Team: ${team.teamName}`);
    }
  }

  console.log(
    "🏆 Hierarchical team_player results:",
    JSON.stringify(result, null, 2),
  );
  return result;
};

// Build flat grouping for other modes
const buildFlatGrouping = (scoringMode) => {
  const grouped = {};

  for (const score of scores.value) {
    let key;
    let displayName = "Unknown";
    let emoji = "";
    let teamName = "";

    // Determine scoring type based on scoring_mode and whether player_id exists
    const hasPlayerId =
      score.player_id !== null && score.player_id !== undefined;

    if (
      scoringMode === "team" ||
      (scoringMode === "team_with_players" && !hasPlayerId)
    ) {
      // Pure team scoring - group by team only
      key = `team_${score.team_id}`;
      const team = teams.value.find((t) => t.id === score.team_id);

      if (team) {
        displayName = team.name;
        emoji = team.icon || "";
        console.log(`✅ Team found: ID=${score.team_id}, Name=${displayName}`);
      } else {
        displayName = `Team ${score.team_id}`;
        console.log(`❌ Team NOT found: ID=${score.team_id}`);
      }

      console.log(
        `� Team score: key=${key}, name=${displayName}, points=${score.points}`,
      );
    } else if (
      scoringMode === "player" ||
      (scoringMode === "team_with_players" && hasPlayerId)
    ) {
      // Pure player scoring - group by player only
      key = `player_${score.player_id}_team_${score.team_id}`;
      const player = players.value.find((p) => p.id === score.player_id);
      const team = teams.value.find((t) => t.id === score.team_id);

      if (player) {
        displayName = player.name;
        emoji = player.icon || player.position || "";
        console.log(
          `✅ Player found: ID=${score.player_id}, Name=${displayName}`,
        );
      } else {
        displayName = `Speler ${score.player_id}`;
        console.log(`❌ Player NOT found: ID=${score.player_id}`);
      }

      // Add team name for players
      if (team) {
        teamName = team.name;
        console.log(`   → Team: ${teamName}`);
      }

      console.log(
        `🎮 Player score: key=${key}, name=${displayName}, team=${teamName}, points=${score.points}`,
      );
    }

    // Create or update grouped entry
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        displayName: displayName,
        emoji: emoji,
        teamName: teamName,
        points: 0,
        count: 0,
        isSubItem: false,
      };
      console.log(`🆕 Created new group: key=${key}, name=${displayName}`);
    } else {
      console.log(`➕ Adding to existing group: key=${key}`);
    }

    grouped[key].points += score.points;
    grouped[key].count++;
    console.log(
      `   → Total now: ${grouped[key].points} (from ${grouped[key].count} scores)`,
    );
  }

  // Convert to array
  const result = Object.values(grouped);
  console.log("📋 Final grouped results:", JSON.stringify(result, null, 2));

  // Sort based on game type
  if (isTeamVsTime.value) {
    // For time mode, lower is better (unless time_winner is 'higher')
    const timeWinner = currentActivity.value?.time_winner || "lower";
    result.sort((a, b) =>
      timeWinner === "lower" ? a.points - b.points : b.points - a.points,
    );
  } else {
    // For points mode, higher is better
    result.sort((a, b) => b.points - a.points);
  }

  console.log("🏆 Final sorted results:", result);
  return result;
};

// Format score (time or points)
const formatScore = (value) => {
  if (isTeamVsTime.value) {
    // Format as time mm:ss.ms
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const ms = value % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
  return value.toString();
};

// Format time for timer display (seconds to mm:ss)
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Start countdown timer
const startTimer = () => {
  stopTimer(); // Clear any existing timer

  timerInterval = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--;
    } else {
      stopTimer();
    }
  }, 1000);
};

// Stop timer
const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

onMounted(() => {
  // Initial load
  pollActiveSession();

  // Poll every 2 seconds for updates
  pollingInterval = setInterval(() => {
    pollActiveSession();
  }, 2000);

  console.log("✅ ScoreScreen polling started (every 2s)");
});

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    console.log("❌ ScoreScreen polling stopped");
  }

  stopTimer();
});
</script>
<style scoped>
.scorescreen-container {
  min-height: 100vh;
  background-color: var(--white);
}

.scorescreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-8) var(--space-6);
  border-bottom: 2px solid var(--gray-200);
}

.scorescreen-no-activity {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  text-align: center;
}

.scorescreen-no-activity p {
  font-size: var(--font-size-XL);
  color: var(--black-80);
  margin-bottom: var(--space-3);
}

.scorescreen-no-activity .subtitle {
  font-size: var(--font-size-L);
  color: var(--black-60);
}

.scorescreen-content {
  padding: var(--space-6);
}

.scorescreen-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-6);
  margin-bottom: var(--space-4);
}

.scorescreen-content-header-left {
  display: flex;
  gap: var(--space-10);
}

.scorescreen-content-header-right {
  display: flex;
  gap: var(--space-6);
}

.timer-round-info {
  display: flex;
  gap: var(--space-8);
  align-items: center;
  padding: var(--space-4) var(--space-6);
  background-color: var(--gray-100);
  border-radius: var(--border-radius-M);
  font-size: var(--font-size-XL);
  font-weight: 600;
}

.round-display {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--black-80);
}

.timer-display {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--primary);
  font-size: var(--font-size-XXL);
  font-weight: 700;
}

.scorescreen-content-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
