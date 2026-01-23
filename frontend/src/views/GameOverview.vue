<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div class="step-content">
        <h2><span>Game</span> overzicht</h2>
        <div class="session-overview-head">
          <div class="session-overview-head-content">
            <h4 class="stap4-subtitle">Sessie naam:</h4>
            <P class="text">Team Building Dag 2025</P>
          </div>
        </div>

        <div class="section-overview-content">
          <GenericAccordion
            title="Quiz"
            :items="[
              { team: 'Team Blauw', punten: 20 },
              { team: 'Team Rood', punten: 17 },
              { team: 'Team Geel', punten: 12 },
              { team: 'Team Groen', punten: 11 },
            ]"
          />
          <GenericAccordion
            title="Basketbal"
            :items="[
              { team: 'Team Blauw', punten: 20 },
              { team: 'Team Rood', punten: 17 },
              { team: 'Team Geel', punten: 12 },
              { team: 'Team Groen', punten: 11 },
            ]"
          />
          <GenericAccordion
            title="Volleybal"
            :items="[
              { team: 'Team Blauw', punten: 20 },
              { team: 'Team Rood', punten: 17 },
              { team: 'Team Geel', punten: 12 },
              { team: 'Team Groen', punten: 11 },
            ]"
          />
          <div class="section-overview-content-download-activiteit">
            <GenericDropdown
              label="Selecteer een specifieke activiteit"
              v-model="selectedDropdownValue"
              :options="[
                { label: 'Quiz', value: 'quiz' },
                { label: 'Sport Challenge', value: 'sport-challenge' },
                { label: 'Elimination Mode', value: 'elimination-mode' },
                { label: 'Team vs Time', value: 'team-vs-time' },
              ]"
              placeholder="Selecteer een specifieke activiteit"
            />

            <GenericButton variant="primary" label="Download" />
          </div>
        </div>
      </div>

      <GenericButton variant="primary" label="Download activiteiten" />

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
import GenericAccordion from "@/components/Generic/GenericAccordion.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
const router = useRouter();
const back = () => {
  router.back();
};
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
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  strong {
    color: var(--black-100);
  }
}
.section-overview-content-download-activiteit {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
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
</style>
