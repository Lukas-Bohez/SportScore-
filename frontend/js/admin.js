// Admin Interface JavaScript - Session Management
class AdminInterface {
  constructor() {
    this.currentTab = 'sessions';
    this.currentSession = null;
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
      this.showStatusMessage('Failed to load data', 'error');
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
    this.loadTeams();
  }

  onScoreSessionChange(sessionId) {
    this.currentSession = sessionId;
    this.loadScores();
    this.populateTeamSelect(sessionId);
  }

  async populateSessionSelects() {
    try {
      const sessions = await api.request('/api/v1/sessions');
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
      const teams = await api.request(`/api/v1/sessions/${sessionId}/teams`);
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
      const sessions = await api.request('/api/v1/sessions');
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
        this.showStatusMessage('Session updated successfully', 'success');
      } else {
        await api.request('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Session created successfully', 'success');
      }
      e.target.reset();
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'saving session');
      this.showStatusMessage('Failed to save session', 'error');
    }
  }

  async deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await api.request(`/api/v1/sessions/${id}`, { method: 'DELETE' });
      this.showStatusMessage('Session deleted successfully', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'deleting session');
      this.showStatusMessage('Failed to delete session', 'error');
    }
  }

  async startSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      this.showStatusMessage('Session started successfully', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'starting session');
      this.showStatusMessage('Failed to start session', 'error');
    }
  }

  async pauseSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paused' }),
      });
      this.showStatusMessage('Session paused successfully', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'pausing session');
      this.showStatusMessage('Failed to pause session', 'error');
    }
  }

  async resumeSession(id) {
    try {
      await api.request(`/api/v1/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      this.showStatusMessage('Session resumed successfully', 'success');
      await this.loadSessions();
    } catch (error) {
      api.handleError(error, 'resuming session');
      this.showStatusMessage('Failed to resume session', 'error');
    }
  }

  // Teams Management (Session Teams)
  async loadTeams() {
    try {
      // Load teams for the current session if one is selected
      if (this.currentSession) {
        const teams = await api.request(`/api/v1/sessions/${this.currentSession}/teams`);
        this.renderTeamsTable(teams);
      } else {
        // Load all teams with session info
        const allTeams = await api.request('/api/v1/sessions/teams');
        this.renderTeamsTable(allTeams);
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
      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${team.id}</td>
                <td>${team.session_name || 'Unknown Session'}</td>
                <td>${team.name}</td>
                <td><span style="color: ${team.color}">${team.color}</span></td>
                <td>${team.icon}</td>
                <td>${team.score || 0}</td>
                <td class="actions">
                    <button class="btn btn-small btn-secondary" onclick="admin.editTeam(${team.id})">Edit</button>
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
      this.showStatusMessage('Please select a session first', 'error');
      return;
    }

    try {
      if (data.id) {
        await api.request(`/api/v1/sessions/${data.session_id}/teams/${data.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Team updated successfully', 'success');
      } else {
        await api.request(`/api/v1/sessions/${data.session_id}/teams`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        this.showStatusMessage('Team created successfully', 'success');
      }
      e.target.reset();
      await this.loadTeams();
    } catch (error) {
      api.handleError(error, 'saving team');
      this.showStatusMessage('Failed to save team', 'error');
    }
  }

  async deleteTeam(id) {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      // Find the session ID for this team
      const teams = await api.request('/api/v1/sessions/teams');
      const team = teams.find((t) => t.id == id);
      if (team) {
        await api.request(`/api/v1/sessions/${team.session_id}/teams/${id}`, { method: 'DELETE' });
        this.showStatusMessage('Team deleted successfully', 'success');
        await this.loadTeams();
      }
    } catch (error) {
      api.handleError(error, 'deleting team');
      this.showStatusMessage('Failed to delete team', 'error');
    }
  }

  // Scores Management (Session Scores)
  async loadScores() {
    try {
      if (this.currentSession) {
        const scores = await api.request(`/api/v1/sessions/${this.currentSession}/scores`);
        this.renderScoresTable(scores);
      } else {
        // Load all scores with session/team info
        const allScores = await api.request('/api/v1/sessions/scores');
        this.renderScoresTable(allScores);
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
      this.showStatusMessage('Please select a session first', 'error');
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
      this.showStatusMessage('Score added successfully', 'success');
      e.target.reset();
      await this.loadScores();
    } catch (error) {
      api.handleError(error, 'saving score');
      this.showStatusMessage('Failed to save score', 'error');
    }
  }

  async deleteScore(id) {
    if (!confirm('Are you sure you want to delete this score?')) return;

    try {
      // Find the session ID for this score
      const scores = await api.request('/api/v1/sessions/scores');
      const score = scores.find((s) => s.id == id);
      if (score) {
        await api.request(`/api/v1/sessions/${score.session_id}/scores/${id}`, { method: 'DELETE' });
        this.showStatusMessage('Score deleted successfully', 'success');
        await this.loadScores();
      }
    } catch (error) {
      api.handleError(error, 'deleting score');
      this.showStatusMessage('Failed to delete score', 'error');
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
    this.showStatusMessage('Edit functionality coming soon', 'info');
  }

  editTeam(id) {
    // Implementation would load team data and populate form
    this.showStatusMessage('Edit functionality coming soon', 'info');
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
