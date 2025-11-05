// Team Setup JavaScript
class TeamSetup {
  constructor() {
    this.sessionId = null;
    this.session = null;
    this.teams = [];
    this.pendingTeams = new Map();
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
    // Note: players are rendered inline per team card (no modals)
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

  // players are handled inline on each team card

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
      // Load players inline for each team card
      // Use a micro-task to allow the card to be in the DOM
      Promise.resolve().then(() => this.loadPlayersForTeam(team.id));
    });
  }

  createTeamCard(team) {
    const card = document.createElement('div');
    card.className = 'team-card' + (team._pending ? ' pending' : '');
    card.dataset.teamId = team.id;

    card.innerHTML = `
      <div class="team-header">
        <span class="team-icon">${this.getIconEmoji(team.icon)}</span>
        <div class="team-meta">
          <div class="team-name">${team.name}</div>
          <div class="team-color-indicator" style="background-color: ${team.color}"></div>
          <div class="team-score">${team._pending ? 'Toevoegen…' : team.score}</div>
        </div>
        <div class="team-actions">
          <button class="edit-btn" ${team._pending ? 'disabled' : ''} onclick="teamSetup.editTeam(${team.id})">Bewerken</button>
          <button class="delete-btn" ${team._pending ? 'disabled' : ''} onclick="teamSetup.deleteTeam(${team.id})">Verwijderen</button>
        </div>
      </div>

      <div class="players-section" id="players-for-${team.id}">
        <div class="players-list" id="players-list-${team.id}">Laden…</div>
        <div class="add-player-inline">
          <input type="text" id="new-player-name-${team.id}" placeholder="Speler naam" maxlength="100">
          <input type="text" id="new-player-position-${team.id}" placeholder="Positie (optioneel)" maxlength="50">
          <button class="add-player-inline-btn" onclick="teamSetup.addPlayerInline(${team.id})">Voeg speler toe</button>
        </div>
      </div>
    `;

    if (team._pending) {
      // Light visual hint without needing new CSS
      card.style.opacity = '0.7';
    }

    return card;
  }

  async loadPlayersForTeam(teamId) {
    const listEl = document.getElementById(`players-list-${teamId}`);
    if (!listEl) return;
    try {
      listEl.innerHTML = '<p style="color:#666">Laden…</p>';
      const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
      const players = resp && resp.players ? resp.players : [];
      if (!players || players.length === 0) {
        listEl.innerHTML = '<p style="color:#666">Nog geen spelers toegevoegd.</p>';
        return;
      }
      listEl.innerHTML = '';
      players.forEach(p => {
        const el = document.createElement('div');
        el.className = 'player-row';
        el.innerHTML = `
          <span class="player-name">${this.escapeHtml(p.name)}</span>
          <span class="player-pos">${p.position ? this.escapeHtml(p.position) : ''}</span>
          <button class="delete-player-btn" onclick="teamSetup.deletePlayerInline(${p.id}, ${teamId})">Verwijderen</button>
        `;
        listEl.appendChild(el);
      });
    } catch (err) {
      // If the server returns 405 (endpoint not available) treat as "no players yet"
      const msg = err && err.message ? err.message : '';
      const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
      if (status405) {
        // Try global players list as a fallback so we can still show players created via /api/v1/players
        try {
          const fallback = await api.get(`/api/v1/players?team_id=${teamId}`);
          const players2 = fallback && fallback.players ? fallback.players : [];
          if (!players2 || players2.length === 0) {
            listEl.innerHTML = '<p style="color:#666">Nog geen spelers toegevoegd.</p>';
            return;
          }
          listEl.innerHTML = '';
          players2.forEach(p => {
            const el = document.createElement('div');
            el.className = 'player-row';
            el.innerHTML = `
              <span class="player-name">${this.escapeHtml(p.name)}</span>
              <span class="player-pos">${p.position ? this.escapeHtml(p.position) : ''}</span>
              <button class="delete-player-btn" onclick="teamSetup.deletePlayerInline(${p.id}, ${teamId})">Verwijderen</button>
            `;
            listEl.appendChild(el);
          });
        } catch (err2) {
          // If fallback also fails, show no players message
          api.handleError(err2, 'loading players fallback');
          listEl.innerHTML = '<p style="color:#666">Nog geen spelers toegevoegd.</p>';
        }
      } else {
        api.handleError(err, 'loading players');
        listEl.innerHTML = '<p style="color:crimson">Fout bij laden van spelers.</p>';
      }
    }
  }

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async addPlayerInline(teamId) {
    const nameEl = document.getElementById(`new-player-name-${teamId}`);
    const posEl = document.getElementById(`new-player-position-${teamId}`);
    if (!nameEl) return;
    const name = (nameEl.value || '').trim();
    const position = posEl ? (posEl.value || '').trim() : undefined;
    if (!name) {
      alert('Voer een spelersnaam in.');
      nameEl.focus();
      return;
    }
    try {
      const payload = { name: name, team_id: Number(teamId) };
      if (position) payload.position = position;
      await api.postSilent(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`, payload);
      nameEl.value = '';
      if (posEl) posEl.value = '';
      await this.loadPlayersForTeam(teamId);
    } catch (err) {
      // If the session-scoped players endpoint is not available (405), fallback to global players endpoint
      const msg = err && err.message ? err.message : '';
      const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
      if (status405) {
        try {
          const payload = { name: name, team_id: Number(teamId) };
          if (position) payload.position = position;
          await api.postSilent('/api/v1/players', payload);
          nameEl.value = '';
          if (posEl) posEl.value = '';
          await this.loadPlayersForTeam(teamId);
          return;
        } catch (err2) {
          api.handleError(err2, 'adding player fallback');
          alert('Fout bij het toevoegen van speler.');
          return;
        }
      }
      api.handleError(err, 'adding player');
      alert('Fout bij het toevoegen van speler.');
    }
  }

  async deletePlayerInline(playerId, teamId) {
    if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;
    try {
      await api.delete(`/api/v1/players/${playerId}`);
      await this.loadPlayersForTeam(teamId);
    } catch (err) {
      api.handleError(err, 'deleting player');
      alert('Fout bij het verwijderen van speler.');
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

    // Optimistic UI: add a temporary team card immediately
    const tempId = `temp_${Date.now()}`;
    const tempTeam = {
      id: tempId,
      name: teamName,
      color: this.teamColorSelect.value,
      icon: this.teamIconSelect.value,
      score: 0,
      _pending: true,
    };
    this.pendingTeams.set(tempId, teamName.toLowerCase());
    this.teams.push(tempTeam);
    this.updateTeamsDisplay();
    this.updateTeamsCount();

    // Prepare real-time acknowledgement listener before sending
    const ackPromise = new Promise((resolve) => {
      const handler = (data) => {
        if (
          data &&
          Number(data.session_id) === Number(this.sessionId) &&
          (data.action === 'created' || data.team) &&
          data.team && data.team.name && data.team.name.toLowerCase() === teamName.toLowerCase()
        ) {
          api.off('team_update', handler);
          resolve(true);
        }
      };
      api.on('team_update', handler);
      const timeout = setTimeout(() => {
        api.off('team_update', handler);
        resolve(false);
      }, 5000); // wait a bit longer for realtime ack
    });

    try {

      const newTeam = await api.postSilent(`/api/v1/sessions/${this.sessionId}/teams`, teamData);
      if (newTeam) {
        // Replace the optimistic team with the real one
        const idx = this.teams.findIndex((t) => t.id === tempId || (t._pending && (newTeam.name || '').toLowerCase() === (t.name || '').toLowerCase()));
        if (idx !== -1) {
          this.teams[idx] = newTeam;
          this.pendingTeams.delete(tempId);
        } else {
          await this.loadTeams();
        }
      } else {
        const acknowledged = await ackPromise;
        if (acknowledged) {
          await this.loadTeams();
        } else {
          // Fallback: poll the API briefly to confirm if team exists
          const found = await this.waitForTeamPresence(teamName, 5000, 500);
          if (found) {
            await this.loadTeams();
          } else {
            // No response, no ack, and not found by polling; treat as failure
            // Remove optimistic card
            this.teams = this.teams.filter((t) => t.id !== tempId);
            this.updateTeamsDisplay();
            this.updateTeamsCount();
            throw new Error('Team creation not acknowledged');
          }
        }
      }

      this.updateTeamsDisplay();
      this.updateTeamsCount();

      // Clear form
      this.teamNameInput.value = '';
      this.teamNameInput.focus();
    } catch (error) {
      // If the API call failed, try realtime ack or polling before surfacing an error
      const acknowledged = await ackPromise;
      if (acknowledged || await this.waitForTeamPresence(teamName, 5000, 500)) {
        await this.loadTeams();
        this.updateTeamsDisplay();
        this.updateTeamsCount();
        // Clear form
        this.teamNameInput.value = '';
        this.teamNameInput.focus();
      } else {
        // Remove optimistic card on total failure
        this.teams = this.teams.filter((t) => !(t._pending && (t.name || '').toLowerCase() === teamName.toLowerCase()));
        this.updateTeamsDisplay();
        this.updateTeamsCount();
        api.handleError(error, 'adding team');
        alert('Fout bij het toevoegen van het team.');
      }
    }
  }

  // Poll helper to check if a team with a given name appears server-side
  async waitForTeamPresence(teamName, timeoutMs = 5000, intervalMs = 500) {
    const end = Date.now() + timeoutMs;
    const normalized = teamName.toLowerCase();
    while (Date.now() < end) {
      try {
        const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
        const exists = response && response.teams && response.teams.some(t => (t.name || '').toLowerCase() === normalized);
        if (exists) return true;
      } catch (e) {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
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
