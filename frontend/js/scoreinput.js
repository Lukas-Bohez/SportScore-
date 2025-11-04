// Score Input JavaScript - Session Score Management
class ScoreInput {
  constructor() {
    this.sessionId = new URLSearchParams(window.location.search).get('session');
    this.session = null;
    this.teams = [];
    this.recentScores = [];
    this.timer = null;
    this.timeRemaining = 0;
    this.customQuickActions = [];

    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de startpagina.');
      window.location.href = 'startscreen.html';
      return;
    }

    this.init();
  }

  async init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadCustomQuickActions();
    await this.loadSession();
    await this.loadTeams();
    await this.loadLeaderboard();
    this.loadRecentScores();
  }

  bindElements() {
    // Header elements
    this.sessionName = document.getElementById('session-name');
    this.roundInfo = document.getElementById('round-info');
    this.timer = document.getElementById('timer');

    // Main sections
    this.leaderboard = document.getElementById('leaderboard');
    this.teamSelect = document.getElementById('team-select');
    this.pointsInput = document.getElementById('points-input');
    this.reasonInput = document.getElementById('reason-input');
    this.submitScoreBtn = document.getElementById('submit-score-btn');
    this.recentScores = document.getElementById('recent-scores');

    // Control buttons
    this.subtractBtn = document.getElementById('subtract-btn');
    this.addBtn = document.getElementById('add-btn');
    this.pauseSessionBtn = document.getElementById('pause-session-btn');
    this.nextRoundBtn = document.getElementById('next-round-btn');
    this.endSessionBtn = document.getElementById('end-session-btn');

    // Animation elements
    this.scoreAnimation = document.getElementById('score-animation');
    this.animTeamIcon = document.getElementById('anim-team-icon');
    this.animScoreChange = document.getElementById('anim-score-change');
    this.animTeamName = document.getElementById('anim-team-name');

    // Custom quick actions elements
    this.customQuickActionsContainer = document.getElementById('custom-quick-actions');
    this.customReasonInput = document.getElementById('custom-reason');
    this.customPointsInput = document.getElementById('custom-points');
    this.addCustomBtn = document.getElementById('add-custom-action');
  }

  setupEventListeners() {
    // Score input controls
    this.subtractBtn.addEventListener('click', () => this.adjustPoints(-1));
    this.addBtn.addEventListener('click', () => this.adjustPoints(1));

    // Form submission
    this.submitScoreBtn.addEventListener('click', () => this.submitScore());

    // Points input validation
    this.pointsInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < -100) value = -100;
      if (value > 100) value = 100;
      e.target.value = value;
    });

    // Enter key submission
    this.reasonInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitScore();
      }
    });

    // Session controls
    this.pauseSessionBtn.addEventListener('click', () => this.togglePause());
    this.nextRoundBtn.addEventListener('click', () => this.nextRound());
    this.endSessionBtn.addEventListener('click', () => this.endSession());

    // Custom quick actions
    this.addCustomBtn.addEventListener('click', () => this.addCustomQuickAction());

    // Real-time updates
    api.on('session_score_update', (data) => this.handleScoreUpdate(data));
    api.on('session_status_update', (data) => this.handleStatusUpdate(data));
  }

  async loadSession() {
    try {
      this.session = await api.get(`/api/v1/sessions/${this.sessionId}`);
      this.updateSessionDisplay();
      this.startTimer();
    } catch (error) {
      api.handleError(error, 'loading session');
      alert('Fout bij het laden van de sessie.');
      window.location.href = 'startscreen.html';
    }
  }

  updateSessionDisplay() {
    if (this.sessionName) {
      this.sessionName.textContent = this.session.name;
    }
    if (this.roundInfo) {
      this.roundInfo.textContent = `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
    }
    this.updateTimerDisplay();
  }

  async loadTeams() {
    try {
      const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
      this.teams = response.teams || [];
      this.populateTeamSelect();
    } catch (error) {
      api.handleError(error, 'loading teams');
    }
  }

  populateTeamSelect() {
    this.teamSelect.innerHTML = '<option value="">Kies een team...</option>';
    this.teams.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = `${team.name} (${team.score} punten)`;
      this.teamSelect.appendChild(option);
    });
  }

  async loadLeaderboard() {
    try {
      // Load all scores for this session to calculate leaderboard
      const scoresResponse = await api.get(`/api/v1/sessions/${this.sessionId}/scores`);
      const allScores = scoresResponse.scores || [];

      // Calculate leaderboard from teams and scores
      const leaderboard = this.calculateLeaderboard(allScores);
      this.displayLeaderboard(leaderboard);
    } catch (error) {
      api.handleError(error, 'loading leaderboard');
    }
  }

  calculateLeaderboard(allScores) {
    const teamScores = {};

    // Initialize teams with 0 score
    this.teams.forEach((team) => {
      teamScores[team.id] = {
        id: team.id,
        name: team.name,
        icon: team.icon,
        score: 0,
      };
    });

    // Add up all scores
    allScores.forEach((score) => {
      if (teamScores[score.team_id]) {
        teamScores[score.team_id].score += score.points;
      }
    });

    return Object.values(teamScores);
  }

  displayLeaderboard(leaderboard) {
    if (!this.leaderboard) return;

    if (!leaderboard || leaderboard.length === 0) {
      this.leaderboard.innerHTML = '<div class="no-teams">Geen teams gevonden</div>';
      return;
    }

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    const leaderboardHtml = leaderboard
      .map(
        (team, index) => `
      <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" onclick="scoreInput.selectTeam(${team.id})" style="cursor: pointer;">
        <div class="rank">#${index + 1}</div>
        <div class="team-info">
          <div class="team-icon">${this.getIconEmoji(team.icon)}</div>
          <div class="team-name">${team.name}</div>
        </div>
        <div class="team-score">${team.score}</div>
      </div>
    `
      )
      .join('');

    this.leaderboard.innerHTML = leaderboardHtml;
  }

  async loadRecentScores() {
    try {
      const response = await api.get(`/api/v1/sessions/${this.sessionId}/scores`);
      const scores = response.scores || [];
      // Show most recent 10 scores (newest first)
      this.recentScoresData = scores.slice(0, 10);
      this.displayRecentScores();
    } catch (error) {
      api.handleError(error, 'loading recent scores');
    }
  }

  displayRecentScores() {
    if (!this.recentScores) return;

    if (!this.recentScoresData || this.recentScoresData.length === 0) {
      this.recentScores.innerHTML = '<div class="no-scores">Nog geen scores toegevoegd</div>';
      return;
    }

    const scoresHtml = this.recentScoresData
      .map((score) => {
        const team = this.teams.find((t) => t.id === score.team_id);
        const timeAgo = this.getTimeAgo(new Date(score.timestamp));
        return `
        <div class="score-item">
          <div class="score-team">${team ? team.name : 'Onbekend team'}</div>
          <div class="score-change ${score.points >= 0 ? 'positive' : 'negative'}">
            ${score.points >= 0 ? '+' : ''}${score.points}
          </div>
          <div class="score-reason">${score.reason || 'Handmatig'}</div>
          <div class="score-time">${timeAgo}</div>
        </div>
      `;
      })
      .join('');

    this.recentScores.innerHTML = scoresHtml;
  }

  adjustPoints(delta) {
    let currentValue = parseInt(this.pointsInput.value) || 0;
    currentValue += delta;
    if (currentValue < -100) currentValue = -100;
    if (currentValue > 100) currentValue = 100;
    this.pointsInput.value = currentValue;
  }

  selectTeam(teamId) {
    this.teamSelect.value = teamId;
    // Optional: Add visual feedback or focus the points input
    this.pointsInput.focus();
  }

  async submitScore() {
    const teamId = parseInt(this.teamSelect.value);
    const points = parseInt(this.pointsInput.value);
    const reason = this.reasonInput.value.trim();

    if (!teamId) {
      alert('Selecteer een team.');
      this.teamSelect.focus();
      return;
    }

    if (isNaN(points)) {
      alert('Voer een geldig aantal punten in.');
      this.pointsInput.focus();
      return;
    }

    // Prepare real-time acknowledgement listener before sending
    const ackPromise = new Promise((resolve) => {
      const handler = (data) => {
        if (data && String(data.session_id) === String(this.sessionId) && Number(data.team_id) === teamId && Number(data.points) === points) {
          api.off('session_score_update', handler);
          resolve(true);
        }
      };
      api.on('session_score_update', handler);
      const timeout = setTimeout(() => {
        api.off('session_score_update', handler);
        resolve(false);
      }, 1500);
    });

    try {
      const scoreData = {
        session_id: parseInt(this.sessionId),
        team_id: teamId,
        points: points,
        reason: reason || 'Handmatig',
        round_number: this.session.current_round,
      };

  await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, scoreData);

      // Treat as success
      this.onScoreSubmitSuccess(teamId, points);
    } catch (error) {
      // If the API call failed, but we got a realtime event, treat it as success
      const acknowledged = await ackPromise;
      if (acknowledged) {
        // No noisy console error thanks to postSilent; proceed as success
        this.onScoreSubmitSuccess(teamId, points);
      } else {
        api.handleError(error, 'submitting score');
        alert('Fout bij het toevoegen van de score.');
      }
    }
  }

  onScoreSubmitSuccess(teamId, points) {
    // Show animation
    this.showScoreAnimation(teamId, points);

    // Reset form
    this.reasonInput.value = '';
    this.pointsInput.value = 1;

    // Reload data (these will also be refreshed by realtime events, but keep it deterministic)
    this.loadLeaderboard();
    this.loadTeams();

    // Load recent scores with a small delay to ensure the score is saved
    setTimeout(() => {
      this.loadRecentScores();
    }, 500);
  }

  addQuickScore(reason, points) {
    const teamId = parseInt(this.teamSelect.value);
    if (!teamId) {
      alert('Selecteer eerst een team.');
      return;
    }

    this.pointsInput.value = points;
    this.reasonInput.value = reason;
    this.submitScore();
  }

  showScoreAnimation(teamId, points) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return;

    this.animTeamIcon.textContent = this.getIconEmoji(team.icon);
    this.animScoreChange.textContent = `${points >= 0 ? '+' : ''}${points}`;
    this.animScoreChange.className = `score-change ${points >= 0 ? 'positive' : 'negative'}`;
    this.animTeamName.textContent = team.name;

    this.scoreAnimation.classList.add('show');

    setTimeout(() => {
      this.scoreAnimation.classList.remove('show');
    }, 2000);
  }

  async togglePause() {
    try {
      const newStatus = this.session.status === 'active' ? 'paused' : 'active';
      await api.put(`/api/v1/sessions/${this.sessionId}`, { status: newStatus });
      this.session.status = newStatus;
      this.updateSessionDisplay();
      this.pauseSessionBtn.textContent = newStatus === 'paused' ? 'Hervat' : 'Pauze';
    } catch (error) {
      api.handleError(error, 'toggling pause');
    }
  }

  async nextRound() {
    try {
      const nextRound = this.session.current_round + 1;
      if (nextRound > this.session.total_rounds) {
        alert('Dit is de laatste ronde.');
        return;
      }

      await api.put(`/api/v1/sessions/${this.sessionId}`, { current_round: nextRound });
      this.session.current_round = nextRound;
      this.updateSessionDisplay();
    } catch (error) {
      api.handleError(error, 'advancing round');
    }
  }

  async endSession() {
    if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) {
      return;
    }

    try {
      await api.put(`/api/v1/sessions/${this.sessionId}`, { status: 'completed' });
      alert('Sessie beëindigd!');
      window.location.href = 'startscreen.html';
    } catch (error) {
      api.handleError(error, 'ending session');
    }
  }

  startTimer() {
    if (this.session && this.session.time_limit) {
      this.timeRemaining = this.session.time_limit;
      this.updateTimerDisplay();

      this.timerInterval = setInterval(() => {
        if (this.session.status === 'active' && this.timeRemaining > 0) {
          this.timeRemaining--;
          this.updateTimerDisplay();

          if (this.timeRemaining === 0) {
            this.handleTimeUp();
          }
        }
      }, 1000);
    }
  }

  updateTimerDisplay() {
    if (!this.timer) return;

    if (!this.session || !this.session.time_limit) {
      this.timer.textContent = '--:--';
      return;
    }

    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  handleTimeUp() {
    alert('Tijd is om! De ronde is afgelopen.');
    if (this.session.current_round < this.session.total_rounds) {
      this.nextRound();
    } else {
      this.endSession();
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins}m geleden`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}u geleden`;

    return date.toLocaleDateString('nl-NL');
  }

  handleScoreUpdate(data) {
    if (data.session_id == this.sessionId) {
      this.loadLeaderboard();
      this.loadRecentScores();
      this.loadTeams();
    }
  }

  handleStatusUpdate(data) {
    if (data.id == this.sessionId) {
      this.session.status = data.status;
      this.updateSessionDisplay();
    }
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

  // Custom Quick Actions Methods
  loadCustomQuickActions() {
    const stored = localStorage.getItem('customQuickActions');
    if (stored) {
      try {
        this.customQuickActions = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading custom quick actions:', error);
        this.customQuickActions = [];
      }
    }
    this.displayCustomQuickActions();
  }

  saveCustomQuickActions() {
    localStorage.setItem('customQuickActions', JSON.stringify(this.customQuickActions));
  }

  addCustomQuickAction() {
    const reason = this.customReasonInput.value.trim();
    const points = parseInt(this.customPointsInput.value);

    if (!reason) {
      alert('Voer een reden in voor de snelle actie.');
      this.customReasonInput.focus();
      return;
    }

    if (isNaN(points) || points === 0) {
      alert('Voer een geldig aantal punten in (niet 0).');
      this.customPointsInput.focus();
      return;
    }

    if (points < -100 || points > 100) {
      alert('Punten moeten tussen -100 en 100 liggen.');
      this.customPointsInput.focus();
      return;
    }

    // Check for duplicate reasons
    if (this.customQuickActions.some((action) => action.reason.toLowerCase() === reason.toLowerCase())) {
      alert('Een snelle actie met deze reden bestaat al.');
      this.customReasonInput.focus();
      return;
    }

    const newAction = {
      id: Date.now(), // Simple unique ID
      reason: reason,
      points: points,
    };

    this.customQuickActions.push(newAction);
    this.saveCustomQuickActions();
    this.displayCustomQuickActions();

    // Reset form
    this.customReasonInput.value = '';
    this.customPointsInput.value = '';

    // Focus back to reason input
    this.customReasonInput.focus();
  }

  removeCustomQuickAction(actionId) {
    if (confirm('Weet je zeker dat je deze snelle actie wilt verwijderen?')) {
      this.customQuickActions = this.customQuickActions.filter((action) => action.id !== actionId);
      this.saveCustomQuickActions();
      this.displayCustomQuickActions();
    }
  }

  displayCustomQuickActions() {
    if (!this.customQuickActionsContainer) return;

    if (this.customQuickActions.length === 0) {
      this.customQuickActionsContainer.innerHTML = '<div class="no-custom-actions">Nog geen aangepaste snelle acties</div>';
      return;
    }

    const actionsHtml = this.customQuickActions
      .map(
        (action) => `
        <button class="custom-action-btn" onclick="scoreInput.addQuickScore('${action.reason.replace(/'/g, "\\'")}', ${action.points})">
          ${action.reason} (${action.points >= 0 ? '+' : ''}${action.points})
          <button class="custom-action-btn remove" onclick="event.stopPropagation(); scoreInput.removeCustomQuickAction(${action.id})" title="Verwijderen">×</button>
        </button>
      `
      )
      .join('');

    this.customQuickActionsContainer.innerHTML = actionsHtml;
  }
}

// Global instance for onclick handlers
let scoreInput;

// Initialize the score input when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  scoreInput = new ScoreInput();
});
