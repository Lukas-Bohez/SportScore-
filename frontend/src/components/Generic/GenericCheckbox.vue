<template>
  <div class="generic-checkbox">
    <div class="checkbox-content">
      <div class="checkbox-wrapper">
        <input
          type="checkbox"
          :id="id"
          :checked="checked"
          @change="$emit('update:checked', $event.target.checked)"
          class="checkbox-input"
        />
        <label :for="id" class="checkbox-custom circle-base">
          <Check :size="16" :stroke-width="3" />
        </label>
      </div>
      <div class="label-wrapper">
        <span class="label-text">{{ label }}</span>
        <div
          v-if="showDot"
          class="color-dot circle-base"
          :style="{ backgroundColor: dotColor }"
        ></div>
      </div>
    </div>
    <div class="actions">
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
  </div>
</template>

<script setup>
import { Check, Pencil, Trash2 } from "lucide-vue-next";

defineProps({
  label: {
    type: String,
    required: true,
  },
  checked: {
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

defineEmits(["update:checked", "edit", "delete"]);

defineOptions({
  name: "GenericCheckbox",
});
</script>

<style scoped>
.generic-checkbox {
  width: 100%;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  border-radius: var(--radius-L);
  border: 1px solid var(--black-40);
  box-sizing: border-box;
  transition: border-color 0.3s ease;
  font-family: var(--font-family);
}

.generic-checkbox:focus-within {
  border-color: var(--blue-100);
}

.checkbox-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.checkbox-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;
}

.checkbox-custom {
  width: 24px;
  height: 24px;
  border: 1px solid var(--black-40);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--white);
}

.checkbox-custom svg {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: var(--blue-100);
}

.checkbox-input:checked + .checkbox-custom {
  background-color: var(--white);
  border-color: var(--blue-100);
}

.checkbox-input:checked + .checkbox-custom svg {
  opacity: 1;
}

.checkbox-input:focus + .checkbox-custom {
  border-color: var(--blue-100);
}

.label-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.label-text {
  font-size: 18px;
  line-height: 24px;
  color: var(--black-100);
}

.color-dot {
  width: 9px;
  height: 9px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
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
