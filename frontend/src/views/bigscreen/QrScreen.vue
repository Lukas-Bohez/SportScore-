<template>
  <div class="qr-screen">
    <h2><strong>SportScore!</strong></h2>
    <h4>Laat de wedstrijd <strong>beginnen!</strong></h4>

    <!-- TEST KNOP - verwijder dit later -->
    <!-- <div style="position: fixed; top: 10px; right: 10px; z-index: 9999">
      <button
        @click="testNavigate"
        style="
          padding: 10px 20px;
          background: red;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        "
      >
        TEST: Ga naar Loading
      </button>
    </div> -->

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
import { onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useBigScreenSync } from "@/composables/useBigScreenSync";

const router = useRouter();
const { currentScreen, startPolling, stopPolling } = useBigScreenSync();

// TEST functie - verwijder dit later
const testNavigate = () => {
  console.log("🧪 TEST: Manually navigating to LoadingScreen");
  router.push({ name: "loadingScreen" });
};

// Watch for screen changes
watch(currentScreen, (newScreen) => {
  if (!newScreen) return;

  console.log("📺 QrScreen: Screen change detected:", newScreen);

  // Map screen names to routes
  const screenRoutes = {
    loading: "loadingScreen",
    countdown: "countdown",
    podium: "podiumscreen",
    scorescreen: "scorescreen",
    qrscreen: "qrscreen",
  };

  const routeName = screenRoutes[newScreen.screen];
  if (routeName && routeName !== "qrscreen") {
    // Don't navigate to itself
    console.log(`📺 QrScreen: Navigating to ${routeName}...`);
    router.push({
      name: routeName,
      params: newScreen.session_id ? { id: newScreen.session_id } : {},
    });
  }
});

onMounted(() => {
  console.log("📺 QrScreen: Starting screen sync...");
  startPolling();
});

onUnmounted(() => {
  console.log("📺 QrScreen: Stopping screen sync...");
  stopPolling();
});
</script>

<style scoped>
.qr-screen {
  text-align: center;
  width: 100%;
  h2 {
    margin-top: var(--space-10);
  }
  h4 {
    margin-top: var(--space-8);
  }
}
.qr-screen-content {
  display: flex;
  justify-content: space-around;
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
    width: 18.75rem;
    height: 18.75rem;
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
