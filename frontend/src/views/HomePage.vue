<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink, useRouter } from "vue-router";
import { Plus } from "lucide-vue-next";
import { notifyBigScreen } from "@/composables/useBigScreenSync";
import { onMounted, computed, ref, watch } from "vue";
import { useSessions } from "@/composables/useSessions";
import GenericModel from "@/components/Generic/GenericModel.vue";

const router = useRouter();

// Composable: check for active sessions and load them on mount
const { activeSession, fetchActiveSessions } = useSessions();
const hasActiveSessions = computed(() => !!activeSession.value);

const goToActiveSession = () => {
  if (activeSession.value && activeSession.value.id) {
    router.push({ path: '/sessionmanagment', query: { session: activeSession.value.id } }).catch((e) => console.warn('Router push to sessionmanagment failed:', e));
  } else {
    router.push({ path: '/sessionmanagment' }).catch((e) => console.warn('Router push to sessionmanagment failed:', e));
  }
};
const activeSessionModal = ref(null);

onMounted(() => {
  // Best-effort load; ignore errors to avoid blocking homepage render
  fetchActiveSessions().catch((e) => console.debug("Failed to load active sessions on homepage:", e));
});

// Auto-open popup when an active session becomes available
watch(activeSession, (val) => {
  if (val) {
    // slight delay so DOM has the modal ref
    setTimeout(() => {
      try { activeSessionModal.value?.open(); } catch (e) { /* ignore */ }
    }, 50);
  }
});

// Handle nieuwe sessie click: notify bigscreen but do NOT open the BigScreen UI as a fallback (prevents opening a new tab)
const handleNewSession = async () => {
  console.log("🔔 User clicked: Nieuwe sessie");
  try {
    // Disable UI fallback so we don't open a new tab from this action
    await notifyBigScreen("loading", null, null, { uiFallback: false });
  } catch (err) {
    console.warn('Notify bigscreen failed:', err);
  }
};

const onNewSessionClick = async () => {
  await handleNewSession();
  // Navigate in-SPA to the New Session view
  router.push({ path: '/nieuwesessie' }).catch((e) => {
    console.warn('Router push to /nieuwesessie failed:', e);
  });
};
</script>

<template>
  <div class="app-container">
    <div class="layout-home-page">
      <RouterLink v-if="hasActiveSessions" class="back-to-active-sessions" to="/sessionmanagment">
        <span aria-hidden="true"></span> Terug naar actieve sessies
      </RouterLink>
      <div class="home-content">
        <h1>Welkom bij</h1>
        <h3>SportScore!</h3>
        <div class="vector-container">
          <img src="/homevector.svg" alt="home vector" class="home-vector" />
        </div>
        <p>Scoreboard voor team building activiteiten</p>
        <GenericButton variant="primary" @click="onNewSessionClick">
          <Plus />
          Nieuwe sessie
        </GenericButton>

        <GenericModel
          ref="activeSessionModal"
          v-if="activeSession"
          icon="circle-info"
          iconColor="var(--blue-100)"
          :message="activeSession ? `Er is een actieve sessie: ${activeSession.name}. Wil je doorgaan naar sessiebeheer?` : ''"
          confirmText="Ga verder"
          cancelText="Sluit"
          :showCancel="true"
          @confirm="goToActiveSession"
        />
        <!-- <div>
          <RouterLink class="router-link" to="/bigscreen/qrscreen">
            QR Code Scannen
          </RouterLink>
          <RouterLink class="router-link" to="/bigscreen/countdownscreen">
            Countdown
          </RouterLink>
          <RouterLink class="router-link" to="/bigscreen/loadingScreen">
            Loading Screen
          </RouterLink>
          <RouterLink class="router-link" to="/bigscreen/podiumscreen">
            Podium
          </RouterLink>
          <RouterLink class="router-link" to="/bigscreen/scorescreen">
            ScoreScreen
          </RouterLink>
        </div> -->
      </div>
    </div>
  </div>
  <div class="nav-container">
    <GenericNav />
  </div>
</template>

<style scoped>
.home-content {
  margin: auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  & h1 {
    color: var(--black-70);
    margin-bottom: var(--space-5);
  }

  & h3 {
    color: var(--blue-100);
    margin-bottom: var(--space-7);
  }

  .vector-container {
    margin-bottom: var(--space-8);
  }

  & p {
    margin-bottom: var(--space-7);
    color: var(--black-100);
    text-align: center;
  }
}

.layout-home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 4.875rem); /* Adjust for nav height */
  width: 100%;
}
</style>
