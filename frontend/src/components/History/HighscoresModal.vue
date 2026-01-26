<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="highscores-modal-overlay" @click.self="close">
        <div class="highscores-modal">
          <div class="highscores-modal-header">
            <div>
              <h3>{{ activity?.name || 'Activiteit' }}</h3>
              <p class="muted">{{ activity?.sport_type || '' }} • {{ activity?.game_type || '' }}</p>
              <p v-if="fallbackUsed" class="muted" style="font-size:0.85rem; margin-top:4px;">Resultaten berekend uit scores (fallback)</p>
            </div>
            <div class="modal-actions">
              <GenericButton variant="quaternary" @click="close">✕</GenericButton>
            </div>
          </div>

          <div class="highscores-modal-body">
            <div v-if="loading" class="loader">Laden…</div>
            <div v-else>
              <div v-if="leaderboard.length === 0" class="empty">Geen scores beschikbaar.</div>
              <div v-else class="leaderboard-list">
                <div v-for="(item, idx) in leaderboard" :key="idx" class="leaderboard-item">
                  <div class="rank">#{{ idx + 1 }}</div>
                  <div class="person">{{ item.player_name || item.team_name || item.name || item.team || 'Onbekend' }}</div>
                  <div class="score">
                    <span v-if="isTime">{{ formatMs(item.total_score ?? item.score ?? item.punten ?? item.score_value) }}</span>
                    <span v-else>{{ (item.total_score ?? item.score ?? item.punten ?? item.score_value) }} pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import GenericButton from '@/components/Generic/GenericButton.vue';
import { useApi } from '@/composables/useApi';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  activity: { type: Object, required: false }
});
const emit = defineEmits(['update:modelValue']);

const loading = ref(false);
const leaderboard = ref([]);
const isTime = ref(false);
const fallbackUsed = ref(false);

const { get } = useApi();

// Helper to normalize score value for display & comparison
// Accepts an optional `asTime` flag to convert fractional seconds to milliseconds when appropriate
const extractNumeric = (it, asTime = false) => {
  const v = it?.total_score ?? it?.score ?? it?.punten ?? it?.score_value ?? it?.score;
  if (v === undefined || v === null) return NaN;
  if (typeof v === 'string' && v.includes(':')) {
    // mm:ss.xxx or m:ss.xxx
    const parts = v.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const secondsParts = parts[1] ? parts[1].split('.') : ['0'];
    const seconds = parseInt(secondsParts[0], 10) || 0;
    const ms = secondsParts[1] ? Math.round(Number('0.' + secondsParts[1]) * 1000) : 0;
    return Math.abs(minutes * 60 * 1000 + seconds * 1000 + ms);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  // If used for time and a fractional seconds value is provided, convert to ms
  if (asTime && !Number.isInteger(n)) return Math.abs(Math.round(n * 1000));
  return Math.abs(n);
};

  watch(() => props.activity, async (a) => {
    leaderboard.value = [];
    fallbackUsed.value = false;
    if (!a) return;
    isTime.value = String(a.game_type) === 'team_vs_time';

    loading.value = true;
    try {
      // Try the leaderboard endpoint first
      const res = await get(`/api/v1/activities/${a.id}/leaderboard`);
      const raw = Array.isArray(res) ? res : (res && res.leaderboard) ? res.leaderboard : [];
      console.debug('HighscoresModal: loaded leaderboard', { activityId: a?.id, rawLength: raw.length, sample: raw.slice(0,3), rawResponse: res });

      if (raw && raw.length > 0) {
        // Normalize entries: ensure a consistent score field
        leaderboard.value = raw.map(r => ({
          ...r,
          score: extractNumeric(r, isTime.value)
        }));
      } else {
        // Fallback: aggregate raw scores when leaderboard was empty
        console.debug('HighscoresModal: leaderboard empty, using scores fallback', { activityId: a?.id });
        fallbackUsed.value = true;

        const scoresRes = await get(`/api/v1/activities/${a.id}/scores`);
        const scores = (scoresRes && (scoresRes.scores || scoresRes)) || [];

        const scoringMode = (a && (a.scoring_mode || '') || '').toLowerCase();
        const aggregatePlayerTimes = !!a.aggregate_player_times;
        const timeWinner = (a.time_winner || 'lower').toLowerCase();

        if (scoringMode === 'player') {
          const playerBest = {};
          for (const s of scores) {
            const rawScore = s.points ?? s.score ?? s.total_score;
            if (rawScore === undefined || rawScore === null) continue;
            const parsed = extractNumeric({ total_score: rawScore }, isTime.value);
            if (Number.isNaN(parsed) || parsed === 0) continue;
            const pid = s.player_id || null;
            if (!pid) continue;
            if (!playerBest[pid]) playerBest[pid] = parsed;
            else playerBest[pid] = (a.lower_is_better || isTime.value) ? Math.min(playerBest[pid], parsed) : Math.max(playerBest[pid], parsed);
          }
          leaderboard.value = Object.keys(playerBest).map(pid => ({ player_id: pid, player_name: `Speler ${pid}`, score: playerBest[pid] }));
        } else if (scoringMode === 'team_with_players') {
          const teams = {};
          for (const s of scores) {
            const rawScore = s.points ?? s.score ?? s.total_score;
            if (rawScore === undefined || rawScore === null) continue;
            const parsed = extractNumeric({ total_score: rawScore }, isTime.value);
            if (Number.isNaN(parsed)) continue;
            const teamId = s.team_id || null;
            const pid = s.player_id || null;
            if (!teamId) continue;

            if (!teams[teamId]) teams[teamId] = { scoreSum: 0, best: (timeWinner === 'lower' ? Infinity : -Infinity), players: {} };

            // Track per-player values
            if (pid) {
              if (!teams[teamId].players[pid]) teams[teamId].players[pid] = parsed;
              else teams[teamId].players[pid] = aggregatePlayerTimes ? teams[teamId].players[pid] + parsed : (timeWinner === 'lower' ? Math.min(teams[teamId].players[pid], parsed) : Math.max(teams[teamId].players[pid], parsed));
            }

            // Track team aggregate according to rules
            if (isTime.value && !aggregatePlayerTimes) {
              teams[teamId].best = timeWinner === 'lower' ? Math.min(teams[teamId].best, parsed) : Math.max(teams[teamId].best, parsed);
            } else {
              teams[teamId].scoreSum += parsed;
            }
          }

          leaderboard.value = Object.keys(teams).map(tid => ({ team_id: tid, name: `Team ${tid}`, score: (teams[tid].scoreSum && teams[tid].scoreSum > 0) ? teams[tid].scoreSum : teams[tid].best, players: teams[tid].players }));
        } else {
          // team/default
          const teams = {};
          for (const s of scores) {
            const rawScore = s.points ?? s.score ?? s.total_score;
            if (rawScore === undefined || rawScore === null) continue;
            const parsed = extractNumeric({ total_score: rawScore }, isTime.value);
            if (Number.isNaN(parsed)) continue;
            const teamId = s.team_id || null;
            if (!teamId) continue;
            if (!teams[teamId]) teams[teamId] = 0;
            teams[teamId] += parsed;
          }
          leaderboard.value = Object.keys(teams).map(tid => ({ team_id: tid, name: `Team ${tid}`, score: teams[tid] }));
        }
      }

      // Final sort using lowerIsBetter heuristic (time/golf/explicit)
      const lowerIsBetter = isTime.value || (a && (a.lower_is_better === true || String(a.lower_is_better) === 'true')) || (a && String(a.scoring_mode || '').toLowerCase().includes('golf'));
      leaderboard.value.sort((x, y) => {
        const nx = extractNumeric(x, isTime.value);
        const ny = extractNumeric(y, isTime.value);
        if (Number.isNaN(nx) && Number.isNaN(ny)) return 0;
        if (Number.isNaN(nx)) return 1;
        if (Number.isNaN(ny)) return -1;
        return lowerIsBetter ? nx - ny : ny - nx;
      });

    } catch (e) {
      console.warn('Failed to load activity leaderboard', e);
      leaderboard.value = [];
    } finally {
      loading.value = false;
    }
  });

function close() {
  emit('update:modelValue', false);
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
.highscores-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--background-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}
.highscores-modal {
  width: min(720px, 96%);
  max-height: 80vh;
  overflow-y: auto;
  background: var(--white);
  border-radius: var(--radius-L);
  padding: var(--space-6);
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
}
.highscores-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
}
.leaderboard-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.leaderboard-item { display:flex; gap:12px; align-items:center; padding:8px; background:var(--background-color); border-radius:8px; }
.rank { font-weight:700; color:var(--primary-color); }
.person { flex:1; }
.score { font-weight:500; color: var(--black-100); }
.empty { color:var(--black-50); text-align:center; padding:16px; }
.loader { text-align:center; color:var(--black-60); }
</style>