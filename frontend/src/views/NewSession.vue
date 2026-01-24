<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import { ref, computed, onMounted, onUnmounted, h, watch } from "vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericCheckbox from "@/components/Generic/GenericCheckbox.vue";
import FeaturePicker from "@/components/features/FeaturePicker.vue";
import { ElNotification } from "element-plus";
import GenericModel from "@/components/Generic/GenericModel.vue";
import { useActivities, useSessions } from "@/composables";
import { useRoute } from "vue-router";

const modalRef = ref(null);
const successModalRef = ref(null);
const route = useRoute();

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

const openSuccessModal = () => {
  successModalRef.value.open();
};

const handleConfirm = () => {
  console.log("Bevestigd!");
  // Navigate to sessie beheren page
  router.push("/sessionmanagment");
};

const handleCancel = () => {
  router.push("/homepage");
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

const teams = ref([
  { id: 1, label: "Team Rood 🔴", checked: false },
  { id: 2, label: "Team Blauw 🔵", checked: false },
  { id: 3, label: "Team Groen 🟢", checked: false },
  { id: 4, label: "Team Geel 🟡", checked: false },
  { id: 5, label: "Team Oranje 🟠", checked: false },
  { id: 6, label: "Team Paars 🟣", checked: false },
  { id: 7, label: "Team Zwart ⚫", checked: false },
  { id: 8, label: "Team Wit ⚪", checked: false },
]);

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

  step.value++;
}

function back() {
  // Clear validation errors when going back
  sessionNameError.value = "";
  sessionGameTypeError.value = "";
  sessionSportTypeError.value = "";
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

function updateTeamChecked(id, newValue) {
  const team = teams.value.find((t) => t.id === id);
  if (team) {
    team.checked = newValue;
  }
}

// Fetch activities on mount
onMounted(async () => {
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
    ElNotification({
      title: "Fout",
      message: "Kon activiteiten niet ophalen",
      type: "error",
    });
  }
});

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
function truncateLabel(label, maxLength = 16) {
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
  sessionGameTypeError.value = "";
  sessionSportTypeError.value = "";

  // Validate all required fields
  let hasError = false;

  if (!sessionName.value.trim()) {
    sessionNameError.value = "Sessie naam is verplicht";
    hasError = true;
  }

  if (!sessionGameType.value || sessionGameType.value === "custom") {
    sessionGameTypeError.value = "Game type is verplicht";
    hasError = true;
  }

  if (!sessionSportType.value || sessionSportType.value === "custom") {
    sessionSportTypeError.value = "Sport type is verplicht";
    hasError = true;
  }

  if (hasError) {
    return;
  }

  if (selectedActivities.value.length === 0) {
    ElNotification({
      title: "Waarschuwing",
      message: "Geen activiteiten geselecteerd",
      type: "warning",
    });
  }

  try {
    // Create session with selected activities
    await createSession(
      {
        name: sessionName.value,
        game_type: sessionGameType.value,
        sport_type: sessionSportType.value,
        scoring_mode: sessionScoringMode.value,
        total_rounds: sessionTotalRounds.value,
        time_limit: sessionTimeLimit.value,
        show_players: sessionShowPlayers.value,
      },
      selectedActivities.value, // Pass selected activity IDs
    );

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

          <div class="step-content" v-else-if="step === 2">
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
            <div class="button-group">
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
              <div class="section-teams-toevoegen">
                <h3><span>Deelnemers</span> toevoegen</h3>
                <div class="stap-3-input-container">
                  <div class="input-stap-3">
                    <GenericInput
                      label="Team naam"
                      placeholder="Voer team naam in"
                    />
                    <FeaturePicker></FeaturePicker>
                  </div>
                  <div class="input-stap-3">
                    <GenericInput
                      label="Speler naam"
                      placeholder="Voer speler naam in"
                    />
                    <FeaturePicker></FeaturePicker>
                  </div>
                </div>
                <div>
                  <GenericButton
                    class="button-add-team"
                    variant="primary"
                    @click="notificationMessage()"
                    >Deelnemer toevoegen</GenericButton
                  >
                </div>
              </div>
              <div>
                <h4>Of selecteer een bestaande Deelnemers</h4>
                <!-- <GenericDropdown
                  :options="[
                    { label: 'Activiteit 1', value: 1 },
                    { label: 'Activiteit 2', value: 2 },
                    { label: 'Activiteit 3', value: 3 },
                  ]"
                  label="Selecteer activiteit"
                  placeholder="Kies een activiteit"
                /> -->
                <div class="checkbox-list checkbox-list-teams">
                  <GenericCheckbox
                    v-for="team in teams"
                    :key="team.id"
                    :label="truncateLabel(team.label)"
                    :checked="team.checked"
                    @update:checked="updateTeamChecked(team.id, $event)"
                    deleteMessage="Bent u zeker dat u deze team wilt verwijderen?"
                    @edit="handleEdit(team.id)"
                    @delete="handleDelete(team.id)"
                    :id="`checkbox-${team.id}`"
                  />
                </div>
              </div>
            </div>
            <div class="button-group">
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
                  <div class="teams-container">
                    <div
                      v-for="team in teams.filter((t) => t.checked)"
                      :key="team.id"
                      class="team-container"
                    >
                      <p class="activity-item">{{ team.label }}</p>
                      <div class="activity-container">
                        <p class="activity-container-item">
                          Nog geen spelers toegevoegd
                        </p>
                      </div>
                    </div>
                    <p
                      v-if="!teams.some((t) => t.checked)"
                      class="activity-container-item"
                    >
                      Geen teams geselecteerd
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
                message="Sessie is opgeslaan! Wilt u de sessie starten?"
                confirmText="Ja"
                :showCancel="false"
                @confirm="handleConfirm"
              />
            </div>
          </div>
        </div>
      </RouterView>
    </div>
    <div class="nav-container">
      <GenericNav />
    </div>
  </div>
</template>

<style scoped>
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
}

.section-teams-toevoegen {
  margin-bottom: var(--space-5);
}

.step-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100vh - 10.5rem);
  /* padding-bottom: var(--space-8); */
}

.step-content--step1 {
  height: calc(100vh - 12rem);
}
.button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
  margin-bottom: 0.7rem;
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
  overflow-y: auto;
  max-height: calc(100vh - 30rem);
  padding: 0 var(--space-4) 0 0;
  border: 1px solid var(--black-20, #e0e0e0);
}

.checkbox-list-teams {
  max-height: calc(100vh - 39rem);
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

.section-new-activity {
  margin-bottom: var(--space-7);
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
