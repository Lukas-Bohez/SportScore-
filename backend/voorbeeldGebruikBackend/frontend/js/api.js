/**
 * API Client for Scoreboard Application
 * Handles HTTP requests and Real-time Socket.IO events.
 */
class ScoreboardAPI {
    // Configuration Constants
    static PAGES_NEEDING_SOCKET = [
        'index.html', 'simple-scoreinput.html', 'scoreinput.html', 
        'teamsetup.html', 'leaderboard.html', 'admin.html', 
        'simple-setup.html', 'SportScoreBigScreen.html'
    ];

    static SOCKET_EVENTS = [
        'session_score_update', 'session_status_update', 'team_update',
        'session_update', 'session_created', 'welcome', 'test_event',
        'game_update', 'score_update', 'game_status_change',
        'show-qr', 'set-qr', 'toggle-qr',
        'round_started', 'round_ended', 'round_changed', 'round_paused', 
        'round_resumed', 'round_time_update', 'round_auto_advanced', 'activity_completed'
    ];

    constructor(baseURL = null) {
        this._initBaseURL(baseURL);
        this.API_PREFIX = '/api/v1';
        
        // State
        this.socket = null;
        this.eventListeners = {};
        this.pollingInterval = null;
        this.lastLeaderboardData = null;
        this.pollingFallbackActive = false;

        // Auto-initialize socket if on specific pages
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            // Handle root path or specific files
            const currentPage = path === '/' || path.endsWith('/') 
                ? 'index.html' 
                : path.split('/').pop();

            if (ScoreboardAPI.PAGES_NEEDING_SOCKET.includes(currentPage)) {
                this.initSocket();
            }
        }
    }

    /**
     * Internal helper to determine API Base URL
     */
    _initBaseURL(manualBase) {
        if (manualBase) {
            this.baseURL = manualBase.replace(/\/$/, '');
            return;
        }

        let detected = null;
        if (typeof window !== 'undefined') {
            detected = window.SCOREBOARD_API_BASE || 
                       new URLSearchParams(window.location.search).get('apiBase');
            
            if (!detected) {
                detected = `http://${window.location.hostname}:8000`;
            }
        } else {
            detected = 'http://localhost:8000';
        }

        this.baseURL = detected.replace(/\/$/, '');
    }

    // ==========================================
    // SOCKET.IO & REALTIME HANDLING
    // ==========================================

    initSocket() {
        console.log('API: Initializing Socket.IO connection to:', this.baseURL);

        if (typeof io === 'undefined') {
            console.error('API: Socket.IO library not found, using polling fallback!');
            this.startPollingFallback();
            return;
        }

        this.socket = io(this.baseURL, {
            transports: ['polling', 'websocket'],
            timeout: 30000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            autoConnect: true,
        });

        window.socket = this.socket;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Connection Lifecycle
        this.socket.on('connect', () => {
            console.log('API: Connected via Socket.IO');
            this.emit('connected');
            this.stopPollingFallback();
            
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage !== 'SportScoreBigScreen.html') {
                this.socket.emit('admin_connected');
            }
        });

        this.socket.on('disconnect', () => {
            console.log('API: Disconnected');
            this.emit('disconnected');
            this.startPollingFallback();
            
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage !== 'SportScoreBigScreen.html') {
                this.socket.emit('admin_disconnected');
            }
        });

        this.socket.on('connect_error', (err) => {
            console.log('API: Connection error, starting polling:', err.message);
            this.startPollingFallback();
        });

        // Dynamic Event Binding (Replaces repetitive code)
        ScoreboardAPI.SOCKET_EVENTS.forEach(eventName => {
            this.socket.on(eventName, (data) => {
                console.log(`API: Received ${eventName}:`, data);
                this.emit(eventName, data);
            });
        });

        // Special Case: set_active_activity (Needs LocalStorage logic)
        this.socket.on('set_active_activity', (data) => {
            console.log('API: Received set_active_activity:', data);
            if (typeof window !== 'undefined' && window.localStorage && data) {
                if (data.activityId) window.localStorage.setItem('activeActivityId', String(data.activityId));
                if (data.sessionId) window.localStorage.setItem('activeSessionId', String(data.sessionId));
            }
            this.emit('set_active_activity', data);
        });
    }

    // ==========================================
    // POLLING FALLBACK SYSTEM
    // ==========================================

    startPollingFallback() {
        if (this.pollingFallbackActive) return;
        if (this.socket && this.socket.connected) return;

        console.log('API: Starting polling fallback');
        this.pollingFallbackActive = true;
        this.emit('connected'); // Pretend we are connected

        this.pollingInterval = setInterval(async () => {
            try {
                const liveData = await this.getLiveLeaderboard();
                if (this.hasLeaderboardChanged(liveData)) {
                    console.log('API: Leaderboard changed (Polling), emitting updates');
                    this.emitLeaderboardUpdateEvents(liveData);
                    this.lastLeaderboardData = liveData;
                }
            } catch (error) {
                console.error('API: Polling error:', error);
            }
        }, 5000);
    }

    stopPollingFallback() {
        if (this.pollingInterval) {
            console.log('API: Stopping polling fallback');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.pollingFallbackActive = false;
        }
    }

    hasLeaderboardChanged(newData) {
        if (!this.lastLeaderboardData) return true;
        
        // Simple JSON string comparison is often faster/safer for deep objects than manual iteration
        // provided keys order is deterministic (usually is from same backend)
        // However, sticking to your logic for specific field checking:
        const oldL = this.lastLeaderboardData.leaderboard || [];
        const newL = newData.leaderboard || [];

        if (oldL.length !== newL.length) return true;

        for (let i = 0; i < newL.length; i++) {
            const o = oldL[i];
            const n = newL[i];
            if (!o || !n) return true;
            if (o.team_name !== n.team_name) return true;
            
            const oldScore = o.total_score || o.score || 0;
            const newScore = n.total_score || n.score || 0;
            if (oldScore !== newScore) return true;
        }
        return false;
    }

    emitLeaderboardUpdateEvents(liveData) {
        const leaderboard = liveData.leaderboard || [];
        const oldLeaderboard = this.lastLeaderboardData?.leaderboard || [];

        leaderboard.forEach(newTeam => {
            const oldTeam = oldLeaderboard.find(t => t.team_name === newTeam.team_name);
            const newScore = newTeam.total_score || newTeam.score || 0;
            const oldScore = oldTeam ? (oldTeam.total_score || oldTeam.score || 0) : 0;

            const teamPayload = {
                id: newTeam.team_id,
                name: newTeam.team_name,
                color: newTeam.team_color,
                icon: newTeam.team_icon,
                score: newScore,
                total_score: newScore,
                is_eliminated: newTeam.is_eliminated || false,
            };

            // Existing team updated
            if (oldTeam && oldScore !== newScore) {
                this.emit('session_score_update', {
                    session_id: liveData.session?.id,
                    team_id: newTeam.team_id,
                    points: newScore - oldScore,
                    reason: 'Score update',
                    timestamp: new Date().toISOString()
                });
                
                this.emit('team_update', {
                    session_id: liveData.session?.id,
                    team_id: newTeam.team_id,
                    team: teamPayload,
                    timestamp: new Date().toISOString()
                });
            } 
            // New team created
            else if (!oldTeam) {
                this.emit('team_update', {
                    session_id: liveData.session?.id,
                    team_id: newTeam.team_id,
                    team: teamPayload,
                    action: 'created',
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // ==========================================
    // EVENT EMITTER IMPLEMENTATION
    // ==========================================

    on(event, callback) {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // ==========================================
    // CORE HTTP REQUEST METHODS
    // ==========================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const { silent, ...fetchOptions } = options;
        
        const config = {
            mode: 'cors',
            credentials: 'omit',
            ...fetchOptions,
            headers: { ...fetchOptions.headers }
        };

        if (options.body && typeof options.body === 'string') {
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle No Content
            if (response.status === 204) return null;

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return text ? JSON.parse(text) : null;

        } catch (error) {
            if (!silent) {
                console.error(`API Request Failed: ${endpoint}`, error);
            }
            throw error;
        }
    }

    async get(endpoint) { return this.request(endpoint); }
    
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // Silent Wrappers
    async postSilent(endpoint, data) { return this.post(endpoint, data, { silent: true }).catch(() => null); }
    async putSilent(endpoint, data) { return this.put(endpoint, data, { silent: true }).catch(() => null); }
    async deleteSilent(endpoint) { return this.delete(endpoint, { silent: true }).catch(() => null); }

    // ==========================================
    // DOMAIN METHODS: SPORTS & TEAMS
    // ==========================================

    getSports() { return this.get(`${this.API_PREFIX}/sports`); }
    createSport(data) { return this.post(`${this.API_PREFIX}/sports`, data); }
    updateSport(id, data) { return this.put(`${this.API_PREFIX}/sports/${id}`, data); }
    deleteSport(id) { return this.delete(`${this.API_PREFIX}/sports/${id}`); }

    // Unified Teams (Standalone)
    getTeams() { return this.get(`${this.API_PREFIX}/teams`); }
    getStandaloneTeam(id) { return this.get(`${this.API_PREFIX}/teams/${id}`); }
    createTeam(data) { return this.post(`${this.API_PREFIX}/teams`, data); }
    updateTeam(id, data) { return this.put(`${this.API_PREFIX}/teams/${id}`, data); }
    deleteTeam(id) { return this.delete(`${this.API_PREFIX}/teams/${id}`); }

    getPlayers() { return this.get(`${this.API_PREFIX}/players`); }
    createPlayer(data) { return this.post(`${this.API_PREFIX}/players`, data); }
    updatePlayer(id, data) { return this.put(`${this.API_PREFIX}/players/${id}`, data); }
    deletePlayer(id) { return this.delete(`${this.API_PREFIX}/players/${id}`); }

    // ==========================================
    // DOMAIN METHODS: GAMES & SCORES
    // ==========================================

    getGames() { return this.get(`${this.API_PREFIX}/games`); }
    createGame(data) { return this.post(`${this.API_PREFIX}/games`, data); }
    updateGame(id, data) { return this.put(`${this.API_PREFIX}/games/${id}`, data); }
    deleteGame(id) { return this.delete(`${this.API_PREFIX}/games/${id}`); }
    
    // Game Control
    startGame(id) { return this.post(`${this.API_PREFIX}/games/${id}/start`, {}); }
    endGame(id) { return this.post(`${this.API_PREFIX}/games/${id}/end`, {}); }
    pauseGame(id) { return this.post(`${this.API_PREFIX}/games/${id}/pause`, {}); }
    resumeGame(id) { return this.post(`${this.API_PREFIX}/games/${id}/resume`, {}); }

    getScores(gameId = null) {
        return this.get(gameId ? `${this.API_PREFIX}/scores?game_id=${gameId}` : `${this.API_PREFIX}/scores`);
    }
    createScore(data) { return this.post(`${this.API_PREFIX}/scores`, data); }
    updateScore(id, data) { return this.put(`${this.API_PREFIX}/scores/${id}`, data); }
    deleteScore(id) { return this.delete(`${this.API_PREFIX}/scores/${id}`); }

    // ==========================================
    // DOMAIN METHODS: SESSIONS & ACTIVITIES
    // ==========================================

    getSessions() { return this.get('/api/v1/sessions'); }
    getActiveSession() { return this.get('/api/v1/sessions/active'); }
    createSession(data) { return this.post('/api/v1/sessions', data); }
    getSession(id) { return this.get(`/api/v1/sessions/${id}`); }
    updateSession(id, data) { return this.put(`/api/v1/sessions/${id}`, data); }
    deleteSession(id) { return this.delete(`/api/v1/sessions/${id}`); }

    // Global Activities
    getActivities() { return this.get('/api/v1/activities'); }
    createActivity(data) { return this.post('/api/v1/activities', data); }
    getActivity(id) { return this.get(`/api/v1/activities/${id}`); }
    updateActivity(id, data) { return this.put(`/api/v1/activities/${id}`, data); }
    deleteActivity(id) { return this.delete(`/api/v1/activities/${id}`); }

    // Session-Activity Relations
    getSessionActivities(sessionId) { return this.get(`/api/v1/sessions/${sessionId}/activities`); }
    createSessionActivity(sessionId, data) { return this.post(`/api/v1/sessions/${sessionId}/activities`, data); }

    // Activity Management (Teams/Players)
    getActivityTeams(activityId) { return this.get(`/api/v1/activities/${activityId}/teams`); }
    addActivityTeam(activityId, data) { return this.post(`/api/v1/activities/${activityId}/teams`, data); }
    removeActivityTeam(activityId, teamId) { return this.delete(`/api/v1/activities/${activityId}/teams/${teamId}`); }

    getActivityPlayers(activityId) { return this.get(`/api/v1/activities/${activityId}/players`); }
    addActivityPlayer(activityId, data) { return this.post(`/api/v1/activities/${activityId}/players`, data); }
    removeActivityPlayer(activityId, playerId) { return this.delete(`/api/v1/activities/${activityId}/players/${playerId}`); }

    // Activity Scoring
    getActivityScores(activityId) { return this.get(`/api/v1/activities/${activityId}/scores`); }
    createActivityScore(activityId, data) { return this.post(`/api/v1/activities/${activityId}/scores`, data); }
    getActivityLeaderboard(activityId) { return this.get(`/api/v1/activities/${activityId}/leaderboard`); }

    // Round Control
    startActivityRound(activityId) { return this.post(`/api/v1/activities/${activityId}/rounds/start`, {}); }
    endActivityRound(activityId) { return this.post(`/api/v1/activities/${activityId}/rounds/end`, {}); }
    nextActivityRound(activityId) { return this.post(`/api/v1/activities/${activityId}/rounds/next`, {}); }
    pauseActivityRound(activityId) { return this.post(`/api/v1/activities/${activityId}/rounds/pause`, {}); }
    resumeActivityRound(activityId) { return this.post(`/api/v1/activities/${activityId}/rounds/resume`, {}); }
    getRoundStatus(activityId) { return this.get(`/api/v1/activities/${activityId}/rounds/status`); }

    // Session Teams/Scores
    getSessionTeams(sessionId) { return this.get(`/api/v1/sessions/${sessionId}/teams`); }
    createSessionTeam(sessionId, data) { return this.post(`/api/v1/sessions/${sessionId}/teams`, data); }
    updateSessionTeam(sessionId, teamId, data) { return this.put(`/api/v1/sessions/${sessionId}/teams/${teamId}`, data); }
    deleteSessionTeam(sessionId, teamId) { return this.delete(`/api/v1/sessions/${sessionId}/teams/${teamId}`); }

    getSessionScores(sessionId) { return this.get(`/api/v1/sessions/${sessionId}/scores`); }
    createSessionScore(sessionId, data) { return this.post(`/api/v1/sessions/${sessionId}/scores`, data); }
    updateSessionScore(sessionId, scoreId, data) { return this.put(`/api/v1/sessions/${sessionId}/scores/${scoreId}`, data); }
    deleteSessionScore(sessionId, scoreId) { return this.delete(`/api/v1/sessions/${sessionId}/scores/${scoreId}`); }

    // Student specific
    createStudentActivityScore(sessionId, activityId, data) {
        return this.post(`/api/v1/student/session/${sessionId}/activity/${activityId}/score`, data);
    }

    // ==========================================
    // UTILITIES & HELPERS
    // ==========================================

    getLiveLeaderboard() { return this.get('/api/v1/live/leaderboard'); }

    toggleQR(state) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('toggle-qr', state);
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatDuration(seconds) {
        if (!seconds && seconds !== 0) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        
        return hours > 0 
            ? `${hours}:${pad(minutes)}:${pad(secs)}`
            : `${minutes}:${pad(secs)}`;
    }

    /**
     * Helper: Extract safe array from API Response
     */
    extractArray(response, key) {
        if (!response || typeof response !== 'object') return [];
        const arr = response[key];
        return Array.isArray(arr) ? arr : [];
    }

    /**
     * Helper: Find item by ID in response array
     */
    findById(response, key, id) {
        return this.extractArray(response, key).find(item => item.id == id) || null;
    }

    /**
     * Helper: Convert error messages to user-friendly text
     */
    getErrorMessage(error, operation, data = {}) {
        const msg = error.message || '';
        if (msg.includes('409')) {
            const entity = operation.includes('team') ? 'Team' 
                : operation.includes('player') ? 'Speler' 
                : 'Activiteit';
            return `${entity} met naam "${data.name || 'deze naam'}" bestaat al.`;
        }
        if (msg.includes('422')) return 'Ongeldige gegevens. Controleer alle velden.';
        if (msg.includes('404')) return 'Item niet gevonden.';
        if (msg.includes('500')) return 'Serverfout. Probeer het later opnieuw.';
        return `Fout bij ${operation}.`;
    }

    /**
     * Helper: Extract typed data from FormData
     */
    extractFormData(formData, fieldConfig = {}) {
        const result = {};
        for (const [key, value] of formData.entries()) {
            const config = fieldConfig[key];
            if (config) {
                if (config.type === 'number') {
                    result[key] = value ? parseInt(value, 10) : (config.required ? 0 : null);
                } else if (config.type === 'boolean') {
                    result[key] = (value === 'true' || value === '1');
                } else {
                    result[key] = value || null;
                }
            } else {
                result[key] = value || null;
            }
        }
        return result;
    }

    validateRequired(data, requiredFields) {
        return requiredFields.filter(field => 
            data[field] === undefined || data[field] === null || data[field] === ''
        );
    }

    /**
     * Standardized error handler used across UIs.
     * - Logs the error with context
     * - Optionally shows a non-blocking console-friendly alert in dev
     * - Is intentionally lightweight to avoid breaking callers
     */
    handleError(error, operation = 'operation') {
        try {
            console.error(`API Error [${operation}]:`, error);

            // Try to provide a nice console warning for devs
            const message = (error && (error.message || error.error || error.detail)) || String(error);
            if (typeof window !== 'undefined' && window && window.location && window.location.hostname !== 'localhost') {
                // In production, avoid noisy alerts – keep it in console
                console.warn(`API: ${operation} failed: ${message}`);
            } else if (typeof window !== 'undefined' && typeof alert === 'function') {
                // For local/dev use, show a lightweight alert so users notice
                alert(`Fout bij ${operation}: ${message}`);
            }
        } catch (e) {
            console.error('API.handleError failed:', e);
        }
    }
}


// Global Instance
const api = new ScoreboardAPI();
window.scoreboardAPI = api;