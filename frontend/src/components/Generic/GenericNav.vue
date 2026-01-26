<script>
import { House, MonitorCheck, Swords, List, Plus, PowerOff } from "lucide-vue-next";
import GenericButton from "./GenericButton.vue";
import ShutdownModal from "../ShutdownModal.vue";
import { RouterLink } from "vue-router";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";

export default {
  name: "GenericNav",
  components: {
    House,
    MonitorCheck,
    Swords,
    List,
    Plus,
    PowerOff,
    GenericButton,
    ShutdownModal,
  },
  setup() {
    const showShutdownModal = ref(false);
    const isShuttingDown = ref(false);

    const openShutdownModal = () => {
      showShutdownModal.value = true;
    };

    const closeShutdownModal = () => {
      showShutdownModal.value = false;
    };

    const { post } = useApi();

    const handleShutdown = async () => {
      isShuttingDown.value = true;
      try {
        await post('/api/v1/system/shutdown');
        alert('Shutdown gestart. De Raspberry Pi zal nu afsluiten.');
        // Keep modal open with busy state
      } catch (error) {
        const msg = String(error && (error.message || error.detail)) || String(error);
        if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
          alert('Fout: ongeldige admin secret.');
          isShuttingDown.value = false;
          closeShutdownModal();
        } else {
          alert('Fout bij afsluiten: ' + msg);
          isShuttingDown.value = false;
          closeShutdownModal();
        }
      }
    };

    return {
      showShutdownModal,
      isShuttingDown,
      openShutdownModal,
      closeShutdownModal,
      handleShutdown,
    };
  },
};
</script>

<template>
  <nav class="generic-nav">
    <RouterLink to="/" class="generic-nav-item">
      <House :size="22" class="icon" />
      <span class="caption">Home</span>
    </RouterLink>

    <RouterLink to="/templates" class="generic-nav-item">
      <List :size="22" class="icon" />
      <span class="caption">Templates</span>
    </RouterLink>

    <RouterLink to="/geschiedenis" class="generic-nav-item">
      <Swords :size="22" class="icon" />
      <span class="caption">Geschiedenis</span>
    </RouterLink>

    <button 
      class="generic-nav-item generic-nav-item--shutdown" 
      @click="openShutdownModal"
      :disabled="isShuttingDown"
    >
      <PowerOff :size="22" class="icon" />
      <span class="caption">{{ isShuttingDown ? 'Bezig...' : 'Uit' }}</span>
    </button>
  </nav>

  <ShutdownModal 
    :show="showShutdownModal" 
    @close="closeShutdownModal"
    @confirm="handleShutdown"
  />
</template>

<style scoped>
.generic-nav {
  align-self: end;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  color: var(--black-100);
  max-width: 50rem;
  padding: 0 var(--space-6);
}
.generic-nav-item {
  width: 4.375rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  cursor: pointer;
  transition: color 0.3s ease;
  text-decoration: none;
  color: var(--black-100);
  background: none;
  border: none;
  font-family: var(--font-family);
  font-size: inherit;
}
/* Use router-link-active for active state */
.router-link-active,
.generic-nav-item:hover {
  color: var(--blue-100);
}

/* Shutdown button styling */
.generic-nav-item--shutdown {
  color: var(--red-100);
}

.generic-nav-item--shutdown:hover:not(:disabled) {
  color: var(--red-80);
}

.generic-nav-item--shutdown:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generic-nav-item--addButton {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--radius-XL);
  padding: var(--space-4);
}
.icon {
  color: inherit;
}
</style>
