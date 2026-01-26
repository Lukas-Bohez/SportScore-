import { ref } from "vue";

// Simple notify function for bigscreen navigation
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
