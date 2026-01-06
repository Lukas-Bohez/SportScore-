// Start Screen JavaScript
class StartScreen {
  constructor() {
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadActiveSession();
    this.loadRecentSessions();
    this.loadTeams();
  }

  bindElements() {
    this.sessionForm = document.getElementById('session-form');
    this.activeSessionDiv = document.getElementById('active-session');
    this.activeSessionInfo = document.getElementById('active-session-info');
    this.continueBtn = document.getElementById('continue-session');
    this.endBtn = document.getElementById('end-session');
    this.sessionsList = document.getElementById('sessions-list');
    this.viewAllSessionsBtn = document.getElementById('view-all-sessions-btn');

    // Team management elements
    this.addTeamBtn = document.getElementById('add-team-btn');
    this.teamFormContainer = document.getElementById('team-form-container');
    this.teamForm = document.getElementById('team-form');
    this.cancelTeamBtn = document.getElementById('cancel-team-btn');
    this.teamsList = document.getElementById('teams-list');
    // Player manager elements
    this.showPlayersCheckbox = document.getElementById('show-players');
    this.showPlayerManagerBtn = document.getElementById('show-player-manager');
    this.playerManagerDiv = document.getElementById('player-manager');
    this.pmPlayerName = document.getElementById('pm-player-name');
    // position input removed: positions are assigned alphabetically on creation
    this.pmPlayerDefaultTeam = document.getElementById('pm-player-default-team');
    this.pmAddPlayerBtn = document.getElementById('pm-add-player');
    this.pmPlayersList = document.getElementById('pm-players-list');

    // Log missing elements for debugging
    if (!this.sessionForm) console.warn('session-form element not found');
    if (!this.activeSessionDiv) console.warn('active-session element not found');
    if (!this.activeSessionInfo) console.warn('active-session-info element not found');
    if (!this.continueBtn) console.warn('continue-session element not found');
    if (!this.endBtn) console.warn('end-session element not found');
    if (!this.sessionsList) console.warn('sessions-list element not found');
    if (!this.viewAllSessionsBtn) console.warn('view-all-sessions-btn element not found');
  }

  setupEventListeners() {
    if (this.sessionForm) {
      this.sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createNewSession();
      });
    }

    if (this.continueBtn) {
      this.continueBtn.addEventListener('click', () => {
        this.continueSession();
      });
    }

    if (this.endBtn) {
      this.endBtn.addEventListener('click', () => {
        this.endSession();
      });
    }

    if (this.viewAllSessionsBtn) {
      this.viewAllSessionsBtn.addEventListener('click', () => {
        this.viewAllSessions();
      });
    }

    // Player manager events
    if (this.showPlayerManagerBtn) this.showPlayerManagerBtn.addEventListener('click', () => this.togglePlayerManager());
    if (this.pmAddPlayerBtn) this.pmAddPlayerBtn.addEventListener('click', () => this.createPlayerFromManager());

    // Team management event listeners
    if (this.addTeamBtn) {
      this.addTeamBtn.addEventListener('click', () => {
        this.showTeamForm();
      });
    }

    if (this.cancelTeamBtn) {
      this.cancelTeamBtn.addEventListener('click', () => {
        this.hideTeamForm();
      });
    }

    if (this.teamForm) {
      this.teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createTeam();
      });
    }
  }

  async createNewSession() {
    const formData = new FormData(this.sessionForm);
    const sessionData = {
      name: document.getElementById('session-name').value,
      sport_type: document.getElementById('sport-type') ? document.getElementById('sport-type').value : 'custom',
      game_type: document.getElementById('game-type').value,
      scoring_mode: document.getElementById('scoring-mode').value,
      show_players: this.showPlayersCheckbox ? Boolean(this.showPlayersCheckbox.checked) : true,
      max_teams: parseInt(document.getElementById('max-teams').value),
      total_rounds: parseInt(document.getElementById('total-rounds').value),
      time_limit: document.getElementById('time-limit').value ? parseInt(document.getElementById('time-limit').value) * 60 : null, // Convert to seconds
    };

    // Force show_players for team_with_players mode
    if (sessionData.scoring_mode === 'team_with_players') {
      sessionData.show_players = true;
    }

    try {
      const response = await api.post('/api/v1/sessions', sessionData);
      if (response) {
        this.showSuccessMessage('Sessie aangemaakt!');
        // Redirect to team setup page
        setTimeout(() => {
          window.location.href = `teamsetup.html?session=${response.id}`;
        }, 500);
      }
    } catch (error) {
      api.handleError(error, 'creating session');

      // Show user-friendly error message
      const errorMsg = error.message && error.message.includes('fetch') ? 'Kan geen verbinding maken met de backend server. Zorg dat de server draait op http://localhost:8000' : 'Fout bij het aanmaken van de sessie. Probeer opnieuw.';

      this.showErrorMessage(errorMsg);
    }
  }

  async loadActiveSession() {
    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        this.showActiveSession(activeSession);
      }
    } catch (error) {
      // Distinguish between no active session and backend not reachable
      if (error instanceof TypeError || (error.message && error.message.includes('fetch'))) {
        // Network error likely means backend is down - show prominent warning
        this.showBackendConnectionError();
      } else {
        console.log('No active session found');
      }
    }
  }

  showBackendConnectionError() {
    // Create prominent error banner at the top of the page
    const banner = document.createElement('div');
    banner.id = 'backend-error-banner';
    banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #dc3545; color: white; padding: 15px 20px; text-align: center; z-index: 10000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = `
      <div style="font-size: 1.1em; font-weight: bold; margin-bottom: 5px;">⚠️ Backend Server Niet Bereikbaar</div>
      <div style="font-size: 0.95em;">Kan geen verbinding maken met de backend op http://localhost:8000</div>
      <div style="font-size: 0.9em; margin-top: 5px;">Start de backend server en <a href="#" onclick="location.reload()" style="color: #fff; text-decoration: underline;">vernieuw deze pagina</a></div>
    `;

    // Remove existing banner if present
    const existing = document.getElementById('backend-error-banner');
    if (existing) existing.remove();

    document.body.prepend(banner);

    // Also show in the UI where active session would be
    if (this.activeSessionDiv) {
      this.activeSessionDiv.style.display = 'block';
      this.activeSessionDiv.innerHTML = `
        <div style="background: #f8d7da; border: 2px solid #dc3545; padding: 15px; border-radius: 8px;">
          <h3 style="color: #721c24; margin-top: 0;">⚠️ Verbindingsfout</h3>
          <p style="color: #721c24;">De applicatie kan geen verbinding maken met de backend server.</p>
          <p style="color: #721c24; margin-bottom: 0;"><strong>Oplossing:</strong> Start de backend server met <code>python app.py</code> en vernieuw deze pagina.</p>
        </div>
      `;
    }
  }

  showActiveSession(session) {
    this.activeSessionDiv.classList.remove('hidden');

    const gameTypeNames = {
      custom: 'Aangepast',
      quiz: 'Quiz Modus',
      sport_challenge: 'Sport Challenge',
      random_bonus: 'Random Bonus',
      elimination: 'Elimination Mode',
      team_vs_time: 'Team vs Time',
    };

    this.activeSessionInfo.innerHTML = `
            <strong>${session.name}</strong><br>
            Type: ${gameTypeNames[session.game_type] || session.game_type}<br>
            Status: ${this.getStatusText(session.status)}<br>
            Ronde: ${session.current_round}/${session.total_rounds}<br>
            Max teams: ${session.max_teams}
        `;
  }

  async continueSession() {
    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        // Redirect to team setup or score input based on session status
        if (activeSession.status === 'setup') {
          window.location.href = `teamsetup.html?session=${activeSession.id}`;
        } else {
          window.location.href = `scoreinput.html?session=${activeSession.id}`;
        }
      }
    } catch (error) {
      api.handleError(error, 'continuing session');
    }
  }

  async endSession() {
    if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) {
      return;
    }

    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        await api.put(`/api/v1/sessions/${activeSession.id}`, { status: 'completed' });
        alert('Sessie beëindigd!');
        window.location.reload();
      }
    } catch (error) {
      api.handleError(error, 'ending session');
    }
  }

  viewAllSessions() {
    // Load and display ALL sessions instead of redirecting to admin
    this.loadAllSessions();
  }

  async loadRecentSessions() {
    try {
      const response = await api.get('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      // Always render the section, even if empty, to replace the "Laden..." placeholder
      this.displayRecentSessions(sessions.slice(0, 5)); // Show up to 5 recent sessions
    } catch (error) {
      api.handleError(error, 'loading recent sessions');
      this.sessionsList.innerHTML = 'Fout bij het laden van sessies.';
    }
  }

  async loadAllSessions() {
    try {
      const response = await api.get('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      // Always render the section to show either the list or the empty state
      this.displayRecentSessions(sessions);
    } catch (error) {
      api.handleError(error, 'loading all sessions');
      this.sessionsList.innerHTML = 'Fout bij het laden van sessies.';
    }
  }

  displayRecentSessions(sessions) {
    if (sessions.length === 0) {
      this.sessionsList.innerHTML = 'Geen recente sessies gevonden.';
      return;
    }

    const sessionsHtml = sessions
      .map((session) => {
        const gameTypeNames = {
          custom: 'Aangepast',
          quiz: 'Quiz',
          sport_challenge: 'Sport',
          random_bonus: 'Bonus',
          elimination: 'Elimination',
          team_vs_time: 'Tijd',
        };

        return `
                <div class="session-item">
                    <div class="session-info">
                        <h3>${session.name}</h3>
                        <p>Type: ${gameTypeNames[session.game_type] || session.game_type} |
                           Status: ${this.getStatusText(session.status)} |
                           Aangemaakt: ${new Date(session.created_at).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div class="session-actions">
                        <button class="btn-small btn-primary" onclick="window.location.href='teamsetup.html?session=${session.id}'">Bewerken</button>
                        <button class="btn-small btn-secondary" onclick="window.location.href='leaderboard.html?session=${session.id}'">Bekijken</button>
                    </div>
                </div>
            `;
      })
      .join('');

    this.sessionsList.innerHTML = sessionsHtml;
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

  // Team Management Methods
  showTeamForm() {
    this.teamFormContainer.classList.remove('hidden');
    this.teamForm.reset();
  }

  hideTeamForm() {
    this.teamFormContainer.classList.add('hidden');
    this.teamForm.reset();
  }

  async loadTeams() {
    try {
      const response = await api.getAllStandaloneTeams();
      const teams = response.teams || [];
      this.displayTeams(teams);
    } catch (error) {
      api.handleError(error, 'loading teams');
      this.teamsList.innerHTML = 'Fout bij het laden van teams.';
    }
    // populate player manager default team select if present
    if (this.pmPlayerDefaultTeam) {
      try {
        const response = await api.getAllStandaloneTeams();
        const teams = response.teams || [];
        this.pmPlayerDefaultTeam.innerHTML = '<option value="">-- Standaard team (opt) --</option>';
        teams.forEach((t) => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          this.pmPlayerDefaultTeam.appendChild(opt);
        });
      } catch (e) {
        // ignore
      }
    }
  }

  togglePlayerManager() {
    if (!this.playerManagerDiv) return;
    if (this.playerManagerDiv.style.display === 'none' || !this.playerManagerDiv.style.display) {
      this.playerManagerDiv.style.display = 'block';
      this.loadPlayersForManager();
    } else {
      this.playerManagerDiv.style.display = 'none';
    }
  }

  async loadPlayersForManager() {
    if (!this.pmPlayersList) return;
    this.pmPlayersList.innerHTML = 'Laden spelers…';
    try {
      const resp = await api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players : [];
      // Sort players alphabetically by name
      players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (players.length === 0) {
        this.pmPlayersList.innerHTML = '<p class="info-message">Nog geen spelers.</p>';
        return;
      }
      this.pmPlayersList.innerHTML = '';
      players.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'player-item';
        row.innerHTML = `<div class="player-item-name">${this.escapeHtml(p.name)} ${p.position ? '<span class="player-item-position">(' + this.escapeHtml(p.position) + ')</span>' : ''}</div>`;
        const actions = document.createElement('div');
        actions.className = 'player-item-actions';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-team-btn';
        deleteBtn.textContent = 'Verwijderen';
        deleteBtn.onclick = async () => {
          if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;
          try {
            await api.delete(`/api/v1/players/${p.id}`);
            await this.loadPlayersForManager();
          } catch (err) {
            api.handleError(err, 'deleting player');
            alert('Fout bij het verwijderen van speler.');
          }
        };
        actions.appendChild(deleteBtn);
        row.appendChild(actions);
        this.pmPlayersList.appendChild(row);
      });
    } catch (err) {
      api.handleError(err, 'loading players for manager');
      this.pmPlayersList.innerHTML = '<p class="info-message">Kan spelers niet laden.</p>';
    }
  }

  async createPlayerFromManager() {
    const name = ((this.pmPlayerName && this.pmPlayerName.value) || '').trim();
    if (!name) {
      alert('Voer een spelersnaam in.');
      return;
    }
    try {
      const payload = { name };
      await api.post('/api/v1/players', payload);
      if (this.pmPlayerName) this.pmPlayerName.value = '';
      // Reindex positions alphabetically after creating a new player
      await this.reindexPlayersAlphabetically();
      await this.loadPlayersForManager();
    } catch (err) {
      api.handleError(err, 'creating player from manager');
      alert('Fout bij het aanmaken van speler.');
    }
  }

  async reindexPlayersAlphabetically() {
    try {
      const resp = await api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players.slice() : [];
      players.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        try {
          await api.put(`/api/v1/players/${p.id}`, { position: String(i + 1) });
        } catch (e) {
          console.warn('Failed to update player position during reindex', p.id, e);
        }
      }
      await this.loadPlayersForManager();
    } catch (e) {
      console.warn('Reindexing players failed', e);
    }
  }

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  showSuccessMessage(message) {
    const existing = document.querySelector('.success-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; font-weight: 500;';
    toast.innerHTML = `<span style="font-size: 1.2em;">✓</span> ${this.escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  showErrorMessage(message) {
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; font-weight: 500;';
    toast.innerHTML = `<span style="font-size: 1.2em;">⚠️</span> ${this.escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
  }

  displayTeams(teams) {
    if (teams.length === 0) {
      this.teamsList.innerHTML = '<p class="info-message" style="text-align: center;">Nog geen teams aangemaakt.</p>';
      return;
    }

    const iconMap = {
      team: '👥',
      star: '⭐',
      trophy: '🏆',
      fire: '🔥',
      rocket: '🚀',
      crown: '👑',
      lightning: '⚡',
      heart: '❤️',
    };

    const teamsHtml = teams
      .map(
        (team) => `
      <div class="team-card" data-team-id="${team.id}">
        <div class="team-card-header">
          <span class="team-icon">${iconMap[team.icon] || iconMap['team']}</span>
          <div class="team-color-badge" style="background-color: ${team.color}"></div>
          <span class="team-name">${team.name}</span>
        </div>
        ${team.description ? `<p class="team-description">${team.description}</p>` : ''}
        <div class="team-actions">
          <button class="delete-team-btn" onclick="startScreen.deleteTeam(${team.id}, '${team.name}')">
            🗑️ Verwijderen
          </button>
          <button class="save-team-btn compact" onclick="startScreen.toggleUnassignedPlayers(${team.id})">Speler toewijzen</button>
        </div>
        <div class="players-section" id="players-for-${team.id}">
          <div class="players-list" id="players-list-${team.id}">Laden spelers…</div>
          <div class="unassigned-players-dropdown" id="unassigned-players-${team.id}" style="display:none;">
            <div class="unassigned-dropdown-header">Selecteer speler om toe te voegen aan <strong>${team.name}</strong>:</div>
            <div class="unassigned-list" id="unassigned-list-${team.id}">Laden…</div>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    this.teamsList.innerHTML = teamsHtml;
    // Load assigned players for each team and prepare unassigned lists
    teams.forEach((t) => {
      this.loadAssignedPlayersForTeam(t.id);
    });
  }

  async loadAssignedPlayersForTeam(teamId) {
    const listEl = document.getElementById(`players-list-${teamId}`);
    if (!listEl) return;
    try {
      listEl.innerHTML = '<p style="color:#666">Laden…</p>';
      const resp = await api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players : [];
      const assigned = players.filter((p) => p.team_id && String(p.team_id) === String(teamId));
      // Sort assigned players alphabetically by name
      assigned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!assigned || assigned.length === 0) {
        listEl.innerHTML = '<p class="info-message">Nog geen spelers toegewezen.</p>';
        return;
      }
      listEl.innerHTML = '';
      assigned.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `<div class="player-left"><strong>${this.escapeHtml(p.name)}</strong></div>`;
        const actions = document.createElement('div');
        actions.className = 'player-actions';
        const unassignBtn = document.createElement('button');
        unassignBtn.className = 'delete-team-btn';
        unassignBtn.textContent = 'Verwijderen';
        unassignBtn.onclick = async () => {
          if (!confirm('Weet je zeker dat je deze speler van het team wilt halen?')) return;
          try {
            await api.put(`/api/v1/players/${p.id}`, { team_id: null });
            await this.loadAssignedPlayersForTeam(teamId);
            await this.loadPlayersForManager();
          } catch (err) {
            api.handleError(err, 'unassigning player');
            alert('Fout bij het verwijderen van speler uit team.');
          }
        };
        actions.appendChild(unassignBtn);
        row.appendChild(actions);
        listEl.appendChild(row);
      });
    } catch (err) {
      api.handleError(err, 'loading assigned players');
      listEl.innerHTML = '<p class="info-message">Kon spelers niet laden.</p>';
    }
  }

  toggleUnassignedPlayers(teamId) {
    const el = document.getElementById(`unassigned-players-${teamId}`);
    if (!el) return;
    if (el.style.display === 'none' || el.style.display === '') {
      el.style.display = 'block';
      this.loadUnassignedForTeam(teamId);
    } else {
      el.style.display = 'none';
    }
  }

  async loadUnassignedForTeam(teamId) {
    const container = document.getElementById(`unassigned-list-${teamId}`);
    if (!container) return;
    try {
      const resp = await api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players : [];
      const unassigned = players.filter((p) => !p.team_id || String(p.team_id) !== String(teamId));
      // Sort unassigned players alphabetically by name
      unassigned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (!unassigned || unassigned.length === 0) {
        container.innerHTML = '<p class="info-message">Geen beschikbare spelers om toe te wijzen.</p>';
        return;
      }
      container.innerHTML = '';
      unassigned.forEach((p) => {
        const row = document.createElement('div');
        row.className = 'unassigned-player-item';
        const left = document.createElement('div');
        left.className = 'unassigned-player-name';
        left.textContent = this.escapeHtml(p.name);
        const btn = document.createElement('button');
        btn.className = 'save-team-btn compact';
        btn.textContent = 'Toewijzen';
        btn.onclick = async () => {
          await this.assignPlayerToTeam(teamId, p.id);
        };
        row.appendChild(left);
        row.appendChild(btn);
        container.appendChild(row);
      });
    } catch (err) {
      api.handleError(err, 'loading unassigned players');
      container.innerHTML = '<p class="info-message">Kon spelers niet laden.</p>';
    }
  }

  async assignPlayerToTeam(teamId, playerId) {
    try {
      await api.put(`/api/v1/players/${playerId}`, { team_id: Number(teamId) });
      // refresh lists
      await this.loadAssignedPlayersForTeam(teamId);
      await this.loadPlayersForManager();
      const ul = document.getElementById(`unassigned-players-${teamId}`);
      if (ul) ul.style.display = 'none';
    } catch (err) {
      api.handleError(err, 'assigning player to team');
      alert('Fout bij het toewijzen van speler aan team.');
    }
  }

  async createTeam() {
    const teamData = {
      name: document.getElementById('team-name').value,
      color: document.getElementById('team-color').value,
      icon: document.getElementById('team-icon').value,
      description: document.getElementById('team-description').value || null,
    };

    try {
      const response = await api.createStandaloneTeam(teamData);
      if (response) {
        this.hideTeamForm();
        this.loadTeams();
        alert(`Team "${teamData.name}" succesvol aangemaakt!`);
      }
    } catch (error) {
      api.handleError(error, 'creating team');
      if (error.message && error.message.includes('already exists')) {
        alert('Er bestaat al een team met deze naam. Kies een andere naam.');
      } else {
        alert('Fout bij het aanmaken van het team. Probeer opnieuw.');
      }
    }
  }

  async deleteTeam(teamId, teamName) {
    if (!confirm(`Weet je zeker dat je team "${teamName}" wilt verwijderen? Dit verwijdert het team uit alle sessies.`)) {
      return;
    }

    try {
      await api.deleteStandaloneTeam(teamId);
      this.loadTeams();
      alert(`Team "${teamName}" succesvol verwijderd!`);
    } catch (error) {
      api.handleError(error, 'deleting team');
      alert('Fout bij het verwijderen van het team. Probeer opnieuw.');
    }
  }
}

// Initialize the start screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const startScreen = new StartScreen();
  // Make startScreen globally accessible for onclick handlers
  window.startScreen = startScreen;
});
