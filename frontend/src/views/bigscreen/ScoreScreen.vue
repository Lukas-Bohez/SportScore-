<template>
  <div class="scorescreen-container">
    <div class="scorescreen-header">
      <FeatureClock initialTime="01:20:00" />
      <h2>Leaderboard</h2>
      <h2>Voetbal</h2>
    </div>
    <div class="scorescreen-content">
      <div class="scorescreen-content-header">
        <div class="scorescreen-content-header-left">
          <h2>#</h2>
          <h2>Speler</h2>
        </div>
        <h2>Punten</h2>
      </div>
      <div class="scorescreen-content-results">
        <GenericResult rank="1" player="Abdullah" score="20" />
        <GenericResult rank="2" player="Lukas" score="18" />
        <GenericResult rank="3" player="Maarten" score="17" />
        <GenericResult rank="4" player="Rune" score="15" />
        <GenericResult rank="5" player="Jonathan" score="14" />
        <GenericResult rank="5" player="Jonathan V" score="14" />
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureClock from "../../components/features/FeatureClock.vue";
import GenericResult from "../../components/Generic/GenericResult.vue";
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
