<template>
  <div class="app-container">
    <div class="layout-app-pages">
      <div class="templates-page">
        <GenericButton class="generic-button--quaternary" @click="goBack">
          <ChevronLeft class="icon--quaternary" />Terug
        </GenericButton>
        <h3>Bestaande<strong> sessies</strong></h3>
        <div class="templates-page-inputs">
          <GenericInput
            label="Sessie zoeken"
            placeholder="bv. Teambuilding Team Blue"
            v-model="searchQueryName"
          />
          <GenericInput
            label="Datum"
            placeholder="01/01/2025"
            v-model="searchQueryDate"
          />
        </div>

        <div class="templates-page-content">
          <GenericCard
            v-for="(card, index) in filteredCards"
            :key="index"
            :title="card.title"
            :date="card.date"
          />
        </div>

        <p v-if="filteredCards.length === 0" class="no-results">
          Geen resultaten gevonden
        </p>
      </div>
      <div class="nav-container">
        <GenericNav />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "Templates" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";

const router = useRouter();

const goBack = () => {
  router.back();
};

const searchQueryName = ref("");
const searchQueryDate = ref("");

const cards = ref([
  { title: "Team Blue", date: "12/02/2025" },
  { title: "Team Red", date: "15/03/2025" },
  { title: "Team Green", date: "12/02/2025" },
  { title: "Team Yellow", date: "20/01/2025" },
  { title: "Team Purple", date: "12/02/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
  { title: "Team Orange", date: "18/04/2025" },
]);

const filteredCards = computed(() => {
  return cards.value.filter((card) => {
    const matchesName =
      !searchQueryName.value ||
      card.title.toLowerCase().includes(searchQueryName.value.toLowerCase());
    const matchesDate =
      !searchQueryDate.value || card.date.includes(searchQueryDate.value);
    return matchesName && matchesDate;
  });
});
</script>
<style scoped>
h3 {
  margin: var(--space-5) 0;
  & span {
    color: var(--blue-100);
  }
}

.templates-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.templates-page-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
  flex-shrink: 0;
}
.templates-page-content {
  overflow-y: auto;
  margin-top: var(--space-6);
  flex: 1;
  min-height: 0;
}
.templates-page-content::-webkit-scrollbar {
  width: 8px;
}
.templates-page-content::-webkit-scrollbar-track {
  background: transparent;
}
.templates-page-content::-webkit-scrollbar-thumb {
  background-color: var(--blue-40);
  border-radius: 4px;
}
.templates-page-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--blue-60);
}
.back-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: var(--space-4);
}
.back-button svg {
  margin-right: var(--space-2);
}
.no-results {
  text-align: center;
  color: var(--black-50);
  margin-top: var(--space-8);
  font-style: italic;
}
</style>
