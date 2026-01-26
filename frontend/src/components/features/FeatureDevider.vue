<template>
  <div class="divider">
    <div class="divider__line divider__line--top" />
    <h1 class="divider__title">Of</h1>
    <div class="divider__line divider__line--bottom" />
  </div>
</template>
<script setup>
defineOptions({
  name: "FeatureDivider",
});
</script>
<style scoped>
.divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
  height: 100%;
  color: var(--blue-100);
}

.divider__line {
  background-color: var(--black-60);
  width: 0.0625rem;
  height: 12.5rem;
}

.divider__title {
  margin: 0;
}
</style>
