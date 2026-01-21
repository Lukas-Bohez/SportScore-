<template>
  <div class="background-effect">
    <div class="spinner-container">
      <div class="spinner"></div>
    </div>
    <h2><strong>SportScore!</strong></h2>
    <h4><strong>Verbonden!</strong> We starten je sessie…</h4>
  </div>
</template>

<script setup></script>

<style scoped>
.loading-screen {
  text-align: center;

  h2 {
    margin-top: var(--space-10);
  }

  h4 {
    margin-top: var(--space-8);
  }
}

.spinner-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  width: 10rem;
  height: 10rem;
  border: 0.65rem solid var(--blue-100);
  border-top: 0.65rem solid var(--white);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
