// homepageHistory.js - Extracted highscores and history related functionality
export class HomepageHistory {
  constructor(api, sharedUtils, homepage) {
    this.api = api;
    this.sharedUtils = sharedUtils;
    this.homepage = homepage;
    this.highscoresActivities = [];
    this._highscoresHandler = null;
  }

  // ============================================================================
  // HIGHSCORES SECTION
  // ============================================================================

  /**
   * Load and compute highscore candidates across all sessions
   */
  async loadActivitiesForHighscores() {
    try {
      const allSessions = (this.homepage.activeSessions || []).concat(this.homepage.historySessions || []);

      // Group activity instances by name so we can compute a global leaderboard per activity name
      const activityGroups = new Map();

      for (const session of allSessions) {
        (session.activities || []).forEach(activity => {
          const key = String(activity.name || '');
          if (!activityGroups.has(key)) activityGroups.set(key, []);
          activityGroups.get(key).push({ activity, sessionId: session.id, session });
        });
      }

      // Build global player/team maps (used by _computeLeaderboard)
      const playerMap = new Map();
      const teamMap = new Map();
      allSessions.forEach(session => {
        (session.players || []).forEach(p => playerMap.set(String(p.id), p));
        (session.teams || []).forEach(t => teamMap.set(String(t.id), t));
      });

      const activitiesWithScores = [];

      for (const [name, instances] of activityGroups.entries()) {
        // Use the first instance as representative for metadata
        const rep = instances[0].activity;
        const lowerIsBetter = SharedUtils.isLowerBetter(rep);

        let topScore = null;

        try {
          // Map instances to the shape expected by _computeLeaderboard
          const insts = instances.map(i => ({ activity: i.activity, sessionId: i.sessionId }));

          const leaderboard = await this._computeLeaderboard(rep, insts, playerMap, teamMap) || [];

          if (leaderboard.length > 0) {
            const scoringMode = rep.scoring_mode || 'team';

            if (scoringMode === 'player') {
              topScore = leaderboard[0].total_score ?? null;
            } else if (scoringMode === 'team_with_players') {
              topScore = leaderboard[0].score ?? null;
            } else {
              topScore = leaderboard[0].total_score ?? null;
            }
          }
        } catch (e) {
          console.warn(`Error computing leaderboard for activity group ${name}:`, e);
        }

        activitiesWithScores.push({
          ...rep,
          highest_score: topScore !== undefined ? topScore : null,
          lower_is_better: lowerIsBetter
        });
      }

      this.highscoresActivities = activitiesWithScores;
      this.homepage.highscoresActivities = activitiesWithScores;
      this.setupHighscoresControls();
      this.filterAndRenderHighscores();
    } catch (error) {
      console.error('Error loading highscores:', error);
      const grid = document.getElementById('highscores-grid');
      if (grid) grid.innerHTML = '<div class="empty-state">Fout bij het laden van activiteiten.</div>';
    }
  }

  /**
   * Get the best score for a single activity
   */
  async _getBestScoreForActivity(activity, session) {
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);
    const scoringMode = activity.scoring_mode || 'team';
    const isTimeMode = String(activity.game_type) === 'team_vs_time';
    
    try {
      const lbResponse = await this.api.getActivityLeaderboard(activity.id);
      const leaderboard = lbResponse.leaderboard || [];
      
      if (leaderboard.length === 0) {
        return await this._getBestScoreFromDetailedScores(activity, session);
      }

      let bestScore = lowerIsBetter ? Infinity : -Infinity;

      for (const entry of leaderboard) {
        const rawScore = entry.total_score ?? entry.score ?? entry.points;
        if (rawScore === undefined || rawScore === null) continue;

        let score = this._parseScore(rawScore, isTimeMode);
        if (score === null) continue;

        if (lowerIsBetter) {
          if (score > 0 && score < bestScore) bestScore = score;
        } else {
          if (score > bestScore) bestScore = score;
        }
      }

      return (bestScore === Infinity || bestScore === -Infinity) ? null : bestScore;
    } catch (e) {
      console.warn(`Error getting leaderboard for activity ${activity.id}:`, e);
      return await this._getBestScoreFromDetailedScores(activity, session);
    }
  }

  /**
   * Fallback: Get best score from detailed scores endpoint
   */
  async _getBestScoreFromDetailedScores(activity, session) {
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);
    const scoringMode = activity.scoring_mode || 'team';
    const isTimeMode = String(activity.game_type) === 'team_vs_time';
    
    try {
      const scoresResp = await this.api.getActivityScores(activity.id);
      const scores = this.api.extractArray(scoresResp, 'scores') || [];

      // Special handling for team_with_players: compute best team score using player -> team mapping
      if (scoringMode === 'team_with_players') {
        const playerMap = new Map((session.players || []).map(p => [String(p.id), p]));
        const teamBest = {};

        scores.forEach(s => {
          let teamId = s.team_id;
          if (!teamId && s.player_id) {
            const player = playerMap.get(String(s.player_id));
            teamId = player?.team_id;
          }
          if (!teamId) return;

          const tid = String(teamId);
          const rawScore = s.points ?? s.score ?? s.total_score;
          if (rawScore === undefined || rawScore === null) return;

          const scoreVal = this._parseScore(rawScore, isTimeMode);
          if (scoreVal === null || (lowerIsBetter && scoreVal === 0)) return;

          if (!teamBest[tid]) teamBest[tid] = lowerIsBetter ? Infinity : -Infinity;
          teamBest[tid] = lowerIsBetter ? Math.min(teamBest[tid], scoreVal) : Math.max(teamBest[tid], scoreVal);
        });

        let bestScore = lowerIsBetter ? Infinity : -Infinity;
        Object.values(teamBest).forEach(sc => {
          if (sc === undefined) return;
          if (lowerIsBetter) {
            if (sc > 0 && sc < bestScore) bestScore = sc;
          } else {
            if (sc > bestScore) bestScore = sc;
          }
        });

        return (bestScore === Infinity || bestScore === -Infinity) ? null : bestScore;
      }
      
      let bestScore = lowerIsBetter ? Infinity : -Infinity;

      for (const score of scores) {
        const rawScore = score.points ?? score.score ?? score.total_score;
        if (rawScore === undefined || rawScore === null) continue;

        let parsedScore = this._parseScore(rawScore, isTimeMode);
        if (parsedScore === null) continue;

        if (lowerIsBetter) {
          if (parsedScore > 0 && parsedScore < bestScore) bestScore = parsedScore;
        } else {
          if (parsedScore > bestScore) bestScore = parsedScore;
        }
      }

      return (bestScore === Infinity || bestScore === -Infinity) ? null : bestScore;
    } catch (e) {
      console.warn(`Error getting detailed scores for activity ${activity.id}:`, e);
      return null;
    }
  }

  /**
   * Parse a score value, handling time strings
   */
  _parseScore(rawScore, isTimeMode) {
    if (rawScore === undefined || rawScore === null) return null;

    // Strings are parsed via the common time parser (e.g. "0:00.067" -> 67 ms)
    if (typeof rawScore === 'string') {
      const parsed = SharedUtils.parseTimeToMs(rawScore);
      return Number.isFinite(parsed) ? Math.abs(parsed) : null;
    }

    const num = Number(rawScore);
    if (!Number.isFinite(num)) return null;

    // Heuristic for time values provided as numeric seconds (e.g. 0.067 -> 67 ms):
    // - If this is a time activity and the value is a non-integer (contains decimals),
    //   treat it as seconds and convert to milliseconds.
    if (isTimeMode && !Number.isInteger(num)) {
      return Math.abs(Math.round(num * 1000));
    }

    // Otherwise treat numeric value as already the correct unit (ms or points)
    return Math.abs(num);
  }

  /**
   * Render highscores grid
   */
  renderHighscores(activities) {
    const grid = document.getElementById('highscores-grid');
    if (!grid) return;

    if (activities.length === 0) {
      grid.innerHTML = '<div class="empty-state">Geen activiteiten beschikbaar.</div>';
      return;
    }

    grid.innerHTML = activities.map(activity => {
      const isTime = String(activity.game_type) === 'team_vs_time';
      const scoreText = activity.highest_score !== null
        ? (isTime ? SharedUtils.formatMs(activity.highest_score) : activity.highest_score)
        : (isTime ? 'Geen tijden' : 'Geen scores');

      return `
        <div class="highscores-card" data-activity-id="${activity.id}" data-session-id="${activity.session_id}">
          <h3>${this.homepage.escapeHtml(activity.name)}</h3>
          <div class="highscores-meta">
            <span>${this.homepage.escapeHtml(activity.sport_type)}</span>
            <span>${this.homepage.escapeHtml(activity.game_type || 'custom')}</span>
          </div>
          <p>${activity.description ? this.homepage.escapeHtml(activity.description) : ''}</p>
          <div class="highscores-stats">
            <span>Beste score: ${scoreText}</span>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.highscores-card').forEach(card => {
      card.addEventListener('click', () => {
        const activityId = card.dataset.activityId;
        this.showHighscoreDetails(activityId);
      });
    });
  }

  /**
   * Setup filter and search controls
   */
  setupHighscoresControls() {
    const controlsContainer = document.querySelector('#highscores-tab .highscores-controls') || 
                             document.querySelector('#highscores-section .highscores-controls');
    if (!controlsContainer) return;

    const filterEl = controlsContainer.querySelector('#filter-sport');
    const searchEl = controlsContainer.querySelector('#search-activity');

    if (!this._highscoresHandler) {
      this._highscoresHandler = () => this.filterAndRenderHighscores();
    }

    if (filterEl) {
      filterEl.removeEventListener('change', this._highscoresHandler);
      filterEl.addEventListener('change', this._highscoresHandler);
    }

    if (searchEl) {
      searchEl.removeEventListener('input', this._highscoresHandler);
      searchEl.addEventListener('input', this._highscoresHandler);
    }
  }

  /**
   * Filter and render highscores based on current filters
   */
  filterAndRenderHighscores() {
    let activities = (this.highscoresActivities || []).slice();
    
    const controlsContainer = document.querySelector('#highscores-tab .highscores-controls') || 
                             document.querySelector('#highscores-section .highscores-controls');
    
    if (!controlsContainer) {
      this.renderHighscores(activities);
      return;
    }

    const filterEl = controlsContainer.querySelector('#filter-sport');
    const searchEl = controlsContainer.querySelector('#search-activity');

    const sport = filterEl ? (filterEl.value || '').trim().toLowerCase() : '';
    const search = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (sport) {
      activities = activities.filter(a => 
        ((a.sport_type || '') + '').toLowerCase() === sport
      );
    }

    if (search) {
      activities = activities.filter(a => 
        ((a.name || '') + '').toLowerCase().includes(search)
      );
    }

    this.renderHighscores(activities);
  }

  /**
   * Show detailed highscore modal for an activity
   */
  async showHighscoreDetails(activityId) {
    try {
      // Get all sessions and find relevant ones
      const allSessions = (this.homepage.activeSessions || []).concat(this.homepage.historySessions || []);
      
      // Build player and team maps
      const playerMap = new Map();
      const teamMap = new Map();
      
      allSessions.forEach(session => {
        (session.players || []).forEach(player => {
          playerMap.set(String(player.id), player);
        });
        (session.teams || []).forEach(team => {
          teamMap.set(String(team.id), team);
        });
      });

      // Get activity details
      let activity;
      try {
        const activityResponse = await this.api.getActivity(activityId);
        activity = activityResponse.activity || activityResponse;
      } catch (err) {
        console.warn('Could not fetch activity details:', err);
        activity = { id: activityId, name: `Activiteit ${activityId}`, scoring_mode: 'team' };
      }

      // Find all instances of this activity across sessions
      const instances = [];
      allSessions.forEach(session => {
        (session.activities || []).forEach(act => {
          if (String(act.name) === String(activity.name)) {
            instances.push({ activity: act, sessionId: session.id });
          }
        });
      });

      if (instances.length === 0) {
        instances.push({ activity, sessionId: activity.session_id || null });
      }

      // Compute leaderboard
      const leaderboard = await this._computeLeaderboard(activity, instances, playerMap, teamMap);

      // Create and show modal
      this._showHighscoreModal(activity, leaderboard);

    } catch (error) {
      console.error('Error showing highscore details:', error);
      this.homepage.showErrorMessage('Fout bij het laden van highscore details.');
    }
  }

  /**
   * Compute leaderboard across all instances of an activity
   */
  async _computeLeaderboard(activity, instances, playerMap, teamMap) {
    const scoringMode = String(activity.scoring_mode || 'team').toLowerCase();
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);

    const isGolfMode = scoringMode.includes('golf') || String(activity.game_type || '').toLowerCase().includes('golf');

    if (scoringMode === 'player' || isGolfMode) {
      return await this._computePlayerLeaderboard(instances, playerMap, lowerIsBetter);
    } else if (scoringMode === 'team_with_players') {
      return await this._computeTeamWithPlayersLeaderboard(instances, playerMap, teamMap, lowerIsBetter);
    } else {
      return await this._computeTeamLeaderboard(instances, teamMap, lowerIsBetter);
    }
  }

  /**
   * Compute player-based leaderboard
   */
  async _computePlayerLeaderboard(instances, playerMap, lowerIsBetter) {
    const playerBest = {};

    for (const inst of instances) {
      try {
        const lbResp = await this.api.getActivityLeaderboard(inst.activity.id);
        const leaderboard = lbResp.leaderboard || [];

        if (leaderboard.length > 0) {
          leaderboard.forEach(entry => {
            const rawScore = entry.total_score ?? entry.score ?? entry.points;
            const isTimeMode = String(inst.activity.game_type) === 'team_vs_time';

            if (rawScore === undefined || rawScore === null) return;
            const score = this._parseScore(rawScore, isTimeMode);
            if (score === null || score === 0) return;

            // If entry has a player_id, use that. If it only has a team_id (or neither),
            // attempt to attribute the score to players on that team (useful for golf_scoring etc.)
            if (entry.player_id) {
              const pid = String(entry.player_id);

              if (!playerBest[pid]) {
                playerBest[pid] = {
                  player_name: entry.player_name || playerMap.get(pid)?.name || `Speler ${pid}`,
                  total_score: score
                };
              } else {
                playerBest[pid].total_score = lowerIsBetter 
                  ? Math.min(playerBest[pid].total_score, score)
                  : Math.max(playerBest[pid].total_score, score);
              }

            } else if (entry.team_id) {
              // attribute to all players in this team
              for (const [pid, player] of playerMap.entries ? playerMap.entries() : Object.entries(playerMap)) {
                const playerObj = playerMap.get ? playerMap.get(pid) : player;
                if (!playerObj) continue;
                if (String(playerObj.team_id) === String(entry.team_id)) {
                  const key = String(playerObj.id || pid);
                  if (!playerBest[key]) {
                    playerBest[key] = {
                      player_name: playerObj.name || `Speler ${key}`,
                      total_score: score
                    };
                  } else {
                    playerBest[key].total_score = lowerIsBetter
                      ? Math.min(playerBest[key].total_score, score)
                      : Math.max(playerBest[key].total_score, score);
                  }
                }
              }
            } else if (entry.player_name) {
              const pid = String(entry.player_name);
              if (!playerBest[pid]) {
                playerBest[pid] = { player_name: entry.player_name, total_score: score };
              } else {
                playerBest[pid].total_score = lowerIsBetter
                  ? Math.min(playerBest[pid].total_score, score)
                  : Math.max(playerBest[pid].total_score, score);
              }
            }
          });
        } else {
          // Fallback to detailed scores
          const scoresResp = await this.api.getActivityScores(inst.activity.id);
          const scores = this.api.extractArray(scoresResp, 'scores') || [];

          scores.forEach(s => {
            const rawScore = s.points ?? s.score ?? s.total_score;
            const isTimeMode = String(inst.activity.game_type) === 'team_vs_time';
            if (rawScore === undefined || rawScore === null) return;

            const score = this._parseScore(rawScore, isTimeMode);
            if (score === null || score === 0) return;

            if (s.player_id) {
              const pid = String(s.player_id);
              if (!playerBest[pid]) {
                playerBest[pid] = {
                  player_name: playerMap.get(pid)?.name || `Speler ${pid}`,
                  total_score: score
                };
              } else {
                playerBest[pid].total_score = lowerIsBetter 
                  ? Math.min(playerBest[pid].total_score, score)
                  : Math.max(playerBest[pid].total_score, score);
              }

            } else if (s.team_id) {
              // attribute to all players in this team
              for (const [pid, player] of playerMap.entries ? playerMap.entries() : Object.entries(playerMap)) {
                const playerObj = playerMap.get ? playerMap.get(pid) : player;
                if (!playerObj) continue;
                if (String(playerObj.team_id) === String(s.team_id)) {
                  const key = String(playerObj.id || pid);
                  if (!playerBest[key]) {
                    playerBest[key] = {
                      player_name: playerObj.name || `Speler ${key}`,
                      total_score: score
                    };
                  } else {
                    playerBest[key].total_score = lowerIsBetter
                      ? Math.min(playerBest[key].total_score, score)
                      : Math.max(playerBest[key].total_score, score);
                  }
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn(`Error processing player instance ${inst.activity.id}:`, e);
      }
    }

    return Object.values(playerBest).sort((a, b) => 
      lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score)
    );
  }

  /**
   * Compute team-based leaderboard
   */
  async _computeTeamLeaderboard(instances, teamMap, lowerIsBetter) {
    const teamBest = {};

    for (const inst of instances) {
      try {
        const lbResp = await this.api.getActivityLeaderboard(inst.activity.id);
        const leaderboard = lbResp.leaderboard || [];
        const isTimeMode = String(inst.activity.game_type) === 'team_vs_time';
        const aggregatePlayerTimes = !!inst.activity.aggregate_player_times;
        const timeWinner = (inst.activity.time_winner || 'lower').toLowerCase();

        if (leaderboard.length > 0) {
          leaderboard.forEach(entry => {
            const tid = String(entry.team_id || entry.id);
            const rawScore = entry.total_score ?? entry.score ?? entry.points;
            
            if (rawScore === undefined || rawScore === null) return;
            
            const score = this._parseScore(rawScore, isTimeMode);
            if (score === null || (lowerIsBetter && score === 0)) return;

            const teamName = entry.team_name || teamMap.get(tid)?.name || `Team ${tid}`;

            if (!teamBest[tid]) {
              teamBest[tid] = { team_name: teamName, total_score: score };
            } else {
              teamBest[tid].total_score = lowerIsBetter 
                ? Math.min(teamBest[tid].total_score, score)
                : Math.max(teamBest[tid].total_score, score);
            }
          });
        } else {
          // Fallback: compute per-team score from detailed scores according to activity rules
          const scoresResp = await this.api.getActivityScores(inst.activity.id);
          const scores = this.api.extractArray(scoresResp, 'scores') || [];

          const teamsInInstance = {};

          scores.forEach(s => {
            const teamId = s.team_id;
            if (!teamId) return;

            const tid = String(teamId);
            const rawScore = s.points ?? s.score ?? s.total_score;
            if (rawScore === undefined || rawScore === null) return;

            const parsed = this._parseScore(rawScore, isTimeMode);
            if (parsed === null) return;

            if (!teamsInInstance[tid]) teamsInInstance[tid] = { sum: 0, best: (isTimeMode ? (timeWinner === 'lower' ? Infinity : -Infinity) : -Infinity) };

            if (isTimeMode && !aggregatePlayerTimes) {
              teamsInInstance[tid].best = timeWinner === 'lower'
                ? Math.min(teamsInInstance[tid].best, parsed)
                : Math.max(teamsInInstance[tid].best, parsed);
            } else {
              teamsInInstance[tid].sum += parsed;
            }
          });

          Object.keys(teamsInInstance).forEach(tid => {
            const instData = teamsInInstance[tid];
            const instScore = (instData.sum && instData.sum > 0) ? instData.sum : instData.best;
            if (instScore === undefined || instScore === Infinity || instScore === -Infinity) return;

            const teamName = teamMap.get(tid)?.name || `Team ${tid}`;

            if (!teamBest[tid]) {
              teamBest[tid] = { team_name: teamName, total_score: instScore };
            } else {
              teamBest[tid].total_score = lowerIsBetter 
                ? Math.min(teamBest[tid].total_score, instScore)
                : Math.max(teamBest[tid].total_score, instScore);
            }
          });
        }
      } catch (e) {
        console.warn(`Error processing team instance ${inst.activity.id}:`, e);
      }
    }

    return Object.values(teamBest).sort((a, b) => 
      lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score)
    );
  }

  /**
   * Compute team-with-players leaderboard
   */
  async _computeTeamWithPlayersLeaderboard(instances, playerMap, teamMap, lowerIsBetter) {
    const teamBest = {};

    for (const inst of instances) {
      try {
        const scoresResp = await this.api.getActivityScores(inst.activity.id);
        const scores = this.api.extractArray(scoresResp, 'scores') || [];

        const isTimeMode = String(inst.activity.game_type) === 'team_vs_time';
        const aggregatePlayerTimes = !!inst.activity.aggregate_player_times;
        const timeWinner = (inst.activity.time_winner || 'lower').toLowerCase();

        const teamsInInstance = {};

        scores.forEach(s => {
          let teamId = s.team_id;
          if (!teamId && s.player_id) {
            const player = playerMap.get(String(s.player_id));
            teamId = player?.team_id;
          }
          if (!teamId) return;

          const tid = String(teamId);
          const pid = s.player_id ? String(s.player_id) : null;
          const rawScore = s.points ?? s.score ?? s.total_score;
          
          if (rawScore === undefined || rawScore === null) return;
          
          const parsed = this._parseScore(rawScore, isTimeMode);
          if (parsed === null || (isTimeMode && parsed === 0 && timeWinner === 'lower')) return;

          if (!teamsInInstance[tid]) {
            teamsInInstance[tid] = {
              teamSum: 0,
              teamBest: isTimeMode ? (timeWinner === 'lower' ? Infinity : -Infinity) : -Infinity,
              players: {}
            };
          }

          // Track per-player aggregated scores
          if (pid) {
            const playerName = playerMap.get(pid)?.name || `Speler ${pid}`;
            if (!teamsInInstance[tid].players[pid]) {
              teamsInInstance[tid].players[pid] = { name: playerName, score: parsed };
            } else {
              // For time activities, track best per player when not aggregating; otherwise sum
              if (isTimeMode && !aggregatePlayerTimes) {
                teamsInInstance[tid].players[pid].score = timeWinner === 'lower'
                  ? Math.min(teamsInInstance[tid].players[pid].score, parsed)
                  : Math.max(teamsInInstance[tid].players[pid].score, parsed);
              } else {
                teamsInInstance[tid].players[pid].score += parsed;
              }
            }
          }

          // Track team-level value according to rules:
          // - If aggregatePlayerTimes: sum player values (teamSum)
          // - If time-mode and not aggregate: track best (min/max) among players
          // - For non-time, sum points
          if (isTimeMode && !aggregatePlayerTimes) {
            teamsInInstance[tid].teamBest = timeWinner === 'lower'
              ? Math.min(teamsInInstance[tid].teamBest, parsed)
              : Math.max(teamsInInstance[tid].teamBest, parsed);
          } else {
            teamsInInstance[tid].teamSum += parsed;
          }
        });

        // Merge into overall best across instances
        Object.keys(teamsInInstance).forEach(tid => {
          const instData = teamsInInstance[tid];
          const instScore = (instData.teamSum && instData.teamSum > 0) ? instData.teamSum : instData.teamBest;

          if (instScore === undefined || instScore === Infinity || instScore === -Infinity) return;

          if (!teamBest[tid] || 
              (lowerIsBetter ? instScore < teamBest[tid].score : instScore > teamBest[tid].score)) {
            teamBest[tid] = {
              name: teamMap.get(tid)?.name || `Team ${tid}`,
              score: instScore,
              players: instData.players
            };
          }
        });
      } catch (e) {
        console.warn(`Error processing team-with-players instance ${inst.activity.id}:`, e);
      }
    }

    return Object.values(teamBest).sort((a, b) => 
      lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
    );
  }

  /**
   * Show highscore modal
   */
  _showHighscoreModal(activity, leaderboard) {
    const existingModal = document.getElementById('highscores-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'highscores-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-height: 70vh; overflow-y: auto;">
        <div class="modal-close">&times;</div>
        <div id="highscores-modal-body">
          <div class="active-session-card" style="border: none; box-shadow: none; padding: 0;">
            <div class="session-header">
              <div>
                <h3 class="session-title">${this.homepage.escapeHtml(activity.name)}</h3>
                <p style="margin: 5px 0; color: var(--text-secondary);">
                  ${this.homepage.escapeHtml(activity.sport_type)} • ${this.homepage.escapeHtml(activity.scoring_mode)}
                </p>
              </div>
            </div>
            <div class="scores-display" id="highscores-details"></div>
            <div class="session-controls">
              <button class="btn btn-secondary" onclick="this.closest('.modal').classList.remove('show')">
                ✕ Sluiten
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const detailsEl = modal.querySelector('#highscores-details');
    this._displayHighscoreScores(activity, leaderboard, detailsEl);

    modal.classList.add('show');

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }

  /**
   * Display highscore scores in container
   */
  _displayHighscoreScores(activity, leaderboard, container) {
    if (!container) {
      console.warn('Highscores details container not found');
      return;
    }

    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<p>Geen scores beschikbaar.</p>';
      return;
    }

    const scoringMode = activity.scoring_mode || 'team';
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);
    const isTimeMode = String(activity.game_type) === 'team_vs_time';

    if (scoringMode === 'player') {
      this._renderPlayerScores(leaderboard, isTimeMode, container);
    } else if (scoringMode === 'team_with_players') {
      this._renderTeamWithPlayersScores(leaderboard, isTimeMode, lowerIsBetter, container);
    } else {
      this._renderTeamScores(leaderboard, isTimeMode, container);
    }
  }

  /**
   * Render player scores
   */
  _renderPlayerScores(leaderboard, isTimeMode, container) {
    container.innerHTML = leaderboard.map((player, index) => `
      <div class="score-item">
        <div class="score-item-name">
          #${index + 1} ${this.homepage.escapeHtml(player.player_name || 'Onbekend')}
        </div>
        <div class="score-item-value">
          ${isTimeMode ? SharedUtils.formatMs(player.total_score) : player.total_score}
        </div>
      </div>
    `).join('');
  }

  /**
   * Render team scores
   */
  _renderTeamScores(leaderboard, isTimeMode, container) {
    container.innerHTML = leaderboard.map((team, index) => `
      <div class="score-item">
        <div class="score-item-name">
          #${index + 1} ${this.homepage.escapeHtml(team.team_name || 'Onbekend')}
        </div>
        <div class="score-item-value">
          ${isTimeMode ? SharedUtils.formatMs(team.total_score) : team.total_score}
        </div>
      </div>
    `).join('');
  }

  /**
   * Render team-with-players scores
   */
  _renderTeamWithPlayersScores(leaderboard, isTimeMode, lowerIsBetter, container) {
    container.innerHTML = leaderboard.map((team, index) => {
      const playersList = Object.values(team.players || {});
      playersList.sort((a, b) => 
        lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
      );

      return `
        <div class="score-card" style="background: var(--background-color); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <div style="font-weight: 600; color: var(--text-color); margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3em; color: var(--primary-color);">#${index + 1}</span> 
            <span style="font-size: 1.15em;">${this.homepage.escapeHtml(team.name)}</span>
          </div>
          <div style="font-size: 1.5em; font-weight: 700; color: var(--primary-color); margin-bottom: 16px;">
            ${isTimeMode ? SharedUtils.formatMs(team.score) : (team.score + ' punten')}
            ${isTimeMode ? '<small style="font-size: 0.7em; color: var(--text-secondary);"> (beste tijd)</small>' : ''}
          </div>
          ${playersList.length > 0 ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
              <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Spelers:</div>
              ${playersList.map(p => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.95em;">
                  <span>${this.homepage.escapeHtml(p.name)}</span>
                  <span style="font-weight: 600; color: var(--primary-color);">
                    ${isTimeMode ? SharedUtils.formatMs(p.score) : p.score}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // ============================================================================
  // HISTORY SECTION
  // ============================================================================

  /**
   * Open history modal for a session
   */
  openHistoryModal(sessionId) {
    const session = this.homepage.historySessions.find(s => s.id == sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    const modal = document.getElementById('history-modal');
    const modalBody = document.getElementById('history-modal-body');
    
    if (!modal || !modalBody) {
      console.error('Modal elements not found');
      return;
    }

    modalBody.innerHTML = `
      <div class="active-session-card" style="border: none; box-shadow: none; padding: 0;">
        <div class="session-header">
          <div>
            <h3 class="session-title">${this.homepage.escapeHtml(session.name)}</h3>
            <p style="margin: 5px 0; color: var(--text-secondary);">
              ${this.homepage.formatDate(session.created_at)}
            </p>
          </div>
          <span class="session-status completed">✓ Voltooid</span>
        </div>
        
        <div class="session-details">
          <div class="detail-box">
            <label>Teams</label>
            <value>${session.teams?.length || 0} teams</value>
          </div>
          <div class="detail-box">
            <label>Activiteiten</label>
            <value>${session.activities?.length || 0} activiteiten</value>
          </div>
          <div class="detail-box">
            <label>Spelers</label>
            <value>${session.players?.length || 0} spelers</value>
          </div>
        </div>

        <div class="activity-selector-container">
          <label for="modal-activity-select-${session.id}">Selecteer activiteit om scores te bekijken:</label>
          <select id="modal-activity-select-${session.id}" onchange="window.homepage.displayModalActivityScores(${session.id}, this.value)">
            <option value="">-- Kies een activiteit --</option>
            ${(session.activities || []).map(a => 
              `<option value="${a.id}">${this.homepage.escapeHtml(a.name)}</option>`
            ).join('')}
          </select>

          <div id="modal-activity-exports-${session.id}" style="margin-top:12px; padding-top:12px; border-top: 1px solid var(--border-color);">
            <div style="font-weight:600; margin-bottom:8px; color: var(--text-color);">📊 Export Optie:</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-primary" onclick="window.homepage.export.exportSession(${session.id})">
                Exporteer Volledige Sessie
              </button>
            </div>
            <div style="margin-top:8px; font-size:0.9em; color: var(--text-secondary);">
              Bevat alle scores, teams, spelers en activiteiten van deze sessie
            </div>
          </div>
        </div>

        <div id="modal-scores-${session.id}" class="scores-display" style="display: none;"></div>

        <div class="session-controls">
          <button class="btn btn-secondary" onclick="document.getElementById('history-modal').classList.remove('show')">
            ✕ Sluiten
          </button>
        </div>
      </div>
    `;

    modal.classList.add('show');

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.style.maxHeight = '70vh';
  }

  /**
   * Display scores for a specific activity in the history modal
   */
  async displayModalActivityScores(sessionId, activityId) {
    const container = document.getElementById(`modal-scores-${sessionId}`);
    if (!container) return;

    if (!activityId) {
      container.style.display = 'none';
      return;
    }

    const session = this.homepage.historySessions.find(s => s.id == sessionId);
    if (!session) return;

    const activity = (session.activities || []).find(a => a.id == activityId);
    if (!activity) return;

    try {
      const scoresResponse = await this.api.getActivityScores(activityId);
      const activityScores = this.api.extractArray(scoresResponse, 'scores') || [];

      const scoringMode = activity.scoring_mode || 'team';
      const lowerIsBetter = SharedUtils.isLowerBetter(activity);
      const isTimeMode = String(activity.game_type) === 'team_vs_time';

      // Build maps
      const teamMap = {};
      const playerMap = {};
      (session.teams || []).forEach(t => { teamMap[t.id] = t; });
      (session.players || []).forEach(p => { playerMap[p.id] = p; });

      // Prefer using the same leaderboard computation as the global highscores (ensures parity)
      let scoresList = [];
      try {
        const instances = [{ activity: activity, sessionId: session.id }];
        const leaderboard = await this._computeLeaderboard(activity, instances, new Map(Object.entries(playerMap)), new Map(Object.entries(teamMap))) || [];

        if (leaderboard.length > 0) {
          scoresList = leaderboard;
        } else {
          // Fallback to local aggregation if no leaderboard entries returned
          const aggregatedScores = scoringMode === 'player'
            ? this._aggregatePlayerScores(activityScores, playerMap, teamMap, lowerIsBetter, isTimeMode)
            : scoringMode === 'team_with_players'
              ? this._aggregateTeamWithPlayersScores(activityScores, teamMap, playerMap, lowerIsBetter, isTimeMode)
              : this._aggregateTeamScores(activityScores, teamMap, playerMap, lowerIsBetter, isTimeMode);

          scoresList = Object.values(aggregatedScores);
          scoresList.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));
        }
      } catch (e) {
        console.warn('Error computing leaderboard for history modal, falling back to raw aggregation:', e);
        const aggregatedScores = scoringMode === 'player'
          ? this._aggregatePlayerScores(activityScores, playerMap, teamMap, lowerIsBetter, isTimeMode)
          : scoringMode === 'team_with_players'
            ? this._aggregateTeamWithPlayersScores(activityScores, teamMap, playerMap, lowerIsBetter, isTimeMode)
            : this._aggregateTeamScores(activityScores, teamMap, playerMap, lowerIsBetter, isTimeMode);

        scoresList = Object.values(aggregatedScores);
        scoresList.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));
      }

      // Render modal using the same renderers as highscores
      if (scoringMode === 'player') {
        this._renderPlayerScores(scoresList, isTimeMode, container);
      } else if (scoringMode === 'team_with_players') {
        this._renderTeamWithPlayersScores(scoresList, isTimeMode, lowerIsBetter, container);
      } else {
        this._renderTeamScores(scoresList, isTimeMode, container);
      }

      container.style.display = 'block';

    } catch (error) {
      console.error('Error displaying modal activity scores:', error);
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Fout bij het laden van scores.</p>';
      container.style.display = 'block';
    }
  }

  /**
   * Aggregate player scores
   */
  _aggregatePlayerScores(scores, playerMap, teamMap, lowerIsBetter, isTimeMode) {
    const aggregated = {};

    // Helper to apply a parsed score to a single player id
    const applyToPlayer = (playerId, parsedScore) => {
      const player = playerMap[playerId];
      const playerName = player?.name || `Speler ${playerId}`;

      if (!aggregated[playerId]) {
        aggregated[playerId] = {
          id: playerId,
          name: playerName,
          score: parsedScore,
          color: player?.color,
          icon: player?.icon,
          type: 'player'
        };
      } else {
        aggregated[playerId].score = lowerIsBetter
          ? Math.min(aggregated[playerId].score, parsedScore)
          : aggregated[playerId].score + parsedScore;
      }
    };

    scores.forEach(score => {
      const playerId = score.player_id;
      const teamId = score.team_id;
      const rawScore = score.points ?? score.score ?? score.total_score;

      if (rawScore === undefined || rawScore === null) return;

      let parsedScore = this._parseScore(rawScore, isTimeMode);
      if (parsedScore === null) return;
      if (lowerIsBetter && parsedScore === 0) return;

      if (playerId) {
        applyToPlayer(String(playerId), parsedScore);
        return;
      }

      // Fallback: score without player_id but with team_id — distribute/attribute to players in that team
      if (teamId) {
        // Find players in this team from the provided playerMap
        const teamPlayers = Object.values(playerMap).filter(p => String(p.team_id) === String(teamId));

        if (teamPlayers.length > 0) {
          // Attribute the team score to each player (sum for points mode, or use min/max for lowerIsBetter/time)
          teamPlayers.forEach(tp => {
            applyToPlayer(String(tp.id), parsedScore);
          });
        }
      }
    });

    return aggregated;
  }

  /**
   * Aggregate team scores
   */
  _aggregateTeamScores(scores, teamMap, playerMap, lowerIsBetter, isTimeMode) {
    const aggregated = {};

    scores.forEach(score => {
      let teamId = score.team_id;
      
      if (!teamId && score.player_id) {
        const player = playerMap[score.player_id];
        teamId = player?.team_id;
      }

      if (!teamId) return;

      const team = teamMap[teamId];
      const teamName = team?.name || `Team ${teamId}`;
      const rawScore = score.points ?? score.score ?? score.total_score;

      if (rawScore === undefined || rawScore === null) return;

      let parsedScore = this._parseScore(rawScore, isTimeMode);
      if (parsedScore === null) return;
      if (lowerIsBetter && parsedScore === 0) return;

      if (!aggregated[teamId]) {
        aggregated[teamId] = {
          id: teamId,
          name: teamName,
          score: parsedScore,
          color: team?.color,
          icon: team?.icon,
          type: 'team'
        };
      } else {
        aggregated[teamId].score = lowerIsBetter
          ? Math.min(aggregated[teamId].score, parsedScore)
          : aggregated[teamId].score + parsedScore;
      }
    });

    return aggregated;
  }

  /**
   * Aggregate team-with-players scores
   */
  _aggregateTeamWithPlayersScores(scores, teamMap, playerMap, lowerIsBetter, isTimeMode) {
    const aggregated = {};

    scores.forEach(score => {
      let teamId = score.team_id;
      
      if (!teamId && score.player_id) {
        const player = playerMap[score.player_id];
        teamId = player?.team_id;
      }

      if (!teamId) return;

      const team = teamMap[teamId];
      const teamName = team?.name || `Team ${teamId}`;
      const rawScore = score.points ?? score.score ?? score.total_score;

      if (rawScore === undefined || rawScore === null) return;

      let parsedScore = this._parseScore(rawScore, isTimeMode);
      if (parsedScore === null) return;
      if (lowerIsBetter && parsedScore === 0) return;

      if (!aggregated[teamId]) {
        aggregated[teamId] = {
          id: teamId,
          name: teamName,
          score: parsedScore,
          color: team?.color,
          icon: team?.icon,
          type: 'team',
          players: {}
        };
      } else {
        aggregated[teamId].score = lowerIsBetter
          ? Math.min(aggregated[teamId].score, parsedScore)
          : aggregated[teamId].score + parsedScore;
      }

      // Track individual player
      if (score.player_id) {
        const playerId = score.player_id;
        const player = playerMap[playerId];
        const playerName = player?.name || `Speler ${playerId}`;

        if (!aggregated[teamId].players[playerId]) {
          aggregated[teamId].players[playerId] = {
            name: playerName,
            score: parsedScore
          };
        } else {
          aggregated[teamId].players[playerId].score = lowerIsBetter
            ? Math.min(aggregated[teamId].players[playerId].score, parsedScore)
            : aggregated[teamId].players[playerId].score + parsedScore;
        }
      }
    });

    return aggregated;
  }

  /**
   * Render modal scores
   */
  _renderModalScores(scoresList, scoringMode, isTimeMode, lowerIsBetter, container) {
    if (scoresList.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen scores beschikbaar voor deze activiteit.</p>';
      return;
    }

    if (scoringMode === 'team_with_players') {
      container.innerHTML = scoresList.map((team, index) => {
        const iconEmoji = this.homepage.getIconEmoji(team.icon);
        const colorStyle = team.color 
          ? `background-color: ${team.color}22; border-left: 4px solid ${team.color};` 
          : '';

        const playersList = Object.values(team.players || {});
        playersList.sort((a, b) => 
          lowerIsBetter ? (a.score - b.score) : (b.score - a.score)
        );

        return `
          <div class="score-card" style="background: var(--background-color); padding: 16px; border-radius: 8px; margin-bottom: 16px; ${colorStyle}">
            <div style="font-weight: 600; color: var(--text-color); margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.3em; color: var(--primary-color);">${index + 1}.</span> 
              <span style="font-size: 1.3em;">${iconEmoji}</span>
              <span style="font-size: 1.15em;">${this.homepage.escapeHtml(team.name)}</span>
            </div>
            <div style="font-size: 1.5em; font-weight: 700; color: var(--primary-color); margin-bottom: 16px;">
              ${isTimeMode ? SharedUtils.formatMs(team.score) : (team.score + ' punten')}
              ${isTimeMode ? '<small style="font-size: 0.7em; color: var(--text-secondary);"> (beste tijd)</small>' : ''}
            </div>
            ${playersList.length > 0 ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Spelers:</div>
                ${playersList.map(p => `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.95em;">
                    <span>${this.homepage.escapeHtml(p.name)}</span>
                    <span style="font-weight: 600; color: var(--primary-color);">
                      ${isTimeMode ? SharedUtils.formatMs(p.score) : p.score}
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = scoresList.map((item, index) => {
        const iconEmoji = this.homepage.getIconEmoji(item.icon);
        const colorStyle = item.color 
          ? `background-color: ${item.color}22; border-left: 4px solid ${item.color};` 
          : '';

        return `
          <div class="score-item" style="background: var(--background-color); padding: 12px; border-radius: 6px; margin-bottom: 10px; ${colorStyle}">
            <div style="font-weight: 600; color: var(--text-color); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1em; color: var(--primary-color);">${index + 1}.</span> 
              <span>${iconEmoji}</span>
              <span>${this.homepage.escapeHtml(item.name)}</span>
            </div>
            <div style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">
              ${isTimeMode ? SharedUtils.formatMs(item.score) : (item.score + ' punten')}
            </div>
          </div>
        `;
      }).join('');
    }
  }
}