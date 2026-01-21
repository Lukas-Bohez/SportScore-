<script setup>
import { RouterLink, RouterView } from "vue-router";
import Home from "@/views/HomePage.vue";
// import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <main class="background-effect">
    <div class="app-container">
      <RouterView />
    </div>
  </main>
</template>

<style scoped></style>
