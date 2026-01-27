import { ref } from "vue";
import { useApi } from "@/composables/useApi";
import { useSocket } from "@/composables/useSocket";

const { post } = useApi();
const { connect, emit, isConnected } = useSocket();

// Simple notify function for bigscreen navigation
export async function notifyBigScreen(screen, sessionId = null, data = null, options = {}) {
  try {
    // Prefer socket emit if connected (more real-time and avoids unsupported API endpoints)
    try {
      connect();
      if (isConnected.value) {
        emit("bigscreen:navigate", { screen, session_id: sessionId, data });
        console.log("✅ BigScreen notified via socket:", screen);
        return { success: true, method: 'socket' };
      }
    } catch (sockErr) {
      console.warn("Socket notify failed, falling back to HTTP POST:", sockErr);
    }

    // Fallback to HTTP POST if socket not available
    try {
      await post('/api/v1/bigscreen/navigate', { screen, session_id: sessionId, data });
      console.log("✅ BigScreen notified via HTTP:", screen);
      return { success: true, method: 'http' };
    } catch (httpErr) {
      // If backend doesn't support this endpoint/method, fall back to opening the Scorescreen UI directly
      console.warn('HTTP bigscreen notify failed, falling back to opening UI:', httpErr);
      try {
        // Allow callers to disable opening the UI (useful when navigating locally instead)
        if (options && options.uiFallback === false) {
          console.warn('UI fallback disabled by caller; skipping opening UI');
          return { success: false, method: 'ui-disabled' };
        }

        const base = (typeof window !== 'undefined' && window.SCOREBOARD_UI_BASE) ? window.SCOREBOARD_UI_BASE.replace(/\/$/, '') : window.location.origin;
        // Prefer history-mode URL (requires server SPA fallback) but fall back to hash url for environments
        const historyUrl = `${base}/bigscreen/scorescreen${sessionId ? `?session=${sessionId}` : ''}`;
        const hashUrl = `${base}/#/bigscreen/scorescreen${sessionId ? `?session=${sessionId}` : ''}`;
        // Try opening history URL first
        try {
          window.open(historyUrl, '_blank');
          console.log('🔁 Opened BigScreen UI (history) as fallback:', historyUrl);
          return { success: true, method: 'ui-fallback-history', url: historyUrl };
        } catch (e) {
          window.open(hashUrl, '_blank');
          console.log('🔁 Opened BigScreen UI (hash) as fallback:', hashUrl);
          return { success: true, method: 'ui-fallback-hash', url: hashUrl };
        }
      } catch (openErr) {
        console.error('❌ Fallback open failed:', openErr);
        return { success: false, method: 'none' };
      }
    }
  } catch (error) {
    console.error("❌ Error notifying bigscreen:", error);
    return { success: false, method: 'error' };
  }
}
