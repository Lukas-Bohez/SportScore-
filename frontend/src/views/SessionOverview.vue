<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div v-if="loading">
        <p>Sessie laden...</p>
      </div>
      <div v-else-if="session" class="session-overview-head-content">
        <GenericButton class="generic-button--quaternary" @click="back">
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
        <div class="session-header">
          <h2><span>Sessie</span> overzicht</h2>
        </div>
        <div class="session-overview-head">
          <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Sessie naam:</h4>
            <p class="text">{{ session.name }}</p>
          </div>
          <!-- <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Aantal rondes per game:</h4>
            <p class="text">{{ session.total_rounds || "N/A" }}</p>
          </div> -->
          <!-- <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Tijdslimiet:</h4>
            <p class="text">
              {{
                session.time_limit ? `${session.time_limit}s` : "Geen limiet"
              }}
            </p>
          </div> -->
          <!-- <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Score modus:</h4>
            <p class="text">{{ session.scoring_mode || "N/A" }}</p>
          </div> -->
        </div>

        <div class="section-overview-content">
          <div v-if="activities.length > 0">
            <h4 class="stap4-subtitle">Activiteiten:</h4>
            <div class="activity-container">
              <p
                v-for="activity in activities"
                :key="activity.id"
                class="activity-container-item"
              >
                {{ activity.name }}
              </p>
            </div>
          </div>
          <div v-if="teams.length > 0">
            <h4 class="stap4-subtitle">Deelnemers:</h4>
            <div class="teams-container">
              <div v-for="team in teams" :key="team.id" class="team-container">
                <div class="team-header">
                  <button @click="unlinkTeam(team.id)" class="action-button action-button--danger left-unlink" title="Ontkoppelen">✖</button>
                  <p class="activity-item team-name">{{ team.name }} {{ team.icon }}</p>
                </div>
                <div class="activity-container">
                  <p
                    v-for="player in team.players"
                    :key="player.id"
                    class="activity-container-item"
                  >
                    {{ player.icon || player.emoji || "" }} {{ player.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <p>Geen deelnemers gevonden voor deze sessie.</p>
          </div>
        </div>
      </div>
      <div v-else>
        <p>Sessie niet gevonden.</p>
      </div>
      <div class="button-group">
        <GenericButton variant="secondary" @click="deleteSession"
          >Verwijderen</GenericButton
        >
        <GenericButton
          variant="primary"
          @click="startSession"
          v-if="
            session?.status === 'template' ||
            session?.status === 'setup' ||
            session?.status === 'completed'
          "
        >
          Sessie Starten
        </GenericButton>
        <GenericButton
          variant="primary"
          @click="startSession"
          v-else-if="session?.status === 'active'"
          disabled
        >
          Sessie Actief
        </GenericButton>
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>

  <!-- Delete Confirmation Modal -->
  <GenericModel
    ref="deleteModal"
    :message="`Weet je zeker dat je de sessie '${session?.name || 'deze sessie'}' wilt verwijderen?`"
    icon="triangle-alert"
    iconColor="var(--red-100)"
    confirmText="Ja"
    cancelText="Nee"
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
defineOptions({ name: "SessionBeheren" });

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import GenericButton from "@/components/Generic/GenericButton.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericModel from "@/components/Generic/GenericModel.vue";
import { useSessions } from "@/composables/useSessions";
import { useApi } from "@/composables/useApi";
import { ElNotification } from "element-plus";

const router = useRouter();
const route = useRoute();
const { get, post, put, del } = useApi();

const session = ref(null);
const teams = ref([]);
const activities = ref([]);
const loading = ref(true);
const deleteModal = ref(null);
const errorModal = ref(null);

const back = () => {
  router.back();
};

const deleteSession = () => {
  if (!session.value) return;

  // Open the modal instead of using browser confirm
  deleteModal.value.open();
};

// Unlink team from session
const unlinkTeam = async (teamId) => {
  if (!session.value) return;
  try {
    await post(`/api/v1/sessions/${session.value.id}/remove-team`, { team_id: teamId });
    ElNotification({ title: 'Succes', message: 'Team is ontkoppeld van de sessie', type: 'success' });
    // Refresh session data
    await loadSessionData();
  } catch (err) {
    console.error('❌ Failed to unlink team:', err);
    ElNotification({ title: 'Fout', message: 'Kon team niet ontkoppelen: ' + (err.message || ''), type: 'error' });
  }
};

const confirmDelete = async () => {
  if (!session.value) return;

  try {
    console.log("🗑️ Deleting session:", session.value.id);

    // Check if this is a template from localStorage
    const isTemplate = session.value.id.toString().startsWith("session_");

    if (isTemplate) {
      // Delete from localStorage
      console.log("📦 Deleting template from localStorage");
      const templatesKey = "sessionTemplates";
      const templates = JSON.parse(localStorage.getItem(templatesKey) || "[]");
      const updatedTemplates = templates.filter(
        (t) => t.id !== session.value.id,
      );
      localStorage.setItem(templatesKey, JSON.stringify(updatedTemplates));
      console.log("✅ Template deleted from localStorage");
    } else {
      // Delete from API
      console.log("🌐 Deleting session from API");
      await del(`/api/v1/sessions/${session.value.id}`);

      console.log("✅ Session deleted from API successfully");
    }
  } catch (error) {
    console.error("❌ Failed to delete session:", error);
    // Show error modal only if deletion actually failed
    errorModal.value?.open();
    return; // Stop here if there was an error
  }

  // Navigate back to templates page (only if deletion was successful)
  try {
    await router.push({
      path: "/templates",
      query: { refresh: "true" },
    });
    console.log("✅ Navigated to Templates");
  } catch (navError) {
    console.error("⚠️ Navigation error (but session was deleted):", navError);
    // Even if navigation fails, try alternative navigation
    router.push("/templates");
  }
};

const cancelDelete = () => {
  console.log("Delete cancelled");
};

const getStatusLabel = (status) => {
  const labels = {
    setup: "Template",
    active: "Actief",
    paused: "Gepauzeerd",
    completed: "Afgelopen",
    cancelled: "Geannuleerd",
  };
  return labels[status] || status;
};

const startSession = async () => {
  if (!session.value) return;

  try {
    console.log("🚀 Starting session from template:", session.value.id);

    // Check if this is a template from localStorage
    const isTemplate = session.value.id.toString().startsWith("session_");

    if (isTemplate) {
      // This is a template from localStorage - need to create it in API first
      console.log("📦 Creating session in API from template...");

      // 1. Create session in API with 'active' status
      const createdSession = await post("/api/v1/sessions", {
        name: session.value.name,
        total_rounds: session.value.total_rounds,
        time_limit: session.value.time_limit,
        scoring_mode: session.value.scoring_mode,
        status: "active", // Set as active immediately
      });

      console.log("✅ Session created in API:", createdSession);

      // 2. Create teams and get ID mapping
      const teamIdMapping = {}; // Map localStorage IDs to API IDs

      for (const team of session.value.teams) {
        try {
          // Create or get existing team
          let apiTeam;
          try {
            try {
              apiTeam = await post("/api/v1/teams", {
                name: team.name,
                color: team.color || "#ffffff",
                icon: team.icon || "👥",
                description: "",
              });
            } catch (err) {
              if (
                err &&
                String(err.message || "")
                  .toLowerCase()
                  .includes("already exists")
              ) {
                const allTeamsResp = await get("/api/v1/teams");
                const allTeams = allTeamsResp.teams || allTeamsResp || [];
                apiTeam = allTeams.find((t) => t.name === team.name);
              } else {
                console.error("Failed to create team:", err);
                throw err;
              }
            }
          } catch (error) {
            console.error("Failed to create team:", error);
            throw error;
          }

          teamIdMapping[team.id] = apiTeam.id;

          // Link team to session
          await post(`/api/v1/sessions/${createdSession.id}/add-team`, {
            team_id: apiTeam.id,
          });

          console.log(`✅ Team ${apiTeam.name} linked to session`);

          // 3. Create players for this team
          for (const player of team.players || []) {
            await post(
              `/api/v1/sessions/${createdSession.id}/teams/${apiTeam.id}/players`,
              {
                name: player.name,
                team_id: apiTeam.id,
                position: player.icon || "",
              },
            );
            console.log(`✅ Player ${player.name} created`);
          }
        } catch (error) {
          console.error("Failed to create team or players:", error);
          throw error;
        }
      }

      // 4. Create activities
      for (const activity of session.value.activities || []) {
        await post(`/api/v1/sessions/${createdSession.id}/activities`, {
          session_id: createdSession.id,
          name: activity.name,
          sport_type: activity.sport_type || "custom",
          game_type: activity.game_type || "custom",
          scoring_mode: activity.scoring_mode || "team",
          time_winner: activity.time_winner || "lower",
          total_rounds: activity.total_rounds || 1,
          time_limit_per_round: activity.time_limit_per_round || null,
          description: activity.description || null,
        });
        console.log(`✅ Activity ${activity.name} created`);
      }

      console.log("✅ Session fully created and started!");
    } else {
      // This is an existing API session - just update status
      await put(`/api/v1/sessions/${session.value.id}`, { status: "active" });

      console.log("✅ Session status updated to active");
    }

    // Show success notification
    ElNotification({
      title: "Succes!",
      message: "Sessie is gestart!",
      type: "success",
    });

    // Navigate to session management page
    router.push({
      name: "sessionmanagment",
    });
  } catch (error) {
    console.error("❌ Failed to start session:", error);
    ElNotification({
      title: "Fout",
      message:
        "Kon sessie niet starten: " + (error.message || "Onbekende fout"),
      type: "error",
    });
  }
};

// Load session data (from API or localStorage)
const loadSessionData = async () => {
  try {
    loading.value = true;
    const sessionId = route.params.id;

    console.log("📡 Loading session:", sessionId);

    // Check if this is a template ID (from localStorage)
    if (sessionId.toString().startsWith("session_")) {
      // Load from localStorage
      console.log("📦 Loading template from localStorage");
      const templatesKey = "sessionTemplates";
      const templates = JSON.parse(localStorage.getItem(templatesKey) || "[]");
      const template = templates.find((t) => t.id === sessionId);

      if (template) {
        session.value = template;
        teams.value = template.teams || [];
        activities.value = template.activities || [];
        console.log("✅ Template loaded from localStorage:", template);
      } else {
        console.error("❌ Template not found in localStorage");
        session.value = null;
      }
    } else {
      // Load from API
      console.log("📡 Loading session from API");
      const sessionData = await get(`/api/v1/sessions/${sessionId}`);
      session.value = sessionData;
      console.log("✅ Session loaded:", sessionData);

      // Fetch teams for this session
      const teamsData = await get(`/api/v1/sessions/${sessionId}/teams`);
      teams.value = teamsData.teams || teamsData;
      console.log("✅ Teams loaded:", teams.value.length);

      // Fetch players for each team
      for (const team of teams.value) {
        try {
          const playersData = await get(
            `/api/v1/sessions/${sessionId}/teams/${team.id}/players`,
          );
          team.players = playersData.players || playersData;
          console.log(
            `✅ Players loaded for team ${team.name}:`,
            team.players.length,
          );
        } catch (error) {
          console.error(
            `❌ Failed to load players for team ${team.id}:`,
            error,
          );
          team.players = [];
        }
      }

      // Fetch activities for this session
      try {
        const activitiesData = await get(
          `/api/v1/sessions/${sessionId}/activities`,
        );
        activities.value = activitiesData.activities || activitiesData;
        console.log("✅ Activities loaded:", activities.value.length);
      } catch (error) {
        console.error("❌ Failed to load activities:", error);
        activities.value = [];
      }
    }
  } catch (error) {
    console.error("❌ Failed to load session data:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadSessionData();
});
</script>
<style scoped>
.session-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.status-badge {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-M);
  font-size: var(--font-size-S);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge--setup {
  background-color: var(--blue-20);
  color: var(--blue-100);
  border: 1px solid var(--blue-100);
}

.status-badge--active {
  background-color: var(--green-20, #d4edda);
  color: var(--green-100, #28a745);
  border: 1px solid var(--green-100, #28a745);
}

.status-badge--paused {
  background-color: var(--orange-40);
  color: var(--orange-100);
  border: 1px solid var(--orange-100);
}

.status-badge--completed {
  background-color: var(--black-20);
  color: var(--black-80);
  border: 1px solid var(--black-40);
}

.status-badge--cancelled {
  background-color: var(--red-20, #f8d7da);
  color: var(--red-100, #dc3545);
  border: 1px solid var(--red-100, #dc3545);
}

.layout-app-pages {
  justify-content: space-between;
}
.session-overview-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}
.session-overview-head-content {
  /* display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2); */
  width: 100%;
  strong {
    color: var(--black-100);
  }
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

  .team-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 200px;
    min-width: 200px;
    flex-shrink: 0;
  }

  & > p {
    flex-shrink: 0;
    display: flex;
  }

  & .activity-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    flex: 1;

    & p {
      width: 100%;
      box-sizing: border-box;
    }
  }

  .left-unlink {
    margin-right: var(--space-2);
  }

  .team-name { font-weight: 600; }

  .left-unlink { margin-right: var(--space-2); }

  .action-button--danger { color: var(--red-100); }
}

h2 {
  & span {
    color: var(--blue-100);
  }
  margin-bottom: var(--space-6);
}

.button-group {
  display: flex;
  gap: var(--space-6);
  margin-top: 1.5rem;
  margin-bottom: 0.7rem;
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
  width: 100%;
  box-sizing: border-box;
  display: block;
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
</style>
