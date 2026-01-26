import { ref } from "vue";
import { useApi } from "@/composables/useApi";

const { post } = useApi();

// Simple notify function for bigscreen navigation
export async function notifyBigScreen(screen, sessionId = null, data = null) {
  try {
    await post('/api/v1/bigscreen/navigate', { screen, session_id: sessionId, data });
    console.log("✅ BigScreen notified:", screen);
    return true;
  } catch (error) {
    console.error("❌ Error notifying bigscreen:", error);
    return false;
  }
}
