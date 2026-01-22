<template>
  <div class="generic-input">
    <label v-if="label" class="text">{{ label }}</label>
    <input
      class="input-base generic-input__field text"
      :type="type"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
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

/* Remove spinner arrows from number input */
.generic-input__field::-webkit-inner-spin-button,
.generic-input__field::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.generic-input__field[type="number"] {
  -moz-appearance: textfield;
}
</style>
