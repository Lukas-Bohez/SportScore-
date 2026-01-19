<template>
  <div class="generic-model">
    <button class="generic-model__close-button" @click="$emit('close')">
      <X />
    </button>
    <div class="generic-model__content">
      <div class="generic-model__icon-wrapper">
        <!-- <i data-lucide="triangle-alert" class="generic-model__warning-icon"></i> -->
        <TriangleAlert class="generic-model__warning-icon" />
      </div>
      <div class="generic-model__message text">
        Bent u zeker dat u het team wilt verwijderen?
      </div>
      <div class="generic-model__buttons">
        <GenericButton variant="secondary" label="Nee" />
        <GenericButton variant="primary" label="Ja" />
      </div>
    </div>
  </div>
</template>

<script>
import { TriangleAlert, X } from "lucide-vue-next";
import GenericButton from "./GenericButton.vue";

export default {
  name: "GenericModel",
  components: {
    TriangleAlert,
    X,
    GenericButton,
  },
  emits: ["close", "cancel", "confirm"],
};
</script>

<style scoped>
.generic-model {
  width: 20rem; /* 320px */
  border-radius: var(--radius-L);
  background-color: var(--white);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  padding: var(--space-7) var(--space-6) var(--space-6) var(--space-6);
}

.generic-model__close-button {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  background: none;
  border: none;
  cursor: pointer;
  width: 1.5rem; /* 24px */
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: stroke 0.2s;
}

.generic-model__close-button :deep(svg) {
  stroke: var(--black-100);
  width: 1.5rem; /* 24px */
  height: 1.5rem; /* 24px */
  transition: stroke 0.2s;
}

.generic-model__close-button:hover :deep(svg) {
  stroke: var(--blue-100);
}

.generic-model__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding-top: var(--space-3);
}

.generic-model__icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 3.5rem; /* 56px */
  height: 3.5rem; /* 56px */

  border-radius: var(--radius-XL);
}

.generic-model__warning-icon {
  width: 2rem; /* 32px */
  height: 2rem; /* 32px */
  stroke: var(--red-100);
}

.generic-model__message {
  text-align: center;
  max-width: 280px;
}

.generic-model__buttons {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  width: 100%;
  margin-top: var(--space-2);
}
.generic-model__buttons :deep(svg) {
  display: none;
}
</style>
