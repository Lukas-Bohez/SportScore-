<template>
  <GenericButton variant="primary" label="Open Model" @click="showModel = true" />
  <GenericModel v-if="showModel" @close="showModel = false" />
</template>
<script setup>
import { ref } from 'vue';
import GenericButton from "../Generic/GenericButton.vue";
import GenericModel from "../Generic/GenericModel.vue";

const showModel = ref(false);
</script>
<style scoped></style>
