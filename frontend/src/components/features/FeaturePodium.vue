<template>
  <div class="feature-podium-content">
    <FeaturePodiumItem
      :position="2"
      title="Lukas"
      :emoji="selectedEmoji"
      :score="18"
      class="podium-second"
    />
    <FeaturePodiumItem
      :position="1"
      title="Abdullah"
      :emoji="selectedEmoji"
      :score="20"
      class="podium-first"
    />
    <FeaturePodiumItem
      :position="3"
      title="Maarten"
      :emoji="selectedEmoji"
      :score="17"
      class="podium-third"
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

.podium-first {
  transform: translateY(calc(var(--space-5) * -2));
}

.podium-second {
  transform: translateY(0);
}

.podium-third {
  transform: translateY(var(--space-7));
}
</style>
