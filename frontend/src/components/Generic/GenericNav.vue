<script>
import { House, MonitorCheck, Swords, List, Plus } from "lucide-vue-next";
import GenericButton from "./GenericButton.vue";
import { RouterLink } from "vue-router";

export default {
  name: "GenericNav",
  components: {
    House,
    MonitorCheck,
    Swords,
    List,
    Plus,
    GenericButton,
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

    <!-- Midden knop -->
    <!-- <GenericButton
      class="generic-nav-item--addButton"
      variant="primary"
    >
      <Plus :size="24" />
    </GenericButton> -->

    <RouterLink to="/geschiedenis" class="generic-nav-item">
      <Swords :size="22" class="icon" />
      <span class="caption">Geschiedenis</span>
    </RouterLink>
    <!-- 
    <RouterLink to="/actief" class="generic-nav-item">
      <MonitorCheck :size="22" class="icon" />
      <span class="caption">Actief</span>
    </RouterLink> -->
  </nav>
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
  /* padding: var(--space-4) 0; */
  cursor: pointer;
  transition: color 0.3s ease;
  text-decoration: none;
  color: var(--black-100);
}
/* Use router-link-active for active state */
.router-link-active,
.generic-nav-item:hover {
  color: var(--blue-100);
}
.generic-nav-item--addButton {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--radius-XL);
  padding: var(--space-4);
}
/* .generic-nav-item--addButton:hover {
  background-color: var(--blue-100);
} */
.icon {
  color: inherit;
}
</style>
