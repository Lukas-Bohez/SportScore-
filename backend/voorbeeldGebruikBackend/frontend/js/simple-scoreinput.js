/**
 * Score Input - Session Score Management System
 * 
 * A comprehensive score management interface supporting:
 * - Multiple scoring modes (team, player, team_with_players)
 * - Time-based competitions with configurable aggregation
 * - Activity-based (station) scoring
 * - Real-time score updates
 * - Custom quick actions
 * - Participant and admin modes
 * 
 * @author SportScore Team
 * @version 2.0.0
 */

// ============================================================================
// Constants & Configuration
// ============================================================================

const SCORE_CONFIG = {
  MIN_POINTS: -100,
  MAX_POINTS: 100,
  ANIMATION_DURATION: 2000,
  RELOAD_DELAY: 500,
  ACK_TIMEOUT: 1500
};

const SPORT_QUICK_BUTTONS = {
  quiz: [
    { label: '+1 Juist', points: 1, reason: 'Juist Antwoord', class: 'correct' },
    { label: '-1 Verkeerd', points: -1, reason: 'Verkeerd Antwoord', class: 'wrong' },
    { label: '+3 Bonus', points: 3, reason: 'Bonusvraag', class: 'bonus' },
    { label: '+5 Perfect', points: 5, reason: 'Perfecte Ronde', class: 'bonus' }
  ],
  voetbal: [
    { label: '⚽ Doelpunt +1', points: 1, reason: 'Doelpunt', class: 'goal' },
    { label: '🎯 Penalty +1', points: 1, reason: 'Penalty', class: 'penalty' },
    { label: '🅰️ Assist +1', points: 1, reason: 'Assist', class: 'bonus' },
    { label: '🟨 Gele Kaart -1', points: -1, reason: 'Gele Kaart', class: 'wrong' },
    { label: '🟥 Rode Kaart -3', points: -3, reason: 'Rode Kaart', class: 'penalty' }
  ],
  basketbal: [
    { label: '🏀 Free Throw +1', points: 1, reason: 'Vrije Worp', class: 'correct' },
    { label: '🎯 2-Pointer +2', points: 2, reason: '2-Punter', class: 'bonus' },
    { label: '🌟 3-Pointer +3', points: 3, reason: '3-Punter', class: 'bonus' },
    { label: '🚫 Fout -1', points: -1, reason: 'Fout', class: 'wrong' }
  ],
  volleybal: [
    { label: '🏐 Punt +1', points: 1, reason: 'Punt', class: 'correct' },
    { label: '⚡ Ace +2', points: 2, reason: 'Service Ace', class: 'bonus' },
    { label: '🛡️ Block +1', points: 1, reason: 'Blok', class: 'correct' },
    { label: '❌ Fout -1', points: -1, reason: 'Fout', class: 'wrong' }
  ],
  hockey: [
    { label: '🏑 Doelpunt +1', points: 1, reason: 'Doelpunt', class: 'goal' },
    { label: '🎯 Penalty +1', points: 1, reason: 'Strafcorner', class: 'penalty' },
    { label: '🟨 Gele Kaart -1', points: -1, reason: 'Gele Kaart', class: 'wrong' },
    { label: '🟥 Rode Kaart -3', points: -3, reason: 'Rode Kaart', class: 'penalty' }
  ],
  tennis: [
    { label: '🎾 Game +1', points: 1, reason: 'Game Gewonnen', class: 'correct' },
    { label: '🏆 Set +5', points: 5, reason: 'Set Gewonnen', class: 'bonus' },
    { label: '⚡ Ace +1', points: 1, reason: 'Ace', class: 'bonus' },
    { label: '❌ Dubbelfout -1', points: -1, reason: 'Dubbelfout', class: 'wrong' }
  ],
  atletiek: [
    { label: '🥇 1e Plaats +3', points: 3, reason: '1e Plaats', class: 'bonus' },
    { label: '🥈 2e Plaats +2', points: 2, reason: '2e Plaats', class: 'correct' },
    { label: '🥉 3e Plaats +1', points: 1, reason: '3e Plaats', class: 'correct' },
    { label: '⏱️ Record +5', points: 5, reason: 'Record Verbroken', class: 'bonus' }
  ],
  zwemmen: [
    { label: '🥇 1e Plaats +3', points: 3, reason: '1e Plaats', class: 'bonus' },
    { label: '🥈 2e Plaats +2', points: 2, reason: '2e Plaats', class: 'correct' },
    { label: '🥉 3e Plaats +1', points: 1, reason: '3e Plaats', class: 'correct' },
    { label: '⏱️ Record +5', points: 5, reason: 'Persoonlijk Record', class: 'bonus' }
  ],
  esports: [
    { label: '💀 Kill +1', points: 1, reason: 'Elimination', class: 'correct' },
    { label: '💥 Multi-Kill +3', points: 3, reason: 'Multi-Kill', class: 'bonus' },
    { label: '🎯 Objective +2', points: 2, reason: 'Doelwit Behaald', class: 'correct' },
    { label: '☠️ Death -1', points: -1, reason: 'Geëlimineerd', class: 'wrong' },
    { label: '🏆 Victory +10', points: 10, reason: 'Victory Royale', class: 'bonus' }
  ],
  custom: [
    { label: '+5 Bonus', points: 5, reason: 'Bonus', class: 'bonus' },
    { label: '-2 Penalty', points: -2, reason: 'Penalty', class: 'penalty' },
    { label: '+1 Punt', points: 1, reason: 'Punt', class: 'correct' },
    { label: '-1 Aftrek', points: -1, reason: 'Aftrek', class: 'wrong' }
  ]
};

const ICON_MAP = {
  team: '👥', star: '⭐', fire: '🔥', rocket: '🚀', trophy: '🏆',
  lightning: '⚡', heart: '❤️', diamond: '💎', crown: '👑', superhero: '🦸'
};

// ============================================================================
// Utility Functions
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeColor(color) {
  if (!color) return '#333333';
  try {
    let c = String(color).trim();
    if (!c.startsWith('#')) c = `#${c}`;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    return '#333333';
  } catch {
    return '#333333';
  }
}

function getIconEmoji(iconName) {
  return ICON_MAP[iconName] || '👥';
}

function getTimeAgo(date) {
  let timestamp;
  if (typeof date === 'string') {
    let dateString = date;
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-')) {
      if (dateString.includes('T')) dateString += 'Z';
    }
    timestamp = new Date(dateString);
    if (isNaN(timestamp.getTime())) timestamp = new Date(date);
  } else {
    timestamp = new Date(date);
  }

  const diffMs = new Date() - timestamp;
  if (diffMs < 0) return 'Zojuist';

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

// ============================================================================
// Main ScoreInput Class
// ============================================================================

class ScoreInput {
  constructor() {
    // Session & Activity State
    this.sessionId = this.extractSessionId();
    this.session = null;
    this.activities = [];
    this.selectedActivityId = null;
    this.activeActivityId = null;
    
    // Team & Player State
    this.teams = [];
    this.participantName = null;
    
    // UI State
    this.recentScoresData = [];
    this.leaderboardData = null;
    this.leaderboardMode = null;
    this.leaderboardLowerIsBetter = false;
    this.customQuickActions = [];
    this.isSubmitting = false;
    
    // Timer State (for countdown)
    this.timeRemaining = 0;
    this.timerInterval = null;
    
    // Round State
    this.currentActivity = null;
    this.roundStatus = 'not_started';
    this.currentRound = 1;
    this.totalRounds = 1;
    this.roundStartTime = null;
    this.timeLimitPerRound = null;
    this.roundTimeRemaining = 0;
    this.roundTimerInterval = null;
    
    // Utilities
    this.sharedUtils = new SharedUtils(api);
    
    // DOM Elements (bound in bindElements)
    this.elements = {};
    
    if (!this.sessionId) {
      this.showFatalError('Geen sessie ID gevonden in de URL. Voeg ?session=<id> toe.');
      return;
    }
    
    this.initialize();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  extractSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    let sessionId = urlParams.get('session');
    
    // Try localStorage as fallback
    if (!sessionId) {
      try {
        const stored = localStorage.getItem('playerSession');
        if (stored) {
          const ps = JSON.parse(stored);
          if (ps?.sessionId) {
            sessionId = String(ps.sessionId);
            this.participantName = ps.playerName || null;
          }
        }
      } catch (error) {
        console.warn('Failed to load player session from localStorage:', error);
      }
    }
    
    return sessionId;
  }

  async initialize() {
    try {
      console.debug(`ScoreInput: initializing for session=${this.sessionId}`);
      
      this.bindElements();
      this.setupEventListeners();
      this.loadCustomQuickActions();
      
      await this.loadSession();
      await this.loadTeams();
      await this.loadActivities();
      this.loadRecentScores();
    } catch (error) {
      console.error('ScoreInput init failed:', error);
      this.showFatalError('Fout bij initialisatie. Controleer de console voor details.');
    }
  }

  bindElements() {
    const ids = [
      // Header
      'session-name', 'round-info', 'timer',
      // Round controls
      'round-controls', 'start-round-btn', 'pause-round-btn', 'resume-round-btn',
      'end-round-btn',
      // Main sections
      'leaderboard', 'team-select', 'player-select', 'points-input', 
      'reason-input', 'submit-score-btn', 'recent-scores',
      // Quick actions
      'sport-quick-buttons',
      // Control buttons
      'subtract-btn', 'add-btn', 'pause-session-btn', 'end-session-btn',
      // Time controls
      'time-controls', 'set-minutes', 'set-seconds', 'set-ms',
      'set-time-btn', 'add-minutes', 'add-seconds', 'add-ms', 'add-time-btn',
      // Groups
      'points-group', 'reason-group', 'player-select-group',
      // Animation
      'score-animation', 'anim-team-icon', 'anim-score-change', 'anim-team-name',
      // Custom actions
      'custom-quick-actions', 'custom-reason', 'custom-points', 'add-custom-action',
      'leaderboard-title'
    ];
    
    ids.forEach(id => {
      this.elements[this.toCamelCase(id)] = document.getElementById(id);
    });
    
    // Additional elements by selector
    this.elements.leaderboardSection = document.querySelector('.leaderboard-section');
    this.elements.recentScoresSection = document.querySelector('.recent-scores-section');
    this.elements.customQuickActionsSection = document.querySelector('.custom-quick-actions-section');
  }

  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  setupEventListeners() {
    // Score controls
    this.elements.subtractBtn?.addEventListener('click', () => this.adjustPoints(-1));
    this.elements.addBtn?.addEventListener('click', () => this.adjustPoints(1));
    
    // Team/Player selection
    this.elements.teamSelect?.addEventListener('change', () => this.onTeamChange());
    
    // Form submission
    this.elements.submitScoreBtn?.addEventListener('click', () => this.submitScore());
    this.elements.reasonInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.submitScore();
    });
    
    // Points input validation
    this.elements.pointsInput?.addEventListener('input', (e) => this.validatePointsInput(e));
    
    // Time controls
    this.elements.setTimeBtn?.addEventListener('click', () => this.setTimeFromInputs());
    this.elements.addTimeBtn?.addEventListener('click', () => this.addTimeFromInputs());
    this.elements.setMs?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.setTimeFromInputs();
    });
    
    // Round controls
    this.elements.startRoundBtn?.addEventListener('click', () => this.startRound());
    this.elements.pauseRoundBtn?.addEventListener('click', () => this.pauseRound());
    this.elements.resumeRoundBtn?.addEventListener('click', () => this.resumeRound());
    this.elements.endRoundBtn?.addEventListener('click', () => this.endRound());
    
    // Session controls
    this.elements.pauseSessionBtn?.addEventListener('click', () => this.togglePause());
    this.elements.endSessionBtn?.addEventListener('click', () => this.endSession());
    
    // Custom quick actions
    this.elements.addCustomAction?.addEventListener('click', () => this.addCustomQuickAction());
    
    // Real-time updates
    api.on('session_score_update', (data) => this.handleScoreUpdate(data));
    api.on('session_status_update', (data) => this.handleStatusUpdate(data));
    
    // Round real-time events
    api.on('round_started', (data) => this.handleRoundStarted(data));
    api.on('round_ended', (data) => this.handleRoundEnded(data));
    api.on('round_changed', (data) => this.handleRoundChanged(data));
    api.on('round_paused', (data) => this.handleRoundPaused(data));
    api.on('round_resumed', (data) => this.handleRoundResumed(data));
    api.on('round_time_update', (data) => this.handleRoundTimeUpdate(data));
    api.on('round_auto_advanced', (data) => this.handleRoundAutoAdvanced(data));
    api.on('activity_completed', (data) => this.handleActivityCompleted(data));
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  validatePointsInput(e) {
    const currentActivity = this.getCurrentActivity();
    
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      // Time mode: allow time format
      e.target.value = e.target.value.replace(/[^0-9:\.\s]/g, '').trim();
      return;
    }
    
    // Normal mode: numeric validation
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < SCORE_CONFIG.MIN_POINTS) value = SCORE_CONFIG.MIN_POINTS;
    if (value > SCORE_CONFIG.MAX_POINTS) value = SCORE_CONFIG.MAX_POINTS;
    e.target.value = value;
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      
      if ((e.ctrlKey || e.metaKey) && !isInputField) {
        const shortcuts = {
          '1': () => this.addQuickScore('Bonus +5', 5),
          '2': () => this.addQuickScore('Penalty -2', -2),
          '3': () => this.addQuickScore('Juist Antwoord +1', 1),
          '4': () => this.addQuickScore('Verkeerd Antwoord -1', -1),
          's': () => this.submitScore()
        };
        
        if (shortcuts[e.key]) {
          e.preventDefault();
          shortcuts[e.key]();
        }
      }
      
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

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  async loadSession() {
    try {
      console.debug(`ScoreInput: fetching session ${this.sessionId}`);
      this.session = await api.get(`/api/v1/sessions/${this.sessionId}`);
      
      if (!this.session) {
        throw new Error('Lege sessie respons');
      }
      
      this.applyTheme();
      this.loadSportQuickButtons();
      this.updateSessionDisplay();
      this.startTimer();
    } catch (error) {
      console.error('Error loading session:', error);
      this.showFatalError(`Fout bij het laden van de sessie: ${error?.message || String(error)}`);
    }
  }

  async loadActivities() {
    try {
      const response = await api.getSessionActivities(this.sessionId);
      this.activities = response.activities || [];
      this.renderActivities();
      
      // Auto-select first activity if none selected
      if (!this.selectedActivityId && this.activities.length > 0) {
        await this.selectActivity(this.activities[0].id, true);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }

  async loadTeams() {
    try {
      const response = await api.getSessionTeams(this.sessionId);
      this.teams = response.teams || [];
      
      // Preserve existing players
      const existingPlayers = {};
      this.teams.forEach(team => {
        if (team.players) existingPlayers[team.id] = team.players;
      });
      
      this.teams.forEach(team => {
        if (existingPlayers[team.id]) {
          team.players = existingPlayers[team.id];
        }
      });
      
      this.populateTeamSelect();
      
      // Load players if needed
      const mode = this.getScoringMode();
      if (mode === 'player' || mode === 'team_with_players') {
        await this.loadPlayersForAllTeams();
      }
    } catch (error) {
      api.handleError(error, 'loading teams');
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
        // Use player_id (not the join-row id) to keep only players opted into the activity
        const ids = new Set((activityResp.players || []).map(p => p.player_id || p.id));
        activityPlayerIds = ids.size > 0 ? ids : null;
      } catch (error) {
        console.warn('Failed to load activity players:', error);
      }
    }
    
    for (const team of this.teams) {
      try {
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
        let players = resp?.players || [];
        
        if (activityPlayerIds) {
          players = players.filter(p => activityPlayerIds.has(p.id));
        }
        
        team.players = players;
      } catch (error) {
        team.players = [];
      }
    }
  }

  async loadLeaderboard() {
    try {
      await this.ensureActivityDetails(this.selectedActivityId);
      
      const allScores = await this.fetchAllScores();
      const currentActivity = this.getCurrentActivity();
      const mode = this.getScoringMode();
      const lowerIsBetter = SharedUtils.isLowerBetter(currentActivity);
      
      await this.loadPlayersForAllTeams();
      
      const leaderboard = this.calculateLeaderboard(allScores, { mode, lowerIsBetter });
      
      // Cache for incremental updates
      this.leaderboardData = leaderboard;
      this.leaderboardMode = mode;
      this.leaderboardLowerIsBetter = lowerIsBetter;
      
      this.displayLeaderboard(leaderboard, { mode, lowerIsBetter });
    } catch (error) {
      api.handleError(error, 'loading leaderboard');
    }
  }

  async fetchAllScores() {
    if (this.selectedActivityId) {
      const response = await api.getActivityScores(this.selectedActivityId).catch(() => ({ scores: [] }));
      return response.scores || [];
    }
    
    const response = await api.get(`/api/v1/scores?game_id=${this.sessionId}`);
    return response.scores || [];
  }

  async loadRecentScores() {
    try {
      const allScores = await this.fetchAllScores();
      this.recentScoresData = allScores.slice(0, 10);
      this.displayRecentScores();
    } catch (error) {
      api.handleError(error, 'loading recent scores');
    }
  }

  // ==========================================================================
  // Leaderboard Calculation
  // ==========================================================================

  calculateLeaderboard(allScores, options = {}) {
    const mode = options.mode || this.getScoringMode();
    const lowerIsBetter = !!options.lowerIsBetter;
    
    if (!this.teams || !Array.isArray(this.teams)) {
      console.warn('Teams not loaded yet, cannot calculate leaderboard');
      return [];
    }
    
    if (mode === 'player') {
      return this.calculatePlayerLeaderboard(allScores, lowerIsBetter);
    }
    
    return this.calculateTeamLeaderboard(allScores, lowerIsBetter);
  }

  calculatePlayerLeaderboard(allScores, lowerIsBetter) {
    const playerScores = {};
    
    // Initialize players from teams
    this.teams.forEach(team => {
      (team.players || []).forEach(player => {
        playerScores[player.id] = {
          id: player.id,
          name: player.name || player.player_name || `Speler ${player.id}`,
          team_id: team.id,
          team_name: team.name,
          icon: player.icon,
          color: player.color,
          score: 0
        };
      });
    });
    
    // Accumulate scores
    allScores.forEach(score => {
      const pid = score.player_id;
      if (pid !== undefined && pid !== null) {
        if (!playerScores[pid]) {
          playerScores[pid] = {
            id: pid,
            name: score.player_name || `Speler ${pid}`,
            team_id: score.team_id || null,
            team_name: null,
            icon: null,
            color: null,
            score: 0
          };
        }
        playerScores[pid].score += (score.points || 0);
      }
    });
    
    return Object.values(playerScores);
  }

  calculateTeamLeaderboard(allScores, lowerIsBetter) {
    const teamScores = {};
    
    // Initialize teams
    this.teams.forEach(team => {
      teamScores[team.id] = {
        id: team.id,
        name: team.name,
        icon: team.icon,
        score: 0,
        players: team.players || [],
        playerScores: {}
      };
      
      // Initialize player scores
      if (team.players) {
        team.players.forEach(player => {
          teamScores[team.id].playerScores[String(player.id)] = null;
        });
      }
    });
    
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    const aggregatePlayerTimes = currentActivity?.aggregate_player_times || false;
    const timeWinner = (currentActivity?.time_winner || 'lower').toLowerCase();
    
    // Helper to parse points
    const parsePoints = (raw) => {
      if (raw == null) return 0;
      if (!isTimeMode) {
        const n = Number(raw);
        return isNaN(n) ? 0 : n;
      }
      const n = Number(raw);
      if (!isNaN(n)) return n;
      const ms = SharedUtils.parseTimeToMs(String(raw));
      return isNaN(ms) ? 0 : ms;
    };
    
    // Accumulate scores
    allScores.forEach(score => {
      const teamKey = score.team_id;
      if (teamScores[teamKey]) {
        const pts = parsePoints(score.points);
        teamScores[teamKey].score += pts;
        
        // Track player scores
        if (score.player_id !== undefined && score.player_id !== null) {
          const pid = String(score.player_id);
          const existing = teamScores[teamKey].playerScores[pid];
          
          if (existing !== undefined && existing !== null) {
            teamScores[teamKey].playerScores[pid] = Number(existing) + pts;
          } else {
            teamScores[teamKey].playerScores[pid] = pts;
          }
        }
      }
    });
    
    // Apply time-mode aggregation rules
    if (isTimeMode) {
      Object.values(teamScores).forEach(team => {
        const playerVals = Object.values(team.playerScores || {}).map(v => Number(v) || 0);
        
        console.debug('ScoreInput: time-mode team processing', {
          team_id: team.id,
          team_name: team.name,
          playerScores: team.playerScores,
          playerVals,
          aggregatePlayerTimes,
          timeWinner
        });
        
        if (playerVals.length > 0) {
          if (aggregatePlayerTimes) {
            team.score = playerVals.reduce((a, b) => a + b, 0);
          } else {
            team.score = (timeWinner === 'higher') 
              ? Math.max(...playerVals) 
              : Math.min(...playerVals);
          }
          
          console.debug('ScoreInput: time-mode aggregation', {
            team_id: team.id,
            score: team.score,
            playerVals,
            aggregatePlayerTimes,
            timeWinner
          });
        }
      });
    }
    
    return Object.values(teamScores);
  }

  // ==========================================================================
  // Display Updates
  // ==========================================================================

  updateSessionDisplay() {
    this.clearFatalError();
    
    if (this.elements.sessionName) {
      const mode = this.getScoringMode();
      const scoringModeIndicator = mode === 'player' ? ' 👤' : ' 👥';
      const scoringModeTitle = mode === 'player' ? 'Speler Scores Modus' : 'Team Scores Modus';
      const activityLabel = this.selectedActivityId && this.activities.length > 0
        ? ` • ${this.activities.find(a => a.id == this.selectedActivityId)?.name || ''}`
        : '';
      
      this.elements.sessionName.innerHTML = 
        `${this.session.name}${activityLabel} <span title="${scoringModeTitle}">${scoringModeIndicator}</span>`;
    }
    
    if (this.elements.roundInfo) {
      this.elements.roundInfo.textContent = 
        `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
    }
    
    this.updateScoringModeUI();
    this.updateTimerDisplay();
  }

  updateScoringModeUI() {
    const currentActivity = this.getCurrentActivity();
    const mode = this.getScoringMode();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    
    if (isTimeMode) {
      this.applyTimeModeUI();
    } else {
      this.applyNormalModeUI();
    }
    
    this.updatePlayerSelectVisibility(mode, isTimeMode);
  }

  applyTimeModeUI() {
    // Hide standard controls
    this.elements.pointsGroup && (this.elements.pointsGroup.style.display = 'none');
    this.elements.reasonGroup && (this.elements.reasonGroup.style.display = 'none');
    this.elements.submitScoreBtn && (this.elements.submitScoreBtn.style.display = 'none');
    this.elements.subtractBtn && (this.elements.subtractBtn.style.display = 'none');
    this.elements.addBtn && (this.elements.addBtn.style.display = 'none');
    this.elements.sportQuickButtons?.parentNode && (this.elements.sportQuickButtons.parentNode.style.display = 'none');
    this.elements.customQuickActionsSection && (this.elements.customQuickActionsSection.style.display = 'none');
    
    // Show time controls
    this.elements.timeControls && (this.elements.timeControls.style.display = 'block');
    ['setMinutes', 'setSeconds', 'setMs'].forEach(id => {
      this.elements[id] && (this.elements[id].style.display = '');
    });
    
    // Configure points input for time
    if (this.elements.pointsInput) {
      this.elements.pointsInput.type = 'text';
      this.elements.pointsInput.placeholder = 'Tijd invoer (mm:ss(.ms) of seconden)';
      
      if (isNaN(SharedUtils.parseTimeToMs(String(this.elements.pointsInput.value || '')))) {
        this.elements.pointsInput.value = SharedUtils.formatMs(0);
      }
    }
  }

  applyNormalModeUI() {
    // Show standard controls
    this.elements.pointsGroup && (this.elements.pointsGroup.style.display = '');
    this.elements.reasonGroup && (this.elements.reasonGroup.style.display = '');
    this.elements.submitScoreBtn && (this.elements.submitScoreBtn.style.display = '');
    this.elements.subtractBtn && (this.elements.subtractBtn.style.display = '');
    this.elements.addBtn && (this.elements.addBtn.style.display = '');
    this.elements.sportQuickButtons?.parentNode && (this.elements.sportQuickButtons.parentNode.style.display = '');
    this.elements.customQuickActionsSection && (this.elements.customQuickActionsSection.style.display = '');
    this.elements.leaderboardSection && (this.elements.leaderboardSection.style.display = '');
    this.elements.recentScoresSection && (this.elements.recentScoresSection.style.display = '');
    
    // Hide time controls
    this.elements.timeControls && (this.elements.timeControls.style.display = 'none');
    ['setMinutes', 'setSeconds', 'setMs', 'addMinutes', 'addSeconds', 'addMs'].forEach(id => {
      this.elements[id] && (this.elements[id].style.display = 'none');
    });
    
    // Configure points input for numbers
    if (this.elements.pointsInput) {
      this.elements.pointsInput.type = 'number';
      this.elements.pointsInput.placeholder = '';
    }
  }

  updatePlayerSelectVisibility(mode, isTimeMode) {
    const playerGroup = this.elements.playerSelectGroup;
    const playerSelect = this.elements.playerSelect;
    
    if (!playerGroup || !playerSelect) return;
    
    if (mode === 'team' && !isTimeMode) {
      playerGroup.style.display = 'none';
      playerSelect.disabled = true;
      playerSelect.innerHTML = '<option value="">Team modus - spelers uitgeschakeld</option>';
    } else {
      playerGroup.style.display = 'block';
      playerSelect.disabled = false;
      playerSelect.title = isTimeMode 
        ? 'Selecteer een speler om een tijd in te voeren'
        : 'Selecteer een speler om punten toe te kennen';
    }
  }

  displayLeaderboard(leaderboard, options = {}) {
    if (!this.elements.leaderboard) return;
    
    const mode = options.mode || this.getScoringMode();
    const currentActivity = this.getCurrentActivity();
    const lowerIsBetter = options.lowerIsBetter !== undefined 
      ? options.lowerIsBetter 
      : SharedUtils.isLowerBetter(currentActivity);
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    
    this.updateLeaderboardTitle();
    
    if (!leaderboard || leaderboard.length === 0) {
      this.elements.leaderboard.innerHTML = '<div class="no-teams">Geen teams gevonden</div>';
      return;
    }
    
    // Sort leaderboard
    leaderboard.sort((a, b) => 
      lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
    );
    
    if (mode === 'player') {
      this.renderPlayerLeaderboard(leaderboard, isTimeMode);
    } else {
      this.renderTeamLeaderboard(leaderboard, { mode, isTimeMode });
    }
  }

  updateLeaderboardTitle() {
    const titleEl = this.elements.leaderboardTitle;
    if (!titleEl) return;
    
    if (this.selectedActivityId) {
      const activity = this.activities.find(a => a.id == this.selectedActivityId);
      titleEl.textContent = `Scorebord - ${activity ? activity.name : 'Geselecteerde Activiteit'}`;
    } else {
      titleEl.textContent = 'Scorebord - Alle Activiteiten';
    }
  }

  renderPlayerLeaderboard(players, isTimeMode) {
    const html = players.map((player, index) => {
      const teamLabel = player.team_name 
        ? ` <span class="player-team">(${escapeHtml(player.team_name)})</span>` 
        : '';
      const displayScore = isTimeMode ? SharedUtils.formatMs(player.score) : player.score;
      
      return `
        <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" 
             data-player-id="${player.id}" 
             onclick="scoreInput.selectTeamAndPlayer(${player.team_id || 'null'}, ${player.id}); event.stopPropagation();" 
             style="cursor: pointer;">
          <div class="rank">#${index + 1}</div>
          <div class="team-info">
            <div class="team-icon">${getIconEmoji(player.icon)}</div>
            <div class="team-name">${escapeHtml(player.name)}${teamLabel}</div>
          </div>
          <div class="team-score" data-player-score="${player.id}" title="raw-ms:${player.score || 0}">
            ${displayScore}
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.leaderboard.innerHTML = html;
  }

  renderTeamLeaderboard(teams, options) {
    const { mode, isTimeMode } = options;
    const showPlayers = mode === 'player' || mode === 'team_with_players' || isTimeMode;
    
    const html = teams.map((team, index) => {
      const playersHtml = showPlayers && team.players?.length > 0
        ? this.renderTeamPlayers(team, isTimeMode)
        : '';
      
      const displayScore = isTimeMode ? SharedUtils.formatMs(team.score) : team.score;
      const teamColor = sanitizeColor(team.color);
      
      return `
        <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" 
             data-team-id="${team.id}" 
             onclick="scoreInput.selectTeam(${team.id})" 
             style="cursor: pointer; border-left-color: ${teamColor};">
          <div class="rank">#${index + 1}</div>
          <div class="team-info">
            <div class="team-icon" style="color: ${teamColor};">
              ${getIconEmoji(team.icon)}
            </div>
            <div class="team-name">${escapeHtml(team.name)}</div>
          </div>
          <div class="team-score" data-team-score="${team.id}">${displayScore}</div>
          ${playersHtml}
        </div>
      `;
    }).join('');
    
    this.elements.leaderboard.innerHTML = html;
  }

  renderTeamPlayers(team, isTimeMode) {
    const players = team.players.map(p => {
      const playerScore = team.playerScores[String(p.id)];
      const hasScore = playerScore !== undefined && playerScore !== null;
      const displayScore = isTimeMode && hasScore 
        ? SharedUtils.formatMs(playerScore) 
        : playerScore;
      const name = escapeHtml(p.position ? `${p.name} (${p.position})` : p.name);
      
      return `
        <button class="player-badge" 
                onclick="scoreInput.selectTeamAndPlayer(${team.id}, ${p.id}); event.stopPropagation();" 
                title="Klik om ${name} te selecteren (raw-ms: ${playerScore || 0})">
          ${name}${hasScore ? `: <strong>${escapeHtml(String(displayScore))}</strong>` : ''}
        </button>
      `;
    }).join('');
    
    return `<div class="team-players">${players}</div>`;
  }

  displayRecentScores() {
    if (!this.elements.recentScores) return;
    
    if (!this.recentScoresData || this.recentScoresData.length === 0) {
      this.elements.recentScores.innerHTML = 
        '<div class="no-scores">Nog geen scores toegevoegd</div>';
      return;
    }
    
    const html = this.recentScoresData.map(score => {
      const team = this.teams.find(t => t.id === score.team_id);
      const teamDisplay = team ? team.name : 'Onbekend team';
      const playerDisplay = score.player_name ? ` - ${score.player_name}` : '';
      const timeAgo = getTimeAgo(new Date(score.timestamp));
      
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
    }).join('');
    
    this.elements.recentScores.innerHTML = html;
  }

  // ==========================================================================
  // Score Submission
  // ==========================================================================

  async submitScore(isTimeSubmit = false) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    
    try {
      const teamId = parseInt(this.elements.teamSelect.value);
      const playerId = this.elements.playerSelect.value 
        ? parseInt(this.elements.playerSelect.value) 
        : null;
      
      if (!teamId) {
        alert('Selecteer een team.');
        this.elements.teamSelect.focus();
        return;
      }
      
      const currentActivity = this.getCurrentActivity();
      const mode = this.getScoringMode();
      let points = this.elements.pointsInput.value;
      const reason = currentActivity && String(currentActivity.game_type) === 'team_vs_time' 
        ? '' 
        : (this.elements.reasonInput?.value.trim() || '');
      
      // Parse points
      if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
        points = SharedUtils.parseTimeToMs(String(points || '').trim());
        
        if (isNaN(points)) {
          alert('Voer een geldige tijd in (mm:ss(.ms) of seconden).');
          this.elements.pointsInput.focus();
          return;
        }
        
        // Validate player requirement for time mode
        const aggregatePlayerTimes = currentActivity.aggregate_player_times || false;
        if (mode === 'team_with_players' && aggregatePlayerTimes && !playerId) {
          this.showInlineError('points-input', 
            'Selecteer een speler: deze activiteit gebruikt speler-tijden om het teamtotaal te berekenen.');
          return;
        }
      } else {
        points = parseInt(points);
      }
      
      this.disableSubmitButtons();
      
      const scoreData = {
        activity_id: parseInt(this.selectedActivityId),
        team_id: teamId,
        points: points,
        reason: reason || 'Handmatig',
        round_number: this.session.current_round
      };
      
      if (playerId) {
        scoreData.player_id = playerId;
      }
      
      // Submit score
      if (this.selectedActivityId) {
        await api.createActivityScore(this.selectedActivityId, scoreData);
      } else {
        await api.postSilent(`/api/v1/scores`, scoreData);
      }
      
      this.onScoreSubmitSuccess(teamId, points);
    } catch (error) {
      api.handleError(error, 'submitting score');
      alert('Fout bij het toevoegen van de score.');
    } finally {
      this.isSubmitting = false;
      this.enableSubmitButtons();
    }
  }

  disableSubmitButtons() {
    this.elements.submitScoreBtn && (this.elements.submitScoreBtn.disabled = true);
    this.elements.setTimeBtn && (this.elements.setTimeBtn.disabled = true);
    this.elements.addTimeBtn && (this.elements.addTimeBtn.disabled = true);
    
    document.querySelectorAll('.quick-btn, .custom-action-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  enableSubmitButtons() {
    this.elements.submitScoreBtn && (this.elements.submitScoreBtn.disabled = false);
    this.elements.setTimeBtn && (this.elements.setTimeBtn.disabled = false);
    this.elements.addTimeBtn && (this.elements.addTimeBtn.disabled = false);
    
    document.querySelectorAll('.quick-btn, .custom-action-btn').forEach(btn => {
      btn.disabled = false;
    });
  }

  onScoreSubmitSuccess(teamId, points) {
    // Remove error messages
    document.querySelectorAll('.inline-error-message').forEach(el => el.remove());
    
    // Show animation
    this.showScoreAnimation(teamId, points);
    
    // Reset form
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    
    if (isTimeMode) {
      if (this.elements.pointsInput) {
        this.elements.pointsInput.value = SharedUtils.formatMs(0);
      }
      ['setMinutes', 'setSeconds', 'setMs', 'addMinutes', 'addSeconds', 'addMs'].forEach(id => {
        if (this.elements[id]) this.elements[id].value = '';
      });
    } else {
      if (this.elements.reasonInput) this.elements.reasonInput.value = '';
      if (this.elements.pointsInput) this.elements.pointsInput.value = 1;
    }
    
    // Reload data
    this.loadLeaderboard();
    setTimeout(() => this.loadRecentScores(), SCORE_CONFIG.RELOAD_DELAY);
  }

  // ==========================================================================
  // Time Mode Helpers
  // ==========================================================================

  async setTimeFromInputs() {
    if (!this.validateTimeInputs()) return;
    
    const desiredMs = this.getTimeFromInputs();
    const { teamId, playerId } = this.getTeamAndPlayer();
    
    if (!teamId) {
      alert('Selecteer een team.');
      return;
    }
    
    this.disableSubmitButtons();
    
    try {
      const currentMs = await this.getCurrentRecordedMs(teamId, playerId);
      const deltaMs = desiredMs - currentMs;
      
      console.debug('Set Time:', { teamId, playerId, desiredMs, currentMs, deltaMs });
      
      if (deltaMs === 0) {
        this.showScoreFeedback('Tijd is al ingesteld op die waarde', 'info');
        return;
      }
      
      const newMs = Math.max(0, currentMs + deltaMs);
      this.elements.pointsInput.value = SharedUtils.formatMs(newMs);
      
      await this.submitDeltaScore(deltaMs, teamId, playerId);
    } finally {
      this.enableSubmitButtons();
    }
  }

  async addTimeFromInputs() {
    if (!this.validateTimeInputs()) return;
    
    const deltaMs = this.getTimeFromInputs();
    const { teamId, playerId } = this.getTeamAndPlayer();
    
    if (!teamId) {
      alert('Selecteer een team.');
      return;
    }
    
    this.disableSubmitButtons();
    
    try {
      const currentMs = await this.getCurrentRecordedMs(teamId, playerId);
      const newMs = Math.max(0, currentMs + deltaMs);
      
      console.debug('Add Time:', { teamId, playerId, deltaMs, currentMs, newMs });
      
      this.elements.pointsInput.value = SharedUtils.formatMs(newMs);
      await this.submitDeltaScore(deltaMs, teamId, playerId);
    } finally {
      this.enableSubmitButtons();
    }
  }

  validateTimeInputs() {
    const mins = parseInt(this.elements.setMinutes?.value) || 0;
    const secs = parseInt(this.elements.setSeconds?.value) || 0;
    const ms = parseInt(this.elements.setMs?.value) || 0;
    
    if (secs < 0 || secs > 59 || ms < 0 || ms > 999 || mins < 0) {
      alert('Voer een geldige tijd in (seconden 0-59, milliseconden 0-999).');
      return false;
    }
    
    return true;
  }

  getTimeFromInputs() {
    const mins = parseInt(this.elements.setMinutes?.value) || 0;
    const secs = parseInt(this.elements.setSeconds?.value) || 0;
    const ms = parseInt(this.elements.setMs?.value) || 0;
    return (mins * 60000) + (secs * 1000) + ms;
  }

  getTeamAndPlayer() {
    const teamId = parseInt(this.elements.teamSelect?.value) || null;
    const playerId = this.elements.playerSelect?.value 
      ? parseInt(this.elements.playerSelect.value) 
      : null;
    return { teamId, playerId };
  }

  async getCurrentRecordedMs(teamId, playerId) {
    try {
      const allScores = await this.fetchAllScores();
      
      let total = 0;
      allScores.forEach(s => {
        if (Number(s.team_id) !== Number(teamId)) return;
        if (playerId && Number(s.player_id) !== Number(playerId)) return;
        total += (s.points || 0);
      });
      
      return total || 0;
    } catch (error) {
      console.warn('getCurrentRecordedMs failed:', error);
      throw error;
    }
  }

  async submitDeltaScore(deltaMs, teamId, playerId) {
    const scoreData = {
      activity_id: parseInt(this.selectedActivityId),
      team_id: teamId,
      points: deltaMs,
      round_number: this.session.current_round
    };
    
    if (playerId) {
      scoreData.player_id = playerId;
    }
    
    try {
      if (this.selectedActivityId) {
        await api.createActivityScore(this.selectedActivityId, scoreData);
      } else {
        await api.postSilent(`/api/v1/scores`, scoreData);
      }
      
      this.onScoreSubmitSuccess(teamId, deltaMs);
    } catch (error) {
      api.handleError(error, 'submitting delta score');
      alert('Fout bij het toevoegen van de score.');
    }
  }

  // ==========================================================================
  // UI Helpers
  // ==========================================================================

  populateTeamSelect() {
    if (!this.elements.teamSelect) return;
    
    this.elements.teamSelect.innerHTML = '<option value="">Kies een team...</option>';
    
    if (this.teams.length === 0) {
      this.elements.teamSelect.innerHTML = 
        '<option value="">⚠️ Geen teams beschikbaar - Ga naar Team Setup</option>';
      this.elements.teamSelect.disabled = true;
      this.showNoTeamsWarning();
      return;
    }
    
    this.elements.teamSelect.disabled = false;
    this.clearNoTeamsWarning();
    
    this.teams.forEach(team => {
      team.color = sanitizeColor(team.color);
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      option.style.color = team.color;
      this.elements.teamSelect.appendChild(option);
    });
  }

  showNoTeamsWarning() {
    if (document.getElementById('no-teams-warning')) return;
    
    const warning = document.createElement('div');
    warning.id = 'no-teams-warning';
    warning.className = 'alert alert-warning';
    warning.style.cssText = 'margin: 15px 0; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; color: #856404;';
    warning.innerHTML = `
      <strong>⚠️ Geen teams gevonden!</strong><br>
      Voeg eerst teams toe via de 
      <a href="teamsetup.html?session=${this.sessionId}" style="color: #0056b3; text-decoration: underline;">
        Team Setup
      </a> pagina.
    `;
    
    this.elements.teamSelect?.parentNode.appendChild(warning);
  }

  clearNoTeamsWarning() {
    const warning = document.getElementById('no-teams-warning');
    if (warning) warning.remove();
  }

  showScoreAnimation(teamId, points) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team || !this.elements.scoreAnimation) return;
    
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    
    this.elements.animTeamIcon.textContent = getIconEmoji(team.icon);
    this.elements.animScoreChange.textContent = 
      `${points >= 0 ? '+' : ''}${isTimeMode ? SharedUtils.formatMs(points) : points}`;
    this.elements.animScoreChange.className = 
      `score-change ${points >= 0 ? 'positive' : 'negative'}`;
    this.elements.animTeamName.textContent = team.name;
    
    this.elements.scoreAnimation.classList.add('show');
    
    setTimeout(() => {
      this.elements.scoreAnimation.classList.remove('show');
    }, SCORE_CONFIG.ANIMATION_DURATION);
  }

  showScoreFeedback(message, type) {
    const feedback = document.createElement('div');
    feedback.className = `score-feedback ${type}`;
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      animation: fadeIn 0.3s ease-in;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  }

  showInlineError(fieldId, message) {
    document.querySelectorAll('.inline-error-message').forEach(el => el.remove());
    
    const field = document.getElementById(fieldId);
    if (!field?.parentNode) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'inline-error-message';
    errorDiv.style.cssText = 
      'color: #dc3545; font-size: 0.9em; margin-top: 4px; padding: 8px; ' +
      'background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;';
    errorDiv.textContent = message;
    
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
    setTimeout(() => errorDiv.remove(), 4000);
  }

  // ==========================================================================
  // Round Control Methods
  // ==========================================================================

  async startRound() {
    const activityId = this.selectedActivityId || this.activeActivityId;
    if (!activityId) return;
    try {
      await api.startActivityRound(activityId);
      console.log('Round started');
    } catch (error) {
      console.error('Failed to start round:', error);
      alert('Fout bij het starten van de ronde');
    }
  }

  async pauseRound() {
    const activityId = this.selectedActivityId || this.activeActivityId;
    if (!activityId) return;
    try {
      await api.pauseActivityRound(activityId);
      console.log('Round paused');
    } catch (error) {
      console.error('Failed to pause round:', error);
      alert('Fout bij het pauzeren van de ronde');
    }
  }

  async resumeRound() {
    const activityId = this.selectedActivityId || this.activeActivityId;
    if (!activityId) return;
    try {
      await api.resumeActivityRound(activityId);
      console.log('Round resumed');
    } catch (error) {
      console.error('Failed to resume round:', error);
      alert('Fout bij het hervatten van de ronde');
    }
  }

  async endRound() {
    const activityId = this.selectedActivityId || this.activeActivityId;
    if (!activityId) return;
    try {
      await api.endActivityRound(activityId);
      console.log('Round ended');
    } catch (error) {
      console.error('Failed to end round:', error);
      alert('Fout bij het beëindigen van de ronde');
    }
  }

  async nextActivityRound() {
    const activityId = this.selectedActivityId || this.activeActivityId;
    if (!activityId) return;
    // Prevent calling backend when already at last round
    if (this.currentRound >= this.totalRounds) {
      alert('Dit is de laatste ronde.');
      return;
    }
    try {
      await api.nextActivityRound(activityId);
      console.log('Advanced to next round');
    } catch (error) {
      console.error('Failed to advance round:', error);
      alert('Fout bij het doorgaan naar de volgende ronde');
    }
  }

  async loadRoundStatus() {
    if (!this.selectedActivityId) return;
    try {
      const status = await api.getRoundStatus(this.selectedActivityId);
      this.updateRoundDisplay(status);
      // If the round is active and the server returned remaining time, sync the timer immediately
      if (status?.round_status === 'active' && status.time_remaining != null) {
        this.startRoundTimer(status.time_remaining);
      }
    } catch (error) {
      console.error('Failed to load round status:', error);
    }
  }

  updateRoundDisplay(roundStatus) {
    if (!roundStatus) return;
    
    this.currentRound = roundStatus.current_round || 1;
    this.totalRounds = roundStatus.total_rounds || 1;
    this.roundStatus = roundStatus.round_status || 'not_started';
    this.roundStartTime = roundStatus.round_start_time;
    this.timeLimitPerRound = roundStatus.time_limit_per_round;
    
    // Update round info text
    if (this.elements.roundInfo) {
      this.elements.roundInfo.textContent = `Ronde ${this.currentRound}/${this.totalRounds}`;
    }
    
    // Update timer display and start countdown if active
    if (roundStatus.time_remaining !== null && roundStatus.time_remaining !== undefined) {
      this.updateRoundTimerDisplay(roundStatus.time_remaining);
      // Start client-side timer if round is active
      if (this.roundStatus === 'active' && roundStatus.time_remaining > 0) {
        this.startRoundTimer(roundStatus.time_remaining);
      } else if (this.roundStatus !== 'active') {
        // Stop timer if round is not active
        this.stopRoundTimer();
      }
    } else if (this.elements.timer) {
      this.elements.timer.textContent = '--:--';
    }
    
    // Show/hide round controls based on configuration
    const hasRounds = this.totalRounds > 1 || this.timeLimitPerRound;
    if (this.elements.roundControls) {
      this.elements.roundControls.style.display = hasRounds ? 'flex' : 'none';
    }
    
    // Update button visibility based on status
    this.updateRoundControlButtons();
  }

  updateRoundControlButtons() {
    const {
      startRoundBtn, pauseRoundBtn, resumeRoundBtn, endRoundBtn
    } = this.elements;
    
    // Hide all first
    [startRoundBtn, pauseRoundBtn, resumeRoundBtn, endRoundBtn].forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
    
    // Show appropriate buttons based on round status
    switch (this.roundStatus) {
      case 'not_started':
        if (startRoundBtn) startRoundBtn.style.display = 'inline-block';
        break;
      
      case 'active':
        if (pauseRoundBtn) pauseRoundBtn.style.display = 'inline-block';
        if (endRoundBtn) endRoundBtn.style.display = 'inline-block';
        break;
      
      case 'paused':
        if (resumeRoundBtn) resumeRoundBtn.style.display = 'inline-block';
        if (endRoundBtn) endRoundBtn.style.display = 'inline-block';
        break;
      
      case 'completed':
        // No additional controls in completed state
        break;
    }
  }

  updateRoundTimerDisplay(seconds) {
    if (!this.elements.timer) return;
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.elements.timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Color code based on time remaining
    if (seconds < 30) {
      this.elements.timer.style.color = '#ef4444'; // Red
    } else if (seconds < 60) {
      this.elements.timer.style.color = '#f59e0b'; // Orange
    } else {
      this.elements.timer.style.color = '#10b981'; // Green
    }
  }

  // ==========================================================================
  // Round Timer Management
  // ==========================================================================

  startRoundTimer(initialSeconds) {
    this.stopRoundTimer(); // Clear any existing timer
    this.roundTimeRemaining = Math.max(0, Math.floor(initialSeconds));
    // Update display immediately even when zero
    this.updateRoundTimerDisplay(this.roundTimeRemaining);
    
    if (this.roundTimeRemaining <= 0) return;
    
    // Decrement every second
    this.roundTimerInterval = setInterval(() => {
      if (this.roundStatus === 'active' && this.roundTimeRemaining > 0) {
        this.roundTimeRemaining--;
        this.updateRoundTimerDisplay(this.roundTimeRemaining);
        
        // When time runs out, stop the timer
        if (this.roundTimeRemaining <= 0) {
          this.stopRoundTimer();
        }
      }
    }, 1000);
  }

  stopRoundTimer() {
    if (this.roundTimerInterval) {
      clearInterval(this.roundTimerInterval);
      this.roundTimerInterval = null;
    }
  }

  // ==========================================================================
  // Round Event Handlers
  // ==========================================================================

  handleRoundStarted(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round started event:', data);
    this.loadRoundStatus();
    // Start client-side timer countdown
    if (data.time_remaining != null) {
      this.startRoundTimer(data.time_remaining);
    }
  }

  handleRoundEnded(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round ended event:', data);
    this.stopRoundTimer();
    this.loadRoundStatus();
  }

  handleRoundChanged(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round changed event:', data);
    this.loadRoundStatus();
    this.loadLeaderboard(); // Refresh scores for new round
  }

  handleRoundPaused(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round paused event:', data);
    this.stopRoundTimer();
    this.loadRoundStatus();
  }

  handleRoundResumed(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round resumed event:', data);
    this.loadRoundStatus();
    // Resume client-side timer countdown
    if (data.time_remaining != null) {
      this.startRoundTimer(data.time_remaining);
    }
  }

  handleRoundTimeUpdate(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    if (data.time_remaining !== null && data.time_remaining !== undefined) {
      // Resync the timer every 5 seconds from server
      this.roundTimeRemaining = data.time_remaining;
      this.updateRoundTimerDisplay(data.time_remaining);
      if (!this.roundTimerInterval && this.roundStatus === 'active' && this.roundTimeRemaining > 0) {
        this.startRoundTimer(this.roundTimeRemaining);
      }
    }
  }

  handleRoundAutoAdvanced(data) {
    const relevantActivityId = this.selectedActivityId || this.activeActivityId;
    if (data.activity_id !== relevantActivityId) return;
    console.log('Round auto-advanced:', data);
    alert(`Ronde ${data.previous_round} voltooid! Nu ronde ${data.current_round}.`);
    this.loadRoundStatus();
    this.loadLeaderboard();
  }

  handleActivityCompleted(data) {
    if (data.activity_id !== this.activeActivityId) return;
    console.log('Activity completed:', data);
    alert('Alle rondes zijn voltooid!');
    this.loadRoundStatus();
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  showFatalError(message) {
    this.clearFatalError();
    
    const banner = document.createElement('div');
    banner.id = 'fatal-error-banner';
    banner.style.cssText = 
      'position:fixed; left:0; right:0; top:0; background:#b71c1c; color:white; ' +
      'padding:12px; text-align:center; z-index:10000; font-weight:700;';
    banner.textContent = message;
    
    const actions = document.createElement('span');
    actions.style.cssText = 'margin-left:12px';
    
    const homeBtn = document.createElement('button');
    homeBtn.textContent = '↩ Ga terug';
    homeBtn.style.cssText = 
      'margin-left:8px; background:rgba(255,255,255,0.12); ' +
      'border:1px solid rgba(255,255,255,0.2); color:white; ' +
      'padding:6px 10px; border-radius:4px; cursor:pointer;';
    homeBtn.onclick = () => window.location.href = 'index.html';
    actions.appendChild(homeBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 
      'margin-left:12px; background:transparent; border:none; ' +
      'color:white; font-size:16px; cursor:pointer;';
    closeBtn.onclick = () => this.clearFatalError();
    actions.appendChild(closeBtn);
    
    banner.appendChild(actions);
    document.body.appendChild(banner);
  }

  clearFatalError() {
    document.getElementById('fatal-error-banner')?.remove();
  }

  // ==========================================================================
  // Activity Management
  // ==========================================================================

  renderActivities() {
    const container = document.getElementById('activities-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'activity-selection-header';
    headerDiv.innerHTML = `
      <h3>Kies een activiteit om scores in te geven</h3>
      ${this.selectedActivityId 
        ? `<p class="selected-activity">Geselecteerd: ${this.activities.find(a => a.id == this.selectedActivityId)?.name || 'Onbekend'}</p>` 
        : '<p class="no-selection">Geen activiteit geselecteerd</p>'}
    `;
    container.appendChild(headerDiv);
    
    this.activities.forEach(activity => {
      const stationDiv = document.createElement('div');
      stationDiv.className = `station-card ${this.selectedActivityId == activity.id ? 'selected' : ''} ${this.activeActivityId == activity.id ? 'active' : ''}`;
      
      stationDiv.innerHTML = `
        <h3>${escapeHtml(activity.name)}</h3>
        <p>${escapeHtml(activity.description || '')}</p>
        <div class="activity-actions">
          <button onclick="scoreInput.selectActivity(${activity.id})" class="btn select-activity">
            ${this.selectedActivityId == activity.id ? 'Geselecteerd' : 'Selecteren'}
          </button>
          <button onclick="scoreInput.setActiveActivity(${activity.id})" 
                  class="btn set-active ${this.activeActivityId == activity.id ? 'active-btn' : ''}">
            ${this.activeActivityId == activity.id ? 'Actief op scherm' : 'Zet actief'}
          </button>
        </div>
      `;
      
      container.appendChild(stationDiv);
    });
  }

  async selectActivity(activityId, silent = false) {
    console.log('selectActivity called for', activityId);
    this.selectedActivityId = activityId;
    this.renderActivities();
    this.updateSessionDisplay();
    await this.loadTeams();
    this.loadLeaderboard();
    this.loadRoundStatus(); // Load round status when activity is selected
    
    if (!silent) {
      const activity = this.activities.find(a => a.id == activityId);
      this.showScoreFeedback(`Activiteit geselecteerd: ${activity?.name}`, 'success');
    }
  }

  async setActiveActivity(activityId) {
    try {
      this.activeActivityId = activityId;
      
      if (api.socket && typeof api.socket.emit === 'function') {
        api.socket.emit('set_active_activity', {
          sessionId: this.sessionId,
          activityId: activityId
        });
      }
      
      this.renderActivities();
      this.loadRoundStatus(); // Load round status when setting active activity
      
      const activity = this.activities.find(a => a.id == activityId);
      this.showScoreFeedback(`Activiteit ingesteld als actief op scherm: ${activity?.name}`, 'success');
    } catch (error) {
      console.error('Error setting active activity:', error);
      this.showScoreFeedback('Fout bij instellen actieve activiteit', 'error');
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  async ensureActivityDetails(activityId) {
    const needsFreshFetch = !this.activities ||
      !this.activities.length ||
      !this.activities.find(a => a.id == activityId) ||
      !this.activities.find(a => a.id == activityId).game_type ||
      this.activities.find(a => a.id == activityId).aggregate_player_times === undefined ||
      this.activities.find(a => a.id == activityId).time_winner === undefined;

    if (activityId && needsFreshFetch) {
      try {
        await this.loadActivities();
      } catch (error) {
        console.warn('Failed to load activity details:', error);
      }
    }

    return this.getCurrentActivity() || null;
  }

  getCurrentActivity() {
    if (!this.selectedActivityId || !this.activities) {
      return null;
    }
    return this.activities.find(a => a.id === this.selectedActivityId) || null;
  }

  getScoringMode() {
    const currentActivity = this.getCurrentActivity();
    return currentActivity?.scoring_mode || this.session?.scoring_mode || 'team';
  }

  adjustPoints(delta) {
    const currentActivity = this.getCurrentActivity();
    
    if (currentActivity && String(currentActivity.game_type) === 'team_vs_time') {
      const currentMs = SharedUtils.parseTimeToMs(String(this.elements.pointsInput.value || '')) || 0;
      const newMs = Math.max(0, currentMs + (delta * 1000));
      this.elements.pointsInput.value = SharedUtils.formatMs(newMs);
      return;
    }
    
    let currentValue = parseInt(this.elements.pointsInput.value) || 0;
    currentValue += delta;
    currentValue = Math.max(SCORE_CONFIG.MIN_POINTS, Math.min(SCORE_CONFIG.MAX_POINTS, currentValue));
    this.elements.pointsInput.value = currentValue;
  }

  selectTeam(teamId) {
    this.elements.teamSelect.value = teamId;
    this.onTeamChange();
    
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    
    if (isTimeMode) {
      this.elements.setMinutes?.focus();
    } else {
      this.elements.pointsInput?.focus();
    }
  }

  selectTeamAndPlayer(teamId, playerId) {
    if (!teamId) return;
    
    this.elements.teamSelect.value = teamId;
    this.onTeamChange().then(() => {
      setTimeout(() => {
        if (this.elements.playerSelect && String(playerId) !== 'null') {
          this.elements.playerSelect.value = playerId;
        }
        
        const currentActivity = this.getCurrentActivity();
        const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
        
        if (isTimeMode) {
          this.elements.setMinutes?.focus();
        } else {
          this.elements.pointsInput?.focus();
        }
      }, 100);
    }).catch(e => console.warn('selectTeamAndPlayer: failed to load players', e));
  }

  async onTeamChange() {
    const teamId = this.elements.teamSelect.value;
    
    if (!teamId) {
      this.elements.playerSelect.innerHTML = '<option value="">Selecteer eerst een team</option>';
      return;
    }
    
    const mode = this.getScoringMode();
    
    if (mode === 'player' || mode === 'team_with_players') {
      await this.loadAllPlayersForActivity();
    } else {
      await this.loadPlayersForTeam(teamId);
    }
  }

  async loadAllPlayersForActivity() {
    try {
      this.elements.playerSelect.innerHTML = '<option value="">Laden...</option>';
      
      let allPlayers = [];
      for (const team of this.teams) {
        try {
          const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
          const teamPlayers = resp?.players || [];
          
          teamPlayers.forEach(player => {
            player.teamName = team.name;
            player.displayName = `${player.name || player.player_name} (${team.name})`;
          });
          
          allPlayers = allPlayers.concat(teamPlayers);
        } catch (error) {
          console.error(`Failed to load players for team ${team.id}:`, error);
        }
      }
      
      // Filter by activity if needed
      if (this.selectedActivityId) {
        try {
          const activityResp = await api.getActivityPlayers(this.selectedActivityId);
          const activityPlayerIds = new Set((activityResp.players || []).map(p => p.id));
          
          if (activityPlayerIds.size > 0) {
            allPlayers = allPlayers.filter(p => activityPlayerIds.has(p.id));
          }
        } catch (error) {
          console.warn('Failed to filter players by activity:', error);
        }
      }
      
      allPlayers.sort((a, b) => 
        (a.name || a.player_name || '').localeCompare(b.name || b.player_name || '')
      );
      
      this.elements.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      
      allPlayers.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.displayName || (p.position ? `${p.name} (${p.position})` : p.name);
        this.elements.playerSelect.appendChild(option);
      });
    } catch (error) {
      this.elements.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      console.error('Failed to load all players:', error);
    }
  }

  async loadPlayersForTeam(teamId) {
    try {
      this.elements.playerSelect.innerHTML = '<option value="">Laden...</option>';
      
      const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
      let players = resp?.players || [];
      
      players.sort((a, b) => 
        (a.name || a.player_name || '').localeCompare(b.name || b.player_name || '')
      );
      
      this.elements.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      
      players.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.position ? `${p.name} (${p.position})` : p.name;
        this.elements.playerSelect.appendChild(option);
      });
    } catch (error) {
      this.elements.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      console.error('Failed to load players for team:', error);
    }
  }

  addQuickScore(reason, points) {
    if (this.isSubmitting) return;
    
    const teamId = parseInt(this.elements.teamSelect.value);
    if (!teamId) {
      alert('Selecteer eerst een team.');
      return;
    }
    
    this.elements.pointsInput.value = points;
    this.elements.reasonInput.value = reason;
    this.submitScore();
  }

  // ==========================================================================
  // Theme & Sport Quick Buttons
  // ==========================================================================

  applyTheme() {
    const sportType = this.session?.sport_type;
    if (sportType) {
      document.body.setAttribute('data-sport', sportType);
    }
  }

  loadSportQuickButtons() {
    const container = this.elements.sportQuickButtons;
    if (!container || !this.session) return;
    
    const sportType = this.session.sport_type || 'custom';
    const buttons = SPORT_QUICK_BUTTONS[sportType] || SPORT_QUICK_BUTTONS.custom;
    
    container.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `quick-btn ${btn.class}`;
      button.textContent = btn.label;
      button.onclick = () => this.addQuickScore(btn.reason, btn.points);
      container.appendChild(button);
    });
  }

  // ==========================================================================
  // Custom Quick Actions
  // ==========================================================================

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
    const reason = this.elements.customReason?.value.trim();
    const points = parseInt(this.elements.customPoints?.value);
    
    if (!reason) {
      alert('Voer een reden in voor de snelle actie.');
      this.elements.customReason?.focus();
      return;
    }
    
    if (isNaN(points) || points === 0) {
      alert('Voer een geldig aantal punten in (niet 0).');
      this.elements.customPoints?.focus();
      return;
    }
    
    if (points < SCORE_CONFIG.MIN_POINTS || points > SCORE_CONFIG.MAX_POINTS) {
      alert(`Punten moeten tussen ${SCORE_CONFIG.MIN_POINTS} en ${SCORE_CONFIG.MAX_POINTS} liggen.`);
      this.elements.customPoints?.focus();
      return;
    }
    
    if (this.customQuickActions.some(action => action.reason.toLowerCase() === reason.toLowerCase())) {
      alert('Een snelle actie met deze reden bestaat al.');
      this.elements.customReason?.focus();
      return;
    }
    
    const newAction = {
      id: Date.now(),
      reason: reason,
      points: points
    };
    
    this.customQuickActions.push(newAction);
    this.saveCustomQuickActions();
    this.displayCustomQuickActions();
    
    // Reset form
    if (this.elements.customReason) this.elements.customReason.value = '';
    if (this.elements.customPoints) this.elements.customPoints.value = '';
    this.elements.customReason?.focus();
  }

  removeCustomQuickAction(actionId) {
    if (confirm('Weet je zeker dat je deze snelle actie wilt verwijderen?')) {
      this.customQuickActions = this.customQuickActions.filter(action => action.id !== actionId);
      this.saveCustomQuickActions();
      this.displayCustomQuickActions();
    }
  }

  displayCustomQuickActions() {
    const container = this.elements.customQuickActions;
    if (!container) return;
    
    if (this.customQuickActions.length === 0) {
      container.innerHTML = '<div class="no-custom-actions">Nog geen aangepaste snelle acties</div>';
      return;
    }
    
    const html = this.customQuickActions.map(action => `
      <button type="button" class="custom-action-btn" 
              onclick="scoreInput.addQuickScore('${action.reason.replace(/'/g, "\\'")}', ${action.points})">
        ${action.reason} (${action.points >= 0 ? '+' : ''}${action.points})
        <button type="button" class="custom-action-btn remove" 
                onclick="event.stopPropagation(); scoreInput.removeCustomQuickAction(${action.id})" 
                title="Verwijderen">×</button>
      </button>
    `).join('');
    
    container.innerHTML = html;
  }

  // ==========================================================================
  // Session Controls
  // ==========================================================================

  async togglePause() {
    try {
      const newStatus = this.session.status === 'active' ? 'paused' : 'active';
      await api.put(`/api/v1/sessions/${this.sessionId}`, { status: newStatus });
      this.session.status = newStatus;
      this.updateSessionDisplay();
      this.elements.pauseSessionBtn.textContent = newStatus === 'paused' ? 'Hervat' : 'Pauze';
    } catch (error) {
      api.handleError(error, 'toggling pause');
    }
  }

  async nextSessionRound() {
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

  // ==========================================================================
  // Timer
  // ==========================================================================

  startTimer() {
    if (this.session?.time_limit) {
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
    if (!this.elements.timer) return;
    
    if (!this.session?.time_limit || this.session.time_limit === 0) {
      this.elements.timer.textContent = 'Geen tijdslimiet';
      this.elements.timer.style.color = '#6c757d';
      this.elements.timer.style.fontSize = '0.9em';
      return;
    }
    
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.elements.timer.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.elements.timer.style.fontSize = '1em';
    
    // Color coding
    if (this.timeRemaining < 60) {
      this.elements.timer.style.color = '#dc3545'; // Red
    } else if (this.timeRemaining < 300) {
      this.elements.timer.style.color = '#ffc107'; // Yellow
    } else {
      this.elements.timer.style.color = '#28a745'; // Green
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

  // ==========================================================================
  // Real-time Updates
  // ==========================================================================

  handleScoreUpdate(data) {
    try {
      const isSessionMatch = data?.session_id && String(data.session_id) === String(this.sessionId);
      const isActivityMatch = data?.activity_id && this.selectedActivityId && 
                            String(data.activity_id) === String(this.selectedActivityId);
      
      if (!(isSessionMatch || isActivityMatch)) return;
      
      const currentActivity = this.getCurrentActivity();
      const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
      
      // For time mode, always do full reload
      if (isTimeMode) {
        this.loadLeaderboard();
        this.loadRecentScores();
        return;
      }
      
      // Otherwise, try incremental update
      if (this.leaderboardData) {
        const mode = this.leaderboardMode || this.getScoringMode();
        const lowerIsBetter = this.leaderboardLowerIsBetter !== undefined 
          ? this.leaderboardLowerIsBetter 
          : SharedUtils.isLowerBetter(currentActivity);
        
        if (mode === 'player') {
          const playerIndex = this.leaderboardData.findIndex(p => p.id === data.player_id);
          if (playerIndex !== -1) {
            this.leaderboardData[playerIndex].score += (data.points || 0);
            this.leaderboardData.sort((a, b) => 
              lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
            );
            this.updateLeaderboardScores();
          } else {
            this.loadLeaderboard();
          }
        } else {
          const teamIndex = this.leaderboardData.findIndex(t => t.id === data.team_id);
          if (teamIndex !== -1) {
            this.leaderboardData[teamIndex].score += (data.points || 0);
            this.leaderboardData.sort((a, b) => 
              lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
            );
            this.updateLeaderboardScores();
          } else {
            this.loadLeaderboard();
          }
        }
      } else {
        this.loadLeaderboard();
      }
      
      this.loadRecentScores();
    } catch (error) {
      console.error('handleScoreUpdate failed:', error);
      this.loadLeaderboard();
    }
  }

  updateLeaderboardScores() {
    if (!this.elements.leaderboard || !this.leaderboardData) return;
    
    const currentActivity = this.getCurrentActivity();
    const isTimeMode = !!(currentActivity && String(currentActivity.game_type) === 'team_vs_time');
    const mode = this.leaderboardMode || this.getScoringMode();
    
    if (mode === 'player') {
      this.leaderboardData.forEach(player => {
        const scoreElement = this.elements.leaderboard.querySelector(`[data-player-score="${player.id}"]`);
        if (scoreElement) {
          scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(player.score) : player.score;
        }
      });
    } else {
      this.leaderboardData.forEach(team => {
        const scoreElement = this.elements.leaderboard.querySelector(`[data-team-score="${team.id}"]`);
        if (scoreElement) {
          scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(team.score) : team.score;
        }
      });
    }
  }

  handleStatusUpdate(data) {
    if (data.id == this.sessionId) {
      this.session.status = data.status;
      this.updateSessionDisplay();
    }
  }
}

// ============================================================================
// Initialization
// ============================================================================

let scoreInput;

document.addEventListener('DOMContentLoaded', () => {
  try {
    scoreInput = new ScoreInput();
  } catch (error) {
    console.error('Failed to initialize ScoreInput:', error);
    window.showGlobalFatalError?.(`Fout bij initialisatie ScoreInput: ${error?.message || String(error)}`);
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreInput };
}