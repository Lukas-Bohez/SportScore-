// Simple Setup JavaScript
class SimpleSetup {
  constructor() {
    this.currentStep = 1;
    this.sessionData = {};
    this.teams = [];
    this.activities = [];
    this.players = [];
    this.allPlayers = []; // All players from API
    this.apiTeams = []; // Teams from API
    this.assignedMap = new Map(); // Track player assignments
    this.editingTeamIndex = null;
    this.playersLoaded = false;
    this.api = window.api || new ScoreboardAPI();
    this.loadTemplateData();
    this.init();
    window.simpleSetup = this;
  }

  loadTemplateData() {
    const templateData = sessionStorage.getItem('templateData');
    if (templateData) {
      try {
        this.sessionData = JSON.parse(templateData);
        sessionStorage.removeItem('templateData'); // Clear after loading
        this.isFromTemplate = true;
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }

  populateFormFromTemplate() {
    if (this.sessionData.name) {
      this.sessionNameInput.value = this.sessionData.name;
    }
    // Load activities if available (new format)
    if (this.sessionData.activities) {
      this.activities = this.sessionData.activities;
      this.updateActivitiesList();
    } else {
      // Legacy: if no activities, create one from global settings
      if (this.sessionData.sport_type || this.sessionData.scoring_mode) {
        const act = {
          name: 'Hoofdactiviteit',
          sport_type: this.sessionData.sport_type || 'custom',
          scoring_mode: this.sessionData.scoring_mode || 'team',
          game_type: this.sessionData.game_type || 'custom',
          total_rounds: this.sessionData.total_rounds || 1,
          time_limit: this.sessionData.time_limit || null,
          description: null,
        };
        this.activities = [act];
        this.updateActivitiesList();
      }
    }
    // Load teams and players if available
    if (this.sessionData.teams) {
      this.teams = this.sessionData.teams;
      this.updateTeamsList();
    }
    if (this.sessionData.players) {
      this.players = this.sessionData.players;
      this.updatePlayersList();
    }
  }

  init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.bindElements();
        this.populateFormFromTemplate();
        if (this.isFromTemplate) {
          this.autoAdvanceToStep4();
        } else {
          this.showStep();
        }
        this.setupEventListeners();
        this.loadTeamsFromAPI();
      });
    } else {
      this.bindElements();
      this.populateFormFromTemplate();
      if (this.isFromTemplate) {
        this.autoAdvanceToStep4();
      } else {
        this.showStep();
      }
      this.setupEventListeners();
      this.loadTeamsFromAPI().then(() => this.loadAllPlayers());
    }
  }

  bindElements() {
    // Step elements
    this.steps = {};
    for (let i = 1; i <= 5; i++) {
      this.steps[i] = document.getElementById(`step-${i}`);
    }

    // Step 1 inputs
    this.sessionNameInput = document.getElementById('session-name');

    // Team management elements
    // Activities management elements
    this.addActivityBtn = document.getElementById('add-activity-btn');
    this.activityFormContainer = document.getElementById('activity-form-container');
    this.activityForm = document.getElementById('activity-form');
    this.activityNameInput = document.getElementById('activity-name');
    this.activitySportSelect = document.getElementById('activity-sport');
    this.activityScoringSelect = document.getElementById('activity-scoring');
    this.activityGameTypeSelect = document.getElementById('activity-game-type');
    this.activityRoundsInput = document.getElementById('activity-rounds');
    this.activityTimeInput = document.getElementById('activity-time');
    this.activityDescInput = document.getElementById('activity-desc');
    this.cancelActivityBtn = document.getElementById('cancel-activity-btn');
    this.activitiesList = document.getElementById('activities-list');

    // Team management elements
    this.addTeamBtn = document.getElementById('add-team-btn');
    this.teamFormContainer = document.getElementById('team-form-container');
    this.teamForm = document.getElementById('team-form');
    this.teamNameInput = document.getElementById('team-name');
    this.teamColorInput = document.getElementById('team-color');
    this.teamIconSelect = document.getElementById('team-icon');
    this.teamDescriptionInput = document.getElementById('team-description');
    this.cancelTeamBtn = document.getElementById('cancel-team-btn');
    this.teamsList = document.getElementById('teams-list');
    this.teamButtonsContainer = document.getElementById('team-buttons-container');

    // Existing teams selection
    this.existingTeamSelect = document.getElementById('existing-team-select');
    this.addExistingTeamBtn = document.getElementById('add-existing-team-btn');

    // Player management elements
    this.teamForPlayerSelect = document.getElementById('team-for-player');
    this.playerNameInput = document.getElementById('player-name');
    this.playerSearchInput = document.getElementById('player-search');
    this.addPlayerBtn = document.getElementById('add-player');
    this.playersList = document.getElementById('players-list');
    this.playersSection = document.getElementById('players-section');
    this.teamsSectionStep3 = document.getElementById('teams-section-step3');
    this.teamsListStep3 = document.getElementById('teams-list-step3');

    // Review elements
    this.reviewSessionName = document.getElementById('review-session-name');
    this.reviewActivities = document.getElementById('review-activities');
    this.reviewTeams = document.getElementById('review-teams');
    this.reviewPlayers = document.getElementById('review-players');

    // Navigation
    this.nextBtns = {};
    this.prevBtns = {};
    for (let i = 1; i <= 5; i++) {
      this.nextBtns[i] = document.getElementById(`next-${i}`);
      this.prevBtns[i] = document.getElementById(`prev-${i}`);
    }
    this.startScoringBtn = document.getElementById('start-scoring');
    this.saveTemplateBtn = document.getElementById('save-template');
  }

  setupEventListeners() {
    // Navigation
    for (let i = 1; i <= 4; i++) {
      if (this.nextBtns[i]) {
        this.nextBtns[i].addEventListener('click', this.handleNextClick.bind(this));
      }
      if (this.prevBtns[i]) {
        this.prevBtns[i].addEventListener('click', this.handlePrevClick.bind(this));
      }
    }
    if (this.prevBtns[5]) {
      this.prevBtns[5].addEventListener('click', this.handlePrevClick.bind(this));
    }
    if (this.startScoringBtn) {
      this.startScoringBtn.addEventListener('click', this.handleStartClick.bind(this));
    }
    if (this.saveTemplateBtn) {
      this.saveTemplateBtn.addEventListener('click', this.handleSaveTemplateClick.bind(this));
    }

    // Team management
    // Activity management
    if (this.addActivityBtn) {
      this.addActivityBtn.addEventListener('click', this.handleAddActivityClick.bind(this));
    }
    if (this.activityForm) {
      this.activityForm.addEventListener('submit', this.handleActivityFormSubmit.bind(this));
    }
    if (this.cancelActivityBtn) {
      this.cancelActivityBtn.addEventListener('click', this.handleCancelActivity.bind(this));
    }

    // Team management
    if (this.addTeamBtn) {
      this.addTeamBtn.addEventListener('click', this.handleAddTeamClick.bind(this));
    }
    if (this.teamForm) {
      this.teamForm.addEventListener('submit', this.handleTeamFormSubmit.bind(this));
    }
    if (this.cancelTeamBtn) {
      this.cancelTeamBtn.addEventListener('click', this.handleCancelTeam.bind(this));
    }
    if (this.teamColorInput) {
      this.teamColorInput.addEventListener('input', this.handleColorChange.bind(this));
    }

    // Color preview click to open color picker
    const colorPreview = document.getElementById('color-preview');
    if (colorPreview) {
      colorPreview.addEventListener('click', () => {
        if (this.teamColorInput) {
          this.teamColorInput.click();
        }
      });
    }

    // Existing teams selection
    if (this.addExistingTeamBtn) {
      this.addExistingTeamBtn.addEventListener('click', this.handleAddExistingTeam.bind(this));
    }

    // Add player
    if (this.addPlayerBtn) {
      this.addPlayerBtn.addEventListener('click', this.handleAddPlayer.bind(this));
    }

    // Player search
    if (this.playerSearchInput) {
      this.playerSearchInput.addEventListener('input', this.handlePlayerSearch.bind(this));
    }
  }

  handleNextClick(e) {
    e.preventDefault();
    this.nextStep();
  }

  handlePrevClick(e) {
    e.preventDefault();
    this.prevStep();
  }

  handleStartClick(e) {
    e.preventDefault();
    this.createSession();
  }

  handleSaveTemplateClick(e) {
    e.preventDefault();
    this.saveAsTemplate();
  }

  handleAddTeamClick(e) {
    e.preventDefault();
    this.showTeamForm();
  }

  handleTeamFormSubmit(e) {
    e.preventDefault();
    this.addTeam();
  }

  handleCancelTeam(e) {
    e.preventDefault();
    this.hideTeamForm();
  }

  handleAddTeam(e) {
    e.preventDefault();
    this.addTeam();
  }

  handleAddPlayer(e) {
    e.preventDefault();
    this.addPlayer();
  }

  handlePlayerSearch(e) {
    const searchTerm = e.target.value;
    this.updatePlayersList(searchTerm);
  }

  handleAddExistingTeam(e) {
    e.preventDefault();
    this.addExistingTeam();
  }

  handleColorChange(e) {
    const color = e.target.value;
    const preview = document.getElementById('color-preview');
    if (preview) {
      preview.style.backgroundColor = color;
      preview.textContent = color.toUpperCase();
    }
  }

  handleScoringModeChange(e) {
    // Store the selected scoring mode in session data
    this.sessionData.scoring_mode = e.target.value;
  }

  handleGameTypeChange(e) {
    const gameType = e.target.value;
    const timeLimitGroup = this.timeLimitInput.closest('.form-group');
    if (gameType === 'team_vs_time') {
      timeLimitGroup.style.display = 'block';
    } else {
      timeLimitGroup.style.display = 'none';
      this.timeLimitInput.value = '';
    }
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.saveCurrentStepData();
      this.currentStep++;

      this.showStep();
    }
  }

  prevStep() {
    this.currentStep--;

    this.showStep();
  }

  showStep() {
    Object.values(this.steps).forEach((step) => step.classList.remove('active'));
    this.steps[this.currentStep].classList.add('active');
    if (this.currentStep === 2) {
      this.updateActivitiesList();
    }
    if (this.currentStep === 3) {
      this.updateTeamsList(); // Refresh teams list to show/hide player management based on scoring mode
    }
    if (this.currentStep === 4) {
      this.playersSection.style.display = 'block';
      this.updatePlayerSection();
      // Load players if not loaded yet
      if (!this.playersLoaded) {
        this.loadAllPlayers();
      } else {
        this.updatePlayersList();
      }
    }
    if (this.currentStep === 5) {
      this.populateReview();
    }
  }

  validateCurrentStep() {
    // Clear previous error messages
    for (let i = 1; i <= 5; i++) {
      const errorDiv = document.getElementById(`step-${i}-error`);
      if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
      }
    }

    let isValid = true;
    let errorMessage = '';

    switch (this.currentStep) {
      case 1:
        if (this.sessionNameInput.value.trim() === '') {
          errorMessage = 'Voer een sessie naam in.';
          isValid = false;
        }
        break;
      case 2:
        if (this.activities.length === 0) {
          errorMessage = 'Voeg minstens één activiteit toe.';
          isValid = false;
        }
        break;
      case 3:
        if (this.teams.length === 0) {
          errorMessage = 'Voeg minstens één team toe.';
          isValid = false;
        }
        break;
      case 4:
        // Validate players only if any activity needs them
        const hasTeamWithPlayers = this.activities.some(act => act.scoring_mode === 'team_with_players');
        if (hasTeamWithPlayers) {
          const teamsWithoutPlayers = this.teams.filter((team) => {
            return !this.allPlayers.some((player) => player.team_id == team.id);
          });
          if (teamsWithoutPlayers.length > 0) {
            errorMessage = 'Voeg minstens één speler toe aan elk team.';
            isValid = false;
          }
        }
        break;
      default:
        return true;
    }

    if (!isValid) {
      const errorDiv = document.getElementById(`step-${this.currentStep}-error`);
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.classList.add('show');
      }
    }

    return isValid;
  }

  saveCurrentStepData() {
    switch (this.currentStep) {
      case 1:
        this.sessionData.name = this.sessionNameInput.value.trim();
        break;
    }
  }

  // Activity management methods
  handleAddActivityClick(e) {
    e.preventDefault();
    this.showActivityForm();
  }

  handleActivityFormSubmit(e) {
    e.preventDefault();
    this.addActivity();
  }

  handleCancelActivity(e) {
    e.preventDefault();
    this.hideActivityForm();
  }

  showActivityForm(activity = null) {
    this.activityFormContainer.classList.remove('hidden');
    if (activity) {
      this.activityNameInput.value = activity.name;
      this.activitySportSelect.value = activity.sport_type || 'custom';
      this.activityScoringSelect.value = activity.scoring_mode || 'team';
      this.activityGameTypeSelect.value = activity.game_type || 'custom';
      this.activityRoundsInput.value = activity.total_rounds || 1;
      this.activityTimeInput.value = activity.time_limit || '';
      this.activityDescInput.value = activity.description || '';
      this.editingActivityIndex = this.activities.indexOf(activity);
    } else {
      this.activityNameInput.value = '';
      this.activitySportSelect.value = 'custom';
      this.activityScoringSelect.value = 'team';
      this.activityGameTypeSelect.value = 'custom';
      this.activityRoundsInput.value = 1;
      this.activityTimeInput.value = '';
      this.activityDescInput.value = '';
      this.editingActivityIndex = null;
    }
    this.activityNameInput.focus();
  }

  hideActivityForm() {
    this.activityFormContainer.classList.add('hidden');
    if (this.activityForm) this.activityForm.reset();
    this.editingActivityIndex = null;
  }

  addActivity() {
    const name = this.activityNameInput.value.trim();
    const sport = this.activitySportSelect.value;
    const scoring = this.activityScoringSelect.value;
    const gameType = this.activityGameTypeSelect.value;
    const rounds = parseInt(this.activityRoundsInput.value) || 1;
    const time = this.activityTimeInput.value ? parseInt(this.activityTimeInput.value) : null;
    const desc = this.activityDescInput.value.trim();
    if (!name) {
      alert('Voer een activiteit naam in.');
      return;
    }
    const act = {
      name,
      sport_type: sport,
      scoring_mode: scoring,
      game_type: gameType,
      total_rounds: rounds,
      time_limit: time,
      description: desc || null,
    };
    if (this.editingActivityIndex != null) {
      this.activities[this.editingActivityIndex] = act;
    } else {
      this.activities.push(act);
    }
    this.hideActivityForm();
    this.updateActivitiesList();
  }

  editActivity(index) {
    const act = this.activities[index];
    if (act) this.showActivityForm(act);
  }

  deleteActivity(index) {
    if (!confirm(`Activiteit "${this.activities[index].name}" verwijderen?`)) return;
    this.activities.splice(index, 1);
    this.updateActivitiesList();
  }

  updateActivitiesList() {
    if (!this.activitiesList) return;
    if (this.activities.length === 0) {
      this.activitiesList.innerHTML = "<div class=\"empty-state\">Nog geen activiteiten. Voeg je eerste activiteit toe met \"+ Nieuwe Activiteit\".</div>";
      return;
    }
    this.activitiesList.innerHTML = this.activities
      .map((act, index) => {
        return `
        <div class="team-card" data-activity-id="${index + 1}">
          <div class="team-card-header">
            <div class="team-title">
              <span class="team-icon">🎯</span>
              <div class="team-name-wrap">
                <span class="team-name">${this.escapeHtml(act.name)}</span>
                <span class="team-color-hex">${this.escapeHtml(act.sport_type)} • ${this.escapeHtml(act.scoring_mode)} • ${this.escapeHtml(act.game_type)}</span>
              </div>
            </div>
          </div>
          <p class="team-description">${this.escapeHtml(act.description || '')} Rondes: ${act.total_rounds}${act.time_limit ? ' • Tijd: ' + act.time_limit + 'min' : ''}</p>
          <div class="team-actions">
            <button class="delete-team-btn" onclick="simpleSetup.deleteActivity(${index})">Verwijderen</button>
            <button class="save-team-btn compact" onclick="simpleSetup.editActivity(${index})">Bewerken</button>
          </div>
        </div>`;
      })
      .join('');
  }

  showTeamForm(team = null) {
    this.teamFormContainer.classList.remove('hidden');
    if (team) {
      // Edit mode
      this.teamNameInput.value = team.name;
      this.teamColorInput.value = team.color || '#3B82F6';
      this.teamIconSelect.value = team.icon || 'team';
      this.teamDescriptionInput.value = team.description || '';
      this.editingTeamIndex = this.teams.indexOf(team);
    } else {
      // Add mode
      this.teamNameInput.value = '';
      this.teamColorInput.value = '#3B82F6';
      this.teamIconSelect.value = 'team';
      this.teamDescriptionInput.value = '';
      this.editingTeamIndex = null;
    }
    // Update color preview
    this.handleColorChange({ target: { value: this.teamColorInput.value } });
    this.teamNameInput.focus();
  }

  hideTeamForm() {
    this.teamFormContainer.classList.add('hidden');
    this.teamForm.reset();
    this.editingTeamIndex = null;
  }

  async addTeam() {
    const name = this.teamNameInput.value.trim();
    const color = (this.teamColorInput.value || '').trim() || '#3B82F6';
    const icon = this.teamIconSelect.value;
    const description = this.teamDescriptionInput.value.trim();

    if (name) {
      try {
        const apiTeamData = {
          name: name,
          color: color,
          icon: icon,
          description: description || `${name} team.`,
        };

        let apiResult;
        if (this.editingTeamIndex !== null) {
          // Update existing team
          const existingTeam = this.teams[this.editingTeamIndex];
          apiResult = await this.api.updateStandaloneTeam(existingTeam.id, apiTeamData);
        } else {
          // Create new team
          apiResult = await this.api.createStandaloneTeam(apiTeamData);
        }

        const teamData = {
          id: apiResult.team.id,
          name: name,
          color: color,
          icon: this.getIconEmoji(icon),
          description: description || `${name} team.`,
          players: [],
        };

        if (this.editingTeamIndex !== null) {
          // Update existing team
          this.teams[this.editingTeamIndex] = teamData;
        } else {
          // Add new team
          this.teams.push(teamData);
        }

        this.updateTeamsList();
        this.hideTeamForm();
        this.updateTeamSelect();
        this.displayAvailableTeams(); // Refresh available teams
        this.updateExistingTeamsSelect();
      } catch (error) {
        console.error('Error creating/updating team:', error);
        alert('Fout bij aanmaken/bewerken team: ' + error.message);
      }
    }
  }

  getIconEmoji(iconValue) {
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
    return iconMap[iconValue] || '👥';
  }

  updateTeamsList() {
    if (this.teams.length === 0) {
      this.teamsList.innerHTML = '<div class="empty-state">Nog geen teams. Voeg je eerste team toe met "+ Nieuw Team".</div>';
      return;
    }

    const showPlayers = this.currentStep === 3 && this.sessionData.scoringMode !== 'team';

    this.teamsList.innerHTML = this.teams
      .map((team, index) => {
        const teamColor = (team.color || '').trim() || '#3B82F6';
        return `
      <div class="team-card" data-team-id="${index + 1}" style="border-color: ${teamColor};">
        <div class="team-card-header">
          <div class="team-color-badge" style="background-color: ${teamColor} !important;"></div>
          <div class="team-title">
            <span class="team-icon">${team.icon}</span>
            <div class="team-name-wrap">
              <span class="team-name">${team.name}</span>
              <span class="team-color-hex">${teamColor.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <p class="team-description">${team.description}</p>
        <div class="team-actions">
          <button class="delete-team-btn" onclick="simpleSetup.deleteTeam(${index})">
            Verwijderen
          </button>
          <button class="save-team-btn compact" onclick="simpleSetup.editTeam(${index})">
            Bewerken
          </button>
          ${
            showPlayers && this.sessionData.scoringMode === 'team_with_players'
              ? `
          <button class="save-team-btn compact" title="Speler toewijzen aan dit team" onclick="simpleSetup.toggleUnassignedPlayers(${index})">+ Speler</button>
          `
              : ''
          }
        </div>
        ${
          showPlayers
            ? `
        <div class="players-section" id="players-for-${index + 1}">
          <div class="players-list" id="players-list-${index + 1}">
            ${this.getTeamPlayersHtml(index)}
          </div>
          ${
            this.sessionData.scoringMode === 'team_with_players'
              ? `
          <div class="unassigned-players-dropdown" id="unassigned-players-${index + 1}" style="display:none; margin-top:8px; background: var(--card-bg); padding:8px; border-radius:6px;">
            <div style="margin-bottom:8px;">Selecteer speler om toe te voegen aan <strong>${team.name}</strong>:</div>
            <div class="unassigned-list" id="unassigned-list-${index + 1}">Laden...</div>
          </div>
          `
              : ''
          }
        </div>
        `
            : ''
        }
      </div>
    `;
      })
      .join('');
    this.updateTeamSelect();
  }

  updateTeamSelect() {
    if (this.teamForPlayerSelect) {
      this.teamForPlayerSelect.innerHTML = '<option value="">Selecteer team</option>' + this.teams.map((team) => `<option value="${team.id}">${team.icon} ${team.name}</option>`).join('');
    }
  }

  updateTeamsListStep3() {
    const teams = this.teams;
    if (teams.length === 0) {
      this.teamsListStep3.innerHTML = '<p class="info-message" style="text-align: center;">Nog geen teams aangemaakt.</p>';
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
        <button class="delete-team-btn" onclick="simpleSetup.deleteTeam(${team.id}, '${team.name}')">
          🗑️ Verwijderen
        </button>
        <button class="save-team-btn compact" onclick="simpleSetup.toggleUnassignedPlayers(${team.id})">Speler toewijzen</button>
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

    this.teamsListStep3.innerHTML = teamsHtml;
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
            await this.loadAllPlayers(); // Refresh the players list
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
      this.api.handleError(err, 'loading unassigned players');
      container.innerHTML = '<p class="info-message">Kon spelers niet laden.</p>';
    }
  }

  async assignPlayerToTeam(teamId, playerId) {
    try {
      await this.api.put(`/api/v1/players/${playerId}`, { team_id: Number(teamId) });
      // refresh lists
      await this.loadAssignedPlayersForTeam(teamId);
      await this.loadAllPlayers(); // Refresh the players list
      const ul = document.getElementById(`unassigned-players-${teamId}`);
      if (ul) ul.style.display = 'none';
    } catch (err) {
      this.api.handleError(err, 'assigning player to team');
      alert('Fout bij het toewijzen van speler aan team.');
    }
  }

  async deleteTeam(teamId, teamName) {
    if (!confirm(`Weet je zeker dat je team "${teamName}" wilt verwijderen? Dit verwijdert het team uit alle sessies.`)) {
      return;
    }

    try {
      await this.api.deleteStandaloneTeam(teamId);
      this.teams = this.teams.filter((t) => t.id !== teamId);
      this.updateTeamsListStep3();
      alert(`Team "${teamName}" succesvol verwijderd!`);
    } catch (error) {
      this.api.handleError(error, 'deleting team');
      alert('Fout bij het verwijderen van het team. Probeer opnieuw.');
    }
  }

  async loadAllPlayers() {
    try {
      const resp = await this.api.get('/api/v1/players');
      if (Array.isArray(resp)) {
        this.allPlayers = resp;
      } else {
        this.allPlayers = resp.players || [];
      }
      this.playersLoaded = true;
      this.assignedMap.clear();
      this.players.forEach((p) => {
        if (p.id) this.assignedMap.set(p.id, true);
      });
      if (this.currentStep === 3) {
        this.updatePlayersList();
      }
    } catch (error) {
      console.error('Error loading players:', error);
      this.api.handleError(error, 'loading players');
      alert('Fout bij het laden van spelers: ' + error.message);
    }
  }

  updatePlayersList(searchTerm = '') {
    if (!this.allPlayers || this.allPlayers.length === 0) {
      this.playersList.innerHTML = '<p class="info-message">Geen spelers gevonden.</p>';
      return;
    }

    // Categorize players
    const sessionPlayers = [];
    const unassignedPlayers = [];
    const otherTeamsPlayers = [];

    this.allPlayers.forEach((player) => {
      if (player.team_id) {
        otherTeamsPlayers.push(player);
      } else {
        unassignedPlayers.push(player);
      }
    });

    // Filter by search term
    const filterPlayers = (players) => {
      if (!searchTerm) return players;
      return players.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    const filteredUnassigned = filterPlayers(unassignedPlayers);
    const filteredOtherTeams = filterPlayers(otherTeamsPlayers);

    let html = '';

    // Unassigned players section
    if (filteredUnassigned.length > 0) {
      html += '<h4>Niet toegewezen spelers</h4>';
      html += '<div class="player-section">';
      filteredUnassigned.forEach((player) => {
        html += `
          <div class="player-item">
            <span>${this.escapeHtml(player.name)}</span>
            <div class="player-assign-buttons">
              <select class="team-select" onchange="simpleSetup.assignPlayerToTeamFromList(${player.id}, this.value)">
                <option value="">-- Selecteer team --</option>
                ${this.teams.map((team) => `<option value="${team.id}">${team.name}</option>`).join('')}
              </select>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Players in other teams section
    if (filteredOtherTeams.length > 0) {
      html += '<h4>Spelers in teams</h4>';
      const groupedByTeam = {};
      filteredOtherTeams.forEach((player) => {
        const teamId = player.team_id;
        if (!groupedByTeam[teamId]) groupedByTeam[teamId] = [];
        groupedByTeam[teamId].push(player);
      });

      const sessionTeamIds = new Set(this.teams.map((t) => String(t.id)));
      const sessionTeams = [];
      const nonSessionTeams = [];
      Object.keys(groupedByTeam).forEach((teamId) => {
        if (sessionTeamIds.has(teamId)) {
          sessionTeams.push(teamId);
        } else {
          nonSessionTeams.push(teamId);
        }
      });

      // Process session teams first
      [...sessionTeams, ...nonSessionTeams].forEach((teamId) => {
        const team = this.apiTeams.find((t) => String(t.id) === String(teamId)) || this.teams.find((t) => String(t.id) === String(teamId));
        const teamName = team ? team.name : `Team ${teamId}`;
        html += `<h5><span style="color: ${team ? team.color : '#3B82F6'};">●</span> ${this.escapeHtml(teamName)}</h5>`;
        html += '<div class="player-section">';
        groupedByTeam[teamId].forEach((player) => {
          html += `
            <div class="player-item">
              <span>${this.escapeHtml(player.name)}</span>
              <button class="delete-team-btn compact" style="max-width: 120px;" onclick="simpleSetup.assignPlayerToTeamFromList(${player.id}, null)">Verwijder uit team</button>
            </div>
          `;
        });
        html += '</div>';
      });
    }

    if (html === '') {
      html = '<p class="info-message">Geen spelers gevonden voor de zoekterm.</p>';
    }

    this.playersList.innerHTML = html;
  }

  async assignPlayerToTeamFromList(playerId, teamId) {
    try {
      await this.api.put(`/api/v1/players/${playerId}`, { team_id: teamId });
      await this.loadAllPlayers(); // Refresh all players
    } catch (error) {
      console.error('Error assigning player:', error);
      alert('Fout bij het toewijzen van speler.');
    }
  }

  getTeamPlayersHtml(teamIndex) {
    const teamPlayers = this.players.filter((player) => player.teamIndex === teamIndex);
    if (teamPlayers.length === 0) {
      return this.sessionData.scoringMode === 'team_with_players' ? '<em>Geen spelers toegewezen - klik op "+ Speler" om toe te voegen</em>' : '<em>Geen spelers toegewezen</em>';
    }
    return teamPlayers
      .map(
        (player, playerIndex) => `
      <div class="player-row">
        <div class="player-left"><strong>${this.escapeHtml(player.name)}</strong></div>
        <div class="player-actions">
          <button class="delete-team-btn" onclick="simpleSetup.removePlayerFromTeam(${this.players.indexOf(player)}, 'step3')">Verwijderen</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  removePlayerFromTeam(playerIndex, prefix = '') {
    const player = this.players[playerIndex];
    if (!player) return;

    if (confirm(`Weet je zeker dat je ${player.name} wilt verwijderen uit dit team?`)) {
      // Remove from assigned map if it was an API player
      if (player.id) {
        this.assignedMap.delete(player.id);
      }

      // Remove from local players list
      this.players.splice(playerIndex, 1);

      // Update displays
      this.updatePlayersList();
      if (prefix === 'step3') {
        this.updateTeamsListStep3();
      } else {
        this.updateTeamsList();
      }
    }
  }

  editTeam(index) {
    const team = this.teams[index];
    if (team) {
      this.showTeamForm(team);
    }
  }

  deleteTeam(index) {
    if (confirm(`Weet je zeker dat je "${this.teams[index].name}" wilt verwijderen?`)) {
      // Remove all players from this team
      this.players = this.players.filter((player) => player.teamIndex !== index);
      // Update team indices for remaining players
      this.players.forEach((player) => {
        if (player.teamIndex > index) {
          player.teamIndex--;
        }
      });
      this.teams.splice(index, 1);
      this.updateTeamsList();
      this.updateTeamSelect();
    }
  }

  async loadTeamsFromAPI() {
    try {
      const response = await this.api.getAllStandaloneTeams();
      const teams = response.teams || response || [];

      // Map API teams to internal format
      this.apiTeams = teams.map((team) => ({
        id: team.id,
        name: team.name,
        color: team.color || '#3B82F6',
        icon: team.icon || 'team',
        description: team.description || '',
        players: team.players || [],
      }));

      // Do not auto-load teams - let user choose which ones to add
      // if (this.teams.length === 0 && this.apiTeams.length > 0) {
      //   // Load first 3 teams automatically, or fewer if there are less
      //   const teamsToLoad = Math.min(3, this.apiTeams.length);
      //   for (let i = 0; i < teamsToLoad; i++) {
      //     this.addTeamFromAPI(this.apiTeams[i]);
      //   }
      // }

      this.displayAvailableTeams();
      this.updateExistingTeamsSelect();
    } catch (error) {
      console.error('Error loading teams:', error);
      // Continue without API teams
      this.apiTeams = [];
    }
  }

  displayAvailableTeams() {
    if (!this.teamButtonsContainer || this.apiTeams.length === 0) {
      return;
    }

    let html = '<div class="api-teams-section"><p>Beschikbare teams:</p><div class="team-buttons-grid">';

    this.apiTeams.forEach((apiTeam) => {
      const color = (apiTeam.color || '').trim() || '#3B82F6';
      const isAdded = this.teams.some((t) => String(t.id) === String(apiTeam.id));
      html += `
        <button type="button" class="team-select-button ${isAdded ? 'added' : ''}" 
                onclick="simpleSetup.addTeamFromAPI('${apiTeam.id}')"
                style="border-color: ${color};" ${isAdded ? 'disabled' : ''}>
          <span>${this.getIconEmoji(apiTeam.icon)}</span> ${apiTeam.name}
        </button>
      `;
    });

    html += '</div></div>';
    this.teamButtonsContainer.innerHTML = html;
  }

  updateExistingTeamsSelect() {
    if (!this.existingTeamSelect) return;

    // Clear and rebuild options
    this.existingTeamSelect.innerHTML = '<option value="">-- Selecteer een bestaand team --</option>';

    // Filter out teams already in session
    const currentTeamIds = this.teams.map((t) => String(t.id));
    const available = this.apiTeams.filter((t) => !currentTeamIds.includes(String(t.id)));

    available.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = `${this.getIconEmoji(team.icon)} ${team.name}`;
      this.existingTeamSelect.appendChild(option);
    });

    // Disable button if no teams available
    if (this.addExistingTeamBtn) {
      this.addExistingTeamBtn.disabled = available.length === 0;
    }
  }

  addTeamFromAPI(apiTeam) {
    if (typeof apiTeam === 'string') {
      apiTeam = this.apiTeams.find((t) => String(t.id) === String(apiTeam));
      if (!apiTeam) {
        alert('Team niet gevonden.');
        return;
      }
    }

    // Check if team already added
    if (this.teams.some((t) => String(t.id) === String(apiTeam.id))) {
      alert(`${apiTeam.name} is al toegevoegd aan deze sessie`);
      return;
    }

    // Add team with API id
    const team = {
      id: apiTeam.id,
      name: apiTeam.name,
      color: (apiTeam.color || '').trim() || '#3B82F6',
      icon: this.getIconEmoji(apiTeam.icon),
      description: apiTeam.description || '',
      players: apiTeam.players ? [...apiTeam.players] : [],
    };

    this.teams.push(team);

    // Add existing players to the players list
    const teamIndex = this.teams.length - 1;
    if (team.players && team.players.length > 0) {
      team.players.forEach((player) => {
        this.players.push({
          id: player.id,
          name: player.name,
          teamIndex: teamIndex,
        });
        this.assignedMap.set(player.id, true);
      });
    }

    this.updateTeamsList();
    this.updatePlayersList(); // Update to show the new players
    this.updateTeamSelect();
    this.displayAvailableTeams();
    this.updateExistingTeamsSelect();
  }

  addExistingTeam() {
    const teamId = this.existingTeamSelect.value;
    if (!teamId) {
      alert('Selecteer eerst een team om toe te voegen.');
      return;
    }

    const apiTeam = this.apiTeams.find((t) => String(t.id) === String(teamId));
    if (!apiTeam) {
      alert('Geselecteerd team niet gevonden.');
      return;
    }

    this.addTeamFromAPI(apiTeam);
    this.existingTeamSelect.value = ''; // Reset selection
  }

  updateTeamSelect() {
    this.teamForPlayerSelect.innerHTML = this.teams.map((team, index) => `<option value="${index}">${team.icon} ${team.name}</option>`).join('');
  }

  async addPlayer() {
    const name = this.playerNameInput.value.trim();
    const teamIndex = this.teamForPlayerSelect.value;
    if (!name) return;

    try {
      // Create player via API
      const playerData = { name };
      if (this.sessionData.scoringMode !== 'player' && teamIndex !== '') {
        // For team modes, assign to team if selected
        const team = this.teams.find((t) => String(t.id) === String(teamIndex));
        if (!team) {
          alert('Geselecteerd team niet gevonden.');
          return;
        }
        playerData.team_id = team.id;
      }

      const response = await this.api.createPlayer(playerData);
      const newPlayer = response.player || response;

      // Add to allPlayers
      this.allPlayers.push(newPlayer);

      // Add to session players
      const playerForSession = {
        id: newPlayer.id,
        name: newPlayer.name,
        teamIndex: this.sessionData.scoringMode === 'player' ? null : teamIndex !== '' ? parseInt(teamIndex) : null,
      };
      this.players.push(playerForSession);

      // Mark as assigned if has team
      if (newPlayer.team_id) {
        this.assignedMap.set(newPlayer.id, true);
      }

      this.updatePlayersList();
      this.playerNameInput.value = '';
    } catch (error) {
      console.error('Error creating player:', error);
      alert('Fout bij het toevoegen van speler. Probeer opnieuw.');
    }
  }

  removePlayer(index) {
    this.players.splice(index, 1);
    this.updatePlayersList();
  }

  addPlayerToSession(playerId) {
    const player = this.allPlayers.find((p) => p.id === playerId);
    if (!player) return;

    // Check if already in session
    if (this.players.find((p) => p.id === playerId)) return;

    // Add to session players
    this.players.push({
      id: player.id,
      name: player.name,
      teamIndex: null,
    });

    this.updatePlayersList();
  }

  removePlayerFromSession(playerId) {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      this.updatePlayersList();
    }
  }

  toggleUnassignedPlayers(teamIndex, prefix = '') {
    const suffix = prefix ? `-${prefix}-${teamIndex + 1}` : `-${teamIndex + 1}`;
    const el = document.getElementById(`unassigned-players${suffix}`);
    if (!el) return;
    if (el.style.display === 'none' || el.style.display === '') {
      this.loadUnassignedPlayersForTeam(teamIndex, prefix);
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  async loadUnassignedPlayersForTeam(teamIndex, prefix = '') {
    const suffix = prefix ? `-${prefix}-${teamIndex + 1}` : `-${teamIndex + 1}`;
    const container = document.getElementById(`unassigned-list${suffix}`);
    if (!container) return;

    try {
      // Load all players if not already loaded
      if (this.allPlayers.length === 0) {
        await this.loadAllPlayers();
      }

      // Determine which players are not assigned to any team in this session
      const unassigned = this.allPlayers.filter((p) => !this.assignedMap.has(p.id));

      if (unassigned.length === 0) {
        container.innerHTML = '<em>Geen beschikbare spelers</em>';
        return;
      }

      container.innerHTML = '';
      unassigned.forEach((p) => {
        const playerDiv = document.createElement('div');
        playerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee;';
        playerDiv.innerHTML = `
          <span>${p.name}</span>
          <button class="save-team-btn compact" onclick="simpleSetup.assignPlayerToTeam(${teamIndex}, '${p.id}', '${prefix}')">Toevoegen</button>
        `;
        container.appendChild(playerDiv);
      });
    } catch (error) {
      console.error('Error loading unassigned players:', error);
      container.innerHTML = '<em>Fout bij laden spelers</em>';
    }
  }

  async assignPlayerToTeam(teamIndex, playerId, prefix = '') {
    try {
      const player = this.allPlayers.find((p) => p.id === playerId);
      if (!player) return;

      // Add to local players list
      this.players.push({
        id: player.id,
        name: player.name,
        teamIndex: teamIndex,
      });

      // Mark as assigned
      this.assignedMap.set(playerId, true);

      // Update displays
      this.updatePlayersList();
      if (prefix === 'step3') {
        this.updateTeamsListStep3();
      }

      // Hide the dropdown
      const suffix = prefix ? `-${prefix}-${teamIndex + 1}` : `-${teamIndex + 1}`;
      const el = document.getElementById(`unassigned-players${suffix}`);
      if (el) el.style.display = 'none';

      this.showSuccessMessage(`${player.name} toegevoegd aan team`);
    } catch (error) {
      console.error('Error assigning player:', error);
      this.showErrorMessage('Fout bij toewijzen speler');
    }
  }

  showSuccessMessage(message) {
    const existing = document.querySelector('.success-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; font-weight: 500;';
    toast.innerHTML = `<span style="font-size: 1.2em;">OK</span> ${this.escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  showErrorMessage(message) {
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; font-weight: 500;';
    toast.innerHTML = `<span style="font-size: 1.2em;">!</span> ${this.escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  updatePlayerSection() {
    this.playersSection.style.display = 'block';
    const teamModeMessage = document.getElementById('team-mode-message');
    const playerFormSection = document.getElementById('player-form-section');
    const showPlayers = this.activities.some(act => act.scoring_mode !== 'team');
    if (!showPlayers) {
      if (teamModeMessage) teamModeMessage.style.display = 'block';
      if (playerFormSection) playerFormSection.style.display = 'none';
    } else {
      if (teamModeMessage) teamModeMessage.style.display = 'none';
      if (playerFormSection) playerFormSection.style.display = 'block';
      // Hide team select for player mode - but since per activity, perhaps show always or check
      const teamSelectGroup = document.getElementById('team-select-group');
      if (teamSelectGroup) {
        // For simplicity, show team select if any activity is team_with_players
        const hasTeamWithPlayers = this.activities.some(act => act.scoring_mode === 'team_with_players');
        const hasPlayerOnly = this.activities.some(act => act.scoring_mode === 'player');
        teamSelectGroup.style.display = hasPlayerOnly ? 'none' : 'block';
      }
    }
  }

  populateReview() {
    this.reviewSessionName.textContent = this.sessionData.name;
    if (this.reviewActivities) {
      this.reviewActivities.innerHTML = this.activities
        .map((a) => `<li>${this.escapeHtml(a.name)} — ${this.escapeHtml(a.scoring_mode)} (${this.escapeHtml(a.sport_type)}, ${this.escapeHtml(a.game_type)}, ${a.total_rounds} rondes${a.time_limit ? `, ${a.time_limit} min` : ''})</li>`)
        .join('');
    }
    this.reviewTeams.innerHTML = this.teams.map((team) => `<li><span style="color: ${team.color};">●</span> ${team.name}</li>`).join('');

    // Only show players section if any activity requires players
    const playersHeading = this.reviewPlayers.previousElementSibling;
    const showPlayers = this.activities.some(act => act.scoring_mode !== 'team');
    if (!showPlayers) {
      // Hide players section for team-only activities
      if (playersHeading) playersHeading.style.display = 'none';
      this.reviewPlayers.style.display = 'none';
    } else {
      // Show players section for activities that require players
      if (playersHeading) playersHeading.style.display = 'block';
      this.reviewPlayers.style.display = 'block';
      // Collect players assigned to session teams
      const sessionTeamIds = new Set(this.teams.map((t) => t.id));
      const assignedPlayers = this.allPlayers.filter((p) => p.team_id && sessionTeamIds.has(p.team_id));
      this.reviewPlayers.innerHTML = assignedPlayers
        .map((player) => {
          const team = this.teams.find((t) => t.id == player.team_id);
          const teamName = team ? team.name : 'Unknown';
          return `<li>${player.name} (${teamName})</li>`;
        })
        .join('');
    }
  }

  async createSession() {
    try {
      // Gather all session data
      const showPlayers = this.activities.some(act => act.scoring_mode !== 'team'); // Show players if any activity requires them

      // Create session
      const sessionData = {
        name: this.sessionData.name,
        show_players: showPlayers,
      };

      const session = await this.api.createSession(sessionData);
      const sessionId = session.id;

      // Create activities for this session
      const createdActivities = [];
      for (const act of this.activities) {
        const payload = {
          session_id: sessionId,
          name: act.name,
          sport_type: act.sport_type,
          scoring_mode: act.scoring_mode,
          game_type: act.game_type,
          total_rounds: act.total_rounds,
          time_limit: act.time_limit,
          description: act.description,
        };
        const created = await this.api.createSessionActivity(sessionId, payload);
        createdActivities.push(created);
      }

      // Add teams - use API team ids if available
      const sessionTeams = [];
      for (const team of this.teams) {
        const teamData = {
          name: team.name,
          ...(team.id && { id: team.id }), // Use API team id if available
        };
        const createdTeam = await this.api.createSessionTeam(sessionId, teamData);
        sessionTeams.push(createdTeam);
      }

      // Auto opt-in teams to all activities
      try {
        for (const a of createdActivities) {
          const actId = a.id || a.activity_id || a.activity?.id;
          if (!actId) continue;
          for (const t of sessionTeams) {
            const tid = t.id || t.team_id || t.team?.id;
            if (!tid) continue;
            await this.api.addActivityTeam(actId, { team_id: tid, opted_in: true });
          }
        }
      } catch (_) {}

      // Add players if player scoring mode or team_with_players mode
      if (this.sessionData.scoringMode === 'player' || this.sessionData.scoringMode === 'team_with_players') {
        for (const player of this.players) {
          // Only create player if not already created via API
          if (!player.id) {
            const playerData = {
              name: player.name,
            };
            if (player.teamIndex !== null) {
              const teamId = sessionTeams[player.teamIndex]?.id;
              if (teamId) {
                playerData.default_team_id = teamId;
              }
            }
            await this.api.createPlayer(playerData);
          }
          // For existing players, they should already have team associations
        }
      }

      // Redirect to simple scoreinput
      window.location.href = `simple-scoreinput.html?session=${sessionId}`;
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Fout bij aanmaken sessie: ' + error.message);
    }
  }

  async saveAsTemplate() {
    const templateName = prompt('Geef een naam voor de template:');
    if (!templateName) return;

    const templateData = {
      name: this.sessionData.name,
      activities: this.activities,
      teams: this.teams,
      players: this.players,
    };

    // Save to localStorage
    const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
    const newTemplate = {
      id: Date.now(),
      name: templateName,
      template_data: templateData,
    };
    templates.push(newTemplate);
    localStorage.setItem('sportScoreTemplates', JSON.stringify(templates));

    alert('Template opgeslagen!');
  }

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  autoAdvanceToStep4() {
    this.currentStep = 1;
    this.showStep();
    const advance = () => {
      if (this.currentStep < 4) {
        setTimeout(() => {
          this.nextStep();
          advance();
        }, 100);
      }
    };
    advance();
  }
}

// Initialize
const simpleSetup = new SimpleSetup();
