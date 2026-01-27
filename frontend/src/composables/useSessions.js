import { ref, computed } from "vue";
import { useApi } from "./useApi";
import { useSocket } from "./useSocket";

// Attach socket listeners once to keep active session in sync across the app
let socketListenersAttached = false;
function attachSessionSocketListeners(fetchActiveSessions) {
  if (socketListenersAttached) return;
  const { connect, on } = useSocket();
  try {
    connect();
  } catch (e) {
    /* ignore connect errors - we'll still attempt to listen if socket connects later */
  }

  const refreshHandler = () => {
    console.log("🔁 Session socket event received, refreshing active sessions");
    fetchActiveSessions().catch((err) => console.warn("Failed to refresh active sessions after socket event:", err));
  };

  on("session_created", refreshHandler);
  on("session_update", refreshHandler);
  on("session_status_update", refreshHandler);
  on("session_deleted", refreshHandler); // may or may not be emitted by backend
  socketListenersAttached = true;
}

/**
 * Composable voor Session gerelateerde API calls
 */
export function useSessions() {
  const { loading, error, get, post, put, del } = useApi();
  const sessions = ref([]);
  const currentSession = ref(null);
  const activeSessions = ref([]);

  /**
   * Haal alle sessies op
   */
  async function fetchSessions() {
    try {
      const data = await get("/api/v1/sessions");
      sessions.value = data.sessions || data;
      return data;
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
      throw e;
    }
  }

  /**
   * Haal actieve sessies op
   */
  async function fetchActiveSessions() {
    try {
      const data = await get("/api/v1/sessions/active");
      // Backend returns either a single session object or null (not an array).
      // Normalize to an array so consumers can consistently use `activeSessions`.
      if (!data) {
        activeSessions.value = [];
      } else if (Array.isArray(data)) {
        activeSessions.value = data;
      } else {
        activeSessions.value = [data];
      }
      return activeSessions.value;
    } catch (e) {
      console.error("Failed to fetch active sessions:", e);
      throw e;
    }
  }

  // Expose single active session for convenience
  const activeSession = computed(() => (activeSessions.value && activeSessions.value.length ? activeSessions.value[0] : null));

  // Ensure socket listeners are attached so active session stays in sync
  attachSessionSocketListeners(fetchActiveSessions);

  /**
   * Haal specifieke sessie op
   * @param {number} id - Session ID
   */
  async function fetchSession(id) {
    try {
      const data = await get(`/api/v1/sessions/${id}`);
      currentSession.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch session:", e);
      throw e;
    }
  }

  /**
   * Maak nieuwe sessie aan met geselecteerde activiteiten
   * @param {object} sessionData - Session data
   * @param {string} sessionData.name - Session naam
   * @param {string} sessionData.game_type - Game type
   * @param {string} sessionData.sport_type - Sport type
   * @param {string} sessionData.scoring_mode - Scoring mode
   * @param {number} sessionData.total_rounds - Totaal aantal rondes
   * @param {number} sessionData.time_limit - Tijdlimiet
   * @param {boolean} sessionData.show_players - Toon spelers
   * @param {array} activityIds - Array van globale activity IDs om te kopiëren naar deze sessie
   */
  async function createSession(sessionData, activityIds = []) {
    try {
      // 1. Maak eerst de sessie aan
      const session = await post("/api/v1/sessions", sessionData);
      const sessionId = session.id;

      // 2. Als er activiteiten geselecteerd zijn, kopieer ze naar deze sessie
      if (activityIds && activityIds.length > 0) {
        // Haal de volledige activiteit data op en kopieer ze
        const { get: apiGet, post: apiPost } = useApi();

        for (const activityId of activityIds) {
          try {
            // Haal de globale activiteit op
            const globalActivity = await apiGet(
              `/api/v1/activities/${activityId}`,
            );

            // Maak een kopie in deze sessie
            await apiPost(`/api/v1/sessions/${sessionId}/activities`, {
              name: globalActivity.name,
              sport_type: globalActivity.sport_type,
              game_type: globalActivity.game_type,
              scoring_mode: globalActivity.scoring_mode,
              time_winner: globalActivity.time_winner,
              aggregate_player_times: globalActivity.aggregate_player_times,
              total_rounds: globalActivity.total_rounds,
              time_limit_per_round: globalActivity.time_limit_per_round,
              description: globalActivity.description,
              session_id: sessionId,
            });
          } catch (e) {
            console.error(
              `Failed to copy activity ${activityId} to session:`,
              e,
            );
            // Continue met de volgende activiteit
          }
        }
      }

      await fetchSessions();
      return session;
    } catch (e) {
      console.error("Failed to create session:", e);
      throw e;
    }
  }

  /**
   * Update bestaande sessie
   * @param {number} id - Session ID
   * @param {object} sessionData - Updated session data
   */
  async function updateSession(id, sessionData) {
    try {
      const data = await put(`/api/v1/sessions/${id}`, sessionData);
      const index = sessions.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        sessions.value[index] = data;
      }
      return data;
    } catch (e) {
      console.error("Failed to update session:", e);
      throw e;
    }
  }

  /**
   * Start een sessie
   * @param {number} id - Session ID
   */
  async function startSession(id) {
    try {
      const data = await post(`/api/v1/sessions/${id}/start`, {});
      await fetchActiveSessions();
      return data;
    } catch (e) {
      console.error("Failed to start session:", e);
      throw e;
    }
  }

  /**
   * Stop een sessie
   * @param {number} id - Session ID
   */
  async function stopSession(id) {
    try {
      const data = await post(`/api/v1/sessions/${id}/stop`, {});
      await fetchActiveSessions();
      return data;
    } catch (e) {
      console.error("Failed to stop session:", e);
      throw e;
    }
  }

  /**
   * Verwijder sessie
   * @param {number} id - Session ID
   */
  async function deleteSession(id) {
    try {
      await del(`/api/v1/sessions/${id}`);
      sessions.value = sessions.value.filter((s) => s.id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete session:", e);
      throw e;
    }
  }

  return {
    sessions,
    currentSession,
    activeSessions,
    activeSession,
    loading,
    error,
    fetchSessions,
    fetchActiveSessions,
    fetchSession,
    createSession,
    updateSession,
    startSession,
    stopSession,
    deleteSession,
  };
}
