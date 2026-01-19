<template>
  <div class="generic-stepbar">
    <div
      v-for="step in totalSteps"
      :key="step"
      class="generic-stepbar__step"
      :class="{
        'generic-stepbar__step--active': step === currentStep,
        'generic-stepbar__step--completed': step < currentStep,
      }"
    >
      <div class="generic-stepbar__circle circle-base">
        <span class="generic-stepbar__number .button">{{ step }}</span>
      </div>
      <div
        v-if="step < totalSteps"
        class="generic-stepbar__line"
        :class="{ 'generic-stepbar__line--completed': step < currentStep }"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "GenericStepBar",
  props: {
    currentStep: {
      type: Number,
      default: 1,
    },
    totalSteps: {
      type: Number,
      default: 4,
    },
  },
};
</script>

<style scoped>
.generic-stepbar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 17.1875rem;
  padding-bottom: 2rem;
}

.generic-stepbar__step {
  display: flex;
  align-items: center;
  position: relative;
}

.generic-stepbar__circle {
  width: 2.1875rem;
  height: 2.1875rem;
  background-color: var(--white);
  border: 2px solid var(--blue-100);
  position: relative;
  z-index: 2;
}

.generic-stepbar__step--active .generic-stepbar__circle {
  background-color: var(--blue-100);
  border-color: var(--blue-100);
}

.generic-stepbar__step--active .generic-stepbar__number {
  color: var(--white);
}

.generic-stepbar__step--completed .generic-stepbar__circle {
  background-color: var(--blue-100);
  border-color: var(--blue-100);
}

.generic-stepbar__step--completed .generic-stepbar__number {
  color: var(--white);
}

.generic-stepbar__line {
  width: 3.75rem;
  height: 2px;
  background-color: var(--blue-100);
  position: relative;
  z-index: 1;
}

.generic-stepbar__line--completed {
  background-color: var(--blue-100);
}

@media screen and (max-width: 400px) {
  .generic-stepbar__line {
    width: 2.5rem;
  }
}
</style>
