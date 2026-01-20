<template>
  <div class="generic-model-overlay" @click.self="$emit('close')">
    <div class="generic-model">
      <button class="generic-model__close-button" @click="$emit('close')">
        <X />
      </button>
      <div class="generic-model__content">
        <div class="generic-model__icon-wrapper">
          <component
            :is="iconComponent"
            class="generic-model__icon"
            :style="{ stroke: iconColor }"
          />
        </div>
        <div class="generic-model__message text">
          {{ message }}
        </div>
        <div class="generic-model__buttons">
          <GenericButton variant="secondary" label="Nee" />
          <GenericButton variant="primary" label="Ja" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { TriangleAlert, CircleCheck, X } from "lucide-vue-next";
import GenericButton from "./GenericButton.vue";

export default {
  name: "GenericModel",
  components: {
    TriangleAlert,
    CircleCheck,
    X,
    GenericButton,
  },
  props: {
    message: {
      type: String,
      default: "Bent u zeker dat u het team wilt verwijderen?",
    },
    icon: {
      type: String,
      default: "triangle-alert",
      validator: (value) => ["triangle-alert", "circle-check"].includes(value),
    },
    iconColor: {
      type: String,
      default: null,
    },
  },
  computed: {
    iconComponent() {
      const iconMap = {
        "triangle-alert": "TriangleAlert",
        "circle-check": "CircleCheck",
      };
      return iconMap[this.icon] || "TriangleAlert";
    },
    computedIconColor() {
      if (this.iconColor) {
        return this.iconColor;
      }
      // Default colors based on icon type
      return this.icon === "circle-check"
        ? "var(--green-100)"
        : "var(--red-100)";
    },
  },
  emits: ["close", "cancel", "confirm"],
};
</script>

<style scoped>
.generic-model-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  margin: 0;
  padding: 0;
}

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

.generic-model__icon {
  width: 2rem; /* 32px */
  height: 2rem; /* 32px */
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
