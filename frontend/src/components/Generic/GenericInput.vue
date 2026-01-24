<template>
  <div class="generic-input">
    <label v-if="label" class="text">{{ label }}</label>
    <input
      class="input-base generic-input__field text"
      :class="{ 'generic-input__field--error': error }"
      :type="type"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="error" class="generic-input__error">{{ error }}</span>
  </div>
</template>

<script>
export default {
  name: "GenericInput",
  props: {
    label: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "text",
      validator: (value) => {
        // Valideer dat alleen geldige input types worden gebruikt
        return [
          "text",
          "number",
          "email",
          "password",
          "tel",
          "url",
          "date",
          "time",
          "datetime-local",
        ].includes(value);
      },
    },
    modelValue: {
      type: [String, Number],
      default: "",
    },
    error: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
};
</script>
<style scoped>
.generic-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* padding-bottom: 2rem; */
}

.generic-input__field {
  width: 100%;
}

.generic-input__field--error {
  border-color: var(--red-100, #ff0000);
}

.generic-input__error {
  color: var(--red-100, #ff0000);
  font-size: 0.875rem;
  margin-top: 0.1rem;
}

/* Remove spinner arrows from number input */
.generic-input__field::-webkit-inner-spin-button,
.generic-input__field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.generic-input__field[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
