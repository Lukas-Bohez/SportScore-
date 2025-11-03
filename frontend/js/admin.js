// Admin Interface JavaScript - Session Management
class AdminInterface {
  constructor() {
    this.currentTab = 'sessions';
    this.currentSession = null;
    this.currentSessionData = null;
    this.selectedTeams = new Set();
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadInitialData();
    this.setupNavigation();
  }

  bindElements() {
    // Navigation
    this.navTabs = document.querySelectorAll('.nav-btn');

    // Forms
    this.sessionForm = document.getElementById('session-form');
    this.teamForm = document.getElementById('team-form');
    this.scoreForm = document.getElementById('score-form');

    // Tables
    this.sessionsTable = document.getElementById('sessions-table');
    this.teamsTable = document.getElementById('teams-table');
    this.scoresTable = document.getElementById('scores-table');

    // Status messages
    this.statusMessage = document.getElementById('status-message');
    // Dashboard action buttons
    this.openSessionBtn = document.getElementById('open-session-btn');
    this.stopSessionBtn = document.getElementById('stop-session-btn');
  }

  setupEventListeners() {
    // Form submissions
    if (this.sessionForm) this.sessionForm.addEventListener('submit', (e) => this.handleSessionSubmit(e));
    if (this.teamForm) this.teamForm.addEventListener('submit', (e) => this.handleTeamSubmit(e));
    if (this.scoreForm) this.scoreForm.addEventListener('submit', (e) => this.handleScoreSubmit(e));

    // Session selection for teams and scores
    const sessionSelect = document.getElementById('team-session-id');
    if (sessionSelect) sessionSelect.addEventListener('change', (e) => this.onSessionChange(e.target.value));

    const scoreSessionSelect = document.getElementById('score-session');
    if (scoreSessionSelect) scoreSessionSelect.addEventListener('change', (e) => this.onScoreSessionChange(e.target.value));

    // Real-time updates
    api.on('session_update', (data) => this.handleSessionUpdate(data));
    api.on('score_update', (data) => this.handleScoreUpdate(data));

    // Dashboard open/stop buttons
    if (this.openSessionBtn) this.openSessionBtn.addEventListener('click', () => this.openActiveSession());
    if (this.stopSessionBtn) this.stopSessionBtn.addEventListener('click', () => this.stopActiveSession());
  }

  setupNavigation() {
    this.navTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = tab.getAttribute('onclick').match(/showSection\('(\w+)'\)/)[1];
        this.showSection(sectionId);
      });
    });
  }

  showSection(sectionId) {
    this.currentTab = sectionId;

    // Update navigation
    this.navTabs.forEach((tab) => {
      tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach((section) => {
      section.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
      selectedSection.classList.add('active');
    }

    // Load data for the selected section
    this.loadTabData(sectionId);
  }

  async loadInitialData() {
    try {
      await this.loadSessions();
      this.populateSessionSelects();
    } catch (error) {
      api.handleError(error, 'loading initial data');
      this.showStatusMessage('Kon gegevens niet laden', 'error');
    }
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'sessions':
        await this.loadSessions();
        break;
      case 'teams':
        await this.loadTeams();
        break;
      case 'scores':
        await this.loadScores();
        break;
    }
  }

  onSessionChange(sessionId) {
    this.currentSession = sessionId;
    if (sessionId) {
      this.loadSessionData(sessionId);
    } else {
      this.currentSessionData = null;
    }
    this.loadTeams();
  }

  onScoreSessionChange(sessionId) {
    this.currentSession = sessionId;
    if (sessionId) {
      this.loadSessionData(sessionId);
    } else {
      this.currentSessionData = null;
    }
    this.loadScores();
    this.populateTeamSelect(sessionId);
  }

  async loadSessionData(sessionId) {
    try {
      this.currentSessionData = await api.request(`/api/v1/sessions/${sessionId}`);
    } catch (error) {
      api.handleError(error, 'loading session data');
      this.currentSessionData = null;
    }
  }

  async populateSessionSelects() {
    try {
      const response = await api.request('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      const sessionSelects = ['team-session-id', 'score-session'];
      sessionSelects.forEach((selectId) => {
        const select = document.getElementById(selectId);
        if (select) {
          select.innerHTML = '<option value="">Selecteer sessie...</option>';
          sessions.forEach((session) => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = session.name;
            select.appendChild(option);
          });
        }
      });
    } catch (error) {
      api.handleError(error, 'loading sessions for selects');
    }
  }

  async populateTeamSelect(sessionId) {
    const teamSelect = document.getElementById('score-team');
    if (!teamSelect || !sessionId) return;

    try {
      const response = await api.request(`/api/v1/sessions/${sessionId}/teams`);
      const teams = Array.isArray(response) ? response : response.teams || [];
      teamSelect.innerHTML = '<option value="">Selecteer team...</option>';
      teams.forEach((team) => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
      });
    } catch (error) {
      api.handleError(error, 'loading teams for score form');
    }
  }

  // Sessions Management
  async loadSessions() {
    try {
      const response = await api.request('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      this.renderSessionsTable(sessions);
    } catch (error) {
      api.handleError(error, 'loading sessions');
    }
  }

  renderSessionsTable(sessions) {
    if (!this.sessionsTable) return;

    const tbody = this.sessionsTable.querySelector('tbody');
    tbody.innerHTML = '';

    sessions.forEach((session) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${session.id}</td>
                <td>${session.name}</td>
                <td>${this.getGameTypeText(session.game_type)}</td>
                <td>${this.getStatusBadge(session.status)}</td>
                <td>${api.formatDate(session.created_at)}</td>
                <td class="actions">
                    <button class="btn btn-small btn-secondary" onclick="admin.editSession(${session.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="admin.deleteSession(${session.id})">Delete</button>
                    ${this.getSessionActionButtons(session)}
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  getGameTypeText(gameType) {
    const types = {
      quiz: 'Quiz',
      sport_challenge: 'Sport Challenge',
      random_bonus: 'Random Bonus',
      elimination: 'Elimination',
      team_vs_time: 'Team vs Time',
      custom: 'Custom',
    };
    return types[gameType] || gameType;
  }

  getStatusBadge(status) {
    const statusClasses = {
      setup: 'badge badge-secondary',
      active: 'badge badge-success',
      paused: 'badge badge-warning',
      completed: 'badge badge-info',
    };
    const statusTexts = {
      setup: 'Setup',
      active: 'Actief',
      paused: 'Gepauzeerd',
      completed: 'Voltooid',
    };
    const cssClass = statusClasses[status] || 'badge badge-secondary';
    const text = statusTexts[status] || status;
    return `<span class="${cssClass}">${text}</span>`;
  }

  getSessionActionButtons(session) {
    let buttons = '';
    switch (session.status) {
      case 'setup':
        buttons = `<button class="btn btn-small btn-success" onclick="admin.startSession(${session.id})">Start</button>`;
        break;
      case 'active':
        buttons = `<button class="btn btn-small btn-warning" onclick="admin.pauseSession(${session.id})">Pause</button>`;
        break;
      case 'paused':
        buttons = `<button class="btn btn-small btn-success" onclick="admin.resumeSession(${session.id})">Resume</button>`;
        break;
      case 'completed':
        buttons = `<button class="btn btn-small btn-info" onclick="admin.viewResults(${session.id})">Results</button>`;
        break;
    }
    return buttons;
  }

  async handleSessionSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (data.id) {
        await api.request(`/api/v1/sessions/${data.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Sessie succesvol bijgewerkt', 'success');
      } else {
        await api.request('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Sessie succesvol aangemaakt', 'success');
      }
      e.target.reset();
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'saving session');
      this.showStatusMessage('Kon sessie niet opslaan', 'error');
    }
  }

  async deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await api.request(`/api/v1/sessions/${id}`, { method: 'DELETE' });
      this.showStatusMessage('Sessie succesvol verwijderd', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'deleting session');
      this.showStatusMessage('Kon sessie niet verwijderen', 'error');
    }
  }

  async startSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      this.showStatusMessage('Sessie succesvol gestart', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'starting session');
      this.showStatusMessage('Kon sessie niet starten', 'error');
    }
  }

  // Open the leaderboard (big screen) in a new tab/window for the active session
  async openActiveSession() {
    try {
      const active = await api.request('/api/v1/sessions/active');
      if (!active || !active.id) {
        this.showStatusMessage('Geen actieve sessie om te openen', 'error');
        return;
      }
      // Open the public leaderboard which reads the current active session
      window.open('leaderboard.html', '_blank');
      this.showStatusMessage('Leaderboard geopend', 'success');
    } catch (error) {
      api.handleError(error, 'opening active session');
      this.showStatusMessage('Kon leaderboard niet openen', 'error');
    }
  }

  // Stop (complete) the currently active session
  async stopActiveSession() {
    try {
      const active = await api.request('/api/v1/sessions/active');
      if (!active || !active.id) {
        this.showStatusMessage('Geen actieve sessie om te stoppen', 'error');
        return;
      }
      if (!confirm('Weet je zeker dat je de actieve sessie wilt beëindigen?')) return;
      await api.request(`/api/v1/sessions/${active.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });
      this.showStatusMessage('Sessie gestopt', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'stopping active session');
      this.showStatusMessage('Kon sessie niet stoppen', 'error');
    }
  }

  async pauseSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paused' }),
      });
      this.showStatusMessage('Sessie succesvol gepauzeerd', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'pausing session');
      this.showStatusMessage('Kon sessie niet pauzeren', 'error');
    }
  }

  async resumeSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      this.showStatusMessage('Sessie succesvol hervat', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'resuming session');
      this.showStatusMessage('Kon sessie niet hervatten', 'error');
    }
  }

  // Teams Management (Session Teams)
  async loadTeams() {
    try {
      // Load teams for the current session if one is selected
      if (this.currentSession) {
        const response = await api.request(`/api/v1/sessions/${this.currentSession}/teams`);
        const teams = Array.isArray(response) ? response : response.teams || [];
        this.renderTeamsTable(teams);
      } else {
        // Load all teams with session info
        const response = await api.request('/api/v1/sessions/teams');
        const teams = Array.isArray(response) ? response : response.teams || [];
        this.renderTeamsTable(teams);
      }
    } catch (error) {
      api.handleError(error, 'loading teams');
    }
  }

  renderTeamsTable(teams) {
    if (!this.teamsTable) return;

    const tbody = this.teamsTable.querySelector('tbody');
    tbody.innerHTML = '';

    teams.forEach((team) => {
      const isEliminationMode = this.currentSessionData && this.currentSessionData.game_type === 'elimination';
      const isSelected = this.selectedTeams.has(team.id);
      const row = document.createElement('tr');
      row.className = isSelected ? 'selected' : '';
      row.style.cursor = 'pointer';
      row.onclick = (e) => {
        // Don't toggle if clicking on checkbox or buttons
        if (e.target.type !== 'checkbox' && !e.target.classList.contains('btn')) {
          this.toggleTeamSelection(team.id);
        }
      };
      row.innerHTML = `
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="admin.toggleTeamSelection(${team.id})"></td>
                <td>${team.id}</td>
                <td>${team.name}${isEliminationMode ? ' <span style="color: red;">(elimineer)</span>' : ''}</td>
                <td><span style="color: ${team.color}">${team.color}</span></td>
                <td>${team.icon}</td>
                <td>${team.score || 0}</td>
                <td class="actions">
                    <button class="btn btn-small btn-secondary" onclick="admin.editTeam(${team.id})">Edit</button>
                    ${isEliminationMode ? `<button class="btn btn-small btn-warning" onclick="admin.eliminateTeam(${team.id})">Elimineer</button>` : ''}
                    <button class="btn btn-small btn-danger" onclick="admin.deleteTeam(${team.id})">Delete</button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  async handleTeamSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    if (!data.session_id) {
      this.showStatusMessage('Selecteer eerst een sessie', 'error');
      return;
    }

    try {
      if (data.id) {
        await api.request(`/api/v1/sessions/${data.session_id}/teams/${data.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Team succesvol bijgewerkt', 'success');
      } else {
        await api.request(`/api/v1/sessions/${data.session_id}/teams`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Team succesvol aangemaakt', 'success');
      }
      e.target.reset();
      await this.loadTeams();
    } catch (error) {
      api.handleError(error, 'saving team');
      this.showStatusMessage('Kon team niet opslaan', 'error');
    }
  }

  async deleteTeam(id) {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      // Find the session ID for this team
      const response = await api.request('/api/v1/sessions/teams');
      const teams = Array.isArray(response) ? response : response.teams || [];
      const team = teams.find((t) => t.id == id);
      if (team) {
        await api.request(`/api/v1/sessions/${team.session_id}/teams/${id}`, { method: 'DELETE' });
        this.showStatusMessage('Team succesvol verwijderd', 'success');
        await this.loadTeams();
      }
    } catch (error) {
      api.handleError(error, 'deleting team');
      this.showStatusMessage('Kon team niet verwijderen', 'error');
    }
  }

  async eliminateTeam(id) {
    if (!confirm('Weet je zeker dat je dit team wilt elimineren?')) return;

    try {
      // Find the session ID for this team
      const response = await api.request('/api/v1/sessions/teams');
      const teams = Array.isArray(response) ? response : response.teams || [];
      const team = teams.find((t) => t.id == id);
      if (team) {
        await api.request(`/api/v1/sessions/${team.session_id}/teams/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ is_eliminated: true }),
        });
        this.showStatusMessage('Team geëlimineerd', 'success');
        await this.loadTeams();
      }
    } catch (error) {
      api.handleError(error, 'eliminating team');
      this.showStatusMessage('Kon team niet elimineren', 'error');
    }
  }

  toggleTeamSelection(teamId) {
    if (this.selectedTeams.has(teamId)) {
      this.selectedTeams.delete(teamId);
    } else {
      this.selectedTeams.add(teamId);
    }
    this.loadTeams(); // Re-render to update selection state
  }

  selectAllTeams(selectAll) {
    if (selectAll) {
      // Select all teams currently displayed
      const response = this.currentSession ? api.request(`/api/v1/sessions/${this.currentSession}/teams`) : api.request('/api/v1/sessions/teams');
      // For simplicity, we'll select all visible teams
      // In a real implementation, you'd wait for the response
      this.selectedTeams.clear();
      // This is a simplified version - in practice you'd need to get the current teams
      this.loadTeams();
    } else {
      this.selectedTeams.clear();
      this.loadTeams();
    }
  }

  // Scores Management (Session Scores)
  async loadScores() {
    try {
      if (this.currentSession) {
        const response = await api.request(`/api/v1/sessions/${this.currentSession}/scores`);
        const scores = Array.isArray(response) ? response : response.scores || [];
        this.renderScoresTable(scores);
      } else {
        // Load all scores with session/team info
        const response = await api.request('/api/v1/sessions/scores');
        const scores = Array.isArray(response) ? response : response.scores || [];
        this.renderScoresTable(scores);
      }
    } catch (error) {
      api.handleError(error, 'loading scores');
    }
  }

  renderScoresTable(scores) {
    if (!this.scoresTable) return;

    const tbody = this.scoresTable.querySelector('tbody');
    tbody.innerHTML = '';

    scores.forEach((score) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${score.id}</td>
                <td>${score.session_name || 'Unknown Session'}</td>
                <td>${score.team_name || 'Unknown Team'}</td>
                <td>${this.getScoreTypeText(score.reason || 'points')}</td>
                <td>${score.points}</td>
                <td>${score.reason || '-'}</td>
                <td>${api.formatDate(score.timestamp)}</td>
                <td class="actions">
                    <button class="btn btn-small btn-danger" onclick="admin.deleteScore(${score.id})">Delete</button>
                </td>
            `;
      tbody.appendChild(row);
    });
  }

  getScoreTypeText(scoreType) {
    const types = {
      points: 'Punten',
      bonus: 'Bonus',
      penalty: 'Penalty',
      time_bonus: 'Tijd Bonus',
      achievement: 'Prestatie',
    };
    return types[scoreType] || scoreType;
  }

  async handleScoreSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    if (!data.session_id) {
      this.showStatusMessage('Selecteer eerst een sessie', 'error');
      return;
    }

    try {
      await api.request(`/api/v1/sessions/${data.session_id}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: parseInt(data.session_id),
          team_id: parseInt(data.team_id),
          points: parseFloat(data.value),
          reason: data.description || data.score_type || 'manual',
          round_number: 1,
        }),
      });
      this.showStatusMessage('Score succesvol toegevoegd', 'success');
      e.target.reset();
      await this.loadScores();
    } catch (error) {
      api.handleError(error, 'saving score');
      this.showStatusMessage('Kon score niet opslaan', 'error');
    }
  }

  async deleteScore(id) {
    if (!confirm('Are you sure you want to delete this score?')) return;

    try {
      // Find the session ID for this score
      const response = await api.request('/api/v1/sessions/scores');
      const scores = Array.isArray(response) ? response : response.scores || [];
      const score = scores.find((s) => s.id == id);
      if (score) {
        await api.request(`/api/v1/sessions/${score.session_id}/scores/${id}`, { method: 'DELETE' });
        this.showStatusMessage('Score succesvol verwijderd', 'success');
        await this.loadScores();
      }
    } catch (error) {
      api.handleError(error, 'deleting score');
      this.showStatusMessage('Kon score niet verwijderen', 'error');
    }
  }

  // Utility Methods
  showStatusMessage(message, type) {
    if (!this.statusMessage) return;

    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message status-${type}`;
    this.statusMessage.style.display = 'block';

    setTimeout(() => {
      this.statusMessage.style.display = 'none';
    }, 5000);
  }

  resetSessionForm() {
    document.getElementById('session-form').reset();
  }

  resetTeamForm() {
    document.getElementById('team-form').reset();
  }

  resetScoreForm() {
    document.getElementById('score-form').reset();
  }

  // Edit methods (would populate forms with existing data)
  editSession(id) {
    // Implementation would load session data and populate form
    this.showStatusMessage('Bewerk functionaliteit komt binnenkort', 'info');
  }

  editTeam(id) {
    // Implementation would load team data and populate form
    this.showStatusMessage('Bewerk functionaliteit komt binnenkort', 'info');
  }

  // Real-time update handlers
  handleSessionUpdate(data) {
    this.loadSessions();
  }

  handleScoreUpdate(data) {
    this.loadScores();
  }
}

// Initialize the admin interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.admin = new AdminInterface();
});
