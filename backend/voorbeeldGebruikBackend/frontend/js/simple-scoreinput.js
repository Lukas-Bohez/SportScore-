// Score Input JavaScript - Session Score Management
class ScoreInput {
  constructor() {
    this.sessionId = new URLSearchParams(window.location.search).get('session');
    // Load participant session from localStorage
    try {
      const stored = localStorage.getItem('playerSession');
      if (stored) {
        const ps = JSON.parse(stored);
        if (ps && ps.sessionId) {
          this.sessionId = String(ps.sessionId);
          this.participantName = ps.playerName || null;
        }
      }
    } catch (_) {}
    this.session = null;
    this.activities = []; // Stations
    this.recentScores = [];
    this.timer = null;
    this.timeRemaining = 0;
    this.customQuickActions = [];
    this.isSubmitting = false;

    // Shared utilities instance
    this.sharedUtils = new SharedUtils(api);

    // Activity selection properties
    this.selectedActivityId = null;
    this.activeActivityId = null; // For big screen display

    if (!this.sessionId) {
      // Show a friendly banner instead of immediately redirecting so the user can debug
      this.showFatalError('Geen sessie ID gevonden in de URL. Voeg ?session=<id> toe of ga terug naar de startpagina.');
      // Stop initialization (no redirect)
      return;
    }

    this.init();
  }

  async init() {
    try {
      this.bindElements();
      this.setupEventListeners();
      this.loadCustomQuickActions();

      console.debug(`ScoreInput: initializing for session=${this.sessionId} apiBase=${api.baseURL}`);

      await this.loadSession();
      await this.loadTeams();
      await this.loadActivities();
      this.loadRecentScores();
    } catch (err) {
      console.error('ScoreInput init failed:', err);
      this.showFatalError('Fout bij initialisatie. Controleer de console voor details.');
    }
  }

  hideAdminControls() {
    // Hide admin-only elements
    const adminElements = [
      '.session-controls', // Footer controls
      '.score-input-section .form-group', // Team/player selection form
      '.quick-actions', // Quick action buttons
      '.custom-quick-actions-section', // Custom actions
      '#qr-toggle' // QR toggle (admin feature)
    ];
    
    adminElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
      });
    });

    // Hide the admin home link and show participant back link
    const homeLink = document.querySelector('a[href="index.html"]');
    const backLink = document.getElementById('back-btn');
    if (homeLink) {
      homeLink.style.display = 'none';
    }
    if (backLink) {
      backLink.style.display = 'inline-block';
    }

    // Simplify the header
    const header = document.querySelector('.header h1');
    if (header) {
      header.textContent = 'SportScore - Mijn Scores';
    }

    // Hide leaderboard for participants (they don't need to see admin view)
    const leaderboardSection = document.querySelector('.leaderboard-section');
    if (leaderboardSection) {
      leaderboardSection.style.display = 'none';
    }

    // Hide recent scores section for participants
    const recentScoresSection = document.querySelector('.recent-scores-section');
    if (recentScoresSection) {
      recentScoresSection.style.display = 'none';
    }
  }

  bindElements() {
    // Header elements
    this.sessionName = document.getElementById('session-name');
    this.roundInfo = document.getElementById('round-info');
    this.timer = document.getElementById('timer');

    // Main sections
    this.leaderboard = document.getElementById('leaderboard');
    this.teamSelect = document.getElementById('team-select');
    this.playerSelect = document.getElementById('player-select');
    this.pointsInput = document.getElementById('points-input');
    this.reasonInput = document.getElementById('reason-input');
    this.submitScoreBtn = document.getElementById('submit-score-btn');
    this.recentScores = document.getElementById('recent-scores');

    // Sections to hide/show in time-mode
    this.leaderboardSection = document.querySelector('.leaderboard-section');
    this.recentScoresSection = document.querySelector('.recent-scores-section');

    // Quick scores
    this.sportQuickButtons = document.getElementById('sport-quick-buttons');
    this.customQuickActionsSection = document.querySelector('.custom-quick-actions-section');

    // Control buttons
    this.subtractBtn = document.getElementById('subtract-btn');
    this.addBtn = document.getElementById('add-btn');
    this.pauseSessionBtn = document.getElementById('pause-session-btn');
    this.nextRoundBtn = document.getElementById('next-round-btn');
    this.endSessionBtn = document.getElementById('end-session-btn');

    // Time controls (for team_vs_time)
    this.timeControls = document.getElementById('time-controls');
    // Older markup had multiple minute/sec/ms inputs; prefer a single input created dynamically for simplicity
    this.setMinInput = document.getElementById('set-minutes');
    this.setSecInput = document.getElementById('set-seconds');
    this.setMsInput = document.getElementById('set-ms');
    this.setTimeBtn = document.getElementById('set-time-btn');
    this.addMinInput = document.getElementById('add-minutes');
    this.addSecInput = document.getElementById('add-seconds');
    this.addMsInput = document.getElementById('add-ms');
    this.addTimeBtn = document.getElementById('add-time-btn');
    this.recordTimeBtn = document.getElementById('record-time-btn');

    // No unified text time input — use explicit minute/second/millisecond fields for Set/Add clarity
    this.timeInput = null;

    // Ensure minute/second/millisecond inputs are visible and usable (preferred for time mode)
    ['set-minutes','set-seconds','set-ms'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style) el.style.display = '';
    });

    // Groups we need to show/hide
    this.pointsGroup = document.getElementById('points-group');
    this.reasonGroup = document.getElementById('reason-group');

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
    // Score input controls - only add if elements exist and are valid DOM elements
    if (this.subtractBtn && typeof this.subtractBtn.addEventListener === 'function') {
      this.subtractBtn.addEventListener('click', () => this.adjustPoints(-1));
    }
    if (this.addBtn && typeof this.addBtn.addEventListener === 'function') {
      this.addBtn.addEventListener('click', () => this.adjustPoints(1));
    }

    // Team selection change - load players for selected team
    if (this.teamSelect) this.teamSelect.addEventListener('change', () => this.onTeamChange());

    // Form submission
    if (this.submitScoreBtn) this.submitScoreBtn.addEventListener('click', () => this.submitScore());

    // Points input validation (supports both numeric and time input for team_vs_time)
    if (this.pointsInput) this.pointsInput.addEventListener('input', (e) => {
      const currentActivity = this.getCurrentActivity();
      // For time-based activities allow mm:ss(.ms) or seconds input
      if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
        // Allow digits, colon, dot and spaces only
        e.target.value = e.target.value.replace(/[^0-9:\.\s]/g, '').trim();
        return;
      }
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < -100) value = -100;
      if (value > 100) value = 100;
      e.target.value = value;
    });

    // Time control buttons - prefer minute/second/ms handlers for clarity
    if (this.setTimeBtn) this.setTimeBtn.addEventListener('click', () => this.setTimeFromInputs());
    if (this.addTimeBtn) this.addTimeBtn.addEventListener('click', () => this.addTimeFromInputs());

    // No unified time input. Enter in ms input triggers Set via setupTimeInputEnter().

    // Enter key handling for ms inputs is set up via setupTimeInputEnter() (keeps handlers in one place)

    // Remove legacy handler if present
    if (this.recordTimeBtn) this.recordTimeBtn.remove();

    // Setup Enter handling for quick submission from ms inputs (legacy kept safe)
    this.setupTimeInputEnter();

    // Enter key submission
    if (this.reasonInput) this.reasonInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitScore();
      }
    });

    // Session controls
    if (this.pauseSessionBtn) this.pauseSessionBtn.addEventListener('click', () => this.togglePause());
    if (this.nextRoundBtn) this.nextRoundBtn.addEventListener('click', () => this.nextRound());
    if (this.endSessionBtn) this.endSessionBtn.addEventListener('click', () => this.endSession());

    // Custom quick actions
    if (this.addCustomBtn) this.addCustomBtn.addEventListener('click', () => this.addCustomQuickAction());

    // Real-time updates
    api.on('session_score_update', (data) => this.handleScoreUpdate(data));
    api.on('session_status_update', (data) => this.handleStatusUpdate(data));

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input field (except for Enter)
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      // Enter to submit (works in any input field)
      if (e.key === 'Enter' && isInputField && e.target !== this.reasonInput) {
        return; // Let reasonInput handle Enter normally
      }

      // Ctrl/Cmd + Number keys for quick actions
      if ((e.ctrlKey || e.metaKey) && !isInputField) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.addQuickScore('Bonus +5', 5);
            break;
          case '2':
            e.preventDefault();
            this.addQuickScore('Penalty -2', -2);
            break;
          case '3':
            e.preventDefault();
            this.addQuickScore('Juist Antwoord +1', 1);
            break;
          case '4':
            e.preventDefault();
            this.addQuickScore('Verkeerd Antwoord -1', -1);
            break;
          case 's':
            e.preventDefault();
            this.submitScore();
            break;
        }
      }

      // Arrow keys for point adjustment (when not in input)
      if (!isInputField) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.adjustPoints(1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.adjustPoints(-1);
        }
      }
    });
  }

  async loadSession() {
    try {
      console.debug(`ScoreInput: fetching session ${this.sessionId} from ${api.baseURL}`);
      this.session = await api.get(`/api/v1/sessions/${this.sessionId}`);
      if (!this.session) throw new Error('Lege sessie respons');
      this.applyTheme();
      this.loadSportQuickButtons();
      this.updateSessionDisplay();
      this.startTimer();
    } catch (error) {
      console.error('Error loading session', error);
      api.handleError(error, 'loading session');
      // Show a non-blocking banner so the user can still inspect the console
      this.showFatalError(`Fout bij het laden van de sessie: ${error && error.message ? error.message : String(error)}`);
      // Do not redirect abruptly to index - let user see the error
    }
  }

  async loadActivity() {
    try {
      this.activity = await api.getActivity(this.activityId);
      this.updateSessionDisplay();
    } catch (error) {
      api.handleError(error, 'loading activity');
      // Keep working in session mode if activity fails
      this.activityId = null;
    }
  }

  applyTheme() {
    const sportType = (this.activity && this.activity.sport_type) || (this.session && this.session.sport_type);
    if (!sportType) return;
    document.body.setAttribute('data-sport', sportType);
  }

  loadSportQuickButtons() {
    const container = document.getElementById('sport-quick-buttons');
    if (!container || !this.session) return;

    const sportType = this.session.sport_type || 'custom';
    const quickButtons = this.getSportQuickButtons(sportType);

    container.innerHTML = '';
    quickButtons.forEach((btn) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `quick-btn ${btn.class}`;
      button.textContent = btn.label;
      button.onclick = () => this.addQuickScore(btn.reason, btn.points);
      container.appendChild(button);
    });
  }

  getSportQuickButtons(sportType) {
    const buttons = {
      quiz: [
        { label: '+1 Juist', points: 1, reason: 'Juist Antwoord', class: 'correct' },
        { label: '-1 Verkeerd', points: -1, reason: 'Verkeerd Antwoord', class: 'wrong' },
        { label: '+3 Bonus', points: 3, reason: 'Bonusvraag', class: 'bonus' },
        { label: '+5 Perfect', points: 5, reason: 'Perfecte Ronde', class: 'bonus' },
      ],
      voetbal: [
        { label: '⚽ Doelpunt +1', points: 1, reason: 'Doelpunt', class: 'goal' },
        { label: '🎯 Penalty +1', points: 1, reason: 'Penalty', class: 'penalty' },
        { label: '🅰️ Assist +1', points: 1, reason: 'Assist', class: 'bonus' },
        { label: '🟨 Gele Kaart -1', points: -1, reason: 'Gele Kaart', class: 'wrong' },
        { label: '🟥 Rode Kaart -3', points: -3, reason: 'Rode Kaart', class: 'penalty' },
      ],
      basketbal: [
        { label: '🏀 Free Throw +1', points: 1, reason: 'Vrije Worp', class: 'correct' },
        { label: '🎯 2-Pointer +2', points: 2, reason: '2-Punter', class: 'bonus' },
        { label: '🌟 3-Pointer +3', points: 3, reason: '3-Punter', class: 'bonus' },
        { label: '🚫 Fout -1', points: -1, reason: 'Fout', class: 'wrong' },
      ],
      volleybal: [
        { label: '🏐 Punt +1', points: 1, reason: 'Punt', class: 'correct' },
        { label: '⚡ Ace +2', points: 2, reason: 'Service Ace', class: 'bonus' },
        { label: '🛡️ Block +1', points: 1, reason: 'Blok', class: 'correct' },
        { label: '❌ Fout -1', points: -1, reason: 'Fout', class: 'wrong' },
      ],
      hockey: [
        { label: '🏑 Doelpunt +1', points: 1, reason: 'Doelpunt', class: 'goal' },
        { label: '🎯 Penalty +1', points: 1, reason: 'Strafcorner', class: 'penalty' },
        { label: '🟨 Gele Kaart -1', points: -1, reason: 'Gele Kaart', class: 'wrong' },
        { label: '🟥 Rode Kaart -3', points: -3, reason: 'Rode Kaart', class: 'penalty' },
      ],
      tennis: [
        { label: '🎾 Game +1', points: 1, reason: 'Game Gewonnen', class: 'correct' },
        { label: '🏆 Set +5', points: 5, reason: 'Set Gewonnen', class: 'bonus' },
        { label: '⚡ Ace +1', points: 1, reason: 'Ace', class: 'bonus' },
        { label: '❌ Dubbelfout -1', points: -1, reason: 'Dubbelfout', class: 'wrong' },
      ],
      atletiek: [
        { label: '🥇 1e Plaats +3', points: 3, reason: '1e Plaats', class: 'bonus' },
        { label: '🥈 2e Plaats +2', points: 2, reason: '2e Plaats', class: 'correct' },
        { label: '🥉 3e Plaats +1', points: 1, reason: '3e Plaats', class: 'correct' },
        { label: '⏱️ Record +5', points: 5, reason: 'Record Verbroken', class: 'bonus' },
      ],
      zwemmen: [
        { label: '🥇 1e Plaats +3', points: 3, reason: '1e Plaats', class: 'bonus' },
        { label: '🥈 2e Plaats +2', points: 2, reason: '2e Plaats', class: 'correct' },
        { label: '🥉 3e Plaats +1', points: 1, reason: '3e Plaats', class: 'correct' },
        { label: '⏱️ Record +5', points: 5, reason: 'Persoonlijk Record', class: 'bonus' },
      ],
      wielrennen: [
        { label: '🥇 1e Plaats +5', points: 5, reason: 'Etappe Gewonnen', class: 'bonus' },
        { label: '🥈 2e Plaats +3', points: 3, reason: '2e Plaats', class: 'correct' },
        { label: '🥉 3e Plaats +2', points: 2, reason: '3e Plaats', class: 'correct' },
        { label: '🚴 Sprint +1', points: 1, reason: 'Tussensprint', class: 'correct' },
      ],
      hardlopen: [
        { label: '🥇 1e Plaats +3', points: 3, reason: '1e Plaats', class: 'bonus' },
        { label: '🥈 2e Plaats +2', points: 2, reason: '2e Plaats', class: 'correct' },
        { label: '🥉 3e Plaats +1', points: 1, reason: '3e Plaats', class: 'correct' },
        { label: '⏱️ PR +5', points: 5, reason: 'Persoonlijk Record', class: 'bonus' },
      ],
      esports: [
        { label: '💀 Kill +1', points: 1, reason: 'Elimination', class: 'correct' },
        { label: '💥 Multi-Kill +3', points: 3, reason: 'Multi-Kill', class: 'bonus' },
        { label: '🎯 Objective +2', points: 2, reason: 'Doelwit Behaald', class: 'correct' },
        { label: '☠️ Death -1', points: -1, reason: 'Geëlimineerd', class: 'wrong' },
        { label: '🏆 Victory +10', points: 10, reason: 'Victory Royale', class: 'bonus' },
      ],
      bordspel: [
        { label: '+1 Punt', points: 1, reason: 'Punt Verdiend', class: 'correct' },
        { label: '+3 Bonus', points: 3, reason: 'Bonus', class: 'bonus' },
        { label: '+5 Grote Zet', points: 5, reason: 'Grote Zet', class: 'bonus' },
        { label: '-2 Penalty', points: -2, reason: 'Penalty', class: 'penalty' },
      ],
      custom: [
        { label: '+5 Bonus', points: 5, reason: 'Bonus', class: 'bonus' },
        { label: '-2 Penalty', points: -2, reason: 'Penalty', class: 'penalty' },
        { label: '+1 Punt', points: 1, reason: 'Punt', class: 'correct' },
        { label: '-1 Aftrek', points: -1, reason: 'Aftrek', class: 'wrong' },
      ],
    };

    return buttons[sportType] || buttons['custom'];
  }

  updateSessionDisplay() {
    // Clear any previous fatal error if session successfully loaded
    this.clearFatalError();
    if (this.sessionName) {
      const mode = (this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team';
      const scoringModeIndicator = mode === 'player' ? ' 👤' : ' 👥';
      const scoringModeTitle = mode === 'player' ? 'Speler Scores Modus' : 'Team Scores Modus';
      const activityLabel = this.activity ? ` • Activiteit: ${this.escapeHtml(this.activity.name)}` : '';
      this.sessionName.innerHTML = `${this.session.name}${activityLabel} <span title="${scoringModeTitle}">${scoringModeIndicator}</span>`;
    }
    if (this.roundInfo) {
      this.roundInfo.textContent = `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
    }

    // Disable player select in team mode, disable team-only scoring in player mode
    this.updateScoringModeUI();

    this.updateTimerDisplay();
  }

  updateScoringModeUI() {
    const currentActivity = this.getCurrentActivity();
    const mode = (currentActivity && currentActivity.scoring_mode) || (this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode);
    if (!mode) return;

    const playerGroup = document.getElementById('player-select-group');
    if (mode === 'team') {
      // Team mode: hide and disable player selection -- except when this activity is time-based, we need players visible for selection
      if (playerGroup) playerGroup.style.display = 'none';
      if (this.playerSelect) {
        this.playerSelect.disabled = true;
        this.playerSelect.innerHTML = '<option value="">Team modus - spelers uitgeschakeld</option>';
        this.playerSelect.title = 'In team modus kunnen alleen punten aan teams worden gegeven';
      }
    } else if (mode === 'player') {
      // Player mode: show and enable player selection and show warning for team-only scoring
      if (playerGroup) playerGroup.style.display = 'block';
      if (this.playerSelect) {
        this.playerSelect.disabled = false;
        this.playerSelect.title = 'Selecteer een speler om punten toe te kennen';
      }

      // Add validation hint
      if (!document.getElementById('player-mode-hint')) {
        const hint = document.createElement('div');
        hint.id = 'player-mode-hint';
        hint.className = 'alert alert-info';
        hint.style.cssText = 'margin: 10px 0; padding: 10px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; color: #0c5460;';
        hint.innerHTML = '<strong>👤 Speler Modus:</strong> Punten moeten aan individuele spelers worden toegekend. Selecteer eerst een speler.';

        if (this.playerSelect && this.playerSelect.parentNode) {
          this.playerSelect.parentNode.insertBefore(hint, this.playerSelect.nextSibling);
        }
      }
    } else if (mode === 'team_with_players') {
      // Team-with-players: show player selection (optional)
      if (playerGroup) playerGroup.style.display = 'block';
      if (this.playerSelect) {
        this.playerSelect.disabled = false;
        this.playerSelect.title = 'Optioneel: selecteer een speler of score het hele team';
      }
    }

    // If the activity is team_vs_time, override team-mode hiding and make players visible and selectable
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      if (playerGroup) playerGroup.style.display = 'block';
      if (this.playerSelect) {
        this.playerSelect.disabled = false;
        this.playerSelect.title = 'Selecteer een speler om een tijd in te voeren (of laat leeg om het team te scoren)';
      }
    }

    // If this activity is a Team vs Time, adjust points input to accept time strings
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      if (this.pointsInput) {
        try {
          this.pointsInput.type = 'text';
        } catch(_) {}
        this.pointsInput.placeholder = 'Tijd invoer (mm:ss(.ms) of seconden)';
        // If current value is not a valid time, initialize to 0:00.000 for clarity
        if (isNaN(SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')))) {
          this.pointsInput.value = SharedUtils.formatMs(0);
        }
      }
      // Show time controls and hide +/- buttons since time uses mm:ss(.ms)
      if (this.timeControls) this.timeControls.style.display = 'block';
      if (this.subtractBtn) this.subtractBtn.style.display = 'none';
      if (this.addBtn) this.addBtn.style.display = 'none';

      // Hide the original points and reason inputs and the default submit button to avoid confusion
      if (this.pointsGroup) this.pointsGroup.style.display = 'none';
      // Remove reason UI entirely - we don't use a free-text reason field anymore
      if (this.reasonGroup) this.reasonGroup.style.display = 'none';
      if (this.submitScoreBtn) this.submitScoreBtn.style.display = 'none';

      // Show the explicit minute/second/ms inputs so the user can set or add times easily
      if (this.setMinInput && this.setSecInput && this.setMsInput) {
        this.setMinInput.style.display = '';
        this.setSecInput.style.display = '';
        this.setMsInput.style.display = '';
      }

      // Hide quick action areas in time mode
      if (this.sportQuickButtons && this.sportQuickButtons.parentNode) this.sportQuickButtons.parentNode.style.display = 'none';
      if (this.customQuickActionsSection) this.customQuickActionsSection.style.display = 'none';

      // Keep leaderboard and recent scores visible in time mode so teams/players remain clickable
      // (do not hide leaderboard in team_vs_time to allow selecting players/teams)

    } else {
      // Restore leaderboard and recent scores
      if (this.leaderboardSection) this.leaderboardSection.style.display = '';
      if (this.recentScoresSection) this.recentScoresSection.style.display = '';      if (this.pointsInput) {
        try {
          this.pointsInput.type = 'number';
        } catch(_) {}
        this.pointsInput.placeholder = '';
      }
      // Hide time controls and show +/- buttons
      if (this.timeControls) this.timeControls.style.display = 'none';
      if (this.subtractBtn) this.subtractBtn.style.display = '';
      if (this.addBtn) this.addBtn.style.display = '';

      // Show normal inputs
      if (this.pointsGroup) this.pointsGroup.style.display = '';
      // Show reason input for non-time modes
      if (this.reasonGroup) this.reasonGroup.style.display = '';
      if (this.submitScoreBtn) this.submitScoreBtn.style.display = '';

      // Hide explicit minute/second inputs when not in time mode
      if (this.setMinInput && this.setSecInput && this.setMsInput) {
        this.setMinInput.style.display = 'none';
        this.setSecInput.style.display = 'none';
        this.setMsInput.style.display = 'none';
      }
      if (this.addMinInput && this.addSecInput && this.addMsInput) {
        this.addMinInput.style.display = 'none';
        this.addSecInput.style.display = 'none';
        this.addMsInput.style.display = 'none';
      }

      // Restore quick action areas
      if (this.sportQuickButtons && this.sportQuickButtons.parentNode) this.sportQuickButtons.parentNode.style.display = '';
      if (this.customQuickActionsSection) this.customQuickActionsSection.style.display = '';
    }
  }

  async loadActivities() {
    try {
      const response = await api.getSessionActivities(this.sessionId);
      this.activities = response.activities || [];
      this.renderActivities();
      // Auto-select the first activity if none is selected
      if (!this.selectedActivityId && this.activities.length > 0) {
        this.selectedActivityId = this.activities[0].id;
        this.renderActivities();
        this.updateSessionDisplay(); // Ensure UI reflects auto-selected activity's scoring mode
        await this.loadTeams(); // Load teams/players for the selected activity
        this.loadLeaderboard();
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }

  renderActivities() {
    // Render activities as selectable stations
    const container = document.getElementById('activities-container');
    if (!container) return;

    container.innerHTML = '';

    // Add activity selection header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'activity-selection-header';
    headerDiv.innerHTML = `
      <h3>Kies een activiteit om scores in te geven</h3>
      ${this.selectedActivityId ? `<p class="selected-activity">Geselecteerd: ${this.activities.find(a => a.id == this.selectedActivityId)?.name || 'Onbekend'}</p>` : '<p class="no-selection">Geen activiteit geselecteerd</p>'}
    `;
    container.appendChild(headerDiv);

    this.activities.forEach(activity => {
      const stationDiv = document.createElement('div');
      stationDiv.className = `station-card ${this.selectedActivityId == activity.id ? 'selected' : ''} ${this.activeActivityId == activity.id ? 'active' : ''}`;

      stationDiv.innerHTML = `
        <h3>${this.escapeHtml(activity.name)}</h3>
        <p>${this.escapeHtml(activity.description || '')}</p>
        <div class="activity-actions">
          <button onclick="scoreInput.selectActivity(${activity.id})" class="btn select-activity">
            ${this.selectedActivityId == activity.id ? 'Geselecteerd' : 'Selecteren'}
          </button>
          <button onclick="scoreInput.setActiveActivity(${activity.id})" class="btn set-active ${this.activeActivityId == activity.id ? 'active-btn' : ''}">
            ${this.activeActivityId == activity.id ? 'Actief op scherm' : 'Zet actief'}
          </button>
        </div>
      `;

      container.appendChild(stationDiv);
    });
  }

  async selectActivity(activityId) {
    console.log('selectActivity called for', activityId);
    this.selectedActivityId = activityId;
    this.renderActivities();
    this.updateSessionDisplay(); // Ensure UI reflects activity-specific scoring mode
    await this.loadTeams(); // Reload teams/players if activity changes (to populate player select)
    this.loadLeaderboard(); // Reload leaderboard for selected activity
    this.showScoreFeedback(`Activiteit geselecteerd: ${this.activities.find(a => a.id == activityId)?.name}`, 'success');
  }

  async setActiveActivity(activityId) {
    try {
      this.activeActivityId = activityId;
      // Emit to server to update active activity for big screen (guarded)
      if (api.socket && typeof api.socket.emit === 'function') {
        api.socket.emit('set_active_activity', {
          sessionId: this.sessionId,
          activityId: activityId
        });
      } else {
        console.debug('Socket not available, skipping set_active_activity emit');
      }
      this.renderActivities();
      this.showScoreFeedback(`Activiteit ingesteld als actief op scherm: ${this.activities.find(a => a.id == activityId)?.name}`, 'success');
    } catch (error) {
      console.error('Error setting active activity:', error);
      this.showScoreFeedback('Fout bij instellen actieve activiteit', 'error');
    }
  }

  showScoreFeedback(message, type) {
    // Create a temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = `score-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      animation: fadeIn 0.3s ease-in;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(feedback);
      }, 300);
    }, 2000);
  }

  // Show a persistent fatal error banner (non-blocking) so users can inspect console
  showFatalError(message) {
    this.clearFatalError();
    const banner = document.createElement('div');
    banner.id = 'fatal-error-banner';
    banner.style.cssText = 'position:fixed;left:0;right:0;top:0;background:#b71c1c;color:white;padding:12px;text-align:center;z-index:10000;font-weight:700;';
    banner.textContent = message;
    const actions = document.createElement('span');
    actions.style.cssText = 'margin-left:12px';

    const homeBtn = document.createElement('button');
    homeBtn.textContent = '↩ Ga terug';
    homeBtn.style.cssText = 'margin-left:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:white;padding:6px 10px;border-radius:4px;cursor:pointer;';
    homeBtn.onclick = () => { window.location.href = 'index.html'; };
    actions.appendChild(homeBtn);

    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'margin-left:12px;background:transparent;border:none;color:white;font-size:16px;cursor:pointer;';
    close.onclick = () => this.clearFatalError();
    actions.appendChild(close);

    banner.appendChild(actions);
    document.body.appendChild(banner);
  }

  clearFatalError() {
    const existing = document.getElementById('fatal-error-banner');
    if (existing) existing.remove();
  }

  async loadTeams() {
    try {
      // Load teams from API
      const response = await api.getSessionTeams(this.sessionId);
      this.teams = response.teams || [];

      // Store current selections before reloading
      const currentTeamId = this.teamSelect ? this.teamSelect.value : null;
      const currentPlayerId = this.playerSelect ? this.playerSelect.value : null;

      // Keep track of existing players to avoid losing them during reload
      const existingPlayers = {};
      this.teams.forEach(team => {
        if (team.players) {
          existingPlayers[team.id] = team.players;
        }
      });

      this.teams.forEach((team) => {
        if (existingPlayers[team.id]) {
          team.players = existingPlayers[team.id];
        }
      });

      this.populateTeamSelect();

      // Check if we need to load players for all teams (for team_with_players mode)
      const mode = (this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode);
      const showPlayers = mode && (mode === 'player' || mode === 'team_with_players');
      if (showPlayers) {
        await this.loadPlayersForAllTeams();
      }

      // Restore selections if they still exist
      if (currentTeamId) {
        this.teamSelect.value = currentTeamId;
        // Reload players for the selected team
        if (currentTeamId) {
          await this.loadPlayersForTeam(currentTeamId);
          // Restore player selection if it still exists
          if (currentPlayerId) {
            this.playerSelect.value = currentPlayerId;
          }
        }
      }

      // Preselect defaults from player session if available
      if (!currentTeamId && this.defaultTeamId) {
        this.teamSelect.value = this.defaultTeamId;
        await this.onTeamChange();
        // Try to select the player by name if provided
        if (this.defaultPlayerName) {
          const options = Array.from(this.playerSelect.options);
          const found = options.find((o) => o.textContent && o.textContent.toLowerCase().includes(this.defaultPlayerName.toLowerCase()));
          if (found) this.playerSelect.value = found.value;
        }
      }
    } catch (error) {
      api.handleError(error, 'loading teams');
    }
  }

  populateTeamSelect() {
    this.teamSelect.innerHTML = '<option value="">Kies een team...</option>';

    if (this.teams.length === 0) {
      this.teamSelect.innerHTML = '<option value="">⚠️ Geen teams beschikbaar - Ga naar Team Setup</option>';
      this.teamSelect.disabled = true;

      // Show helpful message
      if (!document.getElementById('no-teams-warning')) {
        const warning = document.createElement('div');
        warning.id = 'no-teams-warning';
        warning.className = 'alert alert-warning';
        warning.style.cssText = 'margin: 15px 0; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; color: #856404;';
        warning.innerHTML = '<strong>⚠️ Geen teams gevonden!</strong><br>Voeg eerst teams toe via de <a href="teamsetup.html?session=' + this.sessionId + '" style="color: #0056b3; text-decoration: underline;">Team Setup</a> pagina.';
        this.teamSelect.parentNode.appendChild(warning);
      }
      return;
    }

    this.teamSelect.disabled = false;
    const warning = document.getElementById('no-teams-warning');
    if (warning) warning.remove();

    this.teams.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      this.teamSelect.appendChild(option);
    });
  }

  async onTeamChange() {
    const teamId = this.teamSelect.value;
    if (!teamId) {
      this.playerSelect.innerHTML = '<option value="">Selecteer eerst een team</option>';
      return;
    }

    const currentActivity = this.getCurrentActivity();
    const mode = (currentActivity && currentActivity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team';

    // For player mode or team_with_players mode, show all players from all teams
    if (mode === 'player' || mode === 'team_with_players') {
      await this.loadAllPlayersForActivity();
    } else {
      // For regular team mode, show only players from the selected team
      await this.loadPlayersForTeam(teamId);
    }
  }

  async loadAllPlayersForActivity() {
    try {
      this.playerSelect.innerHTML = '<option value="">Laden...</option>';
      
      // Load all players from all teams
      let allPlayers = [];
      for (const team of this.teams) {
        try {
          const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
          const teamPlayers = resp && resp.players ? resp.players : [];
          
          // Add team name to each player for clarity
          teamPlayers.forEach(player => {
            player.teamName = team.name;
            player.displayName = `${player.name || player.player_name} (${team.name})`;
          });
          
          allPlayers = allPlayers.concat(teamPlayers);
        } catch (err) {
          console.error(`Failed to load players for team ${team.id}:`, err);
        }
      }
      
      // Filter players if activity has specific player restrictions
      if (this.selectedActivityId) {
        try {
          const activityResp = await api.getActivityPlayers(this.selectedActivityId);
          const activityPlayerIds = new Set((activityResp.players || []).map(p => p.id));
          // Only filter if there are explicit opt-ins; otherwise show all
          if (activityPlayerIds.size > 0) {
            allPlayers = allPlayers.filter(p => activityPlayerIds.has(p.id));
          }
        } catch (_) {
          // If activity players can't be loaded, show all players
        }
      }
      
      // Sort players alphabetically by name
      allPlayers.sort((a, b) => (a.name || a.player_name || '').localeCompare(b.name || b.player_name || ''));
      
      this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      
      if (allPlayers && allPlayers.length > 0) {
        allPlayers.forEach((p) => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = p.displayName || (p.position ? `${p.name} (${p.position})` : p.name);
          this.playerSelect.appendChild(option);
        });
      }
    } catch (err) {
      this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      console.error('Failed to load all players:', err);
    }
  }

  async loadPlayersForTeam(teamId) {
    try {
      this.playerSelect.innerHTML = '<option value="">Laden...</option>';
      let players = [];
      if (this.activityId) {
        // For activity, get opted-in players for the activity, then filter to those in this team
        const activityResp = await api.getActivityPlayers(this.activityId);
        const activityPlayerIds = new Set((activityResp.players || []).map(p => p.id));
        const teamResp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
        const teamPlayers = teamResp && teamResp.players ? teamResp.players : [];
        players = teamPlayers.filter(p => activityPlayerIds.has(p.id));
      } else {
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
        players = resp && resp.players ? resp.players : [];
      }
      // Sort players alphabetically by name
      players.sort((a, b) => (a.name || a.player_name || '').localeCompare(b.name || b.player_name || ''));

      this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';

      if (players && players.length > 0) {
        players.forEach((p) => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = p.position ? `${p.name} (${p.position})` : p.name;
          this.playerSelect.appendChild(option);
        });
      }
    } catch (err) {
      // Try fallback to global players endpoint
      const msg = err && err.message ? err.message : '';
      const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
      if (status405) {
        try {
          const fallback = await api.get(`/api/v1/players`);
          const players2 = fallback && fallback.players ? fallback.players : [];
          // Sort players alphabetically by name
          players2.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

          this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';

          if (players2 && players2.length > 0) {
            players2.forEach((p) => {
              const option = document.createElement('option');
              option.value = p.id;
              option.textContent = p.position ? `${p.name} (${p.position})` : p.name;
              this.playerSelect.appendChild(option);
            });
          }
        } catch (err2) {
          this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
          console.error('Failed to load players:', err2);
        }
      } else {
        this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
        console.error('Failed to load players:', err);
      }
    }
  }

  async loadLeaderboard() {
    try {
      let allScores = [];
      if (this.selectedActivityId) {
        // Load scores for selected activity
        const scoresResponse = await api.getActivityScores(this.selectedActivityId).catch(() => ({ scores: [] }));
        allScores = scoresResponse.scores || [];
      } else {
        // Session-based leaderboard (all activities)
        const scoresResponse = await api.get(`/api/v1/sessions/${this.sessionId}/scores`);
        allScores = scoresResponse.scores || [];
      }

      // Determine scoring mode and whether lower scores are better (golf or team_vs_time rules)
      const currentActivity = this.getCurrentActivity();
      const mode = (currentActivity && currentActivity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team';
      const lowerIsBetter = SharedUtils.isLowerBetter(currentActivity);

      // Load players for all teams
      await this.loadPlayersForAllTeams();

      // Calculate leaderboard from teams and scores, provide mode and sorting hint
      const leaderboard = this.calculateLeaderboard(allScores, { mode, lowerIsBetter });

      // Cache leaderboard data and mode info for incremental updates
      this.leaderboardData = leaderboard;
      this.leaderboardMode = mode;
      this.leaderboardLowerIsBetter = lowerIsBetter;

      this.displayLeaderboard(leaderboard, { mode, lowerIsBetter });
    } catch (error) {
      api.handleError(error, 'loading leaderboard');
    }
  }

  async loadPlayersForAllTeams() {
    if (!this.teams || !Array.isArray(this.teams)) {
      console.warn('Teams not loaded yet, skipping player loading');
      return;
    }
    
    let activityPlayerIds = null;
    if (this.selectedActivityId) {
      try {
        const activityResp = await api.getActivityPlayers(this.selectedActivityId);
        const ids = new Set((activityResp.players || []).map(p => p.id));
        // Only use the set if there are explicit opt-ins; otherwise leave as null
        activityPlayerIds = ids.size > 0 ? ids : null;
      } catch (_) {
        activityPlayerIds = null;
      }
    }
    for (const team of this.teams) {
      try {
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
        let players = resp && resp.players ? resp.players : [];
        if (activityPlayerIds && activityPlayerIds.size > 0) {
          players = players.filter(p => activityPlayerIds.has(p.id));
        }
        team.players = players;
      } catch (err) {
        const msg = err && err.message ? err.message : '';
        const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
        if (status405) {
          try {
            const fallback = await api.get(`/api/v1/players`);
            let players2 = fallback && fallback.players ? fallback.players : [];
            if (activityPlayerIds && activityPlayerIds.size > 0) {
              players2 = players2.filter(p => activityPlayerIds.has(p.id));
            }
            team.players = players2;
          } catch (err2) {
            team.players = [];
          }
        } else {
          team.players = [];
        }
      }
    }
  }

  calculateLeaderboard(allScores, options = {}) {
    const mode = options.mode || ((this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team');
    const lowerIsBetter = !!options.lowerIsBetter;

    if (!this.teams || !Array.isArray(this.teams)) {
      console.warn('Teams not loaded yet, cannot calculate leaderboard');
      return [];
    }

    // Player mode: aggregate per-player
    if (mode === 'player') {
      const PlayerScores = {};

      // Initialize players from teams
      this.teams.forEach((team) => {
        (team.players || []).forEach((player) => {
          PlayerScores[player.id] = {
            id: player.id,
            name: player.name || player.player_name || `Speler ${player.id}`,
            team_id: team.id,
            team_name: team.name,
            icon: player.icon,
            color: player.color,
            score: 0,
          };
        });
      });

      // Accumulate per-player scores (consider only player-specific entries)
      allScores.forEach((score) => {
        const pid = score.player_id;
        if (pid !== undefined && pid !== null) {
          const key = String(pid);
          if (!PlayerScores[pid]) {
            // Player might not be in team list (opt-in), add a fallback
            PlayerScores[pid] = {
              id: pid,
              name: (score.player_name || `Speler ${pid}`),
              team_id: score.team_id || null,
              team_name: null,
              icon: null,
              color: null,
              score: 0,
            };
          }
          PlayerScores[pid].score += (score.points || 0);
        }
      });

      return Object.values(PlayerScores);
    }

    // Team mode (default)
    const SportScores = {};

    // Initialize teams with 0 score and include players
    this.teams.forEach((team) => {
      SportScores[team.id] = {
        id: team.id,
        name: team.name,
        icon: team.icon,
        score: 0,
        players: team.players || [],
        playerScores: {}, // Track individual player scores
      };

      // Initialize player scores to null (we'll set them when actual scores exist). Using string keys for robust lookup.
      if (team.players) {
        team.players.forEach((player) => {
          SportScores[team.id].playerScores[String(player.id)] = null;
        });
      }
    });

    // Determine most specific activity early so we can correctly parse time scores
    let effectiveActivity = this.getCurrentActivity() || this.activity || null;
    try {
      if (!effectiveActivity && this.session && Array.isArray(this.session.activities) && this.session.activities.length === 1) {
        effectiveActivity = this.session.activities[0];
      }
    } catch (_) {}

    const isTimeMode = !!(effectiveActivity && String(effectiveActivity.game_type) === 'team_vs_time');
    const aggregatePlayerTimes = !!(effectiveActivity && effectiveActivity.aggregate_player_times);
    const timeWinner = (effectiveActivity && effectiveActivity.time_winner) ? String(effectiveActivity.time_winner).toLowerCase() : 'lower';

    // Helper to parse a stored score into a number. In time mode, accept formatted strings ("M:SS.mmm" or seconds) and numeric ms.
    const parsePoints = (raw) => {
      if (raw == null) return 0;
      if (!isTimeMode) {
        const n = Number(raw);
        return isNaN(n) ? 0 : n;
      }
      // Time mode: prefer numeric (ms) when possible, otherwise parse time string
      const n = Number(raw);
      if (!isNaN(n)) return n;
      const ms = SharedUtils.parseTimeToMs(String(raw));
      return isNaN(ms) ? 0 : ms;
    };

    // Add up all scores using the parser so time-formatted strings don't collapse to 0
    allScores.forEach((score) => {
      const teamKey = score.team_id;
      if (SportScores[teamKey]) {
        const pts = parsePoints(score.points);
        SportScores[teamKey].score += pts;

        // If this score is for a specific player, track it (use parsed value for consistency)
        if (score.player_id !== undefined && score.player_id !== null) {
          const pid = String(score.player_id);
          const existing = SportScores[teamKey].playerScores[pid];
          if (existing !== undefined && existing !== null) {
            SportScores[teamKey].playerScores[pid] = Number(existing) + pts;
          } else {
            // If player was not present in the player list, or had no prior score, initialize to pts
            SportScores[teamKey].playerScores[pid] = pts;
          }
        }
      }
    });

    // Debug: show raw activity scores and SportScores mapping for time activities (helps diagnose missing player aggregation)
    if (isTimeMode) {
      try {
        const sample = (allScores || []).slice(0,5).map(s => ({ team_id: s.team_id, player_id: s.player_id, points: s.points }));
        const playerKeys = Object.fromEntries(Object.entries(SportScores).map(([k,v]) => [k, Object.keys(v.playerScores || {})]));
        console.debug('ScoreInput: raw allScores for activity', JSON.stringify({ allScoresCount: allScores.length, sample, sportScoresKeys: Object.keys(SportScores), sportScoresPlayerKeys: playerKeys }));
      } catch(_) {}
    }

    // Apply time-mode aggregation rules when appropriate
    if (isTimeMode) {
      Object.values(SportScores).forEach(team => {
        // Ensure values are numeric milliseconds (include zero as valid time)
        const playerVals = Object.values(team.playerScores || {}).map(v => Number(v) || 0);
        if (playerVals.length > 0) {
          if (aggregatePlayerTimes) {
            team.score = playerVals.reduce((a, b) => a + b, 0);
          } else {
            // Best (or worst) according to configured winner
            team.score = (timeWinner === 'higher') ? Math.max(...playerVals) : Math.min(...playerVals);
          }
          // Debug
          try { console.debug('ScoreInput: applied time-mode aggregation', { team_id: team.id, score: team.score, playerVals, aggregatePlayerTimes, timeWinner }); } catch(_) {}
        } else {
          // Safety fallback: sum parsed player scores to avoid dropping team totals to 0 when players had parseable values
          const fallbackSum = Object.values(team.playerScores || {}).reduce((a, b) => a + (Number(b) || 0), 0);
          if ((team.score === 0 || team.score === null || typeof team.score === 'undefined') && fallbackSum > 0) {
            team.score = fallbackSum;
            try { console.debug('ScoreInput: fallback summed player scores for team', { team_id: team.id, fallbackSum }); } catch(_) {}
          }
        }
      });
    }

    return Object.values(SportScores);
  }

  displayLeaderboard(leaderboard, options = {}) {
    if (!this.leaderboard) return;

    const mode = options.mode || ((this.getCurrentActivity() && this.getCurrentActivity().scoring_mode) || (this.session && this.session.scoring_mode) || 'team');
    const currentActivity = this.getCurrentActivity();
    const lowerIsBetter = (options.lowerIsBetter !== undefined) ? options.lowerIsBetter : SharedUtils.isLowerBetter(currentActivity);
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');

    // Update leaderboard title
    const titleEl = document.getElementById('leaderboard-title');
    if (titleEl) {
      if (this.selectedActivityId) {
        const activity = this.activities.find(a => a.id == this.selectedActivityId);
        titleEl.textContent = `Scorebord - ${activity ? activity.name : 'Geselecteerde Activiteit'}`;
      } else {
        titleEl.textContent = 'Scorebord - Alle Activiteiten';
      }
    }

    if (!leaderboard || leaderboard.length === 0) {
      this.leaderboard.innerHTML = '<div class="no-teams">Geen teams gevonden</div>';
      return;
    }

    // Player mode: render players as top-level items
    if (mode === 'player') {
      // Sort players ascending for golf or descending otherwise
      leaderboard.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

      const playersHtml = leaderboard.map((player, index) => {
        const teamLabel = player.team_name ? ` <span class="player-team">(${this.escapeHtml(player.team_name)})</span>` : '';
        const displayScore = isTimeMode ? SharedUtils.formatMs(player.score) : player.score;
        return `
          <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" data-player-id="${player.id}" onclick="scoreInput.selectTeamAndPlayer(${player.team_id || 'null'}, ${player.id}); event.stopPropagation();" style="cursor: pointer;">
            <div class="rank">#${index + 1}</div>
            <div class="team-info">
              <div class="team-icon">${this.getIconEmoji(player.icon)}</div>
              <div class="team-name">${this.escapeHtml(player.name)}${teamLabel}</div>
            </div>
            <div class="team-score" data-player-score="${player.id}" title="raw-ms:${player.score || 0}">${displayScore}</div>
          </div>
        `;
      }).join('');

      this.leaderboard.innerHTML = playersHtml;
      return;
    }

    // Team mode: Sort by score (respect golf ordering)
    leaderboard.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

    // In team_vs_time mode we also want to show per-player scores (times) so
    // operators can select individual players and see their times.
    const showPlayers = mode === 'player' || mode === 'team_with_players' || isTimeMode;

    const leaderboardHtml = leaderboard
      .map((team, index) => {
        let playersHtml = '';

        if (team.players && team.players.length > 0 && showPlayers) {
          // Show player badges with their individual scores. In time mode display formatted times.
          playersHtml = `<div class="team-players">
              ${team.players
                .map((p) => {
                  const playerScore = team.playerScores[String(p.id)];
                  // Only show when a real score exists (null/undefined means no score yet)
                  const hasPlayerScore = (playerScore !== undefined && playerScore !== null);
                  const displayPlayerScore = isTimeMode && (playerScore !== undefined && playerScore !== null) ? SharedUtils.formatMs(playerScore) : playerScore;
                  const name = this.escapeHtml(p.position ? `${p.name} (${p.position})` : p.name);
                  return `
                  <button class="player-badge" onclick="scoreInput.selectTeamAndPlayer(${team.id}, ${p.id}); event.stopPropagation();" title="Klik om ${name} te selecteren (raw-ms: ${playerScore || 0})">
                    ${name}${hasPlayerScore ? `: <strong>${this.escapeHtml(String(displayPlayerScore))}</strong>` : ''}
                  </button>
                `;
                })
                .join('')}
            </div>`;
        }

        const displayTeamScore = isTimeMode ? SharedUtils.formatMs(team.score) : team.score;
        return `
            <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" data-team-id="${team.id}" onclick="scoreInput.selectTeam(${team.id})" style="cursor: pointer;">
              <div class="rank">#${index + 1}</div>
              <div class="team-info">
                <div class="team-icon">${this.getIconEmoji(team.icon)}</div>
                <div class="team-name">${this.escapeHtml(team.name)}</div>
              </div>
              <div class="team-score" data-team-score="${team.id}">${displayTeamScore}</div>
              ${playersHtml}
            </div>
          `;
      })
      .join('');

    this.leaderboard.innerHTML = leaderboardHtml;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Update scores without re-rendering entire leaderboard (preserves player badges)
  updateLeaderboardScores(leaderboard) {
    if (!this.leaderboard || !leaderboard) return;

    const currentActivity = this.getCurrentActivity();
    const mode = this.leaderboardMode || ((currentActivity && currentActivity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team');
    const lowerIsBetter = (this.leaderboardLowerIsBetter !== undefined) ? this.leaderboardLowerIsBetter : SharedUtils.isLowerBetter(currentActivity);
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');

    if (mode === 'player') {
      // leaderboard is a player array
      leaderboard.forEach((player) => {
        const scoreElement = this.leaderboard.querySelector(`[data-player-score="${player.id}"]`);
        if (scoreElement) scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(player.score) : player.score;
      });
      return;
    }

    // Team mode update
    leaderboard.forEach((team) => {
      const scoreElement = this.leaderboard.querySelector(`[data-team-score="${team.id}"]`);
      if (scoreElement) {
        scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(team.score) : team.score;
      }

      // Update player badges if in team_with_players mode or in time mode
      if ((mode === 'player' || mode === 'team_with_players' || isTimeMode) && team.players) {
        team.players.forEach((player) => {
          const playerBadges = this.leaderboard.querySelectorAll('.player-badge');
          playerBadges.forEach((badge) => {
            const badgeText = badge.textContent;
            const playerScore = team.playerScores[String(player.id)];
            const hasPlayerScore = (playerScore !== undefined && playerScore !== null);
            const displayPlayerScore = isTimeMode && (playerScore !== undefined && playerScore !== null) ? SharedUtils.formatMs(playerScore) : playerScore;
            const playerName = player.position ? `${player.name} (${player.position})` : player.name;
            if (badgeText.includes(playerName)) {
              if (hasPlayerScore) {
                badge.innerHTML = `${this.escapeHtml(playerName)}: <strong>${this.escapeHtml(String(displayPlayerScore))}</strong>`;
              } else {
                badge.innerHTML = `${this.escapeHtml(playerName)}`;
              }
            }
          });
        });
      }
    });
  }

  async loadRecentScores() {
    try {
      const response = this.selectedActivityId
        ? await api.getActivityScores(this.selectedActivityId)
        : await api.get(`/api/v1/sessions/${this.sessionId}/scores`);
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

        // Check if there's a player name
        const teamDisplay = team ? team.name : 'Onbekend team';
        const playerDisplay = score.player_name ? ` - ${score.player_name}` : '';

        return `
        <div class="score-item">
          <div class="score-team">${teamDisplay}${playerDisplay}</div>
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
    const currentActivity = this.getCurrentActivity();
    // In time mode, delta represents seconds to add/subtract
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      const currentMs = SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0;
      const newMs = Math.max(0, currentMs + (delta * 1000));
      this.pointsInput.value = SharedUtils.formatMs(newMs);
      return;
    }

    let currentValue = parseInt(this.pointsInput.value) || 0;
    currentValue += delta;
    if (currentValue < -100) currentValue = -100;
    if (currentValue > 100) currentValue = 100;
    this.pointsInput.value = currentValue;
  }

  selectTeam(teamId) {
    this.teamSelect.value = teamId;
    // Trigger the team change event to load players
    this.onTeamChange();

    // Populate current team points/time into hidden pointsInput and clear time/minute inputs for new input
    const lb = this.leaderboardData || [];
    const entry = lb.find(t => String(t.id) === String(teamId));
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    const currentScore = entry ? (entry.score || 0) : 0;
    if (this.pointsInput) {
      this.pointsInput.value = isTimeMode ? SharedUtils.formatMs(currentScore) : currentScore;
    }
    // Clear dedicated minute/second inputs so user can type a delta (for Add) or a replacement (for Set)
    if (this.setMinInput) this.setMinInput.value = '';
    if (this.setSecInput) this.setSecInput.value = '';
    if (this.setMsInput) this.setMsInput.value = '';

    // Focus appropriate input depending on scoring mode
    if (isTimeMode) {
      // prefer minute inputs for time mode
      if (this.setMinInput) this.setMinInput.focus();
    } else {
      if (this.pointsInput) this.pointsInput.focus();
    }
  }

  // Select a team and player together (used by leaderboard player badges)
  selectTeamAndPlayer(teamId, playerId) {
    if (!teamId) return;
    this.teamSelect.value = teamId;
    // Trigger team change first to load players
    this.onTeamChange().then(() => {
      // After players are loaded, select the specific player when available
      setTimeout(() => {
        if (this.playerSelect && String(playerId) !== 'null') {
          this.playerSelect.value = playerId;
        }

        // Populate current player points/time into hidden pointsInput and clear timeInput for new input
        const lb = this.leaderboardData || [];
        const teamEntry = lb.find(t => String(t.id) === String(teamId));
        let playerScore = 0;
        if (teamEntry && teamEntry.playerScores && playerId && teamEntry.playerScores[playerId] !== undefined) {
          playerScore = teamEntry.playerScores[playerId];
        }
        const currentActivity = this.getCurrentActivity();
        const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
        if (this.pointsInput) this.pointsInput.value = isTimeMode ? SharedUtils.formatMs(playerScore) : playerScore;
        // Clear minute/second inputs
        if (this.setMinInput) this.setMinInput.value = '';
        if (this.setSecInput) this.setSecInput.value = '';
        if (this.setMsInput) this.setMsInput.value = '';

        // Focus appropriate input depending on scoring mode
        if (isTimeMode) {
          if (this.setMinInput) this.setMinInput.focus();
        } else {
          if (this.pointsInput) this.pointsInput.focus();
        }
      }, 100);
    }).catch((e) => console.warn('selectTeamAndPlayer: failed to load players', e));
  }

  // Set time using minute/second/ms inputs (primary flow)
  setTimeFromInput() {
    // Delegate to setTimeFromInputs for consistent behavior
    this.setTimeFromInputs();
  }

  // Add time fallback delegates to the consolidated Add handler
  addTimeFromInput() {
    this.addTimeFromInputs();
  }

  // Set time from the "Set Time" inputs (mins, secs, ms) — now fetches authoritative current value before computing delta
  async setTimeFromInputs() {
    if (!this.setMinInput || !this.setSecInput || !this.setMsInput || !this.pointsInput) return;
    const mins = parseInt(this.setMinInput.value) || 0;
    const secs = parseInt(this.setSecInput.value) || 0;
    const ms = parseInt(this.setMsInput.value) || 0;
    if (secs < 0 || secs > 59 || ms < 0 || ms > 999 || mins < 0) {
      alert('Voer een geldige tijd in (seconden 0-59, milliseconden 0-999).');
      return;
    }
    const desiredMs = (mins * 60000) + (secs * 1000) + ms;

    // Determine the team/player context
    const teamId = parseInt(this.teamSelect && this.teamSelect.value) || null;
    const playerId = this.playerSelect && this.playerSelect.value ? parseInt(this.playerSelect.value) : null;

    // Disable buttons to avoid double actions
    if (this.setTimeBtn) this.setTimeBtn.disabled = true;
    if (this.addTimeBtn) this.addTimeBtn.disabled = true;

    // Get authoritative current value (try API, fallback to cached leaderboard or UI)
    let currentMs = 0;
    try {
      currentMs = await this.getCurrentRecordedMs(teamId, playerId);
    } catch (err) {
      // fallback
      const lb = this.leaderboardData || [];
      if (playerId && teamId) {
        const teamEntry = lb.find(t => String(t.id) === String(teamId));
        if (teamEntry && teamEntry.playerScores && teamEntry.playerScores[playerId] !== undefined) {
          currentMs = teamEntry.playerScores[playerId] || 0;
        } else {
          currentMs = SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0;
        }
      } else if (teamId) {
        const teamEntry = lb.find(t => String(t.id) === String(teamId));
        currentMs = teamEntry ? (teamEntry.score || 0) : (SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0);
      } else {
        currentMs = SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0;
      }
    }

    const deltaMs = desiredMs - currentMs;

    if (typeof console !== 'undefined' && console.debug) {
      console.debug('Set Time (after refresh):', { teamId, playerId, desiredMs, currentMs, deltaMs });
    }

    if (deltaMs === 0) {
      this.showScoreFeedback('Tijd is al ingesteld op die waarde', 'info');
      if (this.setTimeBtn) this.setTimeBtn.disabled = false;
      if (this.addTimeBtn) this.addTimeBtn.disabled = false;
      return;
    }

    const newMs = Math.max(0, currentMs + deltaMs);
    this.pointsInput.value = SharedUtils.formatMs(newMs);
    this.pointsInput.focus();

    // Submit the delta so backend applies the change as an incremental score
    await this.submitDeltaScore(deltaMs);

    if (this.setTimeBtn) this.setTimeBtn.disabled = false;
    if (this.addTimeBtn) this.addTimeBtn.disabled = false;
  }

  // Add time using the same minute/second/ms inputs used for Set (consolidated UX)
  async addTimeFromInputs() {
    if (!this.setMinInput || !this.setSecInput || !this.setMsInput || !this.pointsInput) return;
    const mins = parseInt(this.setMinInput.value) || 0;
    const secs = parseInt(this.setSecInput.value) || 0;
    const ms = parseInt(this.setMsInput.value) || 0;
    if (secs < 0 || secs > 59 || ms < 0 || ms > 999 || mins < 0) {
      alert('Voer een geldige tijd in (seconden 0-59, milliseconden 0-999).');
      return;
    }
    const deltaMs = (mins * 60000) + (secs * 1000) + ms;

    // Determine the team/player context
    const teamId = parseInt(this.teamSelect && this.teamSelect.value) || null;
    const playerId = this.playerSelect && this.playerSelect.value ? parseInt(this.playerSelect.value) : null;

    // Disable buttons to avoid double actions
    if (this.setTimeBtn) this.setTimeBtn.disabled = true;
    if (this.addTimeBtn) this.addTimeBtn.disabled = true;

    // Get authoritative current value (try API, fallback to cached leaderboard or UI)
    let currentMs = 0;
    try {
      currentMs = await this.getCurrentRecordedMs(teamId, playerId);
    } catch (err) {
      const lb = this.leaderboardData || [];
      if (playerId && teamId) {
        const teamEntry = lb.find(t => String(t.id) === String(teamId));
        if (teamEntry && teamEntry.playerScores && teamEntry.playerScores[playerId] !== undefined) {
          currentMs = teamEntry.playerScores[playerId] || 0;
        } else {
          currentMs = SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0;
        }
      } else if (teamId) {
        const teamEntry = lb.find(t => String(t.id) === String(teamId));
        currentMs = teamEntry ? (teamEntry.score || 0) : (SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0);
      } else {
        currentMs = SharedUtils.parseTimeToMs(String(this.pointsInput.value || '')) || 0;
      }
    }

    const newMs = Math.max(0, currentMs + deltaMs);
    this.pointsInput.value = SharedUtils.formatMs(newMs);
    this.pointsInput.focus();

    // Debug
    if (typeof console !== 'undefined' && console.debug) console.debug('Add Time (after refresh):', { teamId, playerId, deltaMs, currentMs, newMs });

    // Submit the delta so backend applies the change as an incremental score
    await this.submitDeltaScore(deltaMs);

    if (this.setTimeBtn) this.setTimeBtn.disabled = false;
    if (this.addTimeBtn) this.addTimeBtn.disabled = false;
  }

  // Submit current time as a session score (time mode) — kept for compatibility
  submitTimeAsScore() {
    // call the submitScore path but indicate it's a time submission
    this.submitScore(true);
  }

  // Retrieve the current recorded total time (ms) for a team or player from API (fresh)
  async getCurrentRecordedMs(teamId, playerId) {
    // Prefer activity-level scores when available
    try {
      let allScores = [];
      if (this.selectedActivityId) {
        const resp = await api.getActivityScores(this.selectedActivityId).catch(() => ({ scores: [] }));
        allScores = resp.scores || [];
      } else {
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/scores`).catch(() => ({ scores: [] }));
        allScores = resp.scores || [];
      }

      // Sum up points that apply to the team/player
      let total = 0;
      allScores.forEach((s) => {
        if (Number(s.team_id) !== Number(teamId)) return;
        if (playerId && Number(s.player_id) !== Number(playerId)) return;
        total += (s.points || 0);
      });
      return total || 0;
    } catch (err) {
      console.warn('getCurrentRecordedMs: failed to fetch scores, will fallback', err);
      throw err;
    }
  }

  // Submit a delta score (used for Set which calculates difference and Add which adds a delta)
  async submitDeltaScore(deltaMs) {
    // Prevent double submissions
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Disable submit and quick buttons
    if (this.submitScoreBtn) this.submitScoreBtn.disabled = true;
    if (this.setTimeBtn) this.setTimeBtn.disabled = true;
    if (this.addTimeBtn) this.addTimeBtn.disabled = true;
    const quickButtons = document.querySelectorAll('.quick-btn, .custom-action-btn');
    quickButtons.forEach((b) => (b.disabled = true));

    const teamId = parseInt(this.teamSelect.value);
    const playerId = this.playerSelect.value ? parseInt(this.playerSelect.value) : null;

    if (!teamId) {
      alert('Selecteer een team.');
      this.teamSelect.focus();
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      if (this.setTimeBtn) this.setTimeBtn.disabled = false;
      if (this.addTimeBtn) this.addTimeBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
      return;
    }

    // Log for diagnostics
    if (typeof console !== 'undefined' && console.debug) console.debug('Submitting delta:', deltaMs, { teamId, playerId });

    // Block team-level time delta when activity requires player times for aggregation
    const currentActivity = this.getCurrentActivity();
    const mode = (currentActivity && currentActivity.scoring_mode) || (this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode);
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    const aggregatePlayerTimes = !!(currentActivity && currentActivity.aggregate_player_times);
    if (isTimeMode && mode === 'team_with_players' && aggregatePlayerTimes && !playerId) {
      this.showInlineError('set-ms', 'Selecteer een speler: tijden moeten per-speler worden ingegeven in deze activiteit.');
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      if (this.setTimeBtn) this.setTimeBtn.disabled = false;
      if (this.addTimeBtn) this.addTimeBtn.disabled = false;
      const quickButtons = document.querySelectorAll('.quick-btn, .custom-action-btn');
      quickButtons.forEach((b) => (b.disabled = false));
      return;
    }

    // Prepare real-time acknowledgement listener before sending
    const ackPromise = new Promise((resolve) => {
      const handler = (data) => {
        if (data && String(data.session_id) === String(this.sessionId) && Number(data.team_id) === teamId && Number(data.points) === deltaMs) {
          api.off('session_score_update', handler);
          resolve(true);
        }
      };
      api.on('session_score_update', handler);

      // Fallback timeout
      setTimeout(() => {
        api.off('session_score_update', handler);
        resolve(false);
      }, 1500);
    });

    try {
      const currentActivity = this.getCurrentActivity();

      // Construct score payload using deltaMs as points
      const scoreDataBase = {
        activity_id: parseInt(this.selectedActivityId),
        team_id: teamId,
        points: deltaMs,
        round_number: this.session.current_round,
      };

      if (playerId) {
        scoreDataBase.player_id = playerId;
      }

      if (this.selectedActivityId) {
        await api.createActivityScore(this.selectedActivityId, scoreDataBase);
      } else {
        await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, scoreDataBase);
      }

      this.onScoreSubmitSuccess(teamId, deltaMs);
    } catch (error) {
      const acknowledged = await ackPromise;
      if (acknowledged) {
        this.onScoreSubmitSuccess(teamId, deltaMs);
      } else {
        api.handleError(error, 'submitting delta score');
        alert('Fout bij het toevoegen van de score.');
      }
    } finally {
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      if (this.setTimeBtn) this.setTimeBtn.disabled = false;
      if (this.addTimeBtn) this.addTimeBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
    }
  }

  // Return the currently selected activity object or null
  getCurrentActivity() {
    if (!this.selectedActivityId || !this.activities) return null;
    return this.activities.find(a => String(a.id) === String(this.selectedActivityId)) || null;
  }

    // Allow Enter key in ms input to submit Set immediately
    setupTimeInputEnter() {
      if (this.setMsInput) this.setMsInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.setTimeFromInputs(); });
    }


  async submitScore(isTimeSubmit = false) {
    // Prevent double submissions
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    // Disable submit and quick buttons
    if (this.submitScoreBtn) this.submitScoreBtn.disabled = true;
    const quickButtons = document.querySelectorAll('.quick-btn, .custom-action-btn');
    quickButtons.forEach((b) => (b.disabled = true));

    const teamId = parseInt(this.teamSelect.value);
    const playerId = this.playerSelect.value ? parseInt(this.playerSelect.value) : null;
    let points = this.pointsInput.value;
    const currentActivity = this.getCurrentActivity();
    const mode = (currentActivity && currentActivity.scoring_mode) || (this.activity && this.activity.scoring_mode) || (this.session && this.session.scoring_mode);

    // Reason should be included for non-time modes; for team_vs_time we send no reason
    const reason = (currentActivity && String(currentActivity.game_type) === 'team_vs_time') ? '' : (this.reasonInput ? this.reasonInput.value.trim() : '');

    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      // Parse time string into milliseconds
      points = SharedUtils.parseTimeToMs(String(points || '').trim());
      if (isNaN(points)) {
        alert('Voer een geldige tijd in (mm:ss(.ms) of seconden).');
        this.pointsInput.focus();
        this.isSubmitting = false;
        if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
        quickButtons.forEach((b) => (b.disabled = false));
        return;
      }

      // If activity requires player-times aggregation and scoring mode expects players,
      // block team-level time submissions to avoid inconsistent team totals.
      const aggregatePlayerTimes = !!(currentActivity && currentActivity.aggregate_player_times);
      if (mode === 'team_with_players' && aggregatePlayerTimes && !playerId) {
        this.showInlineError('points-input', 'Selecteer een speler: deze activiteit gebruikt speler-tijden om het teamtotaal te berekenen.');
        this.isSubmitting = false;
        if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
        quickButtons.forEach((b) => (b.disabled = false));
        return;
      }
    } else {
      points = parseInt(points);
    }

    if (!teamId) {
      alert('Selecteer een team.');
      this.teamSelect.focus();
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
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

      // Fallback timeout
      setTimeout(() => {
        api.off('session_score_update', handler);
        resolve(false);
      }, 1500);
    });

    try {
      // Handle different scoring modes
      if (mode === 'team_with_players') {
        // Team-with-players: scoring whole team adds a single team score
        if (!playerId) {
          const scoreData = {
            activity_id: parseInt(this.selectedActivityId),
            team_id: teamId,
            points: points,
            reason: reason || 'Team score',
            round_number: this.session.current_round,
          };
          if (this.selectedActivityId) {
            await api.createActivityScore(this.selectedActivityId, scoreData);
          } else {
            await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, scoreData);
          }
        } else {
          // Scoring a specific player: create only the player score entry.
          // Player scores already contribute to the team's total via team_id.
          const playerScoreData = {
            activity_id: parseInt(this.selectedActivityId),
            team_id: teamId,
            player_id: playerId,
            points: points,
            reason: reason || 'Player score',
            round_number: this.session.current_round,
          };

          if (this.selectedActivityId) {
            await api.createActivityScore(this.selectedActivityId, playerScoreData);
          } else {
            await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, playerScoreData);
          }
        }
      } else {
        // Standard team or player scoring
        const scoreData = {
          activity_id: parseInt(this.selectedActivityId),
          team_id: teamId,
          points: points,
          reason: reason || 'Handmatig',
          round_number: this.session.current_round,
        };

        // Include player_id if a specific player was selected
        if (playerId) {
          scoreData.player_id = playerId;
        }

        // posting score: use activity flow when available
        if (this.selectedActivityId) {
          await api.createActivityScore(this.selectedActivityId, scoreData);
        } else {
          await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, scoreData);
        }
      }

      // Treat as success
      this.onScoreSubmitSuccess(teamId, points);
    } catch (error) {
      // If the API call failed, but we got a realtime event, treat it as success
      const acknowledged = await ackPromise;
      if (acknowledged) {
        this.onScoreSubmitSuccess(teamId, points);
      } else {
        api.handleError(error, 'submitting score');
        alert('Fout bij het toevoegen van de score.');
      }
    } finally {
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
    }
  }

  showInlineError(fieldId, message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.inline-error-message');
    if (existingError) existingError.remove();

    const field = document.getElementById(fieldId);
    if (!field || !field.parentNode) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'inline-error-message';
    errorDiv.style.cssText = 'color: #dc3545; font-size: 0.9em; margin-top: 4px; padding: 8px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;';
    errorDiv.textContent = message;

    field.parentNode.insertBefore(errorDiv, field.nextSibling);

    // Auto-remove after 4 seconds
    setTimeout(() => errorDiv.remove(), 4000);
  }

  onScoreSubmitSuccess(teamId, points) {
    // Remove any error messages on success
    const existingError = document.querySelector('.inline-error-message');
    if (existingError) existingError.remove();

    // Show animation
    this.showScoreAnimation(teamId, points);

    const currentActivity = this.getCurrentActivity();

    // Reset form (but keep team and player selected for quick re-entry)
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      // reset to 0 time display and clear set/add inputs
      if (this.pointsInput) this.pointsInput.value = SharedUtils.formatMs(0);
      if (this.setMinInput) this.setMinInput.value = '';
      if (this.setSecInput) this.setSecInput.value = '';
      if (this.setMsInput) this.setMsInput.value = '';
      if (this.addMinInput) this.addMinInput.value = '';
      if (this.addSecInput) this.addSecInput.value = '';
      if (this.addMsInput) this.addMsInput.value = '';
    } else {
      if (this.reasonInput) this.reasonInput.value = '';
      if (this.pointsInput) this.pointsInput.value = 1;
    }

    // Reload leaderboard to show updated scores (this also loads players)
    this.loadLeaderboard();

    // Load recent scores with a small delay to ensure the score is saved
    setTimeout(() => {
      this.loadRecentScores();
    }, 500);
  }

  addQuickScore(reason, points) {
    // Prevent double submission from quick actions
    if (this.isSubmitting) {
      return;
    }

    const teamId = parseInt(this.teamSelect.value);
    if (!teamId) {
      alert('Selecteer eerst een team.');
      return;
    }

    this.pointsInput.value = points;
    this.reasonInput.value = reason;
    // Call submitScore (guarded by isSubmitting)
    this.submitScore();
  }

  showScoreAnimation(teamId, points) {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return;

    this.animTeamIcon.textContent = this.getIconEmoji(team.icon);
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    this.animScoreChange.textContent = `${points >= 0 ? '+' : ''}${isTimeMode ? SharedUtils.formatMs(points) : points}`;
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
      window.location.href = 'index.html';
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

    if (!this.session || !this.session.time_limit || this.session.time_limit === 0) {
      this.timer.textContent = 'Geen tijdslimiet';
      this.timer.style.color = '#6c757d';
      this.timer.style.fontSize = '0.9em';
      return;
    }

    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.timer.style.fontSize = '1em';

    // Color coding based on time remaining
    if (this.timeRemaining < 60) {
      this.timer.style.color = '#dc3545'; // Red for last minute
    } else if (this.timeRemaining < 300) {
      this.timer.style.color = '#ffc107'; // Yellow for last 5 minutes
    } else {
      this.timer.style.color = '#28a745'; // Green
    }
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
    // Handle different timestamp formats
    let timestamp;
    if (typeof date === 'string') {
      // Assume timestamps from server are in CET (with +01:00 or +02:00), treat as is
      let dateString = date;
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-')) {
        // If no timezone info, assume UTC and add 'Z'
        if (dateString.includes('T')) {
          dateString += 'Z';
        }
      }
      timestamp = new Date(dateString);

      // If that doesn't work, fallback to original parsing
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date(date);
      }
    } else {
      timestamp = new Date(date);
    }

    const now = new Date();
    const diffMs = now - timestamp;

    // Handle future timestamps (shouldn't happen for scores, but be robust)
    if (diffMs < 0) {
      return 'Zojuist';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays < 30) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
    if (diffMonths < 12) return `${diffMonths} maand${diffMonths > 1 ? 'en' : ''} geleden`;
    return `${diffYears} jaar geleden`;
  }

  handleScoreUpdate(data) {
    if (data.session_id == this.sessionId) {
      // Determine scoring mode (prefer stored values from last load)
      const currentActivity = this.getCurrentActivity();
      const mode = this.leaderboardMode || ((currentActivity && currentActivity.scoring_mode) || (this.session && this.session.scoring_mode) || 'team');
      const lowerIsBetter = (this.leaderboardLowerIsBetter !== undefined) ? this.leaderboardLowerIsBetter : SharedUtils.isLowerBetter(currentActivity);

      // Update the cached leaderboard data
      if (this.leaderboardData) {
        if (mode === 'player') {
          // Player mode: update by player_id
          const pid = data.player_id;
          const playerIndex = this.leaderboardData.findIndex((p) => p.id === pid);
          if (playerIndex !== -1) {
            this.leaderboardData[playerIndex].score += (data.points || 0);

            // Sort using lowerIsBetter if golf
            this.leaderboardData.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

            this.updateLeaderboardScores(this.leaderboardData);
          } else {
            // Player not present, reload full leaderboard
            this.loadLeaderboard();
          }
        } else {
          // Team mode: existing behavior
          const teamIndex = this.leaderboardData.findIndex((t) => t.id === data.team_id);
          if (teamIndex !== -1) {
            // Update team score
            this.leaderboardData[teamIndex].score += (data.points || 0);

            // Update player scores if available
            if (data.player_scores) {
              this.leaderboardData[teamIndex].playerScores = data.player_scores;
            }

            // Sort leaderboard by score (respect golf)
            this.leaderboardData.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

            // Update scores in place without full re-render (preserves player badges)
            this.updateLeaderboardScores(this.leaderboardData);
          } else {
            // Team not in leaderboard yet, do full reload
            this.loadLeaderboard();
          }
        }
      } else {
        // No cached data, do full reload
        this.loadLeaderboard();
      }

      // Load recent scores to show the new score entry
      this.loadRecentScores();

      // Only reload teams if no team is currently selected
      if (!this.teamSelect.value) {
        this.loadTeams();
      }
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
          <button type="button" class="custom-action-btn" onclick="scoreInput.addQuickScore('${action.reason.replace(/'/g, "\\'")}', ${action.points})">
            ${action.reason} (${action.points >= 0 ? '+' : ''}${action.points})
            <button type="button" class="custom-action-btn remove" onclick="event.stopPropagation(); scoreInput.removeCustomQuickAction(${action.id})" title="Verwijderen">×</button>
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
  try {
    scoreInput = new ScoreInput();
  } catch (e) {
    console.error('Failed to initialize ScoreInput', e);
    window.showGlobalFatalError && window.showGlobalFatalError('Fout bij initialisatie ScoreInput: ' + (e && e.message ? e.message : String(e)));
  }
});
