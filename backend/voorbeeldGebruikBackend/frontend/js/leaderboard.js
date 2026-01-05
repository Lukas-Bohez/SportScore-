// Leaderboard JavaScript - View leaderboard for specific session
class LeaderboardView {
  constructor() {
    this.sessionId = null;
    this.sessionData = null;
    this.teamsData = [];
    this.scoresData = [];
    this.init();
  }

  init() {
    this.getSessionIdFromURL();
    this.bindElements();
    this.loadSessionData();
    // react to realtime updates for teams or session so assignments reflect immediately
    try {
      api.on('team_update', (data) => {
        if (data && Number(data.session_id) === Number(this.sessionId)) {
          this.loadSessionData();
        }
      });
      api.on('session_update', (data) => {
        if (data && Number(data.id || data.session_id) === Number(this.sessionId)) {
          this.loadSessionData();
        }
      });
    } catch (e) {
      // ignore if api not ready
    }
  }

  getSessionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get('session');
    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de startpagina.');
      window.location.href = 'startscreen.html';
      return;
    }
  }

  bindElements() {
    this.sessionName = document.getElementById('session-name');
    this.sessionStatus = document.getElementById('session-status');
    this.gameType = document.getElementById('game-type');
    this.rounds = document.getElementById('rounds');
    this.teamCount = document.getElementById('team-count');
    this.createdAt = document.getElementById('created-at');
    this.leaderboard = document.getElementById('leaderboard');
    this.teamsGrid = document.getElementById('teams-grid');
    this.scoreHistory = document.getElementById('score-history');
  }

  async loadSessionData() {
    try {
      // Load session details
      this.sessionData = await api.getSession(this.sessionId);
      // Respect session flag whether to show players on scoreboard (default true)
      this.showPlayers = this.sessionData && typeof this.sessionData.show_players !== 'undefined' ? Boolean(this.sessionData.show_players) : true;
      this.displaySessionInfo();

      // Load teams and scores
      await this.loadTeamsAndScores();

      // Display data
      this.displayLeaderboard();
      this.displayTeamsGrid();
      this.displayScoreHistory();
    } catch (error) {
      api.handleError(error, 'loading session data');
      this.showError('Fout bij het laden van sessiegegevens.');
    }
  }

  async loadTeamsAndScores() {
    try {
      // Load teams
      const teamsResponse = await api.getSessionTeams(this.sessionId);
      this.teamsData = teamsResponse.teams || teamsResponse || [];

      // Load scores
      const scoresResponse = await api.getSessionScores(this.sessionId);
      this.scoresData = scoresResponse.scores || scoresResponse || [];

      // Load players for all teams
      await this.loadPlayersForAllTeams();
    } catch (error) {
      api.handleError(error, 'loading teams and scores');
      // Continue with empty arrays if loading fails
      this.teamsData = [];
      this.scoresData = [];
    }
  }

  async loadPlayersForAllTeams() {
    for (const team of this.teamsData) {
      try {
        if (this.showPlayers) {
          const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
          team.players = resp && resp.players ? resp.players : [];
        } else {
          team.players = [];
        }
      } catch (err) {
        // Try fallback to global players
        const msg = err && err.message ? err.message : '';
        const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
        if (status405) {
          try {
            const fallback = await api.get(`/api/v1/players?team_id=${team.id}`);
            team.players = fallback && fallback.players ? fallback.players : [];
          } catch (err2) {
            team.players = [];
          }
        } else {
          team.players = [];
        }
      }
    }
  }

  displaySessionInfo() {
    if (!this.sessionData) return;

    // Update header info
    this.sessionName.textContent = this.sessionData.name || 'Onbekende Sessie';
    this.sessionStatus.textContent = `Status: ${this.getStatusText(this.sessionData.status)}`;

    // Update session details
    const gameTypeNames = {
      custom: 'Aangepast',
      quiz: 'Quiz Modus',
      sport_challenge: 'Sport Challenge',
      random_bonus: 'Random Bonus',
      elimination: 'Elimination Mode',
      team_vs_time: 'Team vs Time',
    };

    this.gameType.textContent = gameTypeNames[this.sessionData.game_type] || this.sessionData.game_type || 'Onbekend';
    this.rounds.textContent = `${this.sessionData.current_round || 0}/${this.sessionData.total_rounds || 0}`;
    this.teamCount.textContent = this.teamsData.length;
    this.createdAt.textContent = new Date(this.sessionData.created_at).toLocaleString('nl-NL');
  }

  displayLeaderboard() {
    if (!this.leaderboard) return;

    // Calculate team scores
    const teamScores = this.calculateTeamScores();

    // Filter out eliminated teams if game type is elimination
    let filteredTeams = teamScores;
    if (this.sessionData && this.sessionData.game_type === 'elimination') {
      filteredTeams = teamScores.filter((team) => !team.is_eliminated);
    }

    // Sort by score descending
    const sortedTeams = filteredTeams.sort((a, b) => b.score - a.score);

    if (sortedTeams.length === 0) {
      this.leaderboard.innerHTML = '<div class="no-data">Geen teams gevonden voor deze sessie.</div>';
      return;
    }

    const leaderboardHtml = sortedTeams.map((team, index) => this.createLeaderboardItem(team, index + 1)).join('');

    this.leaderboard.innerHTML = leaderboardHtml;
  }

  calculateTeamScores() {
    const teamScores = {};

    // Initialize teams with 0 score
    this.teamsData.forEach((team) => {
      teamScores[team.id] = {
        id: team.id,
        name: team.name,
        color: team.color,
        icon: team.icon,
        score: 0,
        is_eliminated: team.is_eliminated || false,
      };
    });

    // Add up scores
    this.scoresData.forEach((score) => {
      if (teamScores[score.team_id]) {
        teamScores[score.team_id].score += score.points;
      }
    });

    return Object.values(teamScores);
  }

  createLeaderboardItem(team, position) {
    const medal = position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';

    return `
      <div class="leaderboard-item ${team.is_eliminated ? 'eliminated' : ''}" style="border-left-color: ${team.color || '#333'}">
        <div class="position">${position}</div>
        <div class="medal">${medal}</div>
        <div class="team-info">
          <div class="team-name">${team.name}</div>
          <div class="team-icon">${this.getIconEmoji(team.icon)}</div>
        </div>
        <div class="team-score">${team.score} punten</div>
      </div>
    `;
  }

  displayTeamsGrid() {
    if (!this.teamsGrid) return;

    if (this.teamsData.length === 0) {
      this.teamsGrid.innerHTML = '<div class="no-data">Geen teams gevonden voor deze sessie.</div>';
      return;
    }

    const teamsHtml = this.teamsData.map((team) => this.createTeamCard(team)).join('');

    this.teamsGrid.innerHTML = teamsHtml;
  }

  createTeamCard(team) {
    const teamScore = this.calculateTeamScore(team.id);
    const players = team.players || [];
    const playersHtml =
      this.showPlayers && players.length > 0
        ? `<div class="team-players">
           <span class="players-label">Spelers:</span>
           <span class="players-list">${players.map((p) => (p.position ? `${p.name} (${p.position})` : p.name)).join(', ')}</span>
         </div>`
        : '';

    return `
      <div class="team-card" style="border-color: ${team.color || '#333'}">
        <div class="team-header">
          <div class="team-icon">${this.getIconEmoji(team.icon)}</div>
          <h3 class="team-name">${team.name}</h3>
        </div>
        <div class="team-stats">
          <div class="stat">
            <span class="stat-label">Score:</span>
            <span class="stat-value">${teamScore}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Status:</span>
            <span class="stat-value ${team.is_eliminated ? 'eliminated' : 'active'}">
              ${team.is_eliminated ? 'Geëlimineerd' : 'Actief'}
            </span>
          </div>
        </div>
        ${playersHtml}
      </div>
    `;
  }

  calculateTeamScore(teamId) {
    return this.scoresData.filter((score) => score.team_id === teamId).reduce((total, score) => total + score.points, 0);
  }

  displayScoreHistory() {
    if (!this.scoreHistory) return;

    if (this.scoresData.length === 0) {
      this.scoreHistory.innerHTML = '<div class="no-data">Geen scores gevonden voor deze sessie.</div>';
      return;
    }

    // Sort scores by timestamp descending (most recent first)
    const sortedScores = this.scoresData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const historyHtml = sortedScores
      .slice(0, 20) // Show last 20 scores
      .map((score) => this.createScoreHistoryItem(score))
      .join('');

    this.scoreHistory.innerHTML = historyHtml;
  }

  createScoreHistoryItem(score) {
    const team = this.teamsData.find((t) => t.id === score.team_id);
    const teamName = team ? team.name : 'Onbekend team';
    const timestamp = new Date(score.timestamp).toLocaleString('nl-NL');

    return `
      <div class="score-history-item">
        <div class="score-time">${timestamp}</div>
        <div class="score-team">${teamName}</div>
        <div class="score-points ${score.points >= 0 ? 'positive' : 'negative'}">
          ${score.points > 0 ? '+' : ''}${score.points}
        </div>
        <div class="score-reason">${score.reason || 'Geen reden opgegeven'}</div>
      </div>
    `;
  }

  getStatusText(status) {
    const statusMap = {
      setup: 'Setup',
      active: 'Actief',
      paused: 'Gepauzeerd',
      completed: 'Voltooid',
    };
    return statusMap[status] || status;
  }

  showError(message) {
    // Simple error display - could be enhanced with a modal
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  getIconEmoji(iconName) {
    const iconMap = {
      team: '👥',
      star: '⭐',
      fire: '🔥',
      rocket: '🚀',
      trophy: '🏆',
      lightning: '⚡',
      heart: '❤️',
      diamond: '💎',
      crown: '👑',
      superhero: '🦸',
    };
    return iconMap[iconName] || '👥';
  }
}

// Initialize the leaderboard view when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LeaderboardView();
});
