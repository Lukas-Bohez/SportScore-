<script setup>
import GenericButton from "@/components/Generic/GenericButton.vue";
import { ChevronLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericToggle from "@/components/Generic/GenericToggle.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";

const router = useRouter();

function goBack() {
  router.back();
}

function saveActivity() {
  // Add your save logic here
  console.log("Activity saved");
  router.back();
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
      <h3><span>Activiteit</span> aanmaken</h3>

      <div class="form-content">
        <GenericInput
          label="Activiteit naam"
          placeholder="Voer activiteit naam in"
        />
        <div class="form-group">
          <p>Scoring mode</p>
          <GenericToggle label="Activiteit bewerken" />
        </div>
        <GenericDropdown
          :options="[
            { label: 'Categorie 1', value: 1 },
            { label: 'Categorie 2', value: 2 },
            { label: 'Categorie 3', value: 3 },
          ]"
          label="Game type (modus)"
          placeholder="Selecteer een Game type"
        />
        <GenericDropdown
          :options="[
            { label: 'Categorie 1', value: 1 },
            { label: 'Categorie 2', value: 2 },
            { label: 'Categorie 3', value: 3 },
          ]"
          label="Stijl (sport type)"
          placeholder="Selecteer een sport stijl"
        />
        <div class="input-next-row">
          <GenericInput
            label="Aantal Roundes"
            placeholder="Voer activiteit naam in"
          />
          <GenericInput
            label="Tijdlimiet (min):"
            placeholder="Voer activiteit naam in"
          />
        </div>
      </div>
    </div>

    <div class="button-group">
      <GenericButton variant="secondary" @click="goBack">
        Annuleren
      </GenericButton>
      <GenericButton variant="primary" @click="saveActivity">
        Opslaan
      </GenericButton>
    </div>
  </div>
</template>

<style scoped>
.layout-page-new-activity {
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
  gap: var(--space-7);
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
  background: var(--blue-100);
  border-radius: var(--radius-S);
}

.form-content::-webkit-scrollbar-thumb:hover {
  background: var(--blue-80, #3a7bd5);
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
