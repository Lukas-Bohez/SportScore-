<template>
  <label class="generic-checkbox">
    <div class="checkbox-content">
      <span class="el-checkbox">
        <span class="el-checkbox__input" :class="{ 'is-checked': checked4 }">
          <input
            type="checkbox"
            :id="id"
            v-model="checked4"
            @change="$emit('update:modelValue', checked4)"
            class="el-checkbox__original"
          />
          <span class="el-checkbox__inner">
            <Check :size="16" :stroke-width="3" />
          </span>
        </span>
        <span class="el-checkbox__label">
          <span class="text">{{ label }}</span>
          <div
            v-if="showDot"
            class="color-dot circle-base"
            :style="{ backgroundColor: dotColor }"
          />
        </span>
      </span>
    </div>

    <!-- Acties mogen NIET togglen -->
    <div class="actions" @click.stop>
      <button
        @click="$emit('edit')"
        class="icon-button hover-opacity edit-button"
        type="button"
      >
        <Pencil :size="20" />
      </button>
      <button
        @click="$emit('delete')"
        class="icon-button hover-opacity delete-button"
        type="button"
      >
        <Trash2 :size="20" />
      </button>
    </div>
  </label>
</template>

<script setup>
import { ref, watch } from "vue";
import { Check, Pencil, Trash2 } from "lucide-vue-next";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    required: true,
  },
  showDot: {
    type: Boolean,
    default: false,
  },
  dotColor: {
    type: String,
    default: "#EE1313",
  },
});

const emit = defineEmits(["update:modelValue", "edit", "delete"]);

const checked4 = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    checked4.value = newVal;
  },
);

defineOptions({
  name: "GenericCheckbox",
});
</script>

<style scoped>
.generic-checkbox {
  width: 100%;
  height: 2.8125rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  border-radius: var(--radius-L);
  border: 1px solid var(--black-40);
  box-sizing: border-box;
  transition: border-color 0.3s ease;
  font-family: var(--font-family);
  cursor: pointer;
}

.generic-checkbox:focus-within {
  border-color: var(--blue-100);
}

.checkbox-content {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

/* Element Plus checkbox structure with custom styling */
.el-checkbox {
  display: inline-flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.el-checkbox__input {
  display: inline-flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.el-checkbox__original {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;
  z-index: -1;
}

.el-checkbox__inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--black-40);
  border-radius: var(--radius-S);
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--white);
  box-sizing: border-box;
}

.el-checkbox__inner svg {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: var(--blue-100);
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: var(--white);
  border-color: var(--blue-100);
}

.el-checkbox__input.is-checked .el-checkbox__inner svg {
  opacity: 1;
  color: var(--blue-100);
}

.el-checkbox__original:focus + .el-checkbox__inner {
  border-color: var(--blue-100);
}

.el-checkbox__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-left: var(--space-3);
}

.color-dot {
  width: 0.5625rem;
  height: 0.5625rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-button {
  color: var(--blue-100);
}

.delete-button {
  color: var(--red-100);
}

.icon-button:active {
  transform: scale(0.95);
}
</style>
