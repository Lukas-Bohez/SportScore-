/**
 * Big Screen Display - Session Leaderboard System
 * 
 * A real-time leaderboard display system for sports/quiz sessions with support for:
 * - Real-time score updates via WebSocket
 * - Multiple scoring modes (team, player, participant)
 * - Time-based competitions with configurable winner rules
 * - Dynamic team/player management
 * - QR code overlay for participant joining
 * - Theming based on sport type
 * 
 * @author SportScore Team
 * @version 2.0.1
 */

// ============================================================================
// Constants
// ============================================================================

const CONFIG = {
  UPDATE_INTERVAL: 30000, // 30 seconds backup polling
  FLASH_DURATION: 500,    // Score update animation duration
  DEFAULT_COLOR: '#333333',
  DEFAULT_ICON: '🏆'
};

const EMOJI_MAP = {
  // Competition & Achievement
  rocket: '🚀', team: '👥', trophy: '🏆', star: '⭐', fire: '🔥',
  lightning: '⚡', heart: '❤️', thumbsup: '👍', celebrate: '🎉',
  winner: '🥇', second: '🥈', third: '🥉', crown: '👑', diamond: '💎',
  gold: '🥇', silver: '🥈', bronze: '🥉', medal: '🏅', cup: '🏆',
  flag: '🏁', target: '🎯', bullseye: '🎯', zap: '⚡', bolt: '⚡',
  flash: '⚡', speed: '💨', fast: '💨',
  
  // Animals
  slow: '🐌', turtle: '🐢', rabbit: '🐰', cheetah: '🐆', lion: '🦁',
  tiger: '🐅', bear: '🐻', wolf: '🐺', fox: '🦊', cat: '🐱',
  dog: '🐶', mouse: '🐭', hamster: '🐹', panda: '🐼', koala: '🐨',
  monkey: '🐵', gorilla: '🦍', orangutan: '🦧', horse: '🐴', unicorn: '🦄',
  zebra: '🦓', deer: '🦌', cow: '🐮', ox: '🐂', water_buffalo: '🐃',
  pig: '🐷', boar: '🐗', pig_nose: '🐽', ram: '🐏', sheep: '🐑',
  goat: '🐐', camel: '🪪', llama: '🦙', giraffe: '🦒', elephant: '🐘',
  rhinoceros: '🦏', hippopotamus: '🦛', rat: '🐀', chipmunk: '🐿️',
  beaver: '🦫', hedgehog: '🦔', bat: '🦇', polar_bear: '🐻‍❄️',
  sloth: '🦥', otter: '🦦', skunk: '🦨', kangaroo: '🦘', badger: '🦡',
  
  // Birds
  turkey: '🦃', chicken: '🐔', rooster: '🐓', hatching_chick: '🐣',
  baby_chick: '🐤', bird: '🐦', penguin: '🐧', dove: '🕊️', eagle: '🦅',
  duck: '🦆', swan: '🦢', owl: '🦉', dodo: '🦤', feather: '🪶',
  flamingo: '🦩', peacock: '🦚', parrot: '🦜',
  
  // Reptiles & Amphibians
  frog: '🐸', crocodile: '🐊', lizard: '🦎', snake: '🐍', dragon: '🐉',
  sauropod: '🦕', 't-rex': '🦖',
  
  // Marine Life
  whale: '🐋', dolphin: '🐬', seal: '🦭', fish: '🐟', tropical_fish: '🐠',
  blowfish: '🐡', shark: '🦈', octopus: '🐙', shell: '🐚', snail: '🐌',
  
  // Insects
  butterfly: '🦋', bug: '🐛', ant: '🐜', bee: '🐝', beetle: '🪲',
  ladybug: '🐞', cricket: '🦗', cockroach: '🪳', spider: '🕷️',
  spider_web: '🕸️', scorpion: '🦂', mosquito: '🦟', fly: '🪰',
  worm: '🪱', microbe: '🦠',
  
  // Plants & Nature
  bouquet: '💐', cherry_blossom: '🌸', white_flower: '💮', rosette: '🏵️',
  rose: '🌹', wilted_flower: '🥀', hibiscus: '🌺', sunflower: '🌻',
  blossom: '🌼', tulip: '🌷', seedling: '🌱', potted_plant: '🪴',
  evergreen_tree: '🌲', deciduous_tree: '🌳', palm_tree: '🌴',
  cactus: '🌵', sheaf_of_rice: '🌾', herb: '🌿', shamrock: '☘️',
  four_leaf_clover: '🍀', maple_leaf: '🍁', fallen_leaf: '🍂', leaves: '🍃'
};

const SPORT_ICONS = {
  quiz: '🧠',
  voetbal: '⚽',
  basketbal: '🏀',
  volleybal: '🏐',
  hockey: '🏑',
  tennis: '🎾',
  atletiek: '🏃',
  zwemmen: '🏊',
  fietsen: '🚴',
  hardlopen: '🏃',
  esports: '🎮',
  boardgame: '🎲',
  custom: '🎯'
};

const STATUS_MAP = {
  setup: 'Setup',
  active: 'Actief',
  paused: 'Gepauzeerd',
  completed: 'Voltooid'
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely escapes HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts emoji name to actual emoji character
 */
function getEmojiFromName(emojiName) {
  const safeName = String(emojiName || '').trim().toLowerCase();
  return safeName ? (EMOJI_MAP[safeName] || safeName || CONFIG.DEFAULT_ICON) : CONFIG.DEFAULT_ICON;
}

/**
 * Sanitizes color input to valid hex format
 */
function sanitizeColor(color) {
  if (!color) return CONFIG.DEFAULT_COLOR;
  
  try {
    let c = String(color).trim();
    if (!c.startsWith('#')) c = `#${c}`;
    
    // Expand 3-digit hex to 6-digit
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    }
    
    // Validate and avoid pure black
    if (/^#[0-9a-fA-F]{6}$/.test(c) && c.toLowerCase() !== '#000000') {
      return c.toLowerCase();
    }
    
    return CONFIG.DEFAULT_COLOR;
  } catch {
    return CONFIG.DEFAULT_COLOR;
  }
}

/**
 * Parses time or numeric points into milliseconds
 */
function parsePoints(raw, isTimeActivity) {
  if (raw == null) return 0;
  
  if (!isTimeActivity) {
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  }
  
  const n = Number(raw);
  if (!isNaN(n)) return n;
  
  const ms = SharedUtils.parseTimeToMs(String(raw));
  return isNaN(ms) ? 0 : ms;
}

/**
 * Checks if scores appear to be time values (heuristic)
 */
function looksLikeTimeData(scores) {
  return scores && scores.some(v => Number(v) >= 1000);
}

// ============================================================================
// Main BigScreenDisplay Class
// ============================================================================

class BigScreenDisplay {
  constructor() {
    // State
    this.currentSession = null;
    this.activeActivity = null;
    this.activeActivityId = null;
    this.lastUpdate = null;
    
    // Flags
    this.listenersSet = false;
    this.initialQREmitted = false;
    
    // Timers
    this.updateInterval = null;
    
    // DOM Elements (bound in bindElements)
    this.sessionTitle = null;
    this.sessionStatus = null;
    this.teamsContainer = null;
    this.lastUpdateTime = null;
    
    this.initialize();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  initialize() {
    this.bindElements();
    this.restoreActiveActivity();
    this.setupEventListeners();
    this.startAutoUpdate();
    this.loadInitialData();
    this.initializeQRCode();
  }

  bindElements() {
    this.sessionTitle = document.getElementById('sport-name');
    this.sessionStatus = document.getElementById('game-status');
    this.teamsContainer = document.getElementById('teams-container');
    this.lastUpdateTime = document.getElementById('last-update');
  }

  restoreActiveActivity() {
    try {
      const stored = localStorage?.getItem('activeActivityId');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          this.activeActivityId = parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to restore active activity:', error);
    }
  }

  setupEventListeners() {
    if (typeof api !== 'undefined' && api.socket && !this.listenersSet) {
      console.log('BigScreen: Setting up socket event listeners');
      this.setupSocketListeners();
      this.listenersSet = true;
    }
  }

  initializeQRCode() {
    this.showQR();
    if (api?.socket?.connected) {
      console.log('BigScreen: Emitting initial qr-state:', this.isQRVisible());
      api.socket.emit('qr-state', this.isQRVisible());
    }
  }

  // ==========================================================================
  // Socket Event Listeners
  // ==========================================================================

  setupSocketListeners() {
    const events = {
      'session_score_update': this.handleScoreUpdate.bind(this),
      'score_update': this.handleScoreUpdate.bind(this),
      'session_status_update': () => this.loadInitialData(),
      'team_update': this.handleTeamUpdate.bind(this),
      'session_update': () => this.loadInitialData(),
      'session_created': () => this.loadInitialData(),
      'set_active_activity': this.handleSetActiveActivity.bind(this),
      'welcome': this.handleWelcome.bind(this),
      'test_event': this.handleTestEvent.bind(this),
      'show-qr': () => this.setQRVisibility(true),
      'set-qr': this.setQRVisibility.bind(this),
      'connected': this.handleConnected.bind(this),
      'disconnected': this.handleDisconnected.bind(this)
    };

    Object.entries(events).forEach(([event, handler]) => {
      api.on(event, handler);
    });
  }

  handleScoreUpdate(data) {
    console.log('BigScreen: Received score update:', data);
    
    // Ignore updates for non-active activities
    if (!this.isRelevantUpdate(data)) {
      console.log('BigScreen: Ignoring score update for non-active activity');
      return;
    }

    this.updateScore(data);
  }

  handleTeamUpdate(data) {
    console.log('BigScreen: Received team update:', data);
    this.updateTeam(data);
  }

  handleSetActiveActivity(data) {
    console.log('BigScreen: Received set_active_activity:', data);
    this.activeActivityId = data.activityId;
    localStorage?.setItem('activeActivityId', String(data.activityId));
    this.loadInitialData();
  }

  handleWelcome(data) {
    console.log('BigScreen: Received welcome:', data);
    try {
      const incomingId = data?.active_activity_id || data?.activity?.id;
      if (incomingId && incomingId !== this.activeActivityId) {
        this.activeActivityId = incomingId;
        this.loadInitialData();
      }
    } catch (error) {
      console.warn('Failed to process welcome event:', error);
    }
  }

  handleTestEvent(data) {
    console.log('BigScreen: Received test_event:', data);
    alert('Test event received: ' + JSON.stringify(data));
  }

  handleConnected() {
    console.log('BigScreen: Socket.IO connected');
    this.showConnectionStatus('Connected', 'success');
    this.loadInitialData();
    
    if (!this.initialQREmitted) {
      console.log('BigScreen: Emitting qr-state on connect:', this.isQRVisible());
      api.socket.emit('qr-state', this.isQRVisible());
      this.initialQREmitted = true;
    }
  }

  handleDisconnected() {
    console.log('BigScreen: Socket.IO disconnected');
    this.showConnectionStatus('Disconnected', 'error');
  }

  isRelevantUpdate(data) {
    if (!this.activeActivityId) return true;
    
    const incomingActivityId = data?.activity_id ? parseInt(data.activity_id) : null;
    const incomingSessionId = data?.session_id ? parseInt(data.session_id) : null;
    
    return (incomingActivityId === this.activeActivityId) || 
           (incomingSessionId === this.activeActivityId) ||
           (incomingActivityId === null && incomingSessionId === null);
  }

  // ==========================================================================
  // QR Code Management
  // ==========================================================================

  isQRVisible() {
    const qrOverlay = document.getElementById('qr-overlay');
    return qrOverlay && qrOverlay.style.display !== 'none';
  }

  showQR() {
    const qrOverlay = document.getElementById('qr-overlay');
    if (qrOverlay) {
      qrOverlay.style.display = 'flex';
    }
  }

  hideQR() {
    const qrOverlay = document.getElementById('qr-overlay');
    if (qrOverlay) {
      qrOverlay.style.display = 'none';
    }
  }

  setQRVisibility(visible) {
    console.log('BigScreen: Setting QR visibility to:', visible);
    visible ? this.showQR() : this.hideQR();
    api.socket?.emit('qr-state', visible);
  }

  toggleQR() {
    const isVisible = this.isQRVisible();
    this.setQRVisibility(!isVisible);
  }

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  async loadInitialData() {
    try {
      const liveData = await this.fetchLeaderboardData();
      
      if (liveData?.session) {
        await this.processSessionData(liveData);
        this.updateDisplay(liveData);
      } else {
        this.showNoSessionMessage();
      }
    } catch (error) {
      api.handleError(error, 'loading initial data');
      this.showNoSessionMessage();
    }
  }

  async fetchLeaderboardData() {
    if (this.activeActivityId) {
      const data = await api.getActivityLeaderboard(this.activeActivityId);
      await this.loadActiveActivityDetails(this.activeActivityId);
      return data;
    }
    
    this.activeActivity = null;
    return await api.getLiveLeaderboard();
  }

  async loadActiveActivityDetails(activityId) {
    try {
      let fetched = await api.getActivity(activityId);
      this.activeActivity = fetched?.activity || fetched;
    } catch (error) {
      console.warn('BigScreen: Unable to load active activity details:', error);
      this.activeActivity = null;
    }
  }

  async processSessionData(liveData) {
    this.applyTheme(liveData.session.sport_type || 'custom');
    await this.resolveActiveActivity(liveData);
    await this.normalizeLeaderboardData(liveData);
    
    if (liveData.leaderboard?.length > 0) {
      await this.loadPlayersForLeaderboard(
        liveData.session.id,
        liveData.leaderboard,
        this.activeActivityId
      );
    }
  }

  async resolveActiveActivity(liveData) {
    if (this.activeActivityId && !this.activeActivity) {
      await this.loadActiveActivityDetails(this.activeActivityId);
      return;
    }

    if (!this.activeActivityId && liveData.session.activities?.length) {
      const activities = liveData.session.activities;
      const active = activities.find(a => a.is_active || a.active || a.status === 'active');
      
      if (active?.id) {
        this.activeActivityId = active.id;
      } else if (activities.length === 1) {
        this.activeActivityId = activities[0].id;
      }
      
      if (this.activeActivityId) {
        await this.loadActiveActivityDetails(this.activeActivityId);
      }
    }
  }

  async normalizeLeaderboardData(liveData) {
    const lb = liveData.leaderboard || [];
    const isParticipantData = lb.length > 0 && 'player_name' in lb[0];
    
    if (isParticipantData) {
      try {
        const teamsResp = await api.getSessionTeams(liveData.session.id);
        const teams = teamsResp?.teams || [];
        
        liveData.leaderboard = teams.map(t => ({
          team_id: t.id,
          team_name: t.name,
          team_icon: t.icon,
          team_color: t.color,
          total_score: t.total_score || t.score || 0,
          is_eliminated: Boolean(t.is_eliminated)
        }));
      } catch (error) {
        console.warn('BigScreen: Fallback to team leaderboard failed:', error);
        liveData.leaderboard = [];
      }
    }
  }

  async loadPlayersForLeaderboard(sessionId, leaderboard, activityId = null) {
    if (!leaderboard?.length) return;
    
    const isParticipantData = 'player_name' in leaderboard[0];
    if (isParticipantData) return;

    const allScores = await this.fetchAllScores(sessionId, activityId);
    const activity = await this.ensureActivityDetails(activityId);
    
    const isTimeActivity = activity && String(activity.game_type) === 'team_vs_time';
    const aggregatePlayerTimes = activity?.aggregate_player_times || false;
    const timeWinner = (activity?.time_winner || 'lower').toLowerCase();
    
    console.warn('BigScreen: loadPlayersForLeaderboard - Activity Settings', {
      activityId,
      activity: activity ? {
        id: activity.id,
        name: activity.name,
        game_type: activity.game_type,
        time_winner: activity.time_winner,
        aggregate_player_times: activity.aggregate_player_times
      } : null,
      derived: {
        isTimeActivity,
        aggregatePlayerTimes,
        timeWinner
      },
      allScoresCount: allScores.length
    });
    
    const teamTotals = this.calculateTeamTotals(allScores, isTimeActivity);
    
    for (const team of leaderboard) {
      if (!team.team_id) {
        team.players = [];
        team.playerScores = {};
        continue;
      }
      
      await this.loadTeamPlayers(
        sessionId,
        team,
        allScores,
        isTimeActivity,
        aggregatePlayerTimes,
        timeWinner,
        teamTotals
      );
    }
  }

  async fetchAllScores(sessionId, activityId) {
    try {
      const response = activityId
        ? await api.getActivityScores(activityId)
        : await api.get(`/api/v1/sessions/${sessionId}/scores`);
      return response.scores || [];
    } catch (error) {
      console.warn('Could not load scores for player stats:', error);
      return [];
    }
  }

  async ensureActivityDetails(activityId) {
    const needsFreshFetch = !this.activeActivity ||
      !this.activeActivity.game_type ||
      this.activeActivity.id !== activityId ||
      this.activeActivity.aggregate_player_times === undefined ||
      this.activeActivity.time_winner === undefined;

    if (activityId && needsFreshFetch) {
      try {
        this.activeActivity = await api.getActivity(activityId);
      } catch (error) {
        console.warn('Failed to load activity details:', error);
      }
    }

    return this.activeActivity || null;
  }

  calculateTeamTotals(allScores, isTimeActivity) {
    const totals = {};
    
    for (const score of allScores) {
      if (!score.team_id) continue;
      const points = parsePoints(score.points, isTimeActivity);
      totals[score.team_id] = (totals[score.team_id] || 0) + points;
    }
    
    return totals;
  }

  async loadTeamPlayers(sessionId, team, allScores, isTimeActivity, aggregatePlayerTimes, timeWinner, teamTotals) {
    try {
      const resp = await api.get(`/api/v1/sessions/${sessionId}/teams/${team.team_id}/players`);
      team.players = (resp?.players || []).sort((a, b) =>
        (a.name || a.player_name || '').localeCompare(b.name || b.player_name || '')
      );
      
      team.playerScores = this.calculatePlayerScores(team, allScores, isTimeActivity);
      
      if (isTimeActivity) {
        this.calculateTimeActivityTeamScore(
          team,
          aggregatePlayerTimes,
          timeWinner,
          teamTotals
        );
      } else if (teamTotals[team.team_id] !== undefined) {
        team.total_score = teamTotals[team.team_id];
      }
    } catch (error) {
      await this.handlePlayerLoadError(error, team);
    }
  }

  calculatePlayerScores(team, allScores, isTimeActivity) {
    const scores = {};
    
    if (!team.players?.length) return scores;
    
    team.players.forEach(player => {
      const playerPoints = allScores
        .filter(score => 
          score.player_id === player.id &&
          (!team.team_id || score.team_id === team.team_id)
        )
        .reduce((sum, score) => sum + parsePoints(score.points, isTimeActivity), 0);
      
      scores[String(player.id)] = playerPoints;
    });
    
    return scores;
  }

  calculateTimeActivityTeamScore(team, aggregatePlayerTimes, timeWinner, teamTotals) {
    const playerVals = Object.values(team.playerScores).map(v => Number(v) || 0);
    
    console.debug('BigScreen: time activity calculation', {
      team_id: team.team_id,
      team_name: team.team_name || team.name,
      current_total_score: team.total_score,
      aggregatePlayerTimes,
      timeWinner,
      playerVals,
      playerScores: team.playerScores,
      players: team.players?.map(p => ({id: p.id, name: p.name}))
    });
    
    if (playerVals.length > 0) {
      if (aggregatePlayerTimes) {
        team.total_score = playerVals.reduce((a, b) => a + b, 0);
      } else {
        team.total_score = timeWinner === 'higher'
          ? Math.max(...playerVals)
          : Math.min(...playerVals);
      }
      
      console.debug('BigScreen: computed team score', {
        team_id: team.team_id,
        team_name: team.team_name || team.name,
        new_total_score: team.total_score,
        calculation_method: aggregatePlayerTimes ? 'sum' : (timeWinner === 'higher' ? 'max' : 'min')
      });
    } else if (teamTotals[team.team_id] !== undefined) {
      team.total_score = teamTotals[team.team_id];
    }
  }

  async handlePlayerLoadError(error, team) {
    const is405 = error?.status === 405 || error?.message?.includes('405');
    
    if (is405 && team.team_id) {
      try {
        const fallback = await api.get(`/api/v1/players?team_id=${team.team_id}`);
        team.players = (fallback?.players || []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        team.playerScores = {};
      } catch {
        team.players = [];
        team.playerScores = {};
      }
    } else {
      team.players = [];
      team.playerScores = {};
    }
  }

  // ==========================================================================
  // Display Updates
  // ==========================================================================

  updateDisplay(liveData) {
    if (liveData.session) {
      this.currentSession = liveData.session;
      this.updateSessionInfo(liveData.session);
    }
    
    if (liveData.leaderboard) {
      this.updateLeaderboard(liveData.leaderboard);
    }
    
    this.updateLastUpdateTime();
  }

  updateSessionInfo(session) {
    if (!this.sessionTitle) return;
    
    const scoringModeIcon = session.scoring_mode === 'player' ? '👤' : '👥';
    let titleText = session.name || 'SportScore Session';
    
    // Add active activity name if available
    if (this.activeActivity?.name) {
      titleText += ` - ${this.activeActivity.name}`;
    } else if (this.activeActivityId && session.activities) {
      const activeActivity = session.activities.find(a => a.id == this.activeActivityId);
      if (activeActivity) {
        titleText += ` - ${activeActivity.name}`;
      }
    }
    
    this.sessionTitle.textContent = titleText;
    
    // Update scoring mode icon
    const existingIcon = this.sessionTitle.querySelector('.scoring-mode-icon');
    if (existingIcon) {
      existingIcon.textContent = scoringModeIcon;
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'scoring-mode-icon';
      iconSpan.textContent = scoringModeIcon;
      iconSpan.title = session.scoring_mode === 'player' 
        ? 'Speler Scores Modus' 
        : 'Team Scores Modus';
      this.sessionTitle.appendChild(iconSpan);
    }
    
    // Update status
    if (this.sessionStatus) {
      this.sessionStatus.textContent = STATUS_MAP[session.status] || session.status;
      this.sessionStatus.className = `game-status status-${session.status}`;
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.teamsContainer) return;
    
    this.teamsContainer.innerHTML = '';
    
    if (!leaderboard?.length) {
      this.teamsContainer.innerHTML = '<div class="no-teams">Geen deelnemers in sessie</div>';
      return;
    }
    
    const effective = this.getEffectiveActivity();
    const lowerIsBetter = SharedUtils.isLowerBetter(effective);
    
    // Check for incomplete activity details and refresh if needed
    if (this.needsActivityRefresh(effective)) {
      this.refreshActivityAndRerender(leaderboard);
      return;
    }
    
    const scoringMode = this.getScoringMode();
    const isParticipantData = 'player_name' in leaderboard[0];
    
    console.debug('BigScreen: updateLeaderboard', {
      effective: effective ? {
        id: effective.id,
        game_type: effective.game_type,
        time_winner: effective.time_winner,
        aggregate_player_times: effective.aggregate_player_times
      } : null
    });
    
    if (scoringMode === 'player') {
      this.updatePlayerLeaderboard(leaderboard, { lowerIsBetter });
    } else if (isParticipantData) {
      this.updateParticipantLeaderboard(leaderboard, { lowerIsBetter });
    } else {
      this.updateTeamLeaderboard(leaderboard, { lowerIsBetter });
    }
  }

  needsActivityRefresh(effective) {
    return effective && 
           String(effective.game_type) === 'team_vs_time' && 
           (effective.time_winner === undefined || effective.time_winner === null);
  }

  async refreshActivityAndRerender(leaderboard) {
    try {
      const currentActivity = this.getEffectiveActivity();
      const aid = this.activeActivityId || currentActivity?.id;
      
      if (aid) {
        let fetched = await api.getActivity(aid);
        this.activeActivity = fetched?.activity || fetched;
      }
    } catch (error) {
      console.warn('BigScreen: Could not refresh activity details:', error);
    } finally {
      this.updateLeaderboard(leaderboard);
    }
  }

  getScoringMode() {
    return this.activeActivity?.scoring_mode || 
           this.currentSession?.scoring_mode || 
           'team';
  }

  updateTeamLeaderboard(leaderboard, options = {}) {
    const { lowerIsBetter } = options;
    
    // Filter eliminated teams in elimination mode
    if (this.currentSession?.game_mode === 'elimination') {
      leaderboard = leaderboard.filter(team => !team.is_eliminated);
    }
    
    // Sort leaderboard
    leaderboard.sort((a, b) => {
      const scoreA = a.total_score || 0;
      const scoreB = b.total_score || 0;
      return lowerIsBetter ? (scoreA - scoreB) : (scoreB - scoreA);
    });
    
    // Apply layout class
    this.teamsContainer.className = 'leaderboard-container';
    if (leaderboard.length === 2) {
      this.teamsContainer.classList.add('two-teams');
    }
    
    console.debug('BigScreen: rendering teams', leaderboard.map(t => ({
      team_id: t.team_id || t.id,
      name: t.name,
      score: t.total_score || t.score || 0,
      color: t.team_color || t.color
    })));
    
    // Render teams
    leaderboard.forEach((team, index) => {
      const teamElement = this.createTeamElement(team, index + 1);
      this.teamsContainer.appendChild(teamElement);
    });
  }

  updatePlayerLeaderboard(leaderboard, options = {}) {
    const { lowerIsBetter } = options;
    
    // Flatten players from team structures
    const players = [];
    leaderboard.forEach(team => {
      if (!team.players?.length) return;
      
      team.players.forEach(p => {
        const score = team.playerScores?.[p.id] ?? 0;
        players.push({
          player_name: p.name || p.player_name || `Speler ${p.id}`,
          total_score: score,
          player_id: p.id,
          team_name: team.team_name || null
        });
      });
    });
    
    // Sort players
    players.sort((a, b) => 
      lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score)
    );
    
    // Render participant view
    this.teamsContainer.className = 'leaderboard-container participant-leaderboard';
    players.forEach((participant, idx) => {
      const el = this.createParticipantElement({
        player_name: participant.player_name,
        total_score: participant.total_score
      }, idx + 1);
      this.teamsContainer.appendChild(el);
    });
  }

  updateParticipantLeaderboard(participants, options = {}) {
    const { lowerIsBetter } = options;
    
    // Sort participants
    participants.sort((a, b) => 
      lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score)
    );
    
    // Render
    this.teamsContainer.className = 'leaderboard-container participant-leaderboard';
    participants.forEach((participant, index) => {
      const participantElement = this.createParticipantElement(participant, index + 1);
      this.teamsContainer.appendChild(participantElement);
    });
  }

  // ==========================================================================
  // Element Creation
  // ==========================================================================

  createTeamElement(team, position) {
    const teamDiv = document.createElement('div');
    teamDiv.className = `leaderboard-team ${team.is_eliminated ? 'eliminated' : ''}`;
    
    // Normalize team data
    const teamData = this.normalizeTeamData(team);
    
    console.debug('BigScreen: createTeamElement', {
      team_id: teamData.id,
      team_name: teamData.name,
      original_total_score: team.total_score,
      original_score: team.score,
      normalized_score: teamData.score
    });
    
    teamDiv.style.borderLeftColor = teamData.color;
    
    if (teamData.id) {
      teamDiv.setAttribute('data-team-id', teamData.id);
    }
    
    const scoringMode = this.getScoringMode();
    const isTimeMode = this.isTimeMode();
    const showPlayers = this.currentSession?.show_players !== false;
    
    const playersHtml = this.renderTeamPlayers(teamData, {
      scoringMode,
      isTimeMode,
      showPlayers
    });
    
    const displayScore = isTimeMode 
      ? SharedUtils.formatMs(teamData.score)
      : teamData.score;
    
    teamDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="team-name">${escapeHtml(teamData.name)}</div>
      <div class="team-icon">${getEmojiFromName(teamData.icon)}</div>
      <div class="team-score" data-team-score-ms="${teamData.score}" title="raw-ms:${teamData.score}">${displayScore}</div>
      ${playersHtml}
    `;
    
    return teamDiv;
  }

  normalizeTeamData(team) {
    return {
      id: team.team_id || team.id || team.teamId,
      name: team.team_name || team.name || 'Team',
      color: sanitizeColor(team.team_color || team.color),
      icon: team.team_icon || team.icon || 'team',
      score: team.total_score ?? team.score ?? 0,
      players: team.players || [],
      playerScores: team.playerScores || {}
    };
  }

  renderTeamPlayers(teamData, options) {
    const { scoringMode, isTimeMode, showPlayers } = options;
    
    if (!teamData.players.length || !showPlayers) {
      return '';
    }
    
    if (scoringMode !== 'player' && 
        scoringMode !== 'team_with_players' && 
        !isTimeMode) {
      return '';
    }
    
    const entries = teamData.players.map(p => ({
      p,
      s: teamData.playerScores[p.id] || 0
    }));
    
    const lowerIsBetter = SharedUtils.isLowerBetter(this.getEffectiveActivity());
    entries.sort((a, b) => lowerIsBetter ? (a.s - b.s) : (b.s - a.s));
    
    const isTimeModeLocal = isTimeMode || looksLikeTimeData(entries.map(e => e.s));
    
    if (scoringMode === 'player') {
      return this.renderAllPlayersMode(entries, isTimeModeLocal);
    }
    
    return this.renderTeamWithPlayersMode(entries, isTimeModeLocal);
  }

  renderAllPlayersMode(entries, isTimeMode) {
    const playerBadges = entries.map(({ p, s }) => {
      const name = p.position ? `${p.name} (${p.position})` : p.name;
      const hasScore = s !== undefined && s !== null && (s !== 0 || isTimeMode);
      const displayScore = isTimeMode ? SharedUtils.formatMs(s) : s;
      const scoreClass = hasScore ? 'with-score' : 'no-score';
      
      return `
        <span class="player-badge-bigscreen ${scoreClass}" 
              data-player-id="${p.id}" 
              data-player-score-ms="${s || 0}" 
              title="raw-ms:${s || 0}">
          <span class="player-name-part">${escapeHtml(name)}</span>
          ${hasScore ? `<span class="player-score-part">${displayScore}</span>` : ''}
        </span>
      `;
    }).join('');
    
    return `<div class="team-players-bigscreen all-players">${playerBadges}</div>`;
  }

  renderTeamWithPlayersMode(entries, isTimeMode) {
    const bestScore = entries.length > 0 ? entries[0].s : null;
    
    const playerBadges = entries.map(({ p, s }) => {
      const name = p.position ? `${p.name} (${p.position})` : p.name;
      const hasScore = s !== undefined && s !== null && (s !== 0 || isTimeMode);
      const displayScore = isTimeMode ? SharedUtils.formatMs(s) : s;
      const topClass = (bestScore !== null && s === bestScore) ? 'top-player' : '';
      const scoreClass = hasScore ? 'with-score' : 'no-score';
      
      return `
        <span class="player-badge-bigscreen ${topClass} ${scoreClass}" 
              data-player-id="${p.id}" 
              data-player-score-ms="${s || 0}" 
              title="raw-ms:${s || 0}">
          <span class="player-name-part">${escapeHtml(name)}</span>
          ${hasScore ? `<span class="player-score-part">${displayScore}</span>` : ''}
        </span>
      `;
    }).join('');
    
    return `<div class="team-players-bigscreen team-with-players">${playerBadges}</div>`;
  }

  createParticipantElement(participant, position) {
    const participantDiv = document.createElement('div');
    participantDiv.className = 'leaderboard-team participant-item';
    
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[position - 1] || '🏅';
    
    const activityScoresHtml = this.renderActivityScores(participant.activity_scores);
    const isTimeMode = this.isTimeMode();
    const displayTotal = isTimeMode 
      ? SharedUtils.formatMs(participant.total_score || 0)
      : `${participant.total_score} punten`;
    
    participantDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="participant-medal">${medal}</div>
      <div class="participant-name">${escapeHtml(participant.player_name)}</div>
      ${activityScoresHtml}
      <div class="participant-total">${displayTotal}</div>
    `;
    
    return participantDiv;
  }

  renderActivityScores(activityScores) {
    if (!activityScores || !Object.keys(activityScores).length) {
      return '';
    }
    
    const badges = Object.entries(activityScores)
      .map(([id, score]) => `<span class="activity-score-badge">${score}</span>`)
      .join('');
    
    return `<div class="participant-activity-scores">${badges}</div>`;
  }

  // ==========================================================================
  // Score Updates
  // ==========================================================================

  updateScore(data) {
    try {
      console.log('Score update received:', data);
      
      if (!this.currentSession || !this.teamsContainer) {
        this.loadInitialData();
        return;
      }
      
      // Check if full refresh needed
      if (this.needsFullRefresh(data)) {
        console.debug('BigScreen: Performing full refresh');
        this.loadInitialData();
        return;
      }
      
      // Handle player-specific update
      if (data.player_id) {
        this.updatePlayerScore(data);
        return;
      }
      
      // Handle team-level update
      this.updateTeamScore(data);
    } catch (error) {
      console.error('BigScreen.updateScore failed:', error, data);
      this.loadInitialData();
    }
  }

  needsFullRefresh(data) {
    const scoringMode = this.getScoringMode();
    const isTimeMode = this.isTimeMode();
    
    return isTimeMode || 
           scoringMode === 'player' || 
           (!data.player_id && scoringMode === 'team_with_players');
  }

  updatePlayerScore(data) {
    const scoringMode = this.getScoringMode();
    const isTimeMode = this.isTimeMode();
    
    if (!isTimeMode && scoringMode !== 'team_with_players') {
      console.log('Player update in player mode, refreshing');
      this.loadInitialData();
      return;
    }
    
    const teamElement = this.findTeamElement(data.team_id);
    if (!teamElement) {
      console.log('Could not find team element, doing full refresh');
      this.loadInitialData();
      return;
    }
    
    this.updatePlayerBadge(teamElement, data, isTimeMode);
    this.updateTeamScoreFromPlayers(teamElement, isTimeMode);
    this.sortLeaderboard();
  }

  updatePlayerBadge(teamElement, data, isTimeMode) {
    const playerBadge = teamElement.querySelector(`[data-player-id="${data.player_id}"]`);
    if (!playerBadge) return;
    
    const currentMs = parseInt(playerBadge.getAttribute('data-player-score-ms')) || 0;
    const newMs = currentMs + (data.points || 0);
    
    playerBadge.setAttribute('data-player-score-ms', String(newMs));
    
    const scorePart = playerBadge.querySelector('.player-score-part');
    const displayScore = isTimeMode ? SharedUtils.formatMs(newMs) : newMs;
    
    if (scorePart) {
      scorePart.textContent = displayScore;
    } else if (isTimeMode || newMs > 0) {
      const span = document.createElement('span');
      span.className = 'player-score-part';
      span.textContent = displayScore;
      playerBadge.appendChild(span);
    }
    
    playerBadge.classList.add('player-score-flash');
    setTimeout(() => playerBadge.classList.remove('player-score-flash'), CONFIG.FLASH_DURATION);
  }

  updateTeamScoreFromPlayers(teamElement, isTimeMode) {
    const scoreElement = teamElement.querySelector('.team-score');
    if (!scoreElement) return;
    
    const activity = this.activeActivity;
    const aggregatePlayerTimes = activity?.aggregate_player_times || false;
    const timeWinner = (activity?.time_winner || 'lower').toLowerCase();
    
    const playerBadges = teamElement.querySelectorAll('[data-player-score-ms]');
    const playerScores = Array.from(playerBadges)
      .map(pb => parseInt(pb.getAttribute('data-player-score-ms')) || 0);
    
    let newTeamScore;
    if (aggregatePlayerTimes) {
      newTeamScore = playerScores.reduce((a, b) => a + b, 0);
    } else if (playerScores.length > 0) {
      newTeamScore = timeWinner === 'higher'
        ? Math.max(...playerScores)
        : Math.min(...playerScores);
    } else {
      const currentScore = parseInt(scoreElement.getAttribute('data-team-score-ms')) || 0;
      newTeamScore = currentScore;
    }
    
    scoreElement.setAttribute('data-team-score-ms', String(newTeamScore));
    scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(newTeamScore) : newTeamScore;
    scoreElement.classList.add('score-flash');
    setTimeout(() => scoreElement.classList.remove('score-flash'), CONFIG.FLASH_DURATION);
  }

  updateTeamScore(data) {
    const teamElement = this.findTeamElement(data.team_id);
    
    if (!teamElement) {
      console.log('Could not find team element, doing full refresh');
      this.loadInitialData();
      return;
    }
    
    const scoreElement = teamElement.querySelector('.team-score');
    if (!scoreElement) return;
    
    const isTimeMode = this.isTimeMode();
    const currentScore = parseInt(scoreElement.getAttribute('data-team-score-ms')) || 0;
    const newScore = currentScore + (data.points || 0);
    
    scoreElement.setAttribute('data-team-score-ms', String(newScore));
    scoreElement.textContent = isTimeMode ? SharedUtils.formatMs(newScore) : newScore;
    scoreElement.classList.add('score-flash');
    setTimeout(() => scoreElement.classList.remove('score-flash'), CONFIG.FLASH_DURATION);
    
    this.sortTeams();
  }

  findTeamElement(teamId) {
    const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');
    for (const element of teamElements) {
      const teamIdAttr = element.getAttribute('data-team-id');
      if (teamIdAttr && parseInt(teamIdAttr) === parseInt(teamId)) {
        return element;
      }
    }
    return null;
  }

  updateTeam(data) {
    if (!this.currentSession || !this.teamsContainer) {
      this.loadInitialData();
      return;
    }
    
    const teamData = this.normalizeTeamUpdateData(data);
    
    if (data.action === 'deleted') {
      this.removeTeamElement(teamData.team_name);
    } else {
      this.updateOrAddTeam(teamData);
    }
    
    this.updateLastUpdateTime();
  }

  normalizeTeamUpdateData(data) {
    return {
      team_name: data.team.name,
      team_icon: data.team.icon,
      team_color: data.team.color,
      total_score: data.team.total_score || data.team.score || 0,
      is_eliminated: data.team.is_eliminated || false
    };
  }

  removeTeamElement(teamName) {
    const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');
    for (const element of teamElements) {
      const nameElement = element.querySelector('.team-name');
      if (nameElement?.textContent === teamName) {
        element.remove();
        break;
      }
    }
  }

  updateOrAddTeam(teamData) {
    const teamElement = this.findTeamElementByName(teamData.team_name);
    
    if (teamElement) {
      this.updateExistingTeam(teamElement, teamData);
    } else {
      this.addNewTeam(teamData);
    }
    
    this.sortLeaderboard();
  }

  findTeamElementByName(teamName) {
    const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');
    for (const element of teamElements) {
      const nameElement = element.querySelector('.team-name');
      if (nameElement?.textContent === teamName) {
        return element;
      }
    }
    return null;
  }

  updateExistingTeam(teamElement, teamData) {
    const iconElement = teamElement.querySelector('.team-icon');
    const scoreElement = teamElement.querySelector('.team-score');
    
    if (iconElement) {
      iconElement.textContent = getEmojiFromName(teamData.team_icon);
    }
    
    if (scoreElement) {
      const isTimeMode = this.isTimeMode();
      scoreElement.setAttribute('data-team-score-ms', String(teamData.total_score || 0));
      scoreElement.textContent = isTimeMode 
        ? SharedUtils.formatMs(teamData.total_score || 0)
        : (teamData.total_score || 0);
    }
    
    teamElement.style.borderLeftColor = teamData.team_color || CONFIG.DEFAULT_COLOR;
    
    if (teamData.is_eliminated) {
      teamElement.classList.add('eliminated');
    } else {
      teamElement.classList.remove('eliminated');
    }
  }

  addNewTeam(teamData) {
    const position = this.teamsContainer.querySelectorAll('.leaderboard-team').length + 1;
    const newTeamElement = this.createTeamElement(teamData, position);
    this.teamsContainer.appendChild(newTeamElement);
  }

  // ==========================================================================
  // Sorting
  // ==========================================================================

  sortLeaderboard() {
    if (!this.teamsContainer) return;
    
    const teamElements = Array.from(this.teamsContainer.querySelectorAll('.leaderboard-team'));
    const lowerIsBetter = SharedUtils.isLowerBetter(this.getEffectiveActivity());
    
    teamElements.sort((a, b) => {
      const scoreA = parseInt(a.querySelector('.team-score')?.getAttribute('data-team-score-ms')) || 0;
      const scoreB = parseInt(b.querySelector('.team-score')?.getAttribute('data-team-score-ms')) || 0;
      return lowerIsBetter ? (scoreA - scoreB) : (scoreB - scoreA);
    });
    
    teamElements.forEach((element, index) => {
      const positionElement = element.querySelector('.team-position');
      if (positionElement) {
        positionElement.textContent = index + 1;
      }
      this.teamsContainer.appendChild(element);
    });
  }

  sortTeams() {
    this.sortLeaderboard();
  }

  // ==========================================================================
  // Theming
  // ==========================================================================

  applyTheme(sportType) {
    document.body.setAttribute('data-sport', sportType || 'custom');
    
    const icon = SPORT_ICONS[sportType] || SPORT_ICONS.custom;
    document.title = `${icon} SportScore - Live Scorebord`;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  getEffectiveActivity() {
    if (this.activeActivity?.game_type) {
      return this.activeActivity;
    }
    
    if (this.activeActivityId && this.currentSession?.activities) {
      const match = this.currentSession.activities.find(
        a => String(a.id) === String(this.activeActivityId)
      );
      if (match) return match;
    }
    
    if (this.currentSession?.activities?.length === 1) {
      return this.currentSession.activities[0];
    }
    
    return null;
  }

  isTimeMode() {
    const activity = this.getEffectiveActivity();
    return activity && String(activity.game_type) === 'team_vs_time';
  }

  updateLastUpdateTime() {
    if (this.lastUpdateTime) {
      const now = new Date();
      this.lastUpdateTime.textContent = `Laatste update: ${now.toLocaleTimeString()}`;
    }
  }

  showNoSessionMessage() {
    if (this.sessionTitle) {
      this.sessionTitle.textContent = 'SportScore';
    }
    
    if (this.sessionStatus) {
      this.sessionStatus.textContent = 'Geen actieve sessie';
      this.sessionStatus.className = 'game-status status-inactive';
    }
    
    if (this.teamsContainer) {
      this.teamsContainer.innerHTML = `
        <div class="no-session">
          Geen actieve teambuilding sessie gevonden.<br>
          Start een sessie via de admin interface.
        </div>
      `;
    }
  }

  showConnectionStatus(status, type) {
    console.log(`Connection: ${status}`);
  }

  startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      this.loadInitialData();
    }, CONFIG.UPDATE_INTERVAL);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stopAutoUpdate();
    // Clean up any other resources if needed
  }
}

// ============================================================================
// Admin Functions
// ============================================================================

function showAdminLogin() {
  const modal = document.getElementById('admin-modal');
  const passwordInput = document.getElementById('admin-password');
  
  if (modal && passwordInput) {
    modal.classList.add('show');
    passwordInput.focus();
    passwordInput.value = '';
  }
}

function hideAdminLogin() {
  const modal = document.getElementById('admin-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.bigScreenDisplay = new BigScreenDisplay();
  } catch (error) {
    console.error('Failed to initialize BigScreenDisplay:', error);
    window.showGlobalFatalError?.(
      `Fout bij initialisatie BigScreen: ${error?.message || String(error)}`
    );
  }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BigScreenDisplay };
}