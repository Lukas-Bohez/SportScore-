import { ref } from "vue";
import { useApi } from "./useApi";

/**
 * Composable voor Activity gerelateerde API calls
 */
export function useActivities() {
  const { loading, error, get, post, put, del } = useApi();
  const activities = ref([]);
  const currentActivity = ref(null);

  /**
   * Haal alle activiteiten op
   */
  async function fetchActivities() {
    try {
      const data = await get("/api/v1/activities");
      activities.value = data.activities || data;
      return data;
    } catch (e) {
      console.error("Failed to fetch activities:", e);
      throw e;
    }
  }

  /**
   * Haal specifieke activiteit op
   * @param {number} id - Activity ID
   */
  async function fetchActivity(id) {
    try {
      const data = await get(`/api/v1/activities/${id}`);
      currentActivity.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch activity:", e);
      throw e;
    }
  }

  /**
   * Maak nieuwe activiteit aan (globale activiteit zonder sessie)
   * @param {object} activityData - Activity data
   * @param {string} activityData.name - Activity naam
   * @param {string} activityData.scoring_mode - Scoring mode (team, team_with_players, player)
   * @param {string} activityData.game_type - Game type (sport_challenge, quiz, elimination, team_vs_time, golf)
   * @param {string} activityData.sport_type - Sport type (voetbal, basketbal, etc.)
   * @param {number} activityData.total_rounds - Aantal rondes
   * @param {number} activityData.time_limit_per_round - Tijdlimiet per ronde in seconden
   */
  async function createActivity(activityData) {
    try {
      const data = await post("/api/v1/activities", activityData);
      // Refresh activities list
      await fetchActivities();
      return data;
    } catch (e) {
      console.error("Failed to create activity:", e);
      throw e;
    }
  }

  /**
   * Update bestaande activiteit
   * @param {number} id - Activity ID
   * @param {object} activityData - Updated activity data
   */
  async function updateActivity(id, activityData) {
    try {
      const data = await put(`/api/v1/activities/${id}`, activityData);
      // Update local state
      const index = activities.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        activities.value[index] = data;
      }
      return data;
    } catch (e) {
      console.error("Failed to update activity:", e);
      throw e;
    }
  }

  /**
   * Verwijder activiteit
   * @param {number} id - Activity ID
   */
  async function deleteActivity(id) {
    try {
      await del(`/api/v1/activities/${id}`);
      // Remove from local state
      activities.value = activities.value.filter((a) => a.id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete activity:", e);
      throw e;
    }
  }

  return {
    activities,
    currentActivity,
    loading,
    error,
    fetchActivities,
    fetchActivity,
    createActivity,
    updateActivity,
    deleteActivity,
  };
}
