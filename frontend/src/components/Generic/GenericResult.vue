<template>
  <div class="generic-result">
    <div class="generic-result-content">
      <div class="generic-result-item">
        <h3 class="generic-result-rank">{{ rank }}</h3>
        <h3 class="generic-result-player">{{ player }}</h3>
      </div>
      <h3 class="generic-result-score">{{ score }}</h3>
    </div>
  </div>
</template>
<script setup>
defineOptions({
  name: "GenericResult",
});

defineProps({
  rank: {
    type: [Number, String],
    required: true,
  },
  player: {
    type: String,
    required: true,
  },
  score: {
    type: [Number, String],
    required: true,
  },
});
</script>
<style scoped>
.generic-result {
  width: 100%;
  height: 4rem; /* 64px */
  position: relative;
  border-radius: var(--radius-L);
  background-color: var(--blue-70);
  overflow: hidden;
  flex-shrink: 0;
  text-align: center;
  color: var(--white);
}
.generic-result-content {
  position: absolute;
  top: calc(50% - 1.25rem);
  left: var(--space-6); /* 24px */
  right: var(--space-6); /* 24px */
  border-radius: var(--radius-M);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  box-sizing: border-box;
  gap: var(--space-5);
}
.generic-result-item {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: var(--space-7);
}
.generic-result-player {
  position: relative;
  flex-shrink: 0;
}
/* .generic-result-score {
  position: relative;
} */
</style>
