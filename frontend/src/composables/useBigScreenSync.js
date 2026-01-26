import { ref, onMounted, onUnmounted } from "vue";

// Simple polling-based approach (no Socket.IO needed)
let pollingInterval = null;
let lastScreen = null;

export function useBigScreenSync() {
  const currentScreen = ref(null);

  // Poll the API for screen changes (simple approach without Socket.IO)
  const startPolling = () => {
    pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/bigscreen/status`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.screen !== lastScreen) {
            lastScreen = data.screen;
            currentScreen.value = data;
            console.log("📺 Screen update:", data);
          }
        }
      } catch (error) {
        // Silently fail - backend might not be available
      }
    }, 1000); // Poll every second
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  return {
    currentScreen,
    startPolling,
    stopPolling,
  };
}

// Simple notify function without Socket.IO
export async function notifyBigScreen(screen, sessionId = null, data = null) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/bigscreen/navigate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ screen, session_id: sessionId, data }),
      },
    );

    if (response.ok) {
      console.log("✅ BigScreen notified:", screen);
      return true;
    } else {
      console.error("❌ Failed to notify bigscreen");
      return false;
    }
  } catch (error) {
    console.error("❌ Error notifying bigscreen:", error);
    return false;
  }
}
