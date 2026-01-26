<template>
  <div class="countdown-screen">
    <h3>Hou je klaar we <strong>beginnen</strong> in :</h3>
    <FeatureCountdown />
  </div>
</template>
<script setup>
import FeatureCountdown from "../../components/features/FeatureCountdown.vue";
</script>
<style scoped>
.countdown-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;

  h3 {
    margin-bottom: var(--space-4);
    margin-top: var(--space-8);
  }
}
</style>
