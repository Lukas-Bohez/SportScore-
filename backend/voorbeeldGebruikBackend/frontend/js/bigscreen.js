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
 * @version 2.0.2
 */

// ============================================================================
// Constants
// ============================================================================

const CONFIG = {
  UPDATE_INTERVAL: 30000,  // 30 seconds - reduced refresh rate
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
  goat: '🐐', camel: '🐪', llama: '🦙', giraffe: '🦒', elephant: '🐘',
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
  
  // Use SharedUtils if available, otherwise just return the number
  if (typeof SharedUtils !== 'undefined' && SharedUtils.parseTimeToMs) {
    const ms = SharedUtils.parseTimeToMs(String(raw));
    return isNaN(ms) ? 0 : ms;
  }
  
  return 0;
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
    this.api = typeof api !== 'undefined' ? api : null;
    
    // Flags
    this.listenersSet = false;
    this.initialQREmitted = false;
    
    // Timers
    this.updateInterval = null;
    
    // Round State
    this.currentRound = 1;
    this.totalRounds = 1;
    this.roundStatus = 'not_started';
    this.timeLimitPerRound = null;
    this.roundTimeRemaining = 0;
    this.roundTimerInterval = null;
    this.roundStartTime = null;
    this.selectedActivityId = null;
    
    // DOM Elements (bound in bindElements)
    this.sessionTitle = null;
    this.sessionStatus = null;
    this.teamsContainer = null;
    this.lastUpdateTime = null;
    this.roundInfo = null;
    this.timer = null;
    
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
    this.roundInfo = document.getElementById('round-info');
    this.timer = document.getElementById('timer');
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
    if (this.api && this.api.socket && !this.listenersSet) {
      console.log('BigScreen: Setting up socket event listeners');
      this.setupSocketListeners();
      this.listenersSet = true;
    }
  }

  initializeQRCode() {
    this.showQR();
    if (this.api?.socket?.connected) {
      console.log('BigScreen: Emitting initial qr-state:', this.isQRVisible());
      this.api.socket.emit('qr-state', this.isQRVisible());
    }
  }

  // ==========================================================================
  // Round Timer Management
  // ==========================================================================

  startRoundTimer(initialSeconds) {
    // If a timer is already running, just resync the remaining time without recreating the interval
    const hadInterval = Boolean(this.roundTimerInterval);

    if (!hadInterval) {
      this.stopRoundTimer(); // Clear any existing timer (safety)
    }

    if (initialSeconds == null || initialSeconds === '' || isNaN(Number(initialSeconds))) {
      // Nothing sensible to start - show placeholder and bail out
      this.roundTimeRemaining = 0;
      this.updateRoundTimerDisplay(null);
      return;
    }

    let s = Number(initialSeconds);
    // Convert ms to seconds when appropriate
    if (s > 10000) s = Math.floor(s / 1000);

    this.roundTimeRemaining = Math.max(0, Math.floor(s));
    // Update display immediately even when zero
    this.updateRoundTimerDisplay(this.roundTimeRemaining);
    
    if (this.roundTimeRemaining <= 0) return;
    
    if (!hadInterval) {
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
  }

  stopRoundTimer() {
    if (this.roundTimerInterval) {
      clearInterval(this.roundTimerInterval);
      this.roundTimerInterval = null;
    }
  }

  // ==========================================================================
  // Socket Event Listeners
  // ==========================================================================

  setupSocketListeners() {
    if (!this.api || !this.api.on) {
      console.warn('API object not available for socket listeners');
      return;
    }

    const events = {
      'session_score_update': this.handleScoreUpdate.bind(this),
      'score_update': this.handleScoreUpdate.bind(this),
      'session_status_update': () => this.loadInitialData(),
      'team_update': this.handleTeamUpdate.bind(this),
      'session_update': () => this.loadInitialData(),
      'session_created': () => this.loadInitialData(),
      'session_ended': () => this.handleSessionEnded(),
      'set_active_activity': this.handleSetActiveActivity.bind(this),
      'welcome': this.handleWelcome.bind(this),
      'test_event': this.handleTestEvent.bind(this),
      'show-qr': () => this.setQRVisibility(true),
      'set-qr': this.setQRVisibility.bind(this),
      'connected': this.handleConnected.bind(this),
      'disconnected': this.handleDisconnected.bind(this),
      // Round events - explicit handlers so we can start/stop timers reliably
      'round_started': this.handleRoundStarted.bind(this),
      'round_ended': this.handleRoundEnded.bind(this),
      'round_changed': this.handleRoundChanged.bind(this),
      'round_paused': this.handleRoundPaused.bind(this),
      'round_resumed': this.handleRoundResumed.bind(this),
      'round_time_update': this.handleRoundTimeUpdate.bind(this),
      'round_auto_advanced': this.handleRoundEvent.bind(this),
      'activity_completed': this.handleRoundEvent.bind(this)
    };

    Object.entries(events).forEach(([event, handler]) => {
      this.api.on(event, handler);
    });
  }

  handleScoreUpdate(data) {
    console.log('BigScreen: Received score update:', data);
    
    // Ignore updates for non-active activities
    if (!this.isRelevantUpdate(data)) {
      console.log('BigScreen: Ignoring score update for non-active activity');
      return;
    }

    // Always do a full refresh to ensure all data is up-to-date
    console.log('BigScreen: Performing full data refresh for score update');
    this.loadInitialData();
  }

  handleTeamUpdate(data) {
    console.log('BigScreen: Received team update:', data);
    // Full refresh to ensure all team data is current
    this.loadInitialData();
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

  handleSessionEnded() {
    console.log('BigScreen: Session ended, clearing active session');
    this.currentSession = null;
    this.activeActivity = null;
    this.activeActivityId = null;
    this.stopRoundTimer();
    localStorage?.removeItem('activeActivityId');
    // Immediately load last session
    this.loadLastSession();
  }

  handleConnected() {
    console.log('BigScreen: Socket.IO connected');
    this.showConnectionStatus('Connected', 'success');
    this.loadInitialData();
    
    if (!this.initialQREmitted && this.api?.socket) {
      console.log('BigScreen: Emitting qr-state on connect:', this.isQRVisible());
      this.api.socket.emit('qr-state', this.isQRVisible());
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
    // Accept either a boolean or the API-wrapped payload object ({ data: boolean, event_type: 'set-qr' })
    let isVisible = false;
    try {
      if (visible && typeof visible === 'object' && 'data' in visible) {
        isVisible = Boolean(visible.data);
      } else {
        isVisible = Boolean(visible);
      }
    } catch (e) {
      console.warn('BigScreen: Failed to parse set-qr payload, defaulting to show:', e);
      isVisible = true;
    }

    console.log('BigScreen: Setting QR visibility to (normalized):', isVisible, 'raw:', visible);
    isVisible ? this.showQR() : this.hideQR();

    try { 
      if (this.api?.socket) {
        this.api.socket.emit('qr-state', isVisible);
      }
    } catch (e) { 
      console.warn('Failed to emit qr-state:', e); 
    }
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
      
      if (liveData?.session && liveData.session.is_active !== false) {
        await this.processSessionData(liveData);
        this.updateDisplay(liveData);
      } else {
        await this.loadLastSession();
      }
    } catch (error) {
      if (this.api?.handleError) {
        this.api.handleError(error, 'loading initial data');
      } else {
        console.error('Error loading initial data:', error);
      }
      this.showNoSessionMessage();
    }
  }

  async loadLastSession() {
    try {
      console.log('BigScreen: Loading last completed session');
      
      // Clear current session state immediately
      this.currentSession = null;
      this.activeActivity = null;
      this.activeActivityId = null;
      this.stopRoundTimer();
      
      // Hide session info elements immediately
      const sessionInfo = document.querySelector('.session-info');
      if (sessionInfo) {
        sessionInfo.style.display = 'none';
      }
      if (this.roundInfo) {
        this.roundInfo.style.display = 'none';
      }
      if (this.timer) {
        this.timer.style.display = 'none';
      }

      if (!this.api) {
        throw new Error('API not available');
      }

      // Make API call for all session data
      const response = await this.api.getSessions();
      const sessions = this.api.extractArray(response, 'sessions');
      const completedSessions = sessions.filter(s => !s.is_active);

      if (completedSessions.length > 0) {
        const lastSession = completedSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
        console.log('BigScreen: Found last session:', lastSession.name);
        
        // Display the last session info
        if (this.sessionTitle) {
          this.sessionTitle.textContent = `Laatste Sessie: ${lastSession.name}`;
        }
        if (this.sessionStatus) {
          this.sessionStatus.textContent = 'Voltooid';
          this.sessionStatus.className = 'game-status status-completed';
        }
        
        // Show session info again for completed session
        if (sessionInfo) {
          sessionInfo.style.display = 'flex';
        }
        
        // Load and display the last session's leaderboard
        await this.loadSessionLeaderboard(lastSession);
      } else {
        // No completed sessions
        if (this.sessionTitle) {
          this.sessionTitle.textContent = 'SportScore';
        }
        if (this.sessionStatus) {
          this.sessionStatus.textContent = 'Geen sessies gevonden';
          this.sessionStatus.className = 'game-status status-inactive';
        }
        if (this.teamsContainer) {
          this.teamsContainer.innerHTML = `
            <div class="no-session">
              Geen sessies gevonden.<br>
              Start een nieuwe sessie via de admin interface.
            </div>
          `;
        }
      }
    } catch (error) {
      if (this.api?.handleError) {
        this.api.handleError(error, 'loading last session');
      } else {
        console.error('Error loading last session:', error);
      }
      this.showNoSessionMessage();
    }
  }

  async loadSessionLeaderboard(session) {
    try {
      if (!this.api) {
        throw new Error('API not available');
      }

      // Get session details
      const sessionData = await this.api.getSession(session.id);
      const activities = sessionData.activities || [];
      
      if (activities.length === 0) {
        if (this.teamsContainer) {
          this.teamsContainer.innerHTML = '<div>Geen activiteiten in deze sessie.</div>';
        }
        return;
      }

      // Use the last activity or the one with most scores
      const activity = activities[activities.length - 1];
      
      // Get leaderboard for the activity
      const leaderboardResponse = await this.api.getActivityLeaderboard(activity.id);
      const leaderboard = this.api.extractArray(leaderboardResponse, 'leaderboard');
      
      // Process and display
      const effective = activity;
      const lowerIsBetter = this.isLowerBetter(effective);
      
      if (leaderboard.length > 0) {
        // Load players if needed
        await this.loadPlayersForLeaderboard(session.id, leaderboard, activity.id);
        
        // Display
        this.updateTeamLeaderboard(leaderboard, { lowerIsBetter });
      } else {
        if (this.teamsContainer) {
          this.teamsContainer.innerHTML = '<div>Geen scores in deze activiteit.</div>';
        }
      }
    } catch (error) {
      if (this.api?.handleError) {
        this.api.handleError(error, 'loading session leaderboard');
      } else {
        console.error('Error loading session leaderboard:', error);
      }
      if (this.teamsContainer) {
        this.teamsContainer.innerHTML = '<div>Fout bij laden van scores.</div>';
      }
    }
  }

  async fetchLeaderboardData() {
    if (!this.api) {
      throw new Error('API not available');
    }

    if (this.activeActivityId) {
      const data = await this.api.getActivityLeaderboard(this.activeActivityId);
      await this.loadActiveActivityDetails(this.activeActivityId);
      return data;
    }
    
    this.activeActivity = null;
    return await this.api.getLiveLeaderboard();
  }

  async loadActiveActivityDetails(activityId) {
    try {
      if (!this.api) {
        throw new Error('API not available');
      }

      let fetched = await this.api.getActivity(activityId);
      this.activeActivity = fetched?.activity || fetched;
      
      console.log('BigScreen: Loaded activity details:', {
        id: this.activeActivity?.id,
        name: this.activeActivity?.name,
        current_round: this.activeActivity?.current_round,
        total_rounds: this.activeActivity?.total_rounds,
        time_limit_per_round: this.activeActivity?.time_limit_per_round,
        round_status: this.activeActivity?.round_status
      });
      
      this.updateRoundDisplay(this.activeActivity); // Update round display
    } catch (error) {
      console.warn('BigScreen: Unable to load active activity details:', error);
      this.activeActivity = null;
    }
  }

  async loadRoundStatus() {
    try {
      if (!this.activeActivityId || !this.api) return;
      
      const fetched = await this.api.getActivity(this.activeActivityId);
      const activity = fetched?.activity || fetched;
      
      if (activity) {
        this.updateRoundDisplay(activity);
      }
    } catch (error) {
      console.warn('BigScreen: Unable to load round status:', error);
    }
  }

  async processSessionData(liveData) {
    // Check if session is active; if not, load last session
    if (!liveData.session || liveData.session.status !== 'active' || liveData.session.is_active === false) {
      // Clear active activity since session is inactive
      this.activeActivity = null;
      this.activeActivityId = null;
      localStorage.removeItem('activeActivityId');
      await this.loadLastSession();
      return;
    }

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
    if (!this.api) return;

    const lb = liveData.leaderboard || [];
    const isParticipantData = lb.length > 0 && 'player_name' in lb[0];
    
    if (isParticipantData) {
      try {
        const teamsResp = await this.api.getSessionTeams(liveData.session.id);
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
      if (!this.api) {
        throw new Error('API not available');
      }

      const response = activityId
        ? await this.api.getActivityScores(activityId)
        : await this.api.get(`/api/v1/sessions/${sessionId}/scores`);
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

    if (activityId && needsFreshFetch && this.api) {
      try {
        this.activeActivity = await this.api.getActivity(activityId);
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
      if (!this.api) {
        throw new Error('API not available');
      }

      const resp = await this.api.get(`/api/v1/sessions/${sessionId}/teams/${team.team_id}/players`);
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
    
    if (playerVals.length > 0) {
      if (aggregatePlayerTimes) {
        team.total_score = playerVals.reduce((a, b) => a + b, 0);
      } else {
        team.total_score = timeWinner === 'higher'
          ? Math.max(...playerVals)
          : Math.min(...playerVals);
      }
    } else if (teamTotals[team.team_id] !== undefined) {
      team.total_score = teamTotals[team.team_id];
    }
  }

  async handlePlayerLoadError(error, team) {
    const is405 = error?.status === 405 || error?.message?.includes('405');
    
    if (is405 && team.team_id && this.api) {
      try {
        const fallback = await this.api.get(`/api/v1/players?team_id=${team.team_id}`);
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
    if (liveData.session && liveData.session.is_active !== false) {
      this.currentSession = liveData.session;
      this.updateSessionInfo(liveData.session);
      
      // Make sure session info is visible for active sessions
      const sessionInfo = document.querySelector('.session-info');
      if (sessionInfo) {
        sessionInfo.style.display = 'flex';
      }
    }
    
    if (liveData.leaderboard && liveData.session && liveData.session.is_active !== false) {
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
    
    if (!leaderboard?.length) {
      if (this.teamsContainer.innerHTML !== '<div class="no-teams">Geen deelnemers in sessie</div>') {
        this.teamsContainer.innerHTML = '<div class="no-teams">Geen deelnemers in sessie</div>';
      }
      return;
    }
    
    const effective = this.getEffectiveActivity();
    const lowerIsBetter = this.isLowerBetter(effective);
    
    // If no active activity, clear the leaderboard
    if (!effective) {
      if (this.teamsContainer.innerHTML !== '') {
        this.teamsContainer.innerHTML = '';
      }
      return;
    }
    
    // Check for incomplete activity details and refresh if needed
    if (this.needsActivityRefresh(effective)) {
      this.refreshActivityAndRerender(leaderboard);
      return;
    }
    
    const scoringMode = this.getScoringMode();
    const isParticipantData = 'player_name' in leaderboard[0];
    
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
      if (!this.api) return;

      const currentActivity = this.getEffectiveActivity();
      const aid = this.activeActivityId || currentActivity?.id;
      
      if (aid) {
        let fetched = await this.api.getActivity(aid);
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
    
    // Check if we need to rebuild the DOM or just update scores
    const shouldRebuildDOM = this.shouldRebuildTeamLeaderboard(leaderboard);
    
    if (!shouldRebuildDOM) {
      // Just update the scores and player data without rebuilding
      this.updateExistingTeamElements(leaderboard);
      return;
    }
    
    // Apply layout class
    this.teamsContainer.className = 'leaderboard-container';
    if (leaderboard.length === 2) {
      this.teamsContainer.classList.add('two-teams');
    }
    
    // Clear and render teams
    this.teamsContainer.innerHTML = '';
    leaderboard.forEach((team, index) => {
      const teamElement = this.createTeamElement(team, index + 1);
      this.teamsContainer.appendChild(teamElement);
    });
  }

  shouldRebuildTeamLeaderboard(leaderboard) {
    // Check if current DOM structure matches the leaderboard
    const currentTeams = this.teamsContainer.querySelectorAll('.leaderboard-team');
    
    // Different number of teams = rebuild
    if (currentTeams.length !== leaderboard.length) {
      return true;
    }
    
    // Check if team IDs and order match
    for (let i = 0; i < leaderboard.length; i++) {
      const teamId = String(leaderboard[i].team_id || leaderboard[i].id || '');
      const currentTeamId = currentTeams[i].getAttribute('data-team-id');
      
      if (teamId !== currentTeamId) {
        return true; // Order changed or different teams
      }
    }
    
    return false; // Same teams in same order, just update scores
  }

  updateExistingTeamElements(leaderboard) {
    const currentTeams = this.teamsContainer.querySelectorAll('.leaderboard-team');
    
    leaderboard.forEach((team, index) => {
      const teamElement = currentTeams[index];
      if (!teamElement) return;
      
      // Update position
      const positionEl = teamElement.querySelector('.team-position');
      if (positionEl) positionEl.textContent = index + 1;
      
      // Update score
      const scoreEl = teamElement.querySelector('.team-score');
      if (scoreEl) {
        const newScore = team.total_score ?? team.score ?? 0;
        scoreEl.setAttribute('data-team-score-ms', String(newScore));
        const isTimeMode = this.isTimeMode();
        scoreEl.textContent = isTimeMode ? this.formatMs(newScore) : newScore;
      }
      
      // Update player scores if present
      if (team.players && team.playerScores) {
        this.updatePlayerBadgesInTeam(teamElement, team);
      }
    });
  }

  updatePlayerBadgesInTeam(teamElement, team) {
    const isTimeMode = this.isTimeMode();
    
    // Update each player badge
    team.players.forEach(player => {
      const playerBadge = teamElement.querySelector(`[data-player-id="${player.id}"]`);
      if (!playerBadge) return;
      
      const score = team.playerScores[player.id] || 0;
      playerBadge.setAttribute('data-player-score-ms', String(score));
      
      const scorePart = playerBadge.querySelector('.player-score-part');
      const displayScore = isTimeMode ? this.formatMs(score) : score;
      
      if (scorePart) {
        scorePart.textContent = displayScore;
      } else if (score !== 0 || isTimeMode) {
        // Add score part if it doesn't exist but should
        const span = document.createElement('span');
        span.className = 'player-score-part';
        span.textContent = displayScore;
        playerBadge.appendChild(span);
        playerBadge.classList.add('with-score');
      }
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
      ? this.formatMs(teamData.score)
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
    
    const lowerIsBetter = this.isLowerBetter(this.getEffectiveActivity());
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
      const displayScore = isTimeMode ? this.formatMs(s) : s;
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
      const displayScore = isTimeMode ? this.formatMs(s) : s;
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
      ? this.formatMs(participant.total_score || 0)
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
  // Sorting
  // ==========================================================================

  sortLeaderboard() {
    if (!this.teamsContainer) return;
    
    const teamElements = Array.from(this.teamsContainer.querySelectorAll('.leaderboard-team'));
    const lowerIsBetter = this.isLowerBetter(this.getEffectiveActivity());
    
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

  isLowerBetter(activity) {
    if (typeof SharedUtils !== 'undefined' && SharedUtils.isLowerBetter) {
      return SharedUtils.isLowerBetter(activity);
    }
    // Fallback: time-based activities typically want lower scores
    return activity && String(activity.game_type) === 'team_vs_time';
  }

  formatMs(ms) {
    if (typeof SharedUtils !== 'undefined' && SharedUtils.formatMs) {
      return SharedUtils.formatMs(ms);
    }
    // Fallback formatting
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
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
    
    // Hide session info elements
    const sessionInfo = document.querySelector('.session-info');
    if (sessionInfo) {
      sessionInfo.style.display = 'none';
    }
    
    if (this.roundInfo) {
      this.roundInfo.style.display = 'none';
    }
    
    if (this.timer) {
      this.timer.style.display = 'none';
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

  // ==========================================================================
  // Round Event Handlers & Display
  // ==========================================================================

  handleRoundStarted(data) {
    if (!data || !data.activity_id) return;
    console.log('Round started event:', data);

    // If the event is for a different activity, attempt to switch to it (only if it belongs to our current session)
    if (String(data.activity_id) !== String(this.activeActivityId)) {
      try {
        // Set activeActivityId locally and try to fetch details (this will be a no-op if unrelated)
        this.activeActivityId = parseInt(data.activity_id);
        localStorage?.setItem('activeActivityId', String(this.activeActivityId));
        this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
      } catch (e) {
        console.warn('Failed to switch active activity on round_started:', e);
      }
    }

    // Mark round active and update start time if provided
    this.roundStatus = 'active';
    if (data.round_start_time) this.roundStartTime = data.round_start_time;

    // Prefer an explicit remaining time, otherwise fall back to time limit
    const t = (data.time_remaining != null) ? data.time_remaining : data.time_limit_per_round;
    if (t != null) {
      console.debug('Starting timer from round_started payload:', t);
      this.startRoundTimer(t);
    } else {
      // No timing info in payload - refresh authoritative status from server
      this.loadRoundStatus();
    }

    // Refresh activity details for display
    if (this.activeActivityId) this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
  }

  handleRoundEnded(data) {
    if (!data || !data.activity_id) return;

    if (String(data.activity_id) !== String(this.activeActivityId)) {
      try {
        this.activeActivityId = parseInt(data.activity_id);
        localStorage?.setItem('activeActivityId', String(this.activeActivityId));
        this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
      } catch (e) {
        console.warn('Failed to switch active activity on round_ended:', e);
      }
    }

    console.log('Round ended event:', data);

    this.roundStatus = 'completed';
    this.stopRoundTimer();
    this.loadRoundStatus();
    this.loadInitialData();
  }

  handleRoundChanged(data) {
    if (!data || !data.activity_id) return;

    if (String(data.activity_id) !== String(this.activeActivityId)) {
      try {
        this.activeActivityId = parseInt(data.activity_id);
        localStorage?.setItem('activeActivityId', String(this.activeActivityId));
        this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
      } catch (e) {
        console.warn('Failed to switch active activity on round_changed:', e);
      }
    }

    console.log('Round changed event:', data);

    // Refresh status and leaderboard for the new round
    this.loadRoundStatus();
    this.loadInitialData();
  }

  handleRoundPaused(data) {
    if (!data || !data.activity_id) return;

    if (String(data.activity_id) !== String(this.activeActivityId)) {
      try {
        this.activeActivityId = parseInt(data.activity_id);
        localStorage?.setItem('activeActivityId', String(this.activeActivityId));
        this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
      } catch (e) {
        console.warn('Failed to switch active activity on round_paused:', e);
      }
    }

    console.log('Round paused event:', data);

    this.roundStatus = 'paused';
    this.stopRoundTimer();
    this.loadRoundStatus();
  }

  handleRoundResumed(data) {
    const relevantActivityId = this.activeActivityId || this.selectedActivityId;
    if (!data || data.activity_id !== relevantActivityId) return;
    console.log('Round resumed event:', data);

    this.roundStatus = 'active';
    const t = (data.time_remaining != null) ? data.time_remaining : data.time_limit_per_round;
    if (t != null) {
      console.debug('Resuming timer from round_resumed payload:', t);
      this.startRoundTimer(t);
    } else {
      this.loadRoundStatus();
    }

    this.loadInitialData();
  }

  handleRoundEvent(data) {
    // Generic fallback for any round-related event we didn't explicitly handle
    const relevantActivityId = this.activeActivityId || this.selectedActivityId;
    if (!data || data.activity_id !== relevantActivityId) return;
    console.log('Round event received (fallback):', data);
    this.loadRoundStatus();
    this.loadInitialData(); // Refresh leaderboard
  }

  handleRoundTimeUpdate(data) {
    if (!data || !data.activity_id) return;

    // If the event is for another activity, switch active activity so we display the timer
    if (String(data.activity_id) !== String(this.activeActivityId)) {
      try {
        this.activeActivityId = parseInt(data.activity_id);
        localStorage?.setItem('activeActivityId', String(this.activeActivityId));
        this.loadActiveActivityDetails(this.activeActivityId).catch(() => {});
      } catch (e) {
        console.warn('Failed to switch active activity on round_time_update:', e);
      }
    }

    if (data.time_remaining !== null && data.time_remaining !== undefined) {
      // Resync the timer smoothly: update remaining seconds and display; start interval if none
      this.roundTimeRemaining = Math.max(0, Math.floor(data.time_remaining));
      this.updateRoundTimerDisplay(this.roundTimeRemaining);
      if (!this.roundTimerInterval && this.roundStatus === 'active' && this.roundTimeRemaining > 0) {
        this.startRoundTimer(this.roundTimeRemaining);
      }
    }
  }

  updateRoundDisplay(activity) {
    if (!activity) {
      console.log('BigScreen: No activity provided to updateRoundDisplay');
      return;
    }
    
    console.log('BigScreen: updateRoundDisplay called with:', {
      id: activity.id,
      name: activity.name,
      current_round: activity.current_round,
      total_rounds: activity.total_rounds,
      time_limit_per_round: activity.time_limit_per_round,
      round_status: activity.round_status,
      time_remaining: activity.time_remaining
    });
    
    this.currentRound = activity.current_round || 1;
    this.totalRounds = activity.total_rounds || 1;
    this.roundStatus = activity.round_status || 'not_started';
    this.timeLimitPerRound = activity.time_limit_per_round;
    
    // Show round info if multiple rounds
    const hasMultipleRounds = this.totalRounds > 1;
    
    if (this.roundInfo) {
      if (hasMultipleRounds) {
        this.roundInfo.textContent = `Ronde ${this.currentRound}/${this.totalRounds}`;
        this.roundInfo.style.display = 'block';
        console.log('BigScreen: Showing round info:', this.roundInfo.textContent);
      } else {
        this.roundInfo.style.display = 'none';
        console.log('BigScreen: Hiding round info (single round)');
      }
    } else {
      console.warn('BigScreen: roundInfo element not found');
    }
    
    // Handle timer display
    if (this.timer) {
      if (this.timeLimitPerRound && this.timeLimitPerRound > 0) {
        console.log('BigScreen: Activity has time limit, showing timer');
        this.timer.style.display = 'block';
        
        // Start or stop timer based on round state
        if (activity.time_remaining !== null && activity.time_remaining !== undefined) {
          this.updateRoundTimerDisplay(activity.time_remaining);
          if (this.roundStatus === 'active' && activity.time_remaining > 0) {
            this.startRoundTimer(activity.time_remaining);
          } else if (this.roundStatus !== 'active') {
            this.stopRoundTimer();
          }
        } else {
          // No explicit remaining time; if activity has a time limit show that as the default
          let secondsToShow = this.timeLimitPerRound;
          if (this.roundStatus === 'active' && activity.round_start_time) {
            try {
              const start = new Date(activity.round_start_time);
              if (!isNaN(start.getTime())) {
                const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
                secondsToShow = Math.max(0, Math.floor(this.timeLimitPerRound - elapsed));
              }
            } catch (e) {
              console.warn('Failed to compute elapsed time from round_start_time:', e);
            }
          }

          this.updateRoundTimerDisplay(secondsToShow);

          // If round is active, start a client-side countdown if one isn't already running
          if (this.roundStatus === 'active' && secondsToShow > 0 && !this.roundTimerInterval) {
            this.startRoundTimer(secondsToShow);
          }
        }
      } else {
        console.log('BigScreen: No time limit, hiding timer');
        this.timer.style.display = 'none';
        this.stopRoundTimer();
      }
    } else {
      console.warn('BigScreen: timer element not found');
    }
  }

  updateRoundTimerDisplay(seconds) {
    if (!this.timer) return;

    if (seconds == null || seconds === '' || isNaN(Number(seconds))) {
      this.timer.textContent = '--:--';
      this.timer.style.color = '#6c757d';
      return;
    }

    let s = Number(seconds);
    if (s > 10000) s = Math.floor(s / 1000); // ms -> s
    s = Math.max(0, Math.floor(s));

    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    this.timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Color code based on time remaining
    if (s < 30) {
      this.timer.style.color = '#ef4444'; // Red
    } else if (s < 60) {
      this.timer.style.color = '#f59e0b'; // Orange
    } else {
      this.timer.style.color = '#10b981'; // Green
    }
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

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
    this.stopRoundTimer();
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
    if (typeof window.showGlobalFatalError === 'function') {
      window.showGlobalFatalError(
        `Fout bij initialisatie BigScreen: ${error?.message || String(error)}`
      );
    }
  }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BigScreenDisplay };
}