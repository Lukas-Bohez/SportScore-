<template>
  <div class="feature-podium-content">
    <FeaturePodiumItem
      :position="2"
      :title="winners[1]?.title || winners[1]?.name || '---'"
      :emoji="winners[1]?.emoji || winners[1]?.icon || '🏆'"
      :score="winners[1]?.score ?? 0"
      class="podium-second podium-item"
    />
    <FeaturePodiumItem
      :position="1"
      :title="winners[0]?.title || winners[0]?.name || '---'"
      :emoji="winners[0]?.emoji || winners[0]?.icon || '🏆'"
      :score="winners[0]?.score ?? 0"
      class="podium-first podium-item"
    />
    <FeaturePodiumItem
      :position="3"
      :title="winners[2]?.title || winners[2]?.name || '---'"
      :emoji="winners[2]?.emoji || winners[2]?.icon || '🏆'"
      :score="winners[2]?.score ?? 0"
      class="podium-third podium-item"
    />
  </div>
</template>
<script setup>
import FeaturePodiumItem from "./FeaturePodiumItem.vue";
defineOptions({
  name: "FeaturePodium",
});

defineProps({
  winners: {
    type: Array,
    default: () => [],
  },
});
</script>
<style scoped>
.feature-podium-content {
  display: flex;
  gap: var(--space-11);
  justify-content: center;
  align-items: flex-end;
}

.podium-item {
  opacity: 0;
  transform: translateY(100vh);
}

.podium-third {
  animation: slideUp 0.6s ease-out 0.2s forwards;
}

.podium-second {
  animation: slideUp 0.6s ease-out 0.8s forwards;
}

.podium-first {
  animation: slideUp 0.6s ease-out 1.4s forwards;
}

@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(100vh);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Final positions after animation */
.podium-first {
  animation:
    slideUp 0.6s ease-out 1.4s forwards,
    finalPosition 0s linear 2s forwards;
}

.podium-third {
  animation:
    slideUp 0.6s ease-out 0.2s forwards,
    finalThirdPosition 0s linear 0.8s forwards;
}

@keyframes finalPosition {
  to {
    transform: translateY(calc(var(--space-5) * -2));
  }
}

@keyframes finalThirdPosition {
  to {
    transform: translateY(var(--space-7));
  }
}
</style>
