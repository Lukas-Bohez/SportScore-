import { ref } from 'vue';
import { useApi } from './useApi';
import { useSocket } from './useSocket';
import { useRouter, useRoute } from 'vue-router';

// Singleton guard so listeners are attached only once
let attached = false;
let pollingInterval = null;

export function initBigscreenFlow() {
  if (attached) return;
  attached = true;

  const router = useRouter();
  const route = useRoute();
  const { get } = useApi();
  const { connect, on } = useSocket();
  const qrVisible = ref(false);

  const safeReplace = (path) => {
    try {
      if (router.currentRoute.value.path !== path) {
        router.replace({ path }).catch((e) => console.warn('router.replace failed:', e));
      }
    } catch (e) {
      console.warn('safeReplace failed:', e);
    }
  };

  // Evaluate server state and choose the appropriate bigscreen screen
  const evaluateAndNavigate = async () => {
    try {
      // QR visibility has priority
      if (qrVisible.value) {
        safeReplace('/bigscreen/qrscreen');
        return;
      }

      // Try active session endpoint (returns single object or null)
      let session = null;
      try {
        const data = await get('/api/v1/sessions/active');
        session = data || null;
      } catch (err) {
        // If this fails, keep current view and try again later
        console.warn('Failed to fetch active session for bigscreen flow:', err);
        return;
      }

      if (!session) {
        // No active session -> show loading screen
        safeReplace('/bigscreen/loadingScreen');
        return;
      }

      // If session exists, navigate based on status
      const status = (session.status || '').toLowerCase();
      if (status === 'active') {
        // include session id in query so ScoreScreen can optionally load specific session
        safeReplace('/bigscreen/scorescreen');
      } else if (status === 'completed') {
        safeReplace('/bigscreen/podiumscreen');
      } else {
        safeReplace('/bigscreen/loadingScreen');
      }
    } catch (error) {
      console.error('Error in evaluateAndNavigate:', error);
    }
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
    on(ev, () => {
      console.log('BigScreenFlow: received', ev, '-> re-evaluating');
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

  // Events that indicate a client connected or session changed - re-evaluate and hide QR in many cases
  const hideQrAndEvaluate = () => {
    if (qrVisible.value) {
      qrVisible.value = false;
      console.log('BigScreenFlow: hiding QR due to connection/session event');
    }
    evaluateAndNavigate();
  };

  on('welcome', hideQrAndEvaluate);
  on('connected', hideQrAndEvaluate);
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

  // Poll periodically as a fallback in case events are missed
  pollingInterval = setInterval(() => {
    evaluateAndNavigate();
  }, 5000);

  // Run an initial evaluation right away
  setTimeout(evaluateAndNavigate, 50);
}
