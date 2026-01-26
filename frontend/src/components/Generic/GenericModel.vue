<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="generic-model-overlay" @click.self="closeModal">
        <div class="generic-model">
          <button class="generic-model__close-button" @click="closeModal">
            <X :size="24" />
          </button>
          <div class="generic-model__content">
            <div class="generic-model__icon-wrapper">
              <component
                :is="iconComponent"
                class="generic-model__icon"
                :size="48"
                :style="{ stroke: iconColor }"
              />
            </div>
            <div class="generic-model__message text">
              {{ message }}
            </div>
            <div class="generic-model__buttons">
              <GenericButtonNew
                v-if="showCancel"
                :label="cancelText"
                variant="secondary"
                :showIcons="false"
                @click="handleCancel"
              />
              <GenericButtonNew
                :label="confirmText"
                variant="primary"
                :showIcons="false"
                @click="handleConfirm"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { TriangleAlert, CircleCheck, X } from "lucide-vue-next";
import GenericButtonNew from "./GenericButton.vue";

export default {
  name: "GenericModel",
  components: {
    TriangleAlert,
    CircleCheck,
    X,
    GenericButtonNew,
  },
  data() {
    return {
      isOpen: false,
    };
  },
  props: {
    message: {
      type: String,
      default: "Bent u zeker dat u deze sessie wilt stoppen?",
    },
    icon: {
      type: String,
      default: "triangle-alert",
      validator: (value) => ["triangle-alert", "circle-check"].includes(value),
    },
    iconColor: {
      type: String,
      default: "var(--red-100)",
    },
    confirmText: {
      type: String,
      default: "Ja",
    },
    cancelText: {
      type: String,
      default: "Nee",
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["confirm", "cancel"],
  computed: {
    iconComponent() {
      const iconMap = {
        "triangle-alert": "TriangleAlert",
        "circle-check": "CircleCheck",
      };
      return iconMap[this.icon] || "TriangleAlert";
    },
  },
  methods: {
    open() {
      this.isOpen = true;
    },
    closeModal() {
      this.isOpen = false;
    },
    handleConfirm() {
      this.$emit("confirm");
      this.closeModal();
    },
    handleCancel() {
      this.$emit("cancel");
      this.closeModal();
    },
  },
};
</script>

<style scoped>
.generic-model-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--background-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.generic-model {
  width: 20rem;
  border-radius: var(--radius-L);
  background-color: var(--white);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  padding: var(--space-7) var(--space-6) var(--space-6) var(--space-6);
}

.generic-model__close-button {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  background: none;
  border: none;
  cursor: pointer;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.generic-model__close-button :deep(svg) {
  stroke: var(--black-100);
  transition: stroke 0.2s;
}

.generic-model__close-button:hover :deep(svg) {
  stroke: var(--blue-100);
}

.generic-model__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding-top: var(--space-3);
}

.generic-model__icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.generic-model__message {
  text-align: center;
  max-width: 280px;
}

.generic-model__buttons {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  width: 100%;
  margin-top: var(--space-2);
}

/* Override Element Plus button hover */
.generic-model__buttons :deep(.el-button) {
  transition: all 0.2s ease !important;
}

.generic-model__buttons :deep(.el-button.generic-button--secondary:hover) {
  background-color: var(--blue-20) !important;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .generic-model,
.modal-leave-active .generic-model {
  transition: transform 0.3s ease;
}

.modal-enter-from .generic-model,
.modal-leave-to .generic-model {
  transform: scale(0.9);
}
</style>
