
// homepage.js - Handles the homepage functionality

import { HomepageManagement } from './homepageManagement.js';

class Homepage {
  constructor() {
    this.api = window.scoreboardAPI;
    this.sharedUtils = new SharedUtils(this.api);
    this.templatesGrid = document.getElementById('templates-grid');
    this.sessionsList = document.getElementById('sessions-list');
    this.currentView = 'simple'; // 'simple' or 'detailed'
    this.management = new HomepageManagement(this.api, this.sharedUtils);
    this.activeSessions = [];
    this.historySessions = [];
    this.export = new HomepageExport(this.api, this.sharedUtils, this);
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupTabSwitching();
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || localStorage.getItem('lastSection') || 'start';
    this.showSection(section);
    if (section === 'beheer') {
      await this.management.loadBeheerData();
    }
    await this.loadTemplates();
    await this.loadActiveSessions();
    await this.loadHistorySessions();

    // Wire export-all button (history tab) to show confirm modal (XLSX-only)
    try {
      const exportAllBtn = document.getElementById('export-all-btn');
      if (exportAllBtn) exportAllBtn.addEventListener('click', () => this.export.showExportConfirm(null));

      // Wire export confirm modal buttons
      const exportConfirmModal = document.getElementById('export-confirm-modal');
      const exportConfirmStart = document.getElementById('export-confirm-start');
      const exportConfirmCancel = document.getElementById('export-confirm-cancel');
      const exportConfirmClose = document.querySelector('.export-close');
      if (exportConfirmStart) exportConfirmStart.addEventListener('click', () => this.export._exportConfirmProceed());
      if (exportConfirmCancel && exportConfirmModal) exportConfirmCancel.addEventListener('click', () => exportConfirmModal.classList.remove('show'));
      if (exportConfirmClose && exportConfirmModal) exportConfirmClose.addEventListener('click', () => exportConfirmModal.classList.remove('show'));

      // Wire player import modal open/close with robust loading of beheer data
      try {
        const openImportBtn = document.getElementById('open-player-import-btn');
        const importModal = document.getElementById('player-import-modal');
        const importClose = document.querySelector('.import-close');
        if (openImportBtn && importModal) openImportBtn.addEventListener('click', async (e) => {
          e && e.preventDefault && e.preventDefault();
          try {
            console.debug('open-player-import-btn clicked');
            // Ensure beheer data and bindings are loaded before showing import modal
            if (this.management && typeof this.management.loadBeheerData === 'function') {
              if (!this.management.playerImportFileInput) {
                await this.management.loadBeheerData();
              }
            }
            // toggle modal
            importModal.classList.add('show');
            // update import UI mapping mode if available
            if (this.management && typeof this.management.toggleImportNameModeUI === 'function') {
              this.management.toggleImportNameModeUI();
            }
          } catch (err) {
            console.warn('Error opening import modal, showing anyway', err);
            importModal.classList.add('show');
          }
        });
        if (importClose && importModal) importClose.addEventListener('click', () => importModal.classList.remove('show'));
      } catch (e) { /* ignore import modal wiring errors */ }
    } catch (err) { /* ignore wiring errors */ }
  }

  async loadTemplates() {
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
      this.renderTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      this.renderTemplates([]);
    }
  }

  renderTemplates(templates) {
    if (!this.templatesGrid) return;
    
    if (templates.length === 0) {
      this.templatesGrid.innerHTML = '<p class="no-data">Geen templates beschikbaar. Maak een nieuwe sessie en sla deze op als template.</p>';
      return;
    }

    this.templatesGrid.innerHTML = templates.map(template => `
      <div class="template-card">
        <h3>${this.escapeHtml(template.name)}</h3>
        <div class="template-actions">
          <button class="btn btn-primary use-template-btn" data-template-id="${template.id}">Gebruik Template</button>
          <button class="btn btn-danger delete-template-btn" data-template-id="${template.id}">Verwijder</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for the buttons
    this.templatesGrid.querySelectorAll('.use-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = e.target.getAttribute('data-template-id');
        this.useTemplate(templateId);
      });
    });

    this.templatesGrid.querySelectorAll('.delete-template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = e.target.getAttribute('data-template-id');
        this.deleteTemplate(templateId);
      });
    });
  }

  async loadSessions() {
    try {
      const response = await this.api.getSessions();
      const sessions = this.api.extractArray(response, 'sessions');
      this.renderSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.renderSessions([]);
    }
  }

  async loadActiveSessions() {
    try {
      const response = await this.api.getSessions();
      const sessions = this.api.extractArray(response, 'sessions');
      console.log('All sessions from API:', sessions);
      
      // Filter for ACTIVE sessions only (status must be 'active')
      const activeSessions = sessions.filter(s => {
        const isActive = s.status === 'active';
        console.log(`Session ${s.id} (${s.name}): status=${s.status}, is_active=${isActive}`);
        return isActive;
      });
      console.log('Filtered active sessions:', activeSessions);
      
      // Load activities, teams, and players for each active session
      for (let session of activeSessions) {
        try {
          const [activitiesResponse, teamsResponse, playersResponse] = await Promise.all([
            this.api.getSessionActivities(session.id),
            this.api.getSessionTeams(session.id),
            this.api.getPlayers()
          ]);
          session.activities = this.api.extractArray(activitiesResponse, 'activities');
          session.teams = this.api.extractArray(teamsResponse, 'teams');
          session.players = this.api.extractArray(playersResponse, 'players');
          console.log(`Session ${session.id}:`, { activities: session.activities, teams: session.teams, players: session.players });
        } catch (e) {
          console.warn(`Could not load data for session ${session.id}:`, e);
          session.activities = [];
          session.teams = [];
          session.players = [];
        }
      }
      
      this.activeSessions = activeSessions;
      this.renderActiveSessions(activeSessions);
    } catch (error) {
      console.error('Error loading active sessions:', error);
      this.activeSessions = [];
      this.renderActiveSessions([]);
    }
  }

  async loadHistorySessions() {
    try {
      const response = await this.api.getSessions();
      const sessions = this.api.extractArray(response, 'sessions');
      console.log('All sessions for history:', sessions);
      
      // Filter for CLOSED/HISTORY sessions (status must NOT be 'active')
      const historySessions = sessions.filter(s => {
        const isActive = s.status === 'active';
        const isHistory = !isActive;
        console.log(`History filter - Session ${s.id} (${s.name}): status=${s.status}, isHistory=${isHistory}`);
        return isHistory;
      });
      console.log('Filtered history sessions:', historySessions);
      
      // Load activities, teams, and players for each history session
      for (let session of historySessions) {
        try {
          const [activitiesResponse, teamsResponse, playersResponse] = await Promise.all([
            this.api.getSessionActivities(session.id),
            this.api.getSessionTeams(session.id),
            this.api.getPlayers()
          ]);
          session.activities = this.api.extractArray(activitiesResponse, 'activities');
          session.teams = this.api.extractArray(teamsResponse, 'teams');
          session.players = this.api.extractArray(playersResponse, 'players');
          console.log(`History session ${session.id}:`, { activities: session.activities, teams: session.teams, players: session.players });
        } catch (e) {
          console.warn(`Could not load data for history session ${session.id}:`, e);
          session.activities = [];
          session.teams = [];
          session.players = [];
        }
      }
      
      this.historySessions = historySessions;
      this.renderHistorySessions(historySessions);
    } catch (error) {
      console.error('Error loading history sessions:', error);
      this.historySessions = [];
      this.renderHistorySessions([]);
    }
  }

  renderSessions(sessions) {
    if (!this.sessionsList) return;
    
    if (sessions.length === 0) {
      this.sessionsList.innerHTML = '<p class="no-data">Geen actieve sessies.</p>';
      return;
    }

    this.sessionsList.innerHTML = sessions.map(session => `
      <div class="session-card">
        <h3>${this.escapeHtml(session.name)}</h3>
        <p class="session-date">${this.formatDate(session.created_at)}</p>
        <div class="session-stats">
          <span>Status: ${session.is_active ? '🟢 Actief' : '⚪ Inactief'}</span>
        </div>
        <div class="session-actions">
          <button class="btn btn-primary" onclick="window.homepage.openSession(${session.id})">Open</button>
          <button class="btn btn-danger" onclick="window.homepage.deleteSession(${session.id})">Verwijder</button>
        </div>
      </div>
    `).join('');
  }

  renderActiveSessions(sessions) {
    const container = document.getElementById('active-sessions-list');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = '<div class="active-empty-state"><p>📋 Geen actieve sessies op dit moment.</p><p>Start een nieuwe sessie via "Start" om aan de slag te gaan.</p></div>';
      return;
    }

    container.innerHTML = sessions.map(session => this.createActiveSessionCard(session)).join('');
  }

  renderHistorySessions(sessions) {
    const container = document.getElementById('history-sessions-list');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = '<div class="history-empty-state"><p>📚 Geen vorige sessies gevonden.</p></div>';
      return;
    }

    container.innerHTML = sessions.map(session => this.createHistorySessionCard(session)).join('');
    
    // Add event listeners to open modal
    const self = this;
    document.querySelectorAll('.history-session-card').forEach(card => {
      card.addEventListener('click', function(e) {
        const sessionId = this.dataset.sessionId;
        self.openHistoryModal(sessionId);
      });
    });
    
    // Setup modal close handlers
    this.setupModalHandlers();
  }

  createActiveSessionCard(session) {
    return `
      <div class="active-session-card">
        <div class="session-header">
          <div>
            <h3 class="session-title">${this.escapeHtml(session.name)}</h3>
            <p style="margin: 5px 0; color: var(--text-secondary);">${this.formatDate(session.created_at)}</p>
          </div>
          <span class="session-status">🟢 Actief</span>
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
          <label for="session-activity-select-${session.id}">Selecteer activiteit om scores te bekijken:</label>
          <select id="session-activity-select-${session.id}" onchange="window.homepage.displayActivityScores(${session.id}, this.value)">
            <option value="">-- Kies een activiteit --</option>
            ${(session.activities || []).map(a => `<option value="${a.id}">${this.escapeHtml(a.name)}</option>`).join('')}
          </select>
        </div>

        <div id="scores-${session.id}" class="scores-display" style="display: none;"></div>

        <div class="session-controls">
          <button class="btn btn-primary" onclick="window.homepage.openSession(${session.id})">📖 Open Sessie</button>
          <button class="btn btn-orange" onclick="window.homepage.endSession(${session.id})">⏹️ Beëindig Sessie</button>
        </div>
      </div>
    `;
  }

  createHistorySessionCard(session) {
    const activities = session.activities || [];
    const activityNames = activities.map(a => a.name).join(', ');
    const sportTypes = [...new Set(activities.map(a => a.sport_type))].join(', ');
    return `
      <div class="history-session-card" data-session-id="${session.id}">
        <div class="history-session-header">
          <div>
            <div class="history-session-name">${this.escapeHtml(session.name)}</div>
            <div class="history-session-date">${this.formatDate(session.created_at)}</div>
            <div class="history-session-sport">📊 ${this.escapeHtml(sportTypes || 'Algemeen')} • ${activityNames}</div>
          </div>
          <div class="history-session-controls" style="margin-left:auto; display:flex; gap:6px; align-items:center;">
            <button class="btn btn-sm" onclick="window.homepage.openHistoryModal(${session.id})">Bekijk</button>
          </div>
        </div>
      </div>
    `;
  }

  setupModalHandlers() {
    const modal = document.getElementById('history-modal');
    const closeBtn = document.querySelector('.modal-close');
    
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (modal) modal.classList.remove('show');
      };
    }
    
    if (modal) {
      window.onclick = (event) => {
        if (event.target === modal) {
          modal.classList.remove('show');
        }
      };
    }
  }

  // Deprecated wrapper kept for compatibility: exportAllSessionsCsv -> exportAllSessions (XLSX only)
  async exportAllSessionsCsv(/* unused */) {
    // Forward to XLSX export
    return this.export.exportAllSessions('xlsx', null, null);
  }

  // ---------------------- Export helpers ----------------------

  openHistoryModal(sessionId) {
    const session = this.historySessions.find(s => s.id == sessionId);
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

    // Create modal content using similar structure to active session
    modalBody.innerHTML = `
      <div class="active-session-card" style="border: none; box-shadow: none; padding: 0;">
        <div class="session-header">
          <div>
            <h3 class="session-title">${this.escapeHtml(session.name)}</h3>
            <p style="margin: 5px 0; color: var(--text-secondary);">${this.formatDate(session.created_at)}</p>
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
            ${(session.activities || []).map(a => `<option value="${a.id}">${this.escapeHtml(a.name)}</option>`).join('')}
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
          <button class="btn btn-secondary" onclick="document.getElementById('history-modal').classList.remove('show')">✕ Sluiten</button>
        </div>
      </div>
    `;

    modal.classList.add('show');

    // Limit modal height to avoid overlapping nav
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.maxHeight = '70vh';
    }
  }

  async displayModalActivityScores(sessionId, activityId) {
    if (!activityId) {
      const container = document.getElementById(`modal-scores-${sessionId}`);
      if (container) container.style.display = 'none';
      return;
    }

    // Reuse the existing display logic but with modal container
    const session = this.historySessions.find(s => s.id == sessionId);
    if (!session) return;

    const activity = (session.activities || []).find(a => a.id == activityId);
    if (!activity) return;

    const scoringMode = activity.scoring_mode || 'team';
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);
    const isTimeMode = !!(activity && String(activity.game_type) === 'team_vs_time');
    const teams = session.teams || [];
    const players = session.players || [];

    const scoresResponse = await this.api.getActivityScores(activityId);
    const activityScores = this.api.extractArray(scoresResponse, 'scores');

    const teamMap = {};
    const playerMap = {};
    teams.forEach(t => { teamMap[t.id] = t; });
    players.forEach(p => { playerMap[p.id] = p; });

    let aggregatedScores = {};

    if (scoringMode === 'player') {
      activityScores.forEach(score => {
        const playerId = score.player_id;
        const player = playerMap[playerId];
        const playerName = player?.name || `Speler ${playerId}`;
        if (!aggregatedScores[playerId]) {
          aggregatedScores[playerId] = { 
            id: playerId, 
            name: playerName,
            color: player?.color,
            icon: player?.icon,
            score: 0,
            type: 'player'
          };
        }
        aggregatedScores[playerId].score += (score.points || 0);
      });
    } else if (scoringMode === 'team_with_players') {
      activityScores.forEach(score => {
        const teamId = score.team_id;
        const team = teamMap[teamId];
        const teamName = team?.name || `Team ${teamId}`;
        if (!aggregatedScores[teamId]) {
          aggregatedScores[teamId] = { 
            id: teamId, 
            name: teamName,
            color: team?.color,
            icon: team?.icon,
            score: isTimeMode && lowerIsBetter ? Infinity : (lowerIsBetter ? Infinity : -Infinity),
            players: {},
            type: 'team'
          };
        }
        
        const currentScore = score.points || 0;
        if (isTimeMode && lowerIsBetter) {
          aggregatedScores[teamId].score = Math.min(aggregatedScores[teamId].score, currentScore);
        } else if (!lowerIsBetter) {
          aggregatedScores[teamId].score = Math.max(aggregatedScores[teamId].score, currentScore);
        } else {
          aggregatedScores[teamId].score = Math.min(aggregatedScores[teamId].score, currentScore);
        }

        if (score.player_id && score.points) {
          const playerId = score.player_id;
          const player = playerMap[playerId];
          const playerName = player?.name || `Speler ${playerId}`;
          if (!aggregatedScores[teamId].players[playerId]) {
            aggregatedScores[teamId].players[playerId] = { name: playerName, score: isTimeMode && lowerIsBetter ? Infinity : (lowerIsBetter ? Infinity : -Infinity) };
          }

          if (isTimeMode && lowerIsBetter) {
            aggregatedScores[teamId].players[playerId].score = Math.min(aggregatedScores[teamId].players[playerId].score, currentScore);
          } else if (!lowerIsBetter) {
            aggregatedScores[teamId].players[playerId].score = Math.max(aggregatedScores[teamId].players[playerId].score, currentScore);
          } else {
            aggregatedScores[teamId].players[playerId].score = Math.min(aggregatedScores[teamId].players[playerId].score, currentScore);
          }
        }
      });
      
      // Handle edge case: if team score is still Infinity/-Infinity, set to 0
      Object.values(aggregatedScores).forEach(team => {
        if (team.score === Infinity || team.score === -Infinity) {
          team.score = 0;
        }
        // Also fix player scores
        Object.values(team.players || {}).forEach(player => {
          if (player.score === Infinity || player.score === -Infinity) {
            player.score = 0;
          }
        });
      });
    } else {
      activityScores.forEach(score => {
        const teamId = score.team_id;
        const team = teamMap[teamId];
        const teamName = team?.name || `Team ${teamId}`;
        if (!aggregatedScores[teamId]) {
          aggregatedScores[teamId] = { 
            id: teamId, 
            name: teamName,
            color: team?.color,
            icon: team?.icon,
            score: 0,
            type: 'team'
          };
        }
        aggregatedScores[teamId].score += (score.points || 0);
      });
    }

    const container = document.getElementById(`modal-scores-${sessionId}`);
    if (!container) return;

    // Determine ordering and time-based formatting rules (computed earlier)
    

    let scoresList = Object.values(aggregatedScores);
    scoresList.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

    if (scoresList.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen scores beschikbaar voor deze activiteit.</p>';
    } else {
      let html = '';

      if (scoringMode === 'team_with_players') {
        html = scoresList.map((team, index) => {
          const iconEmoji = this.getIconEmoji(team.icon);
          const colorStyle = team.color ? `background-color: ${team.color}22; border-left: 4px solid ${team.color};` : '';
          const playersList = Object.values(team.players || {});
          playersList.sort((x, y) => lowerIsBetter ? (x.score - y.score) : (y.score - x.score));
          return `
            <div class="score-card" style="background: var(--background-color); padding: 16px; border-radius: 8px; margin-bottom: 16px; ${colorStyle}">
              <div style="font-weight: 600; color: var(--text-color); margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.3em; color: var(--primary-color);">${index + 1}.</span> 
                <span style="font-size: 1.3em;">${iconEmoji}</span>
                <span style="font-size: 1.15em;">${this.escapeHtml(team.name)}</span>
              </div>
              <div style="font-size: 1.5em; font-weight: 700; color: var(--primary-color); margin-bottom: 16px;">
              ${isTimeMode ? SharedUtils.formatMs(team.score) : (team.score + ' punten')}
              ${isTimeMode ? '<small style="font-size: 0.7em; color: var(--text-secondary);"> (beste tijd)</small>' : ''}
              </div>
              ${playersList.length > 0 ? `
                <div style="padding-top: 12px; border-top: 2px solid var(--border-color); margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-color); font-size: 1.05em;">Spelers:</div>
                  ${playersList.map(p => `
                    <div style="padding: 12px 14px; background: var(--card-bg, #fff); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <span style="font-size: 1.05em; font-weight: 500; color: var(--text-color);">${this.escapeHtml(p.name)}</span>
                      <span style="font-weight: 700; color: var(--primary-color); font-size: 1.15em;">${isTimeMode ? SharedUtils.formatMs(p.score) : p.score}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      } else {
        html = scoresList.map((item, index) => {
          const iconEmoji = this.getIconEmoji(item.icon);
          const colorStyle = item.color ? `background-color: ${item.color}22; border-left: 4px solid ${item.color};` : '';
          return `
            <div class="score-item" style="background: var(--background-color); padding: 12px; border-radius: 6px; margin-bottom: 10px; ${colorStyle}">
              <div style="font-weight: 600; color: var(--text-color); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1em; color: var(--primary-color);">${index + 1}.</span> 
                <span>${iconEmoji}</span>
                <span>${this.escapeHtml(item.name)}</span>
              </div>
              <div style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">${isTimeMode ? SharedUtils.formatMs(item.score) : (item.score + ' punten')}</div>
            </div>
          `;
        }).join('');
      }

      container.innerHTML = html;
    }

    container.style.display = 'block';
  }

  useTemplate(templateId) {
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
      const template = templates.find(t => String(t.id) === String(templateId));
      if (template && template.template_data) {
        sessionStorage.setItem('templateData', JSON.stringify(template.template_data));
        window.location.href = 'simple-setup.html';
      } else {
        console.error('Template not found or invalid:', templateId);
        alert('Template niet gevonden.');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Fout bij laden template.');
    }
  }

  deleteTemplate(templateId) {
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return;
    
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
      // Ensure type-insensitive comparison (ids may be number or string)
      const filtered = templates.filter(t => String(t.id) !== String(templateId));
      localStorage.setItem('sportScoreTemplates', JSON.stringify(filtered));
      this.loadTemplates();
      this.showSuccessMessage('Template verwijderd!');
    } catch (error) {
      console.error('Error deleting template:', error);
      this.showErrorMessage('Fout bij verwijderen template');
    }
  }

  async openSession(sessionId) {
    window.location.href = `simple-scoreinput.html?session=${sessionId}`;
  }

  async deleteSession(sessionId) {
    if (!confirm('Weet je zeker dat je deze sessie wilt verwijderen?')) return;
    
    try {
      await this.api.deleteSession(sessionId);
      this.showSuccessMessage('Sessie verwijderd!');
      await this.loadActiveSessions();
      await this.loadHistorySessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      this.showErrorMessage('Fout bij verwijderen sessie');
    }
  }

  async endSession(sessionId) {
    if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen? Deze actie kan niet ongedaan gemaakt worden.')) return;
    
    try {
      await this.api.updateSession(sessionId, { status: 'completed' });
      this.showSuccessMessage('Sessie beëindigd!');
      await this.loadActiveSessions();
      await this.loadHistorySessions();
    } catch (error) {
      console.error('Error ending session:', error);
      this.showErrorMessage('Fout bij beëindigen sessie');
    }
  }

  async displayActivityScores(sessionId, activityId, isHistory = false) {
    if (!activityId) {
      const containerId = isHistory ? `history-scores-${sessionId}` : `scores-${sessionId}`;
      const container = document.getElementById(containerId);
      if (container) container.style.display = 'none';
      return;
    }

    try {
      // Get the session data from stored sessions
      const sessionList = isHistory ? this.historySessions : this.activeSessions;
      const session = sessionList.find(s => s.id == sessionId);
      
      if (!session) {
        console.error(`Session ${sessionId} not found`);
        return;
      }

      // Get the activity to check its scoring mode
      const activity = (session.activities || []).find(a => a.id == activityId);
      if (!activity) {
        console.error(`Activity ${activityId} not found in session ${sessionId}`);
        return;
      }
      
      const scoringMode = activity.scoring_mode || 'team';
      const lowerIsBetter = SharedUtils.isLowerBetter(activity);
      const isTimeMode = !!(activity && String(activity.game_type) === 'team_vs_time');
      console.log(`Loading scores for activity ${activityId}, mode: ${scoringMode}, timeMode: ${isTimeMode}`);
      
      // Use teams and players from session (already loaded)
      const teams = session.teams || [];
      const players = session.players || [];
      
      // Load activity scores
      const scoresResponse = await this.api.getActivityScores(activityId);
      const activityScores = this.api.extractArray(scoresResponse, 'scores');
      
      console.log(`Loaded scores:`, activityScores, `teams:`, teams, `players:`, players);
      
      // Create lookup maps for efficient enrichment
      const teamMap = {};
      const playerMap = {};
      teams.forEach(t => { teamMap[t.id] = t; });
      players.forEach(p => { playerMap[p.id] = p; });
      
      // Aggregate scores based on scoring mode
      let aggregatedScores = {};
      
      if (scoringMode === 'player') {
        // Group by player_id
        activityScores.forEach(score => {
          const playerId = score.player_id;
          const player = playerMap[playerId];
          const playerName = player?.name || `Speler ${playerId}`;
          if (!aggregatedScores[playerId]) {
            aggregatedScores[playerId] = { 
              id: playerId, 
              name: playerName,
              color: player?.color,
              icon: player?.icon,
              score: 0,
              type: 'player'
            };
          }
          aggregatedScores[playerId].score += (score.points || 0);
        });
      } else if (scoringMode === 'team_with_players') {
        // Group by team_id with player info
        activityScores.forEach(score => {
          const teamId = score.team_id;
          const team = teamMap[teamId];
          const teamName = team?.name || `Team ${teamId}`;
          if (!aggregatedScores[teamId]) {
            aggregatedScores[teamId] = { 
              id: teamId, 
              name: teamName,
              color: team?.color,
              icon: team?.icon,
              score: isTimeMode && lowerIsBetter ? Infinity : (lowerIsBetter ? Infinity : -Infinity),
              players: {},
              type: 'team'
            };
          }
          
          // For team vs time with lower-is-better (time), track the BEST (lowest) time among players
          // For regular scoring with higher-is-better, track the BEST (highest) score among players
          const currentScore = score.points || 0;
          
          if (isTimeMode && lowerIsBetter) {
            // Time mode: lower time is better - track minimum time
            aggregatedScores[teamId].score = Math.min(aggregatedScores[teamId].score, currentScore);
          } else if (!lowerIsBetter) {
            // Regular scoring: higher score is better - track maximum score
            aggregatedScores[teamId].score = Math.max(aggregatedScores[teamId].score, currentScore);
          } else {
            // Lower is better but not time mode (e.g., golf) - track minimum score
            aggregatedScores[teamId].score = Math.min(aggregatedScores[teamId].score, currentScore);
          }
          
          // Also track individual player scores
          if (score.player_id && score.points) {
            const playerId = score.player_id;
            const player = playerMap[playerId];
            const playerName = player?.name || `Speler ${playerId}`;
            if (!aggregatedScores[teamId].players[playerId]) {
              aggregatedScores[teamId].players[playerId] = { 
                name: playerName, 
                score: isTimeMode && lowerIsBetter ? Infinity : (lowerIsBetter ? Infinity : -Infinity) 
              };
            }
            
            // Update player's best score using same logic as team
            if (isTimeMode && lowerIsBetter) {
              aggregatedScores[teamId].players[playerId].score = Math.min(
                aggregatedScores[teamId].players[playerId].score, 
                currentScore
              );
            } else if (!lowerIsBetter) {
              aggregatedScores[teamId].players[playerId].score = Math.max(
                aggregatedScores[teamId].players[playerId].score, 
                currentScore
              );
            } else {
              aggregatedScores[teamId].players[playerId].score = Math.min(
                aggregatedScores[teamId].players[playerId].score, 
                currentScore
              );
            }
          }
        });
        
        // Handle edge case: if team score is still Infinity/-Infinity, set to 0
        Object.values(aggregatedScores).forEach(team => {
          if (team.score === Infinity || team.score === -Infinity) {
            team.score = 0;
          }
          // Also fix player scores
          Object.values(team.players || {}).forEach(player => {
            if (player.score === Infinity || player.score === -Infinity) {
              player.score = 0;
            }
          });
        });
      } else {
        // Default to team mode - group by team_id
        activityScores.forEach(score => {
          const teamId = score.team_id;
          const team = teamMap[teamId];
          const teamName = team?.name || `Team ${teamId}`;
          if (!aggregatedScores[teamId]) {
            aggregatedScores[teamId] = { 
              id: teamId, 
              name: teamName,
              color: team?.color,
              icon: team?.icon,
              score: 0,
              type: 'team'
            };
          }
          aggregatedScores[teamId].score += (score.points || 0);
        });
      }
      
      const containerId = isHistory ? `history-scores-${sessionId}` : `scores-${sessionId}`;
      const container = document.getElementById(containerId);
      
      if (!container) return;

      // Convert to array and sort by score (respect time/golf ordering)
      let scoresList = Object.values(aggregatedScores);
      scoresList.sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));

      if (scoresList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Geen scores beschikbaar voor deze activiteit.</p>';
      } else {
        let html = '';
        
        if (scoringMode === 'team_with_players') {
          // Show teams with their player breakdown
          html = scoresList.map((team, index) => {
            const iconEmoji = this.getIconEmoji(team.icon);
            const colorStyle = team.color ? `background-color: ${team.color}22; border-left: 4px solid ${team.color};` : '';
            const playersList = Object.values(team.players || {});
              return `
                <div class="score-card" style="background: var(--background-color); padding: 16px; border-radius: 8px; margin-bottom: 16px; ${colorStyle}">
                <div style="font-weight: 600; color: var(--text-color); margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.3em; color: var(--primary-color);">${index + 1}.</span> 
                  <span style="font-size: 1.3em;">${iconEmoji}</span>
                  <span style="font-size: 1.15em;">${this.escapeHtml(team.name)}</span>
                </div>
                <div style="font-size: 1.5em; font-weight: 700; color: var(--primary-color); margin-bottom: 16px;">
                ${isTimeMode ? SharedUtils.formatMs(team.score) : (team.score + ' punten')}
                ${isTimeMode ? '<small style="font-size: 0.7em; color: var(--text-secondary);"> (beste tijd)</small>' : ''}
                </div>
                ${playersList.length > 0 ? `
                  <div style="padding-top: 12px; border-top: 2px solid var(--border-color); margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-color); font-size: 1.05em;">Spelers:</div>
                    ${playersList.map(player => `
                      <div class="label-left-control-right player-card" style="padding: 12px 14px; background: var(--card-bg, #fff); border-radius: 6px rgba(0,0,0,0.1);">
                        <span style="font-size: 1.05em; font-weight: 500; color: var(--text-color);">${this.escapeHtml(player.name)}</span>
                        <span style="font-weight: 700; color: var(--primary-color); font-size: 1.15em;">${isTimeMode ? SharedUtils.formatMs(player.score) : (player.score + ' punten')}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('');
        } else if (scoringMode === 'player') {
          // Show players with proper styling
          html = scoresList.map((player, index) => {
            const iconEmoji = this.getIconEmoji(player.icon);
            const colorStyle = player.color ? `background-color: ${player.color}22; border-left: 4px solid ${player.color};` : '';
            return `
              <div class="score-item" style="background: var(--background-color); padding: 12px; border-radius: 6px; margin-bottom: 10px; ${colorStyle}">
                <div class="label-left-control-right" style="align-items: center;">
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <span style="font-weight: 700; color: var(--primary-color);">${index + 1}.</span>
                    <span>${iconEmoji}</span>
                    <span style="font-weight: 600; color: var(--text-color);">${this.escapeHtml(player.name)}</span>
                  </div>
                  <span style="font-size: 1.2em; font-weight: 700; color: var(--primary-color);">${isTimeMode ? SharedUtils.formatMs(player.score) : (player.score + ' punten')}</span>
                </div>
              </div>
            `;
          }).join('');
        } else {
          // Team mode - use same styling as team_with_players but without players section
          html = scoresList.map((team, index) => {
            const iconEmoji = this.getIconEmoji(team.icon);
            const colorStyle = team.color ? `background-color: ${team.color}22; border-left: 4px solid ${team.color};` : '';
            return `
              <div class="score-item" style="background: var(--background-color); padding: 12px; border-radius: 6px; margin-bottom: 10px; ${colorStyle}">
                <div style="font-weight: 600; color: var(--text-color); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.1em; color: var(--primary-color);">${index + 1}.</span> 
                  <span>${iconEmoji}</span>
                  <span>${this.escapeHtml(team.name)}</span>
                </div>
                <div style="font-size: 1.3em; font-weight: 700; color: var(--primary-color);">${team.score} punten</div>
              </div>
            `;
          }).join('');
        }
        
        container.innerHTML = html;
      }

      container.style.display = 'block';
    } catch (error) {
      console.error('Error loading activity scores:', error);
      const containerId = isHistory ? `history-scores-${sessionId}` : `scores-${sessionId}`;
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">Fout bij laden van scores.</p>';
        container.style.display = 'block';
      }
    }
  }

  async loadSessionScores(sessionId) {
    // This method can be expanded to preload scores when history card is expanded
    // For now, scores are loaded on-demand when activity is selected
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccessMessage(message) {
    // Create a temporary success message element
    const msgEl = document.createElement('div');
    msgEl.className = 'success-message';
    msgEl.textContent = message;
    msgEl.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10000;';
    document.body.appendChild(msgEl);
    setTimeout(() => msgEl.remove(), 3000);
  }

  showErrorMessage(message) {
    // Create a temporary error message element
    const msgEl = document.createElement('div');
    msgEl.className = 'error-message';
    msgEl.textContent = message;
    msgEl.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10000;';
    document.body.appendChild(msgEl);
    setTimeout(() => msgEl.remove(), 3000);
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (!section) return;
        this.showSection(section);
        if (section === 'beheer' && this.management && typeof this.management.loadBeheerData === 'function') {
          this.management.loadBeheerData().catch((e) => console.error('Error loading beheer data:', e));
        }
      });
    });
  }

  setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        if (!tabName) return;
        
        // Remove active class from all buttons and panes
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        btn.classList.add('active');
        const pane = document.getElementById(`${tabName}-tab`);
        if (pane) pane.classList.add('active');

        // Load highscores when highscores tab is clicked
        if (tabName === 'highscores') {
          this.loadActivitiesForHighscores();
        }
      });
    });
  }

  async loadActivitiesForHighscores() {
    try {
      // Include both active and history sessions so ongoing games count
      const allSessions = (this.activeSessions || []).concat(this.historySessions || []);
      
      // Map activity names to their best scoring instance (min or max depending on rules)
      const activityMap = new Map(); // name -> tracker
      
      for (const session of allSessions) {
        const activities = session.activities || [];
        
        for (const activity of activities) {
          const key = activity.name;
          let current = activityMap.get(key);
          
          if (!current) {
            const lowerIsBetter = SharedUtils.isLowerBetter(activity);
            current = { 
              activity: { ...activity, session_id: session.id },
              bestMin: Infinity,
              bestMax: -Infinity,
              anyLowerIsBetter: !!lowerIsBetter
            };
            activityMap.set(key, current);
          }
          
          // Get leaderboard for this activity instance
          try {
            const lbResponse = await this.api.getActivityLeaderboard(activity.id);
            const lb = lbResponse.leaderboard || [];

            const instLowerIsBetter = SharedUtils.isLowerBetter(activity);
            let bestInThisInstance = instLowerIsBetter ? Infinity : -Infinity;

            if (lb.length > 0) {
              // If this activity is player-scored, prefer player entries; ignore team-only leaderboards
              if (String(activity.scoring_mode) === 'player') {
                const playerEntries = lb.filter(e => e.player_id || e.player_name);
                if (playerEntries.length > 0) {
                  const scores = playerEntries.map(t => {
                    const raw = t.total_score ?? t.score ?? t.points;
                    return raw !== undefined && raw !== null ? Number(raw) : (instLowerIsBetter ? Infinity : -Infinity);
                  });
                  bestInThisInstance = instLowerIsBetter ? Math.min(...scores) : Math.max(...scores);
                } else {
                  // Leaderboard contains team-level entries only; fall back to detailed per-player scores
                  try {
                    const scoresResp = await this.api.getActivityScores(activity.id);
                    const scoresArr = this.api.extractArray(scoresResp, 'scores') || [];
                    const totals = {};
                    scoresArr.forEach(s => {
                      if (!s.player_id && !s.player_name) return; // skip team-only rows
                      const pid = s.player_id ?? s.player_name;
                      const keyId = String(pid);
                      const val = s.points ?? s.score ?? s.total_score;
                      const n = val !== undefined && val !== null ? Number(val) : 0;
                      totals[keyId] = (totals[keyId] || 0) + n;
                    });
                    if (Object.keys(totals).length > 0) {
                      const vals = Object.values(totals);
                      bestInThisInstance = instLowerIsBetter ? Math.min(...vals) : Math.max(...vals);
                    }
                  } catch (e) {
                    console.warn(`Fallback: could not fetch detailed scores for activity ${activity.id}:`, e);
                  }
                }
              } else {
                // Non-player mode: use whatever the leaderboard provides (teams or players aggregated)
                const scores = lb.map(t => {
                  const raw = t.total_score ?? t.score ?? t.points;
                  return raw !== undefined && raw !== null ? Number(raw) : (instLowerIsBetter ? Infinity : -Infinity);
                });
                bestInThisInstance = instLowerIsBetter ? Math.min(...scores) : Math.max(...scores);
              }
            } else {
              // Fallback: try detailed scores and aggregate per player/team within this instance
              try {
                const scoresResp = await this.api.getActivityScores(activity.id);
                const scoresArr = this.api.extractArray(scoresResp, 'scores') || [];
                const totals = {};
                const isPlayerMode = String(activity.scoring_mode) === 'player';
                scoresArr.forEach(s => {
                  let pid = null;
                  if (isPlayerMode) {
                    pid = s.player_id ?? s.player_name ?? null;
                  } else {
                    pid = s.player_id ?? s.player_name ?? s.team_id ?? s.team_name ?? null;
                  }
                  if (pid === null || pid === undefined) return;
                  const keyId = String(pid);
                  const val = s.points ?? s.score ?? s.total_score;
                  const n = val !== undefined && val !== null ? Number(val) : 0;
                  totals[keyId] = (totals[keyId] || 0) + n;
                });
                if (Object.keys(totals).length > 0) {
                  const vals = Object.values(totals);
                  bestInThisInstance = instLowerIsBetter ? Math.min(...vals) : Math.max(...vals);
                }
              } catch (e) {
                console.warn(`Fallback: could not fetch detailed scores for activity ${activity.id}:`, e);
              }
            }

            if (bestInThisInstance !== (instLowerIsBetter ? Infinity : -Infinity)) {
              current.anyLowerIsBetter = current.anyLowerIsBetter || instLowerIsBetter;
              if (instLowerIsBetter) current.bestMin = Math.min(current.bestMin, bestInThisInstance);
              current.bestMax = Math.max(current.bestMax, bestInThisInstance);
              current.activity = { ...activity, session_id: session.id }; // Ensure session_id is included
            }
          } catch (e) {
            console.warn(`Error fetching leaderboard for activity ${activity.id}:`, e);
          }
        }
      }
      
      // Convert to array for rendering
      const activitiesWithScores = Array.from(activityMap.values()).map(({activity, bestMin, bestMax, anyLowerIsBetter}) => {
        const chosen = anyLowerIsBetter ? bestMin : bestMax;
        const invalid = anyLowerIsBetter ? (chosen === Infinity) : (chosen === -Infinity);
        return {
          ...activity,
          highest_score: invalid ? null : chosen,
          lower_is_better: anyLowerIsBetter
        };
      });
      
      // Store for client-side filtering & wire controls
      this.highscoresActivities = activitiesWithScores;
      this.setupHighscoresControls();
      this.filterAndRenderHighscores();
    } catch (error) {
      console.error('Error loading highscores:', error);
      const grid = document.getElementById('highscores-grid');
      if (grid) grid.innerHTML = '<div class="empty-state">Fout bij het laden van activiteiten.</div>';
    }
  }

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
        <h3>${this.escapeHtml(activity.name)}</h3>
        <div class="highscores-meta">
          <span>${this.escapeHtml(activity.sport_type)}</span>
          <span>${this.escapeHtml(activity.game_type || 'custom')}</span>
        </div>
        <p>${activity.description ? this.escapeHtml(activity.description) : ''}</p>
        <div class="highscores-stats">
          <span>Beste score: ${scoreText}</span>
        </div>
      </div>`;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.highscores-card').forEach(card => {
      card.addEventListener('click', () => {
        const activityId = card.dataset.activityId;
        this.showHighscoreDetails(activityId);
      });
    });
  }

  // Wire the highscores filter/search controls within the active highscores pane and attach handlers
  setupHighscoresControls() {
    // Prefer controls inside the tab pane, fall back to embedded section
    const controlsContainer = document.querySelector('#highscores-tab .highscores-controls') || document.querySelector('#highscores-section .highscores-controls');
    if (!controlsContainer) return;

    const filterEl = controlsContainer.querySelector('#filter-sport');
    const searchEl = controlsContainer.querySelector('#search-activity');

    // Remove existing listeners to avoid duplicates
    if (!this._highscoresHandler) this._highscoresHandler = () => this.filterAndRenderHighscores();
    if (filterEl) {
      filterEl.removeEventListener('change', this._highscoresHandler);
      filterEl.addEventListener('change', this._highscoresHandler);
    }
    if (searchEl) {
      searchEl.removeEventListener('input', this._highscoresHandler);
      searchEl.addEventListener('input', this._highscoresHandler);
    }
  }

  // Apply active filters and render highscores
  filterAndRenderHighscores() {
    let activities = (this.highscoresActivities || []).slice();
    const controlsContainer = document.querySelector('#highscores-tab .highscores-controls') || document.querySelector('#highscores-section .highscores-controls');
    if (!controlsContainer) {
      this.renderHighscores(activities);
      return;
    }

    const filterEl = controlsContainer.querySelector('#filter-sport');
    const searchEl = controlsContainer.querySelector('#search-activity');

    const sport = filterEl ? (filterEl.value || '').trim().toLowerCase() : '';
    const search = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (sport) {
      activities = activities.filter(a => ((a.sport_type || '') + '').toLowerCase() === sport);
    }
    if (search) {
      activities = activities.filter(a => ((a.name || '') + '').toLowerCase().includes(search));
    }

    this.renderHighscores(activities);
  }

  async showHighscoreDetails(activityId) {
    try {
      // Get all sessions that include this activity, using cached data like history
      const allSessions = (this.activeSessions || []).concat(this.historySessions || []);
      const relevantSessions = allSessions.filter(session => (session.activities || []).some(a => String(a.id) === String(activityId)));

      if (relevantSessions.length === 0) {
        this.showErrorMessage('Geen sessies gevonden voor deze activiteit.');
        return;
      }

      // Collect all teams and players from all sessions to ensure we have all
      const teamMap = new Map();
      const playerMap = new Map();
      allSessions.forEach(session => {
        (session.teams || []).forEach(team => {
          const key = String(team.id);
          if (!teamMap.has(key)) teamMap.set(key, team);
        });
        (session.players || []).forEach(player => {
          const key = String(player.id);
          if (!playerMap.has(key)) playerMap.set(key, player);
        });
      });
      const allTeams = Array.from(teamMap.values());
      const allPlayers = Array.from(playerMap.values());
      const combinedSession = { teams: allTeams, players: allPlayers };
      // helper getters to avoid mismatched string/number keys
      const getPlayer = (id) => playerMap.get(String(id)) || playerMap.get(Number(id));
      const getTeam = (id) => teamMap.get(String(id)) || teamMap.get(Number(id));

      // Get activity details (safe)
      let activity;
      try {
        const activityResponse = await this.api.getActivity(activityId);
        activity = activityResponse.activity || activityResponse;
      } catch (err) {
        console.warn('Could not fetch activity details for', activityId, err);
        activity = { id: activityId, name: `Activiteit ${activityId}`, scoring_mode: 'team' };
      }

      // Determine ordering and formatting rules
      // Use instance activity properties as a fallback when the fetched activity lacks game_type/time_winner
      const instances = [];
      allSessions.forEach(sess => {
        (sess.activities || []).forEach(a => {
          if (String(a.name) === String(activity.name)) instances.push({ activity: a, sessionId: sess.id });
        });
      });

      // If no instances found, we will still fall back to the fetched activity
      if (instances.length === 0) {
        instances.push({ activity, sessionId: activity.session_id || null });
      }

      // Build an effective activity object combining fetched activity with the first instance as a hint
      const effectiveActivity = Object.assign({}, activity, instances[0] && instances[0].activity ? {
        game_type: activity.game_type || instances[0].activity.game_type,
        time_winner: activity.time_winner || instances[0].activity.time_winner,
      } : {});

      const lowerIsBetter = SharedUtils.isLowerBetter(effectiveActivity);
      const isTimeMode = !!(effectiveActivity && String(effectiveActivity.game_type) === 'team_vs_time');

      // Aggregate scores across ALL instances of this activity name (so highscores show every team's best)
      const activityName = activity.name;
      // `instances` was built above (and guaranteed to contain at least one entry), reuse it here.

      const scoringMode = activity.scoring_mode || 'team';
      let leaderboard = [];

      if (scoringMode === 'team') {
        // For team-only mode, prefer per-instance leaderboards (team totals). If leaderboard lists players, derive team totals by summing those players per team.
        const teamScoresMap = {};

        for (const inst of instances) {
          try {
            const lbResp = await this.api.getActivityLeaderboard(inst.activity.id);
            const lb = lbResp.leaderboard || [];
            console.debug(`Instance ${inst.activity.id} leaderboard:`, lb.slice(0,10));

            // Determine whether this instance uses lower-is-better (may differ by instance)
            const instLowerIsBetter = SharedUtils.isLowerBetter(inst.activity);

            // Detect whether leaderboard contains team totals (entries with team_id or team_name)
            const hasTeamEntries = lb.some(entry => entry.team_id || entry.team_name);

            if (hasTeamEntries) {
              // Use team entries directly
              lb.forEach(entry => {
                const score = Number(entry.total_score || entry.score || 0);
                // determine key
                let tidKey;
                if (entry.team_id !== undefined && entry.team_id !== null) tidKey = String(entry.team_id);
                else if (entry.id !== undefined && entry.id !== null) tidKey = String(entry.id);
                else if (entry.team_name) tidKey = `name:${entry.team_name}`;
                else return;

                const teamObj = (entry.team_id !== undefined && entry.team_id !== null) ? getTeam(entry.team_id) : null;
                const tname = teamObj?.name || entry.team_name || `Team ${tidKey}`;
                if (!teamScoresMap[tidKey]) teamScoresMap[tidKey] = { team_name: tname, total_score: (instLowerIsBetter ? Infinity : 0) };
                teamScoresMap[tidKey].total_score = instLowerIsBetter ? Math.min(teamScoresMap[tidKey].total_score, score) : Math.max(teamScoresMap[tidKey].total_score, score);
              });
            } else {
              // Leaderboard lists players; try to aggregate per-team using player->team mapping first
              const teamAccum = {};
              lb.forEach(entry => {
                const pid = entry.player_id || entry.id || entry.player_name;
                const pts = Number(entry.total_score || entry.points || entry.score || 0);
                const player = getPlayer(pid);
                const teamId = player ? player.team_id : null;
                if (!teamId) return;
                const key = String(teamId);
                if (!teamAccum[key]) teamAccum[key] = 0;
                teamAccum[key] += pts;
              });

              // If teamAccum is empty, fallback to detailed scores
              if (Object.keys(teamAccum).length === 0) {
                try {
                  const scoresResp = await this.api.getActivityScores(inst.activity.id);
                  const scores = this.api.extractArray(scoresResp, 'scores');
                  scores.forEach(s => {
                    const teamId = s.team_id || (s.player_id ? (getPlayer(s.player_id)?.team_id) : null);
                    if (!teamId) return;
                    const key = String(teamId);
                    const pts = Number(s.points || s.score || 0);
                    if (!teamAccum[key]) teamAccum[key] = 0;
                    teamAccum[key] += pts;
                  });
                } catch (e) {
                  console.warn(`Fallback: could not fetch detailed scores for instance ${inst.activity.id}:`, e);
                }
              }

              Object.keys(teamAccum).forEach(key => {
                const score = teamAccum[key];
                const teamObj = getTeam(key);
                const tname = teamObj?.name || `Team ${key}`;
                if (!teamScoresMap[key]) teamScoresMap[key] = { team_name: tname, total_score: (lowerIsBetter ? Infinity : 0) };
                teamScoresMap[key].total_score = lowerIsBetter ? Math.min(teamScoresMap[key].total_score, score) : Math.max(teamScoresMap[key].total_score, score);
              });
            }
          } catch (e) {
            console.warn(`Error processing instance ${inst.activity.id}:`, e);
          }
        }

        leaderboard = Object.values(teamScoresMap).filter(v => v.total_score !== Infinity).sort((a, b) => lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
      } else {
        // For player and team_with_players, compute per-instance totals and keep the MAX per team/player across instances
        if (scoringMode === 'player') {
          const playerBest = {}; // key -> { player_name, total_score }

          for (const inst of instances) {
            try {
              // Try leaderboard first (gives aggregate per-player directly)
              const lbResp = await this.api.getActivityLeaderboard(inst.activity.id);
              const lb = lbResp.leaderboard || [];
              if (lb.length > 0 && (lb[0].hasOwnProperty('player_name') || lb[0].hasOwnProperty('player_id'))) {
                // Build instance totals (respecting instance-specific ordering rules)
                const instanceTotals = {};
                const instLowerIsBetter2 = SharedUtils.isLowerBetter(inst.activity);
                lb.forEach(entry => {
                  const pid = entry.player_id || entry.id || entry.player_name;
                  const pidKey = String(pid);
                  const name = entry.player_name || entry.name || (getPlayer(pidKey)?.name) || `Speler ${pid}`;
                  const score = Number(entry.total_score || entry.points || entry.score || 0);
                  if (instanceTotals[pidKey] === undefined) instanceTotals[pidKey] = (instLowerIsBetter2 ? Infinity : -Infinity);
                  instanceTotals[pidKey] = instLowerIsBetter2 ? Math.min(instanceTotals[pidKey], score) : Math.max(instanceTotals[pidKey], score);
                });
                // Merge into best using instance rule
                Object.keys(instanceTotals).forEach(pidKey => {
                  const sc = instanceTotals[pidKey];
                  const instLowerIsBetter3 = SharedUtils.isLowerBetter(inst.activity);
                  if (!playerBest[pidKey] || (instLowerIsBetter3 ? playerBest[pidKey].total_score > sc : playerBest[pidKey].total_score < sc)) {
                    playerBest[pidKey] = { player_name: getPlayer(pidKey)?.name || String(pidKey), total_score: sc };
                  }
                });
                continue;
              }

              // Fallback: use detailed scores and aggregate per player within this instance
              const scoresResp = await this.api.getActivityScores(inst.activity.id);
              const scores = this.api.extractArray(scoresResp, 'scores');
              const instanceTotals2 = {};
              scores.forEach(s => {
                if (!s.player_id) return;
                const pid = s.player_id;
                const pts = Number(s.points || s.score || 0);
                if (!instanceTotals2[pid]) instanceTotals2[pid] = 0;
                instanceTotals2[pid] += pts; // accumulate within instance
              });
              // Merge instance totals using instance-specific ordering
              const instLowerIsBetter4 = SharedUtils.isLowerBetter(inst.activity);
              Object.keys(instanceTotals2).forEach(pidKey => {
                const sc = instanceTotals2[pidKey];
                if (!playerBest[pidKey] || (instLowerIsBetter4 ? playerBest[pidKey].total_score > sc : playerBest[pidKey].total_score < sc)) {
                  playerBest[pidKey] = { player_name: getPlayer(pidKey)?.name || String(pidKey), total_score: sc };
                }
              });
            } catch (e) {
              console.warn(`Error processing player instance ${inst.activity.id}:`, e);
            }
          }

          leaderboard = Object.values(playerBest).sort((a, b) => lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
        } else if (scoringMode === 'team_with_players') {
          const teamBest = {}; // teamKey -> { name, score, players }

          for (const inst of instances) {
            try {
              // Prefer detailed scores
              const scoresResp = await this.api.getActivityScores(inst.activity.id);
              const scores = this.api.extractArray(scoresResp, 'scores');
              if (scores && scores.length > 0) {
                const teamsInstance = {};
                scores.forEach(s => {
                  // Determine team id
                  let teamId = s.team_id;
                  if (!teamId && s.player_id) {
                    const player = getPlayer(s.player_id);
                    teamId = player ? player.team_id : null;
                  }
                  if (!teamId) return;
                  const tid = String(teamId);
                  if (!teamsInstance[tid]) teamsInstance[tid] = { score: 0, players: {} };
                  const pid = s.player_id;
                  const pts = Number(s.points || s.score || 0);
                  teamsInstance[tid].score += pts;
                  if (pid) {
                    const pidKey = String(pid);
                    teamsInstance[tid].players[pidKey] = { name: getPlayer(pidKey)?.name || `Speler ${pid}`, score: (teamsInstance[tid].players[pidKey]?.score || 0) + pts };
                  }
                });

                // Merge into best (respect instance-specific ordering)
                const instLowerIsBetter5 = SharedUtils.isLowerBetter(inst.activity);
                Object.keys(teamsInstance).forEach(tid => {
                  const instData = teamsInstance[tid];
                  if (!teamBest[tid] || (instLowerIsBetter5 ? teamBest[tid].score > instData.score : teamBest[tid].score < instData.score)) {
                    const teamObj = getTeam(tid);
                    teamBest[tid] = { name: teamObj?.name || `Team ${tid}`, score: instData.score, players: instData.players };
                  }
                });
                continue;
              }

              // Fallback to leaderboards for this instance
              const lbResp = await this.api.getActivityLeaderboard(inst.activity.id);
              const lb = lbResp.leaderboard || [];
              // lb may contain player entries or team totals; try to build team totals
              const teamsFromLb = {};
              lb.forEach(entry => {
                if (entry.team_id || entry.team_name) {
                  const key = entry.team_id ? String(entry.team_id) : `name:${entry.team_name}`;
                  const sc = Number(entry.total_score || entry.points || entry.score || 0);
                  if (!teamsFromLb[key]) teamsFromLb[key] = { score: 0, players: {} };
                  teamsFromLb[key].score = Math.max(teamsFromLb[key].score, sc);
                } else if (entry.player_id || entry.player_name) {
                  // assign player's score to their team if possible
                  const pid = entry.player_id || entry.id || entry.player_name;
                  const pidKey = String(pid);
                  const sc = Number(entry.total_score || entry.points || entry.score || 0);
                  const player = getPlayer(pidKey);
                  const tid = player?.team_id ? String(player.team_id) : null;
                  if (!tid) return;
                  if (!teamsFromLb[tid]) teamsFromLb[tid] = { score: 0, players: {} };
                  teamsFromLb[tid].players[pidKey] = { name: entry.player_name || player?.name || String(pidKey), score: sc };
                  // total will be sum of player contributions later, so accumulate
                  teamsFromLb[tid].score += sc;
                }
              });

              const instLowerIsBetter6 = SharedUtils.isLowerBetter(inst.activity);
              Object.keys(teamsFromLb).forEach(tk => {
                const instData = teamsFromLb[tk];
                if (!teamBest[tk] || (instLowerIsBetter6 ? teamBest[tk].score > instData.score : teamBest[tk].score < instData.score)) {
                  const teamObj = getTeam(tk);
                  teamBest[tk] = { name: teamObj?.name || `Team ${tk}`, score: instData.score, players: instData.players };
                }
              });
            } catch (e) {
              console.warn(`Error processing team instance ${inst.activity.id}:`, e);
            }
          }

          leaderboard = Object.values(teamBest).sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));
        }
      }

      // Remove any existing modal
      const existingModal = document.getElementById('highscores-modal');
      if (existingModal) existingModal.remove();

      // Create modal content
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
                  <h3 class="session-title">${this.escapeHtml(activity.name)}</h3>
                  <p style="margin: 5px 0; color: var(--text-secondary);">${this.escapeHtml(activity.sport_type)} • ${this.escapeHtml(activity.scoring_mode)}</p>
                </div>
              </div>
              <div class="scores-display" id="highscores-details"></div>
              <div class="session-controls">
                <button class="btn btn-secondary" onclick="this.closest('.modal').classList.remove('show')">✕ Sluiten</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Display scores into this modal's container (avoid global ID collisions)
      const detailsEl = modal.querySelector('#highscores-details');
      console.debug('Opening highscores modal for activity', activityId, {
        relevantSessions: (typeof relevantSessions !== 'undefined' ? relevantSessions.length : null),
        allScoresCount: (typeof allScores !== 'undefined' ? (Array.isArray(allScores) ? allScores.length : null) : null),
        leaderboardCount: (Array.isArray(leaderboard) ? leaderboard.length : null),
        teams: (Array.isArray(allTeams) ? allTeams.length : null),
        players: (Array.isArray(allPlayers) ? allPlayers.length : null)
      });
      await this.displayHighscoreScores(activityId, leaderboard, activity, combinedSession, detailsEl);

      modal.classList.add('show');

      // Setup close handler
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        });
      }

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 300);
        }
      });

    } catch (error) {
      console.error('Error showing highscore details:', error);
      this.showErrorMessage('Fout bij het laden van highscore details.');
    }
  }

  async displayHighscoreScores(activityId, leaderboard, activity, session, containerEl = null) {
    const container = containerEl || document.getElementById('highscores-details');
    if (!container) {
      console.warn('Highscores details container not found');
      return;
    }

    console.debug('Displaying highscores', { activityId, leaderboard, activity, session });

    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<p>Geen scores beschikbaar.</p>';
      return;
    }

    const scoringMode = activity.scoring_mode || 'team';
    const lowerIsBetter = SharedUtils.isLowerBetter(activity);
    const isTimeMode = !!(activity && String(activity.game_type) === 'team_vs_time');

    // Debug: include lowerIsBetter in logs to help trace sorting/formatting issues
    console.debug(`Displaying highscores for activity ${activityId} (lowerIsBetter: ${lowerIsBetter})`, { activityId, leaderboardCount: (leaderboard||[]).length, scoringMode, isTimeMode });

    if (scoringMode === 'player') {
      const sortedPlayers = (leaderboard || []).slice().sort((a, b) => lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
      container.innerHTML = sortedPlayers.map((player, index) => `
        <div class="score-item">
          <div class="score-item-name">#${index + 1} ${this.escapeHtml(player.player_name || 'Onbekend')}</div>
          <div class="score-item-value">${isTimeMode ? SharedUtils.formatMs(player.total_score) : (player.total_score || 0)}</div>
        </div>
      `).join('');
    } else if (scoringMode === 'team') {
      // Ensure numeric scores and always show teams (including zero scores)
      const normalized = (leaderboard || []).map(t => ({
        team_name: t.team_name || t.name || t.team || 'Onbekend',
        total_score: Number(t.total_score || t.score || 0)
      }));

      // Debug: log what we will render
      console.debug('Rendering team highscores', normalized);

      const sortedTeams = normalized.slice().sort((a, b) => lowerIsBetter ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
      container.innerHTML = sortedTeams.map((team, index) => `
        <div class="score-item">
          <div class="score-item-name">#${index + 1} ${this.escapeHtml(team.team_name || 'Onbekend')}</div>
          <div class="score-item-value">${isTimeMode ? SharedUtils.formatMs(team.total_score) : (team.total_score || 0)}</div>
        </div>
      `).join('');
    } else if (scoringMode === 'team_with_players') {
      const sortedTeams = (leaderboard || []).slice().sort((a, b) => lowerIsBetter ? (a.score - b.score) : (b.score - a.score));
      container.innerHTML = sortedTeams.map((team, index) => {
        const playersList = Object.values(team.players || {});
        return `
          <div class="score-item">
            <div class="score-item-name">#${index + 1} ${this.escapeHtml(team.name || 'Onbekend')} (${isTimeMode ? SharedUtils.formatMs(team.score) : team.score})</div>
            <div class="score-item-value">
              ${playersList.map(p => `${this.escapeHtml(p.name)}: ${isTimeMode ? SharedUtils.formatMs(p.score) : p.score}`).join(', ')}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

    // Special handling for highscores - it's a tab within sessions
    if (sectionName === 'highscores') {
      sectionName = 'sessions';
      // Switch to highscores tab after showing section
      setTimeout(() => {
        const highscoresTab = document.querySelector('.tab-btn[data-tab="highscores"]');
        if (highscoresTab) highscoresTab.click();
      }, 50);
    }

    // Show selected section
    const target = document.getElementById(`${sectionName}-section`);
    if (target) target.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Persist last section
    try { localStorage.setItem('lastSection', sectionName); } catch (_) {}
  }

  async editTeam(teamId) {
    if (this.management && typeof this.management.editTeam === 'function') {
      return this.management.editTeam(teamId);
    }
    // Fallback - find team and show form
    const team = this.management?.teams?.find(t => t.id === teamId);
    if (team && this.management && typeof this.management.showTeamForm === 'function') {
      this.management.showTeamForm(team);
    }
  }

  async deletePlayer(playerId) {
    if (this.management && typeof this.management.deletePlayer === 'function') {
      return this.management.deletePlayer(playerId);
    }
  }

  async editActivity(activityId) {
    if (this.management && typeof this.management.activities === 'object') {
      const activity = this.management.activities.find(a => a.id === activityId);
      if (activity && typeof this.management.showActivityForm === 'function') {
        this.management.showActivityForm(activity);
      }
    }
  }

  async deleteActivity(activityId) {
    if (this.management && typeof this.management.deleteActivity === 'function') {
      return this.management.deleteActivity(activityId);
    }
  }

  async assignPlayerToTeamFromSelect(playerId, teamId) {
    if (!teamId) return;
    try {
      await this.api.updatePlayer(playerId, { team_id: parseInt(teamId) });
      this.showSuccessMessage('Speler toegewezen aan team!');
      if (this.management && typeof this.management.loadPlayers === 'function') {
        await this.management.loadPlayers();
      }
    } catch (error) {
      console.error('Error assigning player to team:', error);
      this.showErrorMessage('Fout bij toewijzen speler aan team');
    }
  }

  async unassignPlayerFromTeam(playerId) {
    try {
      await this.api.updatePlayer(playerId, { team_id: null });
      this.showSuccessMessage('Speler verwijderd uit team!');
      if (this.management && typeof this.management.loadPlayers === 'function') {
        await this.management.loadPlayers();
      }
    } catch (error) {
      console.error('Error unassigning player from team:', error);
      this.showErrorMessage('Fout bij verwijderen speler uit team');
    }
  }

  async assignPlayerToTeam(teamId, playerId) {
    if (this.management && typeof this.management.assignPlayerToTeam === 'function') {
      return this.management.assignPlayerToTeam(teamId, playerId);
    }
    // Fallback: store locally
    try {
      const assignments = JSON.parse(localStorage.getItem('playerTeamAssignments') || '{}');
      assignments[playerId] = teamId;
      localStorage.setItem('playerTeamAssignments', JSON.stringify(assignments));
      this.updatePlayerManagerDisplay();
      this.showSuccessMessage('Speler toegewezen aan team!');
    } catch (error) {
      console.error('Error assigning player to team:', error);
      alert('Fout bij toewijzen speler aan team');
    }
  }

  assignPlayerToTeamFromSelect(playerId, teamId) {
    if (!teamId) return;
    this.assignPlayerToTeam(teamId, playerId);
  }

  async removePlayerFromTeam(playerId) {
    try {
      const assignments = JSON.parse(localStorage.getItem('playerTeamAssignments') || '{}');
      delete assignments[playerId];
      localStorage.setItem('playerTeamAssignments', JSON.stringify(assignments));

      this.updatePlayerManagerDisplay();
      this.showSuccessMessage('Speler verwijderd uit team!');
    } catch (error) {
      console.error('Error removing player from team:', error);
      alert('Fout bij verwijderen speler uit team');
    }
  }

  promptEditPlayer(playerId) {
    if (this.management && typeof this.management.promptEditPlayer === 'function') {
      return this.management.promptEditPlayer(playerId);
    }
  }

  async editPlayer(playerId, newName) {
    if (this.management && typeof this.management.editPlayer === 'function') return this.management.editPlayer(playerId, newName);
  }

  populateTeamSelectForPlayers() {
    if (this.management && typeof this.management.updateTeamSelect === 'function') return this.management.updateTeamSelect();
  }

  populateExistingTeamSelect() {
    if (this.management && typeof this.management.updateExistingTeamSelect === 'function') return this.management.updateExistingTeamSelect();
  }

  addExistingTeam() {
    if (this.management && typeof this.management.addExistingTeam === 'function') return this.management.addExistingTeam();
  }

  editTeam(team) {
    if (this.management && typeof this.management.showTeamForm === 'function') return this.management.showTeamForm(team);
    // fallback
    this.showTeamForm(team);
  }

  async addPlayerToTeam() {
    if (this.management && typeof this.management.addPlayerToTeam === 'function') return this.management.addPlayerToTeam();
  }

  async loadBeheerData() {
    // Delegate to management module
    if (this.management && typeof this.management.loadBeheerData === 'function') {
      await this.management.loadBeheerData();
    }
  }

  setupBeheerEventListeners() {
    // Delegate to management module
    if (this.management && typeof this.management.setupBeheerEventListeners === 'function') {
      this.management.setupBeheerEventListeners();
    }
  }

  showTeamForm(team = null) {
    // Delegate to management module that handles team form UI
    if (this.management && typeof this.management.showTeamForm === 'function') {
      this.management.showTeamForm(team);
      return;
    }

    // Fallback: simple DOM handling
    const container = document.getElementById('team-form-container');
    if (!container) return;
    container.classList.remove('hidden');
    const form = container.querySelector('form');
    if (!form) return;
    if (team) {
      this.editingTeamId = team.id;
      form['team-name'].value = team.name || '';
      form['team-color'].value = team.color || '#3B82F6';
      form['team-icon'].value = team.icon || 'team';
      form['team-description'].value = team.description || '';
    } else {
      this.editingTeamId = null;
      try { form.reset(); } catch (_) {}
      try { form['team-name'].focus(); } catch (_) {}
    }
  }

  hideTeamForm() {
    if (this.management && typeof this.management.hideTeamForm === 'function') {
      this.management.hideTeamForm();
      return;
    }

    const container = document.getElementById('team-form-container');
    if (container) container.classList.add('hidden');
    this.editingTeamId = null;
  }

  showActivityForm(activity = null) {
    // Prefer management implementation
    if (this.management && typeof this.management.showActivityForm === 'function') {
      this.management.showActivityForm(activity);
      return;
    }

    // Fallback: local DOM handling
    const container = document.getElementById('activity-form-container');
    if (!container) return;
    const form = container.querySelector('form');

    container.classList.remove('hidden');

    if (activity) {
      this.editingActivityId = activity.id;
      if (form) {
        try { form.reset(); } catch (_) {}
        form['activity-name'].value = activity.name || '';
        form['activity-sport'].value = activity.sport_type || 'custom';
        form['activity-game-type'].value = activity.game_type || 'custom';
        form['activity-scoring'].value = activity.scoring_mode || 'team';
        form['activity-rounds'].value = activity.total_rounds || 1;
        form['activity-time'].value = activity.time_limit || '';
        form['activity-desc'].value = activity.description || '';
      }
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Bijwerken';
        try { form['activity-name'].focus(); } catch (_) {}
      }
    } else {
      this.editingActivityId = null;
      if (form) {
        try { form.reset(); } catch (_) {}
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Activiteit Opslaan';
        try { form['activity-name'].focus(); } catch (_) {}
      }
    }
  }

  hideActivityForm() {
    if (this.management && typeof this.management.hideActivityForm === 'function') {
      this.management.hideActivityForm();
      return;
    }
    const container = document.getElementById('activity-form-container');
    if (!container) return;
    const form = container.querySelector('form');
    container.classList.add('hidden');
    this.editingActivityId = null;
    if (form) {
      try { form.reset(); } catch (_) {}
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Activiteit Opslaan';
    }
  }

  togglePlayerManager() {
    const manager = document.getElementById('player-manager');
    if (manager) {
      manager.style.display = manager.style.display === 'none' ? 'block' : 'none';
    }
  }

  async handleTeamSubmit(e) {
    if (this.management && typeof this.management.handleTeamSubmit === 'function') {
      return this.management.handleTeamSubmit(e);
    }
    // fallback: prevent default and do nothing
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
  }

  async handleActivitySubmit(e) {
    if (this.management && typeof this.management.handleActivitySubmit === 'function') {
      return this.management.handleActivitySubmit(e);
    }
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
  }

  async loadTeams() {
    if (this.management && typeof this.management.loadTeams === 'function') return this.management.loadTeams();
  }

  async loadActivities() {
    if (this.management && typeof this.management.loadActivities === 'function') return this.management.loadActivities();
  }

  renderTeams(teams) {
    if (this.management && typeof this.management.renderTeams === 'function') return this.management.renderTeams(teams);
  }

  renderActivities(activities) {
    if (this.management && typeof this.management.renderActivities === 'function') return this.management.renderActivities(activities);
  }

  async deleteTeam(teamId) {
    if (this.management && typeof this.management.deleteTeam === 'function') {
      return this.management.deleteTeam(teamId);
    }
    // Fallback
    if (!confirm('Weet je zeker dat je dit team wilt verwijderen?')) return;
    try {
      await this.api.deleteTeam(teamId);
      this.showSuccessMessage('Team verwijderd!');
      if (this.management && typeof this.management.loadTeams === 'function') {
        await this.management.loadTeams();
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      this.showErrorMessage('Fout bij het verwijderen van het team.');
    }
  }

  async editTeam(teamId) {
    if (this.management && typeof this.management.editTeam === 'function') {
      return this.management.editTeam(teamId);
    }
    // Fallback - find team and show form
    const team = this.management?.teams?.find(t => t.id === teamId);
    if (team && this.management && typeof this.management.showTeamForm === 'function') {
      this.management.showTeamForm(team);
    }
  }

  async deleteActivity(activityId) {
    if (this.management && typeof this.management.deleteActivity === 'function') return this.management.deleteActivity(activityId);
  }

  getIconEmoji(icon) {
    const icons = {
      team: '👥',
      star: '⭐',
      fire: '🔥',
      rocket: '🚀',
      trophy: '🏆',
      lightning: '⚡',
      heart: '❤️',
      diamond: '💎',
      crown: '👑',
      superhero: '🦸'
    };
    return icons[icon] || '👥';
  }

  loadActivitiesFromLocalStorage() {
    if (this.management && typeof this.management.loadActivitiesFromLocalStorage === 'function') return this.management.loadActivitiesFromLocalStorage();
    try {
      const stored = localStorage.getItem('sportscore_activities');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading activities from localStorage:', error);
      return [];
    }
  }

  saveActivitiesToLocalStorage(activities) {
    if (this.management && typeof this.management.saveActivitiesToLocalStorage === 'function') return this.management.saveActivitiesToLocalStorage(activities);
    try {
      localStorage.setItem('sportscore_activities', JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities to localStorage:', error);
    }
  }


  updatePlayerManagerDisplay() {
    if (this.management && typeof this.management.updatePlayerManagerDisplay === 'function') {
      return this.management.updatePlayerManagerDisplay();
    }
  }


  getAssignedTeamForPlayer(playerId) {
    // This would need to be implemented based on your data structure
    // For now, return null - you'll need to track player-team assignments
    return null;
  }



  async removePlayerFromTeam(playerId) {
    if (this.management && typeof this.management.removePlayerFromTeam === 'function') return this.management.removePlayerFromTeam(playerId);
  }

  promptEditPlayer(player) {
    // Accept either player object or id
    const id = player && typeof player === 'object' ? player.id : player;
    if (this.management && typeof this.management.promptEditPlayer === 'function') return this.management.promptEditPlayer(id);
  }

  async editPlayer(playerId, newName) {
    if (this.management && typeof this.management.editPlayer === 'function') return this.management.editPlayer(playerId, newName);
  }

  async deletePlayer(playerId) {
    if (this.management && typeof this.management.deletePlayer === 'function') return this.management.deletePlayer(playerId);
  }

  promptEditTeam(teamId) {
    const team = this.teams.find(t => t.id == teamId);
    if (team) {
      this.editTeam(team);
    } else {
      alert('Team niet gevonden');
    }
  }

  async createPlayerGlobal() {
    if (this.processingPlayer) return;
    if (!this.newPlayerNameInput) return;
    const name = this.newPlayerNameInput.value.trim();
    if (!name) {
      this.showErrorMessage('Voer een spelersnaam in.');
      try { this.newPlayerNameInput.focus(); } catch (_) {}
      return;
    }

    this.processingPlayer = true;
    const btn = document.getElementById('add-player-global-btn');
    if (btn) btn.disabled = true;

    try {
      if (this.management && typeof this.management.createPlayerGlobal === 'function') {
        await this.management.createPlayerGlobal(name);
      } else {
        await this.api.request('/api/v1/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        await this.loadPlayers();
      }
      this.showSuccessMessage(`Speler "${name}" toegevoegd!`);
      this.newPlayerNameInput.value = '';
    } catch (error) {
      console.error('Error creating player:', error);
      if (this.api && typeof this.api.handleError === 'function') this.api.handleError(error, 'creating player');
      this.showErrorMessage('Fout bij het toevoegen van de speler.');
    } finally {
      this.processingPlayer = false;
      if (btn) btn.disabled = false;
    }
  }

  async createActivity() {
    if (!this.newActivityNameInput || !this.activitySportSelect || !this.activityGameTypeSelect) return;
    const name = this.newActivityNameInput.value.trim();
    const sport = this.activitySportSelect.value;
    const gameType = this.activityGameTypeSelect.value;
    const description = this.activityDescriptionInput ? this.activityDescriptionInput.value.trim() : '';

    if (!name || !sport) {
      this.showErrorMessage('Voer een naam en sport in.');
      return;
    }

    const activityData = {
      name,
      sport_type: sport,
      game_type: gameType,
      scoring_mode: 'team',
      total_rounds: 1,
      description
    };

    if (this.management && typeof this.management.createActivity === 'function') {
      return this.management.createActivity(activityData);
    }

    try {
      await this.api.createActivity(activityData);
      this.showSuccessMessage(`Activiteit "${name}" toegevoegd!`);
      this.newActivityNameInput.value = '';
      if (this.activityDescriptionInput) this.activityDescriptionInput.value = '';
      await this.loadActivities();
    } catch (error) {
      console.error('Error creating activity:', error);
      if (this.api && typeof this.api.handleError === 'function') this.api.handleError(error, 'creating activity');
      this.showErrorMessage('Fout bij het toevoegen van activiteit.');
    }
  }

  // Submit team form (supports create and update) - used by 'Nieuw Team' form on homepage
  async submitTeamFromForm() {
    // Prefer management implementation
    if (this.management && typeof this.management.submitTeamFromForm === 'function') {
      return this.management.submitTeamFromForm();
    }

    // Fallback: existing behavior
    // Prevent duplicate submissions
    if (this.processingTeam) return;
    this.processingTeam = true;
    const submitBtn = document.getElementById('team-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    const form = document.getElementById('team-form');
    if (!form) {
      this.processingTeam = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const formData = new FormData(form);
    const teamData = {
      name: formData.get('team-name'),
      color: formData.get('team-color'),
      icon: formData.get('team-icon'),
      description: formData.get('team-description') || null
    };

    try {
      let response;
      if (this.editingTeamId) {
        response = await this.api.updateTeam(this.editingTeamId, teamData);
        this.showSuccessMessage(`Team "${teamData.name}" succesvol bijgewerkt!`);
      } else {
        response = await this.api.createTeam(teamData);
        this.showSuccessMessage(`Team "${teamData.name}" toegevoegd!`);
      }

      if (response) {
        if (typeof this.hideTeamFormProper === 'function') this.hideTeamFormProper();
        try { form.reset(); } catch (_){ }
        this.editingTeamId = null;
        await this.loadTeams();
      }
    } catch (error) {
      const operation = this.editingTeamId ? 'updating team' : 'creating team';
      const errorMessage = this.api && typeof this.api.getErrorMessage === 'function' ? this.api.getErrorMessage(error, operation, { name: teamData.name }) : 'Fout bij het opslaan van team.';
      this.showErrorMessage(errorMessage);
      if (this.api && typeof this.api.handleError === 'function') this.api.handleError(error, operation);
    } finally {
      this.processingTeam = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.homepage = new Homepage();
  } catch (e) {
    console.error('Failed to initialize Homepage', e);
    window.showGlobalFatalError && window.showGlobalFatalError('Fout bij initialisatie Homepage: ' + (e && e.message ? e.message : String(e)));
  }
});
