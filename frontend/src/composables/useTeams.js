import { ref } from "vue";
import { useApi } from "./useApi";

/**
 * Composable voor Team gerelateerde API calls
 */
export function useTeams() {
  const { loading, error, get, post, put, del } = useApi();
  const teams = ref([]);
  const currentTeam = ref(null);

  /**
   * Haal alle teams op
   */
  async function fetchTeams() {
    try {
      const data = await get("/api/v1/teams");
      // Backend returns {teams: [...]}
      teams.value = data?.teams || [];
      return data?.teams || [];
    } catch (e) {
      console.error("Failed to fetch teams:", e);
      throw e;
    }
  }

  /**
   * Haal alle teams op met hun spelers
   */
  async function fetchTeamsWithPlayers() {
    try {
      const data = await get("/api/v1/teams");
      const teamsData = data?.teams || [];

      // Fetch players for each team
      const teamsWithPlayers = await Promise.all(
        teamsData.map(async (team) => {
          try {
            const playersData = await get(`/api/v1/players?team_id=${team.id}`);
            return {
              ...team,
              players: playersData?.players || [],
            };
          } catch (e) {
            console.error(`Failed to fetch players for team ${team.id}:`, e);
            return {
              ...team,
              players: [],
            };
          }
        }),
      );

      teams.value = teamsWithPlayers;
      return teamsWithPlayers;
    } catch (e) {
      console.error("Failed to fetch teams with players:", e);
      throw e;
    }
  }

  /**
   * Haal teams voor een specifieke sessie op
   * @param {number} sessionId - Session ID
   */
  async function fetchTeamsBySession(sessionId) {
    try {
      const data = await get(`/api/v1/sessions/${sessionId}/teams`);
      return data;
    } catch (e) {
      console.error("Failed to fetch teams for session:", e);
      throw e;
    }
  }

  /**
   * Haal specifiek team op
   * @param {number} id - Team ID
   */
  async function fetchTeam(id) {
    try {
      const data = await get(`/api/v1/teams/${id}`);
      currentTeam.value = data;
      return data;
    } catch (e) {
      console.error("Failed to fetch team:", e);
      throw e;
    }
  }

  /**
   * Maak nieuw team aan
   * @param {object} teamData - Team data
   * @param {string} teamData.name - Team naam
   * @param {string} teamData.color - Team kleur (hex)
   * @param {string} teamData.icon - Team icon/emoji
   * @param {string} teamData.description - Team beschrijving (optioneel)
   */
  async function createTeam(teamData) {
    try {
      const data = await post("/api/v1/teams", teamData);
      await fetchTeams();
      return data;
    } catch (e) {
      console.error("Failed to create team:", e);
      throw e;
    }
  }

  /**
   * Update bestaand team
   * @param {number} id - Team ID
   * @param {object} teamData - Updated team data
   */
  async function updateTeam(id, teamData) {
    try {
      const data = await put(`/api/v1/teams/${id}`, teamData);
      const index = teams.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        teams.value[index] = data;
      }
      return data;
    } catch (e) {
      console.error("Failed to update team:", e);
      throw e;
    }
  }

  /**
   * Verwijder team
   * @param {number} id - Team ID
   */
  async function deleteTeam(id) {
    try {
      await del(`/api/v1/teams/${id}`);
      teams.value = teams.value.filter((t) => t.id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete team:", e);
      throw e;
    }
  }

  /**
   * Voeg speler toe aan team
   * @param {number} teamId - Team ID
   * @param {object} playerData - Player data
   * @param {string} playerData.name - Speler naam
   * @param {string} playerData.emoji - Speler emoji
   */
  async function addPlayer(teamId, playerData) {
    try {
      const data = await post(`/api/v1/teams/${teamId}/players`, playerData);
      return data;
    } catch (e) {
      console.error("Failed to add player:", e);
      throw e;
    }
  }

  /**
   * Verwijder speler van team
   * @param {number} teamId - Team ID
   * @param {number} playerId - Player ID
   */
  async function removePlayer(teamId, playerId) {
    try {
      await del(`/api/teams/${teamId}/players/${playerId}`);
      return true;
    } catch (e) {
      console.error("Failed to remove player:", e);
      throw e;
    }
  }

  return {
    teams,
    currentTeam,
    loading,
    error,
    fetchTeams,
    fetchTeamsWithPlayers,
    fetchTeamsBySession,
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addPlayer,
    removePlayer,
  };
}
