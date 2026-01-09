// homepage.js - Handles the homepage functionality

class Homepage {
  constructor() {
    this.api = new ScoreboardAPI();
    this.templatesGrid = document.getElementById('templates-grid');
    this.sessionsList = document.getElementById('sessions-list');
    this.currentView = 'simple'; // 'simple' or 'detailed'
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupViewToggle();
    await this.loadTemplates();
    await this.loadSessions();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (section === 'teams') {
          // Navigate to team management page
          window.location.href = 'startscreen.html';
        } else {
          this.showSection(section);
        }
      });
    });
  }

  setupViewToggle() {
    const simpleBtn = document.getElementById('simple-view');
    const detailedBtn = document.getElementById('detailed-view');

    if (simpleBtn && detailedBtn) {
      simpleBtn.addEventListener('click', () => {
        this.currentView = 'simple';
        simpleBtn.classList.add('active');
        detailedBtn.classList.remove('active');
        this.loadSessions();
      });

      detailedBtn.addEventListener('click', () => {
        this.currentView = 'detailed';
        detailedBtn.classList.add('active');
        simpleBtn.classList.remove('active');
        this.loadSessions();
      });
    }
  }

  showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
  }

  async loadTemplates() {
    if (!this.templatesGrid) return;

    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');

      if (templates.length === 0) {
        this.templatesGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Geen templates gevonden. Maak eerst een sessie aan en sla deze op als template.</p>';
        return;
      }

      const templatesHtml = templates
        .map(
          (template) => `
            <div class="template-card">
              <h3>${template.name}</h3>
              <p>${template.description || 'Geen beschrijving'}</p>
              <div class="template-actions">
                <button class="btn" onclick="homepage.loadTemplate(${template.id})">Gebruiken</button>
                <button class="delete-team-btn" onclick="homepage.deleteTemplate(${template.id})">Verwijderen</button>
              </div>
            </div>
          `
        )
        .join('');

      this.templatesGrid.innerHTML = templatesHtml;
    } catch (error) {
      console.error('Error loading templates:', error);
      if (this.templatesGrid) {
        this.templatesGrid.innerHTML = '<p>Fout bij laden templates.</p>';
      }
    }
  }

  async loadSessions() {
    if (!this.sessionsList) return;

    try {
      const response = await this.api.getSessions();
      const sessions = response.sessions || [];

      // Filter completed sessions
      const completedSessions = sessions.filter((s) => s.status === 'completed');

      if (completedSessions.length === 0) {
        this.sessionsList.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Geen gespeelde sessies gevonden.</p>';
        return;
      }

      // Load winners for each session
      const sessionsWithWinners = await Promise.all(
        completedSessions.map(async (session) => {
          const winnerInfo = await this.getSessionWinner(session);
          return { ...session, winner: winnerInfo };
        })
      );

      const sessionsHtml = sessionsWithWinners
        .map((session) => {
          const date = new Date(session.created_at).toLocaleDateString('nl-NL');
          const winnerText = session.winner ? `${session.winner.name}${session.winner.points ? ` (${session.winner.points} punten)` : ''}` : 'Onbekend';

          let extraDetails = '';
          if (this.currentView === 'detailed' && session.winner && session.winner.players) {
            extraDetails = '<div class="players">' + session.winner.players.map((p) => `<div>${p.name}: ${p.score} punten</div>`).join('') + '</div>';
          }

          return `
            <div class="session-item">
              <h4>${session.name}</h4>
              <div class="details">Winnaar: ${winnerText}</div>
              <div class="details">Datum: ${date}</div>
              ${extraDetails}
              <button class="btn" onclick="window.location.href='leaderboard.html?session=${session.id}'">Bekijken</button>
            </div>
          `;
        })
        .join('');

      this.sessionsList.innerHTML = sessionsHtml;
    } catch (error) {
      console.error('Error loading sessions:', error);
      if (this.sessionsList) {
        this.sessionsList.innerHTML = '<p>Fout bij laden sessies.</p>';
      }
    }
  }

  async getSessionWinner(session) {
    try {
      const scoresResponse = await this.api.getSessionScores(session.id);
      const scores = scoresResponse.scores || [];

      if (session.scoring_mode === 'player') {
        // For player mode, winner is the player with highest score
        const [playersResponse, teamsResponse] = await Promise.all([this.api.getPlayers(), this.api.getSessionTeams(session.id)]);
        const players = playersResponse.players || [];
        const teams = teamsResponse.teams || [];
        const playerMap = {};
        const teamMap = {};
        players.forEach((p) => {
          playerMap[p.id] = { name: p.name, team_id: p.team_id };
        });
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const playerScores = {};
        scores.forEach((score) => {
          if (score.player_id) {
            if (!playerScores[score.player_id]) playerScores[score.player_id] = 0;
            playerScores[score.player_id] += score.points;
          }
        });

        const sortedPlayers = Object.entries(playerScores)
          .map(([id, score]) => ({
            id,
            name: playerMap[id]?.name || 'Onbekend',
            team: teamMap[playerMap[id]?.team_id] || 'Onbekend',
            score,
          }))
          .sort((a, b) => b.score - a.score);

        if (sortedPlayers.length === 0) return null;

        const winner = sortedPlayers[0];
        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedPlayers.slice(0, 5) : null // Top 5 for detailed view
        };
      } else if (session.scoring_mode === 'team_with_players') {
        // For team_with_players, winner is the team, show players of winning team
        const teamsResponse = await this.api.getSessionTeams(session.id);
        const teams = teamsResponse.teams || [];
        const teamMap = {};
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const teamScores = {};
        scores.forEach((score) => {
          if (score.team_id) {
            if (!teamScores[score.team_id]) teamScores[score.team_id] = 0;
            teamScores[score.team_id] += score.points;
          }
        });

        const sortedTeams = Object.entries(teamScores)
          .map(([id, score]) => ({ id, name: teamMap[id] || 'Onbekend', score }))
          .sort((a, b) => b.score - a.score);

        if (sortedTeams.length === 0) return null;

        const winner = sortedTeams[0];

        // Get players for the winning team
        const playersResponse = await this.api.request(`/api/v1/sessions/${session.id}/teams/${winner.id}/players`);
        const teamPlayers = playersResponse.players || [];

        const playerScores = {};
        teamPlayers.forEach((p) => (playerScores[p.id] = { name: p.name || p.player_name, score: 0 }));
        scores.forEach((score) => {
          if (score.player_id && playerScores[score.player_id]) {
            playerScores[score.player_id].score += score.points;
          }
        });

        const sortedTeamPlayers = Object.values(playerScores).sort((a, b) => b.score - a.score);

        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedTeamPlayers : null
        };
      } else {
        // For team mode, winner is the team with highest score
        const teamsResponse = await this.api.getSessionTeams(session.id);
        const teams = teamsResponse.teams || [];
        const teamMap = {};
        teams.forEach((t) => (teamMap[t.id] = t.name));

        const teamScores = {};
        scores.forEach((score) => {
          if (score.team_id) {
            if (!teamScores[score.team_id]) teamScores[score.team_id] = 0;
            teamScores[score.team_id] += score.points;
          }
        });

        const sortedTeams = Object.entries(teamScores)
          .map(([id, score]) => ({
            id,
            name: teamMap[id] || 'Onbekend',
            score,
          }))
          .sort((a, b) => b.score - a.score);

        if (sortedTeams.length === 0) return null;

        const winner = sortedTeams[0];
        return {
          name: winner.name,
          points: winner.score,
          players: this.currentView === 'detailed' ? sortedTeams.slice(0, 3) : null // Top 3 teams for detailed view
        };
      }
    } catch (error) {
      console.error('Error getting session winner:', error);
      return null;
    }
  }

  async loadTemplate(templateId) {
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
      const template = templates.find((t) => t.id == templateId);
      if (!template) {
        alert('Template niet gevonden.');
        return;
      }

      // Store template data in sessionStorage and redirect to simple-setup
      sessionStorage.setItem('templateData', JSON.stringify(template.template_data));
      window.location.href = 'simple-setup.html';
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Fout bij laden template.');
    }
  }

  deleteTemplate(templateId) {
    if (confirm('Weet je zeker dat je deze template wilt verwijderen?')) {
      try {
        const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');
        const updated = templates.filter((t) => t.id != templateId);
        localStorage.setItem('sportScoreTemplates', JSON.stringify(updated));
        this.loadTemplates(); // Refresh the list
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Fout bij verwijderen template.');
      }
    }
  }
}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.homepage = new Homepage();
});
