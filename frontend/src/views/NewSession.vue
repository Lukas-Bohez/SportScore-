<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import { ref, computed, onMounted, onUnmounted, h } from "vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericCheckbox from "@/components/Generic/GenericCheckbox.vue";
import FeaturePicker from "@/components/features/FeaturePicker.vue";
import { ElNotification } from "element-plus";
import GenericModel from "@/components/Generic/GenericModel.vue";

const modalRef = ref(null);
const successModalRef = ref(null);

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

// Activities data with individual checked state
const activities = ref([
  { id: 1, label: "Rood ", checked: false },
  { id: 2, label: "Rood ", checked: false },
  { id: 3, label: "Rood ", checked: false },
  { id: 4, label: "Rood ", checked: false },
  { id: 5, label: "Rood ", checked: false },
  { id: 6, label: "Rood ", checked: false },
  { id: 7, label: "Rood ", checked: false },
  { id: 8, label: "Rood ", checked: false },
]);

const teams = ref([
  { id: 1, label: "Rood ", checked: false },
  { id: 2, label: "Rood ", checked: false },
  { id: 3, label: "Rood ", checked: false },
  { id: 4, label: "Rood ", checked: false },
  { id: 5, label: "Rood ", checked: false },
  { id: 6, label: "Rood ", checked: false },
  { id: 7, label: "Rood ", checked: false },
  { id: 8, label: "Rood ", checked: false },
]);

function next() {
  step.value++;
}

function back() {
  step.value--;
}

function updateActivityChecked(id, newValue) {
  const activity = activities.value.find((a) => a.id === id);
  if (activity) {
    activity.checked = newValue;
  }
}

function updateTeamChecked(id, newValue) {
  const team = teams.value.find((t) => t.id === id);
  if (team) {
    team.checked = newValue;
  }
}

function handleEdit(id) {
  console.log("Edit clicked for activity:", id);
  // Navigate to edit page - je kan dit later aanpassen naar je edit route
  // Bijvoorbeeld: router.push(`/nieuwesessie/edit-activiteit/${id}`);
  router.push({
    path: "/nieuwesessie/nieuwe-activiteit",
    query: { edit: id },
  });
}

function handleDelete(id) {
  console.log("Delete clicked for activity:", id);
  // Implement delete logic here
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
                label="Sessie naam"
                placeholder="Voer sessie naam in"
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
                <!-- <GenericDropdown
                  :options="[
                    { label: 'Activiteit 1', value: 1 },
                    { label: 'Activiteit 2', value: 2 },
                    { label: 'Activiteit 3', value: 3 },
                  ]"
                  label="Selecteer activiteit"
                  placeholder="Kies een activiteit"
                /> -->
                <div class="checkbox-list">
                  <GenericCheckbox
                    v-for="activity in activities"
                    :key="activity.id"
                    :label="truncateLabel(activity.label)"
                    :checked="activity.checked"
                    deleteMessage="Bent u zeker dat u deze activiteit wilt verwijderen?"
                    @update:checked="updateActivityChecked(activity.id, $event)"
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
              <h3><span>Sessie</span> overzicht</h3>
              <h4 class="stap4-subtitle">
                Sessie naam: <span>Team Building Dag 2025</span>
              </h4>
              <div class="section-overview-content">
                <div>
                  <h4 class="stap4-subtitle">Activiteiten:</h4>
                  <div class="activity-container">
                    <p class="activity-item">Voetbal ⚽️</p>
                    <p class="activity-item">Basketbal 🏀</p>
                    <p class="activity-item">Tennis 🎾</p>
                  </div>
                </div>
                <div>
                  <h4 class="stap4-subtitle">Deelnemers:</h4>
                  <div class="teams-ocntainer">
                    <div class="team-container">
                      <p class="activity-item">Team A 😑</p>
                      <div class="activity-container">
                        <p class="activity-item">speler A 😁</p>
                        <p class="activity-item">speler B 🤣</p>
                        <p class="activity-item">speler C 🤣</p>
                        <p class="activity-item">speler D 🤣</p>
                      </div>
                    </div>
                    <div class="team-container">
                      <p class="activity-item">Team B 😂</p>
                      <div class="activity-container">
                        <p class="activity-item">speler A 😁</p>
                        <p class="activity-item">speler B 🤣</p>
                        <p class="activity-item">speler C 🤣</p>
                        <p class="activity-item">speler D 🤣</p>
                      </div>
                    </div>
                    <div class="team-container">
                      <p class="activity-item">Team B 😂</p>
                      <div class="activity-container">
                        <p class="activity-item">speler A 😁</p>
                        <p class="activity-item">speler B 🤣</p>
                        <p class="activity-item">speler C 🤣</p>
                        <p class="activity-item">speler D 🤣</p>
                      </div>
                    </div>
                    <div class="team-container">
                      <p class="activity-item">Team B 😂</p>
                      <div class="activity-container">
                        <p class="activity-item">speler A 😁</p>
                        <p class="activity-item">speler B 🤣</p>
                        <p class="activity-item">speler C 🤣</p>
                        <p class="activity-item">speler D 🤣</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="button-group">
              <GenericButton variant="secondary" @click="back"
                ><ChevronLeft /> Vorige</GenericButton
              >
              <GenericButton @click="openSuccessModal" variant="primary"
                >Opslaan</GenericButton
              >
              <!-- <GenericModel
                ref="successModalRef"
                icon="circle-check"
                iconColor="var(--green-100)"
                message="Sessie is opgeslaan! Wilt u de sessie starten?"
                confirmText="Ja"
                :showCancel="false"
                @confirm="handleConfirm"
                @cancel="handleCancel"
              /> -->
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
.teams-ocntainer {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
.team-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  & p {
    display: inline-block;
  }
  & div {
    display: flex;
    gap: var(--space-3);
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
  margin-bottom: var(--space-5);
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

  &P {
    padding: var(--space-4);
    border: 1px solid var(--black-100);
    border-radius: var(--radius-M);
  }
}

.activity-item {
  padding: var(--space-4);
  border: 1px solid var(--blue-100);
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

@media (width <= 26.5625rem) {
  .checkbox-list-teams {
    max-height: calc(100vh - 10rem);
  }

  .checkbox-list {
    max-height: calc(100vh - 32rem);
  }
}
</style>
