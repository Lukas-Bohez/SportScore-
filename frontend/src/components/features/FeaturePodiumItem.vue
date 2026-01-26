<template>
  <div class="feature-podium-item">
    <div
      class="feature-podium-item-icon-wrapper"
      :class="`position-${position}`"
    >
      <h2 class="feature-podium-item-position">{{ position }}</h2>
    </div>
    <div class="feature-podium-item-content">
      <h4 class="feature-podium-item-title">{{ title }} {{ emoji }}</h4>
      <h2 class="feature-podium-item-score">{{ score }}</h2>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: "FeaturePodiumItem",
});

defineProps({
  position: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  emoji: {
    type: String,
    default: "🚔",
  },
  score: {
    type: Number,
    required: true,
  },
});
</script>
<style scoped>
.feature-podium-item {
  width: 11.5625rem; /* 185px */
  height: 10rem; /* 160px */
  position: relative;
  text-align: center;
  color: var(--white);
  background-color: var(--blue-80);
  border-radius: var(--radius-L);
}
.feature-podium-item-icon-wrapper {
  position: absolute;
  top: 0px;
  left: var(--space-3); /* 12px */
  background-color: var(--orange-80);
  width: 2rem; /* 32px */
  height: 3.25rem; /* 52px */
  clip-path: polygon(100% 0%, 100% 75%, 50% 100%, 0% 75%, 0% 0%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-podium-item-icon-wrapper.position-2 {
  background-color: var(--black-40);
}

.feature-podium-item-icon-wrapper.position-3 {
  background-color: var(--orange-100); /* Bronze kleur */
}

.feature-podium-item-position {
  position: relative;
  color: var(--white);
}
.feature-podium-item-content {
  position: absolute;
  top: calc(50% - 2rem);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.feature-podium-item-title {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feature-podium-item-score {
  align-self: stretch;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
