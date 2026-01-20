<template>
  <button
    :class="['generic-button', `generic-button--${variant}`]"
    @click="$emit('click', $event)"
  >
    <slot><ChevronLeft />{{ label }} <ChevronRight /></slot>
  </button>
</template>

<script>
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
export default {
  name: "GenericButton",
  components: {
    ChevronLeft,
    ChevronRight,
  },
  props: {
    label: {
      type: String,
      default: "Nieuwe sessie",
    },
    variant: {
      type: String,
      default: "primary",
      validator: (value) =>
        ["primary", "secondary", "tertiary", "quaternary"].includes(value),
    },
  },
  emits: ["click"],
};
</script>

<style scoped>
.generic-button {
  border-radius: var(--radius-M);
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) var(--space-5);
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  gap: var(--space-4);
  border: 1px solid var(--blue-100);
}

.generic-button--primary {
  background-color: var(--blue-100);
  color: var(--white);
}

.generic-button--primary:hover {
  background-color: var(--blue-80);
}

.generic-button--secondary {
  background-color: transparent;
  border: 1px solid var(--blue-100);
  color: var(--blue-100);
}

.generic-button--secondary:hover {
  background-color: var(--blue-20);
}

.generic-button--tertiary {
  background-color: transparent;
  border: 2px solid var(--black-40);
  color: var(--black-100);
}

/* Icon color styles */
.generic-button--primary :deep(svg) {
  color: var(--white);
}

.generic-button--secondary :deep(svg) {
  color: var(--blue-100);
}

.generic-button--tertiary :deep(svg) {
  color: var(--black-100);
}

.generic-button--quaternary {
  padding: 0 0;
  color: var(--black-100);
  background-color: transparent;
  /* background-color: var(--black-10); */
}

.generic-button--quaternary:hover {
  color: var(--black-50);
  background-color: transparent;
}
.generic-button--quaternary:hover :deep(svg) {
  color: var(--black-50);
}

.generic-button--quaternary:deep(svg) {
  color: var(--black-100);
  transition: all 0.3s ease;
}
</style>
