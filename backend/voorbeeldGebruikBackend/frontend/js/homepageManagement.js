

// homepageManagement.js - Handles team, activity, and player management logic

export class HomepageManagement {
	constructor(api, sharedUtils) {
		this.api = api;
		this.sharedUtils = sharedUtils;

		// Cached DOM elements (will be bound when loadBeheerData or setup is called)
		this.addActivityBtn = null;
		this.activityFormContainer = null;
		this.activityForm = null;
		this.cancelActivityBtn = null;
		this.activitiesList = null;
		this.existingActivitySelect = null;
		this.addExistingActivityBtn = null;

		this.addTeamBtn = null;
		this.teamFormContainer = null;
		this.teamForm = null;
		this.teamNameInput = null;
		this.teamColorInput = null;
		this.teamIconSelect = null;
		this.teamDescriptionInput = null;
		this.cancelTeamBtn = null;
		this.teamsList = null;
		this.teamButtonsContainer = null;
		this.existingTeamSelect = null;
		this.addExistingTeamBtn = null;

		this.teamForPlayerSelect = null;
		this.playerNameInput = null;
		this.playerSearchInput = null;
		this.addPlayerBtn = null;
		this.playersList = null;
		this.playersSection = null;

		// Import helpers (CSV / XLSX)
		this.playerImportFileInput = null;
		this.playerImportAutoCreateTeams = null;
		this.playerImportPreviewBtn = null;
		this.playerImportStartBtn = null;
		this.playerImportPreviewContainer = null;
		this._parsedImportRows = null;
		this._importColumnMap = null;

		this.teams = [];
		this.activities = [];
		this.allPlayers = [];
		this.editingTeamId = null;
		this.editingActivityId = null;
		this.processingActivity = false;

		// bind helpers lazily when needed
	}

	bindElements() {
		// Activity elements
		this.addActivityBtn = document.getElementById('add-activity-btn');
		this.activityFormContainer = document.getElementById('activity-form-container');
		this.activityForm = document.getElementById('activity-form');
		this.cancelActivityBtn = document.getElementById('cancel-activity-btn');
		this.activitiesList = document.getElementById('activities-list');
		this.existingActivitySelect = document.getElementById('existing-activity-select');
		this.addExistingActivityBtn = document.getElementById('add-existing-activity-btn');

		// Team elements
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
		this.existingTeamSelect = document.getElementById('existing-team-select');
		this.addExistingTeamBtn = document.getElementById('add-existing-team-btn');

		// Player elements
		this.teamForPlayerSelect = document.getElementById('team-for-player');
		this.playerNameInput = document.getElementById('player-name');
		this.playerSearchInput = document.getElementById('player-search');
		this.addPlayerBtn = document.getElementById('add-player');
		this.playersList = document.getElementById('players-list');
		this.playersSection = document.getElementById('players-section');
		this.pmPlayerNameInput = document.getElementById('pm-player-name');
		this.addPlayerGlobalBtn = document.getElementById('add-player-global-btn');
		this.pmPlayersList = document.getElementById('pm-players-list');

		// Import elements
		this.playerImportFileInput = document.getElementById('player-import-file');
		this.playerImportAutoCreateTeams = document.getElementById('player-import-auto-create-teams');
		this.playerImportAutoDetectBtn = document.getElementById('player-import-auto-detect-btn');
		this.playerImportPreviewBtn = document.getElementById('player-import-preview-btn');
		this.playerImportStartBtn = document.getElementById('player-import-start-btn');
		this.playerImportPreviewContainer = document.getElementById('player-import-preview');
		this.playerImportNameMode = document.getElementById('player-import-name-mode');
		this.playerImportColName = document.getElementById('player-import-col-name');
		this.playerImportColFirst = document.getElementById('player-import-col-first');
		this.playerImportColLast = document.getElementById('player-import-col-last');
		this.playerImportColTeam = document.getElementById('player-import-col-team');
		this.playerImportProgressBar = document.getElementById('player-import-progress-bar');
		this.playerImportProgressPercent = document.getElementById('player-import-progress-percent');
		this.playerImportResult = document.getElementById('player-import-result');
		// Mapping wrappers for name mode toggling
		this.playerImportMapNameCol = document.getElementById('map-name-col');
		this.playerImportMapFirstLast = document.getElementById('map-first-last');

		// Setup color preview if elements exist
		if (this.teamColorInput) {
			const preview = document.getElementById('color-preview');
			if (preview && this.sharedUtils) {
				this._colorPreviewCtrl = this.sharedUtils.attachColorPreview(this.teamColorInput, preview);
			}
		}
	}

	// Toggle mapping UI for name mode (full vs split)
	toggleImportNameModeUI() {
		try {
			const mode = (this.playerImportNameMode && this.playerImportNameMode.value) || 'full';
			if (mode === 'full') {
				if (this.playerImportMapNameCol) this.playerImportMapNameCol.style.display = 'flex';
				if (this.playerImportMapFirstLast) this.playerImportMapFirstLast.style.display = 'none';
				if (this.playerImportColFirst) this.playerImportColFirst.disabled = true;
				if (this.playerImportColLast) this.playerImportColLast.disabled = true;
				if (this.playerImportColName) this.playerImportColName.disabled = false;
			} else {
				if (this.playerImportMapNameCol) this.playerImportMapNameCol.style.display = 'none';
				if (this.playerImportMapFirstLast) this.playerImportMapFirstLast.style.display = 'flex';
				if (this.playerImportColFirst) this.playerImportColFirst.disabled = false;
				if (this.playerImportColLast) this.playerImportColLast.disabled = false;
				if (this.playerImportColName) this.playerImportColName.disabled = true;
			}
		} catch (e) { /* ignore */ }
	}

	async loadBeheerData() {
		// Bind DOM elements first
		this.bindElements();
		// Ensure mapping UI reflects current name mode
		this.toggleImportNameModeUI();

		await Promise.all([
			this.loadTeams(),
			this.loadPlayers(),
			this.loadActivities()
		]);

		this.setupBeheerEventListeners();
		this.updateExistingTeamSelect();
		this.updateExistingActivitiesSelect();
	}

	setupBeheerEventListeners() {
		// Activities
		if (this.addActivityBtn) {
			try { this.addActivityBtn.type = 'button'; } catch (_) {}
			this.addActivityBtn.addEventListener('click', () => this.showActivityForm());
		}
		if (this.activityForm && !this.activityForm.dataset.handlerAttached) {
			this.activityForm.addEventListener('submit', (e) => {
				e.preventDefault();
				this.handleActivitySubmit(e);
			});
			// Show/hide team_vs_time settings based on game type + scoring mode
			try {
				const gameTypeEl = this.activityForm.querySelector('#activity-game-type');
				const scoringEl = this.activityForm.querySelector('#activity-scoring');
				const updateUI = () => this.updateTeamVsTimeUI(
					gameTypeEl ? gameTypeEl.value : null,
					scoringEl ? scoringEl.value : null
				);
				if (gameTypeEl) gameTypeEl.addEventListener('change', updateUI);
				if (scoringEl) scoringEl.addEventListener('change', updateUI);
			} catch (_) {}
			this.activityForm.dataset.handlerAttached = 'true';
		}
		if (this.cancelActivityBtn) this.cancelActivityBtn.addEventListener('click', () => this.hideActivityForm());
		if (this.addExistingActivityBtn) this.addExistingActivityBtn.addEventListener('click', () => this.addExistingActivity());

		// Teams
		if (this.addTeamBtn) this.addTeamBtn.addEventListener('click', () => this.showTeamForm());
		if (this.teamForm && !this.teamForm.dataset.handlerAttached) {
			this.teamForm.addEventListener('submit', (e) => { e.preventDefault(); this.createTeam(); });
			this.teamForm.dataset.handlerAttached = 'true';
		}
		if (this.cancelTeamBtn) this.cancelTeamBtn.addEventListener('click', () => this.hideTeamForm());
		if (this.addExistingTeamBtn) this.addExistingTeamBtn.addEventListener('click', () => this.addExistingTeam());

		// Players
		if (this.addPlayerBtn) this.addPlayerBtn.addEventListener('click', () => this.addPlayerToTeam());
		if (this.playerSearchInput) this.playerSearchInput.addEventListener('input', (e) => this.updatePlayerSearch(e.target.value));
		if (this.addPlayerGlobalBtn) this.addPlayerGlobalBtn.addEventListener('click', () => this.createPlayerGlobal());

		// Import players
		// Fallback: ensure the "open import" button always opens the modal and that import elements are bound
		try {
			const openImportBtn = document.getElementById('open-player-import-btn');
			const importModal = document.getElementById('player-import-modal');
			const importClose = document.querySelector('.import-close');
			if (openImportBtn && importModal) {
				openImportBtn.addEventListener('click', () => {
					importModal.classList.add('show');
					// re-bind elements in case they weren't present during initial bind
					this.bindElements();
					// bind file input handler lazily if present
					if (this.playerImportFileInput) this.playerImportFileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) this.handleImportFile(f); });
				});
			}
			if (importClose && importModal) importClose.addEventListener('click', () => importModal.classList.remove('show'));
		} catch (e) { /* ignore modal fallback errors */ }

		if (this.playerImportFileInput) this.playerImportFileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) this.handleImportFile(f); });
		if (this.playerImportAutoDetectBtn) this.playerImportAutoDetectBtn.addEventListener('click', () => { if (this._parsedImportRows) { this._importColumnMap = this._detectColumns(this._parsedImportRows.rows, this._parsedImportRows.headers); this.populateImportMappingUI(this._parsedImportRows.rows, this._parsedImportRows.headers); this.showImportPreview(); } });
		if (this.playerImportPreviewBtn) this.playerImportPreviewBtn.addEventListener('click', () => this.showImportPreview());
		if (this.playerImportStartBtn) this.playerImportStartBtn.addEventListener('click', () => this.startImport());
		if (this.playerImportNameMode) this.playerImportNameMode.addEventListener('change', () => { this.toggleImportNameModeUI(); this.showImportPreview(); });
		if (this.playerImportColName) this.playerImportColName.addEventListener('change', () => this.showImportPreview());
		if (this.playerImportColFirst) this.playerImportColFirst.addEventListener('change', () => this.showImportPreview());
		if (this.playerImportColLast) this.playerImportColLast.addEventListener('change', () => this.showImportPreview());
		if (this.playerImportColTeam) this.playerImportColTeam.addEventListener('change', () => this.showImportPreview());
	}

	updateTeamVsTimeUI(gameType, scoringMode) {
		// Team vs Time settings removed - always use defaults
		// const isTeamVsTime = String(gameType || '').toLowerCase() === 'team_vs_time';
		// const isTeamWithPlayers = String(scoringMode || '').toLowerCase() === 'team_with_players';
		// const tvtSettings = document.getElementById('team-vs-time-settings');
		// const aggregateRow = document.querySelector('#activity-aggregate-times')?.closest('.tvt-row');
		// const aggregateCheckbox = document.getElementById('activity-aggregate-times');

		// if (tvtSettings) {
		// 	if (isTeamVsTime) tvtSettings.classList.remove('hidden');
		// 	else {
		// 		tvtSettings.classList.add('hidden');
		// 		if (aggregateCheckbox) aggregateCheckbox.checked = false;
		// 	}
		// }

		// if (aggregateRow) {
		// 	const showAggregate = isTeamVsTime && isTeamWithPlayers;
		// 	aggregateRow.classList.toggle('hidden', !showAggregate);
		// 	if (!showAggregate && aggregateCheckbox) aggregateCheckbox.checked = false;
		// }
	}

	// ---------------------- Activities ----------------------
	async loadActivities() {
		if (!this.activitiesList || !this.api) return;
		try {
			const response = await this.api.getActivities();
			const activities = this.api.extractArray(response, 'activities');
			this.activities = activities;
			this.renderActivities(activities);
		} catch (error) {
			console.error('Error loading activities:', error);
			this.activities = [];
			this.renderActivities([]);
		}
	}

	renderActivities(activities) {
		if (!this.activitiesList) return;
		if (activities.length === 0) {
			this.activitiesList.innerHTML = '<div class="empty-state">Nog geen activiteiten. Voeg je eerste activiteit toe met "+ Nieuwe Activiteit".</div>';
			return;
		}
		this.activitiesList.innerHTML = activities.map(activity => `
			<div class="team-card" data-activity-id="${activity.id}">
				<div class="team-card-header">
					<div class="team-title">
						<div class="team-name-wrap">
							<span class="team-name">${this.escapeHtml(activity.name)}</span>
							<span class="team-color-hex">${this.escapeHtml(activity.sport_type)} • ${this.escapeHtml(activity.scoring_mode || 'team')} • ${this.escapeHtml(activity.game_type || 'custom')}</span>
						</div>
					</div>
				</div>
				<p class="team-description">${this.escapeHtml(activity.description || '')}</p>
				<div class="team-actions">
					<button class="btn btn-sm btn-secondary" onclick="window.homepage.editActivity(${activity.id})" style="flex: 1; text-align: center;">
						Bewerken
					</button>
					<button class="btn btn-sm" style="background: #dc3545; color: white; flex: 1; text-align: center;" onclick="window.homepage.deleteActivity(${activity.id})">
						Verwijderen
					</button>
				</div>
			</div>
		`).join('');
	}

	async createActivity(activityData) {
		try {
			await this.api.createActivity(activityData);
			this.loadActivities();
		} catch (error) {
			console.error('Error creating activity:', error);
			throw error;
		}
	}

	async deleteActivity(activityId) {
		try {
			await this.api.deleteActivity(activityId);
			this.loadActivities();
		} catch (error) {
			console.error('Error deleting activity:', error);
			throw error;
		}
	}

	handleActivitySubmit(e) {
		e && typeof e.preventDefault === 'function' && e.preventDefault();
		if (!this.activityForm) return;
		const form = this.activityForm;
		const formData = new FormData(form);
		
		// Parse form values
		const totalRounds = parseInt(formData.get('activity-rounds')) || 1;
		const timeLimitPerRound = parseInt(formData.get('activity-time')) || null;
		
		// Validate: require time limit when multiple rounds
		if (totalRounds > 1 && !timeLimitPerRound) {
			alert('Voer een tijdslimiet per ronde in wanneer er meerdere rondes zijn.');
			const timeInput = document.getElementById('activity-time');
			if (timeInput) timeInput.focus();
			return;
		}
		
		const activityData = {
			name: formData.get('activity-name'),
			sport_type: formData.get('activity-sport'),
			game_type: formData.get('activity-game-type'),
			scoring_mode: formData.get('activity-scoring'),
			total_rounds: totalRounds,
			time_limit_per_round: timeLimitPerRound,
			description: formData.get('activity-desc')
		};
		
		// Include team_vs_time specific settings if selected - always use defaults now
		const isTeamVsTime = String(activityData.game_type) === 'team_vs_time';
		const isTeamWithPlayers = String(activityData.scoring_mode) === 'team_with_players';
		if (isTeamVsTime) {
			activityData.time_winner = 'lower'; // Always lower
			activityData.aggregate_player_times = false; // Never aggregate
		} else {
			activityData.time_winner = 'lower';
			activityData.aggregate_player_times = false;
		}
		
		this.processingActivity = true;
		const done = async () => {
			this.processingActivity = false;
			this.hideActivityForm();
			try { form.reset(); } catch (_) {}
			await this.loadActivities();
		};

		if (this.editingActivityId) {
			this.api.updateActivity(this.editingActivityId, activityData).then(done).catch((err) => { this.processingActivity = false; console.error(err); });
		} else {
			this.createActivity(activityData).then(done).catch((err) => { this.processingActivity = false; console.error(err); });
		}
	}

	showActivityForm(activity = null) {
		if (!this.activityFormContainer) return;
		this.activityFormContainer.classList.remove('hidden');
		const form = this.activityForm;
		if (!form) return;
		if (activity) {
			this.editingActivityId = activity.id;
			try { form.reset(); } catch (_) {}
			form['activity-name'].value = activity.name || '';
			form['activity-sport'].value = activity.sport_type || 'custom';
			form['activity-game-type'].value = activity.game_type || 'custom';
			form['activity-scoring'].value = activity.scoring_mode || 'team';
			form['activity-rounds'].value = activity.total_rounds || 1;
			form['activity-time'].value = activity.time_limit_per_round || '';
			form['activity-desc'].value = activity.description || '';
			// Team vs Time settings handling - removed, using defaults
			// this.updateTeamVsTimeUI(activity.game_type, activity.scoring_mode);
			// try { form['activity-time-winner'].value = activity.time_winner || 'lower'; } catch(_) {}
			// try { form['activity-aggregate-times'].checked = !!activity.aggregate_player_times; } catch(_) {}
			const submitBtn = form.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.textContent = 'Bijwerken';
			try { form['activity-name'].focus(); } catch (_) {}
		} else {
			this.editingActivityId = null;
			try { form.reset(); } catch (_) {}
			const submitBtn = form.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.textContent = 'Activiteit Opslaan';
			try { form['activity-name'].focus(); } catch (_) {}
			// Team vs Time settings removed - using defaults
			// this.updateTeamVsTimeUI(form['activity-game-type']?.value, form['activity-scoring']?.value);
		}
	}

	hideActivityForm() {
		if (!this.activityFormContainer) return;
		this.activityFormContainer.classList.add('hidden');
		this.editingActivityId = null;
		if (this.activityForm) try { this.activityForm.reset(); } catch (_) {}
	}

	// ---------------------- Teams ----------------------
	async loadTeams() {
		if (!this.teamsList || !this.api) return;
		try {
			const response = await this.api.getTeams();
			const teams = this.api.extractArray(response, 'teams');
			this.renderTeams(teams);
		} catch (error) {
			console.error('Error loading teams:', error);
			if (this.teamsList) this.teamsList.innerHTML = '<p>Fout bij laden teams.</p>';
		}
	}

	renderTeams(teams) {
		if (!this.teamsList) return;
		if (teams.length === 0) {
			this.teamsList.innerHTML = '<div class="empty-state">Nog geen teams. Voeg je eerste team toe met "+ Nieuw Team".</div>';
			return;
		}
		this.teams = teams;
		this.teamsList.innerHTML = teams.map(team => {
			const teamColor = (team.color || '').trim() || '#3B82F6';
			return `
			<div class="team-card" data-team-id="${team.id}" style="border-color: ${teamColor};">
				<div class="team-card-header">
					<div class="team-color-badge" style="background-color: ${teamColor} !important;"></div>
					<div class="team-title">
						<span class="team-icon">${this.getIconEmoji(team.icon)}</span>
						<div class="team-name-wrap">
							<span class="team-name">${this.escapeHtml(team.name)}</span>
							<span class="team-color-hex">${teamColor.toUpperCase()}</span>
						</div>
					</div>
				</div>
				<p class="team-description">${this.escapeHtml(team.description || '')}</p>
				<div class="team-actions">
					<button class="btn btn-sm btn-secondary" onclick="window.homepage.editTeam(${team.id})" style="flex: 1; text-align: center;">
						Bewerken
					</button>
					<button class="btn btn-sm" style="background: #dc3545; color: white; flex: 1; text-align: center;" onclick="window.homepage.deleteTeam(${team.id})">
						Verwijderen
					</button>
				</div>
			</div>
		`;
		}).join('');
	}

	getIconEmoji(icon) {
		const icons = {
			team: '👥',
			star: '⭐',
			trophy: '🏆',
			fire: '🔥',
			rocket: '🚀',
			crown: '👑',
			lightning: '⚡',
			heart: '❤️',
		};
		return icons[icon] || '👥';
	}

	async deleteTeam(teamId) {
		if (!confirm('Weet je zeker dat je dit team wilt verwijderen?')) return;
		try {
			console.log('Deleting team with ID:', teamId);
			await this.api.deleteTeam(teamId);
			this.showSuccessMessage('Team verwijderd!');
			await this.loadTeams();
		} catch (error) {
			console.error('Error deleting team:', error);
			this.api.handleError(error, 'deleting team');
			alert('Fout bij het verwijderen van het team.');
		}
	}

	async editTeam(teamId) {
		const team = this.teams.find(t => t.id === teamId);
		if (team) {
			this.showTeamForm(team);
		}
	}

	// ---------------------- Players ----------------------
	async loadPlayers() {
		if (!this.api) return;
		try {
			console.log('Loading players...');
			const response = await this.api.getPlayers();
			this.allPlayers = this.api.extractArray(response, 'players');
			console.log('Players loaded:', this.allPlayers.length);
			this.updatePlayerManagerDisplay();
		} catch (error) {
			console.error('Error loading players:', error);
			this.allPlayers = [];
			this.updatePlayerManagerDisplay();
		}
	}

	updatePlayerManagerDisplay() {
		const list = document.getElementById('pm-players-list');
		if (!list) return;
		if (!this.allPlayers || this.allPlayers.length === 0) {
			list.innerHTML = '<div class="empty-state">Nog geen spelers. Voeg een nieuwe speler toe.</div>';
			return;
		}

		// Group players by team
		const unassignedPlayers = [];
		const teamPlayers = {};

		this.allPlayers.forEach(player => {
			if (player.team_id) {
				if (!teamPlayers[player.team_id]) {
					teamPlayers[player.team_id] = [];
				}
				teamPlayers[player.team_id].push(player);
			} else {
				unassignedPlayers.push(player);
			}
		});

		let html = '';

		// Unassigned players section
		if (unassignedPlayers.length > 0) {
			html += '<h4 style="margin-top: 10px; margin-bottom: 10px; color: var(--text-color);">Niet toegewezen spelers</h4>';
			unassignedPlayers.forEach(player => {
				html += `
				<div class="player-item label-left-control-right">
					<span>${this.escapeHtml(player.name)}</span>
					<div class="control-group">
							<select class="team-select" style="padding: 4px 8px; font-size: 13px;" onchange="window.homepage.assignPlayerToTeamFromSelect(${player.id}, this.value)">
								<option value="">-- Selecteer team --</option>
								${this.teams.map(t => `<option value="${t.id}">${this.escapeHtml(t.name)}</option>`).join('')}
							</select>
							<button class="btn btn-sm" style="background: #dc3545; color: white;" onclick="window.homepage.deletePlayer(${player.id})">🗑️</button>
						</div>
					</div>
				`;
			});
		}

		// Players grouped by team
		Object.keys(teamPlayers).forEach(teamId => {
			const team = this.teams.find(t => t.id == teamId);
			const teamName = team ? team.name : `Team ${teamId}`;
			const teamColor = team ? team.color : '#3B82F6';
			html += `<h4 style="margin-top: 15px; margin-bottom: 10px; color: var(--text-color);">
				<span style="color: ${teamColor};">●</span> ${this.escapeHtml(teamName)}
			</h4>`;
			teamPlayers[teamId].forEach(player => {
				html += `
				<div class="player-item label-left-control-right">
					<span>${this.escapeHtml(player.name)}</span>
					<div class="control-group">
							<button class="btn btn-sm btn-secondary" style="font-size: 12px;" onclick="window.homepage.unassignPlayerFromTeam(${player.id})">❌ Verwijder uit team</button>
							<button class="btn btn-sm" style="background: #dc3545; color: white;" onclick="window.homepage.deletePlayer(${player.id})">🗑️</button>
						</div>
					</div>
				`;
			});
		});

		list.innerHTML = html;
	}

	async createPlayerGlobal() {
		if (!this.pmPlayerNameInput) return;
		const name = this.pmPlayerNameInput.value.trim();
		if (!name) {
			alert('Voer een speler naam in.');
			return;
		}
		try {
			await this.api.createPlayer({ name });
			this.showSuccessMessage(`Speler "${name}" toegevoegd!`);
			this.pmPlayerNameInput.value = '';
			await this.loadPlayers();
		} catch (error) {
			console.error('Error creating player:', error);
			this.api.handleError(error, 'creating player');
			alert('Fout bij het toevoegen van de speler.');
		}
	}

	async deletePlayer(playerId) {
		if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;
		try {
			await this.api.request(`/api/v1/players/${playerId}`, { method: 'DELETE' });
			this.showSuccessMessage('Speler verwijderd!');
			await this.loadPlayers();
		} catch (error) {
			this.api.handleError(error, 'deleting player');
			alert('Fout bij het verwijderen van de speler.');
		}
	}

	// Edit player (name update)
	async editPlayer(playerId, newName) {
		try {
			await this.api.request(`/api/v1/players/${playerId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName })
			});
			this.showSuccessMessage('Speler bijgewerkt!');
			await this.loadPlayers();
		} catch (error) {
			this.api.handleError && this.api.handleError(error, 'updating player');
			alert('Fout bij het bijwerken van de speler.');
		}
	}

	promptEditPlayer(playerId) {
		const player = (this.allPlayers || []).find(p => p.id == playerId);
		if (!player) return;
		const newName = prompt('Nieuwe naam voor speler:', player.name);
		if (newName && newName.trim() && newName.trim() !== player.name) {
			this.editPlayer(playerId, newName.trim());
		}
	}

	updateTeamSelect() {
		if (!this.teamForPlayerSelect) return;
		this.teamForPlayerSelect.innerHTML = '<option value="">-- Selecteer team --</option>' + (this.teams || []).map(team => `<option value="${team.id}">${this.getIconEmoji(team.icon)} ${this.escapeHtml(team.name)}</option>`).join('');
	}

	getAssignedTeamForPlayer(playerId) {
		const assignments = JSON.parse(localStorage.getItem('playerTeamAssignments') || '{}');
		return assignments[playerId] || null;
	}

	loadActivitiesFromLocalStorage() {
		try {
			const stored = localStorage.getItem('sportscore_activities');
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error('Error loading activities from localStorage:', error);
			return [];
		}
	}

	saveActivitiesToLocalStorage(activities) {
		try {
			localStorage.setItem('sportscore_activities', JSON.stringify(activities));
		} catch (error) {
			console.error('Error saving activities to localStorage:', error);
		}
	}

	updateExistingTeamSelect() {
		if (!this.existingTeamSelect) return;
		this.existingTeamSelect.innerHTML = '<option value="">-- Selecteer een bestaand team --</option>';
		this.teams.forEach(team => {
			const option = document.createElement('option');
			option.value = team.id;
			option.textContent = `${this.getIconEmoji(team.icon)} ${team.name}`;
			this.existingTeamSelect.appendChild(option);
		});
	}

	updateExistingActivitiesSelect() {
		if (!this.existingActivitySelect) return;
		this.existingActivitySelect.innerHTML = '<option value="">-- Selecteer een bestaande activiteit --</option>';
		this.activities.forEach(activity => {
			const option = document.createElement('option');
			option.value = activity.id;
			option.textContent = activity.name;
			this.existingActivitySelect.appendChild(option);
		});
	}

	addExistingActivity() {
		if (!this.existingActivitySelect) return;
		const id = this.existingActivitySelect.value;
		if (!id) return;
		const act = this.activities.find(a => String(a.id) === String(id));
		if (act) this.showActivityForm(act);
	}

	addExistingTeam() {
		if (!this.existingTeamSelect) return;
		const id = this.existingTeamSelect.value;
		if (!id) return;
		const team = this.teams.find(t => String(t.id) === String(id));
		if (team) this.showTeamForm(team);
	}

	showTeamForm(team = null) {
		if (!this.teamFormContainer) return;
		this.teamFormContainer.classList.remove('hidden');
		if (!this.teamForm) return;
		if (team) {
			this.editingTeamId = team.id;
			this.teamNameInput.value = team.name || '';
			this.teamColorInput.value = team.color || '#3B82F6';
			this.teamIconSelect.value = team.icon || 'team';
			this.teamDescriptionInput.value = team.description || '';
			// Update color preview
			if (this._colorPreviewCtrl) {
				this._colorPreviewCtrl.setColor(team.color || '#3B82F6');
			}
		} else {
			this.editingTeamId = null;
			try { this.teamForm.reset(); } catch (_) {}
			this.teamColorInput.value = '#3B82F6';
			// Update color preview
			if (this._colorPreviewCtrl) {
				this._colorPreviewCtrl.setColor('#3B82F6');
			}
		}
		try { this.teamNameInput.focus(); } catch (_) {}
	}

	hideTeamForm() {
		if (!this.teamFormContainer) return;
		this.teamFormContainer.classList.add('hidden');
		this.editingTeamId = null;
		if (this.teamForm) try { this.teamForm.reset(); } catch (_) {}
	}

	async createTeam() {
		const name = (this.teamNameInput && this.teamNameInput.value || '').trim();
		if (!name) {
			alert('Voer een teamnaam in.');
			return;
		}
		const teamData = {
			name,
			color: (this.teamColorInput && this.teamColorInput.value) || '#3B82F6',
			icon: (this.teamIconSelect && this.teamIconSelect.value) || 'team',
			description: (this.teamDescriptionInput && this.teamDescriptionInput.value) || null
		};
		try {
			let resp;
			if (this.editingTeamId) {
				resp = await this.api.updateTeam(this.editingTeamId, teamData);
				this.showSuccessMessage(`Team "${teamData.name}" succesvol bijgewerkt!`);
			} else {
				resp = await this.api.createTeam(teamData);
				this.showSuccessMessage(`Team "${teamData.name}" succesvol aangemaakt!`);
			}
			this.hideTeamForm();
			await this.loadTeams();
		} catch (error) {
			this.api.handleError && this.api.handleError(error, 'creating/updating team');
			alert('Fout bij het opslaan van team.');
		}
	}

	async addPlayerToTeam() {
		const name = (this.playerNameInput && this.playerNameInput.value || '').trim();
		const teamId = this.teamForPlayerSelect ? this.teamForPlayerSelect.value : null;
		if (!name) {
			alert('Voer een speler naam in.');
			return;
		}
		try {
			const response = await this.api.request('/api/v1/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
			const player = response.player || response;
			this.showSuccessMessage(`Speler "${name}" toegevoegd!`);
			if (teamId) {
				await this.assignPlayerToTeam(teamId, player.id);
			}
			if (this.playerNameInput) this.playerNameInput.value = '';
			await this.loadPlayers();
		} catch (error) {
			this.api.handleError && this.api.handleError(error, 'creating player');
			alert('Fout bij het toevoegen van de speler.');
		}
	}

	updatePlayerSearch(term) {
		const list = document.getElementById('pm-players-list');
		if (!list) return;
		const t = (term || '').toLowerCase();
		const filtered = (this.allPlayers || []).filter(p => (p.name || '').toLowerCase().includes(t));
		if (filtered.length === 0) { list.innerHTML = '<p class="info-message">Geen spelers gevonden.</p>'; return; }
		list.innerHTML = filtered.map(player => `<div class="player-item"><span>${this.escapeHtml(player.name)}</span><button class="delete-btn" onclick="window.homepage.management.deletePlayer(${player.id})">Verwijderen</button></div>`).join('');
	}

	async loadUnassignedForTeam(teamId) {
		const container = document.getElementById(`unassigned-list-${teamId}`);
		if (!container) return;
		try {
			const resp = await this.api.get('/api/v1/players');
			const players = resp && resp.players ? resp.players : [];
			const unassigned = players.filter((p) => !p.team_id);
			unassigned.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
			if (!unassigned || unassigned.length === 0) { container.innerHTML = '<p class="info-message">Geen beschikbare spelers om toe te wijzen.</p>'; return; }
			container.innerHTML = '';
			unassigned.forEach((p) => {
				const row = document.createElement('div');
				row.className = 'unassigned-player-item';
				const left = document.createElement('div'); left.className = 'unassigned-player-name'; left.textContent = this.escapeHtml(p.name);
				const btn = document.createElement('button'); btn.className = 'save-team-btn compact'; btn.textContent = 'Toewijzen';
				btn.onclick = async () => { await this.assignPlayerToTeam(teamId, p.id); };
				row.appendChild(left); row.appendChild(btn); container.appendChild(row);
			});
		} catch (err) { this.api.handleError && this.api.handleError(err, 'loading unassigned players'); container.innerHTML = '<p class="info-message">Kon spelers niet laden.</p>'; }
	}

	async assignPlayerToTeam(teamId, playerId) {
		try {
			await this.api.put(`/api/v1/players/${playerId}`, { team_id: Number(teamId) });
			await this.loadTeams();
			await this.loadPlayers();
			const ul = document.getElementById(`unassigned-players-${teamId}`); if (ul) ul.style.display = 'none';
			this.showSuccessMessage('Speler toegewezen aan team!');
		} catch (err) {
			this.api.handleError && this.api.handleError(err, 'assigning player to team');
			alert('Fout bij het toewijzen van speler aan team.');
		}
	}

	async removePlayerFromTeam(playerId) {
		try {
			await this.api.put(`/api/v1/players/${playerId}`, { team_id: null });
			await this.loadTeams();
			await this.loadPlayers();
			this.showSuccessMessage('Speler verwijderd uit team!');
		} catch (err) {
			this.api.handleError && this.api.handleError(err, 'removing player from team');
			alert('Fout bij het verwijderen van speler uit team.');
		}
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

	// ---------------------- Import Players (CSV / XLSX) ----------------------
	async handleImportFile(file) {
		try {
			if (!file) return;
			const parsed = await this._parseFile(file);
			// parsed: { rows: Array<Array>, headers: Array|null }
			this._parsedImportRows = parsed;
			this._importColumnMap = this._detectColumns(parsed.rows, parsed.headers);
			this.populateImportMappingUI(parsed.rows, parsed.headers);
			this.showImportPreview();
		} catch (err) {
			console.error('Error parsing import file:', err);
			alert('Kon het importbestand niet lezen.');
		}
	}

	_parseFile(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					const data = evt.target.result;
					// If XLSX available, use it for both xlsx and csv
					if (window.XLSX && (file.name.match(/\.xlsx?$/i) || file.name.match(/\.csv$/i))) {
						const workbook = window.XLSX.read(data, { type: 'array' });
						const firstSheetName = workbook.SheetNames[0];
						const sheet = workbook.Sheets[firstSheetName];
						const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
						// Heuristics to determine if first row is header
						const headers = rows.length > 0 && rows[0].some(c => typeof c === 'string' && /[a-zA-Z]/.test(c)) ? rows[0] : null;
						const body = headers ? rows.slice(1) : rows;
						resolve({ rows: body.map(r => r.map(c => (c === undefined ? '' : String(c).trim()))), headers });
					} else {
						// Fallback CSV parsing (text)
						const text = new TextDecoder().decode(data);
						const lines = text.split(/\r?\n/).filter(Boolean);
						const rows = lines.map(l => l.split(/,|;/).map(c => c.trim()));
						const headers = rows.length > 0 && rows[0].some(c => /[a-zA-Z]/.test(c)) ? rows[0] : null;
						const body = headers ? rows.slice(1) : rows;
						resolve({ rows: body, headers });
					}
				} catch (err) { reject(err); }
			};
			reader.onerror = (e) => reject(e);
			// read as array buffer (good for xlsx and csv)
			reader.readAsArrayBuffer(file);
		});
	}

	_detectColumns(rows, headers) {
		// rows: array of arrays, headers: array|null
		const colnames = [];
		if (headers) {
			headers.forEach(h => colnames.push(String(h || '').toLowerCase()));
		} else if (rows && rows.length > 0) {
			// fallback positional names
			for (let i = 0; i < rows[0].length; i++) colnames.push(`col${i+1}`);
		}
		const map = { nameIdx: null, firstIdx: null, lastIdx: null, teamIdx: null };
		colnames.forEach((c, i) => {
			if (c.match(/name|naam|volledige|full/)) map.nameIdx = i;
			if (c.match(/first|voornaam/)) map.firstIdx = i;
			if (c.match(/last|achternaam|surname/)) map.lastIdx = i;
			// include 'groep' as a Dutch synonym for class/team + more tolerant matching
			if (c.match(/team|klas|groep|class/)) map.teamIdx = i;
		});

		// Additional heuristics based on the content of columns (first 20 rows)
		try {
			const sampleCount = Math.min((rows || []).length, 20);
			if (rows && rows.length > 0) {
				const colStats = [];
				for (let i = 0; i < rows[0].length; i++) {
					let teamMatches = 0;
					let nameMatches = 0;
					for (let r = 0; r < sampleCount; r++) {
						const v = String((rows[r] || [])[i] || '').trim();
						if (!v) continue;
						// team-like: contains keywords or digits (e.g., 'klas 6wiwea', '6A')
						if (/(klas|groep|class)/i.test(v) || /\d/.test(v)) teamMatches++;
						// name-like: two or three words, capitalized words (lenient)
						if (/^[A-ZÀ-Ý][a-zà-ÿ]+\s+[A-ZÀ-Ý][a-zà-ÿ]+(\s+[A-ZÀ-Ý][a-zà-ÿ]+)?$/.test(v)) nameMatches++;
						if (v.split(' ').length >= 2 && v.split(' ').length <= 4 && /[a-zA-Z]/.test(v)) {
							// if starts with uppercase or contains typical name characters
							if (/^[A-ZÀ-Ý]/.test(v) || /[A-Za-z]\./.test(v)) nameMatches++;
						}
					}
					colStats.push({ idx: i, teamMatches, nameMatches });
				}

				// If team column not found by header, pick best candidate by sample matches
				if (map.teamIdx === null) {
					colStats.sort((a, b) => b.teamMatches - a.teamMatches);
					if (colStats[0] && colStats[0].teamMatches >= Math.max(1, Math.floor(sampleCount * 0.3))) map.teamIdx = colStats[0].idx;
				}

				// If name column not found by header, pick best candidate by sample matches
				if (map.nameIdx === null) {
					colStats.sort((a, b) => b.nameMatches - a.nameMatches);
					if (colStats[0] && colStats[0].nameMatches >= Math.max(1, Math.floor(sampleCount * 0.2))) map.nameIdx = colStats[0].idx;
				}
			}
		} catch (err) { /* ignore heuristics failure */ }

		// If still not detected, try positional guesses
		if (map.nameIdx === null) {
			if (rows[0] && rows[0].length === 1) map.nameIdx = 0;
			else if (rows[0] && rows[0].length >= 2) { map.firstIdx = 0; map.lastIdx = 1; if (rows[0].length >= 3) map.teamIdx = map.teamIdx === null ? 2 : map.teamIdx; }
		}

		return map;
	}

	showImportPreview() {
		const container = this.playerImportPreviewContainer;
		if (!container || !this._parsedImportRows) return;
		const rows = this._parsedImportRows.rows.slice(0, 20);
		const headers = this._parsedImportRows.headers;
		let html = '<div><strong>Voorbeeld import (max 20):</strong><table style="width:100%; border-collapse:collapse; margin-top:8px;"><tr>';
		const cols = headers ? headers : (rows[0] || []).map((_,i)=>`Kolom ${i+1}`);
		cols.forEach(c => html += `<th style="text-align:left; padding:4px 6px; border-bottom:1px solid #ddd;">${this.escapeHtml(c)}</th>`);
		html += '</tr>';
		rows.forEach(r => {
			html += '<tr>';
			cols.forEach((_, i) => html += `<td style="padding:4px 6px; border-bottom:1px solid #eee;">${this.escapeHtml(r[i] || '')}</td>`);
			html += '</tr>';
		});
		html += '</table>';
		// show current mapping selections
		if (this.playerImportNameMode) {
			const nm = this.playerImportNameMode.value || 'full';
			html += `<div style="margin-top:8px;">Huidige mapping: <strong>${nm === 'full' ? 'Volledige naam' : 'Voornaam + Achternaam'}</strong>`;
			if (this.playerImportColName && this.playerImportColName.value) html += `, Naam kolom: <strong>${this.playerImportColName.options[this.playerImportColName.selectedIndex]?.text || this.playerImportColName.value}</strong>`;
			if (nm === 'split') {
				if (this.playerImportColFirst && this.playerImportColFirst.value) html += `, Voornaam kolom: <strong>${this.playerImportColFirst.options[this.playerImportColFirst.selectedIndex]?.text || this.playerImportColFirst.value}</strong>`;
				if (this.playerImportColLast && this.playerImportColLast.value) html += `, Achternaam kolom: <strong>${this.playerImportColLast.options[this.playerImportColLast.selectedIndex]?.text || this.playerImportColLast.value}</strong>`;
			}
			if (this.playerImportColTeam && this.playerImportColTeam.value) html += `, Team kolom: <strong>${this.playerImportColTeam.options[this.playerImportColTeam.selectedIndex]?.text || this.playerImportColTeam.value}</strong>`;
			html += `</div>`;
		}
		container.innerHTML = html;
	}

	async startImport() {
		if (!this._parsedImportRows || !this._parsedImportRows.rows.length) { alert('Geen data om te importeren.'); return; }
		const autoCreateTeams = !!(this.playerImportAutoCreateTeams && this.playerImportAutoCreateTeams.checked);
		const duplicateMode = document.getElementById('player-import-duplicate-mode')?.value || 'skip';
		const rows = this._parsedImportRows.rows;
		// get mapping from selects
		const nameMode = (this.playerImportNameMode && this.playerImportNameMode.value) || 'full';
		const nameIdx = this.playerImportColName ? parseInt(this.playerImportColName.value) : null;
		const firstIdx = this.playerImportColFirst ? parseInt(this.playerImportColFirst.value) : null;
		const lastIdx = this.playerImportColLast ? parseInt(this.playerImportColLast.value) : null;
		const teamIdx = this.playerImportColTeam ? parseInt(this.playerImportColTeam.value) : null;

		let created = 0, skipped = 0, errors = 0;
		const teamsCache = {};

		// fuzzy helper
		const normalize = (s) => (String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim());
		const similarity = (a,b) => {
			if (!a || !b) return 0;
			a = normalize(a); b = normalize(b); if (a === b) return 1;
			const lev = (x, y) => { const m = x.length, n = y.length; const dp = Array(m+1).fill(null).map(()=>Array(n+1).fill(0)); for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j; for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ const cost = x[i-1]===y[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost); }} return dp[m][n]; };
			const d = lev(a,b); const maxl = Math.max(a.length,b.length); return maxl ? (1 - d/maxl) : 0;
		};
		const similarityThreshold = 0.82;

		for (let i = 0; i < rows.length; i++) {
			const r = rows[i];
			// build name based on mapping
			let name = '';
			if (nameMode === 'full' && nameIdx !== null && r[nameIdx]) name = r[nameIdx];
			else if (nameMode === 'split') { const first = (firstIdx !== null && r[firstIdx]) ? r[firstIdx] : ''; const last = (lastIdx !== null && r[lastIdx]) ? r[lastIdx] : ''; name = [first,last].filter(Boolean).join(' ').trim(); }
			else { name = r[0] || ''; }
			name = (name || '').trim();
			if (!name) { skipped++; this._setImportProgress(i+1, rows.length); continue; }

			const teamName = (teamIdx !== null && r[teamIdx]) ? r[teamIdx].trim() : null;
			let teamId = null;
			try {
				let existingPlayer = null;
				for (const p of (this.allPlayers || [])) { const sim = similarity(p.name || '', name); if (sim >= similarityThreshold) { existingPlayer = p; break; } }

				if (existingPlayer) {
					if (duplicateMode === 'skip') { skipped++; if (teamName) await this._assignTeamToExisting(existingPlayer, teamName, autoCreateTeams, teamsCache); this._setImportProgress(i+1, rows.length); continue; }
					if (duplicateMode === 'merge') { if (teamName) await this._assignTeamToExisting(existingPlayer, teamName, autoCreateTeams, teamsCache); skipped++; this._setImportProgress(i+1, rows.length); continue; }
					// else 'create' -> fallthrough and create a new player
				}

				if (teamName) {
					const key = teamName.toLowerCase(); if (teamsCache[key]) teamId = teamsCache[key]; else { const existing = (this.teams || []).find(t => String(t.name || '').toLowerCase() === key); if (existing) teamId = existing.id; else if (autoCreateTeams) { const resp = await this.api.createTeam({ name: teamName }); teamId = (resp && resp.team && resp.team.id) || resp.id || resp; await this.loadTeams(); } teamsCache[key] = teamId; }
				}

				const resp = await this.api.createPlayer({ name });
				const player = (resp && (resp.player || resp)) || resp; const playerId = player.id || player; if (teamId) { await this.api.put(`/api/v1/players/${playerId}`, { team_id: Number(teamId) }); }
				created++;
			} catch (err) { errors++; console.error('Error importing row', i, err); }
			this._setImportProgress(i+1, rows.length);
		}
		await this.loadPlayers();
		const resultMsg = `Import klaar: ${created} aangemaakt, ${skipped} overgeslagen, ${errors} fouten`;
		this.showSuccessMessage(resultMsg);
		if (this.playerImportResult) this.playerImportResult.textContent = resultMsg;
		this.playerImportPreviewContainer.innerHTML = '';
		this._parsedImportRows = null;
	}

	_setImportProgress(done, total) {
		try {
			const pct = Math.round((done / Math.max(1, total)) * 100);
			if (this.playerImportProgressBar) this.playerImportProgressBar.style.width = `${pct}%`;
			if (this.playerImportProgressPercent) this.playerImportProgressPercent.textContent = `${pct}%`;
		} catch (e) {}
	}

	// Assign a team to an existing player, creating the team if allowed
	async _assignTeamToExisting(player, teamName, autoCreateTeams, teamsCache) {
		if (!teamName || !player) return;
		const key = teamName.toLowerCase();
		let teamId = teamsCache[key];
		if (!teamId) {
			const existing = (this.teams || []).find(t => String(t.name || '').toLowerCase() === key);
			if (existing) teamId = existing.id;
			else if (autoCreateTeams) {
				try {
					const resp = await this.api.createTeam({ name: teamName });
					teamId = (resp && resp.team && resp.team.id) || resp.id || resp;
					await this.loadTeams();
				} catch (e) { console.error('Error creating team during import:', e); }
			}
			teamsCache[key] = teamId;
		}
		if (teamId) {
			try {
				await this.api.put(`/api/v1/players/${player.id}`, { team_id: Number(teamId) });
			} catch (e) { console.error('Error assigning team to existing player:', e); }
		}
	}

	populateImportMappingUI(rows, headers) {
		// Fill select options based on headers or positional columns
		const cols = headers ? headers.slice() : (rows && rows.length ? rows[0].map((_,i)=>`Kolom ${i+1}`) : []);
		const fill = (sel) => {
			if (!sel) return;
			sel.innerHTML = '';
			cols.forEach((c, i) => {
				const o = document.createElement('option'); o.value = i; o.textContent = c || `Kolom ${i+1}`; sel.appendChild(o);
			});
		};
		fill(this.playerImportColName);
		fill(this.playerImportColFirst);
		fill(this.playerImportColLast);
		fill(this.playerImportColTeam);

		// set defaults from detected map if present
		const map = this._importColumnMap || this._detectColumns(rows, headers || null);
		if (map.nameIdx !== null && this.playerImportColName) this.playerImportColName.value = map.nameIdx;
		if (map.firstIdx !== null && this.playerImportColFirst) this.playerImportColFirst.value = map.firstIdx;
		if (map.lastIdx !== null && this.playerImportColLast) this.playerImportColLast.value = map.lastIdx;
		if (map.teamIdx !== null && this.playerImportColTeam) this.playerImportColTeam.value = map.teamIdx;
		// set name mode
		if (map.nameIdx !== null && this.playerImportNameMode) this.playerImportNameMode.value = 'full';
		else if (map.firstIdx !== null && map.lastIdx !== null && this.playerImportNameMode) this.playerImportNameMode.value = 'split';
	}


	escapeHtml(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

