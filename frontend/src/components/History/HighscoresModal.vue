<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="highscores-modal-overlay" @click.self="close">
        <div class="highscores-modal">
          <div class="highscores-modal-header">
            <div>
              <h3>{{ activity?.name || 'Activiteit' }}</h3>
              <p class="muted">{{ activity?.sport_type || '' }} • {{ activity?.game_type || '' }}</p>
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

const { get } = useApi();

watch(() => props.activity, async (a) => {
  leaderboard.value = [];
  if (!a) return;
  isTime.value = String(a.game_type) === 'team_vs_time';
  loading.value = true;
  try {
    const res = await get(`/api/v1/activities/${a.id}/leaderboard`);
    leaderboard.value = res.leaderboard || [];
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