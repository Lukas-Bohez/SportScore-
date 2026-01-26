<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div class="history-page">
        <GenericButton class="generic-button--quaternary" @click="goBack">
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
        <h3><strong>Geschiedenis</strong></h3>
        <GenericInput
          label="Datum"
          placeholder="01/01/2025"
          v-model="searchQuery"
        />
        <div class="history-page-content">
          <RouterLink
            v-for="(card, index) in filteredCards"
            :key="index"
            :to="{ name: 'GameOverview', params: { id: card.id } }"
            class="router-link"
          >
            <GenericCard :title="card.title" :date="card.date" />
          </RouterLink>
        </div>

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
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "History" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";

const router = useRouter();

const goBack = () => {
  router.back();
};

const searchQuery = ref("");
const loading = ref(false);
const completedSessions = ref([]);

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
    loading.value = true;

    // Fetch all sessions from API
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions`,
    );
    const data = await response.json();
    const allSessions = data.sessions || data;

    // Filter only completed sessions
    const completed = allSessions.filter((s) => s.status === "completed");

    console.log("✅ Completed sessions from API:", completed.length);

    // For each completed session, load teams, players, activities, and scores
    const sessionsWithData = await Promise.all(
      completed.map(async (session) => {
        try {
          // Load teams
          const teamsResponse = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${session.id}/teams`,
          );
          const teamsData = await teamsResponse.json();
          const teams = teamsData.teams || teamsData;

          // Load players for each team
          for (const team of teams) {
            const playersResponse = await fetch(
              `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${session.id}/teams/${team.id}/players`,
            );
            const playersData = await playersResponse.json();
            team.players = playersData.players || playersData;
          }

          // Load activities
          const activitiesResponse = await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${session.id}/activities`,
          );
          const activitiesData = await activitiesResponse.json();
          const activities = activitiesData.activities || activitiesData;

          // Load scores for each activity
          const activitiesWithScores = await Promise.all(
            activities.map(async (activity) => {
              try {
                const scoresResponse = await fetch(
                  `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/activities/${activity.id}/scores`,
                );
                const scoresData = await scoresResponse.json();
                return {
                  ...activity,
                  scores: scoresData.scores || scoresData,
                };
              } catch (error) {
                console.error(
                  `Failed to load scores for activity ${activity.id}:`,
                  error,
                );
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
          console.error(
            `Failed to load data for session ${session.id}:`,
            error,
          );
          return {
            ...session,
            teams: [],
            activities: [],
          };
        }
      }),
    );

    completedSessions.value = sessionsWithData;
    console.log("✅ Loaded completed sessions with data:", sessionsWithData);
  } catch (error) {
    console.error("❌ Failed to load completed sessions:", error);
    completedSessions.value = [];
  } finally {
    loading.value = false;
  }
};

// Transform completed sessions to cards
const cards = computed(() => {
  return completedSessions.value.map((session) => ({
    id: session.id,
    title: session.name,
    date: formatDate(session.completed_at || session.created_at),
    teams: session.teams || [],
    activities: session.activities || [],
  }));
});

const filteredCards = computed(() => {
  if (!searchQuery.value) {
    return cards.value;
  }
  return cards.value.filter((card) => card.date.includes(searchQuery.value));
});

onMounted(() => {
  loadCompletedSessions();
});
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
</style>
