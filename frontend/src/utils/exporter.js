// Lightweight XLSX exporter helper for the Vue app
// Loads SheetJS (XLSX) from CDN if not present and builds simple XLSX workbooks

async function ensureXlsxLoaded() {
  if (window.XLSX) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/xlsx/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load XLSX from CDN'));
    document.head.appendChild(script);
    setTimeout(() => reject(new Error('XLSX load timeout')), 10000);
  });
}

function safeFilename(name) {
  return (name || 'sessie').replace(/[^a-z0-9\-_ ]/ig, '_').substring(0, 80);
}

function formatTimeMs(ms) {
  if (ms === undefined || ms === null) return '0:00.000';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function applySheetFormatting(sheet, type) {
  try {
    if (!sheet || !sheet['!ref']) return;
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
      sheet['!cols'][C] = {wch: Math.min(maxWidth + 2, 50)};
    }
    if (!sheet['!rows']) sheet['!rows'] = [];
    sheet['!rows'][0] = {hpt: 20};
  } catch (e) {
    /* ignore formatting errors */
  }
}

function computeHighscoresForActivity(activity = {}, scoresRows = [], teams = [], players = [], topN = 50) {
  const byEntity = {};
  const isPlayerMode = String(activity.scoring_mode || 'team') === 'player';
  const isTimeMode = String(activity.game_type || '').toLowerCase() === 'team_vs_time';

  const teamMap = new Map();
  const playerMap = new Map();
  (teams || []).forEach(t => teamMap.set(String(t.id), t));
  (players || []).forEach(p => playerMap.set(String(p.id), p));

  (scoresRows || []).forEach(s => {
    const key = isPlayerMode ? `p:${s.player_id || 'none'}` : `t:${s.team_id || 'none'}`;
    if (!byEntity[key]) {
      const id = isPlayerMode ? s.player_id : s.team_id;
      let name = '';
      if (isPlayerMode) {
        const p = playerMap.get(String(id));
        name = p ? p.name : (id ? `Speler ${id}` : 'Onbekend');
      } else {
        const t = teamMap.get(String(id));
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

  const filtered = rows.filter(r => {
    if (isTimeMode) return true;
    return r.total_score > 0;
  });

  filtered.sort((a,b) => isTimeMode ? (a.total_score - b.total_score) : (b.total_score - a.total_score));

  return filtered
    .filter(r => r.entity_name && r.entity_name !== 'Onbekend')
    .slice(0, topN)
    .map((r, idx) => ({ rank: idx + 1, ...r }));
}

function computeAggregatedHighscoresFromCombinedRows(combinedRows = [], activitiesMeta = {}) {
  const byActivity = {};
  combinedRows.forEach(r => {
    const aid = r.activity_id;
    const meta = activitiesMeta[aid] || {};
    const isPlayerMode = String(meta.scoring_mode || '').toLowerCase() === 'player';
    const key = isPlayerMode ? `p:${r.player_id || 'none'}` : `t:${r.team_id || 'none'}`;
    byActivity[aid] = byActivity[aid] || { meta, map: {} };
    if (!byActivity[aid].map[key]) byActivity[aid].map[key] = { total: 0, count: 0 };
    byActivity[aid].map[key].total += Number(r.points || 0);
    byActivity[aid].map[key].count += 1;
  });

  const result = [];
  Object.keys(byActivity).forEach(aid => {
    const { meta, map } = byActivity[aid];
    const rows = Object.keys(map).map(key => {
      const parts = key.split(':');
      const entityId = parts[1];
      if (!entityId || entityId === 'none' || entityId === 'undefined' || entityId === 'null') return null;
      return {
        activity_id: aid,
        activity_name: meta.name || '',
        entity_type: parts[0] === 'p' ? 'player' : 'team',
        entity_id: entityId,
        total_score: map[key].total,
        score_count: map[key].count
      };
    }).filter(Boolean);

    const isTimeMode = String(meta.game_type || '').toLowerCase() === 'team_vs_time';
    const filtered = rows.filter(r => (isTimeMode ? true : r.total_score > 0));
    filtered.sort((a,b) => isTimeMode ? (a.total_score - b.total_score) : (b.total_score - a.total_score));
    filtered.forEach((r, idx) => { r.rank = idx + 1; result.push(r); });
  });
  return result;
}

export async function exportSessionToXlsx(session = {}) {
  if (!session || !session.id) throw new Error('Invalid session');
  await ensureXlsxLoaded();
  const wb = window.XLSX.utils.book_new();

  // Build flattened scores list for aggregations
  const flatScores = [];
  const activitiesList = (session.activities || []);
  for (const a of activitiesList) {
    for (const s of (a.scores || [])) {
      flatScores.push(Object.assign({
        activity_id: a.id,
        activity_name: a.name,
        activity_scoring_mode: a.scoring_mode,
        activity_game_type: a.game_type,
        activity_sport_type: a.sport_type
      }, s));
    }
  }

  // Session summary (enhanced)
  const totalScores = flatScores.length;
  const uniqueRounds = new Set(flatScores.map(s => s.round_number).filter(Boolean)).size;
  const dateCreated = session.created_at ? new Date(session.created_at) : null;
  const dateCompleted = session.updated_at ? new Date(session.updated_at) : null;
  const duration = (dateCreated && dateCompleted) ? Math.round((dateCompleted - dateCreated) / 60000) : '';
  const sessionRow = {
    'Sessie ID': session.id,
    'Sessienaam': session.name || '',
    'Aangemaakt op': session.created_at || '',
    'Voltooid op': session.updated_at || '',
    'Duur (minuten)': duration || '',
    'Status': session.status || (session.is_active ? 'actief' : 'voltooid'),
    'Aantal Teams': (session.teams || []).length,
    'Aantal Activiteiten': activitiesList.length,
    'Aantal Spelers': (session.players || []).length,
    'Totaal Scores': totalScores,
    'Aantal Rondes': uniqueRounds || ''
  };
  const sessionSheet = window.XLSX.utils.json_to_sheet([sessionRow]);
  applySheetFormatting(sessionSheet, 'summary');
  window.XLSX.utils.book_append_sheet(wb, sessionSheet, 'Sessieoverzicht');

  // Teams with stats
  const teamMap = new Map();
  (session.teams || []).forEach(t => teamMap.set(t.id, t));
  const teamsRows = (session.teams || []).map(t => {
    const teamScores = flatScores.filter(s => s.team_id === t.id);
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
  if (teamsRows.length) {
    const teamsSheet = window.XLSX.utils.json_to_sheet(teamsRows);
    applySheetFormatting(teamsSheet, 'data');
    window.XLSX.utils.book_append_sheet(wb, teamsSheet, 'Teams');
  }

  // Players with stats
  const playerMap = new Map();
  (session.players || []).forEach(p => playerMap.set(p.id, p));
  const playersRows = (session.players || []).map(p => {
    const playerScores = flatScores.filter(s => s.player_id === p.id);
    const totalPoints = playerScores.reduce((sum, s) => sum + (s.points || 0), 0);
    const avgPoints = playerScores.length ? (totalPoints / playerScores.length).toFixed(2) : 0;
    const activitiesParticipated = new Set(playerScores.map(s => s.activity_id)).size;
    const bestScore = playerScores.length ? Math.max(...playerScores.map(s => s.points || 0)) : 0;
    return {
      'Speler ID': p.id,
      'Spelernaam': p.name,
      'Team ID': p.team_id || '',
      'Teamnaam': teamMap.get(p.team_id)?.name || '',
      'Activiteiten Deelgenomen': activitiesParticipated,
      'Totaal Aantal Scores': playerScores.length,
      'Totaal Punten': totalPoints,
      'Gemiddelde Punten': avgPoints,
      'Beste Score': bestScore
    };
  });
  if (playersRows.length) {
    const playersSheet = window.XLSX.utils.json_to_sheet(playersRows);
    applySheetFormatting(playersSheet, 'data');
    window.XLSX.utils.book_append_sheet(wb, playersSheet, 'Spelers');
  }

  // Activities & Scores
  const scoresRows = [];
  const highscoresRows = [];
  for (const act of activitiesList) {
    const activityScores = (act.scores || []).map(s => ({
      'Activiteit ID': act.id,
      'Activiteit': act.name,
      'Speltype': act.game_type || '',
      'Scoremodus': act.scoring_mode || '',
      'Ronde': s.round_number || '',
      'Team ID': s.team_id || '',
      'Speler ID': s.player_id || '',
      'Punten': s.points || 0,
      'Punten (geformatteerd)': String(act.game_type) === 'team_vs_time' ? formatTimeMs(s.points) : (s.points || 0),
      'Reden': s.reason || ''
    }));
    scoresRows.push(...activityScores);

    const highs = computeHighscoresForActivity(act, act.scores || [], session.teams || [], session.players || []);
    const isTimeMode = String(act.game_type) === 'team_vs_time';
    highs.forEach(h => {
      highscoresRows.push({
        'Activiteit': act.name,
        'Sporttype': act.sport_type || '',
        'Speltype': act.game_type || '',
        'Type': h.entity_type === 'player' ? 'Speler' : 'Team',
        'ID': h.entity_id,
        'Naam': h.entity_name,
        'Totale Score': isTimeMode ? h.total_score : h.total_score,
        'Score (geformatteerd)': isTimeMode ? formatTimeMs(h.total_score) : h.total_score,
        'Aantal Scores': h.score_count || 0,
        'Rang': h.rank
      });
    });
  }

  if (scoresRows.length) {
    const scoresSheet = window.XLSX.utils.json_to_sheet(scoresRows);
    applySheetFormatting(scoresSheet, 'data');
    window.XLSX.utils.book_append_sheet(wb, scoresSheet, 'Alle Scores');
  }
  if (highscoresRows.length) {
    const highsSheet = window.XLSX.utils.json_to_sheet(highscoresRows);
    applySheetFormatting(highsSheet, 'rankings');
    window.XLSX.utils.book_append_sheet(wb, highsSheet, 'Highscores');
  }

  const fn = `${safeFilename(session.name || `sessie-${session.id}`)}_${new Date().toISOString().slice(0,10)}.xlsx`;
  window.XLSX.writeFile(wb, fn);
}

export async function exportSessionsToXlsx(sessions = []) {
  await ensureXlsxLoaded();
  const wb = window.XLSX.utils.book_new();

  const sessionSummaries = (sessions || []).map(s => ({
    'Sessie ID': s.id,
    'Sessienaam': s.name || '',
    'Aangemaakt op': s.created_at || '',
    'Voltooid op': s.updated_at || '',
    'Aantal Teams': (s.teams || []).length,
    'Aantal Activiteiten': (s.activities || []).length,
    'Aantal Spelers': (s.players || []).length
  }));

  if (sessionSummaries.length) {
    const summarySheet = window.XLSX.utils.json_to_sheet(sessionSummaries);
    window.XLSX.utils.book_append_sheet(wb, summarySheet, 'Sessies Overzicht');
  }

  // Combined scores
  const combinedRows = [];
  const activitiesMeta = {};
  for (const s of (sessions || [])) {
    for (const a of (s.activities || [])) {
      activitiesMeta[a.id] = { name: a.name, scoring_mode: a.scoring_mode, game_type: a.game_type };
      for (const sc of (a.scores || [])) {
        combinedRows.push(Object.assign({ session_id: s.id, session_name: s.name, activity_id: a.id, activity_name: a.name }, sc));
      }
    }
  }

  if (combinedRows.length) {
    const rows = combinedRows.map(s => ({
      'Tijdstempel': s.timestamp || '',
      'Sessie': s.session_name || '',
      'Activiteit': s.activity_name || '',
      'Ronde': s.round_number || '',
      'Team ID': s.team_id || '',
      'Speler ID': s.player_id || '',
      'Punten': s.points || 0
    }));
    const scoresSheet = window.XLSX.utils.json_to_sheet(rows);
    applySheetFormatting(scoresSheet, 'data');
    window.XLSX.utils.book_append_sheet(wb, scoresSheet, 'Alle Scores');

    // aggregated highs
    const agg = computeAggregatedHighscoresFromCombinedRows(combinedRows, activitiesMeta);
    const hsWithNames = agg.map(h => ({
      'Rang': h.rank,
      'Activiteit': h.activity_name,
      'Type': h.entity_type === 'player' ? 'Speler' : 'Team',
      'ID': h.entity_id,
      'Totale Score': h.total_score,
      'Aantal Scores': h.score_count || 0
    }));
    if (hsWithNames.length) {
      const highsSheet = window.XLSX.utils.json_to_sheet(hsWithNames);
      applySheetFormatting(highsSheet, 'rankings');
      window.XLSX.utils.book_append_sheet(wb, highsSheet, 'Top Prestaties');
    }

    // include global lists of teams/players/activities aggregated from supplied sessions
    const teamSeen = new Map();
    const playerSeen = new Map();
    const activitySeen = new Map();
    for (const s of (sessions || [])) {
      for (const t of (s.teams || [])) { if (!teamSeen.has(t.id)) teamSeen.set(t.id, t); }
      for (const p of (s.players || [])) { if (!playerSeen.has(p.id)) playerSeen.set(p.id, p); }
      for (const a of (s.activities || [])) { if (!activitySeen.has(a.id)) activitySeen.set(a.id, a); }
    }
    const teamsWithDutch = Array.from(teamSeen.values()).map(t => ({
      'Team ID': t.id,
      'Teamnaam': t.name,
      'Kleur': t.color || '',
      'Icoon': t.icon || '',
      'Beschrijving': t.description || ''
    }));
    if (teamsWithDutch.length) {
      const teamsSheet = window.XLSX.utils.json_to_sheet(teamsWithDutch);
      applySheetFormatting(teamsSheet, 'data');
      window.XLSX.utils.book_append_sheet(wb, teamsSheet, 'Alle Teams');
    }

    const playersWithDutch = Array.from(playerSeen.values()).map(p => ({
      'Speler ID': p.id,
      'Spelernaam': p.name,
      'Team ID': p.team_id || ''
    }));
    if (playersWithDutch.length) {
      const playersSheet = window.XLSX.utils.json_to_sheet(playersWithDutch);
      applySheetFormatting(playersSheet, 'data');
      window.XLSX.utils.book_append_sheet(wb, playersSheet, 'Alle Spelers');
    }

    const activitiesWithDutch = Array.from(activitySeen.values()).map(a => ({
      'Activiteit ID': a.id,
      'Activiteitnaam': a.name,
      'Sporttype': a.sport_type || '',
      'Speltype': a.game_type || '',
      'Scoremodus': a.scoring_mode || 'team',
      'Beschrijving': a.description || ''
    }));
    if (activitiesWithDutch.length) {
      const activitiesSheet = window.XLSX.utils.json_to_sheet(activitiesWithDutch);
      applySheetFormatting(activitiesSheet, 'data');
      window.XLSX.utils.book_append_sheet(wb, activitiesSheet, 'Alle Activiteiten');
    }
  }

  const fn = `sportscore_geschiedenis_${new Date().toISOString().slice(0,10)}.xlsx`;
  window.XLSX.writeFile(wb, fn);
}
