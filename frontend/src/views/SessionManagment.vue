<template>
  <div class="app-container">
    <div class="session-management-container">
      <div v-if="loading">
        <p>Sessie laden...</p>
      </div>
      <div v-else-if="!activeSession">
        <p>Geen actieve sessie gevonden.</p>
      </div>
      <div v-else>
        <div class="session-management-header">
          <h3><strong>Sessie</strong> Beheren - {{ activeSession.name }}</h3>
          <div class="session-management-header-buttons">
            <GenericButton
              label="Sessie beëindigen"
              variant="primary"
              style="background-color: var(--red-100)"
              @click="endSession"
            ></GenericButton>
            <GenericButton
              variant="quaternary"
              style="background-color: transparent"
            >
              <Settings style="color: var(--black-100)" />
            </GenericButton>
          </div>
        </div>

        <!-- Activity Selection Section -->
        <div class="activity-selection-section">
          <h4>Selecteer een activiteit</h4>
          <div v-if="activities.length === 0">
            <p>Geen activiteiten gevonden voor deze sessie.</p>
          </div>
          <div v-else class="activity-cards-container">
            <GenericActivityCard
              v-for="activity in activities"
              :key="activity.id"
              :title="activity.name"
              :activitiesCount="activity.total_rounds || 1"
              :teamsCount="teams.length"
              :isActive="selectedActivity?.id === activity.id"
              @select="selectActivity(activity)"
            />
          </div>
        </div>

        <!-- Round Management - Show when activity has multiple rounds -->
        <div
          v-if="selectedActivity && selectedActivity.total_rounds > 1"
          class="round-section"
        >
          <div class="round-info">
            <h4>
              Ronde {{ currentRound }} / {{ selectedActivity.total_rounds }}
            </h4>
            <div class="round-actions">
              <div
                v-if="selectedActivity.time_limit_per_round"
                class="timer-section"
              >
                <p>Tijd: {{ formatTime(timeRemaining) }}</p>
                <GenericButton
                  v-if="!timerRunning"
                  variant="primary"
                  @click="startRound"
                >
                  Start Ronde
                </GenericButton>
                <GenericButton v-else variant="secondary" @click="pauseRound">
                  Pauzeer
                </GenericButton>
              </div>
              <GenericButton
                v-if="currentRound < selectedActivity.total_rounds"
                variant="primary"
                @click="endRound"
                style="background-color: var(--orange-100)"
              >
                Ronde Beëindigen
              </GenericButton>
            </div>
          </div>
        </div>

        <!-- Team and Player Selection - Only show when activity is selected -->
        <div v-if="selectedActivity" class="dropdown-section">
          <GenericDropdown
            label="Selecteer een team"
            :options="teamOptions"
            placeholder="Selecteer een team"
            v-model="selectedTeamId"
          />
          <!-- Only show player dropdown if scoring_mode includes players -->
          <GenericDropdown
            v-if="shouldShowPlayerDropdown"
            label="Selecteer een speler"
            :options="playerOptions"
            placeholder="Selecteer een speler"
            v-model="selectedPlayerId"
          />
        </div>

        <!-- Score Section - Points or Time based on game_type -->
        <div v-if="selectedActivity" class="score-section">
          <!-- Points Input (for non team_vs_time) -->
          <div v-if="!isTeamVsTime" class="score-section-add-score">
            <FeatureCounter v-model="scoreValue" />
            <GenericButton
              label="Score toevoegen"
              variant="primary"
              @click="addScore"
              :disabled="!canAddScore"
            ></GenericButton>
          </div>

          <!-- Time Input (for team_vs_time) -->
          <div v-else class="time-input-section">
            <div class="time-inputs">
              <div class="time-input-group">
                <label>Minuten</label>
                <input
                  type="number"
                  v-model.number="timeMinutes"
                  min="0"
                  placeholder="0"
                />
              </div>
              <span class="time-separator">:</span>
              <div class="time-input-group">
                <label>Seconden</label>
                <input
                  type="number"
                  v-model.number="timeSeconds"
                  min="0"
                  max="59"
                  placeholder="0"
                />
              </div>
              <span class="time-separator">.</span>
              <div class="time-input-group">
                <label>MS</label>
                <input
                  type="number"
                  v-model.number="timeMs"
                  min="0"
                  max="999"
                  placeholder="0"
                />
              </div>
            </div>
            <GenericButton
              label="Tijd Opslaan"
              variant="primary"
              @click="addTimeScore"
              :disabled="!canAddScore"
            ></GenericButton>
          </div>

          <div class="score-section-fast-action">
            <h4>Snelle Acties</h4>
            <div class="score-section-fast-action-buttons">
              <GenericButton
                v-if="!isTeamVsTime"
                class="score-section-button"
                variant="primary"
                label="+5 Bonus"
                @click="addQuickScore(5)"
                :disabled="!selectedTeamId"
              />
              <GenericButton
                v-if="!isTeamVsTime"
                class="score-section-button"
                variant="primary"
                @click="addQuickScore(10)"
                :disabled="!selectedTeamId"
                ><Plus></Plus>10</GenericButton
              >
            </div>
          </div>
        </div>

        <!-- Score Overview - Only show when activity is selected -->
        <div
          v-if="selectedActivity && scores.length > 0"
          class="score-section-overview"
        >
          <div class="score-section-overview-list">
            <h4>Score Overzicht</h4>
            <div class="score-section-overview-list-items">
              <div class="score-header">
                <p>Team</p>
                <p
                  v-if="
                    selectedActivity.scoring_mode === 'team_player' ||
                    selectedActivity.scoring_mode === 'player' ||
                    selectedActivity.scoring_mode === 'team_with_players'
                  "
                >
                  Speler
                </p>
                <p>Score</p>
                <p>Ronde</p>
              </div>
              <div v-for="score in scores" :key="score.id" class="score-item">
                <p>{{ getTeamName(score.team_id) }}</p>
                <p
                  v-if="
                    selectedActivity.scoring_mode === 'team_player' ||
                    selectedActivity.scoring_mode === 'player' ||
                    selectedActivity.scoring_mode === 'team_with_players'
                  "
                >
                  {{ getPlayerName(score.player_id) }}
                </p>
                <p>{{ formatScoreDisplay(score.points) }}</p>
                <p>{{ score.round_number }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
defineOptions({ name: "SessieBeheren" });
import FeatureCounter from "../components/features/FeatureCounter.vue";
import GenericDropdown from "../components/Generic/GenericDropdown.vue";
import GenericButton from "../components/Generic/GenericButton.vue";
import GenericNav from "../components/Generic/GenericNav.vue";
import GenericActivityCard from "../components/Generic/GenericActivityCard.vue";
import { Settings } from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { ElNotification } from "element-plus";
import { Plus } from "lucide-vue-next";

const router = useRouter();
const { get } = useApi();

const loading = ref(true);
const activeSession = ref(null);
const activities = ref([]);
const teams = ref([]);
const selectedActivity = ref(null);
const selectedTeamId = ref(null);
const selectedPlayerId = ref(null);
const scoreValue = ref(0);
const scores = ref([]);
const currentRound = ref(1);
const timeRemaining = ref(0);
const timerRunning = ref(false);
let timerInterval = null;

// Time input for team_vs_time
const timeMinutes = ref(0);
const timeSeconds = ref(0);
const timeMs = ref(0);

// Check if activity is team_vs_time
const isTeamVsTime = computed(() => {
  return selectedActivity.value?.game_type === "team_vs_time";
});

// Should show player dropdown
const shouldShowPlayerDropdown = computed(() => {
  if (!selectedActivity.value) return false;
  return (
    selectedActivity.value.scoring_mode === "team_player" ||
    selectedActivity.value.scoring_mode === "player" ||
    selectedActivity.value.scoring_mode === "team_with_players"
  );
});

// Load active session and its data
const loadActiveSession = async () => {
  try {
    loading.value = true;

    // Get active session
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions`,
    );
    const data = await response.json();
    const activeSessions = data.sessions.filter((s) => s.status === "active");

    if (activeSessions.length === 0) {
      console.log("No active session found");
      loading.value = false;
      return;
    }

    activeSession.value = activeSessions[0];
    console.log("✅ Active session loaded:", activeSession.value);

    // Load activities for this session
    const activitiesData = await get(
      `/api/v1/sessions/${activeSession.value.id}/activities`,
    );
    activities.value = activitiesData.activities || activitiesData;
    console.log("✅ Activities loaded:", activities.value);

    // Load teams for this session
    const teamsData = await get(
      `/api/v1/sessions/${activeSession.value.id}/teams`,
    );
    teams.value = teamsData.teams || teamsData;
    console.log("✅ Teams loaded:", teams.value);

    // Load players for each team
    for (const team of teams.value) {
      try {
        const playersData = await get(
          `/api/v1/sessions/${activeSession.value.id}/teams/${team.id}/players`,
        );
        team.players = playersData.players || playersData;

        // Ensure players have the icon property (API might return it as icon, not emoji)
        if (team.players) {
          team.players = team.players.map((player) => ({
            ...player,
            icon: player.icon || player.emoji || "",
          }));
        }

        console.log(`✅ Players loaded for team ${team.name}:`, team.players);
      } catch (error) {
        console.error(`Failed to load players for team ${team.id}:`, error);
        team.players = [];
      }
    }

    // Auto-select first activity if available and none selected yet
    const storedActivityId = localStorage.getItem("selectedActivityId");
    if (activities.value.length > 0) {
      if (storedActivityId) {
        // Try to restore previously selected activity
        const storedActivity = activities.value.find(
          (a) => a.id === parseInt(storedActivityId),
        );
        if (storedActivity) {
          selectActivity(storedActivity);
        } else {
          // Fallback to first activity if stored one not found
          selectActivity(activities.value[0]);
        }
      } else {
        // Select first activity by default
        selectActivity(activities.value[0]);
      }
    }
  } catch (error) {
    console.error("❌ Failed to load active session:", error);
    ElNotification({
      title: "Fout",
      message: "Kon actieve sessie niet laden",
      type: "error",
    });
  } finally {
    loading.value = false;
  }
};

// Select activity
const selectActivity = (activity) => {
  selectedActivity.value = activity;
  selectedTeamId.value = null;
  selectedPlayerId.value = null;

  // Only reset round to 1 if this is a different activity
  // This preserves the round when switching between activities
  if (!selectedActivity.value || selectedActivity.value.id !== activity.id) {
    currentRound.value = 1;
  }

  // Set timer if activity has time limit
  if (activity.time_limit_per_round) {
    timeRemaining.value = activity.time_limit_per_round;
  }

  // Store selected activity in localStorage for ScoreScreen
  localStorage.setItem("selectedActivityId", activity.id.toString());
  localStorage.setItem("lastActivityUpdate", Date.now().toString());
  localStorage.setItem("currentRound", currentRound.value.toString());

  // Load scores for this activity
  loadActivityScores(activity.id);

  console.log(
    "✅ Activity selected:",
    activity.name,
    "Round:",
    currentRound.value,
  );
};

// Load scores for activity
const loadActivityScores = async (activityId) => {
  try {
    const scoresData = await get(`/api/v1/activities/${activityId}/scores`);
    scores.value = scoresData.scores || scoresData;
    console.log("✅ Scores loaded for activity", activityId, ":", scores.value);
    console.log("📊 Teams available:", teams.value);
  } catch (error) {
    console.error("Failed to load scores:", error);
    scores.value = [];
  }
};

// Team options for dropdown
const teamOptions = computed(() => {
  return teams.value.map((team) => ({
    label: `${team.name} ${team.icon || ""}`,
    value: team.id,
  }));
});

// Player options for dropdown
const playerOptions = computed(() => {
  if (!selectedTeamId.value) return [];

  const team = teams.value.find((t) => t.id === selectedTeamId.value);
  if (!team || !team.players) return [];

  return team.players.map((player) => ({
    label: `${player.name} ${player.icon || ""}`,
    value: player.id,
  }));
});

// Check if can add score
const canAddScore = computed(() => {
  if (!selectedActivity.value || !selectedTeamId.value) return false;

  // If scoring mode requires player, check if player is selected
  if (shouldShowPlayerDropdown.value) {
    return selectedPlayerId.value !== null;
  }

  return true;
});

// Add score (points)
const addScore = async () => {
  if (!canAddScore.value) {
    console.warn("⚠️ Cannot add score - requirements not met");
    return;
  }

  console.log("📝 Adding score:", {
    activity_id: selectedActivity.value.id,
    team_id: selectedTeamId.value,
    player_id: selectedPlayerId.value,
    points: scoreValue.value,
    round_number: currentRound.value,
  });

  try {
    const scoreData = {
      activity_id: selectedActivity.value.id,
      team_id: selectedTeamId.value,
      player_id: selectedPlayerId.value,
      points: scoreValue.value,
      round_number: currentRound.value,
    };

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/activities/${selectedActivity.value.id}/scores`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scoreData),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Score added successfully:", result);

    ElNotification({
      title: "Succes!",
      message: "Score toegevoegd!",
      type: "success",
    });

    // Reload scores
    await loadActivityScores(selectedActivity.value.id);

    // Update localStorage to trigger ScoreScreen refresh
    localStorage.setItem("lastScoreUpdate", Date.now().toString());

    // Reset form
    scoreValue.value = 0;
    selectedPlayerId.value = null;
  } catch (error) {
    console.error("❌ Failed to add score:", error);
    ElNotification({
      title: "Fout",
      message: "Kon score niet toevoegen",
      type: "error",
    });
  }
};

// Add time score (for team_vs_time)
const addTimeScore = async () => {
  if (!canAddScore.value) {
    console.warn("⚠️ Cannot add time - requirements not met");
    return;
  }

  try {
    // Convert time to milliseconds
    const totalMs =
      timeMinutes.value * 60 * 1000 + timeSeconds.value * 1000 + timeMs.value;

    console.log("⏱️ Adding time score:", {
      activity_id: selectedActivity.value.id,
      team_id: selectedTeamId.value,
      player_id: selectedPlayerId.value,
      time: `${timeMinutes.value}:${timeSeconds.value}.${timeMs.value}`,
      totalMs: totalMs,
      round_number: currentRound.value,
    });

    const scoreData = {
      activity_id: selectedActivity.value.id,
      team_id: selectedTeamId.value,
      player_id: selectedPlayerId.value,
      points: totalMs, // Store time as milliseconds in points field
      round_number: currentRound.value,
    };

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/activities/${selectedActivity.value.id}/scores`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scoreData),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Time score added successfully:", result);

    ElNotification({
      title: "Succes!",
      message: "Tijd toegevoegd!",
      type: "success",
    });

    // Reload scores
    await loadActivityScores(selectedActivity.value.id);

    // Update localStorage to trigger ScoreScreen refresh
    localStorage.setItem("lastScoreUpdate", Date.now().toString());

    // Reset form
    timeMinutes.value = 0;
    timeSeconds.value = 0;
    timeMs.value = 0;
    selectedPlayerId.value = null;
  } catch (error) {
    console.error("❌ Failed to add time:", error);
    ElNotification({
      title: "Fout",
      message: "Kon tijd niet toevoegen",
      type: "error",
    });
  }
};

// Add quick score
const addQuickScore = async (points) => {
  if (!selectedTeamId.value) return;

  scoreValue.value = points;
  await addScore();
};

// ... rest of functions remain the same ...

// Start round
const startRound = () => {
  timerRunning.value = true;

  timerInterval = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--;
    } else {
      pauseRound();
      ElNotification({
        title: "Tijd voorbij!",
        message: `Ronde ${currentRound.value} is afgelopen`,
        type: "info",
      });
    }
  }, 1000);
};

// Pause round
const pauseRound = () => {
  timerRunning.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// End round and go to next
const endRound = () => {
  if (currentRound.value < selectedActivity.value.total_rounds) {
    pauseRound();
    currentRound.value++;

    // Update localStorage for ScoreScreen
    localStorage.setItem("currentRound", currentRound.value.toString());
    localStorage.setItem("lastActivityUpdate", Date.now().toString());

    // Reset timer for next round
    if (selectedActivity.value.time_limit_per_round) {
      timeRemaining.value = selectedActivity.value.time_limit_per_round;
    }

    ElNotification({
      title: "Ronde beëindigd!",
      message: `Nu ronde ${currentRound.value} van ${selectedActivity.value.total_rounds}`,
      type: "success",
    });
  }
};

// Format time
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Get team name
const getTeamName = (teamId) => {
  const team = teams.value.find((t) => t.id === teamId);
  return team ? team.name : "Onbekend";
};

// Get player name
const getPlayerName = (playerId) => {
  if (!playerId) return "-";

  for (const team of teams.value) {
    if (team.players) {
      const player = team.players.find((p) => p.id === playerId);
      if (player) return player.name;
    }
  }
  return "Onbekend";
};

// Format score for display (time or points)
const formatScoreDisplay = (value) => {
  if (isTeamVsTime.value) {
    // Format as time mm:ss.ms
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const ms = value % 1000;
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
  return value.toString();
};

// End session and set status to completed in API
const endSession = async () => {
  if (!activeSession.value) return;

  try {
    // Update session status to 'completed' in API
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${activeSession.value.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("✅ Session status updated to completed");

    // Clear localStorage for ScoreScreen
    localStorage.removeItem("selectedActivityId");
    localStorage.removeItem("lastActivityUpdate");
    localStorage.removeItem("lastScoreUpdate");
    localStorage.removeItem("currentRound");

    ElNotification({
      title: "Succes!",
      message: "Sessie beëindigd en opgeslagen in geschiedenis!",
      type: "success",
    });

    // Navigate to history
    router.push({ name: "geschiedenis" });
  } catch (error) {
    console.error("Failed to end session:", error);
    ElNotification({
      title: "Fout",
      message: "Kon sessie niet beëindigen",
      type: "error",
    });
  }
};

onMounted(() => {
  loadActiveSession();
});

onUnmounted(() => {
  // Clean up timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>
<style scoped>
.session-management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.session-management-header-buttons {
  display: flex;
  gap: var(--space-6);
}

.activity-selection-section {
  margin-bottom: var(--space-7);
  position: relative;
}

.activity-selection-section h4 {
  margin-bottom: var(--space-5);
}

.activity-cards-container {
  display: flex;
  gap: var(--space-5);
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: var(--space-4);
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--blue-40) var(--black-20);
}

.activity-cards-container::-webkit-scrollbar {
  height: 0.5rem;
}

.activity-cards-container::-webkit-scrollbar-track {
  background: var(--black-20);
  border-radius: var(--radius-S);
}

.activity-cards-container::-webkit-scrollbar-thumb {
  background: var(--blue-40);
  border-radius: var(--radius-S);
  transition: background 0.2s ease;
}

.activity-cards-container::-webkit-scrollbar-thumb:hover {
  background: var(--blue-100);
}

.round-section {
  margin-bottom: var(--space-6);
  padding: var(--space-5);
  background-color: var(--blue-20);
  border-radius: var(--radius-M);
}

.round-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.round-actions {
  display: flex;
  gap: var(--space-5);
  align-items: center;
}

.timer-section {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.timer-section p {
  font-size: var(--font-size-XL);
  font-weight: 600;
  color: var(--blue-100);
}

.dropdown-section {
  display: flex;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.score-section {
  display: flex;
  align-items: flex-end;
  margin-top: var(--space-7);
  gap: var(--space-5);
  justify-content: space-between;
}

.score-section-add-score {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  flex: 1;
}

.time-input-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  flex: 1;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--blue-20);
  border-radius: var(--radius-M);
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.time-input-group label {
  font-size: var(--font-size-S);
  font-weight: 600;
  color: var(--black-80);
}

.time-input-group input {
  width: 4rem;
  padding: var(--space-3);
  border: 1px solid var(--black-40);
  border-radius: var(--radius-S);
  font-size: var(--font-size-M);
  text-align: center;
}

.time-separator {
  font-size: var(--font-size-XL);
  font-weight: 600;
  color: var(--blue-100);
  margin-top: 1.5rem;
}

.score-section-fast-action {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.score-section-fast-action h4 {
  height: 2.8125rem;
  text-align: end;
}

.score-section-fast-action-buttons {
  display: flex;
  gap: var(--space-3);
}

.score-section-button :deep(button) {
  flex-direction: row;
  white-space: nowrap;
}

.score-section-button :deep(svg) {
  display: none;
}

.score-section-overview {
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
  margin-top: var(--space-6);
  background-color: var(--black-20);
  border-radius: var(--radius-M);
}

.score-section-overview-list {
  width: 100%;
}

.score-section-overview-list h4 {
  margin-bottom: var(--space-4);
}

.score-section-overview-list-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.score-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr;
  gap: var(--space-3);
  font-weight: 600;
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--black-40);
}

.score-item {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr;
  gap: var(--space-3);
  padding: var(--space-3);
  background-color: var(--white);
  border-radius: var(--radius-S);
}

h3 {
  margin-top: var(--space-5);
  margin-bottom: var(--space-7);
}

.layout-session-managment {
  width: 100%;
  height: 100%;
}

@media (width <= 28.125rem) {
  .dropdown-section {
    flex-direction: column;
  }

  .score-section {
    flex-direction: column;
    align-items: stretch;
  }

  .score-header,
  .score-item {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    font-size: var(--font-size-S);
  }
}

.session-management-container {
  display: flex;
  max-width: 50rem;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: var(--space-5) var(--space-6);
}
</style>
