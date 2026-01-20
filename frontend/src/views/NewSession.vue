<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";
import GenericStepBar from "@/components/Generic/GenericStepBar.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import GenericDropdown from "@/components/Generic/GenericDropdown.vue";
import GenericCheckbox from "@/components/Generic/GenericCheckbox.vue";

const router = useRouter();

const step = ref(1);
const screenWidth = ref(window.innerWidth);

function next() {
  step.value++;
}

function back() {
  step.value--;
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
  <div class="layout-page-container">
    <!-- Show nested route content if exists, otherwise show NewSession content -->
    <RouterView v-slot="{ Component }">
      <component :is="Component" v-if="Component" />
      <div v-else class="layout-page-new-session">
        <div class="button-back-container">
          <GenericButton
            v-if="step == 1"
            class="generic-button--quaternary"
            @click="router.back"
          >
            <ChevronLeft class="icon--quaternary" />Terug
          </GenericButton>
        </div>
        <div class="bar-container">
          <GenericStepBar :steps="4" :current-step="step" />
        </div>
        <div class="step-content" v-if="step === 1">
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

        <div v-else-if="step === 2">
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
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-1"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-2"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-3"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-4"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-5"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-6"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-7"
              />
              <GenericCheckbox
                :label="truncateLabel('Rood hhhhhhhhhhhhhhhhhhhhhh')"
                :checked="isChecked"
                @update:checked="isChecked = $event"
                @edit="handleEdit"
                @delete="handleDelete"
                id="checkbox-8"
              />
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

        <div v-else-if="step === 3">
          <p>Step 3: Confirm details</p>
          <button @click="back">Back</button>
          <button @click="next">Create Session</button>
        </div>
      </div>
    </RouterView>
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
  margin-bottom: var(--space-6);
}
h4 {
  margin-bottom: var(--space-5);
}

.layout-page-new-session {
  width: 100%;
  height: 100%;
}

.step-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100vh - 12rem);
  /* padding-bottom: var(--space-8); */
}
.button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
  margin-bottom: 1.3rem;
}
.button-group--step1 {
  justify-content: flex-end;
  margin-bottom: 0.7rem;
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
  max-height: 17rem;
  padding: var(--space-4);
  border: 1px solid var(--black-20, #e0e0e0);
  border-radius: var(--radius-M);
  background-color: var(--blue-10);
  border-radius: var(--radius-M);
}

.section-new-activity {
  margin-bottom: var(--space-5);
}
</style>
