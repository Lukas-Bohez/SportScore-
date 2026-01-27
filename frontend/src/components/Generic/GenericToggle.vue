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

    <!-- Optional third mode (Teams & spelers) shown unless compact=true -->
    <GenericButton
      v-if="!compact"
      :variant="activeButton === 'teams&spelers' ? 'primary' : 'tertiary'"
      label="Teams & spelers"
      @click="selectButton('teams&spelers')"
    />
  </div>
</template>

<script setup>
import GenericButton from "./GenericButton.vue";
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "teams",
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle", "update:modelValue"]);

const activeButton = computed(() => props.modelValue);
const compact = props.compact;

function selectButton(button) {
  emit("update:modelValue", button);
  emit("toggle", button);
}
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
