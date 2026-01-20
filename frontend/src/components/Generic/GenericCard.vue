<template>
  <div class="generic-card">
    <p>{{ title }}</p>
    <p>{{ date }}</p>
  </div>
</template>

<script setup>
defineOptions({ name: "GenericCard" });

defineProps({
  title: {
    type: String,
    required: true,
    default: "",
  },
  date: {
    type: String,
    required: true,
    default: "",
  },
});
</script>
<style scoped>
.generic-card {
  border: 2px solid var(--black-40);
  background-color: var(--white);
  border-radius: var(--radius-L);
  display: flex;
  justify-content: space-between;
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
</style>
