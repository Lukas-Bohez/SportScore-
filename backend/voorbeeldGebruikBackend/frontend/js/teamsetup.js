// Team Setup JavaScript
class TeamSetup {
  constructor() {
    this.sessionId = null;
    this.session = null;
    this.teams = [];
    this.availableTeams = []; // Alle beschikbare teams (niet in deze sessie)
    this.pendingTeams = new Map();
    this.activities = [];
    this.init();
  }

  init() {
    this.getSessionIdFromUrl();
    this.bindElements();
    this.setupEventListeners();
    this.loadSession();
    this.loadTeams();
    this.loadAvailableTeams();
    this.loadPlayers();
    this.loadActivities();
  }

  getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    this.sessionId = urlParams.get('session');
    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de startpagina.');
      window.location.href = 'index.html';
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
    this.gameType = document.getElementById('game-type');

    // Existing teams selection
    this.existingTeamSelect = document.getElementById('existing-team-select');
    this.addExistingTeamBtn = document.getElementById('add-existing-team-btn');

    // Scoring mode radio buttons
    this.scoringModeTeam = document.getElementById('scoring-mode-team');
    this.scoringModeTeamPlayers = document.getElementById('scoring-mode-team-players');
    this.scoringModePlayer = document.getElementById('scoring-mode-player');
    this.playerModeHint = document.getElementById('player-mode-hint');

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
    this.addExistingTeamBtn.addEventListener('click', () => this.addExistingTeam());
    this.startSessionBtn.addEventListener('click', () => this.startSession());
    this.backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    this.deleteSessionBtn.addEventListener('click', () => this.deleteSession());

    // Modal events
    this.saveTeamBtn.addEventListener('click', () => this.saveTeamEdit());
    this.cancelEditBtn.addEventListener('click', () => this.hideTeamModal());

    // Player manager elements
    this.newPlayerNameGlobal = document.getElementById('new-player-name-global');
    this.addPlayerGlobalBtn = document.getElementById('add-player-global-btn');
    // position input removed: positions are assigned alphabetically on creation
    this.playersListGlobal = document.getElementById('players-list-global');

    // Activity manager elements
    this.newActivityName = document.getElementById('new-activity-name');
    this.activitySport = document.getElementById('activity-sport');
    this.addActivityBtn = document.getElementById('add-activity-btn');
    this.activitiesList = document.getElementById('activities-list');
    if (this.addPlayerGlobalBtn) this.addPlayerGlobalBtn.addEventListener('click', () => this.createPlayerGlobal());

    // Activity manager event
    if (this.addActivityBtn) this.addActivityBtn.addEventListener('click', () => this.addActivity());

    // Scoring mode change event
    if (this.scoringModeTeam) {
      this.scoringModeTeam.addEventListener('change', () => this.updateScoringMode());
    }
    if (this.scoringModeTeamPlayers) {
      this.scoringModeTeamPlayers.addEventListener('change', () => this.updateScoringMode());
    }
    if (this.scoringModePlayer) {
      this.scoringModePlayer.addEventListener('change', () => this.updateScoringMode());
    }

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
      window.location.href = 'index.html';
    }
  }

  updateSessionDisplay() {
    if (this.sessionName) {
      this.sessionName.textContent = this.session.name;
    }
    if (this.sessionStatus) {
      const scoringModeText = this.session.scoring_mode === 'player' ? ' | Speler Scores' : this.session.scoring_mode === 'team_with_players' ? ' | Team Scores met Spelers' : ' | Team Scores';
      this.sessionStatus.textContent = `Status: ${this.getStatusText(this.session.status)}${scoringModeText}`;
    }
    if (this.gameType) {
      this.gameType.textContent = this.getGameTypeText(this.session.game_type);
    }

    // Set the radio buttons based on current scoring mode
    if (this.session.scoring_mode === 'player') {
      if (this.scoringModePlayer) this.scoringModePlayer.checked = true;
      if (this.playerModeHint) this.playerModeHint.style.display = 'block';
    } else if (this.session.scoring_mode === 'team_with_players') {
      if (this.scoringModeTeamPlayers) this.scoringModeTeamPlayers.checked = true;
      if (this.playerModeHint) this.playerModeHint.style.display = 'none';
    } else {
      if (this.scoringModeTeam) this.scoringModeTeam.checked = true;
      if (this.playerModeHint) this.playerModeHint.style.display = 'none';
    }
  }

  async loadTeams() {
    try {
      const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
      if (response && response.teams) {
        this.teams = response.teams;
        this.updateTeamsDisplay();
        this.updateTeamsCount();
        // Update available teams when session teams change
        await this.loadAvailableTeams();
        // refresh players UI because team list changed
        await this.loadPlayers();
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

  updateActivitiesDisplay() {
    this.activitiesList.innerHTML = '';

    if (this.activities.length === 0) {
      this.activitiesList.innerHTML = '<p style="text-align: center; color: #666;">Nog geen activiteiten toegevoegd.</p>';
      return;
    }

    this.activities.forEach((activity) => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <div class="activity-name">${activity.name}</div>
        <div class="activity-sport">${activity.sport}</div>
        <button class="delete-btn" onclick="teamSetup.deleteActivity(${activity.id})">Verwijderen</button>
      `;
      this.activitiesList.appendChild(activityItem);
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
          <div class="team-color-indicator" style="background-color: ${team.color} !important;"></div>
          <div class="team-score">${team._pending ? 'Toevoegen…' : team.score}</div>
        </div>
        <div class="team-actions">
          <button class="edit-btn" ${team._pending ? 'disabled' : ''} onclick="teamSetup.editTeam(${team.id})">Bewerken</button>
          <button class="delete-btn" ${team._pending ? 'disabled' : ''} onclick="teamSetup.deleteTeam(${team.id})">Verwijderen</button>
          <button class="save-team-btn compact" title="Speler toewijzen aan dit team" onclick="teamSetup.toggleUnassignedPlayers(${team.id})">＋ Speler</button>
        </div>
      </div>

        <div class="players-section" id="players-for-${team.id}">
        <div class="players-list" id="players-list-${team.id}">Laden…</div>
        <div class="unassigned-players-dropdown" id="unassigned-players-${team.id}" style="display:none; margin-top:8px; background:#fff; padding:8px; border-radius:6px;">
          <div style="margin-bottom:8px;">Selecteer speler om toe te voegen aan <strong>${team.name}</strong>:</div>
          <div class="unassigned-list" id="unassigned-list-${team.id}">Laden…</div>
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

    // Skip loading players for temporary team IDs (not yet saved to database)
    if (String(teamId).startsWith('temp_')) {
      listEl.innerHTML = '<p style="color:#888; font-size:0.85em;">Team nog niet opgeslagen. Spelers worden geladen na opslaan.</p>';
      return;
    }

    try {
      listEl.innerHTML = '<p style="color:#666">Laden…</p>';
      const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
      let players = resp && resp.players ? resp.players : [];
      // Sort players alphabetically by name
      players.sort((a, b) => (a.name || a.player_name || '').localeCompare(b.name || b.player_name || ''));
      // players now have id, name, position directly
      if (!players || players.length === 0) {
        listEl.innerHTML = '<p style="color:#666">Nog geen spelers toegevoegd.</p>';
        return;
      }
      listEl.innerHTML = '';
      // build taken positions map
      const taken = new Set();
      players.forEach((p) => {
        if (p.position) taken.add(String(p.position));
      });
      players.forEach((p) => {
        const el = document.createElement('div');
        el.className = 'player-row';
        // left: name (and optional position)
        const left = document.createElement('div');
        left.className = 'player-left';
        left.innerHTML = `<span class="player-name">${this.escapeHtml(p.name || p.player_name)}</span>` + (p.position ? ` <span class="player-pos">${this.escapeHtml(p.position)}</span>` : '');
        // right: unassign button (styled like team delete)
        const right = document.createElement('div');
        right.className = 'player-actions';
        const unassignBtn = document.createElement('button');
        unassignBtn.className = 'delete-team-btn';
        unassignBtn.textContent = 'Verwijderen';
        unassignBtn.title = 'Verwijder toewijzing';
        unassignBtn.onclick = () => this.removePlayerFromTeam(this.sessionId, teamId, p.id);
        right.appendChild(unassignBtn);
        el.appendChild(left);
        el.appendChild(right);
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
          // Sort players alphabetically by name
          players2.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          if (!players2 || players2.length === 0) {
            listEl.innerHTML = '<p style="color:#666">Nog geen spelers toegevoegd.</p>';
            return;
          }
          listEl.innerHTML = '';
          // build taken positions
          const taken2 = new Set();
          players2.forEach((p) => {
            if (p.position) taken2.add(String(p.position));
          });
          players2.forEach((p) => {
            const el = document.createElement('div');
            el.className = 'player-row';
            const left = document.createElement('div');
            left.className = 'player-left';
            left.innerHTML = `<span class="player-name">${this.escapeHtml(p.name)}</span>` + (p.position ? ` <span class="player-pos">${this.escapeHtml(p.position)}</span>` : '');
            const right = document.createElement('div');
            right.className = 'player-actions';
            const unassignBtn = document.createElement('button');
            unassignBtn.className = 'delete-team-btn';
            unassignBtn.textContent = 'Verwijderen';
            unassignBtn.onclick = () => this.deletePlayerInline(p.id, teamId);
            right.appendChild(unassignBtn);
            el.appendChild(left);
            el.appendChild(right);
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

  // populatePositionSelect removed: positions are now assigned alphabetically on create

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

    setTimeout(() => toast.remove(), 4000);
  }

  async addPlayerInline(teamId) {
    const nameEl = document.getElementById(`new-player-name-${teamId}`);
    if (!nameEl) return;
    const name = (nameEl.value || '').trim();
    if (!name) {
      alert('Voer een spelersnaam in.');
      nameEl.focus();
      return;
    }
    try {
      const payload = { name: name, team_id: Number(teamId) };
      await api.postSilent(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`, payload);
      nameEl.value = '';
      await this.loadPlayersForTeam(teamId);
      await this.loadPlayers();
    } catch (err) {
      // If the session-scoped players endpoint is not available (405), fallback to global players endpoint
      const msg = err && err.message ? err.message : '';
      const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
      if (status405) {
        try {
          const payload = { name: name, team_id: Number(teamId) };
          await api.postSilent('/api/v1/players', payload);
          nameEl.value = '';
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

  // --- Player manager and session assignment helpers ---

  async loadPlayers() {
    // Load global players and session-specific assignments
    try {
      const allResp = await api.get('/api/v1/players');
      const sessionResp = await api.get(`/api/v1/sessions/${this.sessionId}/players`);
      this.allPlayers = allResp && allResp.players ? allResp.players : [];
      // Sort players alphabetically by name
      this.allPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      this.sessionAssignments = sessionResp && sessionResp.players ? sessionResp.players : [];
      // Build quick map of assigned players
      this.assignedMap = {};
      this.sessionAssignments.forEach((a) => {
        // some endpoints return {player, team_id} or player objects with session_team
        if (a.player_id && a.team_id) {
          this.assignedMap[a.player_id] = a.team_id;
        } else if (a.id && a.team_id) {
          this.assignedMap[a.id] = a.team_id;
        } else if (a.player && a.team_id) {
          this.assignedMap[a.player.id] = a.team_id;
        }
      });
      this.updatePlayerManagerDisplay();
      this.updateDefaultTeamSelects();
      // Also populate any visible unassigned lists for teams
      this.updateUnassignedLists();
    } catch (err) {
      console.warn('Could not load players or session assignments', err);
      // Try partial fallback: load global players only
      try {
        const allResp = await api.get('/api/v1/players');
        this.allPlayers = allResp && allResp.players ? allResp.players : [];
        // Sort players alphabetically by name
        this.allPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        this.sessionAssignments = [];
        this.assignedMap = {};
        this.updatePlayerManagerDisplay();
        this.updateDefaultTeamSelects();
      } catch (err2) {
        console.warn('Fallback players load failed', err2);
        if (this.playersListGlobal) this.playersListGlobal.innerHTML = '<p style="color:#666">Kon spelers niet laden.</p>';
      }
    }
  }

  async loadActivities() {
    try {
      const resp = await api.getSessionActivities(this.sessionId);
      this.activities = resp.activities || [];
      this.updateActivitiesDisplay();
    } catch (err) {
      console.warn('Could not load activities', err);
      if (this.activitiesList) this.activitiesList.innerHTML = '<p style="color:#666">Kon activiteiten niet laden.</p>';
    }
  }

  updateDefaultTeamSelects() {
    // Populate the default team select in player creation form
    if (!this.newPlayerDefaultTeam) return;
    this.newPlayerDefaultTeam.innerHTML = '<option value="">-- Standaard team (optioneel) --</option>';
    const empty = document.createElement('option');
    this.teams.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${this.getIconEmoji(t.icon)} ${t.name}`;
      this.newPlayerDefaultTeam.appendChild(opt);
    });
  }

  updatePlayerManagerDisplay() {
    if (!this.playersListGlobal) return;
    if (!this.allPlayers || this.allPlayers.length === 0) {
      this.playersListGlobal.innerHTML = '<p class="no-players">Nog geen spelers aanwezig. Maak er één aan hierboven.</p>';
      return;
    }
    this.playersListGlobal.innerHTML = '';
    const ul = document.createElement('div');
    ul.style.display = 'flex';
    ul.style.flexDirection = 'column';
    ul.style.gap = '12px';

    this.allPlayers.forEach((p) => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';
      playerCard.style.padding = '12px';
      playerCard.style.borderRadius = '8px';

      const nameRow = document.createElement('div');
      nameRow.style.marginBottom = '8px';
      nameRow.innerHTML = `<strong>${this.escapeHtml(p.name)}</strong> ${p.position ? '<span class="position-text">(' + this.escapeHtml(p.position) + ')</span>' : ''}`;
      playerCard.appendChild(nameRow);

      const assignedTeamId = this.assignedMap[p.id];

      // First row: Team assignment
      const assignRow = document.createElement('div');
      assignRow.style.display = 'flex';
      assignRow.style.gap = '8px';
      assignRow.style.alignItems = 'center';
      assignRow.style.marginBottom = '8px';

      if (assignedTeamId) {
        const teamObj = this.teams.find((t) => t.id === assignedTeamId);
        const assignedLabel = document.createElement('span');
        assignedLabel.className = 'assigned-label';
        assignedLabel.style.flex = '1';
        assignedLabel.style.fontWeight = '500';
        assignedLabel.innerHTML = teamObj ? `✓ Toegewezen aan: <strong>${teamObj.name}</strong>` : `✓ Toegewezen (team ${assignedTeamId})`;
        assignRow.appendChild(assignedLabel);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'delete-btn';
        removeBtn.style.padding = '6px 12px';
        removeBtn.style.fontSize = '0.85em';
        removeBtn.textContent = 'Verwijder toewijzing';
        removeBtn.onclick = () => this.removePlayerFromSession(this.sessionId, p.id);
        assignRow.appendChild(removeBtn);
      } else {
        // Show quick assign menu: select with teams
        const sel = document.createElement('select');
        sel.className = 'team-assign-select';
        sel.style.flex = '1';
        sel.style.padding = '8px';
        sel.style.borderRadius = '6px';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- Toewijzen aan team --';
        sel.appendChild(defaultOpt);
        this.teams.forEach((t) => {
          const o = document.createElement('option');
          o.value = t.id;
          o.textContent = `${this.getIconEmoji(t.icon)} ${t.name}`;
          sel.appendChild(o);
        });
        const assignBtn = document.createElement('button');
        assignBtn.className = 'save-team-btn';
        assignBtn.style.padding = '8px 16px';
        assignBtn.style.fontSize = '0.9em';
        assignBtn.textContent = 'Toewijzen';
        assignBtn.onclick = async () => {
          const teamId = sel.value;
          if (!teamId) return alert('Selecteer eerst een team.');
          await this.assignPlayerToTeam(this.sessionId, teamId, p.id);
        };
        assignRow.appendChild(sel);
        assignRow.appendChild(assignBtn);
      }
      playerCard.appendChild(assignRow);

      // Second row: Edit and Delete buttons
      const actionRow = document.createElement('div');
      actionRow.style.display = 'flex';
      actionRow.style.gap = '8px';
      actionRow.style.justifyContent = 'flex-end';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.style.padding = '6px 16px';
      editBtn.style.fontSize = '0.9em';
      editBtn.textContent = 'BEWERK';
      editBtn.onclick = () => this.promptEditPlayer(p);
      actionRow.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.style.padding = '6px 16px';
      deleteBtn.style.fontSize = '0.9em';
      deleteBtn.textContent = 'VERWIJDEREN';
      deleteBtn.onclick = () => this.deletePlayerConfirm(p.id);
      actionRow.appendChild(deleteBtn);

      playerCard.appendChild(actionRow);
      ul.appendChild(playerCard);
    });
    this.playersListGlobal.appendChild(ul);
  }

  async createPlayerGlobal() {
    const name = ((this.newPlayerNameGlobal && this.newPlayerNameGlobal.value) || '').trim();
    const defaultTeam = this.newPlayerDefaultTeam ? this.newPlayerDefaultTeam.value : '';
    if (!name) {
      alert('Voer een spelersnaam in.');
      return;
    }
    try {
      const payload = { name };
      if (defaultTeam) payload.team_id = parseInt(defaultTeam);
      await api.post('/api/v1/players', payload);
      if (this.newPlayerNameGlobal) this.newPlayerNameGlobal.value = '';
      if (this.newPlayerDefaultTeam) this.newPlayerDefaultTeam.value = '';
      // Reindex positions alphabetically after creating a new player
      await this.reindexPlayersAlphabetically();
      await this.loadPlayers();
      // also refresh teams listing in case assigned via default team
      await this.loadTeams();
    } catch (err) {
      api.handleError(err, 'creating player');
      alert('Fout bij het aanmaken van speler.');
    }
  }

  async deletePlayerConfirm(playerId) {
    if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;
    try {
      await api.delete(`/api/v1/players/${playerId}`);
      await this.loadPlayers();
      await this.loadTeams();
    } catch (err) {
      api.handleError(err, 'deleting player');
      alert('Fout bij het verwijderen van speler.');
    }
  }

  promptEditPlayer(p) {
    const newName = prompt('Nieuwe naam voor speler:', p.name);
    if (newName === null) return; // cancelled
    this.editPlayer(p.id, newName.trim());
  }

  async editPlayer(playerId, name, position) {
    try {
      const payload = {};
      if (name) payload.name = name;
      if (position !== undefined) payload.position = position;
      await api.put(`/api/v1/players/${playerId}`, payload);
      await this.loadPlayers();
      await this.loadTeams();
    } catch (err) {
      api.handleError(err, 'updating player');
      alert('Fout bij het bijwerken van speler.');
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
      await this.loadPlayers();
      await this.loadTeams();
    } catch (e) {
      console.warn('Reindexing players failed', e);
    }
  }

  async assignPlayerToTeam(sessionId, teamId, playerId) {
    try {
      await api.post(`/api/v1/sessions/${sessionId}/assign-player`, { player_id: parseInt(playerId), team_id: parseInt(teamId) });
      // Do not set or modify positions during assignment; positions are managed separately in team beheer
      await this.loadPlayers();
      await this.loadPlayersForTeam(teamId);
      await this.loadAvailableTeams();
    } catch (err) {
      api.handleError(err, 'assigning player');
      alert('Fout bij het toewijzen van speler aan team.');
    }
  }

  async removePlayerFromTeam(sessionId, teamId, playerId) {
    if (!confirm('Verwijder speler uit dit team?')) return;
    try {
      await api.delete(`/api/v1/sessions/${sessionId}/teams/${teamId}/players/${playerId}`);
      await this.loadPlayers();
      // refresh team lists
      await this.loadPlayersForTeam(teamId);
    } catch (err) {
      api.handleError(err, 'removing player from team');
      alert('Fout bij het verwijderen van speler uit team.');
    }
  }

  async removePlayerFromSession(sessionId, playerId) {
    if (!confirm('Verwijder speler uit deze sessie?')) return;
    try {
      await api.delete(`/api/v1/sessions/${sessionId}/assign-player/${playerId}`);
      await this.loadPlayers();
      // refresh all team lists
      this.teams.forEach(async (t) => await this.loadPlayersForTeam(t.id));
    } catch (err) {
      api.handleError(err, 'removing player from session');
      alert('Fout bij het verwijderen van speler uit sessie.');
    }
  }

  toggleUnassignedPlayers(teamId) {
    const el = document.getElementById(`unassigned-players-${teamId}`);
    if (!el) return;
    if (el.style.display === 'none' || el.style.display === '') {
      el.style.display = 'block';
      this.updateUnassignedListForTeam(teamId);
    } else {
      el.style.display = 'none';
    }
  }

  updateUnassignedLists() {
    this.teams.forEach((t) => this.updateUnassignedListForTeam(t.id));
  }

  updateUnassignedListForTeam(teamId) {
    const container = document.getElementById(`unassigned-list-${teamId}`);
    if (!container) return;
    // Determine which players are not assigned to any team in this session
    const unassigned = (this.allPlayers || []).filter((p) => !this.assignedMap || !this.assignedMap[p.id]);
    if (!unassigned || unassigned.length === 0) {
      container.innerHTML = '<p style="color:#666">Geen onbezet spelers beschikbaar.</p>';
      return;
    }
    container.innerHTML = '';
    unassigned.forEach((p) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.marginBottom = '6px';
      const left = document.createElement('div');
      left.textContent = p.name + (p.position ? ` (${p.position})` : '');
      const btn = document.createElement('button');
      btn.className = 'save-team-btn compact';
      btn.textContent = 'Voeg toe';
      btn.onclick = async () => {
        await this.assignPlayerToTeam(this.sessionId, teamId, p.id);
        this.toggleUnassignedPlayers(teamId);
      };
      row.appendChild(left);
      row.appendChild(btn);
      container.appendChild(row);
    });
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
        if (data && Number(data.session_id) === Number(this.sessionId) && (data.action === 'created' || data.team) && data.team && data.team.name && data.team.name.toLowerCase() === teamName.toLowerCase()) {
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

      // Show success message
      this.showSuccessMessage(`Team "${teamName}" is toegevoegd!`);

      // Clear form
      this.teamNameInput.value = '';
      this.teamNameInput.focus();
    } catch (error) {
      // If the API call failed, try realtime ack or polling before surfacing an error
      const acknowledged = await ackPromise;
      if (acknowledged || (await this.waitForTeamPresence(teamName, 5000, 500))) {
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

  async addActivity() {
    const activityName = this.newActivityName.value.trim();
    const sport = this.activitySport.value;
    if (!activityName) {
      alert('Voer een activiteit naam in.');
      this.newActivityName.focus();
      return;
    }
    if (!sport) {
      alert('Kies een sport/stijl.');
      this.activitySport.focus();
      return;
    }

    try {
      const activityData = {
        name: activityName,
        sport: sport,
      };
      await api.createSessionActivity(this.sessionId, activityData);
      this.showSuccessMessage(`Activiteit "${activityName}" is toegevoegd!`);
      this.newActivityName.value = '';
      this.activitySport.value = '';
      this.newActivityName.focus();
      await this.loadActivities();
    } catch (error) {
      api.handleError(error, 'adding activity');
      alert('Fout bij het toevoegen van de activiteit.');
    }
  }

  // Poll helper to check if a team with a given name appears server-side
  async waitForTeamPresence(teamName, timeoutMs = 5000, intervalMs = 500) {
    const end = Date.now() + timeoutMs;
    const normalized = teamName.toLowerCase();
    while (Date.now() < end) {
      try {
        const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
        const exists = response && response.teams && response.teams.some((t) => (t.name || '').toLowerCase() === normalized);
        if (exists) return true;
      } catch (e) {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  async loadAvailableTeams() {
    try {
      const response = await api.get('/api/v1/standalone-teams');
      if (response && response.teams) {
        // Filter out teams already in this session
        const currentTeamIds = this.teams.map((t) => t.id);
        this.availableTeams = response.teams.filter((t) => !currentTeamIds.includes(t.id));
        this.updateAvailableTeamsSelect();
      }
    } catch (error) {
      console.warn('Could not load available teams:', error);
      // Endpoint might not exist yet, just continue without existing teams feature
    }
  }

  updateAvailableTeamsSelect() {
    if (!this.existingTeamSelect) return;

    // Clear and rebuild options
    this.existingTeamSelect.innerHTML = '<option value="">-- Selecteer een bestaand team --</option>';

    // Filter out teams already in session
    const currentTeamIds = this.teams.map((t) => t.id);
    const available = this.availableTeams.filter((t) => !currentTeamIds.includes(t.id));

    available.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = `${this.getIconEmoji(team.icon)} ${team.name}`;
      option.style.color = team.color;
      this.existingTeamSelect.appendChild(option);
    });

    // Disable button if no teams available
    if (this.addExistingTeamBtn) {
      this.addExistingTeamBtn.disabled = available.length === 0;
    }
  }

  async addExistingTeam() {
    const teamId = this.existingTeamSelect.value;
    if (!teamId) {
      alert('Selecteer eerst een team.');
      return;
    }

    try {
      const response = await api.post(`/api/v1/sessions/${this.sessionId}/add-team`, {
        team_id: parseInt(teamId),
      });

      if (response && response.team) {
        // Reload teams to show the added team
        await this.loadTeams();
        await this.loadAvailableTeams();

        // Reset selection
        this.existingTeamSelect.value = '';
      }
    } catch (error) {
      api.handleError(error, 'adding existing team');
      alert('Fout bij het toevoegen van bestaand team.');
    }
  }

  async deleteTeam(teamId) {
    if (!confirm('Weet je zeker dat je dit team wilt verwijderen uit deze sessie?')) {
      return;
    }

    try {
      // Use the new endpoint to remove from session (doesn't delete the team itself)
      await api.delete(`/api/v1/sessions/${this.sessionId}/remove-team/${teamId}`);

      // Remove from local teams array
      this.teams = this.teams.filter((t) => t.id !== teamId);
      this.updateTeamsDisplay();
      this.updateTeamsCount();

      // Update available teams
      await this.loadAvailableTeams();
    } catch (error) {
      api.handleError(error, 'removing team');
      alert('Fout bij het verwijderen van het team.');
    }
  }

  async deleteActivity(activityId) {
    if (!confirm('Weet je zeker dat je deze activiteit wilt verwijderen?')) {
      return;
    }

    try {
      await api.deleteActivity(activityId);
      this.activities = this.activities.filter((a) => a.id !== activityId);
      this.updateActivitiesDisplay();
    } catch (error) {
      api.handleError(error, 'deleting activity');
      alert('Fout bij het verwijderen van de activiteit.');
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
    const confirmMessage = `⚠️ WAARSCHUWING: Sessie Verwijderen\n\nSessie: ${this.session.name}\nAantal teams: ${this.teams.length}\nStatus: ${this.getStatusText(this.session.status)}\n\nDeze actie kan NIET ongedaan worden gemaakt!\nAlle scores en gegevens gaan verloren.\n\nWeet je zeker dat je wilt doorgaan?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for extra safety
    const doubleConfirm = confirm('Laatste bevestiging: Weet je het ABSOLUUT zeker?');
    if (!doubleConfirm) {
      return;
    }

    try {
      await api.delete(`/api/v1/sessions/${this.sessionId}`);
      alert('Sessie succesvol verwijderd.');
      window.location.href = 'index.html';
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

  async updateScoringMode() {
    let selectedMode = 'team';
    if (this.scoringModePlayer && this.scoringModePlayer.checked) selectedMode = 'player';
    else if (this.scoringModeTeamPlayers && this.scoringModeTeamPlayers.checked) selectedMode = 'team_with_players';

    // Check if session is already active - warn user
    if (this.session && this.session.status !== 'setup') {
      const confirmChange = confirm('⚠️ Waarschuwing: De sessie is al gestart!\n\n' + 'Het wijzigen van de score modus tijdens een actieve sessie kan leiden tot inconsistenties.\n\n' + 'Weet je zeker dat je wilt doorgaan?');

      if (!confirmChange) {
        // Revert radio button
        if (this.session.scoring_mode === 'player') {
          if (this.scoringModePlayer) this.scoringModePlayer.checked = true;
        } else if (this.session.scoring_mode === 'team_with_players') {
          if (this.scoringModeTeamPlayers) this.scoringModeTeamPlayers.checked = true;
        } else {
          if (this.scoringModeTeam) this.scoringModeTeam.checked = true;
        }
        return;
      }
    }

    // Only update if mode actually changed
    if (this.session && this.session.scoring_mode !== selectedMode) {
      try {
        const updateData = {
          scoring_mode: selectedMode,
        };

        await api.put(`/api/v1/sessions/${this.sessionId}`, updateData);

        // Update local session object
        this.session.scoring_mode = selectedMode;

        // Update display
        this.updateSessionDisplay();

        // Show/hide player mode hint
        if (this.playerModeHint) {
          this.playerModeHint.style.display = selectedMode === 'player' ? 'block' : 'none';
        }

        // Show feedback
        let modeText, emoji;
        if (selectedMode === 'player') {
          modeText = 'Speler Scores';
          emoji = '👤';
        } else if (selectedMode === 'team_with_players') {
          modeText = 'Team Scores met Spelers';
          emoji = '👥👤';
        } else {
          modeText = 'Team Scores';
          emoji = '👥';
        }
        alert(`${emoji} Score modus gewijzigd naar: ${modeText}\n\n${selectedMode === 'player' ? 'Je kunt nu individuele speler scores bijhouden!' : selectedMode === 'team_with_players' ? 'Scores gaan naar teams, maar spelers zijn zichtbaar op het scorebord.' : 'Scores gaan nu direct naar teams.'}`);
      } catch (error) {
        api.handleError(error, 'updating scoring mode');
        alert('Fout bij het wijzigen van de score modus.');

        // Revert radio button to previous state
        if (this.session.scoring_mode === 'player') {
          if (this.scoringModePlayer) this.scoringModePlayer.checked = true;
        } else if (this.session.scoring_mode === 'team_with_players') {
          if (this.scoringModeTeamPlayers) this.scoringModeTeamPlayers.checked = true;
        } else {
          if (this.scoringModeTeam) this.scoringModeTeam.checked = true;
        }
      }
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
