import { useSocket } from './useSocket';
import { useApi } from './useApi';

/**
 * voteActivity(sessionId, activityId)
 * - emits a socket event 'vote_activity' with { session_id, activity_id }
 * - tries HTTP POST to backend endpoint (if server implements it)
 * - returns {success, method}
 */
export async function voteActivity(sessionId, activityId) {
  if (!sessionId || !activityId) return { success: false, error: 'missing-params' };

  const { connect, emit, isConnected, socket } = useSocket();
  const { post } = useApi();

  try {
    connect();
  } catch (_) {}

  // Try socket first. If not currently connected, wait up to 500ms for a connect event
  try {
    // Quick sync in case socket existed but the ref wasn't updated
    try { if (socket && socket.connected) isConnected.value = true; } catch (_) {}

    if (!isConnected.value && socket) {
      // Wait briefly for on-connect
      await new Promise((resolve) => {
        let done = false;
        const onConnect = () => { if (!done) { done = true; resolve(true); } };
        try { socket.once('connect', onConnect); } catch (_) { }
        setTimeout(() => { if (!done) { done = true; resolve(false); } }, 500);
      }).then((connected) => {
        if (connected) isConnected.value = true;
      }).catch(() => {});
    }

    if (isConnected.value) {
      emit('vote_activity', { session_id: sessionId, activity_id: activityId });
      console.log('voteActivity: emitted via socket', { session_id: sessionId, activity_id: activityId });
      return { success: true, method: 'socket' };
    }
  } catch (e) {
    console.warn('voteActivity: socket emit failed', e);
  }

  // Fall back to HTTP POST (server may implement this). If window.SCOREBOARD_API_BASE was set by the socket layer it will be used.
  try {
    await post(`/api/v1/sessions/${sessionId}/activities/${activityId}/vote`, {});
    console.log('voteActivity: posted via http', { session_id: sessionId, activity_id: activityId });
    return { success: true, method: 'http' };
  } catch (e) {
    console.warn('voteActivity: http post failed', e);
    return { success: false, error: e };
  }
}
