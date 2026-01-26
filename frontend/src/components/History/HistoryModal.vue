<template>
  <div v-if="modelValue" class="history-modal-overlay" @click.self="close">
    <div class="history-modal">
      <div class="history-modal-header">
        <div>
          <h3>{{ session.name }}</h3>
          <p class="muted">{{ formatDate(session.completed_at || session.created_at) }}</p>
        </div>
        <div class="modal-actions">
          <GenericButton class="btn-export" variant="secondary" @click="exportSession">Exporteer sessie</GenericButton>
          <GenericButton class="btn-close" variant="quaternary" @click="close" title="Sluiten">✕</GenericButton>
        </div>
      </div>

      <div class="history-modal-body">
        <div class="session-summary">
          <div class="detail-box">
            <label>Teams</label>
            <value>{{ (session.teams || []).length }} {{ ((session.teams || []).length === 1) ? 'team' : 'teams' }}</value>
          </div>
          <div class="detail-box">
            <label>Activiteiten</label>
            <value>{{ (session.activities || []).length }} {{ ((session.activities || []).length === 1) ? 'activiteit' : 'activiteiten' }}</value>
          </div>
          <div class="detail-box">
            <label>Spelers</label>
            <value>{{ playerCount }} {{ (playerCount === 1) ? 'speler' : 'spelers' }}</value>
          </div>
        </div>

        <div class="activity-selector">
          <label for="modal-activity-select">Selecteer activiteit om scores te bekijken:</label>
          <GenericDropdown
            id="modal-activity-select"
            v-model="selectedActivityId"
            :options="activityOptions"
            placeholder="-- Kies een activiteit --"
          />
        </div>

        <div class="scores-display" v-if="selectedActivity">
          <div v-if="modalAccordions.length === 0" class="no-scores">Geen scores beschikbaar.</div>
          <div v-else>
            <GenericAccordion
              v-for="acc in modalAccordions"
              :key="acc.teamId"
              :title="acc.title"
              :items="acc.items"
            />
          </div>
        </div>

        <div v-else class="no-selection">Selecteer een activiteit om scores te bekijken.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from "vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericAccordion from "@/components/Generic/GenericAccordion.vue";
import { useApi } from '@/composables/useApi';

const activityOptions = computed(() => {
  return (internalSession.value.activities || []).map(a => ({ label: a.name, value: a.id }));
});

const hasPlayers = computed(() => {
  return (internalSession.value.teams || []).some(t => (t.players || []).length > 0);
});

const modalAccordions = computed(() => {
  const accs = [];
  const activity = selectedActivity.value;
  if (!activity) return accs;
  const scores = activity.scores || [];
  if (!scores || scores.length === 0) return accs;

  if (hasPlayers.value) {
    // teams with players
    for (const team of internalSession.value.teams || []) {
      const teamPlayers = team.players || [];
      const playerScores = [];
      for (const p of teamPlayers) {
        const playerScoreData = scores.filter(s => String(s.player_id) === String(p.id) && String(s.team_id) === String(team.id));
        if (playerScoreData.length > 0) {
          const totalScore = playerScoreData.reduce((sum, sc) => sum + (sc.points || sc.score || 0), 0);
          playerScores.push({ player_name: p.name, score: totalScore });
        }
      }
      if (playerScores.length > 0) {
        accs.push({ teamId: team.id, title: `${team.icon || ''} ${team.name}`, items: playerScores.map(p => ({ team: p.player_name, punten: p.score })) });
      }
    }
  } else {
    // teams only
    for (const team of internalSession.value.teams || []) {
      const teamScoreData = scores.filter(s => String(s.team_id) === String(team.id));
      if (teamScoreData.length > 0) {
        const totalScore = teamScoreData.reduce((sum, sc) => sum + (sc.points || sc.score || 0), 0);
        accs.push({ teamId: team.id, title: `${team.icon || ''} ${team.name}`, items: [{ team: 'Totaal punten', punten: totalScore }] });
      }
    }
  }

  return accs;
});

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  session: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue"]);

const api = useApi();

const internalSession = ref(JSON.parse(JSON.stringify(props.session || {})));
const loadingSession = ref(false);
const selectedActivityId = ref("");
const scoresList = ref([]);
const selectedActivity = computed(() => {
  return (internalSession.value.activities || []).find((a) => String(a.id) === String(selectedActivityId.value)) || null;
});

watch(() => props.session, async (s) => {
  internalSession.value = JSON.parse(JSON.stringify(s || {}));
  // ensure we have teams/activities loaded
  await ensureSessionLoaded(internalSession.value);
});

async function ensureSessionLoaded(session) {
  if (!session || !session.id) return;
  loadingSession.value = true;
  try {
    if (!session.teams || !session.teams.length) {
      const teamsRes = await api.get(`/api/v1/sessions/${session.id}/teams`);
      session.teams = teamsRes.teams || teamsRes || [];
    }
    // ensure players for each team
    for (const team of (session.teams || [])) {
      if (!team.players || !team.players.length) {
        try {
          const p = await api.get(`/api/v1/sessions/${session.id}/teams/${team.id}/players`);
          team.players = p.players || p || [];
        } catch (e) {
          team.players = [];
        }
      }
    }
    if (!session.activities || !session.activities.length) {
      const acts = await api.get(`/api/v1/sessions/${session.id}/activities`);
      session.activities = acts.activities || acts || [];
    }
  } catch (e) {
    console.warn('Failed to ensure session loaded for modal', e);
  } finally {
    loadingSession.value = false;
  }
}

const playerCount = computed(() => {
  const teams = internalSession.value.teams || [];
  let count = 0;
  teams.forEach((t) => (count += (t.players || []).length));
  return count;
});

function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

watch(selectedActivity, async () => {
  await fetchActivityScores();
  computeScoresFromData();
});

async function fetchActivityScores() {
  scoresList.value = [];
  if (!selectedActivity.value) return;
  const activity = selectedActivity.value;
  if (activity.scores && activity.scores.length) {
    scoresList.value = activity.scores;
    return;
  }
  try {
    const res = await api.get(`/api/v1/activities/${activity.id}/scores`);
    const sc = res.scores || res || [];
    scoresList.value = sc;
    activity.scores = sc;
  } catch (e) {
    console.warn('Failed to load activity scores', e);
    scoresList.value = [];
  }
}

function close() {
  emit("update:modelValue", false);
  selectedActivityId.value = "";
  scoresList.value = [];
}

function onActivityChange() {
  // computeScores will run via watcher
}

function exportSession() {
  try {
    const payload = {
      session: internalSession.value,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${internalSession.value.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Export failed:", e);
  }
}

function parseScore(raw, isTimeMode) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    // parse mm:ss.xxx or m:ss.xxx or 0:00.067
    const parts = raw.split(":");
    if (parts.length > 1) {
      const minutes = parseInt(parts[0], 10) || 0;
      const secondsParts = parts[1].split(".");
      const seconds = parseInt(secondsParts[0], 10) || 0;
      const ms = secondsParts[1] ? Math.round(Number("0." + secondsParts[1]) * 1000) : 0;
      return Math.abs(minutes * 60 * 1000 + seconds * 1000 + ms);
    }
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.abs(n);
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (isTimeMode && !Number.isInteger(num)) {
    return Math.abs(Math.round(num * 1000));
  }
  return Math.abs(num);
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return "0:00.000";
  const sign = ms < 0 ? "-" : "";
  ms = Math.abs(ms);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const remainder = ms % 1000;
  const pad = (n, z = 2) => String(n).padStart(z, "0");
  return `${sign}${minutes}:${pad(seconds)}.${pad(remainder, 3)}`;
}

function computeScoresFromData() {
  scoresList.value = [];
  if (!selectedActivity.value) return;
  const activity = selectedActivity.value;
  const scores = activity.scores || [];
  const scoringMode = (activity.scoring_mode || "team").toLowerCase();
  const isTimeMode = String(activity.game_type) === "team_vs_time";
  const lowerIsBetter = (activity.lower_is_better === true) || (activity.lower_is_better === "true");

  if (scores.length === 0) {
    scoresList.value = [];
    return;
  }

  if (scoringMode === "player") {
    const map = {};
    for (const s of scores) {
      const playerId = s.player_id;
      const raw = s.points ?? s.score ?? s.total_score;
      const parsed = parseScore(raw, isTimeMode);
      if (parsed === null) continue;
      if (lowerIsBetter && parsed === 0) continue;
      if (!playerId) continue;
      const name = findPlayerName(playerId) || `Speler ${playerId}`;
      if (!map[playerId]) map[playerId] = { id: playerId, name, score: parsed };
      else {
        if (lowerIsBetter) map[playerId].score = Math.min(map[playerId].score, parsed);
        else map[playerId].score = Math.max(map[playerId].score, parsed);
      }
    }
    const arr = Object.values(map).sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);
    scoresList.value = arr;
    return;
  }

  if (scoringMode === "team_with_players") {
    const teams = {};
    for (const s of scores) {
      const teamId = s.team_id || resolveTeamForPlayer(s.player_id);
      if (!teamId) continue;
      const raw = s.points ?? s.score ?? s.total_score;
      const parsed = parseScore(raw, isTimeMode);
      if (parsed === null) continue;
      if (lowerIsBetter && parsed === 0) continue;
      if (!teams[teamId]) {
        teams[teamId] = { id: teamId, name: findTeamName(teamId) || `Team ${teamId}`, score: parsed, players: {} };
      }

      // team score = best per team
      if (lowerIsBetter) teams[teamId].score = Math.min(teams[teamId].score, parsed);
      else teams[teamId].score = Math.max(teams[teamId].score, parsed);

      if (s.player_id) {
        const pname = findPlayerName(s.player_id) || `Speler ${s.player_id}`;
        if (!teams[teamId].players[s.player_id]) teams[teamId].players[s.player_id] = { id: s.player_id, name: pname, score: parsed };
        else {
          if (lowerIsBetter) teams[teamId].players[s.player_id].score = Math.min(teams[teamId].players[s.player_id].score, parsed);
          else teams[teamId].players[s.player_id].score = Math.max(teams[teamId].players[s.player_id].score, parsed);
        }
      }
    }
    const arr = Object.values(teams).sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);
    scoresList.value = arr;
    return;
  }

  // default team scoring
  {
    const teams = {};
    for (const s of scores) {
      const teamId = s.team_id || resolveTeamForPlayer(s.player_id);
      if (!teamId) continue;
      const raw = s.points ?? s.score ?? s.total_score;
      const parsed = parseScore(raw, isTimeMode);
      if (parsed === null) continue;
      if (lowerIsBetter && parsed === 0) continue;
      if (!teams[teamId]) teams[teamId] = { id: teamId, name: findTeamName(teamId) || `Team ${teamId}`, score: parsed };
      else {
        if (lowerIsBetter) teams[teamId].score = Math.min(teams[teamId].score, parsed);
        else teams[teamId].score = Math.max(teams[teamId].score, parsed);
      }
    }
    const arr = Object.values(teams).sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);
    scoresList.value = arr;
  }
}

function resolveTeamForPlayer(playerId) {
  if (!playerId) return null;
  for (const t of props.session.teams || []) {
    if ((t.players || []).find((p) => String(p.id) == String(playerId))) return t.id;
  }
  return null;
}

function findTeamName(teamId) {
  const t = (props.session.teams || []).find((x) => String(x.id) == String(teamId));
  return t ? (t.name || `Team ${teamId}`) : null;
}

function findPlayerName(playerId) {
  for (const t of props.session.teams || []) {
    const p = (t.players || []).find((x) => String(x.id) == String(playerId));
    if (p) return p.name;
  }
  return null;
}

function sortedPlayers(playersObj) {
  const arr = Object.values(playersObj || {});
  const activity = selectedActivity.value;
  const lowerIsBetter = (activity && activity.lower_is_better === true) || (activity && activity.lower_is_better === "true");
  return arr.sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);
}
</script>

<style scoped>
.history-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--background-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}
.history-modal {
  width: min(720px, 96%);
  max-height: 80vh;
  overflow-y: auto;
  background: var(--white);
  border-radius: var(--radius-L);
  padding: var(--space-6);
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  position: relative;
}
.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
}
.modal-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-close {
  padding: 6px 8px;
  min-width: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.history-modal-body {
  margin-top: var(--space-5);
}
.session-summary {
  display: flex;
  gap: var(--space-4);
}
.detail-box {
  background: var(--background-color);
  padding: 12px 16px;
  border-radius: 8px;
  min-width: 120px;
}
.activity-selector {
  margin-top: var(--space-4);
}
.scores-display {
  margin-top: var(--space-4);
}
.score-item, .score-card {
  background: var(--background-color);
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.score-card {
  flex-direction: column;
  gap: 12px;
}
.score-card-header {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
}
.score-card .team-name {
  flex: 1;
  font-weight: 600;
}
.player-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
}
.no-selection, .no-scores {
  color: var(--black-50);
  padding: 20px;
  text-align: center;
  font-style: italic;
}
</style>
