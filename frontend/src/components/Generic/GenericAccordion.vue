<template>
  <div class="generic-accordion">
    <div class="accordion-item">
      <div
        class="accordion-header"
        @click="toggleAccordion"
        role="button"
        :aria-expanded="isOpen"
        aria-controls="accordion-content"
        tabindex="0"
        @keydown.enter="toggleAccordion"
        @keydown.space.prevent="toggleAccordion"
      >
        <p class="accordion-title">{{ title }}</p>
        <svg
          class="accordion-icon"
          :class="{ rotated: isOpen }"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <transition name="accordion">
        <div
          v-show="isOpen"
          class="accordion-content"
          id="accordion-content"
          role="region"
        >
          <slot>
            <div class="accordion-items-list">
              <div
                v-for="(item, index) in items"
                :key="index"
                class="accordion-item-row"
              >
                <span class="item-team">{{ item.team }}</span>
                <span class="item-punten">{{ item.punten }} ptn</span>
              </div>
            </div>
          </slot>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  defaultOpen: {
    type: Boolean,
    default: false,
  },
});

const isOpen = ref(props.defaultOpen);

const toggleAccordion = () => {
  isOpen.value = !isOpen.value;
};
</script>

<style scoped>
.generic-accordion {
  border: 1px solid var(--black-20);
  border-radius: var(--radius-S);
  overflow: hidden;
}

.accordion-item {
  /* Removed border-bottom since we only have one item */
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5) var(--space-6);
  background-color: var(--white);
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  border-bottom: 2px solid var(--blue-50);
}

.accordion-header:hover {
  background-color: var(--blue-10);
}

.accordion-title {
  margin: 0;
  font-weight: 500;
  color: var(--black-100);
}

.accordion-icon {
  transition: transform 0.3s ease;
  color: var(--black-80);
  flex-shrink: 0;
}

.accordion-icon.rotated {
  transform: rotate(180deg);
}

.accordion-content {
  padding: var(--space-5) var(--space-6);
  background-color: var(--white);
}

.accordion-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.accordion-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
}

.accordion-item-row:not(:last-child) {
  border-bottom: 1px solid var(--black-10);
}

.item-team {
  font-weight: 400;
  color: var(--black-80);
}

.item-punten {
  font-weight: 500;
  color: var(--black-100);
}

.accordion-enter-active,
.accordion-leave-active {
  transition:
    max-height 0.3s ease-in-out,
    opacity 0.3s ease-in-out;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  max-height: 31.25rem;
  opacity: 1;
}
</style>
