import { ref } from "vue";
import { useApi } from "./useApi";

/**
 * Composable voor Score gerelateerde API calls
 */
export function useScores() {
  const { loading, error, get, post, put, del } = useApi();
  const scores = ref([]);
  const leaderboard = ref([]);

  /**
   * Haal scores op voor een sessie
   * @param {number} sessionId - Session ID
   */
  async function fetchScoresBySession(sessionId) {
    try {
      const data = await get(`/api/sessions/${sessionId}/scores`);
      scores.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch scores:", e);
      throw e;
    }
  }

  /**
   * Haal scores op voor een activiteit
   * @param {number} activityId - Activity ID
   */
  async function fetchScoresByActivity(activityId) {
    try {
      const data = await get(`/api/activities/${activityId}/scores`);
      return data;
    } catch (e) {
      console.error("Failed to fetch activity scores:", e);
      throw e;
    }
  }

  /**
   * Haal leaderboard op voor een sessie
   * @param {number} sessionId - Session ID
   */
  async function fetchLeaderboard(sessionId) {
    try {
      const data = await get(`/api/sessions/${sessionId}/leaderboard`);
      leaderboard.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
      throw e;
    }
  }

  /**
   * Voeg score toe (punten of tijd)
   * @param {object} scoreData - Score data
   * @param {number} scoreData.session_id - Session ID
   * @param {number} scoreData.activity_id - Activity ID
   * @param {number} scoreData.team_id - Team ID (optioneel)
   * @param {number} scoreData.player_id - Player ID (optioneel)
   * @param {number} scoreData.score - Score waarde (punten of seconden)
   * @param {number} scoreData.round - Ronde nummer (optioneel)
   */
  async function addScore(scoreData) {
    try {
      const data = await post("/api/scores", scoreData);
      // Refresh scores for this session
      if (scoreData.session_id) {
        await fetchScoresBySession(scoreData.session_id);
      }
      return data;
    } catch (e) {
      console.error("Failed to add score:", e);
      throw e;
    }
  }

  /**
   * Update bestaande score
   * @param {number} id - Score ID
   * @param {object} scoreData - Updated score data
   */
  async function updateScore(id, scoreData) {
    try {
      const data = await put(`/api/scores/${id}`, scoreData);
      return data;
    } catch (e) {
      console.error("Failed to update score:", e);
      throw e;
    }
  }

  /**
   * Verwijder score
   * @param {number} id - Score ID
   */
  async function deleteScore(id) {
    try {
      await del(`/api/scores/${id}`);
      scores.value = scores.value.filter((s) => s.id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete score:", e);
      throw e;
    }
  }

  /**
   * Voeg bonus punten toe
   * @param {number} teamId - Team ID
   * @param {number} sessionId - Session ID
   * @param {number} bonusPoints - Bonus punten (bijv. 5, 10)
   */
  async function addBonusPoints(teamId, sessionId, bonusPoints) {
    try {
      const data = await post("/api/scores/bonus", {
        team_id: teamId,
        session_id: sessionId,
        score: bonusPoints,
      });
      await fetchScoresBySession(sessionId);
      return data;
    } catch (e) {
      console.error("Failed to add bonus points:", e);
      throw e;
    }
  }

  return {
    scores,
    leaderboard,
    loading,
    error,
    fetchScoresBySession,
    fetchScoresByActivity,
    fetchLeaderboard,
    addScore,
    updateScore,
    deleteScore,
    addBonusPoints,
  };
}
