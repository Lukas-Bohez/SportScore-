<template>
  <div class="feature-podium-content">
    <FeaturePodiumItem
      :position="2"
      title="Lukas"
      :emoji="selectedEmoji"
      :score="18"
      class="podium-second animate-podium-item"
      style="animation-delay: 0.4s"
    />
    <FeaturePodiumItem
      :position="1"
      title="Abdullah"
      :emoji="selectedEmoji"
      :score="20"
      class="podium-first animate-podium-item"
      style="animation-delay: 0.8s"
    />
    <FeaturePodiumItem
      :position="3"
      title="Maarten"
      :emoji="selectedEmoji"
      :score="17"
      class="podium-third animate-podium-item"
      style="animation-delay: 0s"
    />
  </div>
</template>
<script setup>
import FeaturePodiumItem from "./FeaturePodiumItem.vue";
defineOptions({
  name: "FeaturePodium",
});
defineProps({
  selectedEmoji: {
    type: String,
    required: true,
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

/* Podium Item Animation */
.animate-podium-item {
  opacity: 0;
  animation: podium-rise 0.6s ease-out forwards;
}

@keyframes podium-rise {
  0% {
    opacity: 0;
    transform: translateY(150px);
  }
  100% {
    opacity: 1;
    transform: translateY(var(--final-position));
  }
}

.podium-first {
  --final-position: calc(var(--space-5) * -2);
}

.podium-second {
  --final-position: 0px;
}

.podium-third {
  --final-position: var(--space-7);
}
</style>
