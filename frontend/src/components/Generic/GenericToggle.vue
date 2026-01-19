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
  gap: var(--space-5);
  text-align: center;
  color: var(--white);
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.generic-toggle :deep(svg) {
  display: none;
}
</style>
