<template>
  <el-button
    :class="['generic-button', `generic-button--${variant}`]"
    @click="$emit('click', $event)"
  >
    <ChevronLeft v-if="showIcons" />
    <span class="button">{{ label }}</span>
    <ChevronRight v-if="showIcons" />
  </el-button>
</template>

<script>
import { ElButton } from "element-plus";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import "element-plus/es/components/button/style/css";

export default {
  name: "GenericButtonNew",
  components: {
    ElButton,
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
        ["primary", "secondary", "tertiary"].includes(value),
    },
    showIcons: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["click"],
};
</script>

<style scoped>
.generic-button {
  border-radius: var(--radius-M) !important;
  width: fit-content !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: var(--space-5) var(--space-6) !important;
  cursor: pointer !important;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease !important;
  gap: var(--space-4) !important;
  height: auto !important;
  font-family: var(--font-family) !important;
  border: none !important;
}

.generic-button--primary {
  background-color: var(--blue-100) !important;
  color: var(--white) !important;
  border: none !important;
}

.generic-button--primary:hover {
  background-color: var(--blue-80) !important;
  border: none !important;
  color: var(--white) !important;
}

.generic-button--primary:focus {
  background-color: var(--blue-100) !important;
  border: none !important;
  color: var(--white) !important;
}

.generic-button--secondary {
  background-color: transparent !important;
  border: 1px solid var(--blue-100) !important;
  color: var(--blue-100) !important;
}

.generic-button--secondary:hover {
  background-color: var(--blue-20) !important;
  border: 1px solid var(--blue-100) !important;
  color: var(--blue-100) !important;
}

.generic-button--secondary:focus {
  background-color: transparent !important;
  border: 1px solid var(--blue-100) !important;
  color: var(--blue-100) !important;
}

.generic-button--tertiary {
  background-color: transparent !important;
  border: 2px solid var(--black-40) !important;
  color: var(--black-100) !important;
}

.generic-button--tertiary:hover {
  background-color: var(--black-10) !important;
  border: 2px solid var(--black-40) !important;
  color: var(--black-100) !important;
}

.generic-button--tertiary:focus {
  background-color: transparent !important;
  border: 2px solid var(--black-40) !important;
  color: var(--black-100) !important;
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
</style>
