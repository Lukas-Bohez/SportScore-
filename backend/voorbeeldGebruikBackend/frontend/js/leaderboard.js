// Leaderboard JavaScript - View leaderboard for specific session
class LeaderboardView {
  constructor() {
    this.sessionId = null;
    this.activityId = null;
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
    this.activityId = urlParams.get('activity') || null;
    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de startpagina.');
      window.location.href = 'index.html';
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
    this.activitySelect = document.getElementById('activity-select');
    if (this.activitySelect) {
      this.activitySelect.addEventListener('change', () => {
        this.activityId = this.activitySelect.value || null;
        this.loadSessionData();
        // Update URL without reloading
        const params = new URLSearchParams(window.location.search);
        if (this.activityId) {
          params.set('activity', this.activityId);
        } else {
          params.delete('activity');
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      });
    }
  }

  async loadSessionData() {
    try {
      // Load session details
      this.sessionData = await api.getSession(this.sessionId);
      // Respect session flag whether to show players on scoreboard (default true) and scoring mode
      const showPlayersFlag = this.sessionData && typeof this.sessionData.show_players !== 'undefined' ? Boolean(this.sessionData.show_players) : true;
      const scoringModeShowsPlayers = this.sessionData && (this.sessionData.scoring_mode === 'player' || this.sessionData.scoring_mode === 'team_with_players');
      this.showPlayers = showPlayersFlag && scoringModeShowsPlayers;
      this.displaySessionInfo();

      // Load activity options
      await this.loadActivities();

      // Load teams and scores (session or activity)
      await this.loadTeamsAndScores();

      // Display data
      this.displayLeaderboard();
      // For participant-based scoring, we don't show teams grid
      this.displayScoreHistory();
    } catch (error) {
      api.handleError(error, 'loading session data');
      this.showError('Fout bij het laden van sessiegegevens.');
    }
  }

  async loadActivities() {
    try {
      if (!this.activitySelect) return;
      const resp = await api.getSessionActivities(this.sessionId);
      const activities = resp.activities || [];
      this.activitySelect.innerHTML = '<option value="">Alle sessie scores</option>';
      activities.forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        this.activitySelect.appendChild(opt);
      });
      // Preselect from URL
      if (this.activityId) {
        this.activitySelect.value = this.activityId;
      }
    } catch (e) {
      // ignore
    }
  }

  async loadTeamsAndScores() {
    try {
      // For participant-based scoring, we don't load teams
      // Instead, we'll load participant scores directly
      this.participantLeaderboard = null;
      
      if (this.activityId) {
        // Load activity leaderboard (participant-based)
        const resp = await api.getActivityLeaderboard(this.activityId);
        this.participantLeaderboard = resp.leaderboard || [];
      } else {
        // Load session participant leaderboard
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/participant-leaderboard`);
        this.participantLeaderboard = resp.leaderboard || [];
        this.activities = resp.activities || [];
      }
    } catch (error) {
      api.handleError(error, 'loading participant scores');
      this.participantLeaderboard = [];
      this.activities = [];
    }
  }

  async loadPlayersForAllTeams() {
    for (const team of this.teamsData) {
      try {
        if (this.showPlayers) {
          const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
          team.players = resp && resp.players ? resp.players : [];
          // Sort players alphabetically by name
          team.players.sort((a, b) => (a.name || a.player_name || '').localeCompare(b.name || b.player_name || ''));
        } else {
          team.players = [];
        }
      } catch (err) {
        // Try fallback to global players
        const msg = err && err.message ? err.message : '';
        const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
        if (status405) {
          try {
            const fallback = await api.get(`/api/v1/players`);
            team.players = fallback && fallback.players ? fallback.players : [];
            // Sort players alphabetically by name
            team.players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          } catch (err2) {
            team.players = [];
          }
        } else {
          team.players = [];
        }
      }
    }
  }

  async displaySessionInfo() {
    if (!this.sessionData) return;

    // Update header info
    const activityLabel = this.activityId ? await this.getActivityLabel() : '';
    this.sessionName.textContent = `${this.sessionData.name || 'Onbekende Sessie'}${activityLabel ? ' • ' + activityLabel : ''}`;
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

  async getActivityLabel() {
    try {
      if (!this.activityId) return '';
      const a = await api.getActivity(this.activityId);
      return a && a.name ? `Activiteit: ${a.name}` : '';
    } catch (_) {
      return '';
    }
  }

  displayLeaderboard() {
    if (!this.leaderboard) return;

    if (!this.participantLeaderboard || this.participantLeaderboard.length === 0) {
      this.leaderboard.innerHTML = '<div class="no-data">Geen deelnemers gevonden.</div>';
      return;
    }

    const leaderboardHtml = this.participantLeaderboard.map((participant, index) => 
      this.createParticipantLeaderboardItem(participant, index + 1)
    ).join('');

    this.leaderboard.innerHTML = leaderboardHtml;
  }

  createParticipantLeaderboardItem(participant, position) {
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
    
    let activityScoresHtml = '';
    if (this.activities && this.activities.length > 0) {
      activityScoresHtml = '<div class="activity-scores">';
      this.activities.forEach(activity => {
        const score = participant.activity_scores[activity.id] || 0;
        activityScoresHtml += `<div class="activity-score" title="${activity.name}">${score}</div>`;
      });
      activityScoresHtml += '</div>';
    }

    return `
      <div class="leaderboard-item participant-item">
        <div class="position">${position}</div>
        <div class="medal">${medal}</div>
        <div class="participant-info">
          <div class="participant-name">${this.escapeHtml(participant.player_name)}</div>
          ${activityScoresHtml}
        </div>
        <div class="participant-total">${participant.total_score} punten</div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  calculateSportScores() {
    const SportScores = {};

    // Initialize teams with 0 score
    this.teamsData.forEach((team) => {
      SportScores[team.id] = {
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
      if (SportScores[score.team_id]) {
        SportScores[score.team_id].score += score.points;
      }
    });

    return Object.values(SportScores);
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
    const SportScore = this.calculateSportScore(team.id);
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
            <span class="stat-value">${SportScore}</span>
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

  calculateSportScore(teamId) {
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
