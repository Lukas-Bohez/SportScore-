<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <!-- <div class="step-content"> -->
      <div>
        <h2><span>Sessie</span> overzicht</h2>
        <div class="session-overview-head">
          <div class="session-overview-head-content">
            <p><strong>Sessie naam:</strong></p>
            <P class="text">Team Building Dag 2025</P>
          </div>
          <div class="session-overview-head-content">
            <p><strong>Aantal rondes per game:</strong></p>
            <p class="text">3</p>
          </div>
        </div>

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
            <div class="teams-container">
              <div class="team-container">
                <p class="activity-item">Team A 😑</p>
              </div>
              <div class="team-container">
                <p class="activity-item">Team B 😂</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="button-group">
        <GenericButton variant="secondary">Bewerken</GenericButton>
        <GenericButton variant="primary">Start</GenericButton>
      </div>
      <div class="nav-container">
        <GenericNav />
      </div>
    </div>
  </div>
</template>
<script setup>
defineOptions({ name: "SessionBeheren" });

import { ref } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import GenericButton from "@/components/Generic/GenericButton.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
const router = useRouter();
const back = () => {
  router.back();
};
</script>
<style scoped>
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
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  strong {
    color: var(--black-100);
  }
}

.teams-container {
  display: flex;
  flex-direction: row;
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

h2 {
  & span {
    color: var(--blue-100);
  }
  margin-bottom: var(--space-6);
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
  gap: var(--space-6);
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
