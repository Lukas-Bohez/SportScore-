// Big Screen Display JavaScript - Session Leaderboard
class BigScreenDisplay {
  constructor() {
    this.currentSession = null;
    this.lastUpdate = null;
    this.updateInterval = null;
    this.sessionStatusBadge = null;
    this.listenersSet = false;
    this.isToggling = false;
    this.initialQREmitted = false;
    this.activeActivityId = null; // Track active activity for big screen display
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

  isQRVisible() {
    const qrOverlay = document.getElementById('qr-overlay');
    return qrOverlay && qrOverlay.style.display !== 'none';
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    // Try to restore last active activity from localStorage (same device)
    try {
      const storedActivityId = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('activeActivityId') : null;
      if (storedActivityId) {
        const parsed = parseInt(storedActivityId, 10);
        if (!Number.isNaN(parsed)) {
          this.activeActivityId = parsed;
        }
      }
    } catch (_) {}

    this.startAutoUpdate();
    this.loadInitialData();
    // Show QR code initially
    this.showQR();
    // Emit initial QR state
    if (api && api.socket && api.socket.connected) {
      console.log('BigScreen: Emitting initial qr-state:', this.isQRVisible());
      api.socket.emit('qr-state', this.isQRVisible());
    }
  }

  bindElements() {
    this.sessionTitle = document.getElementById('sport-name');
    this.sessionStatus = document.getElementById('game-status');
    this.teamsContainer = document.getElementById('teams-container');
    this.lastUpdateTime = document.getElementById('last-update');
  }

  setupEventListeners() {
    // Set up socket event listeners if socket is available
    if (typeof api !== 'undefined' && api.socket && !this.listenersSet) {
      console.log('BigScreen: Setting up socket event listeners');
      this.setupSocketListeners();
      this.listenersSet = true;
    }
  }

  setupSocketListeners() {
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

    // Listen for active activity changes
    api.on('set_active_activity', (data) => {
      console.log('BigScreen: Received set_active_activity event:', data);
      // Update the display to show the active activity's leaderboard
      this.activeActivityId = data.activityId;
      this.loadInitialData();
    });

    api.on('welcome', (data) => {
      console.log('BigScreen: Received welcome event:', data);
      try {
        // If server shares the current active activity in welcome, adopt it
        if (data && (data.active_activity_id || (data.activity && data.activity.id))) {
          const incomingId = data.active_activity_id || (data.activity && data.activity.id);
          if (incomingId && incomingId !== this.activeActivityId) {
            this.activeActivityId = incomingId;
            this.loadInitialData();
          }
        }
      } catch (_) {}
    });

    api.on('test_event', (data) => {
      console.log('BigScreen: Received test_event:', data);
      alert('Test event received: ' + JSON.stringify(data));
    });

    api.on('show-qr', (data) => {
      console.log('BigScreen: Received show-qr event');
      const qrOverlay = document.getElementById('qr-overlay');
      if (qrOverlay) {
        qrOverlay.style.display = 'flex';
      }
      // Emit state
      console.log('BigScreen: Emitting qr-state: true');
      api.socket.emit('qr-state', true);
    });

    api.on('set-qr', (visible) => {
      console.log('BigScreen: Received set-qr event:', visible);
      const qrOverlay = document.getElementById('qr-overlay');
      if (qrOverlay) {
        qrOverlay.style.display = visible ? 'flex' : 'none';
      }
      // Emit current state
      console.log('BigScreen: Emitting qr-state:', visible);
      api.socket.emit('qr-state', visible);
    });

    api.on('connected', () => {
      console.log('BigScreen: Socket.IO connected');
      this.showConnectionStatus('Connected', 'success');
      // Refresh data when connection is established
      this.loadInitialData();
      // Emit current QR state
      if (!this.initialQREmitted) {
        console.log('BigScreen: Emitting qr-state on connect:', this.isQRVisible());
        api.socket.emit('qr-state', this.isQRVisible());
        this.initialQREmitted = true;
      }
    });

    api.on('disconnected', () => {
      console.log('BigScreen: Socket.IO disconnected');
      this.showConnectionStatus('Disconnected', 'error');
    });
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
    if (visible) {
      this.showQR();
    } else {
      this.hideQR();
    }
  }

  toggleQR() {
    const qrOverlay = document.getElementById('qr-overlay');
    if (qrOverlay) {
      const isVisible = qrOverlay.style.display !== 'none';
      qrOverlay.style.display = isVisible ? 'none' : 'flex';
    }
  }

  async loadInitialData() {
    try {
      let liveData;
      if (this.activeActivityId) {
        // Load activity-specific leaderboard
        liveData = await api.getActivityLeaderboard(this.activeActivityId);
        // Load active activity details for header/context
        try {
          this.activeActivity = await api.getActivity(this.activeActivityId);
        } catch (e) {
          console.warn('BigScreen: Unable to load active activity details:', e);
          this.activeActivity = null;
        }
      } else {
        // Load general live leaderboard
        liveData = await api.getLiveLeaderboard();
        this.activeActivity = null;
      }

      if (liveData && liveData.session) {
        // Heuristic: try to pick up active activity from session payload if present
        try {
          if (!this.activeActivityId && liveData.session.activities && Array.isArray(liveData.session.activities)) {
            const activeFromSession = liveData.session.activities.find(a => a.is_active || a.active || a.status === 'active');
            if (activeFromSession && activeFromSession.id) {
              this.activeActivityId = activeFromSession.id;
            }
          }
        } catch (_) {}

        // Apply theme based on sport_type
        this.applyTheme(liveData.session.sport_type || 'custom');

        // If backend returned participant leaderboard, convert to team leaderboard
        const lb = liveData.leaderboard || [];
        const isParticipantData = lb.length > 0 && Object.prototype.hasOwnProperty.call(lb[0], 'player_name');
        if (isParticipantData) {
          try {
            const teamsResp = await api.getSessionTeams(liveData.session.id);
            const teams = (teamsResp && teamsResp.teams) || [];
            liveData.leaderboard = teams.map(t => ({
              team_id: t.id,
              team_name: t.name,
              team_icon: t.icon,
              team_color: t.color,
              total_score: t.total_score || t.score || 0,
              is_eliminated: Boolean(t.is_eliminated)
            }));
          } catch (e) {
            console.warn('BigScreen: Fallback to team leaderboard failed, using empty list:', e);
            liveData.leaderboard = [];
          }
        }

        // Load players for teams in the (team-based) leaderboard (activity-aware)
        if (liveData.leaderboard && liveData.leaderboard.length > 0) {
          await this.loadPlayersForLeaderboard(liveData.session.id, liveData.leaderboard, this.activeActivityId || null);
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
      custom: '🎯',
    };

    const icon = sportIcons[sportType] || '🎯';
    document.title = `${icon} SportScore - Live Scorebord`;
  }

  async loadPlayersForLeaderboard(sessionId, leaderboard, activityId = null) {
    // Check if this is participant-based data (has player_name) or team-based
    if (!leaderboard || leaderboard.length === 0) {
      return;
    }
    
    const isParticipantData = leaderboard[0].hasOwnProperty('player_name');
    
    // Participant-based leaderboards don't need player loading (they ARE the players)
    if (isParticipantData) {
      return;
    }
    
    // First, get all scores for the current context to calculate player scores
    let allScores = [];
    try {
      let scoresResponse;
      if (activityId) {
        scoresResponse = await api.getActivityScores(activityId);
      } else {
        scoresResponse = await api.get(`/api/v1/sessions/${sessionId}/scores`);
      }
      allScores = scoresResponse.scores || [];
    } catch (err) {
      console.warn('Could not load scores for player stats:', err);
    }

    // Compute team totals from allScores to ensure correct totals
    const teamTotals = {};
    for (const s of allScores) {
      const tid = s.team_id;
      const pts = Number(s.points) || 0;
      if (!tid) continue;
      teamTotals[tid] = (teamTotals[tid] || 0) + pts;
    }

    for (const team of leaderboard) {
      // Skip if team_id is not present
      if (!team.team_id) {
        team.players = [];
        team.playerScores = {};
        continue;
      }

      // Override team total score when computed
      if (Object.prototype.hasOwnProperty.call(teamTotals, team.team_id)) {
        team.total_score = teamTotals[team.team_id];
      }
      
      try {
        const resp = await api.get(`/api/v1/sessions/${sessionId}/teams/${team.team_id}/players`);
        team.players = resp && resp.players ? resp.players : [];
        // Sort players alphabetically by name
        team.players.sort((a, b) => (a.name || a.player_name || '').localeCompare(b.name || b.player_name || ''));

        // Calculate individual player scores from the scores list
        team.playerScores = {};
        if (team.players && team.players.length > 0) {
          team.players.forEach((player) => {
            // Sum up all scores for this player; restrict to this team when team_id present
            const playerPoints = allScores
              .filter((score) => score.player_id === player.id && (!team.team_id || score.team_id === team.team_id))
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
            // Sort players alphabetically by name
            team.players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

    // Ignore updates for non-active activities
    if (this.activeActivityId && data.session_id && parseInt(data.session_id) !== this.activeActivityId) {
      console.log('BigScreen: Ignoring score update for non-active activity', data.session_id, 'active:', this.activeActivityId);
      return;
    }

    if (!this.currentSession || !this.teamsContainer) {
      // If no session loaded yet, do full refresh
      this.loadInitialData();
      return;
    }

    // Check modes that need full refresh when player scores change
    const scoringMode = (this.activeActivity && this.activeActivity.scoring_mode) || (this.currentSession && this.currentSession.scoring_mode) || 'team';
    const isPlayerMode = scoringMode === 'player';
    const isTeamWithPlayers = scoringMode === 'team_with_players';

    if ((isPlayerMode || isTeamWithPlayers) && data.player_id) {
      // Player-related update - refresh to recalculate top players
      console.log('Player-related score update, refreshing to recalculate player scores');
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
      let titleText = session.name || 'SportScore Session';

      // Prefer active activity name (fetched separately) in header
      if (this.activeActivity && this.activeActivity.name) {
        titleText += ` - ${this.activeActivity.name}`;
      } else if (this.activeActivityId && session.activities) {
        const activeActivity = session.activities.find(a => a.id == this.activeActivityId);
        if (activeActivity) {
          titleText += ` - ${activeActivity.name}`;
        }
      }

      this.sessionTitle.textContent = titleText;

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
      this.teamsContainer.innerHTML = '<div class="no-teams">Geen deelnemers in sessie</div>';
      return;
    }

    // Check if this is participant-based data (has player_name) or team-based
    const isParticipantData = leaderboard.length > 0 && leaderboard[0].hasOwnProperty('player_name');

    if (isParticipantData) {
      this.updateParticipantLeaderboard(leaderboard);
    } else {
      this.updateTeamLeaderboard(leaderboard);
    }
  }

  updateParticipantLeaderboard(participants) {
    // Sort by total score descending
    participants.sort((a, b) => b.total_score - a.total_score);

    // Add class for layout
    this.teamsContainer.className = 'leaderboard-container participant-leaderboard';

    // Create participant leaderboard
    participants.forEach((participant, index) => {
      const participantElement = this.createParticipantElement(participant, index + 1);
      this.teamsContainer.appendChild(participantElement);
    });
  }

  updateTeamLeaderboard(leaderboard) {
    // Original team-based logic
    // Filter eliminated teams in elimination mode
    if (this.currentSession && this.currentSession.game_mode === 'elimination') {
      leaderboard = leaderboard.filter((team) => !team.is_eliminated);
    }

    // Sort leaderboard by total_score descending (backend returns 'total_score', not 'score')
    leaderboard.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    // Add class based on number of teams for layout
    this.teamsContainer.className = 'leaderboard-container';
    if (leaderboard.length === 2) {
      this.teamsContainer.classList.add('two-teams');
    }

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

    // Check scoring mode (activity has priority over session, like in ScoreInput)
    const scoringMode = (this.activeActivity && this.activeActivity.scoring_mode) || (this.currentSession && this.currentSession.scoring_mode) || 'team';
    const isPlayerMode = scoringMode === 'player';
    const isTeamWithPlayers = scoringMode === 'team_with_players';
    const showPlayers = !this.currentSession || this.currentSession.show_players !== false; // default to true unless explicitly false

    const players = team.players || [];
    const playerScores = team.playerScores || {};

    // Player rendering: varies by mode
    let playersHtml = '';
    if (players.length > 0 && showPlayers && (isPlayerMode || isTeamWithPlayers)) {
      const entries = players.map((p) => ({ p, s: playerScores[p.id] || 0 }));
      
      if (isPlayerMode) {
        // In player mode: show all players, sorted by score descending
        entries.sort((a, b) => b.s - a.s);
        playersHtml = `<div class="team-players-bigscreen all-players">
          ${entries
            .map(({ p, s }) => {
              const name = p.position ? `${p.name} (${p.position})` : p.name;
              return `<span class="player-badge-bigscreen ${s > 0 ? 'with-score positive' : 'no-score'}">
                <span class="player-name-part">${this.escapeHtml(name)}</span>
                ${s > 0 ? `<span class="player-score-part">${s}</span>` : ''}
              </span>`;
            })
            .join('')}
        </div>`;
      } else if (isTeamWithPlayers) {
        // In team_with_players mode: show only top player(s) if score > 0
        const maxScore = entries.reduce((m, e) => (e.s > m ? e.s : m), 0);
        if (maxScore > 0) {
          const top = entries.filter((e) => e.s === maxScore);
          playersHtml = `<div class="team-players-bigscreen top-players">
            ${top
              .map(({ p, s }) => {
                const name = p.position ? `${p.name} (${p.position})` : p.name;
                return `<span class="player-badge-bigscreen with-score positive">
                  <span class="player-name-part">${this.escapeHtml(name)}</span>
                  <span class="player-score-part">+${s}</span>
                </span>`;
              })
              .join('')}
          </div>`;
        }
      }
    }

    teamDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="team-name">${team.team_name}</div>
      <div class="team-icon">${this.getEmojiFromName(team.team_icon)}</div>
      <div class="team-score">${team.total_score || 0}</div>
      ${playersHtml}
    `;

    return teamDiv;
  }

  createParticipantElement(participant, position) {
    const participantDiv = document.createElement('div');
    participantDiv.className = 'leaderboard-team participant-item';
    
    // Medal for top 3
    let medal = '';
    if (position === 1) medal = '🥇';
    else if (position === 2) medal = '🥈';
    else if (position === 3) medal = '🥉';
    else medal = '🏅';

    // Activity scores
    let activityScoresHtml = '';
    if (participant.activity_scores && Object.keys(participant.activity_scores).length > 0) {
      activityScoresHtml = '<div class="participant-activity-scores">';
      Object.entries(participant.activity_scores).forEach(([activityId, score]) => {
        activityScoresHtml += `<span class="activity-score-badge">${score}</span>`;
      });
      activityScoresHtml += '</div>';
    }

    participantDiv.innerHTML = `
      <div class="team-position">${position}</div>
      <div class="participant-medal">${medal}</div>
      <div class="participant-name">${this.escapeHtml(participant.player_name)}</div>
      ${activityScoresHtml}
      <div class="participant-total">${participant.total_score} punten</div>
    `;

    return participantDiv;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      this.sessionTitle.textContent = 'SportScore';
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

// Note: Avoid duplicate initialization
