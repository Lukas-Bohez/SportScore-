// Start Screen JavaScript
class StartScreen {
  constructor() {
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadActiveSession();
    this.loadRecentSessions();
  }

  bindElements() {
    this.sessionForm = document.getElementById('session-form');
    this.activeSessionDiv = document.getElementById('active-session');
    this.activeSessionInfo = document.getElementById('active-session-info');
    this.continueBtn = document.getElementById('continue-session');
    this.endBtn = document.getElementById('end-session');
    this.sessionsList = document.getElementById('sessions-list');
    this.viewAllSessionsBtn = document.getElementById('view-all-sessions-btn');

    // Log missing elements for debugging
    if (!this.sessionForm) console.warn('session-form element not found');
    if (!this.activeSessionDiv) console.warn('active-session element not found');
    if (!this.activeSessionInfo) console.warn('active-session-info element not found');
    if (!this.continueBtn) console.warn('continue-session element not found');
    if (!this.endBtn) console.warn('end-session element not found');
    if (!this.sessionsList) console.warn('sessions-list element not found');
    if (!this.viewAllSessionsBtn) console.warn('view-all-sessions-btn element not found');
  }

  setupEventListeners() {
    if (this.sessionForm) {
      this.sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createNewSession();
      });
    }

    if (this.continueBtn) {
      this.continueBtn.addEventListener('click', () => {
        this.continueSession();
      });
    }

    if (this.endBtn) {
      this.endBtn.addEventListener('click', () => {
        this.endSession();
      });
    }

    if (this.viewAllSessionsBtn) {
      this.viewAllSessionsBtn.addEventListener('click', () => {
        this.viewAllSessions();
      });
    }
  }

  async createNewSession() {
    const formData = new FormData(this.sessionForm);
    const sessionData = {
      name: document.getElementById('session-name').value,
      game_type: document.getElementById('game-type').value,
      max_teams: parseInt(document.getElementById('max-teams').value),
      total_rounds: parseInt(document.getElementById('total-rounds').value),
      time_limit: document.getElementById('time-limit').value ? parseInt(document.getElementById('time-limit').value) * 60 : null, // Convert to seconds
    };

    try {
      const response = await api.post('/api/v1/sessions', sessionData);
      if (response) {
        alert('Nieuwe sessie aangemaakt! Ga nu naar de team setup.');
        // Redirect to team setup page
        window.location.href = `teamsetup.html?session=${response.id}`;
      }
    } catch (error) {
      api.handleError(error, 'creating session');
      alert('Fout bij het aanmaken van de sessie. Probeer opnieuw.');
    }
  }

  async loadActiveSession() {
    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        this.showActiveSession(activeSession);
      }
    } catch (error) {
      // Distinguish between no active session and backend not reachable
      if (error instanceof TypeError) {
        // Network error likely means backend is down
        const container = document.getElementById('recent-sessions');
        if (container) {
          const warn = document.createElement('div');
          warn.className = 'warning-banner';
          warn.textContent = 'Kan geen verbinding maken met de backend op http://localhost:8000. Start de backend server en vernieuw deze pagina.';
          container.prepend(warn);
        }
        console.warn('Backend likely not running at API base URL.');
      } else {
        console.log('No active session found');
      }
    }
  }

  showActiveSession(session) {
    this.activeSessionDiv.classList.remove('hidden');

    const gameTypeNames = {
      custom: 'Aangepast',
      quiz: 'Quiz Modus',
      sport_challenge: 'Sport Challenge',
      random_bonus: 'Random Bonus',
      elimination: 'Elimination Mode',
      team_vs_time: 'Team vs Time',
    };

    this.activeSessionInfo.innerHTML = `
            <strong>${session.name}</strong><br>
            Type: ${gameTypeNames[session.game_type] || session.game_type}<br>
            Status: ${this.getStatusText(session.status)}<br>
            Ronde: ${session.current_round}/${session.total_rounds}<br>
            Max teams: ${session.max_teams}
        `;
  }

  async continueSession() {
    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        // Redirect to team setup or score input based on session status
        if (activeSession.status === 'setup') {
          window.location.href = `teamsetup.html?session=${activeSession.id}`;
        } else {
          window.location.href = `scoreinput.html?session=${activeSession.id}`;
        }
      }
    } catch (error) {
      api.handleError(error, 'continuing session');
    }
  }

  async endSession() {
    if (!confirm('Weet je zeker dat je deze sessie wilt beëindigen?')) {
      return;
    }

    try {
      const activeSession = await api.get('/api/v1/sessions/active');
      if (activeSession) {
        await api.put(`/api/v1/sessions/${activeSession.id}`, { status: 'completed' });
        alert('Sessie beëindigd!');
        window.location.reload();
      }
    } catch (error) {
      api.handleError(error, 'ending session');
    }
  }

  viewAllSessions() {
    // Load and display ALL sessions instead of redirecting to admin
    this.loadAllSessions();
  }

  async loadRecentSessions() {
    try {
      const response = await api.get('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      // Always render the section, even if empty, to replace the "Laden..." placeholder
      this.displayRecentSessions(sessions.slice(0, 5)); // Show up to 5 recent sessions
    } catch (error) {
      api.handleError(error, 'loading recent sessions');
      this.sessionsList.innerHTML = 'Fout bij het laden van sessies.';
    }
  }

  async loadAllSessions() {
    try {
      const response = await api.get('/api/v1/sessions');
      // Handle both response formats: {sessions: [...]} or [...] directly
      const sessions = Array.isArray(response) ? response : response.sessions || [];
      // Always render the section to show either the list or the empty state
      this.displayRecentSessions(sessions);
    } catch (error) {
      api.handleError(error, 'loading all sessions');
      this.sessionsList.innerHTML = 'Fout bij het laden van sessies.';
    }
  }

  displayRecentSessions(sessions) {
    if (sessions.length === 0) {
      this.sessionsList.innerHTML = 'Geen recente sessies gevonden.';
      return;
    }

    const sessionsHtml = sessions
      .map((session) => {
        const gameTypeNames = {
          custom: 'Aangepast',
          quiz: 'Quiz',
          sport_challenge: 'Sport',
          random_bonus: 'Bonus',
          elimination: 'Elimination',
          team_vs_time: 'Tijd',
        };

        return `
                <div class="session-item">
                    <div class="session-info">
                        <h3>${session.name}</h3>
                        <p>Type: ${gameTypeNames[session.game_type] || session.game_type} |
                           Status: ${this.getStatusText(session.status)} |
                           Aangemaakt: ${new Date(session.created_at).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div class="session-actions">
                        <button class="btn-small btn-primary" onclick="window.location.href='teamsetup.html?session=${session.id}'">Bewerken</button>
                        <button class="btn-small btn-secondary" onclick="window.location.href='leaderboard.html?session=${session.id}'">Bekijken</button>
                    </div>
                </div>
            `;
      })
      .join('');

    this.sessionsList.innerHTML = sessionsHtml;
  }

  getStatusText(status) {
    const statusMap = {
      setup: 'Setup',
      active: 'Actief',
      paused: 'Gepauzeerd',
      completed: 'Voltooid',
    };
    return statusMap[status] || status;
  }
}

// Initialize the start screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const startScreen = new StartScreen();
});
