<script>
import { House, MonitorCheck, Swords, List, Plus } from "lucide-vue-next";
import GenericButton from "./GenericButton.vue";

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
  data() {
    return {
      activeItem: "home",
    };
  },
  methods: {
    setActive(item) {
      this.activeItem = item;
    },
  },
};
</script>

<template>
  <nav class="generic-nav">
    <div
      class="generic-nav-item"
      :class="{ 'generic-nav-item--active': activeItem === 'home' }"
      @click="setActive('home')"
    >
      <House :size="22" class="icon" />
      <span class="caption">Home</span>
    </div>

    <div
      class="generic-nav-item"
      :class="{ 'generic-nav-item--active': activeItem === 'templates' }"
      @click="setActive('templates')"
    >
      <List :size="22" class="icon" />
      <span class="caption">Templates</span>
    </div>

    <!-- Midden knop -->
    <GenericButton
      class="generic-nav-item--addButton"
      variant="primary"
      @click="setActive('add')"
    >
      <Plus :size="24" />
    </GenericButton>

    <div
      class="generic-nav-item"
      :class="{ 'generic-nav-item--active': activeItem === 'geschiedenis' }"
      @click="setActive('geschiedenis')"
    >
      <Swords :size="22" class="icon" />
      <span class="caption">Geschiedenis</span>
    </div>

    <div
      class="generic-nav-item"
      :class="{ 'generic-nav-item--active': activeItem === 'actief' }"
      @click="setActive('actief')"
    >
      <MonitorCheck :size="22" class="icon" />
      <span class="caption">Actief</span>
    </div>
  </nav>
</template>

<style scoped>
.generic-nav {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  color: var(--black-100);
}
.generic-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  cursor: pointer;
  transition: color 0.3s ease;
}
.generic-nav-item--active,
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
