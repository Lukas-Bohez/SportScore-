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
          <Check class="generic-checkbox-icon" :stroke-width="3" />
        </label>
      </div>
      <div class="label-wrapper">
        <span class="label-text">{{ label }}</span>
        <!-- <div
          v-if="showDot"
          class="color-dot circle-base"
          :style="{ backgroundColor: dotColor }"
        ></div> -->
      </div>
    </div>
    <div class="actions">
      <button
        @click="($emit('edit'), (showModel = true))"
        class="icon-button hover-opacity edit-button"
        type="button"
      >
        <Pencil class="generic-checkbox-icon" />
      </button>
      <button
        @click="$emit('delete')"
        class="icon-button hover-opacity delete-button"
        type="button"
      >
        <GenericModel v-if="showModel" @close="showModel = false" />
        <Trash2 class="generic-checkbox-icon" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Check, Pencil, Trash2 } from "lucide-vue-next";
import GenericModel from "../Generic/GenericModel.vue";
import GenericButton from "./GenericButton.vue";

const showModel = ref(false);

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
  // dotColor: {
  //   type: String,
  //   default: "#EE1313",
  // },
});

defineEmits(["update:checked", "edit", "delete"]);

defineOptions({
  name: "GenericCheckbox",
});
</script>

<style scoped>
.generic-checkbox {
  width: 100%;
  min-height: 2.8125rem;
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
  gap: var(--space-5);
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
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--black-40);
  border-radius: var(--radius-S);
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--white);
}

.generic-checkbox-icon {
  width: 1rem;
  height: 1rem;
}

.checkbox-custom .generic-checkbox-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: var(--blue-100);
}

.checkbox-input:checked + .checkbox-custom {
  background-color: var(--white);
  border-color: var(--blue-100);
}

.checkbox-input:checked + .checkbox-custom .generic-checkbox-icon {
  opacity: 1;
}

.checkbox-input:focus + .checkbox-custom {
  border-color: var(--blue-100);
}

.label-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.label-text {
  font-size: 1.125rem;
  line-height: 1.5rem;
  color: var(--black-100);
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
