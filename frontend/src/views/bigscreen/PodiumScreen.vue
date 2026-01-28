<template>
  <div class="scorescreen-container">
    <!-- Confetti particles -->
    <div class="confetti-container">
      <div
        v-for="i in 50"
        :key="i"
        class="confetti"
        :style="getConfettiStyle(i)"
      ></div>
    </div>

    <div class="scorescreen-header">
      <div class="header-item animate-slide-in" style="animation-delay: 0s">
        <FeatureClock initialTime="00:00:00" />
      </div>
      <h2 class="header-item animate-scale-in" style="animation-delay: 0.2s">
        Leaderboard
      </h2>
      <h2 class="header-item animate-slide-in" style="animation-delay: 0.4s">
        {{ currentActivityName || '—' }}
      </h2>
    </div>
    <div class="scorescreen-content">
      <div class="podium-wrapper animate-bounce-in">
        <FeaturePodium :winners="currentWinners" />
      </div>
      <div
        class="scorescreen-content-header animate-fade-in"
        style="animation-delay: 1s"
      >
        <div class="scorescreen-content-header-left">
          <h2>#</h2>
          <h2>Speler</h2>
        </div>
        <h2>Punten</h2>
      </div>
      <div class="scorescreen-content-results">
        <div
          v-for="(row, idx) in currentLeaderboard"
          :key="row.id || idx"
          class="result-item"
          :style="{ animationDelay: `${1.2 + idx * 0.1}s` }"
        >
          <GenericResult :rank="idx + 1" :player="row.displayName || row.name || row.player_name || row.team_name || 'Onbekend'" :score="row.score ?? row.total ?? row.points ?? 0" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureClock from "../../components/features/FeatureClock.vue";
import FeaturePodium from "../../components/features/FeaturePodium.vue";
import GenericResult from "../../components/Generic/GenericResult.vue";
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@/composables/useApi';
import { useSocket } from '@/composables/useSocket';

// Initialize bigscreen flow when this view mounts
onMounted(() => {
  import('@/composables/useBigscreenFlow')
    .then(({ initBigscreenFlow }) => initBigscreenFlow())
    .catch((e) => console.warn('Failed to init bigscreen flow:', e));
});

// Rotation state
const route = useRoute();
const router = useRouter();
const { get } = useApi();
const { emit } = useSocket();
const rotationIndex = ref(0);
const rotationRounds = ref([]);
let rotationTimer = null;

const loadSessionPodiums = async () => {
  try {
    const sessionId = route?.query?.session || null;
    let session = null;

    if (sessionId) {
      try {
        const data = await get(`/api/v1/sessions/${sessionId}`);
        session = data.session || data || null;
      } catch (e) {
        console.warn('Failed to load session by query param:', sessionId, e);
      }
    }

    // Fallback: load last completed session if no session param
    if (!session) {
      try {
        const sessionsRes = await get('/api/v1/sessions');
        const sessions = sessionsRes.sessions || sessionsRes || [];
        // pick most recently completed session
        session = sessions.filter(s => (s.status || '').toLowerCase() === 'completed').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
      } catch (e) {
        console.warn('Failed to fetch sessions fallback for podium:', e);
      }
    }

    if (!session) return;

    // Load activities for this session
    const actsRes = await get(`/api/v1/sessions/${session.id}/activities`);
    const activities = actsRes.activities || actsRes || [];

    const rounds = [];
    for (const a of activities) {
      try {
        const lbRes = await get(`/api/v1/activities/${a.id}/leaderboard`);
        const leaderboard = lbRes.leaderboard || lbRes || [];
        rounds.push({ activity: a, leaderboard });
      } catch (e) {
        console.warn('Failed to load leaderboard for activity', a.id, e);
      }
    }

    rotationRounds.value = rounds;
    rotationIndex.value = 0;

    if (rotationRounds.value.length > 0) startRotation();
  } catch (e) {
    console.error('Failed loading podium data:', e);
  }
};

const startRotation = () => {
  stopRotation();
  rotationTimer = setInterval(() => {
    rotationIndex.value++;
    if (rotationIndex.value >= rotationRounds.value.length) {
      // Completed one full cycle -> stop and notify flow to re-evaluate (which will show QR/loading)
      stopRotation();
      try {
        if (typeof emit === 'function') emit('bigscreen:rotation_done', {});
      } catch (e) {}
      try { window.dispatchEvent(new Event('bigscreen:rotation_done')); } catch (e) {}
      // As a safety, navigate to loading screen to give a visual transition
      router.replace('/bigscreen/loadingScreen').catch(() => {});
      return;
    }
  }, 10000); // 10 seconds per activity
};

const stopRotation = () => {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
};

onUnmounted(() => {
  stopRotation();
});

// Generate random confetti styles
const getConfettiStyle = (index) => {
  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
  ];
  const left = Math.random() * 100;
  const animationDelay = Math.random() * 3;
  const animationDuration = 3 + Math.random() * 4;

  return {
    left: `${left}%`,
    backgroundColor: colors[index % colors.length],
    animationDelay: `${animationDelay}s`,
    animationDuration: `${animationDuration}s`,
  };
};

// Load on mount
onMounted(() => {
  loadSessionPodiums();
});

import { computed } from 'vue';

// Computed helpers exposed to template
const currentRound = computed(() => rotationRounds.value[rotationIndex.value] || null);
const currentLeaderboard = computed(() => {
  const r = currentRound.value;
  return (r && r.leaderboard && Array.isArray(r.leaderboard)) ? r.leaderboard.map((entry) => {
    // normalize common fields
    return {
      id: entry.player_id || entry.team_id || entry.id,
      displayName: entry.player_name || entry.team_name || entry.name || (entry.player_id ? `Speler ${entry.player_id}` : `Team ${entry.team_id}`),
      score: entry.total ?? entry.score ?? entry.points ?? 0,
      emoji: entry.icon || entry.emoji || '',
    };
  }) : [];
});

const currentWinners = computed(() => {
  const list = currentLeaderboard.value;
  // top 3
  return [list[0] || null, list[1] || null, list[2] || null];
});

const currentActivityName = computed(() => {
  const r = currentRound.value;
  return r && r.activity ? r.activity.name : null;
});
</script>
<style scoped>
.scorescreen-container {
  position: relative;
  overflow: hidden;
}

/* Confetti Animation */
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10px;
  opacity: 0;
  animation: confetti-fall linear infinite;
  border-radius: 2px;
  transform-origin: center;
}

@keyframes confetti-fall {
  0% {
    top: -10px;
    opacity: 1;
    transform: translateX(0) rotateZ(0deg);
  }
  100% {
    top: 100vh;
    opacity: 0;
    transform: translateX(100px) rotateZ(720deg);
  }
}

/* Header Animations */
.scorescreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-8) var(--space-6);
  border-bottom: 2px solid var(--gray-200);
  position: relative;
  z-index: 2;
}

.header-item {
  animation-fill-mode: forwards;
}

@keyframes slide-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-slide-in {
  animation: slide-in-up 0.8s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Content Animations */
.scorescreen-content {
  padding: var(--space-6);
  position: relative;
  z-index: 2;
}

/* Podium Animation */
.podium-wrapper {
  animation: bounce-in 1s ease-out 0.6s forwards;
  transform-origin: bottom center;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(100px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(-10px);
  }
  70% {
    transform: scale(0.95) translateY(5px);
  }
  85% {
    transform: scale(1.02) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-bounce-in {
  animation: bounce-in 1s ease-out;
}

/* Header Table Animation */
.scorescreen-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-6);
  margin-bottom: var(--space-4);
  padding-top: var(--space-10);
  animation-fill-mode: forwards;
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scorescreen-content-header-left {
  display: flex;
  gap: var(--space-6);
}

/* Results Animation */
.scorescreen-content-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result-item {
  opacity: 0;
  animation: slide-in-left 0.6s ease-out forwards;
  transform-origin: left center;
}

@keyframes slide-in-left {
  0% {
    opacity: 0;
    transform: translateX(-50px) scale(0.9);
  }
  60% {
    transform: translateX(10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Shimmer effect for dramatic entrance */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Add glow effect to container on load */
.scorescreen-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 215, 0, 0.1),
    transparent
  );
  animation: shimmer 2s ease-in-out 0.5s;
  pointer-events: none;
  z-index: 3;
}
</style>
