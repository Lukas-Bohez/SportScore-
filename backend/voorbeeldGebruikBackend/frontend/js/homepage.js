// homepage.js - Handles the homepage functionality

class Homepage {
  constructor() {
    this.api = new ScoreboardAPI();
    this.api.initSocket();
    this.templatesGrid = document.getElementById('templates-grid');
    this.sessionsList = document.getElementById('sessions-list');
    this.currentView = 'simple'; // 'simple' or 'detailed'
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupViewToggle();
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'start';
    this.showSection(section);
    if (section === 'teams') {
      this.startScreen = new StartScreen(this.api);
    }
    await this.loadTemplates();
    await this.loadSessions();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.id === 'qr-toggle') return; // Skip QR toggle, handled separately
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        this.showSection(section);
        if (section === 'active') {
          this.loadActiveOverview();
        }
      });
    });
  }

  setupViewToggle() {
    const simpleBtn = document.getElementById('simple-view');
    const detailedBtn = document.getElementById('detailed-view');

    if (simpleBtn && detailedBtn) {
      simpleBtn.addEventListener('click', () => {
        this.currentView = 'simple';
        simpleBtn.classList.add('active');
        detailedBtn.classList.remove('active');
        this.loadSessions();
      });

      detailedBtn.addEventListener('click', () => {
        this.currentView = 'detailed';
        detailedBtn.classList.add('active');
        simpleBtn.classList.remove('active');
        this.loadSessions();
      });
    }
  }

  showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }

    // Initialize team management if teams section
    if (sectionName === 'teams' && !this.startScreen) {
      this.startScreen = new StartScreen(this.api);
    }

    // Load active overview for the Active tab
    if (sectionName === 'active') {
      this.loadActiveOverview();
    }
  }

  async loadActiveOverview() {
    const container = document.getElementById('active-overview');
    const actionsDiv = document.querySelector('.session-actions');
    const openBtn = document.getElementById('active-open-score');
    const endBtn = document.getElementById('active-end');
    if (!container || !actionsDiv || !openBtn || !endBtn) return;
    try {
      const activeSession = await this.api.getActiveSession();
      if (!activeSession) {
        container.innerHTML = '<p class="info-message">Geen actieve sessie.</p>';
        actionsDiv.style.display = 'none';
        return;
      }
      container.innerHTML = `
        <div class="session-item">
          <h4>${activeSession.name}</h4>
          <div class="details">Status: ${this.getStatusText(activeSession.status)}</div>
          <div class="details">Ronde: ${activeSession.current_round}/${activeSession.total_rounds}</div>
        </div>`;
      actionsDiv.style.display = 'flex';
      openBtn.disabled = false;
      endBtn.disabled = false;
      openBtn.onclick = () => {
        window.location.href = `simple-scoreinput.html?session=${activeSession.id}`;
      };
      endBtn.onclick = async () => {
        if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) return;
        try {
          await this.api.updateSession(activeSession.id, { status: 'completed' });
          this.loadActiveOverview();
        } catch (e) {
          this.api.handleError(e, 'ending active session');
          alert('Fout bij beëindigen sessie.');
        }
      };
    } catch (e) {
      this.api.handleError(e, 'loading active overview');
      container.innerHTML = '<p class="error-message">Fout bij laden actieve sessie.</p>';
    }
  }

  async loadTemplates() {
    if (!this.templatesGrid) return;

    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');

      if (templates.length === 0) {
        this.templatesGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Geen templates gevonden. Maak eerst een sessie aan en sla deze op als template.</p>';
        return;
      }

      const templatesHtml = templates
        .map(
          (template) => `
            <div class="template-card">
              <h3>${template.name}</h3>
              <p>${template.description || 'Geen beschrijving'}</p>
              <div class="template-actions">
                <button class="btn" onclick="homepage.loadTemplate(${template.id})">Gebruiken</button>
                <button class="delete-team-btn" onclick="homepage.deleteTemplate(${template.id})">Verwijderen</button>
              </div>
            </div>
          `
        )
        .join('');

      this.templatesGrid.innerHTML = templatesHtml;
    } catch (error) {
      console.error('Error loading templates:', error);
      if (this.templatesGrid) {
        this.templatesGrid.innerHTML = '<p>Fout bij laden templates.</p>';
      }
    }
  }

  async loadSessions() {
    if (!this.sessionsList) return;

    try {
      const response = await this.api.getSessions();
      const sessions = response.sessions || [];

      // Filter completed sessions
      const completedSessions = sessions.filter((s) => s.status === 'completed');

      if (completedSessions.length === 0) {
        this.sessionsList.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Geen gespeelde sessies gevonden.</p>';
        return;
      }

      // Load winners for each session
      const sessionsWithWinners = await Promise.all(
        completedSessions.map(async (session) => {
          const winnerInfo = await this.getSessionWinner(session);
          // Load per-activity winners
          let activityWinners = [];
          try {
            const actsResp = await this.api.getSessionActivities(session.id);
            const activities = actsResp.activities || [];
            activityWinners = await Promise.all(
              activities.map(async (a) => {
                try {
                  const lb = await this.api.getActivityLeaderboard(a.id);
                  const top = (lb.leaderboard || [])[0];
                  return top
                    ? {
                        activity: a.name,
                        team_name: top.team_name,
                        total_score: top.total_score || top.score || 0,
                      }
                    : { activity: a.name, team_name: '-', total_score: 0 };
                } catch (_) {
                  return { activity: a.name, team_name: '-', total_score: 0 };
                }
              })
            );
          } catch (_) {}
          return { ...session, winner: winnerInfo, activityWinners };
        })
      );

      const sessionsHtml = sessionsWithWinners
        .map((session) => {
          const date = new Date(session.created_at).toLocaleDateString('nl-NL');
          const winnerText = session.winner ? `${session.winner.name}${session.winner.points ? ` (${session.winner.points} punten)` : ''}` : 'Onbekend';

          let extraDetails = '';
          if (this.currentView === 'detailed' && session.winner && session.winner.players) {
            extraDetails = '<div class="players">' + session.winner.players.map((p) => `<div>${p.name}: ${p.score} punten</div>`).join('') + '</div>';
          }

          const activitiesHtml = (session.activityWinners || [])
            .map(
              (aw) => `
              <div class="details">Activiteit: ${this.escapeHtml(aw.activity)} — Top: ${this.escapeHtml(aw.team_name)} (${aw.total_score})</div>
            `
            )
            .join('');

          return `
            <div class="session-item">
              <h4>${session.name}</h4>
              <div class="details">Winnaar: ${winnerText}</div>
              <div class="details">Datum: ${date}</div>
              ${activitiesHtml}
              ${extraDetails}
              <button class="btn" onclick="window.location.href='leaderboard.html?session=${session.id}'">Bekijken</button>
            </div>
          `;
        })
        .join('');

      this.sessionsList.innerHTML = sessionsHtml;
    } catch (error) {
      console.error('Error loading sessions:', error);
      if (this.sessionsList) {
        this.sessionsList.innerHTML = '<p>Fout bij laden sessies.</p>';
      }
    }
  }

  async getSessionWinner(session) {
    try {
      const scoresResponse = await this.api.getSessionScores(session.id);
      const scores = scoresResponse.scores || [];

      if (session.scoring_mode === 'player') {
        // For player mode, winner is the player with highest score
        const [playersResponse, teamsResponse] = await Promise.all([this.api.getPlayers(), this.api.getSessionTeams(session.id)]);
        const players = playersResponse.players || [];
        const teams = teamsResponse.teams || [];
        const playerMap = {};
        const teamMap = {};
        players.forEach((p) => {
          playerMap[p.id] = { name: p.name, team_id: p.team_id };
        });
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const playerScores = {};
        scores.forEach((score) => {
          if (score.player_id) {
            if (!playerScores[score.player_id]) playerScores[score.player_id] = 0;
            playerScores[score.player_id] += score.points;
          }
        });

        const sortedPlayers = Object.entries(playerScores)
          .map(([id, score]) => ({
            id,
            name: playerMap[id]?.name || 'Onbekend',
            team: teamMap[playerMap[id]?.team_id] || 'Onbekend',
            score,
          }))
          .sort((a, b) => b.score - a.score);

        if (sortedPlayers.length === 0) return null;

        const winner = sortedPlayers[0];
        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedPlayers.slice(0, 5) : null // Top 5 for detailed view
        };
      } else if (session.scoring_mode === 'team_with_players') {
        // For team_with_players, winner is the team, show players of winning team
        const teamsResponse = await this.api.getSessionTeams(session.id);
        const teams = teamsResponse.teams || [];
        const teamMap = {};
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const teamScores = {};
        scores.forEach((score) => {
          if (score.team_id) {
            if (!teamScores[score.team_id]) teamScores[score.team_id] = 0;
            teamScores[score.team_id] += score.points;
          }
        });

        const sortedTeams = Object.entries(teamScores)
          .map(([id, score]) => ({ id, name: teamMap[id] || 'Onbekend', score }))
          .sort((a, b) => b.score - a.score);

        if (sortedTeams.length === 0) return null;

        const winner = sortedTeams[0];

        // Get players for the winning team
        const playersResponse = await this.api.request(`/api/v1/sessions/${session.id}/teams/${winner.id}/players`);
        const teamPlayers = playersResponse.players || [];

        const playerScores = {};
        teamPlayers.forEach((p) => (playerScores[p.id] = { name: p.name || p.player_name, score: 0 }));
        scores.forEach((score) => {
          if (score.player_id && playerScores[score.player_id]) {
            playerScores[score.player_id].score += score.points;
          }
        });

        const sortedTeamPlayers = Object.values(playerScores).sort((a, b) => b.score - a.score);

        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedTeamPlayers : null
        };
      } else {
        // For team mode, winner is the team with highest score
        const teamsResponse = await this.api.getSessionTeams(session.id);
        const teams = teamsResponse.teams || [];
        const teamMap = {};
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const teamScores = {};
        scores.forEach((score) => {
          if (score.team_id) {
            if (!teamScores[score.team_id]) teamScores[score.team_id] = 0;
            teamScores[score.team_id] += score.points;
          }
        });

        const sortedTeams = Object.entries(teamScores)
          .map(([id, score]) => ({
            id,
            name: teamMap[id] || 'Onbekend',
            score,
          }))
          .sort((a, b) => b.score - a.score);

        if (sortedTeams.length === 0) return null;

        const winner = sortedTeams[0];
        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedTeams.slice(0, 3) : null // Top 3 teams for detailed view
        };
      }
    } catch (error) {
      console.error('Error getting session winner:', error);
      return null;
    }
  }

  async loadTemplate(templateId) {
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
      const template = templates.find((t) => t.id == templateId);
      if (!template) {
        alert('Template niet gevonden.');
        return;
      }

      // Store template data in sessionStorage and redirect to simple-setup
      sessionStorage.setItem('templateData', JSON.stringify(template.template_data));
      window.location.href = 'simple-setup.html';
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Fout bij laden template.');
    }
  }

  deleteTemplate(templateId) {
    if (confirm('Weet je zeker dat je deze template wilt verwijderen?')) {
      try {
        const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
        const updated = templates.filter((t) => t.id != templateId);
        localStorage.setItem('sportScoreTemplates', JSON.stringify(updated));
        this.loadTemplates(); // Refresh the list
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Fout bij verwijderen template.');
      }
    }
  }
}

// Start Screen JavaScript integrated
class StartScreen {
  constructor(api) {
    this.api = api;
    this.editingTeamId = null;
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadTeams();
  }

  bindElements() {
    this.sessionForm = document.getElementById('session-form');

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
    if (!this.viewAllSessionsBtn) console.warn('view-all-sessions-btn element not found');
  }

  setupEventListeners() {
    if (this.sessionForm) {
      this.sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createNewSession();
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

    // Color preview event listener
    const teamColorInput = document.getElementById('team-color');
    if (teamColorInput) {
      teamColorInput.addEventListener('input', this.handleColorChange.bind(this));
    }

    // Color preview click to open color picker
    const colorPreview = document.getElementById('color-preview');
    if (colorPreview) {
      colorPreview.addEventListener('click', () => {
        if (teamColorInput) {
          teamColorInput.click();
        }
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
      total_rounds: parseInt(document.getElementById('total-rounds').value),
      time_limit: document.getElementById('time-limit').value ? parseInt(document.getElementById('time-limit').value) * 60 : null, // Convert to seconds
    };

    // Force show_players for team_with_players mode
    if (sessionData.scoring_mode === 'team_with_players') {
      sessionData.show_players = true;
    }

    try {
      const response = await this.api.post('/api/v1/sessions', sessionData);
      if (response) {
        this.showSuccessMessage('Sessie aangemaakt!');
        // Redirect to team setup page
        setTimeout(() => {
          window.location.href = `teamsetup.html?session=${response.id}`;
        }, 500);
      }
    } catch (error) {
      this.api.handleError(error, 'creating session');

      // Show user-friendly error message
      const errorMsg = error.message && error.message.includes('fetch') ? 'Kan geen verbinding maken met de backend server. Zorg dat de server draait op http://localhost:8000' : 'Fout bij het aanmaken van de sessie. Probeer opnieuw.';

      this.showErrorMessage(errorMsg);
    }
  }

  async loadActiveSession() {
    try {
      const activeSession = await this.api.get('/api/v1/sessions/active');
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
            Ronde: ${session.current_round}/${session.total_rounds}
        `;
  }

  async continueSession() {
    try {
      const activeSession = await this.api.get('/api/v1/sessions/active');
      if (activeSession) {
        window.location.href = `simple-scoreinput.html?session=${activeSession.id}`;
      }
    } catch (error) {
      this.api.handleError(error, 'continuing session');
    }
  }

  async endSession() {
    if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) {
      return;
    }

    try {
      const activeSession = await this.api.get('/api/v1/sessions/active');
      if (activeSession) {
        await this.api.put(`/api/v1/sessions/${activeSession.id}`, { status: 'completed' });
        alert('Sessie beëindigd!');
        window.location.reload();
      }
    } catch (error) {
      this.api.handleError(error, 'ending session');
    }
  }

  async loadAllSessions() {
    try {
      const response = await this.api.get('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      // Always render the section, even if empty, to replace the "Laden..." placeholder
      this.displayRecentSessions(sessions.slice(0, 5)); // Show up to 5 recent sessions
    } catch (error) {
      this.api.handleError(error, 'loading recent sessions');
      this.sessionsList.innerHTML = 'Fout bij het laden van sessies.';
    }
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
    this.editingTeamId = null;
    // Initialize color preview
    this.handleColorChange({ target: { value: '#3B82F6' } });
  }

  hideTeamForm() {
    this.teamFormContainer.classList.add('hidden');
    this.teamForm.reset();
    this.editingTeamId = null;
  }

  async editTeam(teamId) {
    try {
      const response = await this.api.getStandaloneTeam(teamId);
      if (response && response.team) {
        const team = response.team;
        this.editingTeamId = teamId;

        // Populate form with team data
        document.getElementById('team-name').value = team.name || '';
        document.getElementById('team-color').value = team.color || '#3B82F6';
        document.getElementById('team-icon').value = team.icon || 'team';
        document.getElementById('team-description').value = team.description || '';

        // Update color preview
        this.handleColorChange({ target: { value: team.color || '#3B82F6' } });

        // Show form
        this.teamFormContainer.classList.remove('hidden');

        // Focus on name field
        document.getElementById('team-name').focus();
      }
    } catch (error) {
      this.api.handleError(error, 'loading team for editing');
      alert('Fout bij het laden van team gegevens.');
    }
  }

  handleColorChange(e) {
    const color = e.target.value;
    const preview = document.getElementById('color-preview');
    if (preview) {
      preview.style.backgroundColor = color;
      preview.textContent = color.toUpperCase();
    }
  }

  async loadTeams() {
    try {
      const response = await this.api.getAllStandaloneTeams();
      const teams = response.teams || [];
      this.displayTeams(teams);
    } catch (error) {
      this.api.handleError(error, 'loading teams');
      this.teamsList.innerHTML = 'Fout bij het laden van teams.';
    }
    // populate player manager default team select if present
    if (this.pmPlayerDefaultTeam) {
      try {
        const response = await this.api.getAllStandaloneTeams();
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
      const resp = await this.api.get('/api/v1/players');
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
            await this.api.delete(`/api/v1/players/${p.id}`);
            await this.loadPlayersForManager();
          } catch (err) {
            this.api.handleError(err, 'deleting player');
            alert('Fout bij het verwijderen van speler.');
          }
        };
        actions.appendChild(deleteBtn);
        row.appendChild(actions);
        this.pmPlayersList.appendChild(row);
      });
    } catch (err) {
      this.api.handleError(err, 'loading players for manager');
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
      await this.api.post('/api/v1/players', payload);
      if (this.pmPlayerName) this.pmPlayerName.value = '';
      // Reindex positions alphabetically after creating a new player
      await this.reindexPlayersAlphabetically();
      await this.loadPlayersForManager();
    } catch (err) {
      this.api.handleError(err, 'creating player from manager');
      alert('Fout bij het aanmaken van speler.');
    }
  }

  async reindexPlayersAlphabetically() {
    try {
      const resp = await this.api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players.slice() : [];
      players.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        try {
          await this.api.put(`/api/v1/players/${p.id}`, { position: String(i + 1) });
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
          <div class="team-color-badge" style="background-color: ${team.color} !important;"></div>
          <span class="team-name">${team.name}</span>
        </div>
        ${team.description ? `<p class="team-description">${team.description}</p>` : ''}
        <div class="team-actions">
          <button class="edit-team-btn" onclick="homepage.startScreen.editTeam(${team.id})">
            ✏️ Bewerken
          </button>
          <button class="delete-team-btn" onclick="homepage.startScreen.deleteTeam(${team.id}, '${team.name}')">
            🗑️ Verwijderen
          </button>
          <button class="save-team-btn compact" onclick="homepage.startScreen.toggleUnassignedPlayers(${team.id})">Speler toewijzen</button>
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
      const resp = await this.api.get('/api/v1/players');
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
            await this.api.put(`/api/v1/players/${p.id}`, { team_id: null });
            await this.loadAssignedPlayersForTeam(teamId);
            await this.loadPlayersForManager();
          } catch (err) {
            this.api.handleError(err, 'unassigning player');
            alert('Fout bij het verwijderen van speler uit team.');
          }
        };
        actions.appendChild(unassignBtn);
        row.appendChild(actions);
        listEl.appendChild(row);
      });
    } catch (err) {
      this.api.handleError(err, 'loading assigned players');
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
      const resp = await this.api.get('/api/v1/players');
      const players = resp && resp.players ? resp.players : [];
      // Only show players that are not assigned to any team
      const unassigned = players.filter((p) => !p.team_id);
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
      this.api.handleError(err, 'loading unassigned players');
      container.innerHTML = '<p class="info-message">Kon spelers niet laden.</p>';
    }
  }

  async assignPlayerToTeam(teamId, playerId) {
    try {
      await this.api.put(`/api/v1/players/${playerId}`, { team_id: Number(teamId) });
      // refresh lists
      await this.loadAssignedPlayersForTeam(teamId);
      await this.loadPlayersForManager();
      const ul = document.getElementById(`unassigned-players-${teamId}`);
      if (ul) ul.style.display = 'none';
    } catch (err) {
      this.api.handleError(err, 'assigning player to team');
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
      let response;
      if (this.editingTeamId) {
        // Update existing team
        response = await this.api.updateStandaloneTeam(this.editingTeamId, teamData);
        this.showSuccessMessage(`Team "${teamData.name}" succesvol bijgewerkt!`);
      } else {
        // Create new team
        response = await this.api.createStandaloneTeam(teamData);
        this.showSuccessMessage(`Team "${teamData.name}" succesvol aangemaakt!`);
      }

      if (response) {
        this.hideTeamForm();
        this.loadTeams();
      }
    } catch (error) {
      this.api.handleError(error, 'creating/updating team');
      if (error.message && error.message.includes('already exists')) {
        alert('Er bestaat al een team met deze naam. Kies een andere naam.');
      } else {
        alert('Fout bij het aanmaken/bijwerken van het team. Probeer opnieuw.');
      }
    }
  }

  async deleteTeam(teamId, teamName) {
    if (!confirm(`Weet je zeker dat je team "${teamName}" wilt verwijderen? Dit verwijdert het team uit alle sessies.`)) {
      return;
    }

    try {
      await this.api.deleteStandaloneTeam(teamId);
      this.loadTeams();
      alert(`Team "${teamName}" succesvol verwijderd!`);
    } catch (error) {
      this.api.handleError(error, 'deleting team');
      alert('Fout bij het verwijderen van het team. Probeer opnieuw.');
    }
  }

}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.homepage = new Homepage();
});
