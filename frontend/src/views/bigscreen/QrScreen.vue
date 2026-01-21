<template>
  <div class="qr-screen background-effect">
    <h2><strong>SportScore!</strong></h2>
    <h4>Laat de wedstrijd <strong>beginnen!</strong></h4>
    <div class="qr-screen-content">
      <div class="qr-screen-content-left">
        <h3>Scan deze <strong>QR-code</strong></h3>
        <p>Om je apparaat te verbinden</p>
        <div class="qr-screen-qrcode"></div>
      </div>
      <FeatureDevider />
      <div class="qr-screen-content-right">
        <h3>Met <strong>wifi</strong> verbinden</h3>
        <p>Verbind met de onderstaande wifi-hotspot.</p>
        <div class="qr-screen-wifi-info">
          <p><strong>SSID:</strong> SportScore-Event</p>
          <p><strong>Password:</strong> SportScore2024</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureDevider from "../../components/features/FeatureDevider.vue";
</script>

<style scoped>
.qr-screen {
  text-align: center;
  h2 {
    margin-top: var(--space-10);
  }
  h4 {
    margin-top: var(--space-8);
  }
}
.qr-screen-content {
  display: flex;
  justify-content: center;
  /* align-items: center; */
  gap: var(--space-12);
  margin-top: var(--space-7);
  .qr-screen-content-left,
  .qr-screen-content-right {
    background: var(--red-50);
    padding: var(--space-8);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-2);
    h3 {
      margin-bottom: var(--space-4);
    }
    p {
      margin-bottom: var(--space-4);
    }
  }
  .qr-screen-qrcode {
    width: 18.75rem;
    height: 18.75rem;
    background: var(--blue-20);
    padding: var(--space-3);
    border: 1px solid var(--blue-100);
    margin: 0 auto;
  }
  .qr-screen-wifi-info {
    background: var(--gray-100);
    padding: var(--space-4);
    border-radius: var(--radius-S);
    border: 1px solid var(--blue-100);
    p {
      margin: var(--space-2) 0;
    }
  }
}

/* Voeg margin toe aan FeatureDevider */
.qr-screen-content :deep(.divider) {
  margin: 0 12rem;
}
</style>
