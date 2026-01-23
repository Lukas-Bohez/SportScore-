<template>
  <div class="layout-app-pages">
    <div class="layout-session-managment">
      <div class="session-management-header">
        <h3><strong>Sessie</strong> Beheren</h3>
        <div class="session-management-header-buttons">
          <GenericButton
            label="Sessie beëindigen"
            variant="primary"
            style="background-color: var(--red-100)"
          ></GenericButton>
          <GenericButton
            variant="quaternary"
            style="background-color: transparent"
          >
            <Settings style="color: var(--black-100)" />
          </GenericButton>
        </div>
      </div>

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
          <GenericActivityCard
            title="Team Building Dag 2025"
            :activitiesCount="5"
            :teamsCount="6"
            :isActive="selectedActivity === 3"
            @select="selectActivity(3)"
          />
          <GenericActivityCard
            title="Team Building Dag 2025"
            :activitiesCount="5"
            :teamsCount="6"
            :isActive="selectedActivity === 3"
            @select="selectActivity(3)"
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
        <div class="score-section-add-score">
          <FeatureCounter />
          <GenericButton
            label="Score toevoegen"
            variant="primary"
          ></GenericButton>
        </div>
        <div class="score-section-fast-action">
          <h4>Snelle Acties</h4>
          <GenericButton
            class="score-section-button"
            variant="primary"
            label="+5 Bonus"
          />
        </div>
        <!-- <GenericButton
          variant="primary"
          label="Sessie Beëindigen"
          class="score-section-button"
        /> -->
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
import { Settings } from "lucide-vue-next";

const selectedActivity = ref(null);

function selectActivity(activityId) {
  selectedActivity.value = activityId;
}
</script>
<style scoped>
.session-management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.session-management-header-buttons {
  display: flex;
  gap: var(--space-6);
}
.activity-selection-section {
  margin-bottom: var(--space-7);
  position: relative;
}

.activity-selection-section h4 {
  margin-bottom: var(--space-5);
}

.activity-cards-container {
  display: flex;
  gap: var(--space-5);
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: var(--space-4);
  scroll-behavior: smooth;

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--blue-40) var(--black-20);
}

.activity-cards-container::-webkit-scrollbar {
  height: 0.5rem;
}

.activity-cards-container::-webkit-scrollbar-track {
  background: var(--black-20);
  border-radius: var(--radius-S);
}

.activity-cards-container::-webkit-scrollbar-thumb {
  background: var(--blue-40);
  border-radius: var(--radius-S);
  transition: background 0.2s ease;
}

.activity-cards-container::-webkit-scrollbar-thumb:hover {
  background: var(--blue-100);
}

/* Visual indicator for scrollable content */
.activity-cards-container::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 1rem;
  width: 3rem;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), transparent);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.dropdown-section {
  display: flex;
  justify-content: space-between;
  gap: var(--space-5);
}

.score-section-add-score {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.score-section-fast-action {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  & h4 {
    height: 2.8125rem;
    text-align: end;
  }
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
  margin-top: var(--space-7);
  gap: var(--space-5);
  justify-content: space-between;
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

@media (width <= 28.125rem) {
  .dropdown-section {
    flex-direction: column;
  }
}
</style>
