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

        <p v-if="!loading && filteredCards.length === 0" class="no-results">
          Geen resultaten gevonden
        </p>

        <div class="templates-page-content">
          <p v-if="loading" class="loading-message">Sessies laden...</p>
          <RouterLink
            v-else
            v-for="(card, index) in filteredCards"
            :key="index"
            :to="{ name: 'SessionOverview', params: { id: card.id } }"
            class="router-link"
          >
            <GenericCard
              :title="card.title"
              :date="card.date"
              :teams="card.teams"
              :activities="card.activities"
            />
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ChevronLeft } from "lucide-vue-next";
defineOptions({ name: "Templates" });
import GenericCard from "@/components/Generic/GenericCard.vue";
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericInput from "@/components/Generic/GenericInput.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";

const router = useRouter();
const route = useRoute();

const goBack = () => {
  router.back();
};

const searchQueryName = ref("");
const searchQueryDate = ref("");
const loading = ref(false);
const sessionTemplates = ref([]);

// Format date for display (from ISO to DD/MM/YYYY)
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Load templates from localStorage
const loadTemplates = () => {
  try {
    loading.value = true;
    const templatesKey = "sessionTemplates";
    const templates = JSON.parse(localStorage.getItem(templatesKey) || "[]");
    sessionTemplates.value = templates;
    console.log("✅ Templates loaded from localStorage:", templates.length);
  } catch (error) {
    console.error("❌ Failed to load templates:", error);
    sessionTemplates.value = [];
  } finally {
    loading.value = false;
  }
};

// Transform templates to cards format
const cards = computed(() => {
  return sessionTemplates.value.map((session) => ({
    id: session.id,
    title: session.name,
    date: formatDate(session.created_at),
    teams: session.teams || [],
    activities: session.activities || [],
  }));
});

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

// Watch for route query changes (refresh trigger)
watch(
  () => route.query.refresh,
  (newVal) => {
    if (newVal) {
      console.log("🔄 Refresh triggered, reloading templates");
      loadTemplates();
      // Clear the query parameter after reload
      setTimeout(() => {
        router.replace({ path: route.path, query: {} });
      }, 100);
    }
  },
);

onMounted(() => {
  loadTemplates();
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
  padding-right: 0.5rem;
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
}
.loading-message {
  text-align: center;
  color: var(--blue-100);
  margin-top: var(--space-8);
  font-style: italic;
}
.router-link {
  text-decoration: none;
  color: inherit;
  display: block;
}
</style>
