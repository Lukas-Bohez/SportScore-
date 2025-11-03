// Big Screen Display JavaScript - Session Leaderboard
class BigScreenDisplay {
  constructor() {
    this.currentSession = null;
    this.lastUpdate = null;
    this.updateInterval = null;
    this.init();
  }

  // Emoji name to emoji mapping
  getEmojiFromName(emojiName) {
    const emojiMap = {
      rocket: '🚀',
      team: '👥',
      trophy: '🏆',
      star: '⭐',
      fire: '🔥',
      lightning: '⚡',
      heart: '❤️',
      thumbsup: '👍',
      celebrate: '🎉',
      winner: '🥇',
      second: '🥈',
      third: '🥉',
      crown: '👑',
      diamond: '💎',
      gold: '🥇',
      silver: '🥈',
      bronze: '🥉',
      medal: '🏅',
      cup: '🏆',
      flag: '🏁',
      target: '🎯',
      bullseye: '🎯',
      zap: '⚡',
      bolt: '⚡',
      flash: '⚡',
      speed: '💨',
      fast: '💨',
      slow: '🐌',
      turtle: '🐢',
      rabbit: '🐰',
      cheetah: '🐆',
      lion: '🦁',
      tiger: '🐅',
      bear: '🐻',
      wolf: '🐺',
      fox: '🦊',
      cat: '🐱',
      dog: '🐶',
      mouse: '🐭',
      hamster: '🐹',
      rabbit2: '🐰',
      panda: '🐼',
      koala: '🐨',
      monkey: '🐵',
      gorilla: '🦍',
      orangutan: '🦧',
      horse: '🐴',
      unicorn: '🦄',
      zebra: '🦓',
      deer: '🦌',
      cow: '🐮',
      ox: '🐂',
      water_buffalo: '🐃',
      pig: '🐷',
      boar: '🐗',
      pig_nose: '🐽',
      ram: '🐏',
      sheep: '🐑',
      goat: '🐐',
      camel: '🐪',
      llama: '🦙',
      giraffe: '🦒',
      elephant: '🐘',
      rhinoceros: '🦏',
      hippopotamus: '🦛',
      mouse2: '🐭',
      rat: '🐀',
      hamster2: '🐹',
      rabbit3: '🐰',
      chipmunk: '🐿️',
      beaver: '🦫',
      hedgehog: '🦔',
      bat: '🦇',
      bear2: '🐻',
      polar_bear: '🐻‍❄️',
      koala2: '🐨',
      panda2: '🐼',
      sloth: '🦥',
      otter: '🦦',
      skunk: '🦨',
      kangaroo: '🦘',
      badger: '🦡',
      turkey: '🦃',
      chicken: '🐔',
      rooster: '🐓',
      hatching_chick: '🐣',
      baby_chick: '🐤',
      bird: '🐦',
      penguin: '🐧',
      dove: '🕊️',
      eagle: '🦅',
      duck: '🦆',
      swan: '🦢',
      owl: '🦉',
      dodo: '🦤',
      feather: '🪶',
      flamingo: '🦩',
      peacock: '🦚',
      parrot: '🦜',
      frog: '🐸',
      crocodile: '🐊',
      turtle2: '🐢',
      lizard: '🦎',
      snake: '🐍',
      dragon: '🐉',
      sauropod: '🦕',
      't-rex': '🦖',
      whale: '🐋',
      whale2: '🐋',
      dolphin: '🐬',
      seal: '🦭',
      fish: '🐟',
      tropical_fish: '🐠',
      blowfish: '🐡',
      shark: '🦈',
      octopus: '🐙',
      shell: '🐚',
      snail: '🐌',
      butterfly: '🦋',
      bug: '🐛',
      ant: '🐜',
      bee: '🐝',
      beetle: '🪲',
      ladybug: '🐞',
      cricket: '🦗',
      cockroach: '🪳',
      spider: '🕷️',
      spider_web: '🕸️',
      scorpion: '🦂',
      mosquito: '🦟',
      fly: '🪰',
      worm: '🪱',
      microbe: '🦠',
      bouquet: '💐',
      cherry_blossom: '🌸',
      white_flower: '💮',
      rosette: '🏵️',
      rose: '🌹',
      wilted_flower: '🥀',
      hibiscus: '🌺',
      sunflower: '🌻',
      blossom: '🌼',
      tulip: '🌷',
      seedling: '🌱',
      potted_plant: '🪴',
      evergreen_tree: '🌲',
      deciduous_tree: '🌳',
      palm_tree: '🌴',
      cactus: '🌵',
      sheaf_of_rice: '🌾',
      herb: '🌿',
      shamrock: '☘️',
      four_leaf_clover: '🍀',
      maple_leaf: '🍁',
      fallen_leaf: '🍂',
      leaves: '🍃',
    };

    // Return the emoji if found, otherwise return the original name or default trophy
    return emojiMap[emojiName.toLowerCase()] || emojiName || '🏆';
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.startAutoUpdate();
    this.loadInitialData();
  }

  bindElements() {
    this.sessionTitle = document.getElementById('sport-name');
    this.sessionStatus = document.getElementById('game-status');
    this.teamsContainer = document.getElementById('teams-container');
    this.lastUpdateTime = document.getElementById('last-update');
  }

  setupEventListeners() {
    // Listen for real-time updates
    api.on('session_score_update', (data) => {
      console.log('BigScreen: Received session_score_update event:', data);
      // Refresh the entire leaderboard when a score is updated
      this.loadInitialData();
    });

    // Also listen for legacy score_update events for backward compatibility
    api.on('score_update', (data) => {
      console.log('BigScreen: Received score_update event:', data);
      // Refresh the entire leaderboard when a score is updated (legacy)
      this.loadInitialData();
    });

    api.on('session_status_update', (data) => {
      console.log('BigScreen: Received session_status_update event:', data);
      // Refresh when session status changes (active, paused, completed, etc.)
      this.loadInitialData();
    });

    api.on('team_update', (data) => {
      console.log('BigScreen: Received team_update event:', data);
      // Refresh when teams are added, updated, or removed
      this.loadInitialData();
    });

    // Listen for session creation/updates that might make a new session active
    api.on('session_update', (data) => {
      console.log('BigScreen: Received session_update event:', data);
      // Refresh when any session is updated (could be a new active session)
      this.loadInitialData();
    });

    api.on('session_created', (data) => {
      console.log('BigScreen: Received session_created event:', data);
      // Refresh when a new session is created (might become active)
      this.loadInitialData();
    });

    api.on('connected', () => {
      console.log('BigScreen: Socket.IO connected');
      this.showConnectionStatus('Connected', 'success');
      // Refresh data when connection is established
      this.loadInitialData();
    });

    api.on('disconnected', () => {
      console.log('BigScreen: Socket.IO disconnected');
      this.showConnectionStatus('Disconnected', 'error');
    });
  }

  async loadInitialData() {
    try {
      const liveData = await api.getLiveLeaderboard();
      if (liveData && liveData.session) {
        this.updateDisplay(liveData);
      } else {
        this.showNoSessionMessage();
      }
    } catch (error) {
      api.handleError(error, 'loading initial data');
      this.showNoSessionMessage();
    }
  }

  updateDisplay(data) {
    this.currentSession = data.session;
    this.updateSessionInfo(data.session);
    this.updateLeaderboard(data.leaderboard);
    this.updateLastUpdateTime();
  }

  updateSessionInfo(session) {
    if (this.sessionTitle) {
      this.sessionTitle.textContent = session.name || 'TeamScore Session';
    }
    if (this.sessionStatus) {
      this.sessionStatus.textContent = this.getStatusText(session.status);
      this.sessionStatus.className = `game-status status-${session.status}`;
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.teamsContainer) return;

    // Clear existing content
    this.teamsContainer.innerHTML = '';

    if (!leaderboard || leaderboard.length === 0) {
      this.teamsContainer.innerHTML = '<div class="no-teams">No teams in session</div>';
      return;
    }

    // Filter eliminated teams in elimination mode
    if (this.currentSession && this.currentSession.game_mode === 'elimination') {
      leaderboard = leaderboard.filter((team) => !team.is_eliminated);
    }

    // Sort leaderboard by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Create leaderboard
    leaderboard.forEach((team, index) => {
      const teamElement = this.createTeamElement(team, index + 1);
      this.teamsContainer.appendChild(teamElement);
    });
  }

  createTeamElement(team, position) {
    const teamDiv = document.createElement('div');
    teamDiv.className = `leaderboard-team ${team.is_eliminated ? 'eliminated' : ''}`;
    teamDiv.style.borderLeftColor = team.team_color || '#333';

    teamDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="team-info">
        <div class="team-name">${team.team_name}</div>
        <div class="team-icon">${this.getEmojiFromName(team.team_icon)}</div>
      </div>
      <div class="team-score">${team.total_score || 0}</div>
    `;

    return teamDiv;
  }

  updateLastUpdateTime() {
    if (this.lastUpdateTime) {
      const now = new Date();
      this.lastUpdateTime.textContent = `Laatste update: ${now.toLocaleTimeString()}`;
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

  showNoSessionMessage() {
    if (this.sessionTitle) {
      this.sessionTitle.textContent = 'TeamScore';
    }
    if (this.sessionStatus) {
      this.sessionStatus.textContent = 'Geen actieve sessie';
      this.sessionStatus.className = 'game-status status-inactive';
    }
    if (this.teamsContainer) {
      this.teamsContainer.innerHTML = '<div class="no-session">Geen actieve teambuilding sessie gevonden.<br>Start een sessie via de admin interface.</div>';
    }
  }

  showConnectionStatus(status, type) {
    // Could add a connection status indicator
    console.log(`Connection: ${status}`);
  }

  startAutoUpdate() {
    // Update every 30 seconds as backup to real-time updates
    this.updateInterval = setInterval(() => {
      this.loadInitialData();
    }, 30000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BigScreenDisplay();
});

// Admin login functions
function showAdminLogin() {
  const modal = document.getElementById('admin-modal');
  const passwordInput = document.getElementById('admin-password');
  modal.classList.add('show');
  passwordInput.focus();
  passwordInput.value = '';
}

function hideAdminLogin() {
  const modal = document.getElementById('admin-modal');
  modal.classList.remove('show');
}

function loginAdmin() {
  const password = document.getElementById('admin-password').value;
  // Simple password check - in production, this should be more secure
  const correctPassword = 'admin123'; // You should change this or make it configurable

  if (password === correctPassword) {
    // Redirect to admin page
    window.location.href = 'admin.html';
  } else {
    alert('Incorrect password. Please try again.');
    document.getElementById('admin-password').focus();
  }
}

// Handle Enter key in password field
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('admin-password');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginAdmin();
      }
    });
  }
});

// Initialize the big screen display when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const bigScreen = new BigScreenDisplay();

  // Handle page visibility changes to optimize performance
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bigScreen.stopAutoUpdate();
    } else {
      bigScreen.startAutoUpdate();
    }
  });
});
