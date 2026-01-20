<script setup>
import GenericButton from "@/components/Generic/GenericButton.vue";
import { ChevronLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericToggle from "@/components/Generic/GenericToggle.vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";

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
    <GenericButton class="generic-button--quaternary" @click="goBack">
      <ChevronLeft class="icon--quaternary" />Terug
    </GenericButton>

    <h3><span>Activiteit</span> aanmaken</h3>
    <GenericToggle label="Actief" />

    <div class="form-content">
      <GenericInput
        label="Activiteit naam"
        placeholder="Voer activiteit naam in"
      />
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
      <GenericDropdown
        :options="[
          { label: 'Categorie 1', value: 1 },
          { label: 'Categorie 2', value: 2 },
          { label: 'Categorie 3', value: 3 },
        ]"
        label="Scoring mode"
        placeholder="Selecteer een scoring mode"
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
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

h3 {
  & span {
    color: var(--blue-100);
  }
}

.form-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  overflow: auto;
  max-height: 23rem;
}

.button-group {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-8);
}

.icon--quaternary {
  color: inherit;
}

.input-next-row {
  display: flex;
  gap: var(--space-5);
}
</style>
