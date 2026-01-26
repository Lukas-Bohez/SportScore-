<template>
  <div class="FeatureCountdown-wrapper">
    <transition name="count" mode="out-in">
      <div :key="count" class="numberCount">
        {{ displayText }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

defineOptions({
  name: "FeatureCountdown",
});

const count = ref(3);

const displayText = computed(() => {
  return count.value > 0 ? count.value : "GO";
});

onMounted(() => {
  const interval = setInterval(() => {
    if (count.value > 0) {
      count.value--;
    } else {
      clearInterval(interval);
      // hier kan je navigeren of een event emitten
    }
  }, 1000);
});
</script>

<style scoped>
.FeatureCountdown-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  /* background: var(--white); */
}

.count-enter-active,
.count-leave-active {
  transition: all 0.4s ease;
}

.count-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.count-enter-to {
  opacity: 1;
  transform: scale(1);
}

.count-leave-from {
  opacity: 1;
  transform: scale(1);
}

.count-leave-to {
  opacity: 0;
  transform: scale(1.5);
}
</style>
