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
  text-align: center;
  h3 {
    margin-top: var(--space-10);
  }
}
</style>
