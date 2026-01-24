<script setup>
import GenericButton from "@/components/Generic/GenericButton.vue";
import { ChevronLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericToggle from "@/components/Generic/GenericToggle.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import { ref, onMounted } from "vue";
import { useActivities } from "@/composables";
import { ElNotification } from "element-plus";
import { useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const { createActivity, updateActivity, fetchActivity, loading, error } =
  useActivities();

// Check if we're in edit mode
const isEditMode = ref(false);
const editActivityId = ref(null);

// Form data
const activityName = ref("");
const scoringMode = ref("team"); // "team", "team_with_players", or "player"
const selectedGameType = ref("");
const selectedSportStyle = ref("");
const numberOfRounds = ref("");
const timeLimit = ref("");

// Validation errors
const activityNameError = ref("");
const selectedGameTypeError = ref("");
const selectedSportStyleError = ref("");

// Load activity data if in edit mode
onMounted(async () => {
  if (route.query.edit) {
    isEditMode.value = true;
    editActivityId.value = parseInt(route.query.edit);

    try {
      const activity = await fetchActivity(editActivityId.value);

      // Fill form with existing data
      activityName.value = activity.name || "";
      scoringMode.value = activity.scoring_mode || "team"; // Keep original scoring mode
      selectedGameType.value = activity.game_type || "";
      selectedSportStyle.value = activity.sport_type || "";
      numberOfRounds.value = activity.total_rounds || "";
      timeLimit.value = activity.time_limit_per_round
        ? Math.floor(activity.time_limit_per_round / 60)
        : ""; // Convert seconds to minutes
    } catch (e) {
      ElNotification({
        title: "Fout",
        message: "Kon activiteit niet laden",
        type: "error",
      });
      router.back();
    }
  }
});

function goBack() {
  router.back();
}

// Map toggle values to scoring modes
function handleToggle(toggleValue) {
  const mapping = {
    teams: "team",
    players: "player",
    "teams&spelers": "team_with_players",
  };
  scoringMode.value = mapping[toggleValue] || "team";
}

// Get toggle value from scoring mode (for edit mode)
function getToggleValue() {
  const reverseMapping = {
    team: "teams",
    player: "players",
    team_with_players: "teams&spelers",
  };
  return reverseMapping[scoringMode.value] || "teams";
}

async function saveActivity() {
  // Clear previous errors
  activityNameError.value = "";
  selectedGameTypeError.value = "";
  selectedSportStyleError.value = "";

  // Validate all required fields
  let hasError = false;

  if (!activityName.value.trim()) {
    activityNameError.value = "Activiteit naam is verplicht";
    hasError = true;
  }

  if (!selectedGameType.value) {
    selectedGameTypeError.value = "Game type is verplicht";
    hasError = true;
  }

  if (!selectedSportStyle.value) {
    selectedSportStyleError.value = "Sport type is verplicht";
    hasError = true;
  }

  if (hasError) {
    return;
  }

  const activityData = {
    name: activityName.value,
    scoring_mode: scoringMode.value, // Use the selected scoring mode directly
    game_type: selectedGameType.value,
    sport_type: selectedSportStyle.value,
    total_rounds: numberOfRounds.value ? parseInt(numberOfRounds.value) : 1, // Default to 1 if empty
    time_limit_per_round: timeLimit.value
      ? parseInt(timeLimit.value) * 60
      : 0, // Default to 0 (no limit) if empty, convert minutes to seconds
  };

  try {
    let data;

    if (isEditMode.value) {
      // Update existing activity
      data = await updateActivity(editActivityId.value, activityData);

      ElNotification({
        title: "Succes!",
        message: `Activiteit "${activityName.value}" is bijgewerkt`,
        type: "success",
      });
    } else {
      // Create new activity
      data = await createActivity(activityData);

      ElNotification({
        title: "Succes!",
        message: `Activiteit "${activityName.value}" is aangemaakt`,
        type: "success",
      });
    }

    // Navigate back with the activity ID
    router.push({
      path: "/nieuwesessie",
      query: isEditMode.value ? {} : { newActivityId: data.id },
    });
  } catch (e) {
    ElNotification({
      title: "Fout",
      message:
        error.value ||
        `Er is iets misgegaan bij het ${isEditMode.value ? "bijwerken" : "opslaan"}`,
      type: "error",
    });
  }
}
</script>

<template>
  <div class="layout-page-new-activity">
    <div>
      <GenericButton class="generic-button--quaternary" @click="goBack">
        <ChevronLeft class="icon--quaternary" />Terug
      </GenericButton>
      <div class="bar-container">
        <GenericStepBar :steps="4" :current-step="2" />
      </div>
      <h3>
        <span>Activiteit</span> {{ isEditMode ? "aanpassen" : "aanmaken" }}
      </h3>

      <div class="form-content">
        <GenericInput
          v-model="activityName"
          label="Activiteit naam"
          placeholder="Voer activiteit naam in"
          :error="activityNameError"
        />
        <div class="form-group">
          <p>Scoring mode</p>
          <GenericToggle
            :modelValue="getToggleValue()"
            @update:modelValue="handleToggle"
          />
        </div>
        <GenericDropdown
          label="Game type (modus)"
          v-model="selectedGameType"
          :options="[
            { label: '🏃 Sport Challenge', value: 'sport_challenge' },
            { label: '🧠 Quiz Modus', value: 'quiz' },
            { label: '❌ Eliminatie Modus', value: 'elimination' },
            { label: '⏱️ Team vs Tijd', value: 'team_vs_time' },
            { label: '⛳ Golf Scoring', value: 'golf' },
          ]"
          placeholder="Selecteer een Game type"
          :error="selectedGameTypeError"
        />
        <GenericDropdown
          label="Stijl (sport type)"
          v-model="selectedSportStyle"
          :options="[
            { label: '⚽ Voetbal', value: 'voetbal' },
            { label: '🧠 Quiz', value: 'quiz' },
            { label: '🏀 Basketbal', value: 'basketbal' },
            { label: '🏐 Volleybal', value: 'volleybal' },
            { label: '🏑 Hockey', value: 'hockey' },
            { label: '🎾 Tennis', value: 'tennis' },
            { label: '🏃 Atletiek', value: 'atletiek' },
            { label: '🏊 Zwemmen', value: 'zwemmen' },
            { label: '🚴 Wielrennen', value: 'fietsen' },
            { label: '🏃 Hardlopen', value: 'hardlopen' },
            { label: '🎮 E-Sports', value: 'esports' },
            { label: '🎲 Bordspel', value: 'boardgame' },
          ]"
          placeholder="Selecteer een sport stijl"
          :error="selectedSportStyleError"
        />
        <div class="input-next-row">
          <GenericInput
            v-model="numberOfRounds"
            label="Aantal ronders"
            placeholder="Bijv. 3"
            type="number"
          />
          <GenericInput
            v-model="timeLimit"
            label="Tijdlimiet (min):"
            placeholder="Bijv. 30"
            type="number"
          />
        </div>
      </div>
    </div>

    <div class="button-group">
      <GenericButton variant="secondary" @click="goBack" :disabled="loading">
        Annuleren
      </GenericButton>
      <GenericButton
        variant="primary"
        @click="saveActivity"
        :disabled="loading"
      >
        {{ loading ? "Bezig..." : isEditMode ? "Bijwerken" : "Opslaan" }}
      </GenericButton>
    </div>
  </div>
</template>

<style scoped>
.layout-page-new-activity {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  height: 100%;
}

h3 {
  & span {
    color: var(--blue-100);
  }
  margin-bottom: var(--space-6);
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  overflow-y: auto;
  max-height: calc(100vh - 22rem);
  /* padding: var(--space-4); */
  padding-right: var(--space-4);
  border: 1px solid var(--black-20, #e0e0e0);

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
}

.form-content::-webkit-scrollbar {
  width: 0.5rem;
}

.form-content::-webkit-scrollbar-track {
  background: var(--black-20, #e0e0e0);
  border-radius: var(--radius-S);
}

.form-content::-webkit-scrollbar-thumb {
  background: var(--blue-40, #a3d6f6);
  border-radius: var(--radius-S);
}

.form-content::-webkit-scrollbar-thumb:hover {
  background: var(--blue-100);
}

.button-group {
  display: flex;
  justify-content: space-between;
}

.icon--quaternary {
  color: inherit;
}

.input-next-row {
  display: flex;
  gap: var(--space-5);
}
</style>
