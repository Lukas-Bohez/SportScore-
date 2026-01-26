<template>
  <div class="feature-active-session">
    <p class="feature-active-session-header">
      <div class="color-dot"></div>
      {{ session.name }}
    </p>
    <p>{{ session.activities }} Activiteiten</p>
    <p>{{ session.teams }} teams</p>
  </div>
</template>

<script setup>
defineProps({
  session: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.id && value.name && typeof value.activities === 'number' && typeof value.teams === 'number';
    }
  }
});
</script>
<style scoped>
.feature-active-session {
    border: 2px solid var(--blue-100);
    width: fit-content;
    padding: var(--space-4) var(--space-8) var(--space-4) var(--space-4);
}
.feature-active-session-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}
.color-dot {
    width: .5625rem;
    height: .5625rem;
    background-color: var(--red-60);
    border-radius: var(--radius-XL);
}
</style>
