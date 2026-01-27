<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div class="history-page">
        <div class="history-header">
          <div class="history-title-actions">
            <GenericButton class="generic-button--quaternary" @click="goBack">
              <ChevronLeft class="icon--quaternary" />Terug
            </GenericButton>
            <h3><strong>Geschiedenis</strong></h3>
          </div>

          <div class="history-tabs">
            <button :class="['tab', { active: selectedTab === 'history' }]" @click="selectedTab = 'history'">Geschiedenis</button>
            <button :class="['tab', { active: selectedTab === 'highscores' }]" @click="selectedTab = 'highscores'">Highscores</button>
          </div>

          <div style="display:flex;gap:8px;align-items:center;">
            <GenericInput
              label="Datum"
              placeholder="01/01/2025"
              v-model="searchQuery"
            />
            <GenericButton class="generic-button--secondary" @click="exportAllXlsx">Exporteer alle sessies</GenericButton>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          <strong>Fout:</strong> {{ errorMessage }}
        </div>
        <div v-if="selectedTab === 'history'" class="history-page-content history-list">
          <div
            v-for="(card, index) in filteredCards"
            :key="card.id || index"
            class="history-card-link"
            role="button"
            tabindex="0"
            @click="openModal(card.session)"
            @keyup.enter="openModal(card.session)"
          >
            <div class="history-card">
              <GenericCard :title="card.title" :date="card.date" :activities="card.activities" :teams="card.teams" />
            </div>
          </div>
        </div>

        <div v-if="selectedTab === 'highscores'" class="history-page-content highscores-list">
          <div v-if="highscores.length === 0" class="no-results">Geen highscores gevonden</div>
          <div v-else class="grid">
            <div
              v-for="(h, i) in highscores"
              :key="h.id || i"
              role="button"
              tabindex="0"
              class="history-card-link"
              @click="openHighscore(h)"
              @keyup.enter="openHighscore(h)"
            >
              <div class="history-card">
                <GenericCard :title="h.name" :date="h.isTime && h.highest_score ? formatMs(h.highest_score) : (h.highest_score ?? 'Geen scores')" />
              </div>
            </div>
          </div>
        </div>

        <HighscoresModal v-model="highscoresOpen" :activity="highscoresActivity" />
        <HistoryModal v-model="modalOpen" :session="modalSession" />

        <p v-if="filteredCards.length === 0" class="no-results">
          Geen resultaten gevonden
        </p>
      </div>
    </div>
  </div>


  <div class="nav-container">
    <GenericNav />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "History" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import HighscoresModal from "@/components/History/HighscoresModal.vue";
import HistoryModal from "@/components/History/HistoryModal.vue";
import { useApi } from "@/composables";

const api = useApi();
const errorMessage = ref(null);

const router = useRouter();

const goBack = () => {
  router.back();
};

const searchQuery = ref("");
const loading = ref(false);
const completedSessions = ref([]);
const selectedTab = ref('history');

// Highscores modal state
const highscoresOpen = ref(false);
const highscoresActivity = ref(null);

// Modal for session details
const modalOpen = ref(false);
const modalSession = ref({});

function openModal(session) {
  modalSession.value = session || {};
  modalOpen.value = true;
}

// Format date for display (from ISO to DD/MM/YYYY)
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Load completed sessions from API
const loadCompletedSessions = async () => {
  try {
    errorMessage.value = null;

    // Use shared API composable which centralizes base URL + error handling
    const data = await api.get('/api/v1/sessions');
    const allSessions = data.sessions || data || [];

    // Filter only completed sessions
    const completed = allSessions.filter((s) => s.status === 'completed');

    console.log('✅ Completed sessions from API:', completed.length);

    // For each completed session, load teams, players, activities, and scores
    const sessionsWithData = await Promise.all(
      completed.map(async (session) => {
        try {
          // Load teams
          const teamsData = await api.get(`/api/v1/sessions/${session.id}/teams`);
          const teams = teamsData.teams || teamsData || [];

          // Load players for each team
          for (const team of teams) {
            try {
              const playersData = await api.get(`/api/v1/sessions/${session.id}/teams/${team.id}/players`);
              team.players = playersData.players || playersData || [];
            } catch (e) {
              console.warn(`Failed to load players for team ${team.id}:`, e);
              team.players = [];
            }
          }

          // Load activities
          const activitiesData = await api.get(`/api/v1/sessions/${session.id}/activities`);
          const activities = activitiesData.activities || activitiesData || [];

          // Load scores for each activity
          const activitiesWithScores = await Promise.all(
            activities.map(async (activity) => {
              try {
                const scoresData = await api.get(`/api/v1/activities/${activity.id}/scores`);
                return {
                  ...activity,
                  scores: scoresData.scores || scoresData || [],
                };
              } catch (error) {
                console.warn(`Failed to load scores for activity ${activity.id}:`, error);
                return { ...activity, scores: [] };
              }
            }),
          );

          return {
            ...session,
            teams,
            activities: activitiesWithScores,
          };
        } catch (error) {
          console.warn(`Failed to load data for session ${session.id}:`, error);
          return {
            ...session,
            teams: [],
            activities: [],
          };
        }
      }),
    );

    completedSessions.value = sessionsWithData;
    console.log('✅ Loaded completed sessions with data:', sessionsWithData);
  } catch (error) {
    console.error('❌ Failed to load completed sessions:', error);
    completedSessions.value = [];
    errorMessage.value = 'Fout bij verbinden met de backend. Controleer of de server draait en of de API-base URL correct is.';
  }
};

// Transform completed sessions to cards
const cards = computed(() => {
  return completedSessions.value.map((session) => {
    // Create a structured-clone-safe copy for passing via history state
    let safeSession;
    try {
      safeSession = JSON.parse(JSON.stringify(session));
    } catch (e) {
      // If cloning fails for any reason, fallback to the minimal payload
      safeSession = { id: session.id };
    }
    return {
      id: session.id,
      title: session.name,
      date: formatDate(session.completed_at || session.created_at),
      teams: session.teams || [],
      activities: session.activities || [],
      session: safeSession,
    };
  });
});

const filteredCards = computed(() => {
  if (!searchQuery.value) {
    return cards.value;
  }
  return cards.value.filter((card) => card.date.includes(searchQuery.value));
});

// Compute highscores by grouping activities by name and taking best score across instances
function parseScore(raw, isTimeMode = false) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') {
    const parts = raw.split(':');
    if (parts.length > 1) {
      const minutes = parseInt(parts[0], 10) || 0;
      const secondsParts = parts[1].split('.');
      const seconds = parseInt(secondsParts[0], 10) || 0;
      const ms = secondsParts[1] ? Math.round(Number('0.' + secondsParts[1]) * 1000) : 0;
      return Math.abs(minutes * 60 * 1000 + seconds * 1000 + ms);
    }
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.abs(n);
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (isTimeMode && !Number.isInteger(num)) return Math.abs(Math.round(num * 1000));
  return Math.abs(num);
}

const highscores = ref([]);

async function computeHighscores() {
  const groups = new Map();
  for (const s of completedSessions.value || []) {
    for (const a of s.activities || []) {
      const key = String(a.name || a.id || '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ activity: a, session: s });
    }
  }

  const out = [];

  for (const [name, instances] of groups.entries()) {
    const rep = instances[0].activity;
    const isTime = instances.some(inst => String(inst.activity.game_type) === 'team_vs_time');
    const scoringMode = (rep.scoring_mode || '').toLowerCase();
    const lowerIsBetter = isTime || rep.lower_is_better === true || rep.lower_is_better === 'true' || scoringMode.includes('golf');

    let best = null;

    for (const inst of instances) {
      const act = inst.activity;
      const isTimeInst = String(act.game_type) === 'team_vs_time';

      // collect per-instance candidate scores, prefer leaderboard
      let instanceCandidates = [];
      try {
        const lb = await api.get(`/api/v1/activities/${act.id}/leaderboard`);
        const leaderboard = lb.leaderboard || [];
        if (leaderboard.length > 0) {
          for (const entry of leaderboard) {
            const rawScore = entry.total_score ?? entry.score ?? entry.points;
            if (rawScore === undefined || rawScore === null) continue;
            const score = parseScore(rawScore, isTimeInst);
            if (score === null) continue;
            instanceCandidates.push(score);
          }
        }
      } catch (e) {
        // ignore and fall back to detailed scores
      }

      if (instanceCandidates.length === 0) {
        const scores = act.scores || [];
        for (const sc of scores) {
          const raw = sc.points ?? sc.score ?? sc.total_score;
          const parsed = parseScore(raw, isTimeInst);
          if (parsed === null) continue;
          instanceCandidates.push(parsed);
        }
      }

      // choose a sensible instance best from candidates
      if (instanceCandidates.length > 0) {
        let instanceBest = null;
        if (lowerIsBetter) {
          // For time-like activities prefer candidates >= 1s (1000ms) to avoid tiny outliers
          const sensible = isTimeInst ? instanceCandidates.filter(c => c >= 1000) : instanceCandidates;
          const source = sensible.length ? sensible : instanceCandidates.filter(c => c > 0);
          if (source.length) instanceBest = Math.min(...source);
        } else {
          instanceBest = Math.max(...instanceCandidates);
        }

        if (instanceBest !== null && instanceBest !== undefined) {
          if (best === null) best = instanceBest;
          else {
            if (lowerIsBetter) {
              if (instanceBest > 0 && instanceBest < best) best = instanceBest;
            } else {
              if (instanceBest > best) best = instanceBest;
            }
          }
        }
      }
    }

    out.push({
      id: rep.id,
      name: rep.name || name,
      sport_type: rep.sport_type || '',
      game_type: rep.game_type || '',
      highest_score: best,
      lower_is_better: lowerIsBetter,
      isTime
    });
  }

  // sort by best score (highest first for normal, lowest first for time/low-is-better)
  out.sort((a, b) => {
    const la = a.highest_score ?? (a.lower_is_better ? Infinity : -Infinity);
    const lb = b.highest_score ?? (b.lower_is_better ? Infinity : -Infinity);
    if (a.lower_is_better) return la - lb; // smaller better
    return lb - la; // larger better
  });

  highscores.value = out;
}

// recompute when sessions change
watch(completedSessions, () => computeHighscores(), { deep: true });
// initial compute
onMounted(() => {
  loadCompletedSessions();
  computeHighscores();
});

onMounted(() => {
  loadCompletedSessions();
});

async function exportAllXlsx() {
  try {
    const mod = await import('@/utils/exporter');
    await mod.exportSessionsToXlsx(completedSessions.value);
  } catch (e) {
    console.error('Failed to export all sessions', e);
  }
}

function openHighscore(activity) {
  highscoresActivity.value = activity;
  highscoresOpen.value = true;
}

function formatMs(ms) {
  if (ms == null) return '0:00.000';
  const sign = ms < 0 ? '-' : '';
  ms = Math.abs(ms);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const remainder = ms % 1000;
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${sign}${minutes}:${pad(seconds)}.${pad(remainder, 3)}`;
}


</script>
<style scoped>
h3 {
  margin: var(--space-5) 0;
  & span {
    color: var(--blue-100);
  }
}

.history-page {
  width: 100%;
  height: 100%;
}
.history-page-content {
  overflow-y: auto;
  margin-top: var(--space-6);
  flex: 1;
  min-height: 0;
  padding-right: 0.5rem;
}
.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  align-items: start;
}
.history-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.history-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  transition: box-shadow 0.12s ease;
}
.history-card-link:hover .generic-card, .history-card-link:focus .generic-card {
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
}
.back-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: var(--space-4);
}
.back-button svg {
  margin-right: var(--space-2);
}
.no-results {
  text-align: center;
  color: var(--black-50);
  margin-top: var(--space-8);
  font-style: italic;
}
.router-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.error-banner {
  background: var(--red-10);
  color: var(--red-100);
  padding: 10px 12px;
  border-radius: 8px;
  margin-top: var(--space-4);
}
.history-header { display:flex; flex-direction:column; gap:8px; margin-bottom: var(--space-4); }
.history-title-actions { display:flex; gap:12px; align-items:center; }
.history-tabs { display:flex; gap:8px; }
.tab { background: transparent; border: 1px solid var(--border-color); padding:6px 10px; border-radius:6px; cursor:pointer; color:var(--black-80); }
.tab.active { background: var(--blue-10); border-color: var(--blue-100); color: var(--blue-100); }
.highscores-list .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; }


</style>
