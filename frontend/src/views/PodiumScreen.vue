<template>
  <div class="background-effect">
    <div class="scorescreen-header">
      <FeatureClock initialTime="01:20:00" />
      <h2>Leaderboard</h2>
      <h2>Voetbal</h2>
    </div>
    <div class="scorescreen-content">
      <FeaturePodium />
      <div class="scorescreen-content-header">
        <div class="scorescreen-content-header-left">
          <h2>#</h2>
          <h2>Speler</h2>
        </div>
        <h2>Punten</h2>
      </div>
      <div class="scorescreen-content-results">
        <GenericResult rank="4" player="Rune" score="15" />
        <GenericResult rank="5" player="Jonathan" score="14" />
        <GenericResult rank="5" player="Jonathan V" score="14" />
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureClock from "../components/features/FeatureClock.vue";
import FeaturePodium from "../components/features/FeaturePodium.vue";
import GenericResult from "../components/Generic/GenericResult.vue";
</script>
<style scoped>
.scorescreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-8) var(--space-6);
  border-bottom: 2px solid var(--gray-200);
}
.scorescreen-content {
  padding: var(--space-6);
}
.scorescreen-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-6);
  margin-bottom: var(--space-4);
  padding-top: var(--space-10);
}
.scorescreen-content-header-left {
  display: flex;
  /* padding-left: var(--space-7); */
  gap: var(--space-6);
}
.scorescreen-content-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
