<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div class="templates-page">
        <GenericButton class="generic-button--quaternary" @click="goBack">
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
        <h3>Bestaande<strong> sessies</strong></h3>
        <div class="templates-page-inputs">
          <GenericInput
            label="Sessie zoeken"
            placeholder="bv. Teambuilding Team Blue"
            v-model="searchQueryName"
          />
          <GenericInput
            label="Datum"
            placeholder="01/01/2025"
            v-model="searchQueryDate"
          />
        </div>

        <div class="templates-page-content">
          <p v-if="loading" class="loading-message">Sessies laden...</p>
          <RouterLink
            v-else
            v-for="(card, index) in filteredCards"
            :key="index"
            :to="{ name: 'SessionOverview', params: { id: card.id } }"
            class="router-link"
          >
            <GenericCard
              :title="card.title"
              :date="card.date"
              :teams="card.teams"
              :activities="card.activities"
            />
          </RouterLink>
        </div>

        <p v-if="!loading && filteredCards.length === 0" class="no-results">
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
import { useRouter, useRoute } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "Templates" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { useSessions } from "@/composables/useSessions";
import { useApi } from "@/composables/useApi";

const router = useRouter();
const route = useRoute();
const { sessions, fetchSessions, loading } = useSessions();
const { get } = useApi();

const goBack = () => {
  router.back();
};

const searchQueryName = ref("");
const searchQueryDate = ref("");
const sessionTeams = ref({});
const sessionActivities = ref({}); // Store activities for each session

// Format date for display (from ISO to DD/MM/YYYY)
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Fetch teams for a specific session
const fetchTeamsForSession = async (sessionId) => {
  try {
    const teamsData = await get(`/api/v1/sessions/${sessionId}/teams`);
    const teams = teamsData.teams || teamsData;
    sessionTeams.value[sessionId] = teams;
    console.log(
      `✅ Teams loaded for session ${sessionId}:`,
      teams.length,
      teams,
    );
  } catch (error) {
    console.error(`❌ Failed to load teams for session ${sessionId}:`, error);
    sessionTeams.value[sessionId] = [];
  }
};

// Fetch activities for a specific session
const fetchActivitiesForSession = async (sessionId) => {
  try {
    const activitiesData = await get(
      `/api/v1/sessions/${sessionId}/activities`,
    );
    const activities = activitiesData.activities || activitiesData;
    sessionActivities.value[sessionId] = activities;
    console.log(
      `✅ Activities loaded for session ${sessionId}:`,
      activities.length,
      activities,
    );
  } catch (error) {
    console.error(
      `❌ Failed to load activities for session ${sessionId}:`,
      error,
    );
    sessionActivities.value[sessionId] = [];
  }
};

// Transform sessions to cards format
const cards = computed(() => {
  const result = sessions.value.map((session) => {
    const teams = sessionTeams.value[session.id] || [];
    const activities = sessionActivities.value[session.id] || [];
    console.log(
      `📋 Card for session ${session.id} (${session.name}):`,
      teams.length,
      "teams,",
      activities.length,
      "activities",
    );
    return {
      id: session.id,
      title: session.name,
      date: formatDate(session.created_at),
      teams: teams,
      activities: activities,
    };
  });
  return result;
});

const filteredCards = computed(() => {
  return cards.value.filter((card) => {
    const matchesName =
      !searchQueryName.value ||
      card.title.toLowerCase().includes(searchQueryName.value.toLowerCase());
    const matchesDate =
      !searchQueryDate.value || card.date.includes(searchQueryDate.value);
    return matchesName && matchesDate;
  });
});

// Load sessions and their teams on mount
onMounted(async () => {
  await loadSessionsAndTeams();
});

// Watch for route query changes (when returning from new session creation)
watch(
  () => route.query.refresh,
  async (newValue) => {
    if (newValue === "true") {
      console.log("🔄 Refreshing sessions after new session creation");
      await loadSessionsAndTeams();
      // Clear the query parameter after a short delay to allow the component to update
      setTimeout(() => {
        router.replace({ path: route.path, query: {} });
      }, 100);
    }
  },
  { immediate: true }, // Execute immediately if query param is already present
);

// Function to load all sessions and their teams
async function loadSessionsAndTeams() {
  try {
    console.log("📡 Fetching all sessions...");
    await fetchSessions();
    console.log("✅ Sessions loaded:", sessions.value.length);

    // Clear previous data
    sessionTeams.value = {};
    sessionActivities.value = {};

    // Fetch teams and activities for each session
    for (const session of sessions.value) {
      await Promise.all([
        fetchTeamsForSession(session.id),
        fetchActivitiesForSession(session.id),
      ]);
    }
    console.log(
      "✅ All teams and activities loaded for",
      sessions.value.length,
      "sessions",
    );
  } catch (error) {
    console.error("❌ Failed to load sessions:", error);
  }
}
</script>
<style scoped>
h3 {
  margin: var(--space-5) 0;
  & span {
    color: var(--blue-100);
  }
}

.templates-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.templates-page-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
  flex-shrink: 0;
}
.templates-page-content {
  overflow-y: auto;
  margin-top: var(--space-6);
  flex: 1;
  min-height: 0;
}
.templates-page-content::-webkit-scrollbar {
  width: 8px;
}
.templates-page-content::-webkit-scrollbar-track {
  background: transparent;
}
.templates-page-content::-webkit-scrollbar-thumb {
  background-color: var(--blue-40);
  border-radius: 4px;
}
.templates-page-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--blue-60);
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
.loading-message {
  text-align: center;
  color: var(--blue-100);
  margin-top: var(--space-8);
  font-style: italic;
}
.router-link {
  text-decoration: none;
  color: inherit;
  display: block;
}
</style>
