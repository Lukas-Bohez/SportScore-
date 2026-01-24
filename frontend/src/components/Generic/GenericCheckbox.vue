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
        @click="showDeleteModal"
        class="icon-button hover-opacity delete-button"
        type="button"
      >
        <Trash2 :size="20" />
      </button>
    </div>
  </label>

  <!-- Delete confirmation modal -->
  <GenericModel
    ref="modalRef"
    icon="triangle-alert"
    iconColor="var(--red-100)"
    :message="deleteMessage"
    confirmText="Ja"
    cancelText="Nee"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />
</template>

<script setup>
import { ref, watch } from "vue";
import { Check, Pencil, Trash2 } from "lucide-vue-next";
import GenericModel from "./GenericModel.vue";

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
  deleteMessage: {
    type: String,
    default: "Bent u zeker dat u dit item wilt verwijderen?",
  },
});

const emit = defineEmits(["update:modelValue", "edit", "delete"]);

const checked4 = ref(props.modelValue);
const modalRef = ref(null);

watch(
  () => props.modelValue,
  (newVal) => {
    checked4.value = newVal;
  },
);

// Show delete confirmation modal
function showDeleteModal() {
  modalRef.value?.open();
}

// Handle delete confirmation
function handleDeleteConfirm() {
  // Emit delete event so parent can handle API call
  emit("delete");
}

// Handle delete cancellation
function handleDeleteCancel() {
  // Modal will close automatically, no action needed
}

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

.el-checkboxinput.is-checked .el-checkboxinner:after {
  /* border-color: var(--el-checkbox-checked-icon-color);*/
  transform: translate(-45%, -60%) rotate(45deg) scaleY(1);
}
.el-checkbox__inner:after {
  border: none;
  border-left: 0;
  border-top: 0;
  box-sizing: content-box;
  content: "";
  height: 7px;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-45%, -60%) rotate(45deg) scaleY(0);
  transform-origin: center;
  transition: transform 0.15s ease-in 0.05s;
  width: 3px;
}
</style>
