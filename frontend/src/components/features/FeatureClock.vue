<template>
  <h2 class="feature-clock">
    {{ formattedTime }}
  </h2>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
  initialTime: {
    type: [Number, String],
    default: 0,
    validator: (value) => {
      //voor als je volledige seconden wilt plaatsen
      //   if (typeof value === "number") {
      //     return value >= 0;
      //   }

      //voor als je tijd in HH:MM:SS formaat wilt plaatsen
      if (typeof value === "string") {
        return /^\d{2}:\d{2}:\d{2}$/.test(value);
      }
      return false;
    },
  },
});

const parseTimeToSeconds = (time) => {
  if (typeof time === "number") {
    return time;
  }
  if (typeof time === "string") {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
};

const remainingSeconds = ref(parseTimeToSeconds(props.initialTime));
let intervalId = null;

const formattedTime = computed(() => {
  const hours = Math.floor(remainingSeconds.value / 3600);
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60);
  const seconds = remainingSeconds.value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
});

onMounted(() => {
  intervalId = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--;
    } else {
      clearInterval(intervalId);
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

defineOptions({
  name: "FeatureClock",
});
</script>

<style scoped>
.feature-clock {
  background-color: var(--blue-70);
  color: var(--white);
  padding: var(--space-5) var(--space-7);
  border-radius: var(--radius-L);
  display: inline-block;
}
</style>
