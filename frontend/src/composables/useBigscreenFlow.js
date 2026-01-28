import { ref } from 'vue';
import { useApi } from './useApi';
import { useSocket } from './useSocket';
import { useRouter } from 'vue-router';

// Singleton guard so listeners are attached only once
let attached = false;
let pollingInterval = null;

export function initBigscreenFlow() {
  if (attached) return;
  attached = true;

  const router = useRouter();
  const { get } = useApi();
  const { connect, on, emit } = useSocket();
  const qrVisible = ref(false);

  const safeReplace = (path) => {
    try {
      // Be defensive: router or currentRoute may be undefined in some runtime situations
      if (router && router.currentRoute && router.currentRoute.value && router.currentRoute.value.path !== path) {
        console.log('BigScreenFlow: safeReplace -> using router.replace ->', path);
        router.replace({ path })
          .then(() => console.log('BigScreenFlow: navigation success ->', path))
          .catch((e) => console.warn('router.replace failed:', e));
        return;
      }
    } catch (e) {
      console.warn('safeReplace failed (router):', e);
    }

    // Router not available or didn't navigate; prefer HTML5 History API so history-mode router reacts
    try {
      const safePath = path.startsWith('/') ? path : `/${path}`;
      console.warn('BigScreenFlow: safeReplace fallback -> using history.replaceState ->', safePath);

      if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
        const newUrl = `${window.location.origin}${safePath}${window.location.search || ''}`;
        window.history.replaceState({}, '', newUrl);
        // Emit popstate so the history-mode router picks up the change
        try {
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (e) {
          // Fallback: generic event
          window.dispatchEvent(new Event('popstate'));
        }
        return;
      }
    } catch (e) {
      console.warn('safeReplace history fallback failed:', e);
    }

    // Final fallback: hash-based navigation (should be rare now)
    try {
      const safePath = path.startsWith('/') ? path : `/${path}`;
      const hash = `#${safePath}`;
      console.warn('BigScreenFlow: safeReplace final fallback -> updating location to', hash);

      if (typeof window !== 'undefined') {
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${hash}`);
          window.dispatchEvent(new Event('hashchange'));
        } else {
          window.location.hash = hash;
        }
      }
    } catch (e) {
      console.warn('safeReplace final fallback failed:', e);
      try {
        window.location.replace(`${window.location.origin}/#${path}`);
      } catch (_) {}
    }
  };

  // Normalize various socket payload wrappers (some events arrive like [payload])
  const normalizePayload = (raw) => {
    if (Array.isArray(raw) && raw.length > 0) return raw[0];
    if (raw && typeof raw === 'object' && raw.data !== undefined) return raw.data || raw;
    return raw;
  };

  // Evaluate server state and choose the appropriate bigscreen screen
  const evaluateAndNavigate = async () => {
    console.log('BigScreenFlow: evaluateAndNavigate start', { qrVisible: qrVisible.value });
    try {
      // QR visibility has priority
      if (qrVisible.value) {
        console.log('BigScreenFlow: QR visible -> staying on qrscreen');
        safeReplace('/bigscreen/qrscreen');
        return;
      }

      // Try active session endpoint (returns single object or null)
      let session = null;
      try {
        const data = await get('/api/v1/sessions/active');
        session = data || null;
        console.log('BigScreenFlow: fetched active session ->', session);
      } catch (err) {
        // If this fails (network/backend), fall back to loading screen
        console.warn('Failed to fetch active session for bigscreen flow, showing loading_screen fallback:', err);
        safeReplace('/bigscreen/loadingScreen');
        return;
      }

      if (!session) {
        // No active session -> but check if a recent session was just completed -> show podium
        try {
          console.log('BigScreenFlow: no active session -> checking recently completed sessions');
          const allSessionsRes = await get('/api/v1/sessions');
          const allSessions = allSessionsRes.sessions || allSessionsRes || [];
          // Filter completed, sort by updated_at desc
          const completed = allSessions
            .filter(s => (s.status || '').toLowerCase() === 'completed')
            .sort((a, b) => new Date(b.updated_at || b.updatedAt || 0) - new Date(a.updated_at || a.updatedAt || 0));

          if (completed && completed.length > 0) {
            const latest = completed[0];
            // If it was completed recently (within 30s), show podium; otherwise show loading
            const updatedTs = new Date(latest.updated_at || latest.updatedAt || Date.now()).getTime();
            const ageMs = Date.now() - updatedTs;
            console.log('BigScreenFlow: latest completed session:', latest.id, 'ageMs:', ageMs);
            if (ageMs < 30000) {
              console.log('BigScreenFlow: navigating to podium for recently completed session:', latest.id);
              safeReplace('/bigscreen/podiumscreen' + (latest.id ? `?session=${latest.id}` : ''));
              return;
            }
          }
        } catch (e) {
          console.warn('BigScreenFlow: failed checking completed sessions fallback:', e);
        }

        // Fallback: no active or recent completed session -> show QR so new players can connect
        console.log('BigScreenFlow: no active session -> showing QR screen');
        safeReplace('/bigscreen/qrscreen');
        return;
      }

      // If session exists, navigate based on status
      const status = (session.status || '').toLowerCase();
      console.log('BigScreenFlow: session status ->', status);
      if (status === 'active') {
        // include session id in query so ScoreScreen can optionally load specific session
        safeReplace('/bigscreen/scorescreen');
      } else if (status === 'completed') {
        // Include session id so PodiumScreen can load the relevant session's activities
        safeReplace('/bigscreen/podiumscreen' + (session && session.id ? `?session=${session.id}` : ''));
      } else {
        safeReplace('/bigscreen/loadingScreen');
      }
    } catch (error) {
      console.error('Error in evaluateAndNavigate:', error);
    } finally {
      // Do not force a navigation away from the QR screen automatically —
      // this caused a brief Loading screen flicker when QR was intended to be shown.
      console.log('BigScreenFlow: evaluateAndNavigate end');
    }
  };

  // Events that indicate a client connected or session changed - re-evaluate and hide QR in many cases
  const hideQrAndEvaluate = (payload) => {
    try {
      const p = normalizePayload(payload) || {};
      const status = (p && (p.status || (p.session && p.session.status))) || null;
      const sessionId = p.session_id || (p.session && p.session.id) || null;
      if (status && String(status).toLowerCase() === 'completed') {
        console.log('BigScreenFlow: hideQrAndEvaluate detected completed session -> navigating to podium for session:', sessionId);
        safeReplace('/bigscreen/podiumscreen' + (sessionId ? `?session=${sessionId}` : ''));
        return;
      }
    } catch (e) {
      console.warn('BigScreenFlow: hideQrAndEvaluate payload parse failed', e);
    }

    if (qrVisible.value) {
      qrVisible.value = false;
      console.log('BigScreenFlow: hiding QR due to connection/session event');
    }
    evaluateAndNavigate();
  };

  // Connect socket and attach listeners
  try {
    connect();
  } catch (_) {}

  // Important socket events which may affect which screen to show
  const refreshEvents = [
    'session_created',
    'session_update',
    'session_status_update',
    'session_deleted',
    'activity_completed',
  ];

  refreshEvents.forEach((ev) => {
    on(ev, (payload) => {
      console.log('BigScreenFlow: received', ev, '-> payload:', payload);
      try {
        const p = normalizePayload(payload) || {};
        console.log('BigScreenFlow: parsed payload ->', p);
        const status = (p && (p.status || (p.session && p.session.status))) || null;
        const sessionId = p.session_id || (p.session && p.session.id) || null;
        if (status && String(status).toLowerCase() === 'completed') {
          // If server explicitly indicated this session is completed, navigate to podium for that session
          console.log('BigScreenFlow: session completed -> navigating to podium for session:', sessionId);
          safeReplace('/bigscreen/podiumscreen' + (sessionId ? `?session=${sessionId}` : ''));
          return;
        }
      } catch (e) {
        console.warn('BigScreenFlow: failed to parse event payload', e);
      }

      // Fallback: re-evaluate via API
      evaluateAndNavigate();
    });
  });

  // QR visibility control (backend emits boolean or wrapped payload)
  on('set-qr', (payload) => {
    let value = payload;
    try {
      if (payload && typeof payload === 'object') {
        value = payload.data !== undefined ? payload.data : (payload.data || payload);
      }
    } catch (_e) {}
    qrVisible.value = !!value;
    console.log('BigScreenFlow: set-qr ->', qrVisible.value);
    evaluateAndNavigate();
  });

  // Also react to legacy/show events
  on('show-qr', () => {
    qrVisible.value = true;
    console.log('BigScreenFlow: show-qr');
    evaluateAndNavigate();
  });

  on('qr-state', (payload) => {
    try {
      const value = (payload && typeof payload === 'object') ? (payload.data !== undefined ? payload.data : (payload.data || payload)) : payload;
      qrVisible.value = !!value;
      console.log('BigScreenFlow: qr-state ->', qrVisible.value);
      evaluateAndNavigate();
    } catch (e) {
      console.warn('BigScreenFlow: qr-state parsing failed', e);
    }
  });

  // Allow server to request direct navigation e.g. via /api/v1/bigscreen/navigate
  // Payload expected: { screen: '<name-or-path>', session_id: <id>, data: {...} }
  on('bigscreen:navigate', (payload) => {
    try {
      const p = payload || {};
      const screen = (typeof p === 'string' ? p : (p.screen || null));
      const sessionId = p.session_id || p.session || null;
      if (!screen) return;

      // Normalize to a path: allow either 'scorescreen' or full '/bigscreen/scorescreen'
      const path = screen.startsWith('/') ? screen : `/bigscreen/${String(screen).replace(/^\/+/, '')}`;
      const query = sessionId ? { session: sessionId } : undefined;

      console.log('BigScreenFlow: server requested navigate ->', path, query);
      safeReplace(path + (query ? `?session=${sessionId}` : ''));
    } catch (e) {
      console.warn('BigScreenFlow: failed handling bigscreen:navigate', e);
    }
  });

  // Allow PodiumScreen to notify we're done rotating and that flow should re-evaluate
  on('bigscreen:rotation_done', () => {
    console.log('BigScreenFlow: received rotation_done -> re-evaluating');
    evaluateAndNavigate();
  });

  // Also listen for client-side notifications should a local component dispatch an event
  try {
    window.addEventListener && window.addEventListener('bigscreen:rotation_done', () => {
      console.log('BigScreenFlow: window rotation_done event -> re-evaluating');
      evaluateAndNavigate();
    });
  } catch (e) {}

  on('welcome', hideQrAndEvaluate);
  on('connected', hideQrAndEvaluate);
  on('player_joined', hideQrAndEvaluate);
  on('player_connected', hideQrAndEvaluate);
  on('session_created', hideQrAndEvaluate);
  on('session_update', hideQrAndEvaluate);
  on('session_status_update', hideQrAndEvaluate);

  // Re-evaluate on connect (useful after reconnect). Also emit current qr-state so server knows we're showing/hiding the QR
  on('connect', () => {
    console.log('BigScreenFlow: socket connected -> evaluate');
    try {
      // let server know current QR state (server might store/emit to others)
      if (typeof emit === 'function') emit('qr-state', qrVisible.value);
    } catch (e) {}
    evaluateAndNavigate();
  });

  // Server requests to set the active activity for the bigscreen
  // Payload may be { activity_id: <id>, session_id: <id>, data: { ... } }
  on('set_active_activity', (payload) => {
    try {
      const p = payload || {};
      const activityId = p.activity_id || p.activityId || (p.data && p.data.activity_id) || null;
      const sessionId = p.session_id || p.sessionId || (p.data && p.data.session_id) || null;
      if (activityId) {
        // store selection so ScoreScreen loads the requested activity
        try {
          localStorage.setItem('selectedActivityId', String(activityId));
          localStorage.setItem('lastActivityUpdate', String(Date.now()));
        } catch (e) {}
      }
      console.log('BigScreenFlow: set_active_activity -> navigating to scorescreen', { activityId, sessionId });
      // include session id in query when provided so the scorescreen can prefer that session
      safeReplace('/bigscreen/scorescreen' + (sessionId ? `?session=${sessionId}` : ''));
    } catch (e) {
      console.warn('BigScreenFlow: failed handling set_active_activity', e);
    }
  });

  // When scores are updated for a session, ensure we navigate to the scorescreen
  on('session_score_update', (payload) => {
    console.log('BigScreenFlow: session_score_update -> re-evaluating and navigating to scorescreen', payload);
    evaluateAndNavigate();
    try {
      const p = payload || {};
      const sessionId = p.session_id || p.sessionId || (p.data && p.data.session_id) || null;
      safeReplace('/bigscreen/scorescreen' + (sessionId ? `?session=${sessionId}` : ''));
    } catch (e) {}
  });

  // Activity completed -> show podium
  on('activity_completed', (payload) => {
    console.log('BigScreenFlow: activity_completed -> navigating to podium', payload);
    safeReplace('/bigscreen/podiumscreen');
  });

  // Poll periodically as a fallback in case events are missed
  pollingInterval = setInterval(() => {
    evaluateAndNavigate();
  }, 5000);

  // Run an initial evaluation right away
  setTimeout(evaluateAndNavigate, 50);
}