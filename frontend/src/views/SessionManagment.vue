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
            <GenericModel
              ref="endModal"
              :message="`Weet je zeker dat je de sessie '${activeSession?.name || 'deze sessie'}' wilt beëindigen?`"
              icon="triangle-alert"
              iconColor="var(--red-100)"
              confirmText="Ja"
              cancelText="Nee"
              :showCancel="true"
              @confirm="confirmEndSession"
              @cancel="cancelEnd"
            />
          </div>
        </div>

        <!-- Activity Selection Section -->
        <div class="activity-selection-section">
          <h4>Selecteer een activiteit</h4>
          <div v-if="activities.length === 0">
            <p>Geen activiteiten gevonden voor deze sessie.</p>
          </div>
          <div v-else class="activity-cards-container">
            <div v-for="activity in activities" :key="activity.id" class="activity-card-with-controls">
              <GenericActivityCard
                :title="activity.name"
                :activitiesCount="activity.total_rounds || 1"
                :teamsCount="teams.length"
                :isActive="selectedActivity?.id === activity.id"
                @select="selectActivity(activity)"
              />
              <div class="activity-card-controls">
                <!-- vote info intentionally hidden for implicit voting UX -->
              </div>
            </div>
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
            <FeatureCounter v-model="scoreValue" :min="-9999" />
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

          <div v-if="!isTeamVsTime" class="score-section-fast-action">
            <div class="score-section-fast-action-header">
              <h4>Snelle Acties</h4>
              <GenericButton
                class="manage-actions-button"
                variant="quaternary"
                label="Beheer acties"
                @click="toggleQuickActionsModal"
              />
            </div>

            <div class="score-section-fast-action-buttons">
              <GenericButton
                v-for="action in quickActions"
                :key="action.id"
                v-if="!isTeamVsTime"
                class="score-section-button"
                variant="primary"
                :label="action.label"
                @click="addQuickScore(action)"
                :disabled="!selectedTeamId"
              />
            </div>

            <!-- Quick actions modal -->
            <div v-if="quickActionsModalOpen" class="quick-actions-modal-overlay" @click.self="toggleQuickActionsModal">
              <div class="quick-actions-modal">
                <h3>Beheer Snelle Acties</h3>
                <div class="quick-actions-list">
                  <div v-for="q in quickActions" :key="q.id" class="quick-action-row">
                    <input class="qa-label" v-model="q.label" />
                    <input class="qa-points" type="number" v-model.number="q.points" />
                    <GenericButton class="qa-save" variant="primary" @click="editQuickAction(q.id, q.label, q.points)" label="Opslaan" />
                    <GenericButton class="qa-delete" variant="danger" @click="removeQuickAction(q.id)" label="Verwijder" />
                  </div>
                </div>
                <div class="quick-action-add">
                  <input placeholder="Label (bijv. Penalty -2)" v-model="newQuickLabel" />
                  <input type="number" placeholder="Punten (bv -2)" v-model.number="newQuickPoints" />
                  <GenericButton class="qa-add" variant="primary" @click="addQuickAction" label="Voeg toe" />
                </div>
                <div class="quick-actions-modal-actions">
                  <GenericButton class="qa-close" variant="quaternary" @click="toggleQuickActionsModal" label="Sluit" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Score Overview - Aggregated view (players or teams) -->
        <div
          v-if="selectedActivity && scores.length > 0"
          class="score-section-overview"
        >
          <div class="score-section-overview-list">
            <h4>Score Overzicht</h4>
            <div class="score-section-overview-list-items">
              <div class="score-header">
                <p>Team</p>
                <p v-if="activityHasPlayers">Speler</p>
                <p>Score</p>
                <p>Ronde</p>
              </div>

              <!-- Player-based aggregation -->
              <div
                v-if="activityHasPlayers"
                v-for="player in playerScores"
                :key="`player-${player.player_id}`"
                class="score-item"
              >
                <p>{{ player.team_name }}</p>
                <p>{{ player.player_name }}</p>
                <p>{{ formatScoreDisplay(player.total_points) }}</p>
                <p>{{ player.latest_round }}</p>
              </div>

              <!-- Team-based aggregation (for activities without players) -->
              <div
                v-else
                v-for="team in teamScores"
                :key="`team-${team.team_id}`"
                class="score-item"
              >
                <p>{{ team.team_name }}</p>
                <p v-if="activityHasPlayers">{{ team.player_name }}</p>
                <p>{{ formatScoreDisplay(team.total_points) }}</p>
                <p>{{ team.latest_round }}</p>
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
import GenericModel from "@/components/Generic/GenericModel.vue";
import { useApi } from "@/composables/useApi";
import { useSessions } from "@/composables/useSessions";
import { ElNotification } from "element-plus";
import { Plus } from "lucide-vue-next";

const router = useRouter();
const { get, post } = useApi();
const { updateSession } = useSessions();

const loading = ref(true);
const activeSession = ref(null);
const activities = ref([]);
const teams = ref([]);
const selectedActivity = ref(null);
const selectedTeamId = ref(null);
const selectedPlayerId = ref(null);
const scoreValue = ref(0);
const lastQuickReason = ref(null);

// Quick actions (configurable), persist in localStorage
const QUICK_ACTIONS_KEY = 'quickActions';
const quickActions = ref([]);
const quickActionsModalOpen = ref(false);
const newQuickLabel = ref('');
const newQuickPoints = ref(0);

const loadQuickActions = () => {
  try {
    const raw = localStorage.getItem(QUICK_ACTIONS_KEY);
    if (raw) {
      quickActions.value = JSON.parse(raw);
    } else {
      // sensible defaults
      quickActions.value = [
        { id: Date.now() + 1, label: '+5 Bonus', points: 5 },
        { id: Date.now() + 2, label: '+10 Bonus', points: 10 },
      ];
      localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(quickActions.value));
    }
  } catch (e) {
    console.warn('Failed to load quick actions, using defaults', e);
    quickActions.value = [ { id: 1, label: '+5 Bonus', points: 5 }, { id: 2, label: '+10 Bonus', points: 10 }];
  }
};

const saveQuickActions = () => {
  try {
    localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(quickActions.value));
  } catch (e) {
    console.warn('Failed to save quick actions', e);
  }
};

const addQuickAction = () => {
  const label = (newQuickLabel.value || '').trim();
  const pts = Number(newQuickPoints.value);
  if (!label) return;
  quickActions.value.push({ id: Date.now(), label, points: pts });
  newQuickLabel.value = '';
  newQuickPoints.value = 0;
  saveQuickActions();
};

const removeQuickAction = (id) => {
  quickActions.value = quickActions.value.filter((q) => q.id !== id);
  saveQuickActions();
};

const editQuickAction = (id, label, points) => {
  const i = quickActions.value.findIndex((q) => q.id === id);
  if (i === -1) return;
  quickActions.value[i] = { id, label, points: Number(points) };
  saveQuickActions();
};

const toggleQuickActionsModal = () => {
  quickActionsModalOpen.value = !quickActionsModalOpen.value;
};

// Voting: handle cast vote from player/admin clients
import { voteActivity } from '@/composables/usePlayerActions';
import { useSocket } from '@/composables/useSocket';

let socket = null;
const initVoteListeners = () => {
  try {
    const s = useSocket();
    try { s.connect(); } catch (_) {}
    socket = s;
    s.on('activity_vote_update', (payload) => {
      try {
        const p = payload || {};
        if (!p || !p.session_id) return;
        if (!activeSession.value || String(activeSession.value.id) !== String(p.session_id)) return;
        voteCounts.value = p.counts || {};
        leaderActivityId.value = p.leader || null;
        console.log('SessionManagment: received activity_vote_update', p);
      } catch (e) {
        console.warn('activity_vote_update handler failed:', e);
      }
    });
  } catch (e) {
    console.warn('Failed to init vote listeners:', e);
  }
};

const voteForActivity = async (activity) => {
  if (!activeSession.value) return;
  try {
    const res = await voteActivity(activeSession.value.id, activity.id);
    if (res && res.success) {
      ElNotification({ title: 'Stem bekend', message: `Je stem voor ${activity.name} is ontvangen`, type: 'success' });
    } else {
      ElNotification({ title: 'Stem mislukt', message: `Kon niet stemmen: ${res && res.error ? res.error : 'Onbekende fout'}`, type: 'warning' });
    }
  } catch (e) {
    console.warn('voteForActivity failed:', e);
    ElNotification({ title: 'Stem mislukt', message: 'Kon niet stemmen', type: 'warning' });
  }
};

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

// Helper to determine if an activity supports players (teams, teams with players, or players only)
const activityHasPlayers = computed(() => {
  if (!selectedActivity.value) return false;
  const mode = String(selectedActivity.value.scoring_mode || "").toLowerCase();
  return mode === "player" || mode === "team_with_players" || mode === "team_player";
});

// Should show player dropdown
const shouldShowPlayerDropdown = computed(() => {
  return activityHasPlayers.value;
});

// Load active session and its data
const voteCounts = ref({});
const leaderActivityId = ref(null);

const loadVotes = async () => {
  try {
    if (!activeSession.value) return;
    const v = await get(`/api/v1/sessions/${activeSession.value.id}/votes`);
    voteCounts.value = v.counts || {};
    leaderActivityId.value = v.leader || null;
  } catch (e) {
    console.warn('Failed to load votes:', e);
  }
};

const loadActiveSession = async () => {
  try {
    loading.value = true;

    // Get active session (use composable get so we hit relative /api when VITE_API_URL is not set)
    const data = await get('/api/v1/sessions');
    const allSessions = data.sessions || data || [];
    const activeSessions = (allSessions || []).filter((s) => s.status === 'active');

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
    await loadVotes();

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
      } catch (e) {
        console.warn('Failed to load players for team', team.id, e);
      }
    }

    // Init vote listeners once we have session context
    initVoteListeners();

    loading.value = false;

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

  // Cast a vote automatically when an activity is selected (implicit voting UX)
  try {
    voteForActivity(activity);
  } catch (e) {
    console.warn('Auto-vote on select failed:', e);
  }
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

    // If a quick-action provided a label/reason (e.g., "Penalty -2"), include it
    if (lastQuickReason.value) {
      scoreData.reason = lastQuickReason.value;
    }

    const result = await post(`/api/v1/activities/${selectedActivity.value.id}/scores`, scoreData);

    // Clear quick reason after posting
    lastQuickReason.value = null;
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
    // Close quick-actions modal if open (optional UX)
    // leave quickActionsModalOpen as-is so user can continue editing
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

    const result = await post(`/api/v1/activities/${selectedActivity.value.id}/scores`, scoreData);
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
// Accept either a numeric points value or a quick-action object ({label, points})
const addQuickScore = async (action) => {
  if (!selectedTeamId.value) return;

  if (typeof action === 'number') {
    scoreValue.value = action;
    lastQuickReason.value = null;
  } else if (action && typeof action === 'object') {
    scoreValue.value = Number(action.points || 0);
    lastQuickReason.value = action.label || null;
  }

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

// Aggregated player scores (sum of points per player) and latest round
const playerScores = computed(() => {
  if (!scores.value || scores.value.length === 0) return [];

  const map = new Map();

  for (const s of scores.value) {
    const pid = s.player_id;
    if (!pid) continue; // skip scores without player association

    const existing = map.get(pid) || { player_id: pid, player_name: getPlayerName(pid), team_id: s.team_id, team_name: getTeamName(s.team_id), total_points: 0, latest_round: 0 };
    existing.total_points += Number(s.points || 0);
    if (s.round_number && s.round_number > existing.latest_round) existing.latest_round = s.round_number;
    map.set(pid, existing);
  }

  // Convert to array and sort (higher scores first unless time mode where lower is better)
  const arr = Array.from(map.values());
  arr.sort((a, b) => (isTeamVsTime.value ? a.total_points - b.total_points : b.total_points - a.total_points));
  return arr;
});

// Aggregated team scores (when activity has no players)
const teamScores = computed(() => {
  if (!scores.value || scores.value.length === 0) return [];

  const map = new Map();

  for (const s of scores.value) {
    const tid = s.team_id;
    const existing = map.get(tid) || { team_id: tid, team_name: getTeamName(tid), total_points: 0, latest_round: 0 };
    existing.total_points += Number(s.points || 0);
    if (s.round_number && s.round_number > existing.latest_round) existing.latest_round = s.round_number;
    map.set(tid, existing);
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => (isTeamVsTime.value ? a.total_points - b.total_points : b.total_points - a.total_points));
  return arr;
});

// End session - open confirmation modal
const endSession = async () => {
  if (!activeSession.value) return;
  endModal.value?.open();
};

// Confirmed end session - actually call API
const endModal = ref(null);
const confirmEndSession = async () => {
  if (!activeSession.value) return;
  try {
    // Use composable updateSession for abstraction and to avoid direct put usage
    await updateSession(activeSession.value.id, { status: 'completed' });

    console.log('✅ Session status updated to completed');

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
      message: "Kon sessie niet beëindigen: " + (error.message || ""),
      type: "error",
    });
  }
};

const cancelEnd = () => {
  console.log('Sessie beëindigen geannuleerd');
  endModal.value?.close();
};

onMounted(() => {
  loadActiveSession();
  loadQuickActions();
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

.score-section-fast-action-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.score-section-fast-action h4 {
  margin: 0;
  font-size: var(--font-size-M);
  font-weight: 700;
}

.manage-actions-button {
  min-width: 120px;
  padding: 0.35rem 0.6rem;
  font-size: var(--font-size-S);
}

.score-section-fast-action-buttons {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
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
  padding-bottom: var(--space-8);
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

.quick-actions-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.quick-actions-modal {
  width: 560px;
  max-width: 92vw;
  background: var(--white);
  padding: var(--space-6);
  border-radius: var(--radius-M);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}
.quick-actions-list { max-height: 240px; overflow: auto; margin-bottom: var(--space-4); }
.quick-action-row { display:flex; gap:8px; align-items:center; margin-bottom:8px }
.quick-action-row .qa-label { flex:1; padding:8px; border:1px solid var(--black-10); border-radius:4px }
.quick-action-row .qa-points { width:100px; padding:8px; border:1px solid var(--black-10); border-radius:4px }
.quick-action-row .generic-button, .quick-action-add .generic-button, .quick-actions-modal-actions .generic-button { margin-left:6px; padding: 0.35rem 0.6rem; font-size: var(--font-size-S); min-width: 84px; } /* use GenericButton styles to keep visual consistency */
.quick-action-add { display:flex; gap:8px; align-items:center }
.quick-action-add input { padding:8px; border:1px solid var(--black-10); border-radius:4px }
.quick-actions-modal-actions { display:flex; justify-content:flex-end; margin-top: var(--space-4) }

.activity-card-with-controls {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}
.activity-card-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}
.vote-info {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.vote-count {
  display: none !important; /* hidden: implicit voting UX */
  background: var(--blue-10);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-S);
  font-weight: 600;
}
.leader-badge {
  background: var(--green-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-S);
  color: white;
  font-size: 0.8rem;
}
.vote-button {
  width: 6rem;
}
</style>
