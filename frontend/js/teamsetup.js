// Team Setup JavaScript
class TeamSetup {
  constructor() {
    this.sessionId = null;
    this.session = null;
    this.teams = [];
    this.init();
  }

  init() {
    this.getSessionIdFromUrl();
    this.bindElements();
    this.setupEventListeners();
    this.loadSession();
    this.loadTeams();
  }

  getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get('session');
    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de startpagina.');
      window.location.href = 'startscreen.html';
    }
  }

  bindElements() {
    this.sessionName = document.getElementById('session-name');
    this.sessionStatus = document.getElementById('session-status');
    this.teamNameInput = document.getElementById('team-name');
    this.teamColorSelect = document.getElementById('team-color');
    this.teamIconSelect = document.getElementById('team-icon');
    this.addTeamBtn = document.getElementById('add-team-btn');
    this.teamsGrid = document.getElementById('teams-grid');
    this.startSessionBtn = document.getElementById('start-session-btn');
    this.backBtn = document.getElementById('back-btn');
    this.deleteSessionBtn = document.getElementById('delete-session-btn');
    this.teamsCount = document.getElementById('teams-count');
    this.maxTeams = document.getElementById('max-teams');
    this.gameType = document.getElementById('game-type');

    // Modal elements
    this.teamModal = document.getElementById('team-modal');
    this.editTeamId = document.getElementById('edit-team-id');
    this.editTeamName = document.getElementById('edit-team-name');
    this.editTeamColor = document.getElementById('edit-team-color');
    this.editTeamIcon = document.getElementById('edit-team-icon');
    this.saveTeamBtn = document.getElementById('save-team-btn');
    this.cancelEditBtn = document.getElementById('cancel-edit-btn');
  }

  setupEventListeners() {
    this.addTeamBtn.addEventListener('click', () => this.addTeam());
    this.startSessionBtn.addEventListener('click', () => this.startSession());
    this.backBtn.addEventListener('click', () => {
      window.location.href = 'startscreen.html';
    });
    this.deleteSessionBtn.addEventListener('click', () => this.deleteSession());

    // Modal events
    this.saveTeamBtn.addEventListener('click', () => this.saveTeamEdit());
    this.cancelEditBtn.addEventListener('click', () => this.hideTeamModal());

    // Enter key in team name input
    this.teamNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTeam();
      }
    });
  }

  async loadSession() {
    try {
      this.session = await api.get(`/api/v1/sessions/${this.sessionId}`);
      if (this.session) {
        this.updateSessionDisplay();
      }
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
    if (this.sessionStatus) {
      this.sessionStatus.textContent = `Status: ${this.getStatusText(this.session.status)}`;
    }
    if (this.maxTeams) {
      this.maxTeams.textContent = this.session.max_teams;
    }
    if (this.gameType) {
      this.gameType.textContent = this.getGameTypeText(this.session.game_type);
    }
  }

  async loadTeams() {
    try {
      const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
      if (response && response.teams) {
        this.teams = response.teams;
        this.updateTeamsDisplay();
        this.updateTeamsCount();
      }
    } catch (error) {
      api.handleError(error, 'loading teams');
    }
  }

  updateTeamsDisplay() {
    this.teamsGrid.innerHTML = '';

    if (this.teams.length === 0) {
      this.teamsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">Nog geen teams toegevoegd. Voeg je eerste team toe!</p>';
      return;
    }

    this.teams.forEach((team) => {
      const teamCard = this.createTeamCard(team);
      this.teamsGrid.appendChild(teamCard);
    });
  }

  createTeamCard(team) {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.dataset.teamId = team.id;

    card.innerHTML = `
            <span class="team-icon">${this.getIconEmoji(team.icon)}</span>
            <div class="team-name">${team.name}</div>
            <div class="team-color-indicator" style="background-color: ${team.color}"></div>
            <div class="team-score">${team.score}</div>
            <div class="team-actions">
                <button class="edit-btn" onclick="teamSetup.editTeam(${team.id})">Bewerken</button>
                <button class="delete-btn" onclick="teamSetup.deleteTeam(${team.id})">Verwijderen</button>
            </div>
        `;

    return card;
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

  async addTeam() {
    const teamName = this.teamNameInput.value.trim();
    if (!teamName) {
      alert('Voer een teamnaam in.');
      this.teamNameInput.focus();
      return;
    }

    if (this.teams.length >= this.session.max_teams) {
      alert(`Maximum aantal teams (${this.session.max_teams}) bereikt.`);
      return;
    }

    const teamData = {
      session_id: parseInt(this.sessionId),
      name: teamName,
      color: this.teamColorSelect.value,
      icon: this.teamIconSelect.value,
    };

    try {
      const newTeam = await api.post(`/api/v1/sessions/${this.sessionId}/teams`, teamData);
      if (newTeam) {
        this.teams.push(newTeam);
        this.updateTeamsDisplay();
        this.updateTeamsCount();

        // Clear form
        this.teamNameInput.value = '';
        this.teamNameInput.focus();
      }
    } catch (error) {
      api.handleError(error, 'adding team');
      alert('Fout bij het toevoegen van het team.');
    }
  }

  editTeam(teamId) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return;

    this.editTeamId.value = team.id;
    this.editTeamName.value = team.name;
    this.editTeamColor.value = team.color;
    this.editTeamIcon.value = team.icon;

    this.showTeamModal();
  }

  async saveTeamEdit() {
    const teamId = parseInt(this.editTeamId.value);
    const teamData = {
      name: this.editTeamName.value.trim(),
      color: this.editTeamColor.value,
      icon: this.editTeamIcon.value,
    };

    if (!teamData.name) {
      alert('Voer een teamnaam in.');
      this.editTeamName.focus();
      return;
    }

    try {
      const updatedTeam = await api.put(`/api/v1/sessions/${this.sessionId}/teams/${teamId}`, teamData);
      if (updatedTeam) {
        const index = this.teams.findIndex((t) => t.id === teamId);
        if (index !== -1) {
          this.teams[index] = updatedTeam;
          this.updateTeamsDisplay();
        }
        this.hideTeamModal();
      }
    } catch (error) {
      api.handleError(error, 'updating team');
      alert('Fout bij het bijwerken van het team.');
    }
  }

  async deleteTeam(teamId) {
    if (!confirm('Weet je zeker dat je dit team wilt verwijderen?')) {
      return;
    }

    try {
      await api.delete(`/api/v1/sessions/${this.sessionId}/teams/${teamId}`);
      this.teams = this.teams.filter((t) => t.id !== teamId);
      this.updateTeamsDisplay();
      this.updateTeamsCount();
    } catch (error) {
      api.handleError(error, 'deleting team');
      alert('Fout bij het verwijderen van het team.');
    }
  }

  async startSession() {
    if (this.teams.length === 0) {
      alert('Voeg minstens één team toe voordat je de sessie start.');
      return;
    }

    try {
      await api.put(`/api/v1/sessions/${this.sessionId}`, { status: 'active' });
      // Redirect to score input page
      window.location.href = `scoreinput.html?session=${this.sessionId}`;
    } catch (error) {
      api.handleError(error, 'starting session');
      alert('Fout bij het starten van de sessie.');
    }
  }

  async deleteSession() {
    if (!confirm(`Weet je zeker dat je de sessie "${this.session.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    try {
      await api.delete(`/api/v1/sessions/${this.sessionId}`);
      alert('Sessie succesvol verwijderd.');
      window.location.href = 'startscreen.html';
    } catch (error) {
      api.handleError(error, 'deleting session');
      alert('Fout bij het verwijderen van de sessie.');
    }
  }

  updateTeamsCount() {
    if (this.teamsCount) {
      this.teamsCount.textContent = this.teams.length;
    }
  }

  showTeamModal() {
    this.teamModal.classList.add('show');
    this.editTeamName.focus();
  }

  hideTeamModal() {
    this.teamModal.classList.remove('show');
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

  getGameTypeText(gameType) {
    const typeMap = {
      custom: 'Aangepast',
      quiz: 'Quiz Modus',
      sport_challenge: 'Sport Challenge',
      random_bonus: 'Random Bonus',
      elimination: 'Elimination Mode',
      team_vs_time: 'Team vs Time',
    };
    return typeMap[gameType] || gameType;
  }
}

// Global instance for onclick handlers
let teamSetup;

// Initialize the team setup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  teamSetup = new TeamSetup();
});
