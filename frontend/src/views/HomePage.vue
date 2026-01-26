<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { Plus } from "lucide-vue-next";
</script>

<template>
  <div class="app-container">
    <div class="layout-home-page">
      <RouterLink class="back-to-active-sessions" to="/sessionmanagment">
        <span></span> Terug naar actieve sessies
      </RouterLink>
      <div class="home-content">
        <h1>Welkom bij</h1>
        <h3>SportScore!</h3>
        <div class="vector-container">
          <img src="/homevector.svg" alt="home vector" class="home-vector" />
        </div>
        <p>Scoreboard voor team building activiteiten</p>
        <RouterLink class="router-link" to="/nieuwesessie">
          <GenericButton variant="primary">
            <Plus />
            Nieuwe sessie
          </GenericButton>
        </RouterLink>
        <div>
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
        </div>
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
