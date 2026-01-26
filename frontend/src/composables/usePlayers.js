import { ref } from "vue";
import { useApi } from "./useApi";

/**
 * Composable voor Player gerelateerde API calls
 */
export function usePlayers() {
  const { loading, error, get, post, put, del } = useApi();
  const players = ref([]);
  const currentPlayer = ref(null);

  /**
   * Haal alle spelers op
   * @param {number} teamId - Optional team ID om spelers te filteren
   */
  async function fetchPlayers(teamId = null) {
    try {
      const endpoint = teamId
        ? `/api/v1/players?team_id=${teamId}`
        : "/api/v1/players";
      const data = await get(endpoint);
      // Backend returns {players: [...]}
      players.value = data?.players || [];
      return data?.players || [];
    } catch (e) {
      console.error("Failed to fetch players:", e);
      throw e;
    }
  }

  /**
   * Haal specifieke speler op
   * @param {number} id - Player ID
   */
  async function fetchPlayer(id) {
    try {
      const data = await get(`/api/v1/players/${id}`);
      currentPlayer.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch player:", e);
      throw e;
    }
  }

  /**
   * Maak nieuwe speler aan
   * @param {object} playerData - Player data
   * @param {string} playerData.name - Speler naam
   * @param {number} playerData.team_id - Team ID
   * @param {string} playerData.position - Speler positie/emoji (optioneel)
   */
  async function createPlayer(playerData) {
    try {
      const data = await post("/api/v1/players", playerData);
      return data;
    } catch (e) {
      console.error("Failed to create player:", e);
      throw e;
    }
  }

  /**
   * Update bestaande speler
   * @param {number} id - Player ID
   * @param {object} playerData - Updated player data
   */
  async function updatePlayer(id, playerData) {
    try {
      const data = await put(`/api/v1/players/${id}`, playerData);
      const index = players.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        players.value[index] = data;
      }
      return data;
    } catch (e) {
      console.error("Failed to update player:", e);
      throw e;
    }
  }

  /**
   * Verwijder speler
   * @param {number} id - Player ID
   */
  async function deletePlayer(id) {
    try {
      await del(`/api/v1/players/${id}`);
      players.value = players.value.filter((p) => p.id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete player:", e);
      throw e;
    }
  }

  return {
    players,
    currentPlayer,
    loading,
    error,
    fetchPlayers,
    fetchPlayer,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}
