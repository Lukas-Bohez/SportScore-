-- ===========================================
-- MIGRATIE SCRIPT: Oude naar Nieuwe Database Structuur
-- ===========================================
-- Dit script kan gebruikt worden om data van de oude structuur 
-- naar de nieuwe structuur te migreren (optioneel)
-- ===========================================

-- STAP 1: Migreer sessies naar games
INSERT INTO games (name, sport_id, game_type, status, start_time, current_round, total_rounds, time_limit, created_at, updated_at)
SELECT 
    s.name,
    (SELECT id FROM sports WHERE name = 'Teambuilding' LIMIT 1) as sport_id,
    CASE 
        WHEN s.game_type = 'quiz' THEN 'quiz'
        WHEN s.game_type IN ('sport_challenge', 'team_vs_time') THEN 'challenge'
        ELSE 'custom'
    END as game_type,
    s.status,
    s.created_at as start_time,
    s.current_round,
    s.total_rounds,
    s.time_limit,
    s.created_at,
    s.updated_at
FROM sessions s
WHERE EXISTS (SELECT 1 FROM sessions);

-- STAP 2: Migreer session_teams naar teams
INSERT INTO teams (game_id, name, color, icon, is_eliminated, created_at, updated_at)
SELECT 
    (SELECT g.id FROM games g WHERE g.name = s.name AND g.created_at = s.created_at LIMIT 1) as game_id,
    st.name,
    st.color,
    st.icon,
    st.is_eliminated,
    st.created_at,
    st.updated_at
FROM session_teams st
JOIN sessions s ON st.session_id = s.id
WHERE EXISTS (SELECT 1 FROM session_teams);

-- STAP 3: Migreer session_scores naar scores
INSERT INTO scores (game_id, team_id, player_id, points, score_type, reason, round_number, timestamp)
SELECT 
    (SELECT g.id FROM games g WHERE g.name = sess.name AND g.created_at = sess.created_at LIMIT 1) as game_id,
    (SELECT t.id FROM teams t 
     WHERE t.name = st.name 
     AND t.game_id = (SELECT g.id FROM games g WHERE g.name = sess.name AND g.created_at = sess.created_at LIMIT 1)
     LIMIT 1) as team_id,
    NULL as player_id,
    ss.points,
    'point' as score_type,
    ss.reason,
    ss.round_number,
    ss.timestamp
FROM session_scores ss
JOIN session_teams st ON ss.team_id = st.id
JOIN sessions sess ON ss.session_id = sess.id
WHERE EXISTS (SELECT 1 FROM session_scores);

-- STAP 4: Drop oude tabellen (alleen als migratie succesvol was)
-- Verwijder deze comments om de oude tabellen te verwijderen:
-- DROP TABLE IF EXISTS session_scores;
-- DROP TABLE IF EXISTS session_teams;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS scores; -- oude scores tabel
-- DROP TABLE IF EXISTS score_types;

-- VERIFICATIE: Controleer of alles gemigreerd is
SELECT 'Games' as Tabel, COUNT(*) as Aantal FROM games
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Scores', COUNT(*) FROM scores;
