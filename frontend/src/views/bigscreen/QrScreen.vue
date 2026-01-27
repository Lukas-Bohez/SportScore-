<template>
  <div class="qr-screen">
    <div class="qr-screen-logo">
      <img
        src="/sport_en_innovatie_logo.png"
        alt="Sport en Innovatie Logo"
        class="sport-logo"
      />
    </div>
    <h2><strong>SportScore!</strong></h2>
    <h4>Laat de wedstrijd <strong>beginnen!</strong></h4>

    <div class="qr-screen-content">
      <div class="qr-screen-content-left">
        <h3>Stap 1 <strong> Verbinden</strong></h3>
        <p>Scan de QR-code om je apparaat <br />te verbinden</p>
        <div class="qr-screen-qrcode">
          <img src="/png/wifi_qr.png" alt="WiFi QR Code" class="qr-image" />
        </div>
        <h3 class="margin-top">Of</h3>
        <div class="qr-screen-content-right">
          <h3>Met <strong>wifi</strong> verbinden</h3>
          <p>Verbind met de onderstaande wifi-hotspot.</p>
          <div class="qr-screen-wifi-info">
            <p><strong>SSID:</strong> PiHotspot</p>
            <p><strong>Password:</strong> raspberry</p>
          </div>
        </div>
      </div>
      <!-- <FeatureDevider /> -->

      <div class="qr-screen-content-left">
        <h3>Stap 2 <strong> Webapp</strong></h3>
        <p>
          Scan de QR-code om toegang te krijgen<br />
          tot SportScore
        </p>
        <div class="qr-screen-qrcode">
          <img src="/png/admin_qr.png" alt="Admin QR Code" class="qr-image" />
        </div>
        <h3 class="margin-top">Of</h3>
        <div class="qr-screen-content-right">
          <h3>Open de <strong>webapp</strong></h3>
          <p>Ga naar de onderstaande URL in je browser.</p>
          <div class="qr-screen-wifi-info">
            <p><strong>URL:</strong> http://10.42.0.1</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import FeatureDevider from "../../components/features/FeatureDevider.vue";
import { onMounted } from 'vue';

onMounted(() => {
  import('@/composables/useBigscreenFlow')
    .then(({ initBigscreenFlow }) => initBigscreenFlow())
    .catch((e) => console.warn('Failed to init bigscreen flow:', e));
});
</script>

<style scoped>
.qr-screen {
  position: relative;
  text-align: center;
  width: 100%;

  .qr-screen-logo {
    position: absolute;
    right: 1rem;
    top: 1rem;
    padding: var(--space-6) 0;
  }

  .sport-logo {
    height: 4rem;
    width: auto;
    object-fit: contain;
  }

  h2 {
    margin-top: var(--space-7);
  }
  h4 {
    margin: var(--space-6) 0;
  }
}
.qr-screen-content {
  display: flex;
  justify-content: space-evenly;
  /* align-items: space-between; */
  /* gap: var(--space-12); */
  /* margin-top: var(--space-7); */
  .qr-screen-content-left,
  .qr-screen-content-right {
    background: var(--red-50);
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
    width: 14rem;
    height: 14rem;
    background: var(--blue-20);
    padding: var(--space-3);
    border: 1px solid var(--blue-100);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
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

.qr-image {
  width: 100%;
  height: 100%;

  object-fit: contain;
}

/* Voeg margin toe aan FeatureDevider */
.qr-screen-content :deep(.divider) {
  margin: 0 12rem;
}
.margin-top {
  margin-top: var(--space-6);
}
</style>
