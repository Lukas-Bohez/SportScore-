<template>
  <div class="scorescreen-container">
    <!-- Confetti particles -->
    <div class="confetti-container">
      <div
        v-for="i in 50"
        :key="i"
        class="confetti"
        :style="getConfettiStyle(i)"
      ></div>
    </div>

    <div class="scorescreen-header">
      <div class="header-item animate-slide-in" style="animation-delay: 0s">
        <FeatureClock initialTime="00:00:00" />
      </div>
      <h2 class="header-item animate-scale-in" style="animation-delay: 0.2s">
        Leaderboard
      </h2>
      <h2 class="header-item animate-slide-in" style="animation-delay: 0.4s">
        Voetbal
      </h2>
    </div>
    <div class="scorescreen-content">
      <div class="podium-wrapper animate-bounce-in">
        <FeaturePodium />
      </div>
      <div
        class="scorescreen-content-header animate-fade-in"
        style="animation-delay: 1s"
      >
        <div class="scorescreen-content-header-left">
          <h2>#</h2>
          <h2>Speler</h2>
        </div>
        <h2>Punten</h2>
      </div>
      <div class="scorescreen-content-results">
        <div class="result-item" style="animation-delay: 1.2s">
          <GenericResult rank="4" player="Rune" score="15" />
        </div>
        <div class="result-item" style="animation-delay: 1.4s">
          <GenericResult rank="5" player="Jonathan" score="14" />
        </div>
        <div class="result-item" style="animation-delay: 1.6s">
          <GenericResult rank="5" player="Jonathan V" score="14" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureClock from "../../components/features/FeatureClock.vue";
import FeaturePodium from "../../components/features/FeaturePodium.vue";
import GenericResult from "../../components/Generic/GenericResult.vue";

// Generate random confetti styles
const getConfettiStyle = (index) => {
  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
  ];
  const left = Math.random() * 100;
  const animationDelay = Math.random() * 3;
  const animationDuration = 3 + Math.random() * 4;

  return {
    left: `${left}%`,
    backgroundColor: colors[index % colors.length],
    animationDelay: `${animationDelay}s`,
    animationDuration: `${animationDuration}s`,
  };
};
</script>
<style scoped>
.scorescreen-container {
  position: relative;
  overflow: hidden;
}

/* Confetti Animation */
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10px;
  opacity: 0;
  animation: confetti-fall linear infinite;
  border-radius: 2px;
  transform-origin: center;
}

@keyframes confetti-fall {
  0% {
    top: -10px;
    opacity: 1;
    transform: translateX(0) rotateZ(0deg);
  }
  100% {
    top: 100vh;
    opacity: 0;
    transform: translateX(100px) rotateZ(720deg);
  }
}

/* Header Animations */
.scorescreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-8) var(--space-6);
  border-bottom: 2px solid var(--gray-200);
  position: relative;
  z-index: 2;
}

.header-item {
  animation-fill-mode: forwards;
}

@keyframes slide-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-slide-in {
  animation: slide-in-up 0.8s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Content Animations */
.scorescreen-content {
  padding: var(--space-6);
  position: relative;
  z-index: 2;
}

/* Podium Animation */
.podium-wrapper {
  animation: bounce-in 1s ease-out 0.6s forwards;
  transform-origin: bottom center;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(100px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(-10px);
  }
  70% {
    transform: scale(0.95) translateY(5px);
  }
  85% {
    transform: scale(1.02) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-bounce-in {
  animation: bounce-in 1s ease-out;
}

/* Header Table Animation */
.scorescreen-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-6);
  margin-bottom: var(--space-4);
  padding-top: var(--space-10);
  animation-fill-mode: forwards;
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scorescreen-content-header-left {
  display: flex;
  gap: var(--space-6);
}

/* Results Animation */
.scorescreen-content-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result-item {
  opacity: 0;
  animation: slide-in-left 0.6s ease-out forwards;
  transform-origin: left center;
}

@keyframes slide-in-left {
  0% {
    opacity: 0;
    transform: translateX(-50px) scale(0.9);
  }
  60% {
    transform: translateX(10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Shimmer effect for dramatic entrance */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Add glow effect to container on load */
.scorescreen-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 215, 0, 0.1),
    transparent
  );
  animation: shimmer 2s ease-in-out 0.5s;
  pointer-events: none;
  z-index: 3;
}
</style>
