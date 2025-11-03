// API Client for Scoreboard Application
class ScoreboardAPI {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.socket = null;
    this.eventListeners = {};
  }

  // Initialize Socket.IO connection
  initSocket() {
    if (typeof io !== 'undefined') {
      this.socket = io(this.baseURL, {
        // Enhanced configuration for better reliability and compatibility
        transports: ['polling', 'websocket'], // Try polling first for compatibility
        timeout: 30000, // 30 second timeout
        reconnection: true, // Enable reconnection
        reconnectionAttempts: 10, // More retry attempts
        reconnectionDelay: 2000, // Start with 2 second delay
        reconnectionDelayMax: 10000, // Max 10 second delay
        forceNew: false, // Allow connection reuse
        upgrade: true, // Allow upgrade to websocket
        rememberUpgrade: false, // Don't remember across sessions
        autoConnect: true, // Auto connect on creation
        cors: {
          origin: 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: false,
        },
      });
      this.setupSocketListeners();
    }
  }

  // Setup Socket.IO event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.emit('disconnected');
    });

    // Session-specific events
    this.socket.on('session_score_update', (data) => {
      this.emit('session_score_update', data);
    });

    this.socket.on('session_status_update', (data) => {
      this.emit('session_status_update', data);
    });

    this.socket.on('team_update', (data) => {
      this.emit('team_update', data);
    });

    this.socket.on('session_update', (data) => {
      this.emit('session_update', data);
    });

    this.socket.on('session_created', (data) => {
      this.emit('session_created', data);
    });

    // Legacy game events (for backward compatibility)
    this.socket.on('game_update', (data) => {
      this.emit('game_update', data);
    });

    this.socket.on('score_update', (data) => {
      this.emit('score_update', data);
    });

    this.socket.on('game_status_change', (data) => {
      this.emit('game_status_change', data);
    });
  }

  // Custom event emitter for API events
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => callback(data));
    }
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        ...options.headers,
      },
      ...options,
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
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Sports Management
  async getSports() {
    return this.request('/sports');
  }

  async createSport(data) {
    return this.request('/sports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSport(id, data) {
    return this.request(`/sports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSport(id) {
    return this.request(`/sports/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams Management
  async getTeams() {
    return this.request('/teams');
  }

  async createTeam(data) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id, data) {
    return this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id) {
    return this.request(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Players Management
  async getPlayers() {
    return this.request('/players');
  }

  async createPlayer(data) {
    return this.request('/players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlayer(id, data) {
    return this.request(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id) {
    return this.request(`/players/${id}`, {
      method: 'DELETE',
    });
  }

  // Games Management
  async getGames() {
    return this.request('/games');
  }

  async createGame(data) {
    return this.request('/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGame(id, data) {
    return this.request(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGame(id) {
    return this.request(`/games/${id}`, {
      method: 'DELETE',
    });
  }

  async startGame(id) {
    return this.request(`/games/${id}/start`, {
      method: 'POST',
    });
  }

  async endGame(id) {
    return this.request(`/games/${id}/end`, {
      method: 'POST',
    });
  }

  async pauseGame(id) {
    return this.request(`/games/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeGame(id) {
    return this.request(`/games/${id}/resume`, {
      method: 'POST',
    });
  }

  // Scores Management
  async getScores(gameId = null) {
    const endpoint = gameId ? `/scores?game_id=${gameId}` : '/scores';
    return this.request(endpoint);
  }

  async createScore(data) {
    return this.request('/scores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScore(id, data) {
    return this.request(`/scores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteScore(id) {
    return this.request(`/scores/${id}`, {
      method: 'DELETE',
    });
  }

  // Generic HTTP methods
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
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

  // Error handling
  handleError(error, context = '') {
    console.error(`API Error${context ? ` (${context})` : ''}:`, error);
    // You can implement custom error handling here
    // e.g., show user notifications, retry logic, etc.
  }
}

// Create global API instance
const api = new ScoreboardAPI();

// Initialize socket connection when DOM is ready - only for pages that need real-time updates
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize Socket.IO for pages that need it
  const currentPage = window.location.pathname.split('/').pop();
  const pagesNeedingSocket = ['index.html', 'scoreinput.html', 'teamsetup.html', 'admin.html'];

  if (pagesNeedingSocket.includes(currentPage)) {
    api.initSocket();
  }
});
