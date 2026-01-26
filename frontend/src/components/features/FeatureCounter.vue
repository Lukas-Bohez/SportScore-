<template>
  <div class="feature-counter">
    <button class="feature-counter-icon" @click="increment">
      <Plus class="feature-counter-icon-svg" />
    </button>
    <div class="feature-counter-form">
      <GenericInput
        type="number"
        v-model="count"
        @update:modelValue="handleInput"
        class="feature-counter-input"
      />
    </div>

    <button class="feature-counter-icon" @click="decrement">
      <Minus class="feature-counter-icon-svg" />
    </button>
  </div>
</template>

<script>
import { Plus, Minus } from "lucide-vue-next";
import GenericInput from "../Generic/GenericInput.vue";

export default {
  name: "FeatureCounter",
  components: {
    Plus,
    Minus,
    GenericInput,
  },
  props: {
    initialValue: {
      type: Number,
      default: 1,
    },
    modelValue: {
      type: Number,
      default: 0,
    },
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: Infinity,
    },
  },
  data() {
    return {
      count: this.modelValue || this.initialValue,
    };
  },
  watch: {
    modelValue(newVal) {
      this.count = newVal;
    },
  },
  methods: {
    increment() {
      if (this.count < this.max) {
        this.count++;
        this.$emit("change", this.count);
        this.$emit("update:modelValue", this.count);
      }
    },
    decrement() {
      if (this.count > this.min) {
        this.count--;
        this.$emit("change", this.count);
        this.$emit("update:modelValue", this.count);
      }
    },
    handleInput(value) {
      this.count = Number(value);
      if (this.count < this.min) {
        this.count = this.min;
      } else if (this.count > this.max) {
        this.count = this.max;
      }
      this.$emit("change", this.count);
      this.$emit("update:modelValue", this.count);
    },
  },
  emits: ["change", "update:modelValue"],
};
</script>

<style scoped>
.feature-counter {
  position: relative;
  /* width: 100%; */
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  color: var(--black-100);
}

.feature-counter-icon {
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-XL);
  background-color: var(--blue-100);
  cursor: pointer;
  color: var(--white);
  transition: opacity 0.2s ease;
}
.feature-counter-icon-svg {
  height: 1.5rem;
  width: 1.5rem;
}
.feature-counter-icon:hover {
  opacity: 0.7;
}

.feature-counter-icon:active {
  opacity: 0.5;
}

.feature-counter-form {
  height: 2.8125rem;
  width: 3.1875rem;
  position: relative;
}

.feature-counter :deep(.feature-counter-input) {
  width: 100%;
  padding-bottom: 0;
}

.feature-counter :deep(.feature-counter-input .generic-input__field) {
  height: 2.8125rem;
  border-radius: var(--radius-L);
  background-color: var(--black-10);
}

.input {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: var(--radius-L);
  background-color: var(--black-10);
  width: 3.1875rem;
  height: 2.8125rem;
  border: none;
  text-align: center;
  box-sizing: border-box;
  padding: 0;
}

.input::-webkit-inner-spin-button,
.input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input[type="number"] {
  -moz-appearance: textfield;
}
</style>
