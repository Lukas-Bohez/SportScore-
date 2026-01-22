<template>
  <div class="layout-app-pages">
    <div class="layout-session-managment">
      <h3><strong>Sessie</strong> Beheren</h3>

      <!-- Activity Selection Section -->
      <div class="activity-selection-section">
        <h4>Selecteer een activiteit</h4>
        <div class="activity-cards-container">
          <GenericActivityCard
            title="Voetbal Competitie"
            :activitiesCount="3"
            :teamsCount="4"
            :isActive="selectedActivity === 1"
            @select="selectActivity(1)"
          />
          <GenericActivityCard
            title="Team Building Dag 2026"
            :activitiesCount="5"
            :teamsCount="6"
            :isActive="selectedActivity === 2"
            @select="selectActivity(2)"
          />
          <GenericActivityCard
            title="Team Building Dag 2025"
            :activitiesCount="5"
            :teamsCount="6"
            :isActive="selectedActivity === 3"
            @select="selectActivity(3)"
          />
        </div>
      </div>

      <!-- Team and Player Selection - Only show when activity is selected -->
      <div v-if="selectedActivity" class="dropdown-section">
        <GenericDropdown
          label="Selecteer een team"
          :options="[
            { label: 'Team Blauw', value: 'team-blauw' },
            { label: 'Team Rood', value: 'team-rood' },
            { label: 'Team Geel', value: 'team-geel' },
            { label: 'Team Groen', value: 'team-groen' },
          ]"
          placeholder="Selecteer een optie"
        />
        <GenericDropdown
          label="Selecteer een speler"
          :options="[
            { label: 'Speler 1', value: 'speler-1' },
            { label: 'Speler 2', value: 'speler-2' },
            { label: 'Speler 3', value: 'speler-3' },
            { label: 'Speler 4', value: 'speler-4' },
          ]"
          placeholder="Selecteer een optie"
        />
      </div>

      <!-- Score Section - Only show when activity is selected -->
      <div v-if="selectedActivity" class="score-section">
        <FeatureCounter />
        <GenericButton
          class="score-section-button"
          variant="primary"
          label="Score toevoegen"
        />
        <GenericButton
          style="margin-top: var(--space-7)"
          variant="primary"
          label="Sessie Beëindigen"
          class="score-section-button"
        />
      </div>

      <!-- Score Overview - Only show when activity is selected -->
      <div v-if="selectedActivity" class="score-section-overview">
        <div class="score-section-overview-list">
          <h4>Score Overzicht</h4>
          <div class="score-section-overview-list-items">
            <div>
              <p>Team :</p>
              <p>Oude score:</p>
              <p>Nieuwe score:</p>
            </div>
            <div>
              <p>Rood</p>
              <p>10</p>
              <p>8</p>
            </div>
          </div>
        </div>
        <div class="score-section-fast-action">
          <h4>Snelle Acties</h4>
          <GenericButton
            class="score-section-button"
            variant="primary"
            label="+5 Bonus"
          />
        </div>
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>
<script setup>
import { ref } from "vue";
defineOptions({ name: "SessieBeheren" });
import FeatureCounter from "../components/features/FeatureCounter.vue";
import GenericDropdown from "../components/Generic/GenericDropdown.vue";
import GenericButton from "../components/Generic/GenericButton.vue";
import GenericNav from "../components/Generic/GenericNav.vue";
import GenericActivityCard from "../components/Generic/GenericActivityCard.vue";

const selectedActivity = ref(null);

function selectActivity(activityId) {
  selectedActivity.value = activityId;
}
</script>
<style scoped>
.activity-selection-section {
  margin-bottom: var(--space-7);
}

.activity-selection-section h4 {
  margin-bottom: var(--space-5);
}

.activity-cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
}

.dropdown-section {
  display: flex;
  gap: var(--space-5);
  margin-bottom: var(--space-7);
}

h3 {
  margin-top: var(--space-5);
  margin-bottom: var(--space-7);
}
.layout-session-managment {
  width: 100%;
  height: 100%;
}
.score-section {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: var(--space-4);
}

.score-section-button :deep(button) {
  flex-direction: row;
  white-space: nowrap;
}
.score-section-button :deep(svg) {
  display: none;
}
.score-section-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
}
.score-section-overview-list-items {
  display: flex;
  gap: var(--space-5);
}

@media (width <= 768px) {
  .dropdown-section {
    flex-direction: column;
  }
}
</style>
