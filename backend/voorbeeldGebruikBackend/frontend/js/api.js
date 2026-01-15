// API Client for Scoreboard Application
class ScoreboardAPI {
  constructor(baseURL = null) {
    // Auto-detect backend base URL with sensible fallbacks
    // Priority: window.SCOREBOARD_API_BASE -> ?apiBase=... -> default localhost:8000
    const fromGlobal = typeof window !== 'undefined' && window.SCOREBOARD_API_BASE;
    const fromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('apiBase') : null;
    const detected = fromGlobal || fromQuery;
    const fallback = typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000';

    this.baseURL = (baseURL || detected || fallback).replace(/\/$/, '');
    this.API_PREFIX = '/api/v1';
    this.socket = null;
    this.eventListeners = {};
    this.pollingInterval = null;
    this.lastLeaderboardData = null;
    this.pollingFallbackActive = false;

    // Initialize socket immediately for pages that need it
    if (typeof window !== 'undefined') {
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      const pagesNeedingSocket = ['index.html', 'simple-scoreinput.html', 'scoreinput.html', 'teamsetup.html', 'leaderboard.html', 'admin.html', 'simple-setup.html', 'index.html', 'SportScoreBigScreen.html'];
      if (pagesNeedingSocket.includes(currentPage)) {
        this.initSocket();
      }
    }
  }

  // Initialize Socket.IO connection
  initSocket() {
    console.log('API: Initializing Socket.IO connection to:', this.baseURL);
    if (typeof io !== 'undefined') {
      console.log('API: Socket.IO library found, creating connection...');
      this.socket = io(this.baseURL, {
        // Allow both polling and websocket transports like working config
        transports: ['polling', 'websocket'], // Allow both transports
        timeout: 30000, // 30 second timeout
        reconnection: true, // Enable reconnection like working config
        reconnectionAttempts: 10, // More retry attempts
        reconnectionDelay: 2000, // Start with 2 second delay
        reconnectionDelayMax: 10000, // Max 10 second delay
        forceNew: false, // Allow connection reuse like working config
        upgrade: true, // Allow websocket upgrade like working config
        rememberUpgrade: false, // Don't remember upgrade like working config
        multiplex: false, // Disable multiplexing
        withCredentials: false, // Disable credentials for CORS
        autoConnect: true, // Auto connect on creation
      });
      window.socket = this.socket;
      console.log('API: Socket.IO connection created, setting up listeners...');
      this.setupSocketListeners();

      // Set up fallback polling if Socket.IO fails
      this.socket.on('connect_error', (error) => {
        console.log('API: Socket.IO connection failed, starting polling fallback:', error.message);
        this.startPollingFallback();
      });

      this.socket.on('connect_timeout', () => {
        console.log('API: Socket.IO connection timeout, starting polling fallback');
        this.startPollingFallback();
      });
    } else {
      console.error('API: Socket.IO library not found, using polling fallback!');
      this.startPollingFallback();
    }
  }

  // Start polling fallback when Socket.IO fails
  startPollingFallback() {
    if (this.pollingFallbackActive) return;

    // Don't start polling if Socket.IO is still connecting
    if (this.socket && this.socket.connected) return;

    console.log('API: Starting polling fallback for real-time updates');
    this.pollingFallbackActive = true;

    // Poll every 5 seconds for updates
    this.pollingInterval = setInterval(async () => {
      try {
        const liveData = await this.getLiveLeaderboard();

        // Check if leaderboard data has changed
        if (this.hasLeaderboardChanged(liveData)) {
          console.log('API: Leaderboard changed, emitting update events');
          this.emitLeaderboardUpdateEvents(liveData);
          this.lastLeaderboardData = liveData;
        }
      } catch (error) {
        console.error('API: Polling fallback error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Emit connected event for fallback
    this.emit('connected');
  }

  // Check if leaderboard data has changed
  hasLeaderboardChanged(newData) {
    if (!this.lastLeaderboardData) return true;

    const oldLeaderboard = this.lastLeaderboardData.leaderboard || [];
    const newLeaderboard = newData.leaderboard || [];

    if (oldLeaderboard.length !== newLeaderboard.length) return true;

    // Check if any team scores have changed
    for (let i = 0; i < newLeaderboard.length; i++) {
      const oldTeam = oldLeaderboard[i];
      const newTeam = newLeaderboard[i];

      if (!oldTeam || !newTeam) return true;
      if (oldTeam.team_name !== newTeam.team_name) return true;
      if ((oldTeam.total_score || oldTeam.score || 0) !== (newTeam.total_score || newTeam.score || 0)) return true;
    }

    return false;
  }

  // Emit events based on leaderboard changes
  emitLeaderboardUpdateEvents(liveData) {
    const leaderboard = liveData.leaderboard || [];
    const oldLeaderboard = this.lastLeaderboardData?.leaderboard || [];

    // Emit team_update events for changed teams
    leaderboard.forEach((newTeam, index) => {
      const oldTeam = oldLeaderboard.find((t) => t.team_name === newTeam.team_name);

      if (!oldTeam || (oldTeam.total_score || oldTeam.score || 0) !== (newTeam.total_score || newTeam.score || 0)) {
        // Score changed
        this.emit('session_score_update', {
          session_id: liveData.session?.id,
          team_id: newTeam.team_id,
          points: (newTeam.total_score || newTeam.score || 0) - (oldTeam?.total_score || oldTeam?.score || 0),
          reason: 'Score update',
          round_number: 1,
          timestamp: new Date().toISOString(),
        });

        // Also emit team update
        this.emit('team_update', {
          session_id: liveData.session?.id,
          team_id: newTeam.team_id,
          team: {
            id: newTeam.team_id,
            name: newTeam.team_name,
            color: newTeam.team_color,
            icon: newTeam.team_icon,
            score: newTeam.total_score || newTeam.score || 0,
            total_score: newTeam.total_score || newTeam.score || 0,
            is_eliminated: newTeam.is_eliminated || false,
          },
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Check for new teams
    leaderboard.forEach((newTeam) => {
      const exists = oldLeaderboard.some((t) => t.team_name === newTeam.team_name);
      if (!exists) {
        this.emit('team_update', {
          session_id: liveData.session?.id,
          team_id: newTeam.team_id,
          team: {
            id: newTeam.team_id,
            name: newTeam.team_name,
            color: newTeam.team_color,
            icon: newTeam.team_icon,
            score: newTeam.total_score || newTeam.score || 0,
            total_score: newTeam.total_score || newTeam.score || 0,
            is_eliminated: newTeam.is_eliminated || false,
          },
          action: 'created',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Setup Socket.IO event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('API: Connected to server via Socket.IO');
      this.emit('connected');
      // Stop polling if Socket.IO connects successfully
      if (this.pollingFallbackActive) {
        console.log('API: Socket.IO connected, stopping polling fallback');
        this.stopPollingFallback();
      }
      // Emit admin_connected if not big screen
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (currentPage !== 'SportScoreBigScreen.html') {
        this.adminConnected();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('API: Disconnected from server');
      this.emit('disconnected');
      // Start polling fallback if Socket.IO disconnects
      if (!this.pollingFallbackActive) {
        this.startPollingFallback();
      }
      // Emit admin_disconnected if not big screen
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (currentPage !== 'SportScoreBigScreen.html') {
        this.adminDisconnected();
      }
    });

    // Session-specific events
    this.socket.on('session_score_update', (data) => {
      console.log('API: Received session_score_update event:', data);
      this.emit('session_score_update', data);
    });

    this.socket.on('session_status_update', (data) => {
      console.log('API: Received session_status_update event:', data);
      this.emit('session_status_update', data);
    });

    this.socket.on('team_update', (data) => {
      console.log('API: Received team_update event:', data);
      this.emit('team_update', data);
    });

    this.socket.on('session_update', (data) => {
      console.log('API: Received session_update event:', data);
      this.emit('session_update', data);
    });

    this.socket.on('session_created', (data) => {
      console.log('API: Received session_created event:', data);
      this.emit('session_created', data);
    });

    this.socket.on('welcome', (data) => {
      console.log('API: Received welcome event:', data);
      this.emit('welcome', data);
    });

    this.socket.on('test_event', (data) => {
      console.log('API: Received test_event:', data);
      this.emit('test_event', data);
    });

    // Legacy game events (for backward compatibility)
    this.socket.on('game_update', (data) => {
      console.log('API: Received game_update event:', data);
      this.emit('game_update', data);
    });

    this.socket.on('score_update', (data) => {
      console.log('API: Received score_update event:', data);
      this.emit('score_update', data);
    });

    this.socket.on('game_status_change', (data) => {
      console.log('API: Received game_status_change event:', data);
      this.emit('game_status_change', data);
    });

    this.socket.on('show-qr', (data) => {
      console.log('API: Received show-qr event:', data);
      this.emit('show-qr', data);
    });

    this.socket.on('set-qr', (data) => {
      console.log('API: Received set-qr event:', data);
      this.emit('set-qr', data);
    });

    this.socket.on('toggle-qr', (data) => {
      console.log('API: Received toggle-qr event:', data);
      this.emit('toggle-qr', data);
    });

    // Activity selection updates (propagate to pages like BigScreen)
    this.socket.on('set_active_activity', (data) => {
      console.log('API: Received set_active_activity event:', data);
      try {
        // Persist for same-origin tabs (e.g., BigScreen on same device)
        if (typeof window !== 'undefined' && window.localStorage) {
          if (data && typeof data.activityId !== 'undefined') {
            window.localStorage.setItem('activeActivityId', String(data.activityId));
          }
          if (data && typeof data.sessionId !== 'undefined') {
            window.localStorage.setItem('activeSessionId', String(data.sessionId));
          }
        }
      } catch (_) {}
      this.emit('set_active_activity', data);
    });
  }
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  // Remove a specific listener
  off(event, callback) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
  }

  // Add a one-time listener that auto-removes after first call
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => callback(data));
    }
  }

  // Stop polling fallback
  stopPollingFallback() {
    if (this.pollingInterval) {
      console.log('API: Stopping polling fallback');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.pollingFallbackActive = false;
    }
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const { silent, ...fetchOptions } = options;
    const config = {
      headers: {
        ...fetchOptions.headers,
      },
      ...fetchOptions,
      mode: 'cors',
      credentials: 'omit',
    };

    // Only set Content-Type for requests with a body
    if (options.body) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Gracefully handle empty/no-content responses
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      if (response.status === 204 || contentLength === '0') {
        return null;
      }
      if (!contentType.includes('application/json')) {
        // Try to parse text, but return null if empty
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return await response.json();
    } catch (error) {
      // Provide clearer diagnostics for network vs HTTP errors
      if (!silent) {
        if (error instanceof TypeError) {
          console.error(`API network error: Failed to fetch ${url}. Is the backend running at ${this.baseURL}?`, error);
        } else {
          console.error(`API request failed: ${endpoint}`, error);
        }
      }
      throw error;
    }
  }

  // Sports Management
  async getSports() {
    return this.request(`${this.API_PREFIX}/sports`);
  }

  async createSport(data) {
    return this.request(`${this.API_PREFIX}/sports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSport(id, data) {
    return this.request(`${this.API_PREFIX}/sports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSport(id) {
    return this.request(`${this.API_PREFIX}/sports/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams Management
  async getTeams() {
    return this.request(`${this.API_PREFIX}/teams`);
  }

  async createTeam(data) {
    return this.request(`${this.API_PREFIX}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id, data) {
    return this.request(`${this.API_PREFIX}/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id) {
    return this.request(`${this.API_PREFIX}/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Players Management
  async getPlayers() {
    return this.request(`${this.API_PREFIX}/players`);
  }

  async createPlayer(data) {
    return this.request(`${this.API_PREFIX}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlayer(id, data) {
    return this.request(`${this.API_PREFIX}/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id) {
    return this.request(`${this.API_PREFIX}/players/${id}`, {
      method: 'DELETE',
    });
  }

  // Games Management
  async getGames() {
    return this.request(`${this.API_PREFIX}/games`);
  }

  async createGame(data) {
    return this.request(`${this.API_PREFIX}/games`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGame(id, data) {
    return this.request(`${this.API_PREFIX}/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGame(id) {
    return this.request(`${this.API_PREFIX}/games/${id}`, {
      method: 'DELETE',
    });
  }

  async startGame(id) {
    return this.request(`${this.API_PREFIX}/games/${id}/start`, {
      method: 'POST',
    });
  }

  async endGame(id) {
    return this.request(`${this.API_PREFIX}/games/${id}/end`, {
      method: 'POST',
    });
  }

  async pauseGame(id) {
    return this.request(`${this.API_PREFIX}/games/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeGame(id) {
    return this.request(`${this.API_PREFIX}/games/${id}/resume`, {
      method: 'POST',
    });
  }

  // Scores Management
  async getScores(gameId = null) {
    const endpoint = gameId ? `${this.API_PREFIX}/scores?game_id=${gameId}` : `${this.API_PREFIX}/scores`;
    return this.request(endpoint);
  }

  async createScore(data) {
    return this.request(`${this.API_PREFIX}/scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScore(id, data) {
    return this.request(`${this.API_PREFIX}/scores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteScore(id) {
    return this.request(`${this.API_PREFIX}/scores/${id}`, {
      method: 'DELETE',
    });
  }

  // Generic HTTP methods
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Silent variants (suppress error logging in console)
  async postSilent(endpoint, data) {
    try {
      return await this.post(endpoint, data, { silent: true });
    } catch (e) {
      // Swallow network/HTTP errors and let caller rely on realtime ack/polling
      return null;
    }
  }

  async putSilent(endpoint, data) {
    try {
      return await this.request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
        silent: true,
      });
    } catch (e) {
      return null;
    }
  }

  async deleteSilent(endpoint) {
    try {
      return await this.request(endpoint, {
        method: 'DELETE',
        silent: true,
      });
    } catch (e) {
      return null;
    }
  }

  // Sessions Management
  async getSessions() {
    return this.request('/api/v1/sessions');
  }

  async getActiveSession() {
    return this.request('/api/v1/sessions/active');
  }

  async createSession(data) {
    return this.request('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSession(id) {
    return this.request(`/api/v1/sessions/${id}`);
  }

  async updateSession(id, data) {
    return this.request(`/api/v1/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(id) {
    return this.request(`/api/v1/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // Activities Management
  async getSessionActivities(sessionId) {
    return this.request(`/api/v1/sessions/${sessionId}/activities`);
  }

  async createSessionActivity(sessionId, data) {
    return this.request(`/api/v1/sessions/${sessionId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActivity(activityId) {
    return this.request(`/api/v1/activities/${activityId}`);
  }

  async updateActivity(activityId, data) {
    return this.request(`/api/v1/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteActivity(activityId) {
    return this.request(`/api/v1/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  async getActivityTeams(activityId) {
    return this.request(`/api/v1/activities/${activityId}/teams`);
  }

  async addActivityTeam(activityId, data) {
    return this.request(`/api/v1/activities/${activityId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeActivityTeam(activityId, teamId) {
    return this.request(`/api/v1/activities/${activityId}/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  async getActivityPlayers(activityId) {
    return this.request(`/api/v1/activities/${activityId}/players`);
  }

  async addActivityPlayer(activityId, data) {
    return this.request(`/api/v1/activities/${activityId}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeActivityPlayer(activityId, playerId) {
    return this.request(`/api/v1/activities/${activityId}/players/${playerId}`, {
      method: 'DELETE',
    });
  }

  async getActivityScores(activityId) {
    return this.request(`/api/v1/activities/${activityId}/scores`);
  }

  async createActivityScore(activityId, data) {
    return this.request(`/api/v1/activities/${activityId}/scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActivityLeaderboard(activityId) {
    return this.request(`/api/v1/activities/${activityId}/leaderboard`);
  }

  // Session Teams Management
  async getSessionTeams(sessionId) {
    return this.request(`/api/v1/sessions/${sessionId}/teams`);
  }

  async createSessionTeam(sessionId, data) {
    return this.request(`/api/v1/sessions/${sessionId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSessionTeam(sessionId, teamId, data) {
    return this.request(`/api/v1/sessions/${sessionId}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSessionTeam(sessionId, teamId) {
    return this.request(`/api/v1/sessions/${sessionId}/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  // Session Scores Management
  async getSessionScores(sessionId) {
    return this.request(`/api/v1/sessions/${sessionId}/scores`);
  }

  async createSessionScore(sessionId, data) {
    return this.request(`/api/v1/sessions/${sessionId}/scores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSessionScore(sessionId, scoreId, data) {
    return this.request(`/api/v1/sessions/${sessionId}/scores/${scoreId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSessionScore(sessionId, scoreId) {
    return this.request(`/api/v1/sessions/${sessionId}/scores/${scoreId}`, {
      method: 'DELETE',
    });
  }

  // Live Leaderboard
  async getLiveLeaderboard() {
    return this.request('/api/v1/live/leaderboard');
  }

  // Student Activity Scoring
  async createStudentActivityScore(sessionId, activityId, data) {
    return this.request(`/api/v1/student/session/${sessionId}/activity/${activityId}/score`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Standalone Teams Management
  async getAllStandaloneTeams() {
    return this.request('/api/v1/teams');
  }

  async getStandaloneTeam(teamId) {
    return this.request(`/api/v1/teams/${teamId}`);
  }

  async createStandaloneTeam(data) {
    return this.request('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStandaloneTeam(teamId, data) {
    return this.request(`/api/v1/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStandaloneTeam(teamId) {
    return this.request(`/api/v1/teams/${teamId}`, {
      method: 'DELETE',
    });
  }

  // Teams Management (alias for standalone)
  async getTeams() {
    return this.getAllStandaloneTeams();
  }

  async createTeam(data) {
    return this.createStandaloneTeam(data);
  }

  async updateTeam(id, data) {
    return this.updateStandaloneTeam(id, data);
  }

  async deleteTeam(id) {
    return this.deleteStandaloneTeam(id);
  }

  // Players Management
  async getPlayers() {
    return this.request('/api/v1/players');
  }

  async createPlayer(data) {
    return this.request('/api/v1/players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlayer(id, data) {
    return this.request(`/api/v1/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id) {
    return this.request(`/api/v1/players/${id}`, {
      method: 'DELETE',
    });
  }

  // Activities Management
  async getActivities() {
    return this.request('/api/v1/activities');
  }

  async createActivity(data) {
    return this.request('/api/v1/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateActivity(id, data) {
    return this.request(`/api/v1/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteActivity(id) {
    return this.request(`/api/v1/activities/${id}`, {
      method: 'DELETE',
    });
  }

  // Utility methods
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Socket.IO API methods
  adminConnected() {
    if (this.socket && this.socket.connected) {
      console.log('API: Emitting admin_connected');
      this.socket.emit('admin_connected');
    }
  }

  adminDisconnected() {
    if (this.socket && this.socket.connected) {
      console.log('API: Emitting admin_disconnected');
      this.socket.emit('admin_disconnected');
    }
  }

  toggleQR(state) {
    if (this.socket && this.socket.connected) {
      console.log('API: Emitting toggle-qr:', state);
      this.socket.emit('toggle-qr', state);
    }
  }

  // Global Activities
  async getActivities() {
    return this.request('/api/v1/activities');
  }

  async createActivity(data) {
    return this.request('/api/v1/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async deleteActivity(activityId) {
    return this.request(`/api/v1/activities/${activityId}`, {
      method: 'DELETE'
    });
  }

  // Error handling
  handleError(error, context = '') {
    console.error(`API Error${context ? ` (${context})` : ''}:`, error);
    // You can implement custom error handling here
    // e.g., show user notifications, retry logic, etc.
  }

  // Utility methods for consistent data handling across components

  /**
   * Safely extract array from API response
   * @param {Object} response - API response object
   * @param {string} key - The key containing the array (e.g., 'teams', 'activities', 'players')
   * @returns {Array} The array or empty array if not found
   */
  extractArray(response, key) {
    return (response && response[key]) || [];
  }

  /**
   * Find item by ID in API response array
   * @param {Object} response - API response object
   * @param {string} key - The key containing the array
   * @param {number|string} id - The ID to find
   * @returns {Object|null} The found item or null
   */
  findById(response, key, id) {
    const array = this.extractArray(response, key);
    return array.find(item => item.id == id) || null;
  }

  /**
   * Standardized error handling with user-friendly messages
   * @param {Error} error - The error object
   * @param {string} operation - What operation was being performed
   * @param {Object} data - Additional data for error messages (e.g., {name: 'Team Name'})
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error, operation, data = {}) {
    if (error.message.includes('409')) {
      if (operation.includes('team')) {
        return `Team met naam "${data.name || 'deze naam'}" bestaat al. Kies een andere naam.`;
      }
      if (operation.includes('activity')) {
        return `Activiteit met naam "${data.name || 'deze naam'}" bestaat al. Kies een andere naam.`;
      }
      if (operation.includes('player')) {
        return `Speler met naam "${data.name || 'deze naam'}" bestaat al. Kies een andere naam.`;
      }
    }
    if (error.message.includes('422')) {
      if (operation.includes('activity')) {
        return 'Activiteit kon niet worden aangemaakt. Controleer of alle velden correct zijn ingevuld.';
      }
      return 'Gegevens zijn ongeldig. Controleer alle velden.';
    }
    if (error.message.includes('404')) {
      return 'Item niet gevonden.';
    }
    if (error.message.includes('500')) {
      return 'Serverfout. Probeer het later opnieuw.';
    }
    return `Fout bij ${operation}.`;
  }

  /**
   * Extract form data with proper type conversion
   * @param {FormData} formData - The FormData object
   * @param {Object} fieldConfig - Configuration for each field {fieldName: {type: 'string'|'number'|'boolean', required: true|false}}
   * @returns {Object} Processed form data
   */
  extractFormData(formData, fieldConfig = {}) {
    const result = {};

    for (const [key, value] of formData.entries()) {
      if (fieldConfig[key]) {
        const config = fieldConfig[key];
        switch (config.type) {
          case 'number':
            result[key] = value ? parseInt(value, 10) : (config.required ? 0 : null);
            break;
          case 'boolean':
            result[key] = value === 'true' || value === '1';
            break;
          default:
            result[key] = value || null;
        }
      } else {
        result[key] = value || null;
      }
    }

    return result;
  }

  /**
   * Validate required fields
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   * @returns {Array} Array of missing field names, empty if all present
   */
  validateRequired(data, requiredFields) {
    return requiredFields.filter(field => !data[field] || data[field] === '');
  }

  /**
   * Safely extract array from API response object
   * @param {Object} response - API response object
   * @param {string} arrayKey - Key for the array (e.g., 'teams', 'activities', 'players')
   * @returns {Array} The array or empty array if not found
   */
  extractArray(response, arrayKey) {
    if (!response || typeof response !== 'object') {
      console.warn(`API response is not an object:`, response);
      return [];
    }
    const array = response[arrayKey];
    if (!Array.isArray(array)) {
      console.warn(`Expected array for key '${arrayKey}', got:`, array);
      return [];
    }
    return array;
  }

  /**
   * Find item by ID in API response array
   * @param {Object} response - API response object
   * @param {string} arrayKey - Key for the array (e.g., 'teams', 'activities', 'players')
   * @param {number|string} id - ID to search for
   * @returns {Object|null} Found item or null
   */
  findById(response, arrayKey, id) {
    const array = this.extractArray(response, arrayKey);
    return array.find(item => item.id === id) || null;
  }
}

// Create global API instance
const api = new ScoreboardAPI();
window.scoreboardAPI = api;
