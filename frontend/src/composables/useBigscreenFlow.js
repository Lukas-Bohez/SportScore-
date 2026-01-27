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

  // Re-evaluate on connect (useful after reconnect)
  on('connect', () => {
    console.log('BigScreenFlow: socket connected -> evaluate');
    evaluateAndNavigate();
  });

  // Poll periodically as a fallback in case events are missed
  pollingInterval = setInterval(() => {
    evaluateAndNavigate();
  }, 5000);

  // Run an initial evaluation right away
  setTimeout(evaluateAndNavigate, 50);
}
