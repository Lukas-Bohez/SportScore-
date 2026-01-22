<template>
  <div class="layout-app-pages">
    <div class="layout-session-active">
      <h2><strong>Actieve</strong> Sessies</h2>
      <div v-if="activeSessions.length === 0" class="no-sessions-message">
        <p>Geen actieve sessie!</p>
      </div>
      <div v-else class="sessions-list">
        <FeatureActiveSession
          v-for="session in activeSessions"
          :key="session.id"
          :session="session"
        />
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>

<script setup>
import { ref } from "vue";
import FeatureActiveSession from "@/components/features/FeatureActiveSession.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
// Voorbeeld data - vervang met echte data van API/database
const activeSessions = ref([
  {
    id: 1,
    name: "Team Building Dag 2026",
    activities: 3,
    teams: 6,
  },
  {
    id: 2,
    name: "SportScore Championship",
    activities: 5,
    teams: 8,
  },
]);

// Om data in te laden van een API:
// const loadActiveSessions = async () => {
//   try {
//     const response = await fetch('/api/sessions/active');
//     activeSessions.value = await response.json();
//   } catch (error) {
//     console.error('Error loading sessions:', error);
//   }
// };
//
// onMounted(() => {
//   loadActiveSessions();
// });
</script>

<style scoped>
.layout-session-active {
  width: 100%;
  height: 100%;
}
.active-sessions-page {
  padding: var(--space-8);
  padding-bottom: 120px; /* Ruimte voor fixed nav */

  h2 {
    margin-bottom: var(--space-6);
  }
}

.no-sessions-message {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: var(--red-50);
  border-radius: var(--radius-2);
  box-shadow: var(--shadow-1);

  p {
    font-size: var(--font-size-5);
    font-weight: 600;
    color: var(--blue-100);
  }
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
