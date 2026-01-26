<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div v-if="loading" class="step-content">
        <p>Sessie laden...</p>
      </div>
      <div v-else-if="session" class="step-content">
        <GenericButton class="generic-button--quaternary" @click="back">
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
        <h2><span>Game</span> overzicht</h2>
        <div class="session-overview-head">
          <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Sessie naam:</h4>
            <P class="text">{{ session.name }}</P>
          </div>
        </div>

        <div class="action-buttons">
          <GenericButton variant="secondary" @click="deleteSession">
            Sessie Verwijderen
          </GenericButton>
        </div>

        <div class="section-overview-content-download-activiteit">
          <GenericDropdown
            label="Selecteer een specifieke activiteit"
            v-model="selectedDropdownValue"
            :options="dropdownOptions"
            placeholder="Selecteer een specifieke activiteit"
          />

          <GenericButton variant="primary" label="Download" />
        </div>

        <div class="section-overview-content" v-if="selectedDropdownValue">
          <div v-if="teamAccordions.length === 0" class="no-activities">
            <p>Geen scores gevonden voor deze activiteit.</p>
          </div>
          <GenericAccordion
            v-else
            v-for="teamAccordion in teamAccordions"
            :key="teamAccordion.teamId"
            :title="teamAccordion.title"
            :items="teamAccordion.items"
          />
        </div>

        <div v-else class="no-activities">
          <p>Selecteer een activiteit om de resultaten te zien.</p>
        </div>
      </div>
      <div v-else class="step-content">
        <p>Sessie niet gevonden.</p>
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>

  <!-- Delete Confirmation Modal -->
  <GenericModel
    ref="deleteModal"
    :message="`Weet je zeker dat je de sessie '${session?.name || 'deze sessie'}' wilt verwijderen? Alle deelnemers en resultaten worden ook verwijderd.`"
    icon="triangle-alert"
    iconColor="var(--red-100)"
    confirmText="Ja, verwijderen"
    cancelText="Annuleren"
    :showCancel="true"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />

  <!-- Error Modal -->
  <GenericModel
    ref="errorModal"
    message="Er is een fout opgetreden bij het verwijderen van de sessie. Probeer het later opnieuw."
    icon="triangle-alert"
    iconColor="var(--red-100)"
    confirmText="OK"
    :showCancel="false"
  />
</template>
<script setup>
defineOptions({ name: "GameOverview" });

import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import GenericButton from "@/components/Generic/GenericButton.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericAccordion from "@/components/Generic/GenericAccordion.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericModel from "@/components/Generic/GenericModel.vue";
import { ElNotification } from "element-plus";

const router = useRouter();
const route = useRoute();

const back = () => {
  router.back();
};

const loading = ref(true);
const session = ref(null);
const teams = ref([]);
const activities = ref([]);
const selectedDropdownValue = ref(null);
const deleteModal = ref(null);
const errorModal = ref(null);

// Check if session has players (teams with players mode)
const hasPlayers = computed(() => {
  return teams.value.some((team) => team.players && team.players.length > 0);
});

// Get team accordions for the selected activity
const teamAccordions = computed(() => {
  if (!selectedDropdownValue.value) {
    console.log("⚠️ No activity selected");
    return [];
  }

  console.log("🔍 Selected activity ID:", selectedDropdownValue.value);
  console.log("📋 Available activities:", activities.value);

  const selectedActivity = activities.value.find(
    (a) => a.id === selectedDropdownValue.value,
  );

  console.log("✅ Found activity:", selectedActivity);

  if (!selectedActivity) {
    console.log("❌ Activity not found!");
    return [];
  }

  if (!selectedActivity.scores) {
    console.log("❌ No scores property on activity");
    return [];
  }

  if (selectedActivity.scores.length === 0) {
    console.log("⚠️ No scores for this activity");
    return [];
  }

  console.log("📊 Scores for activity:", selectedActivity.scores);
  console.log("👥 Teams:", teams.value);
  console.log("🎮 Has players mode:", hasPlayers.value);

  const accordions = [];

  if (hasPlayers.value) {
    // Mode: Teams with Players
    // Create one accordion per team, with players inside
    teams.value.forEach((team) => {
      const teamPlayers = team.players || [];
      const playerScores = [];

      teamPlayers.forEach((player) => {
        // Find all scores for this player in this activity
        const playerScoreData = selectedActivity.scores.filter(
          (score) => score.player_id === player.id && score.team_id === team.id,
        );

        if (playerScoreData.length > 0) {
          const totalScore = playerScoreData.reduce(
            (sum, score) => sum + (score.points || score.score || 0),
            0,
          );
          playerScores.push({
            player_id: player.id,
            player_name: player.name,
            player_icon: player.position || player.icon || "",
            total_score: totalScore,
          });
        }
      });

      // Only add accordion if there are scores for this team
      if (playerScores.length > 0) {
        accordions.push({
          teamId: team.id,
          title: `${team.icon || ""} ${team.name}`,
          items: playerScores
            .sort((a, b) => b.total_score - a.total_score)
            .map((p) => ({
              team: `${p.player_icon} ${p.player_name}`,
              punten: p.total_score,
            })),
        });
      }
    });
  } else {
    // Mode: Only Teams
    // Create one accordion per team, with team score inside
    teams.value.forEach((team) => {
      // Find all scores for this team in this activity
      const teamScoreData = selectedActivity.scores.filter(
        (score) => score.team_id === team.id,
      );

      if (teamScoreData.length > 0) {
        const totalScore = teamScoreData.reduce(
          (sum, score) => sum + (score.points || score.score || 0),
          0,
        );

        accordions.push({
          teamId: team.id,
          title: `${team.icon || ""} ${team.name}`,
          items: [
            {
              team: "Totaal punten",
              punten: totalScore,
            },
          ],
        });
      }
    });
  }

  console.log("🎯 Returning accordions:", accordions);
  return accordions;
});

// Delete session function
const deleteSession = () => {
  if (!session.value) return;
  deleteModal.value.open();
};

// Confirm delete
const confirmDelete = async () => {
  if (!session.value) return;

  try {
    console.log("🗑️ Deleting session:", session.value.id);

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${session.value.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("✅ Session deleted successfully");

    ElNotification({
      title: "Succes!",
      message: "Sessie en alle deelnemers zijn verwijderd!",
      type: "success",
    });

    // Navigate back to history
    router.push({ name: "geschiedenis" });
  } catch (error) {
    console.error("❌ Failed to delete session:", error);
    errorModal.value?.open();
  }
};

// Cancel delete
const cancelDelete = () => {
  console.log("Delete cancelled");
};

// Load session data with activities and scores
const loadSessionData = async () => {
  try {
    loading.value = true;
    const sessionId = route.params.id;

    console.log("📡 Loading session data for GameOverview:", sessionId);

    // Load session
    const sessionResponse = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${sessionId}`,
    );
    const sessionData = await sessionResponse.json();
    session.value = sessionData;

    console.log("✅ Session loaded:", sessionData);

    // Load teams
    const teamsResponse = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${sessionId}/teams`,
    );
    const teamsData = await teamsResponse.json();
    teams.value = teamsData.teams || teamsData;

    // Load players for each team
    for (const team of teams.value) {
      try {
        const playersResponse = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${sessionId}/teams/${team.id}/players`,
        );
        const playersData = await playersResponse.json();
        team.players = playersData.players || playersData;
      } catch (error) {
        console.error(`Failed to load players for team ${team.id}:`, error);
        team.players = [];
      }
    }

    console.log("✅ Teams with players loaded:", teams.value);

    // Load activities
    const activitiesResponse = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${sessionId}/activities`,
    );
    const activitiesData = await activitiesResponse.json();
    const activitiesList = activitiesData.activities || activitiesData;

    // Load all scores for the session
    let allScores = [];
    try {
      const scoresResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${sessionId}/scores`,
      );
      const scoresData = await scoresResponse.json();
      allScores = scoresData.scores || scoresData || [];
      console.log("✅ All scores loaded:", allScores);
    } catch (error) {
      console.error("Failed to load scores:", error);
      allScores = [];
    }

    // Associate scores with activities
    const activitiesWithScores = activitiesList.map((activity) => {
      // Filter scores that belong to this activity (game_id matches activity.id)
      const activityScores = allScores.filter(
        (score) => score.game_id === activity.id,
      );
      return {
        ...activity,
        scores: activityScores,
      };
    });

    activities.value = activitiesWithScores;
    console.log("✅ Activities with scores loaded:", activities.value);
  } catch (error) {
    console.error("❌ Failed to load session data:", error);
  } finally {
    loading.value = false;
  }
};

// Dropdown options from activities
const dropdownOptions = computed(() => {
  return activities.value.map((activity) => ({
    label: activity.name,
    value: activity.id,
  }));
});

onMounted(() => {
  loadSessionData();
});
</script>
<style scoped>
.layout-app-pages {
  justify-content: space-between;
}
.step-content {
  width: 100%;
}
.session-overview-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}
.session-overview-head-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-6);
  strong {
    color: var(--black-100);
  }
}
.action-buttons {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.section-overview-content-download-activiteit {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.teams-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.team-container {
  display: flex;
  flex-direction: row;
  gap: var(--space-4);
  align-items: stretch;
  padding-bottom: var(--space-4);

  & > p {
    flex-shrink: 0;
    display: flex;
  }

  & .activity-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    flex: 1;

    & p {
      flex: 1 1 calc(45%);
      min-width: 120px;
      box-sizing: border-box;
    }
  }
}

h2 {
  & span {
    color: var(--blue-100);
  }
  margin-bottom: var(--space-6);
}

.button-back-container {
  /* min-height: 2rem;  */
  display: flex;
  align-items: center;
}

/* Custom scrollbar styling */
.checkbox-list::-webkit-scrollbar {
  width: 0.5rem;
}

.checkbox-list::-webkit-scrollbar-track {
  background: var(--black-20, #e0e0e0);
  border-radius: var(--radius-S);
}

.checkbox-list::-webkit-scrollbar-thumb {
  background: var(--blue-40, #a3d6f6);
  border-radius: var(--radius-S);
}

.checkbox-list::-webkit-scrollbar-thumb:hover {
  background: var(--blue-100);
}

/* Firefox scrollbar styling */
.checkbox-list {
  scrollbar-width: thin;
  scrollbar-color: var(--blue-40, #a3d6f6) var(--black-20, #e0e0e0);
}
.activity-container {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.activity-item {
  padding: var(--space-4);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-M);
  width: fit-content;
  background-color: var(--blue-20);
}
.activity-container-item {
  padding: var(--space-4);
  border: 1px solid var(--black-40);
  border-radius: var(--radius-M);
  width: fit-content;
}
.stap4-subtitle {
  font-size: var(--font-size-L);
}
.section-overview-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  overflow-y: auto;
  max-height: calc(100vh - 22rem);
}

.section-overview-content::-webkit-scrollbar {
  width: 0.5rem;
}

.section-overview-content::-webkit-scrollbar-track {
  background: var(--black-20, #e0e0e0);
  border-radius: var(--radius-S);
}

.section-overview-content::-webkit-scrollbar-thumb {
  background: var(--blue-40, #a3d6f6);
  border-radius: var(--radius-S);
}

.section-overview-content::-webkit-scrollbar-thumb:hover {
  background: var(--blue-100);
}

.no-activities {
  text-align: center;
  padding: var(--space-8);
  color: var(--black-60);
}
</style>
