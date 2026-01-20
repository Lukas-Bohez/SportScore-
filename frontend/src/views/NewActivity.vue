<script setup>
import GenericButton from "@/components/Generic/GenericButton.vue";
import { ChevronLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericToggle from "@/components/Generic/GenericToggle.vue";

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

      <!-- Add more form fields as needed -->
    </div>

    <div class="button-group">
      <GenericButton variant="secondary" @click="goBack">
        <ChevronLeft /> Annuleren
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
  gap: var(--space-6);
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
}

.button-group {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-8);
}

.icon--quaternary {
  color: inherit;
}
</style>
