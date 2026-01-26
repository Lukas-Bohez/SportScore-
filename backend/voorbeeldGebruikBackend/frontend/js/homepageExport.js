// homepageExport.js - Export functionality for SportScore homepage
// Handles XLSX export operations for sessions, activities, and history

class HomepageExport {
  constructor(api, sharedUtils, homepageInstance) {
    this.api = api;
    this.sharedUtils = sharedUtils;
    this.homepage = homepageInstance; // Reference to homepage instance for utility methods
  }

  // ---------------------- Export (CSV / XLSX) ----------------------
  async exportSession(sessionId) {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = 'Exporteren...';

    try {
      // Always include highscores and details (checkboxes removed from UI)
      const includeHighscores = true;
      const includeDetails = true;

      const session = this.homepage.historySessions.find(s => s.id == sessionId);
      if (!session) {
        this.homepage.showErrorMessage('Sessie niet gevonden.');
        return;
      }

      // Load session data if missing
      if (!session.activities || !session.teams || !session.players) {
        try {
          const [activitiesResp, teamsResp] = await Promise.all([
            this.api.getSessionActivities(session.id),
            this.api.getSessionTeams(session.id)
          ]);
          session.activities = this.api.extractArray(activitiesResp, 'activities');
          session.teams = this.api.extractArray(teamsResp, 'teams');
          const playersResp = await this.api.getPlayers();
          session.players = this.api.extractArray(playersResp, 'players');
        } catch (err) {
          console.warn('Could not load session details for export', err);
        }
      }

      // Gather all scores from all activities with full activity metadata
      const scores = [];
      const activitiesList = (session.activities || []);
      const totalActivities = Math.max(1, activitiesList.length);
      const activityLeaderboards = new Map(); // Store final rankings per activity

      for (let ai = 0; ai < activitiesList.length; ai++) {
        const activity = activitiesList[ai];
        try {
          // Get both scores and leaderboard
          const [scoresResp, leaderboardResp] = await Promise.all([
            this.api.getActivityScores(activity.id),
            this.api.getActivityLeaderboard(activity.id)
          ]);
          
          const s = this.api.extractArray(scoresResp, 'scores');
          const leaderboard = leaderboardResp.leaderboard || [];
          
          activityLeaderboards.set(activity.id, {
            activity: activity,
            leaderboard: leaderboard
          });
          
          (s || []).forEach(score => scores.push(Object.assign({
            activity_id: activity.id,
            activity_name: activity.name,
            activity_scoring_mode: activity.scoring_mode,
            activity_game_type: activity.game_type,
            activity_sport_type: activity.sport_type
          }, score)));
        } catch (err) {
          console.warn('Failed to load scores for activity', activity.id, err);
        }
        const pct = Math.round(((ai + 1) / totalActivities) * 100);
        this._updateExportProgress(pct, `Laden activiteiten ${ai + 1}/${totalActivities}`);
      }

      // Create lookup maps for enriching data
      const teamMap = new Map();
      const playerMap = new Map();
      (session.teams || []).forEach(t => teamMap.set(t.id, t));
      (session.players || []).forEach(p => playerMap.set(p.id, p));

      // Build enhanced session summary with statistics
      const totalScores = scores.length;
      const uniqueRounds = new Set(scores.map(s => s.round_number).filter(Boolean)).size;
      const dateCreated = session.created_at ? new Date(session.created_at) : null;
      const dateCompleted = session.updated_at ? new Date(session.updated_at) : null;
      const duration = (dateCreated && dateCompleted) ? 
        Math.round((dateCompleted - dateCreated) / 60000) : null; // minutes

      const sessionRow = {
        'Sessie ID': session.id,
        'Sessienaam': session.name,
        'Aangemaakt op': this.homepage.formatDate(session.created_at),
        'Voltooid op': session.updated_at ? this.homepage.formatDate(session.updated_at) : '',
        'Duur (minuten)': duration || '',
        'Status': session.status || (session.is_active ? 'actief' : 'voltooid'),
        'Aantal Teams': (session.teams || []).length,
        'Aantal Activiteiten': (session.activities || []).length,
        'Aantal Spelers': (session.players || []).length,
        'Totaal Scores': totalScores,
        'Aantal Rondes': uniqueRounds || ''
      };

      // Enhanced teams data with performance statistics
      const teamsRows = (session.teams || []).map(t => {
        const teamScores = scores.filter(s => s.team_id === t.id);
        const totalPoints = teamScores.reduce((sum, s) => sum + (s.points || 0), 0);
        const avgPoints = teamScores.length ? (totalPoints / teamScores.length).toFixed(2) : 0;
        const activitiesParticipated = new Set(teamScores.map(s => s.activity_id)).size;
        const bestScore = teamScores.length ? Math.max(...teamScores.map(s => s.points || 0)) : 0;
        
        return {
          'Team ID': t.id,
          'Teamnaam': t.name,
          'Kleur': t.color || '',
          'Icoon': t.icon || '',
          'Aantal Spelers': (session.players || []).filter(p => p.team_id === t.id).length,
          'Activiteiten Deelgenomen': activitiesParticipated,
          'Totaal Aantal Scores': teamScores.length,
          'Totaal Punten': totalPoints,
          'Gemiddelde Punten': avgPoints,
          'Beste Score': bestScore,
          'Beschrijving': t.description || ''
        };
      });

      // Enhanced players data with individual statistics
      const playersRows = (session.players || []).map(p => {
        const team = teamMap.get(p.team_id);
        const playerScores = scores.filter(s => s.player_id === p.id);
        const totalPoints = playerScores.reduce((sum, s) => sum + (s.points || 0), 0);
        const avgPoints = playerScores.length ? (totalPoints / playerScores.length).toFixed(2) : 0;
        const activitiesParticipated = new Set(playerScores.map(s => s.activity_id)).size;
        const bestScore = playerScores.length ? Math.max(...playerScores.map(s => s.points || 0)) : 0;
        
        return {
          'Speler ID': p.id,
          'Spelernaam': p.name,
          'Team ID': p.team_id || '',
          'Teamnaam': team ? team.name : '',
          'Activiteiten Deelgenomen': activitiesParticipated,
          'Totaal Aantal Scores': playerScores.length,
          'Totaal Punten': totalPoints,
          'Gemiddelde Punten': avgPoints,
          'Beste Score': bestScore
        };
      });

      // Enhanced activities data with participation and scoring statistics
      const activitiesRows = (session.activities || []).map(a => {
        const activityScores = scores.filter(s => s.activity_id === a.id);
        const totalPoints = activityScores.reduce((sum, s) => sum + (s.points || 0), 0);
        const avgPoints = activityScores.length ? (totalPoints / activityScores.length).toFixed(2) : 0;
        const teamsParticipated = new Set(activityScores.map(s => s.team_id).filter(Boolean)).size;
        const playersParticipated = new Set(activityScores.map(s => s.player_id).filter(Boolean)).size;
        const highestScore = activityScores.length ? Math.max(...activityScores.map(s => s.points || 0)) : 0;
        const lowestScore = activityScores.length ? Math.min(...activityScores.map(s => s.points || 0)) : 0;
        const isTimeMode = String(a.game_type) === 'team_vs_time';
        
        return {
          'Activiteit ID': a.id,
          'Activiteitnaam': a.name,
          'Sporttype': a.sport_type || '',
          'Speltype': a.game_type || '',
          'Scoremodus': a.scoring_mode || 'team',
          'Aantal Rondes': a.total_rounds || 1,
          'Tijdslimiet (sec)': a.time_limit_per_round || '',
          'Teams Deelgenomen': teamsParticipated,
          'Spelers Deelgenomen': playersParticipated,
          'Totaal Aantal Scores': activityScores.length,
          'Totaal Punten': totalPoints,
          'Gemiddelde Punten': avgPoints,
          'Hoogste Score': isTimeMode ? this._formatTimeScore(highestScore) : highestScore,
          'Laagste Score': isTimeMode ? this._formatTimeScore(lowestScore) : lowestScore,
          'Beschrijving': a.description || ''
        };
      });

      // Enrich scores with names and timestamps for better readability
      const scoresRows = (scores || []).map(s => {
        const team = teamMap.get(s.team_id);
        const player = playerMap.get(s.player_id);
        const activity = activitiesList.find(a => a.id === s.activity_id);
        const isTimeMode = activity && String(activity.game_type) === 'team_vs_time';
        
        return {
          'Tijdstempel': s.timestamp || '',
          'Activiteit': s.activity_name,
          'Sporttype': s.activity_sport_type || '',
          'Speltype': s.activity_game_type || '',
          'Ronde': s.round_number || '',
          'Team ID': s.team_id || '',
          'Team': team ? team.name : '',
          'Speler ID': s.player_id || '',
          'Speler': player ? player.name : '',
          'Punten': s.points || 0,
          'Punten (geformatteerd)': isTimeMode ? this._formatTimeScore(s.points) : (s.points || 0),
          'Reden': s.reason || '',
          'Scoremodus': s.activity_scoring_mode || ''
        };
      });

      // Build comprehensive final rankings sheet
      let finalRankingsRows = [];
      for (const [activityId, data] of activityLeaderboards) {
        const { activity, leaderboard } = data;
        const isTimeMode = String(activity.game_type) === 'team_vs_time';
        const scoringMode = activity.scoring_mode || 'team';
        
        leaderboard.forEach((entry, index) => {
          const isPlayer = scoringMode === 'player' || entry.player_id || entry.player_name;
          const entityName = isPlayer ? 
            (entry.player_name || (playerMap.get(entry.player_id)?.name) || `Speler ${entry.player_id}`) :
            (entry.team_name || (teamMap.get(entry.team_id)?.name) || `Team ${entry.team_id}`);
          const score = entry.total_score || entry.score || 0;
          
          finalRankingsRows.push({
            'Activiteit': activity.name,
            'Sporttype': activity.sport_type || '',
            'Rang': index + 1,
            'Type': isPlayer ? 'Speler' : 'Team',
            'ID': isPlayer ? (entry.player_id || '') : (entry.team_id || ''),
            'Naam': entityName,
            'Totale Score': score,
            'Score (geformatteerd)': isTimeMode ? this._formatTimeScore(score) : score,
            'Verschil met #1': index === 0 ? 0 : (isTimeMode ? 
              this._formatTimeScore(score - leaderboard[0].total_score) : 
              (score - (leaderboard[0].total_score || leaderboard[0].score || 0)))
          });
        });
      }

      // Build per-activity highscores with more detail
      let highscoresRows = [];
      if (includeHighscores && (session.activities || []).length) {
        for (const activity of (session.activities || [])) {
          const rowsForActivity = scores.filter(r => r.activity_id == activity.id);
          const highs = this._computeHighscoresForActivity(
            activity,
            rowsForActivity,
            session.teams || [],
            session.players || []
          );
          const isTimeMode = String(activity.game_type) === 'team_vs_time';
          
          highs.forEach(h => highscoresRows.push({
            'Rang': h.rank,
            'Activiteit': activity.name,
            'Sporttype': activity.sport_type || '',
            'Speltype': activity.game_type || '',
            'Type': h.entity_type === 'player' ? 'Speler' : 'Team',
            'ID': h.entity_id,
            'Naam': h.entity_name,
            'Totale Score': h.total_score,
            'Score (geformatteerd)': isTimeMode ? this._formatTimeScore(h.total_score) : h.total_score,
            'Aantal Scores': h.score_count || 0
          }));
        }
      }

      const safeName = (session.name || `sessie-${session.id}`)
        .replace(/[^a-z0-9\-_ ]/ig, '_')
        .substring(0, 80);
      const timestamp = new Date().toISOString().slice(0,10);

      if (!window.XLSX) {
        this.homepage.showErrorMessage('XLSX bibliotheek niet geladen.');
        return;
      }

      const wb = window.XLSX.utils.book_new();

      // Add sheets in logical order with improved formatting

      // 1. Session overview (most important summary)
      const sessionSheet = window.XLSX.utils.json_to_sheet([sessionRow]);
      this._applySheetFormatting(sessionSheet, 'summary');
      window.XLSX.utils.book_append_sheet(wb, sessionSheet, 'Sessieoverzicht');

      // 2. Final Rankings (most important for end users)
      if (finalRankingsRows.length) {
        const rankingsSheet = window.XLSX.utils.json_to_sheet(finalRankingsRows);
        this._applySheetFormatting(rankingsSheet, 'rankings');
        window.XLSX.utils.book_append_sheet(wb, rankingsSheet, 'Eindklassement');
      }

      // 3. Teams performance summary
      if (teamsRows.length) {
        const teamsSheet = window.XLSX.utils.json_to_sheet(teamsRows);
        this._applySheetFormatting(teamsSheet, 'data');
        window.XLSX.utils.book_append_sheet(wb, teamsSheet, 'Teams');
      }

      // 4. Players performance summary
      if (playersRows.length) {
        const playersSheet = window.XLSX.utils.json_to_sheet(playersRows);
        this._applySheetFormatting(playersSheet, 'data');
        window.XLSX.utils.book_append_sheet(wb, playersSheet, 'Spelers');
      }

      // 5. Activities summary
      if (activitiesRows.length) {
        const activitiesSheet = window.XLSX.utils.json_to_sheet(activitiesRows);
        this._applySheetFormatting(activitiesSheet, 'data');
        window.XLSX.utils.book_append_sheet(wb, activitiesSheet, 'Activiteiten');
      }

      // 6. Top Prestaties (top performers across all activities)
      if (includeHighscores && highscoresRows.length) {
        const highscoresSheet = window.XLSX.utils.json_to_sheet(highscoresRows);
        this._applySheetFormatting(highscoresSheet, 'rankings');
        window.XLSX.utils.book_append_sheet(wb, highscoresSheet, 'Top Prestaties');
      }

      // 7. Detailed scores (raw data)
      if (scoresRows.length) {
        const scoresSheet = window.XLSX.utils.json_to_sheet(scoresRows);
        this._applySheetFormatting(scoresSheet, 'data');
        window.XLSX.utils.book_append_sheet(wb, scoresSheet, 'Alle Scores (Details)');
      } else {
        window.XLSX.utils.book_append_sheet(
          wb,
          window.XLSX.utils.json_to_sheet([{'Opmerking': 'Geen scores gevonden'}]),
          'Alle Scores (Details)'
        );
      }

      window.XLSX.writeFile(wb, `${safeName}_${timestamp}.xlsx`);
      this.homepage.showSuccessMessage('Export voltooid.');

    } catch (err) {
      console.error('Error exporting session', err);
      this.homepage.showErrorMessage('Fout bij exporteren sessie.');
    } finally {
      if (statusEl) statusEl.textContent = '';
      this._updateExportProgress(0, '');
    }
  }

  _applySheetFormatting(sheet, type) {
    // Apply column widths based on content
    if (!sheet['!cols']) sheet['!cols'] = [];
    
    const range = window.XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = window.XLSX.utils.encode_cell({r: R, c: C});
        const cell = sheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      // Cap maximum width and add some padding
      sheet['!cols'][C] = {wch: Math.min(maxWidth + 2, 50)};
    }
    
    // Apply row height for headers
    if (!sheet['!rows']) sheet['!rows'] = [];
    sheet['!rows'][0] = {hpt: 20};
  }

  _formatTimeScore(ms) {
    if (!ms || ms === 0) return '0:00.000';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  // Deprecated wrapper kept for compatibility: exportAllSessionsCsv -> exportAllSessions (XLSX only)
  async exportAllSessionsCsv(/* unused */) {
    // Forward to XLSX export
    return this.exportAllSessions('xlsx', null, null);
  }

  _arrayToCsv(rows) {
    return rows.map(r => r.map(c => {
      if (c === null || c === undefined) return '';
      const s = String(c);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',')).join('\n');
  }

  // ---------------------- Export confirm modal flow ----------------------
  async showExportConfirm(sessionId = null, preselectedActivities = null) {
    const modal = document.getElementById('export-confirm-modal');
    const listEl = document.getElementById('export-confirm-activity-list');
    const infoEl = document.getElementById('export-confirm-info');
    const percentEl = document.getElementById('export-confirm-percent');
    const prog = document.getElementById('export-confirm-progress');
    if (!modal || !listEl) {
      this.homepage.showErrorMessage('Export modal niet beschikbaar');
      return;
    }

    // default to XLSX only (CSV deprecated)
    const format = 'xlsx';

    // determine activities to show
    let activities = [];
    if (sessionId) {
      const session = this.homepage.historySessions.find(s => s.id == sessionId);
      activities = session ? (session.activities || []) : [];
      if (!activities.length) {
        try { activities = await this.api.getSessionActivities(sessionId).then(r => this.api.extractArray(r, 'activities') || []); } catch (e) { /* ignore */ }
      }
    } else {
      // all sessions - aggregate activities across sessions
      const seen = new Map();
      for (const s of (this.homepage.historySessions || [])) {
        const acts = s.activities || (await this.api.getSessionActivities(s.id).then(r => this.api.extractArray(r, 'activities') || []));
        for (const a of acts) { if (!seen.has(a.id)) seen.set(a.id, a); }
      }
      activities = Array.from(seen.values());
    }

    listEl.innerHTML = '';
    // prefetch score counts for estimate (may be slow) — show live progress
    let total = activities.length;
    let fetched = 0;
    infoEl.textContent = 'Schattingsrijen worden opgehaald...';
    for (const a of activities) {
      const row = document.createElement('div');
      const id = a.id;
      const chk = document.createElement('input'); chk.type = 'checkbox'; chk.value = id; chk.checked = !preselectedActivities || preselectedActivities.includes(id);
      const label = document.createElement('label'); label.style.marginLeft = '6px'; label.textContent = `${a.name} (${a.sport_type || ''})`;
      row.appendChild(chk); row.appendChild(label);
      listEl.appendChild(row);

      // fetch estimate count
      try {
        const resp = await this.api.getActivityScores(id);
        const s = this.api.extractArray(resp, 'scores') || [];
        const countLabel = document.createElement('span'); countLabel.style.marginLeft = '8px'; countLabel.style.color = 'var(--text-secondary)'; countLabel.textContent = `Rows: ${s.length}`;
        row.appendChild(countLabel);
      } catch (e) { /* ignore */ }
      fetched++;
      const pct = Math.round((fetched / Math.max(1, total)) * 100);
      if (prog) prog.style.width = `${pct}%`;
      if (percentEl) percentEl.textContent = `${pct}%`;
    }

    // store state for confirm
    modal.dataset.format = format;
    modal.dataset.sessionId = sessionId || '';
    modal.classList.add('show');
    // ensure progress reset
    if (prog) prog.style.width = `0%`;
    if (percentEl) percentEl.textContent = '0%';
  }

  async _exportConfirmProceed() {
    const modal = document.getElementById('export-confirm-modal');
    if (!modal) return;
    // export format controls removed from UI; default to XLSX
    const format = document.getElementById('export-confirm-format')?.value || 'xlsx';
    const listEl = document.getElementById('export-confirm-activity-list');
    const checkboxes = Array.from(listEl.querySelectorAll('input[type="checkbox"]'));
    const selected = checkboxes.filter(c => c.checked).map(c => parseInt(c.value));
    const sessionId = modal.dataset.sessionId ? parseInt(modal.dataset.sessionId) : null;
    // hide modal and call export
    modal.classList.remove('show');
    // call exportAllSessions with filter
    if (sessionId) await this.exportAllSessions(format, selected, sessionId);
    else await this.exportAllSessions(format, selected, null);
    // reset progress UI
    const prog = document.getElementById('export-confirm-progress'); if (prog) prog.style.width = '0%';
    const pct = document.getElementById('export-confirm-percent'); if (pct) pct.textContent = '0%';
  }

  _downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // ---------------------- Export helpers ----------------------
  _updateExportProgress(percent, text = '') {
    try {
      const bar = document.getElementById('export-progress-bar');
      const pct = document.getElementById('export-progress-percent');
      const status = document.getElementById('export-status');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      if (pct) pct.textContent = `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
      if (status) status.textContent = text || '';
    } catch (e) { /* ignore */ }
  }

  _computeHighscoresForActivity(activity, scoresRows = [], teams = [], players = [], topN = 50) {
    // activity: object with scoring_mode, game_type
    // scoresRows: array of { team_id, player_id, points }
    const byEntity = {}; // key -> { id, name, total, count }
    const isPlayerMode = String(activity.scoring_mode || 'team') === 'player';
    const isTimeMode = String(activity.game_type || '').toLowerCase() === 'team_vs_time';

    // Build lookup maps for faster access
    const teamMap = new Map();
    const playerMap = new Map();
    (teams || []).forEach(t => teamMap.set(t.id, t));
    (players || []).forEach(p => playerMap.set(p.id, p));

    scoresRows.forEach(s => {
      const key = isPlayerMode ? `p:${s.player_id || 'none'}` : `t:${s.team_id || 'none'}`;
      if (!byEntity[key]) {
        const id = isPlayerMode ? s.player_id : s.team_id;
        let name = '';
        if (isPlayerMode) {
          const p = playerMap.get(id);
          name = p ? p.name : (id ? `Speler ${id}` : 'Onbekend');
        } else {
          const t = teamMap.get(id);
          name = t ? t.name : (id ? `Team ${id}` : 'Onbekend');
        }
        byEntity[key] = { id: id, name: name, total: 0, count: 0 };
      }
      const val = Number(s.points || 0);
      byEntity[key].total = (byEntity[key].total || 0) + val;
      byEntity[key].count = (byEntity[key].count || 0) + 1;
    });

    const rows = Object.keys(byEntity).map(k => {
      const ent = byEntity[k];
      return { 
        entity_id: ent.id, 
        entity_name: ent.name, 
        entity_type: (k.startsWith('p:') ? 'player' : 'team'), 
        total_score: ent.total,
        score_count: ent.count
      };
    });

    // Filter out entities with no scores (0 points) unless it's a time-based activity where 0 might be valid
    const filtered = rows.filter(r => {
      // For time-based activities, keep all entries
      if (isTimeMode) return true;
      // For point-based activities, only keep entries with points > 0
      return r.total_score > 0;
    });

    // sort (time: lower is better => ascending, else descending)
    filtered.sort((a,b) => isTimeMode ? (a.total_score - b.total_score) : (b.total_score - a.total_score));

    // Only return top N entries that have valid names (not "Onbekend")
    return filtered
      .filter(r => r.entity_name && r.entity_name !== 'Onbekend')
      .slice(0, topN)
      .map((r, idx) => ({ rank: idx+1, ...r }));
  }

  _computeAggregatedHighscoresFromCombinedRows(combinedRows = [], activitiesMeta = {}) {
    // combinedRows: [{ activity_id, activity_name, activity_scoring_mode, activity_game_type, team_id, player_id, points }]
    const byActivity = {}; // activity_id -> map(key-> {total, count})
    
    combinedRows.forEach(r => {
      const aid = r.activity_id;
      const meta = activitiesMeta[aid] || {};
      const isPlayerMode = String(meta.scoring_mode || '').toLowerCase() === 'player';
      const isTimeMode = String(meta.game_type || '').toLowerCase() === 'team_vs_time';
      const key = isPlayerMode ? `p:${r.player_id || 'none'}` : `t:${r.team_id || 'none'}`;
      byActivity[aid] = byActivity[aid] || { meta, map: {} };
      if (!byActivity[aid].map[key]) {
        byActivity[aid].map[key] = { total: 0, count: 0 };
      }
      byActivity[aid].map[key].total += Number(r.points || 0);
      byActivity[aid].map[key].count += 1;
    });

    const result = [];
    Object.keys(byActivity).forEach(aid => {
      const { meta, map } = byActivity[aid];
      const rows = Object.keys(map).map(key => {
        const parts = key.split(':');
        const entityId = parts[1];
        
        // Skip entries with invalid IDs
        if (!entityId || entityId === 'none' || entityId === 'undefined' || entityId === 'null') {
          return null;
        }
        
        return { 
          activity_id: aid, 
          activity_name: meta.name || '', 
          entity_type: parts[0] === 'p' ? 'player' : 'team', 
          entity_id: entityId, 
          total_score: map[key].total,
          score_count: map[key].count
        };
      }).filter(Boolean); // Remove null entries
      
      const isTimeMode = String(meta.game_type || '').toLowerCase() === 'team_vs_time';
      
      // Filter out zero scores for non-time activities
      const filtered = rows.filter(r => {
        if (isTimeMode) return true;
        return r.total_score > 0;
      });
      
      filtered.sort((a,b) => isTimeMode ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
      filtered.forEach((r, idx) => { r.rank = idx+1; result.push(r); });
    });
    
    return result;
  }

  // Export a single activity's scores + highscores
  async exportActivity(sessionId, activityId) {
    const statusEl = document.getElementById('export-status'); if (statusEl) statusEl.textContent = 'Exporteren activiteit...';
    try {
      // show confirm modal for single activity as well
      await this.showExportConfirm(sessionId, [activityId]);

      // load session and activity metadata
      const session = this.homepage.historySessions.find(s => s.id == sessionId) || {};
      let activity = null;
      if (session && session.activities) activity = (session.activities || []).find(a => a.id == activityId);
      if (!activity) {
        try {
          const actsResp = await this.api.getSessionActivities(sessionId);
          const acts = this.api.extractArray(actsResp, 'activities') || [];
          activity = acts.find(a => a.id == activityId) || activity;
        } catch (e) { /* ignore */ }
      }

      // fetch scores
      const scoresResp = await this.api.getActivityScores(activityId);
      const scores = this.api.extractArray(scoresResp, 'scores') || [];

      // Always include details
      const includeDetails = true;
      let players = session.players || [];
      let teams = session.teams || [];
      if (includeDetails) {
        try { const playersResp = await this.api.getPlayers(); players = this.api.extractArray(playersResp, 'players'); } catch (_) {}
        try { const teamsResp = await this.api.getTeams(); teams = this.api.extractArray(teamsResp, 'teams'); } catch (_) {}
      }

      const scoresRows = (scores || []).map(s => ({ team_id: s.team_id, player_id: s.player_id, points: s.points, reason: s.reason, round_number: s.round_number, timestamp: s.timestamp }));
      const highs = this._computeHighscoresForActivity(activity || {}, scoresRows, teams, players, 200);

      const safeName = ((session.name || 'session') + '-' + ((activity && activity.name) || 'activity')).replace(/[^a-z0-9\-_ ]/ig, '_').substring(0, 80);

      if (window.XLSX) {
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet([ { activity_id: activity && activity.id, name: activity && activity.name, sport_type: activity && activity.sport_type, game_type: activity && activity.game_type, scoring_mode: activity && activity.scoring_mode } ]), 'Activity');
        if (scoresRows.length) window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(scoresRows), 'Scores');
        if (highs.length) window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(highs), 'Highscores');
        if (includeDetails && teams.length) window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(teams), 'Teams');
        if (includeDetails && players.length) window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(players), 'Players');
        window.XLSX.writeFile(wb, `${safeName}.xlsx`);
        this.homepage.showSuccessMessage('Export voltooid.');
      } else {
        this.homepage.showErrorMessage('XLSX bibliotheek niet geladen. Alleen XLSX export ondersteund.');
      }
    } catch (err) {
      console.error('Error exporting activity', err);
      this.homepage.showErrorMessage('Fout bij exporteren activiteit.');
    } finally { if (statusEl) statusEl.textContent = ''; }
  }

  // Enhanced exportAllSessions - include highscores sheet if requested
  async exportAllSessions(format = 'xlsx', activityFilter = null, sessionFilter = null) {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = 'Exporteren geschiedenis...';

    try {
      this._updateExportProgress(0, '');
      
      // Always include highscores and details
      const includeHighscores = true;
      const includeDetails = true;

      if (!this.homepage.historySessions || !this.homepage.historySessions.length) {
        await this.homepage.loadHistorySessions();
      }

      // Create global lookup maps
      const teamMap = new Map();
      const playerMap = new Map();

      const combinedRows = [];
      const activitiesMeta = {};
      const sessionSummaries = [];

      // Calculate total activities for progress tracking
      let totalActivities = 0;
      for (const s of (this.homepage.historySessions || [])) {
        const acts = s.activities || (
          await this.api.getSessionActivities(s.id)
            .then(r => this.api.extractArray(r, 'activities'))
        );
        totalActivities += (acts || []).length;
        // Build lookup maps
        (s.teams || []).forEach(t => teamMap.set(t.id, t));
        (s.players || []).forEach(p => playerMap.set(p.id, p));
      }

      let processed = 0;
      for (const session of (this.homepage.historySessions || [])) {
        if (sessionFilter && session.id !== sessionFilter) continue;

        const activities = session.activities || (
          await this.api.getSessionActivities(session.id)
            .then(r => this.api.extractArray(r, 'activities'))
        );

        // Add session summary
        const sessionScores = [];
        for (const activity of (activities || [])) {
          try {
            const resp = await this.api.getActivityScores(activity.id);
            const s = this.api.extractArray(resp, 'scores');
            sessionScores.push(...(s || []));
          } catch (err) {
            console.warn('Skipping scores for session summary', err);
          }
        }

        const dateCreated = session.created_at ? new Date(session.created_at) : null;
        const dateCompleted = session.updated_at ? new Date(session.updated_at) : null;
        const duration = (dateCreated && dateCompleted) ? 
          Math.round((dateCompleted - dateCreated) / 60000) : null;

        sessionSummaries.push({
          'Sessie ID': session.id,
          'Sessienaam': session.name,
          'Aangemaakt op': this.homepage.formatDate(session.created_at),
          'Voltooid op': session.updated_at ? this.homepage.formatDate(session.updated_at) : '',
          'Duur (minuten)': duration || '',
          'Status': session.status || 'voltooid',
          'Aantal Teams': (session.teams || []).length,
          'Aantal Activiteiten': (activities || []).length,
          'Aantal Spelers': (session.players || []).length,
          'Totaal Scores': sessionScores.length
        });

        for (const activity of (activities || [])) {
          if (activityFilter && Array.isArray(activityFilter) &&
              activityFilter.length && !activityFilter.includes(activity.id)) {
            processed++;
            continue;
          }

          activitiesMeta[activity.id] = {
            name: activity.name,
            scoring_mode: activity.scoring_mode,
            game_type: activity.game_type,
            sport_type: activity.sport_type
          };

          try {
            const resp = await this.api.getActivityScores(activity.id);
            const s = this.api.extractArray(resp, 'scores');
            (s || []).forEach(score => combinedRows.push(Object.assign({
              session_id: session.id,
              session_name: session.name,
              activity_id: activity.id,
              activity_name: activity.name,
              activity_scoring_mode: activity.scoring_mode,
              activity_game_type: activity.game_type,
              activity_sport_type: activity.sport_type
            }, score)));
          } catch (err) {
            console.warn('Skipping scores for activity', activity.id, err);
          }

          processed++;
          const pct = totalActivities ?
            Math.round((processed / totalActivities) * 100) :
            Math.round((processed / 1) * 100);
          this._updateExportProgress(pct, `Laden activiteit ${processed}/${totalActivities}`);
        }
      }

      const filenameBase = `sportscore_geschiedenis_${new Date().toISOString().slice(0,10)}`;

      if (!window.XLSX) {
        this.homepage.showErrorMessage('XLSX bibliotheek niet geladen.');
        return;
      }

      // Build enriched rows with Dutch headers
      const scoresRowsWithNames = combinedRows.map(s => {
        const team = teamMap.get(s.team_id);
        const player = playerMap.get(s.player_id);
        const isTimeMode = String(s.activity_game_type) === 'team_vs_time';
        
        return {
          'Tijdstempel': s.timestamp || '',
          'Sessie': s.session_name,
          'Activiteit': s.activity_name,
          'Sporttype': s.activity_sport_type || '',
          'Speltype': s.activity_game_type || '',
          'Ronde': s.round_number || '',
          'Team ID': s.team_id || '',
          'Team': team ? team.name : '',
          'Speler ID': s.player_id || '',
          'Speler': player ? player.name : '',
          'Punten': s.points || 0,
          'Punten (geformatteerd)': isTimeMode ? this._formatTimeScore(s.points) : (s.points || 0),
          'Reden': s.reason || '',
          'Scoremodus': s.activity_scoring_mode || ''
        };
      });

      const wb = window.XLSX.utils.book_new();

      // Session summaries sheet (overview of all sessions)
      if (sessionSummaries.length) {
        const summarySheet = window.XLSX.utils.json_to_sheet(sessionSummaries);
        this._applySheetFormatting(summarySheet, 'summary');
        window.XLSX.utils.book_append_sheet(wb, summarySheet, 'Sessies Overzicht');
      }

      // Main scores sheet
      if (scoresRowsWithNames.length) {
        const scoresSheet = window.XLSX.utils.json_to_sheet(scoresRowsWithNames);
        this._applySheetFormatting(scoresSheet, 'data');
        window.XLSX.utils.book_append_sheet(wb, scoresSheet, 'Alle Scores');
      } else {
        window.XLSX.utils.book_append_sheet(
          wb,
          window.XLSX.utils.json_to_sheet([{'Opmerking': 'Geen scores gevonden'}]),
          'Alle Scores'
        );
      }

      // Highscores sheet (always included)
      if (includeHighscores) {
        const hs = this._computeAggregatedHighscoresFromCombinedRows(
          combinedRows,
          activitiesMeta
        );
        const hsWithDutch = hs.map(h => {
          const meta = activitiesMeta[h.activity_id] || {};
          const isTimeMode = String(meta.game_type) === 'team_vs_time';
          const isPlayer = h.entity_type === 'player';
          
          // Look up the actual name from our maps
          let entityName = 'Onbekend';
          if (isPlayer) {
            const player = playerMap.get(parseInt(h.entity_id));
            entityName = player ? player.name : `Speler ${h.entity_id}`;
          } else {
            const team = teamMap.get(parseInt(h.entity_id));
            entityName = team ? team.name : `Team ${h.entity_id}`;
          }
          
          return {
            'Rang': h.rank,
            'Activiteit': h.activity_name,
            'Sporttype': meta.sport_type || '',
            'Type': isPlayer ? 'Speler' : 'Team',
            'ID': h.entity_id,
            'Naam': entityName,
            'Aantal Scores': h.score_count || 0,
            'Totale Score': h.total_score,
            'Score (geformatteerd)': isTimeMode ? this._formatTimeScore(h.total_score) : h.total_score,
            'Gemiddelde Score': h.score_count ? (h.total_score / h.score_count).toFixed(2) : 0
          };
        }).filter(h => h.Naam && h.Naam !== 'Onbekend'); // Filter out unknown entities
        
        if (hsWithDutch.length) {
          const highscoresSheet = window.XLSX.utils.json_to_sheet(hsWithDutch);
          this._applySheetFormatting(highscoresSheet, 'rankings');
          window.XLSX.utils.book_append_sheet(wb, highscoresSheet, 'Top Prestaties');
        }
      }

      // Optional global lists (always included)
      if (includeDetails) {
        try {
          const tResp = await this.api.getTeams();
          const trows = this.api.extractArray(tResp, 'teams');
          if (trows && trows.length) {
            const teamsWithDutch = trows.map(t => ({
              'Team ID': t.id,
              'Teamnaam': t.name,
              'Kleur': t.color || '',
              'Icoon': t.icon || '',
              'Beschrijving': t.description || ''
            }));
            const teamsSheet = window.XLSX.utils.json_to_sheet(teamsWithDutch);
            this._applySheetFormatting(teamsSheet, 'data');
            window.XLSX.utils.book_append_sheet(wb, teamsSheet, 'Alle Teams');
          }
        } catch (err) {
          console.warn('Failed to load teams for export', err);
        }

        try {
          const pResp = await this.api.getPlayers();
          const prows = this.api.extractArray(pResp, 'players');
          if (prows && prows.length) {
            const playersWithDutch = prows.map(p => {
              const team = teamMap.get(p.team_id);
              return {
                'Speler ID': p.id,
                'Spelernaam': p.name,
                'Team ID': p.team_id || '',
                'Teamnaam': team ? team.name : ''
              };
            });
            const playersSheet = window.XLSX.utils.json_to_sheet(playersWithDutch);
            this._applySheetFormatting(playersSheet, 'data');
            window.XLSX.utils.book_append_sheet(wb, playersSheet, 'Alle Spelers');
          }
        } catch (err) {
          console.warn('Failed to load players for export', err);
        }

        try {
          const aResp = await this.api.getActivities();
          const arows = this.api.extractArray(aResp, 'activities');
          if (arows && arows.length) {
            const activitiesWithDutch = arows.map(a => ({
              'Activiteit ID': a.id,
              'Activiteitnaam': a.name,
              'Sporttype': a.sport_type || '',
              'Speltype': a.game_type || '',
              'Scoremodus': a.scoring_mode || 'team',
              'Beschrijving': a.description || ''
            }));
            const activitiesSheet = window.XLSX.utils.json_to_sheet(activitiesWithDutch);
            this._applySheetFormatting(activitiesSheet, 'data');
            window.XLSX.utils.book_append_sheet(wb, activitiesSheet, 'Alle Activiteiten');
          }
        } catch (err) {
          console.warn('Failed to load activities for export', err);
        }
      }

      window.XLSX.writeFile(wb, `${filenameBase}.xlsx`);
      this.homepage.showSuccessMessage('Export voltooid.');

    } catch (err) {
      console.error('Error exporting all sessions', err);
      this.homepage.showErrorMessage('Fout bij exporteren geschiedenis.');
    } finally {
      if (statusEl) statusEl.textContent = '';
      this._updateExportProgress(0, '');
    }
  }
}

// Export the class for use in other files
window.HomepageExport = HomepageExport;