<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <PowerOff :size="32" class="modal-icon" />
            <h2>Raspberry Pi Uitschakelen</h2>
          </div>
          
          <div class="modal-body">
            <p>Weet je zeker dat je de Raspberry Pi wilt uitschakelen?</p>
            <p class="modal-warning">
              <AlertTriangle :size="18" />
              Dit kan niet ongedaan worden gemaakt.
            </p>
          </div>
          
          <div class="modal-footer">
            <GenericButton 
              variant="secondary" 
              @click="handleCancel"
              :disabled="isShuttingDown"
            >
              Annuleren
            </GenericButton>
            <GenericButton 
              variant="danger" 
              @click="handleConfirm"
              :disabled="isShuttingDown"
            >
              <PowerOff :size="18" v-if="!isShuttingDown" />
              <span v-if="isShuttingDown">Bezig met uitschakelen...</span>
              <span v-else>Uitschakelen</span>
            </GenericButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { PowerOff, AlertTriangle } from 'lucide-vue-next';
import GenericButton from './Generic/GenericButton.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'confirm']);

const isShuttingDown = ref(false);

const handleCancel = () => {
  if (!isShuttingDown.value) {
    emit('close');
  }
};

const handleConfirm = async () => {
  isShuttingDown.value = true;
  emit('confirm');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--white);
  border-radius: var(--radius-L);
  padding: var(--space-8);
  max-width: 28rem;
  width: 90%;
  box-shadow: var(--shadow-3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-2rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.modal-icon {
  color: var(--red-100);
}

.modal-header h2 {
  margin: 0;
  color: var(--black-100);
  text-align: center;
}

.modal-body {
  margin-bottom: var(--space-8);
  text-align: center;
}

.modal-body p {
  margin-bottom: var(--space-4);
  color: var(--black-70);
  line-height: 1.5;
}

.modal-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--red-100);
  font-weight: 500;
  background: var(--red-10);
  padding: var(--space-3);
  border-radius: var(--radius-S);
}

.modal-footer {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
}

.modal-footer button {
  flex: 1;
}

/* Transition effects */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
