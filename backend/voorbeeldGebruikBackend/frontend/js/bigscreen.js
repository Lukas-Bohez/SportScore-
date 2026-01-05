// Big Screen Display JavaScript - Session Leaderboard
class BigScreenDisplay {
  constructor() {
    this.currentSession = null;
    this.lastUpdate = null;
    this.updateInterval = null;
    this.sessionStatusBadge = null;
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
    this.scoringModeBadge = document.getElementById('scoring-mode-badge');
    this.scoringModeText = document.getElementById('scoring-mode-text');
  }

  setupEventListeners() {
    // Listen for real-time updates
    api.on('session_score_update', (data) => {
      console.log('BigScreen: Received session_score_update event:', data);
      // Update the leaderboard incrementally instead of full refresh
      this.updateScore(data);
    });

    // Also listen for legacy score_update events for backward compatibility
    api.on('score_update', (data) => {
      console.log('BigScreen: Received score_update event:', data);
      // Update the leaderboard incrementally (legacy)
      this.updateScore(data);
    });

    api.on('session_status_update', (data) => {
      console.log('BigScreen: Received session_status_update event:', data);
      // Refresh when session status changes (active, paused, completed, etc.)
      this.loadInitialData();
    });

    api.on('team_update', (data) => {
      console.log('BigScreen: Received team_update event:', data);
      // Update team data incrementally
      this.updateTeam(data);
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

    api.on('welcome', (data) => {
      console.log('BigScreen: Received welcome event:', data);
    });

    api.on('test_event', (data) => {
      console.log('BigScreen: Received test_event:', data);
      alert('Test event received: ' + JSON.stringify(data));
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
        // Apply theme based on sport_type
        this.applyTheme(liveData.session.sport_type || 'custom');
        
        // Load players for teams in the leaderboard
        if (liveData.leaderboard && liveData.leaderboard.length > 0) {
          await this.loadPlayersForLeaderboard(liveData.session.id, liveData.leaderboard);
        }
        this.updateDisplay(liveData);
      } else {
        this.showNoSessionMessage();
      }
    } catch (error) {
      api.handleError(error, 'loading initial data');
      this.showNoSessionMessage();
    }
  }
  
  applyTheme(sportType) {
    // Set the data-sport attribute on body to trigger CSS theme
    document.body.setAttribute('data-sport', sportType || 'custom');
    
    // Update page title with sport icon
    const sportIcons = {
      'quiz': '🧠',
      'voetbal': '⚽',
      'basketbal': '🏀',
      'volleybal': '🏐',
      'hockey': '🏑',
      'tennis': '🎾',
      'atletiek': '🏃',
      'zwemmen': '🏊',
      'fietsen': '🚴',
      'hardlopen': '🏃',
      'esports': '🎮',
      'boardgame': '🎲',
      'custom': '🎯'
    };
    
    const icon = sportIcons[sportType] || '🎯';
    document.title = `${icon} TeamScore - Live Scorebord`;
  }

  async loadPlayersForLeaderboard(sessionId, leaderboard) {
    // First, get all scores for the session to calculate player scores
    let allScores = [];
    try {
      const scoresResponse = await api.get(`/api/v1/sessions/${sessionId}/scores`);
      allScores = scoresResponse.scores || [];
    } catch (err) {
      console.warn('Could not load scores for player stats:', err);
    }

    for (const team of leaderboard) {
      try {
        const resp = await api.get(`/api/v1/sessions/${sessionId}/teams/${team.team_id}/players`);
        team.players = resp && resp.players ? resp.players : [];
        
        // Calculate individual player scores from the scores list
        team.playerScores = {};
        if (team.players && team.players.length > 0) {
          team.players.forEach(player => {
            // Sum up all scores for this player
            const playerPoints = allScores
              .filter(score => score.player_id === player.id)
              .reduce((sum, score) => sum + score.points, 0);
            team.playerScores[player.id] = playerPoints;
          });
        }
      } catch (err) {
        const msg = err && err.message ? err.message : '';
        const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
        if (status405 && team.team_id) {
          try {
            const fallback = await api.get(`/api/v1/players?team_id=${team.team_id}`);
            team.players = fallback && fallback.players ? fallback.players : [];
            team.playerScores = {};
          } catch (err2) {
            team.players = [];
            team.playerScores = {};
          }
        } else {
          team.players = [];
          team.playerScores = {};
        }
      }
    }
  }

  updateDisplay(liveData) {
    // Update both session info and leaderboard
    if (liveData.session) {
      this.currentSession = liveData.session;
      this.updateSessionInfo(liveData.session);
    }
    if (liveData.leaderboard) {
      this.updateLeaderboard(liveData.leaderboard);
    }
    this.updateLastUpdateTime();
  }

  updateScore(data) {
    // For player scoring mode, we need to recalculate individual player scores
    // so we do a full refresh. For team mode, we can update incrementally.
    console.log('Score update received:', data);
    
    if (!this.currentSession || !this.teamsContainer) {
      // If no session loaded yet, do full refresh
      this.loadInitialData();
      return;
    }
    
    // Check if this is player mode - if so, need full refresh for player scores
    const isPlayerMode = this.currentSession && this.currentSession.scoring_mode === 'player';
    
    if (isPlayerMode && data.player_id) {
      // Player score update - need to refresh to recalculate all player scores
      console.log('Player score update, refreshing to recalculate player scores');
      this.loadInitialData();
      return;
    }
    
    // Team mode or team-level update - update incrementally
    const teamId = data.team_id;
    const pointsChange = data.points || 0;
    
    // Find team element by team_id
    const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');
    let updated = false;
    
    for (const teamElement of teamElements) {
      const teamIdAttr = teamElement.getAttribute('data-team-id');
      if (teamIdAttr && parseInt(teamIdAttr) === teamId) {
        const scoreElement = teamElement.querySelector('.team-score');
        if (scoreElement) {
          const currentScore = parseInt(scoreElement.textContent) || 0;
          const newScore = currentScore + pointsChange;
          scoreElement.textContent = newScore;
          
          // Add flash animation
          scoreElement.classList.add('score-flash');
          setTimeout(() => scoreElement.classList.remove('score-flash'), 500);
          
          updated = true;
          break;
        }
      }
    }
    
    // If we couldn't find/update the team, do a full refresh
    if (!updated) {
      console.log('Could not find team element, doing full refresh');
      this.loadInitialData();
    } else {
      // Re-sort teams after score update
      this.sortTeams();
    }
  }

  updateTeam(data) {
    // Update team data without full refresh
    if (!this.currentSession || !this.teamsContainer) {
      // If no session loaded yet, do full refresh
      this.loadInitialData();
      return;
    }

    // Normalize team data from database format to leaderboard format
    const teamData = {
      team_name: data.team.name,
      team_icon: data.team.icon,
      team_color: data.team.color,
      total_score: data.team.total_score || data.team.score || 0, // Use total_score if available, fallback to score
      is_eliminated: data.team.is_eliminated || false,
    };

    if (data.action === 'deleted') {
      // Remove the team element
      const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');
      for (const teamElement of teamElements) {
        const teamNameElement = teamElement.querySelector('.team-name');
        if (teamNameElement && teamNameElement.textContent === teamData.team_name) {
          teamElement.remove();
          break;
        }
      }
    } else {
      // Update or add team
      let teamElement = null;
      const teamElements = this.teamsContainer.querySelectorAll('.leaderboard-team');

      // Check if team already exists
      for (const element of teamElements) {
        const teamNameElement = element.querySelector('.team-name');
        if (teamNameElement && teamNameElement.textContent === teamData.team_name) {
          teamElement = element;
          break;
        }
      }

      if (teamElement) {
        // Update existing team
        const iconElement = teamElement.querySelector('.team-icon');
        const scoreElement = teamElement.querySelector('.team-score');

        if (iconElement) {
          iconElement.textContent = this.getEmojiFromName(teamData.team_icon);
        }
        if (scoreElement) {
          scoreElement.textContent = teamData.total_score;
        }
        teamElement.style.borderLeftColor = teamData.team_color || '#333';

        // Update eliminated status
        if (teamData.is_eliminated) {
          teamElement.classList.add('eliminated');
        } else {
          teamElement.classList.remove('eliminated');
        }
      } else {
        // Add new team
        const newTeamElement = this.createTeamElement(teamData, teamElements.length + 1);
        this.teamsContainer.appendChild(newTeamElement);
      }

      // Re-sort the leaderboard
      this.sortLeaderboard();
    }

    this.updateLastUpdateTime();
  }

  sortLeaderboard() {
    // Sort teams by score and update positions
    if (!this.teamsContainer) return;

    const teamElements = Array.from(this.teamsContainer.querySelectorAll('.leaderboard-team'));

    // Sort by score descending
    teamElements.sort((a, b) => {
      const scoreA = parseInt(a.querySelector('.team-score').textContent) || 0;
      const scoreB = parseInt(b.querySelector('.team-score').textContent) || 0;
      return scoreB - scoreA;
    });

    // Re-append in sorted order and update positions
    teamElements.forEach((element, index) => {
      const positionElement = element.querySelector('.team-position');
      if (positionElement) {
        positionElement.textContent = index + 1;
      }
      this.teamsContainer.appendChild(element);
    });
  }

  updateSessionInfo(session) {
    if (this.sessionTitle) {
      // Add subtle icon for scoring mode
      const scoringModeIcon = session.scoring_mode === 'player' ? '👤' : '👥';
      this.sessionTitle.textContent = session.name || 'TeamScore Session';
      
      // Add icon as separate element for better styling control
      const existingIcon = this.sessionTitle.querySelector('.scoring-mode-icon');
      if (existingIcon) {
        existingIcon.textContent = scoringModeIcon;
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'scoring-mode-icon';
        iconSpan.textContent = scoringModeIcon;
        iconSpan.title = session.scoring_mode === 'player' ? 'Speler Scores Modus' : 'Team Scores Modus';
        this.sessionTitle.appendChild(iconSpan);
      }
    }
    
    // Update or create status badge
    if (!this.sessionStatusBadge) {
      this.sessionStatusBadge = document.getElementById('session-status-badge');
      if (!this.sessionStatusBadge) {
        // Create status badge if it doesn't exist
        this.sessionStatusBadge = document.createElement('div');
        this.sessionStatusBadge.id = 'session-status-badge';
        this.sessionStatusBadge.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 0.9em; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000;';
        document.body.appendChild(this.sessionStatusBadge);
      }
    }
    
    // Update status badge based on session status
    const statusText = this.getStatusText(session.status);
    const statusColors = {
      setup: { bg: '#6c757d', text: 'white', icon: '⚙️' },
      active: { bg: '#28a745', text: 'white', icon: '▶️' },
      paused: { bg: '#ffc107', text: '#000', icon: '⏸️' },
      completed: { bg: '#007bff', text: 'white', icon: '🏁' }
    };
    
    const statusStyle = statusColors[session.status] || statusColors.setup;
    this.sessionStatusBadge.style.background = statusStyle.bg;
    this.sessionStatusBadge.style.color = statusStyle.text;
    this.sessionStatusBadge.textContent = `${statusStyle.icon} ${statusText}`;
    
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
    
    // Add data attribute for team ID to enable updates
    if (team.team_id) {
      teamDiv.setAttribute('data-team-id', team.team_id);
    }

    // Check scoring mode
    const scoringMode = this.currentSession ? this.currentSession.scoring_mode : 'team';
    const isPlayerMode = scoringMode === 'player';
    const isTeamWithPlayers = scoringMode === 'team_with_players';
    const showPlayers = (this.currentSession && typeof this.currentSession.show_players !== 'undefined') ? Boolean(this.currentSession.show_players) : true;
    
    const players = team.players || [];
    const playerScores = team.playerScores || {};
    
    let playersHtml = '';
    if (players.length > 0 && showPlayers) {
      if (isPlayerMode) {
        // Player mode: show player names with their individual scores
        playersHtml = `<div class="team-players-bigscreen player-mode">
          ${players.map(p => {
            const score = playerScores[p.id] || 0;
            const scoreClass = score > 0 ? 'positive' : score < 0 ? 'negative' : '';
            return `<span class="player-badge-bigscreen with-score ${scoreClass}">
              <span class="player-name-part">${p.position ? `${p.name} (${p.position})` : p.name}</span>
              <span class="player-score-part">${score > 0 ? '+' : ''}${score}</span>
            </span>`;
          }).join('')}
        </div>`;
      } else if (isTeamWithPlayers) {
        // Team with players mode: show player names without individual scores
        playersHtml = `<div class="team-players-bigscreen team-with-players-mode">
          ${players.map(p => `<span class="player-badge-bigscreen">${p.position ? `${p.name} (${p.position})` : p.name}</span>`).join('')}
        </div>`;
      }
      // else: pure team mode - don't show players at all
    }

    teamDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="team-info">
        <div class="team-name">${team.team_name}</div>
        <div class="team-icon">${this.getEmojiFromName(team.team_icon)}</div>
      </div>
      <div class="team-score">${team.total_score || 0}</div>
      ${playersHtml}
    `;

    return teamDiv;
  }
  
  sortTeams() {
    // Re-sort teams by score
    if (!this.teamsContainer) return;
    
    const teamElements = Array.from(this.teamsContainer.querySelectorAll('.leaderboard-team'));
    
    // Sort by score (descending)
    teamElements.sort((a, b) => {
      const scoreA = parseInt(a.querySelector('.team-score')?.textContent || '0');
      const scoreB = parseInt(b.querySelector('.team-score')?.textContent || '0');
      return scoreB - scoreA;
    });
    
    // Re-append in sorted order and update positions
    teamElements.forEach((el, index) => {
      const positionEl = el.querySelector('.team-position');
      if (positionEl) {
        positionEl.textContent = index + 1;
      }
      this.teamsContainer.appendChild(el);
    });
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
