<script setup>
import { RouterLink, RouterView } from "vue-router";
import Home from "@/views/HomePage.vue";
import GenericNav from "./components/Generic/GenericNav.vue";
// import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <main class="background-effect">
    <RouterView />
    <!-- <div class="nav-container">
      <GenericNav />
    </div> -->
  </main>
</template>

<style scoped></style>
