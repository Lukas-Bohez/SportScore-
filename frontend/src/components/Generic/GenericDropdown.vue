<template>
  <div class="generic-input">
    <label v-if="label" class="text">{{ label }}</label>
    <div class="generic-dropdown__wrapper">
      <select
        class="input-base generic-input__field generic-dropdown__select"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <ChevronDown class="generic-dropdown__icon" :size="20" />
    </div>
  </div>
</template>

<script>
import { ChevronDown } from "lucide-vue-next";

export default {
  name: "GenericDropdown",
  components: {
    ChevronDown,
  },
  props: {
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "Selecteer een optie",
    },
    options: {
      type: Array,
      required: true,
      default: () => [],
    },
    modelValue: {
      type: [String, Number],
      default: "",
    },
  },
  emits: ["update:modelValue"],
};
</script>

<style scoped>
.generic-dropdown__wrapper {
  position: relative;
  width: 100%;
}

.generic-dropdown__select {
  appearance: none;
  padding-right: var(--space-7);
  cursor: pointer;
  width: 100%;
}

.generic-dropdown__icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--blue-100);
}

.generic-dropdown__select option {
  color: var(--black-100);
  background-color: var(--white);
  padding: var(--space-3);
}
</style>
