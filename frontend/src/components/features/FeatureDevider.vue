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
  gap: 1rem;
  height: 100%;
  font-size: 40px;
  color: var(--blue-100);
}

.divider__line {
  background-color: var(--black-60);
  width: 1px;
  height: 201px;
}

.divider__title {
  line-height: 48px;
  margin: 0;
}
</style>
