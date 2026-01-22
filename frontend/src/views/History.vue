<template>
  <div class="history-page">
    <GenericButton class="generic-button--quaternary" @click="goBack">
      <ChevronLeft class="icon--quaternary" />Terug
    </GenericButton>
    <h3><strong>Geschiedenis</strong></h3>
    <GenericInput
      label="Datum"
      placeholder="01/01/2025"
      v-model="searchQuery"
    />
    <div class="history-page-content">
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
</template>
<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "History" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";

const router = useRouter();

const goBack = () => {
  router.back();
};

const searchQuery = ref("");

const cards = ref([
  { title: "Team Blue", date: "12/02/2025" },
  { title: "Team Red", date: "15/03/2025" },
  { title: "Team Green", date: "12/02/2025" },
  { title: "Team Yellow", date: "20/01/2025" },
  { title: "Team Purple", date: "12/02/2025" },
  { title: "Team Orange", date: "18/04/2025" },
]);

const filteredCards = computed(() => {
  if (!searchQuery.value) {
    return cards.value;
  }
  return cards.value.filter((card) => card.date.includes(searchQuery.value));
});
</script>
<style scoped>
h3 {
  margin: var(--space-5) 0;
  & span {
    color: var(--blue-100);
  }
}

.history-page {
  width: 100%;
  height: 100%;
}
.history-page-content {
  overflow: auto;
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
