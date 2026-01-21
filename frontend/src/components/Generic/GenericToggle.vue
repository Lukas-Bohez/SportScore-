<template>
  <div class="generic-toggle">
    <GenericButton
      :variant="activeButton === 'teams' ? 'primary' : 'tertiary'"
      label="Teams"
      @click="selectButton('teams')"
    />
    <GenericButton
      :variant="activeButton === 'players' ? 'primary' : 'tertiary'"
      label="Spelers"
      @click="selectButton('players')"
    />
    <GenericButton
      :variant="activeButton === 'teams&spelers' ? 'primary' : 'tertiary'"
      label="Teams&spelers"
      @click="selectButton('teams&spelers')"
    />
  </div>
</template>

<script>
import GenericButton from "./GenericButton.vue";

export default {
  name: "GenericToggle",
  components: {
    GenericButton,
  },
  data() {
    return {
      activeButton: "teams", // Default actieve knop
    };
  },
  methods: {
    selectButton(button) {
      this.activeButton = button;
      this.$emit("toggle", button);
    },
  },
  emits: ["toggle"],
};
</script>

<style scoped>
.generic-toggle {
  position: relative;
  width: fit-content;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  gap: var(--space-4);
  text-align: center;
  color: var(--white);
  flex-wrap: wrap;
}

.generic-toggle :deep(svg) {
  display: none;
}
</style>
