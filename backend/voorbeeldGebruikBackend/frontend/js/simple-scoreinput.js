// Score Input JavaScript - Session Score Management
class SimpleScoreInput {
  constructor() {
    this.sessionId = new URLSearchParams(window.location.search).get('session');
    this.session = null;
    this.teams = [];
    this.timer = null;
    this.timeRemaining = 0;
    this.customQuickActions = [];
    this.isSubmitting = false;

    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de setup.');
      window.location.href = 'simple-setup.html';
      return;
    }

    this.init();
  }

  async init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadCustomQuickActions();
    await this.loadSession();
    await this.loadTeams();
    await this.loadLeaderboard();
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

    // Control buttons
    this.subtractBtn = document.getElementById('subtract-btn');
    this.addBtn = document.getElementById('add-btn');
    this.pauseSessionBtn = document.getElementById('pause-session-btn');
    this.nextRoundBtn = document.getElementById('next-round-btn');
    this.endSessionBtn = document.getElementById('end-session-btn');

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
    // Score input controls
    this.subtractBtn.addEventListener('click', () => this.adjustPoints(-1));
    this.addBtn.addEventListener('click', () => this.adjustPoints(1));

    // Team selection change - load players for selected team
    this.teamSelect.addEventListener('change', () => this.onTeamChange());

    // Form submission
    this.submitScoreBtn.addEventListener('click', () => this.submitScore());

    // Points input validation
    this.pointsInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < -100) value = -100;
      if (value > 100) value = 100;
      e.target.value = value;
    });

    // Enter key submission
    this.reasonInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitScore();
      }
    });

    // Session controls
    this.pauseSessionBtn.addEventListener('click', () => this.togglePause());
    this.nextRoundBtn.addEventListener('click', () => this.nextRound());
    this.endSessionBtn.addEventListener('click', () => this.endSession());

    // Custom quick actions
    this.addCustomBtn.addEventListener('click', () => this.addCustomQuickAction());

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
      this.session = await api.get(`/api/v1/sessions/${this.sessionId}`);
      this.applyTheme();
      this.loadSportQuickButtons();
      this.updateSessionDisplay();
      this.startTimer();
    } catch (error) {
      api.handleError(error, 'loading session');
      alert('Fout bij het laden van de sessie.');
      window.location.href = 'homescreen.html';
    }
  }

  applyTheme() {
    if (!this.session || !this.session.sport_type) return;
    document.body.setAttribute('data-sport', this.session.sport_type);
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
    if (this.sessionName) {
      const scoringModeIndicator = this.session.scoring_mode === 'player' ? ' 👤' : ' 👥';
      const scoringModeTitle = this.session.scoring_mode === 'player' ? 'Speler Scores Modus' : 'Team Scores Modus';
      this.sessionName.innerHTML = `${this.session.name} <span title="${scoringModeTitle}">${scoringModeIndicator}</span>`;
    }
    if (this.roundInfo) {
      this.roundInfo.textContent = `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
    }

    // Disable player select in team mode, disable team-only scoring in player mode
    this.updateScoringModeUI();

    this.updateTimerDisplay();
  }

  updateScoringModeUI() {
    if (!this.session) return;

    if (this.session.scoring_mode === 'team') {
      // Team mode: disable player selection
      if (this.playerSelect) {
        this.playerSelect.disabled = true;
        this.playerSelect.innerHTML = '<option value="">Team modus - spelers uitgeschakeld</option>';
        this.playerSelect.title = 'In team modus kunnen alleen punten aan teams worden gegeven';
      }
    } else if (this.session.scoring_mode === 'player') {
      // Player mode: enable player selection and show warning for team-only scoring
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
    }
  }

  async loadTeams() {
    try {
      // Save current selections
      const currentTeamId = this.teamSelect.value;
      const currentPlayerId = this.playerSelect.value;

      const response = await api.get(`/api/v1/sessions/${this.sessionId}/teams`);
      const newTeams = response.teams || [];

      // Preserve existing player data if it exists
      const existingPlayers = {};
      this.teams.forEach((team) => {
        if (team.players) {
          existingPlayers[team.id] = team.players;
        }
      });

      this.teams = newTeams;

      // Restore player data for teams that had it
      this.teams.forEach((team) => {
        if (existingPlayers[team.id]) {
          team.players = existingPlayers[team.id];
        }
      });

      this.populateTeamSelect();

      // Check if we need to load players for all teams (for team_with_players mode)
      const showPlayers = this.session && (this.session.scoring_mode === 'player' || this.session.scoring_mode === 'team_with_players');
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
      option.textContent = `${team.name} (${team.score} punten)`;
      this.teamSelect.appendChild(option);
    });
  }

  async onTeamChange() {
    const teamId = this.teamSelect.value;
    if (!teamId) {
      this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>';
      return;
    }
    await this.loadPlayersForTeam(teamId);
  }

  async loadPlayersForTeam(teamId) {
    try {
      this.playerSelect.innerHTML = '<option value="">Laden...</option>';
      const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${teamId}/players`);
      const players = resp && resp.players ? resp.players : [];
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
      // Load all scores for this session to calculate leaderboard
      const scoresResponse = await api.get(`/api/v1/sessions/${this.sessionId}/scores`);
      const allScores = scoresResponse.scores || [];

      // Load players for all teams
      await this.loadPlayersForAllTeams();

      // Calculate leaderboard from teams and scores
      const leaderboard = this.calculateLeaderboard(allScores);

      // Cache leaderboard data for incremental updates
      this.leaderboardData = leaderboard;

      this.displayLeaderboard(leaderboard);
    } catch (error) {
      api.handleError(error, 'loading leaderboard');
    }
  }

  async loadPlayersForAllTeams() {
    for (const team of this.teams) {
      try {
        const resp = await api.get(`/api/v1/sessions/${this.sessionId}/teams/${team.id}/players`);
        team.players = resp && resp.players ? resp.players : [];
      } catch (err) {
        const msg = err && err.message ? err.message : '';
        const status405 = (err && err.status === 405) || msg.indexOf('405') !== -1;
        if (status405) {
          try {
            const fallback = await api.get(`/api/v1/players`);
            team.players = fallback && fallback.players ? fallback.players : [];
          } catch (err2) {
            team.players = [];
          }
        } else {
          team.players = [];
        }
      }
    }
  }

  calculateLeaderboard(allScores) {
    const SportScores = {};

    // Initialize teams with 0 score and include players
    this.teams.forEach((team) => {
      SportScores[team.id] = {
        id: team.id,
        name: team.name,
        icon: team.icon,
        color: team.color,
        score: 0,
        players: team.players || [],
        playerScores: {}, // Track individual player scores
      };

      // Initialize player scores to 0
      if (team.players) {
        team.players.forEach((player) => {
          SportScores[team.id].playerScores[player.id] = 0;
        });
      }
    });

    // Add up all scores
    allScores.forEach((score) => {
      if (SportScores[score.team_id]) {
        SportScores[score.team_id].score += score.points;

        // If this score is for a specific player, track it
        if (score.player_id && SportScores[score.team_id].playerScores[score.player_id] !== undefined) {
          SportScores[score.team_id].playerScores[score.player_id] += score.points;
        }
      }
    });

    return Object.values(SportScores);
  }

  displayLeaderboard(leaderboard) {
    if (!this.leaderboard) return;

    if (!leaderboard || leaderboard.length === 0) {
      this.leaderboard.innerHTML = '<div class="no-teams">Geen teams gevonden</div>';
      return;
    }

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Check if session uses player-based scoring or team_with_players mode
    const isPlayerMode = this.session && this.session.scoring_mode === 'player';
    const showPlayers = isPlayerMode || (this.session && this.session.scoring_mode === 'team_with_players');

    const leaderboardHtml = leaderboard
      .map((team, index) => {
        let playersHtml = '';

        if (team.players && team.players.length > 0 && showPlayers) {
          if (isPlayerMode) {
            // Player mode: show player names with their individual scores
            playersHtml = `<div class="team-players">
                ${team.players
                  .map((p) => {
                    const playerScore = team.playerScores[p.id] || 0;
                    return `
                    <button class="player-badge" onclick="scoreInput.selectTeamAndPlayer(${team.id}, ${p.id}); event.stopPropagation();" title="Klik om ${this.escapeHtml(p.name)} te selecteren">
                      ${this.escapeHtml(p.position ? `${p.name} (${p.position})` : p.name)}: <strong>${playerScore}</strong>
                    </button>
                  `;
                  })
                  .join('')}
              </div>`;
          } else {
            // Team with players mode: just show player names as clickable badges
            playersHtml = `<div class="team-players">
                ${team.players
                  .map(
                    (p) => `
                  <button class="player-badge" onclick="scoreInput.selectTeamAndPlayer(${team.id}, ${p.id}); event.stopPropagation();" title="Klik om ${this.escapeHtml(p.name)} te selecteren">
                    ${this.escapeHtml(p.position ? `${p.name} (${p.position})` : p.name)}
                  </button>
                `
                  )
                  .join('')}
              </div>`;
          }
        }

        return `
            <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" data-team-id="${team.id}" onclick="scoreInput.selectTeam(${team.id})" style="cursor: pointer;">
              <div class="rank">#${index + 1}</div>
              <div class="team-info">
                <div class="team-icon">${this.getIconEmoji(team.icon)}</div>
                <div class="team-name">${this.escapeHtml(team.name)}</div>
              </div>
              <div class="team-score" data-team-score="${team.id}">${team.score}</div>
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

    leaderboard.forEach((team) => {
      const scoreElement = this.leaderboard.querySelector(`[data-team-score="${team.id}"]`);
      if (scoreElement) {
        scoreElement.textContent = team.score;
      }

      // Update player scores if in player mode
      if (this.session && this.session.scoring_mode === 'player' && team.players) {
        team.players.forEach((player) => {
          const playerBadges = this.leaderboard.querySelectorAll('.player-badge');
          playerBadges.forEach((badge) => {
            const badgeText = badge.textContent;
            const playerScore = team.playerScores[player.id] || 0;
            const playerName = player.position ? `${player.name} (${player.position})` : player.name;
            if (badgeText.includes(playerName)) {
              badge.innerHTML = `${this.escapeHtml(playerName)}: <strong>${playerScore}</strong>`;
            }
          });
        });
      }
    });
  }



  adjustPoints(delta) {
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
    // Optional: Add visual feedback or focus the points input
    this.pointsInput.focus();
  }

  selectTeamAndPlayer(teamId, playerId) {
    this.teamSelect.value = teamId;
    // Trigger team change first to load players
    this.onTeamChange().then(() => {
      // After players are loaded, select the specific player
      setTimeout(() => {
        this.playerSelect.value = playerId;
        this.pointsInput.focus();
      }, 100);
    });
  }

  async submitScore() {
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
    const points = parseInt(this.pointsInput.value);
    const reason = this.reasonInput.value.trim();

    if (!teamId) {
      alert('Selecteer een team.');
      this.teamSelect.focus();
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
      return;
    }

    // Validate scoring mode
    if (this.session.scoring_mode === 'player' && !playerId) {
      this.showInlineError('player-select', '⚠️ Selecteer een specifieke speler in Speler Modus');
      this.playerSelect.focus();
      this.isSubmitting = false;
      if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
      quickButtons.forEach((b) => (b.disabled = false));
      return;
    }

    if (isNaN(points)) {
      alert('Voer een geldig aantal punten in.');
      this.pointsInput.focus();
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
      setTimeout(() => {
        api.off('session_score_update', handler);
        resolve(false);
      }, 1500);
    });

    try {
      const scoreData = {
        session_id: parseInt(this.sessionId),
        team_id: teamId,
        points: points,
        reason: reason || 'Handmatig',
        round_number: this.session.current_round,
      };

      // Include player_id if a specific player was selected
      if (playerId) {
        scoreData.player_id = playerId;
      }

      // posting score
      await api.postSilent(`/api/v1/sessions/${this.sessionId}/scores`, scoreData);

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

    // Reset form (but keep team and player selected for quick re-entry)
    this.reasonInput.value = '';
    this.pointsInput.value = 1;

    // Reload leaderboard to show updated scores (this also loads players)
    this.loadLeaderboard();

    // Load recent scores with a small delay to ensure the score is saved
    // setTimeout(() => {
    //   this.loadRecentScores();
    // }, 500);
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
    this.animScoreChange.textContent = `${points >= 0 ? '+' : ''}${points}`;
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
      window.location.href = 'homescreen.html';
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
      // Update the cached leaderboard data
      if (this.leaderboardData) {
        const teamIndex = this.leaderboardData.findIndex((t) => t.id === data.team_id);
        if (teamIndex !== -1) {
          // Update team score
          this.leaderboardData[teamIndex].score += data.points;

          // Update player scores if available
          if (data.player_scores) {
            this.leaderboardData[teamIndex].playerScores = data.player_scores;
          }

          // Sort leaderboard by score
          this.leaderboardData.sort((a, b) => b.score - a.score);

          // Update scores in place without full re-render (preserves player badges)
          this.updateLeaderboardScores(this.leaderboardData);
        } else {
          // Team not in leaderboard yet, do full reload
          this.loadLeaderboard();
        }
      } else {
        // No cached data, do full reload
        this.loadLeaderboard();
      }

      // Load recent scores to show the new score entry
      // this.loadRecentScores();

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
let simpleScoreInput;

// Initialize the score input when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  simpleScoreInput = new SimpleScoreInput();
});
