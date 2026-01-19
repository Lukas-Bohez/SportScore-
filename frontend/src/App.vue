<script setup>
import { RouterLink, RouterView } from "vue-router";
import Home from "@/views/HomePage.vue";
// import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="background-effect">
    <div class="app-container">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  padding: 1.3125rem 2.6875rem;
}
</style>
