<script setup>
import GenericNav from "@/components/Generic/GenericNav.vue";
import GenericButton from "@/components/Generic/GenericButton.vue";
import { RouterLink } from "vue-router";
import { Plus } from "lucide-vue-next";
</script>

<template>
  <div class="layout-page-container">
    <div class="home-content">
      <h1>Welkom bij</h1>
      <h3>SportScore!</h3>
      <div class="vector-container">
        <img src="/homevector.svg" alt="home vector" class="home-vector" />
      </div>
      <p>Scoreboard voor team building activiteiten</p>
      <GenericButton variant="primary">
        <RouterLink class="router-link" to="/nieuwesessie">
          <Plus />
          Nieuwe sessie
        </RouterLink>
      </GenericButton>
    </div>
    <div class="nav-container">
      <GenericNav />
    </div>
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
    margin-bottom: var(--space-9);
  }

  & p {
    margin-bottom: var(--space-7);
    color: var(--black-100);
    text-align: center;
  }
}
</style>
