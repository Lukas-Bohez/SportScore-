<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import { ref } from "vue";

const router = useRouter();

const step = ref(1);

function next() {
  step.value++;
}

function back() {
  step.value--;
}
</script>

<template>
  <div class="layout-page-container">
    <div>
      <div class="new-session-content">
        <GenericButton
          class="generic-button--quaternary"
          @click="router.back()"
        >
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
      </div>
      <div class="bar-container">
        <GenericStepBar :steps="4" :current-step="step" />
      </div>
      <div v-if="step === 1">
        <h3><span>Sessie</span> instellen</h3>
        <GenericInput label="Sessie naam" placeholder="Voer sessie naam in" />
        <button @click="next">Next</button>
      </div>

      <div v-else-if="step === 2">
        <p>Step 2: Pick activities</p>
        <button @click="back">Back</button>
        <button @click="next">Next</button>
      </div>

      <div v-else-if="step === 3">
        <p>Step 3: Confirm details</p>
        <button @click="back">Back</button>
        <button @click="next">Create Session</button>
      </div>
    </div>
    <div class="nav-container">
      <GenericNav />
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

h3 {
  & span {
    color: var(--blue-100);
  }
}
</style>
