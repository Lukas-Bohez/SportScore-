<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import { ref, computed, onMounted, onUnmounted, h, watch } from "vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericCheckbox from "@/components/Generic/GenericCheckbox.vue";
import GenericToggle from "@/components/Generic/GenericToggle.vue";
import FeaturePicker from "@/components/features/FeaturePicker.vue";
import { ElNotification } from "element-plus";
import GenericModel from "@/components/Generic/GenericModel.vue";
import {
  useActivities,
  useSessions,
  useTeams,
  usePlayers,
} from "@/composables";
import { useRoute } from "vue-router";

const modalRef = ref(null);
const successModalRef = ref(null);
const route = useRoute();
const createdSessionId = ref(null); // Store the created session ID

// Session data
const sessionName = ref("");
const sessionGameType = ref("custom");
const sessionSportType = ref("custom");
const sessionScoringMode = ref("team");
const sessionTotalRounds = ref(1);
const sessionTimeLimit = ref(null);
const sessionShowPlayers = ref(false);

// Validation errors
const sessionNameError = ref("");
const sessionGameTypeError = ref("");
const sessionSportTypeError = ref("");
const selectedTeamError = ref("");

const openSuccessModal = () => {
  successModalRef.value.open();
};

const handleConfirm = async () => {
  console.log("Bevestigd! Sessie wordt gestart...");

  try {
    // Update session status to 'active'
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${createdSessionId.value}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to start session: ${response.status}`);
    }

    console.log("✅ Sessie status geüpdatet naar 'active'");

    // Show success notification
    ElNotification({
      title: "Succes!",
      message: "Sessie is gestart!",
      type: "success",
    });

    // Navigate to sessie beheren page with refresh flag
    router.push({
      name: "Templates",
      query: { refresh: "true", newSession: createdSessionId.value },
    });
  } catch (error) {
    console.error("❌ Failed to start session:", error);
    ElNotification({
      title: "Fout",
      message: "Kon sessie niet starten",
      type: "error",
    });
  }
};

const handleCancel = () => {
  console.log("Sessie opgeslagen maar niet gestart");

  // Show info notification
  ElNotification({
    title: "Opgeslaan!",
    message: "Sessie is opgeslaan als template. Je kunt deze later starten.",
    type: "info",
  });

  // Navigate to templates page
  router.push({
    name: "Templates",
    query: { refresh: "true", newSession: createdSessionId.value },
  });
};

const handleSuccess = () => {
  console.log("Success!");
};

const notificationMessage = () => {
  ElNotification({
    title: "Succes!",
    message: h(
      "i",
      {
        style:
          "color: var(--black-100); font-style: normal; font-family: var(--font-family-regular);",
      },
      "Team Rood met speler Jarne is toegevoegd aan de sessie!",
    ),
  });
};

const router = useRouter();

const step = ref(1);
const screenWidth = ref(window.innerWidth);

// Use composables
const {
  activities: apiActivities,
  fetchActivities,
  deleteActivity,
  loading,
} = useActivities();

const { createSession, loading: sessionLoading } = useSessions();

// Use teams composable
const {
  teams: apiTeams,
  fetchTeams,
  fetchTeamsWithPlayers,
  createTeam,
  loading: teamsLoading,
} = useTeams();

// Use players composable
const { createPlayer, loading: playersLoading } = usePlayers();

// Transform API activities to checkbox format
const activities = computed(() => {
  return apiActivities.value.map((activity) => ({
    id: activity.id,
    label: activity.name,
    checked: selectedActivities.value.includes(activity.id),
  }));
});

// Track selected activities
const selectedActivities = ref([]);

// Step 3: Participant mode (teams, players, or teams&players)
const participantMode = ref("teams"); // "teams", "players", "teams&spelers"
const teamName = ref("");
const teamIcon = ref(""); // Emoji name (icon field)
const teamIconDisplay = ref("😊"); // Emoji for display
const playerName = ref("");
const playerIcon = ref(""); // Player emoji name
const playerIconDisplay = ref("😊"); // Player emoji for display
const selectedTeamForPlayer = ref(null);

// Edit mode
const editingTeamId = ref(null);
const editingPlayerId = ref(null);

// Local session teams and players (not yet saved to API)
const sessionTeams = ref([]);
const sessionPlayers = ref([]);
let tempTeamId = 1; // Temporary ID counter for local teams
let tempPlayerId = 1; // Temporary ID counter for local players

// Load from localStorage on mount
function loadFromLocalStorage() {
  try {
    const savedTeams = localStorage.getItem("newSession_teams");
    const savedPlayers = localStorage.getItem("newSession_players");
    const savedTempTeamId = localStorage.getItem("newSession_tempTeamId");
    const savedTempPlayerId = localStorage.getItem("newSession_tempPlayerId");

    if (savedTeams) {
      sessionTeams.value = JSON.parse(savedTeams);
    }
    if (savedPlayers) {
      sessionPlayers.value = JSON.parse(savedPlayers);
    }
    if (savedTempTeamId) {
      tempTeamId = parseInt(savedTempTeamId);
    }
    if (savedTempPlayerId) {
      tempPlayerId = parseInt(savedTempPlayerId);
    }
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
  }
}

// Save to localStorage
function saveToLocalStorage() {
  try {
    localStorage.setItem(
      "newSession_teams",
      JSON.stringify(sessionTeams.value),
    );
    localStorage.setItem(
      "newSession_players",
      JSON.stringify(sessionPlayers.value),
    );
    localStorage.setItem("newSession_tempTeamId", tempTeamId.toString());
    localStorage.setItem("newSession_tempPlayerId", tempPlayerId.toString());
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

// Clear localStorage after successful save
function clearLocalStorage() {
  localStorage.removeItem("newSession_teams");
  localStorage.removeItem("newSession_players");
  localStorage.removeItem("newSession_tempTeamId");
  localStorage.removeItem("newSession_tempPlayerId");
}

// Existing teams from local session (for dropdown)
const existingTeams = computed(() => {
  return sessionTeams.value.map((team) => ({
    id: team.id,
    name: `${team.name} ${team.icon}`,
    players: sessionPlayers.value.filter((p) => p.team_id === team.id),
  }));
});

function next() {
  // Validate based on current step
  if (step.value === 1) {
    // Validate session name
    sessionNameError.value = "";
    if (!sessionName.value.trim()) {
      sessionNameError.value = "Sessie naam is verplicht";
      return;
    }
  }

  if (step.value === 2) {
    // Validate that at least one activity is selected
    if (selectedActivities.value.length === 0) {
      ElNotification({
        title: "Waarschuwing",
        message: "Selecteer minstens één activiteit om verder te gaan",
        type: "warning",
      });
      return;
    }
  }

  if (step.value === 3) {
    // Validate that at least one team or player is added
    if (sessionTeams.value.length === 0 && sessionPlayers.value.length === 0) {
      ElNotification({
        title: "Waarschuwing",
        message: "Voeg minstens één deelnemer toe om verder te gaan",
        type: "warning",
      });
      return;
    }
  }

  step.value++;
}

function back() {
  // Clear validation errors when going back
  sessionNameError.value = "";
  sessionGameTypeError.value = "";
  sessionSportTypeError.value = "";
  selectedTeamError.value = "";
  step.value--;
}

function updateActivityChecked(id, newValue) {
  if (newValue) {
    selectedActivities.value.push(id);
  } else {
    selectedActivities.value = selectedActivities.value.filter(
      (actId) => actId !== id,
    );
  }
}

// Fetch activities on mount
onMounted(async () => {
  // Load teams and players from localStorage
  loadFromLocalStorage();

  // Fetch activities
  try {
    await fetchActivities();

    // Check if we just created a new activity
    if (route.query.newActivityId) {
      const newActivityId = parseInt(route.query.newActivityId);
      if (!selectedActivities.value.includes(newActivityId)) {
        selectedActivities.value.push(newActivityId);
      }

      // Clear the query parameter
      router.replace({ path: route.path, query: {} });
    }
  } catch (e) {
    console.error("Failed to fetch activities:", e);
    ElNotification({
      title: "Fout",
      message: "Kon activiteiten niet ophalen",
      type: "error",
    });
  }
});

// No need to watch for step changes to load teams
// All teams are local to this session

// Watch for route query changes (when coming back from NewActivity)
watch(
  () => route.query.newActivityId,
  async (newActivityId) => {
    if (newActivityId) {
      // Refresh activities list
      await fetchActivities();

      // Auto-select the new activity (without showing notification since NewActivity already showed one)
      const activityId = parseInt(newActivityId);
      if (!selectedActivities.value.includes(activityId)) {
        selectedActivities.value.push(activityId);
      }

      // Clear the query parameter
      router.replace({ path: route.path, query: {} });
    }
  },
);

// Watch for route changes (detect when coming back from edit)
watch(
  () => route.path,
  async (newPath, oldPath) => {
    // If we're returning to /nieuwesessie from /nieuwesessie/nieuwe-activiteit
    if (
      oldPath?.includes("/nieuwe-activiteit") &&
      newPath === "/nieuwesessie"
    ) {
      // Refresh activities list to show any updates
      await fetchActivities();
    }
  },
);

function handleEdit(id) {
  console.log("Edit clicked for activity:", id);
  // Navigate to edit page
  router.push({
    path: "/nieuwesessie/nieuwe-activiteit",
    query: { edit: id },
  });
}

async function handleDelete(id) {
  try {
    await deleteActivity(id);

    ElNotification({
      title: "Succes!",
      message: "Activiteit is verwijderd",
      type: "success",
    });

    // Remove from selected activities if it was selected
    selectedActivities.value = selectedActivities.value.filter(
      (actId) => actId !== id,
    );

    // Refresh activities list
    await fetchActivities();
  } catch (e) {
    ElNotification({
      title: "Fout",
      message: "Kon activiteit niet verwijderen",
      type: "error",
    });
  }
}

// Function to truncate label text based on screen size
function truncateLabel(label, maxLength = 14) {
  // If screen is larger than 700px, show full label
  if (screenWidth.value > 700) {
    return label;
  }
  // Otherwise truncate
  if (label.length > maxLength) {
    return label.substring(0, maxLength) + "...";
  }
  return label;
}

// Function to truncate team names
function truncateTeamName(name, maxLength = 10) {
  if (name.length > maxLength) {
    return name.substring(0, maxLength) + "...";
  }
  return name;
}

// Update screen width on resize
const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", updateScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateScreenWidth);
});

// Save session with selected activities
async function saveSession() {
  // Clear previous errors
  sessionNameError.value = "";

  // Validate session name
  if (!sessionName.value.trim()) {
    sessionNameError.value = "Sessie naam is verplicht";
    return;
  }

  if (selectedActivities.value.length === 0) {
    ElNotification({
      title: "Waarschuwing",
      message: "Geen activiteiten geselecteerd",
      type: "warning",
    });
    return;
  }

  try {
    // 1. Create session with 'setup' status (not active yet)
    const newSession = await createSession({
      name: sessionName.value,
      total_rounds: sessionTotalRounds.value,
      time_limit: sessionTimeLimit.value,
      scoring_mode: sessionScoringMode.value,
      status: "setup", // Session is saved but not started yet
    });

    console.log("✅ Sessie aangemaakt:", newSession);

    // Store the created session ID for navigation
    createdSessionId.value = newSession.id;

    // 2. Create teams and link them to session
    const teamIdMapping = {}; // Map temp IDs to real API IDs

    for (const team of sessionTeams.value) {
      try {
        let createdTeam;

        // Try to create team
        try {
          createdTeam = await createTeam({
            name: team.name,
            color: team.color,
            icon: team.icon,
            description: "",
          });
          console.log("✅ Team aangemaakt:", createdTeam);
        } catch (createError) {
          // If team already exists, fetch all teams and find the existing one
          if (
            createError.message &&
            createError.message.includes("already exists")
          ) {
            console.log(
              `⚠️ Team "${team.name}" bestaat al, bestaand team wordt gebruikt`,
            );

            // Fetch all teams to find the existing one
            const allTeams = await fetchTeams();
            const existingTeam = allTeams.find((t) => t.name === team.name);

            if (existingTeam) {
              createdTeam = existingTeam;
              console.log("✅ Bestaand team gevonden:", createdTeam);
            } else {
              throw new Error(
                `Team "${team.name}" bestaat maar kon niet worden gevonden`,
              );
            }
          } else {
            throw createError;
          }
        }

        // Map temporary ID to real API ID
        teamIdMapping[team.id] = createdTeam.id;

        // Link team to session using add-team endpoint
        const addTeamResponse = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${newSession.id}/add-team`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              team_id: createdTeam.id,
            }),
          },
        );

        if (!addTeamResponse.ok) {
          const errorText = await addTeamResponse.text();
          throw new Error(`Failed to add team to session: ${errorText}`);
        }

        console.log(
          `✅ Team ${createdTeam.id} gekoppeld aan sessie ${newSession.id}`,
        );
      } catch (error) {
        console.error("❌ Failed to create or link team:", error);
        throw error;
      }
    }

    // 3. Create all players and link them to session via session_players
    for (const player of sessionPlayers.value) {
      try {
        const realTeamId = teamIdMapping[player.team_id];
        if (realTeamId) {
          // Create player AND link to session in one API call
          await fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${newSession.id}/teams/${realTeamId}/players`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: player.name,
                team_id: realTeamId,
                position: player.position, // Send as 'position' to match backend model
              }),
            },
          );

          console.log(
            `✅ Speler ${player.name} aangemaakt en gekoppeld aan sessie ${newSession.id} en team ${realTeamId}`,
          );
        }
      } catch (error) {
        console.error("❌ Failed to create and link player:", error);
        throw error;
      }
    }

    // 4. Create activities for this session (gebaseerd op geselecteerde templates)
    const createdActivities = [];
    for (const activityId of selectedActivities.value) {
      try {
        // Find the activity template data
        const activityTemplate = apiActivities.value.find(
          (a) => a.id === activityId,
        );

        if (!activityTemplate) {
          console.warn(
            `⚠️ Activity template ${activityId} not found, skipping`,
          );
          continue;
        }

        // Create new activity for this session based on template
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/sessions/${newSession.id}/activities`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: newSession.id,
              name: activityTemplate.name,
              sport_type: activityTemplate.sport_type || "custom",
              game_type: activityTemplate.game_type || "custom",
              scoring_mode: activityTemplate.scoring_mode || "team",
              time_winner: activityTemplate.time_winner || "lower",
              aggregate_player_times:
                activityTemplate.aggregate_player_times || false,
              total_rounds: activityTemplate.total_rounds || 1,
              time_limit_per_round:
                activityTemplate.time_limit_per_round || null,
              description: activityTemplate.description || null,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const createdActivity = await response.json();
        createdActivities.push(createdActivity);

        console.log(
          `✅ Activiteit "${activityTemplate.name}" aangemaakt voor sessie ${newSession.id}`,
        );
      } catch (error) {
        console.error("❌ Failed to create activity:", error);
        throw error;
      }
    }

    console.log(
      `✅ ${createdActivities.length} activiteiten aangemaakt voor sessie`,
    );

    // Clear localStorage after successful save
    clearLocalStorage();

    // Open success modal
    openSuccessModal();
  } catch (e) {
    ElNotification({
      title: "Fout",
      message: "Kon sessie niet opslaan: " + (e.message || "Onbekende fout"),
      type: "error",
    });
  }
}

// Handle emoji selection from FeaturePicker
function handleTeamEmojiSelect(emoji) {
  teamIcon.value = emoji.n || ""; // Store emoji name
  teamIconDisplay.value = emoji.i || "😊"; // Store emoji display
}

function handlePlayerEmojiSelect(emoji) {
  playerIcon.value = emoji.n || "";
  playerIconDisplay.value = emoji.i || "😊";
}

// Convert icon name to emoji for display
// Since we're now storing the actual emoji in the icon field,
// we can just return it directly
function getEmojiFromIcon(icon) {
  return icon || "😊";
}

// Add team function (local only, not saved to API yet)
async function addTeam() {
  if (!teamName.value.trim()) {
    ElNotification({
      title: "Waarschuwing",
      message: "Voer een team naam in",
      type: "warning",
    });
    return;
  }

  if (editingTeamId.value) {
    // Update existing team
    const teamIndex = sessionTeams.value.findIndex(
      (t) => t.id === editingTeamId.value,
    );
    if (teamIndex !== -1) {
      sessionTeams.value[teamIndex] = {
        ...sessionTeams.value[teamIndex],
        name: teamName.value,
        icon: teamIconDisplay.value || "😊",
      };

      ElNotification({
        title: "Succes!",
        message: `Team "${teamName.value}" is bijgewerkt!`,
        type: "success",
      });
    }
    editingTeamId.value = null;
  } else {
    // Add new team
    const newTeam = {
      id: `temp-${tempTeamId++}`, // Temporary ID
      name: teamName.value,
      color: "#ffffff",
      icon: teamIconDisplay.value || "😊",
    };

    sessionTeams.value.push(newTeam);

    ElNotification({
      title: "Succes!",
      message: `Team "${teamName.value}" is toegevoegd!`,
      type: "success",
    });
  }

  // Save to localStorage
  saveToLocalStorage();

  // Clear inputs
  teamName.value = "";
  teamIcon.value = "";
  teamIconDisplay.value = "😊";
}

// Edit team function
function editTeam(teamId) {
  const team = sessionTeams.value.find((t) => t.id === teamId);
  if (team) {
    editingTeamId.value = teamId;
    teamName.value = team.name;
    teamIconDisplay.value = team.icon;
    teamIcon.value = team.icon;
  }
}

// Delete team function
function deleteTeam(teamId) {
  const team = sessionTeams.value.find((t) => t.id === teamId);
  if (team) {
    // Remove team
    sessionTeams.value = sessionTeams.value.filter((t) => t.id !== teamId);

    // Remove all players from this team
    sessionPlayers.value = sessionPlayers.value.filter(
      (p) => p.team_id !== teamId,
    );

    // Save to localStorage
    saveToLocalStorage();

    ElNotification({
      title: "Succes!",
      message: `Team "${team.name}" is verwijderd!`,
      type: "success",
    });

    // Clear form if we were editing this team
    if (editingTeamId.value === teamId) {
      editingTeamId.value = null;
      teamName.value = "";
      teamIcon.value = "";
      teamIconDisplay.value = "😊";
    }
  }
}

// Cancel edit
function cancelEdit() {
  editingTeamId.value = null;
  editingPlayerId.value = null;
  teamName.value = "";
  teamIcon.value = "";
  teamIconDisplay.value = "😊";
  playerName.value = "";
  playerIcon.value = "";
  playerIconDisplay.value = "😊";
  selectedTeamForPlayer.value = null;
  selectedTeamError.value = "";
}

// Add player to team function (local only, not saved to API yet)
async function addPlayerToTeam() {
  // Clear previous error
  selectedTeamError.value = "";

  if (!selectedTeamForPlayer.value) {
    selectedTeamError.value = "Kies eerst een team";
    return;
  }

  if (!playerName.value.trim()) {
    ElNotification({
      title: "Waarschuwing",
      message: "Voer een speler naam in",
      type: "warning",
    });
    return;
  }

  const teamNameForMessage = sessionTeams.value.find(
    (t) => t.id === selectedTeamForPlayer.value,
  )?.name;

  if (editingPlayerId.value) {
    // Update existing player
    const playerIndex = sessionPlayers.value.findIndex(
      (p) => p.id === editingPlayerId.value,
    );
    if (playerIndex !== -1) {
      sessionPlayers.value[playerIndex] = {
        ...sessionPlayers.value[playerIndex],
        name: playerName.value,
        team_id: selectedTeamForPlayer.value,
        position: playerIconDisplay.value || "😊",
      };

      ElNotification({
        title: "Succes!",
        message: `Speler "${playerName.value}" is bijgewerkt!`,
        type: "success",
      });
    }
    editingPlayerId.value = null;
  } else {
    // Add new player
    const newPlayer = {
      id: `temp-${tempPlayerId++}`, // Temporary ID
      name: playerName.value,
      team_id: selectedTeamForPlayer.value,
      position: playerIconDisplay.value || "😊",
    };

    sessionPlayers.value.push(newPlayer);

    ElNotification({
      title: "Succes!",
      message: `Speler "${playerName.value}" is toegevoegd aan ${teamNameForMessage || "het team"}!`,
      type: "success",
    });
  }

  // Save to localStorage
  saveToLocalStorage();

  // Clear inputs
  playerName.value = "";
  playerIcon.value = "";
  playerIconDisplay.value = "😊";
}

// Edit player function
function editPlayer(playerId) {
  const player = sessionPlayers.value.find((p) => p.id === playerId);
  if (player) {
    editingPlayerId.value = playerId;
    playerName.value = player.name;
    playerIconDisplay.value = player.position;
    playerIcon.value = player.position;
    selectedTeamForPlayer.value = player.team_id;
  }
}

// Delete player function
function deletePlayer(playerId) {
  const player = sessionPlayers.value.find((p) => p.id === playerId);
  if (player) {
    // Remove player
    sessionPlayers.value = sessionPlayers.value.filter(
      (p) => p.id !== playerId,
    );

    // Save to localStorage
    saveToLocalStorage();

    ElNotification({
      title: "Succes!",
      message: `Speler "${player.name}" is verwijderd!`,
      type: "success",
    });

    // Clear form if we were editing this player
    if (editingPlayerId.value === playerId) {
      editingPlayerId.value = null;
      playerName.value = "";
      playerIcon.value = "";
      playerIconDisplay.value = "😊";
      selectedTeamForPlayer.value = null;
    }
  }
}
</script>

<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <!-- Show nested route content if exists, otherwise show NewSession content -->
      <RouterView v-slot="{ Component }">
        <component :is="Component" v-if="Component" />
        <div v-else class="layout-page-new-session">
          <div v-if="step === 1" class="button-back-container">
            <GenericButton
              class="generic-button--quaternary"
              @click="router.back"
            >
              <ChevronLeft class="icon--quaternary" />Terug
            </GenericButton>
          </div>
          <div class="bar-container">
            <GenericStepBar :steps="4" :current-step="step" />
          </div>
          <div class="step-content step-content--step1" v-if="step === 1">
            <div>
              <h3><span>Sessie</span> instellen</h3>
              <GenericInput
                v-model="sessionName"
                label="Sessie naam"
                placeholder="Voer sessie naam in"
                :error="sessionNameError"
              />
            </div>
            <div class="button-group button-group--step1">
              <GenericButton variant="primary" @click="next"
                >Volgende <ChevronRight
              /></GenericButton>
            </div>
          </div>

          <div class="step-content step-content--step2" v-else-if="step === 2">
            <div>
              <div>
                <h3><span>Activiteit</span> toevoegen</h3>
              </div>
              <div class="section-new-activity">
                <h4>Nieuw activiteit maken</h4>
                <RouterLink
                  class="router-link"
                  to="/nieuwesessie/nieuwe-activiteit"
                >
                  <GenericButton variant="primary"
                    ><Plus class="icon--quaternary" />Nieuw
                    activiteit</GenericButton
                  >
                </RouterLink>
              </div>
              <div>
                <h4>Of selecteer een bestaande activiteit</h4>

                <!-- Loading state -->
                <div v-if="loading" class="loading-message">
                  <p>Activiteiten laden...</p>
                </div>

                <!-- Empty state -->
                <div v-else-if="activities.length === 0" class="empty-message">
                  <p>Geen activiteiten gevonden. Maak er een aan!</p>
                </div>

                <!-- Activities list -->
                <div v-else class="checkbox-list">
                  <GenericCheckbox
                    v-for="activity in activities"
                    :key="activity.id"
                    :label="truncateLabel(activity.label)"
                    :modelValue="activity.checked"
                    deleteMessage="Bent u zeker dat u deze activiteit wilt verwijderen?"
                    @update:modelValue="
                      updateActivityChecked(activity.id, $event)
                    "
                    @edit="handleEdit(activity.id)"
                    @delete="handleDelete(activity.id)"
                    :id="`checkbox-${activity.id}`"
                  />
                </div>
              </div>
            </div>
            <div class="button-group button-group--step3">
              <GenericButton variant="secondary" @click="back"
                ><ChevronLeft /> Vorige</GenericButton
              >
              <GenericButton variant="primary" @click="next"
                >Volgende <ChevronRight
              /></GenericButton>
            </div>
          </div>

          <div class="step-content" v-else-if="step === 3">
            <div>
              <h3><span>Deelnemers</span> toevoegen</h3>

              <!-- Toggle to choose participant mode -->
              <div class="participant-mode-toggle">
                <GenericToggle v-model="participantMode" />
              </div>

              <!-- Form for Teams mode -->
              <div v-if="participantMode === 'teams'" class="participant-form">
                <div class="form-input-group">
                  <GenericInput
                    v-model="teamName"
                    label="Team naam"
                    placeholder="Voer team naam in"
                  />
                  <FeaturePicker @select="handleTeamEmojiSelect" />
                </div>
                <div class="button-form-group">
                  <GenericButton variant="primary" @click="addTeam">
                    {{ editingTeamId ? "Team bijwerken" : "Team toevoegen" }}
                  </GenericButton>
                  <GenericButton
                    v-if="editingTeamId"
                    variant="secondary"
                    @click="cancelEdit"
                  >
                    Annuleren
                  </GenericButton>
                </div>
              </div>

              <!-- Form for Teams & Players mode -->
              <div
                v-else-if="participantMode === 'teams&spelers'"
                class="participant-form"
              >
                <div v-if="existingTeams.length === 0" class="info-message">
                  <p>
                    ⚠️ Voeg eerst een team toe voordat je spelers kunt toevoegen
                  </p>
                </div>
                <div class="form-input-group">
                  <GenericDropdown
                    v-model="selectedTeamForPlayer"
                    label="Selecteer team"
                    :placeholder="
                      existingTeams.length > 0
                        ? 'Kies een team'
                        : 'Er zijn nog geen teams'
                    "
                    :options="
                      existingTeams.map((t) => ({ value: t.id, label: t.name }))
                    "
                    :error="selectedTeamError"
                    @update:modelValue="selectedTeamError = ''"
                  />
                </div>
                <div class="form-input-group">
                  <GenericInput
                    v-model="playerName"
                    label="Speler naam"
                    placeholder="Voer speler naam in"
                  />
                  <FeaturePicker @select="handlePlayerEmojiSelect" />
                </div>
                <div class="button-form-group">
                  <GenericButton variant="primary" @click="addPlayerToTeam">
                    {{
                      editingPlayerId
                        ? "Speler bijwerken"
                        : "Speler aan team toevoegen"
                    }}
                  </GenericButton>
                  <GenericButton
                    v-if="editingPlayerId"
                    variant="secondary"
                    @click="cancelEdit"
                  >
                    Annuleren
                  </GenericButton>
                </div>
              </div>

              <!-- Display existing participants -->
              <div class="existing-participants">
                <h4>Deelnemers voor deze sessie:</h4>

                <!-- Unified layout for both modes -->
                <div class="teams-with-players-layout">
                  <div v-if="sessionTeams.length > 0" class="teams-container">
                    <div
                      v-for="team in sessionTeams"
                      :key="team.id"
                      class="team-container"
                      :class="{
                        'has-players':
                          sessionPlayers.filter((p) => p.team_id === team.id)
                            .length > 0,
                      }"
                    >
                      <div class="activity-item-with-actions team-item-fixed">
                        <span
                          >{{ truncateTeamName(team.name) }}
                          {{ team.icon }}</span
                        >
                        <div class="item-actions">
                          <button
                            @click="editTeam(team.id)"
                            class="action-button"
                          >
                            <Pencil :size="16" />
                          </button>
                          <button
                            @click="deleteTeam(team.id)"
                            class="action-button action-button--delete"
                          >
                            <Trash2 :size="16" />
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="
                          sessionPlayers.filter((p) => p.team_id === team.id)
                            .length > 0
                        "
                        class="activity-container"
                      >
                        <div
                          v-for="player in sessionPlayers.filter(
                            (p) => p.team_id === team.id,
                          )"
                          :key="player.id"
                          class="activity-container-item-with-actions"
                        >
                          <span>{{ player.name }} {{ player.position }}</span>
                          <div class="item-actions">
                            <button
                              @click="editPlayer(player.id)"
                              class="action-button"
                            >
                              <Pencil :size="14" />
                            </button>
                            <button
                              @click="deletePlayer(player.id)"
                              class="action-button action-button--delete"
                            >
                              <Trash2 :size="16" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-message">
                    <p>Nog geen teams toegevoegd</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="button-group button-group--step3">
              <GenericButton variant="secondary" @click="back"
                ><ChevronLeft /> Vorige</GenericButton
              >
              <GenericButton variant="primary" @click="next"
                >Volgende <ChevronRight
              /></GenericButton>
            </div>
          </div>

          <div class="step-content" v-else-if="step === 4">
            <div>
              <h2><span>Sessie</span> overzicht</h2>
              <h4 class="stap4-subtitle">
                Sessie naam: <span>{{ sessionName || "Geen naam" }}</span>
              </h4>
              <div class="section-overview-content">
                <div>
                  <h4 class="stap4-subtitle">Activiteiten:</h4>
                  <div class="activity-container">
                    <template v-if="selectedActivities.length > 0">
                      <p
                        v-for="activityId in selectedActivities"
                        :key="activityId"
                        class="activity-container-item"
                      >
                        {{
                          apiActivities.find((a) => a.id === activityId)
                            ?.name || "Onbekend"
                        }}
                      </p>
                    </template>
                    <p v-else class="activity-container-item">
                      Geen activiteiten geselecteerd
                    </p>
                  </div>
                </div>
                <div>
                  <h4 class="stap4-subtitle">Deelnemers:</h4>

                  <!-- Teams with players display -->
                  <div class="teams-container">
                    <div
                      v-for="team in sessionTeams"
                      :key="team.id"
                      class="team-container"
                    >
                      <p class="activity-item">
                        {{ team.name }} {{ team.icon }}
                      </p>
                      <div
                        v-if="
                          sessionPlayers.filter((p) => p.team_id === team.id)
                            .length > 0
                        "
                        class="activity-container"
                      >
                        <p
                          v-for="player in sessionPlayers.filter(
                            (p) => p.team_id === team.id,
                          )"
                          :key="player.id"
                          class="activity-container-item"
                        >
                          {{ player.name }} {{ player.position }}
                        </p>
                      </div>
                    </div>
                    <p
                      v-if="sessionTeams.length === 0"
                      class="activity-container-item"
                    >
                      Geen teams toegevoegd
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="button-group">
              <GenericButton
                variant="secondary"
                @click="back"
                :disabled="sessionLoading"
                ><ChevronLeft /> Vorige</GenericButton
              >
              <GenericButton
                @click="saveSession"
                variant="primary"
                :disabled="sessionLoading"
              >
                {{ sessionLoading ? "Bezig..." : "Opslaan" }}
              </GenericButton>
              <GenericModel
                ref="successModalRef"
                icon="circle-check"
                iconColor="var(--green-100)"
                message="Sessie is opgeslaan! Wilt u de sessie nu starten?"
                confirmText="Ja, start sessie"
                cancelText="Nee, later"
                :showCancel="true"
                @confirm="handleConfirm"
                @cancel="handleCancel"
              />
            </div>
          </div>
        </div>
      </RouterView>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>

<style scoped>
.teams-met-spelers-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.team-met-spelers-container {
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

.spelers-title {
  margin-bottom: var(--space-4);
}

.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

h3 {
  & span {
    color: var(--blue-100);
  }
  margin-bottom: var(--space-6);
}
h4 {
  margin-bottom: var(--space-5);
}

.layout-page-new-session {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.layout-page-new-session::-webkit-scrollbar {
  display: none;
}

.section-teams-toevoegen {
  margin-bottom: var(--space-5);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  /* padding-bottom: var(--space-8); */
  justify-content: space-between;
  flex: 1;
  min-height: calc(100vh - 12rem);
}

.button-group {
  display: flex;
  justify-content: space-between;
  bottom: 0;
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
  margin-top: auto;
  z-index: 50;
}
.button-group--step1 {
  justify-content: flex-end;
}

.button-back-container {
  /* min-height: 2rem;  */
  display: flex;
  align-items: center;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-4) 0 0;
  border: 1px solid var(--black-20, #e0e0e0);
}

.section-new-activity {
  margin-bottom: var(--space-7);
}

/* Step 3: Participant forms */
.participant-mode-toggle {
  margin-bottom: var(--space-6);
}

.participant-form {
  margin-bottom: var(--space-7);
}

.info-message {
  padding: var(--space-4);
  background-color: var(--orange-40, #ffe9c7);
  border: 1px solid var(--orange-100, #ffa620);
  border-radius: var(--radius-M);
  margin-bottom: var(--space-5);
}

.info-message p {
  color: var(--black-90);
  font-size: var(--font-size-M);
  margin: 0;
}

.button-form-group {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.form-input-group {
  display: flex;
  flex-direction: row;
  gap: var(--space-5);
  align-items: end;
  margin-bottom: var(--space-5);
}

.form-input-group :deep(.generic-input) {
  flex: 1;
}

.form-input-group :deep(.generic-dropdown) {
  flex: 1;
}

.existing-participants {
  margin-top: var(--space-7);
}

.simple-list {
  margin-top: var(--space-4);
}

.teams-with-players-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-top: var(--space-4);
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
  align-items: flex-start;
  padding-bottom: var(--space-4);

  & .team-item-fixed {
    width: 200px;
    min-width: 200px;
    flex-shrink: 0;
  }

  & .activity-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    flex: 1;

    & > * {
      flex: 1 1 calc(45%);
      min-width: 120px;
      box-sizing: border-box;
    }
  }
}

/* Old styling - can be removed if not used elsewhere */
.team-with-players-item {
  border: 1px solid var(--black-20);
  border-radius: var(--radius-L);
  padding: var(--space-5);
}

.team-title {
  font-size: var(--font-size-L);
  font-weight: bold;
  color: var(--blue-100);
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  background-color: var(--blue-20);
  border-radius: var(--radius-M);
  width: fit-content;
}

.players-section {
  margin-top: var(--space-4);
}

.players-subtitle {
  font-size: var(--font-size-M);
  font-weight: 600;
  margin-bottom: var(--space-3);
  color: var(--black-80);
}

.input-stap-3 {
  display: flex;
  gap: var(--space-5);
  align-items: end;
}

.input-stap-3 :deep(.generic-input:nth-child(2)) {
  flex: 0 0 25%;
}

.session-name-overview {
  font-size: var(--font-size-M);
  font-size: 1.25rem;
  margin-bottom: 2rem;
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

.activity-container-item-with-actions {
  padding: var(--space-4);
  border: 1px solid var(--black-40);
  border-radius: var(--radius-M);
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.activity-item-with-actions {
  padding: var(--space-4);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-M);
  width: fit-content;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.item-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-S);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--blue-100);
}

.action-button:hover {
  color: var(--blue-60);
}

.action-button--delete {
  color: var(--red-100, #ef4444);
}

.action-button--delete:hover {
  color: var(--red-60);
}

/* @media (width >= 64rem) {
  .checkbox-list {
    max-height: 25rem;
  }
} */

.stap-3-input-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.button-add-team {
  margin-top: var(--space-5);
}

.stap4-subtitle {
  font-size: var(--font-size-L);
  margin-bottom: var(--space-3);
}

.section-overview-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.loading-message,
.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
  color: var(--black-70);
  border: 1px solid var(--black-20);
  border-radius: var(--radius-L);
  min-height: 10rem;
}

@media (width <= 26.5625rem) {
  .checkbox-list-teams {
    max-height: calc(100vh - 10rem);
  }

  .checkbox-list {
    max-height: calc(100vh - 32rem);
  }
}
</style>
