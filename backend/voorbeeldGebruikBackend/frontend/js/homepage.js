// homepage.js - Handles the homepage functionality

class Homepage {
  constructor() {
    this.api = new ScoreboardAPI();
    this.sessionsList = document.getElementById('sessions-list');
    this.templatesList = document.getElementById('templates-list');
    this.init();
  }

  async init() {
    await this.loadSessions();
    await this.loadTemplates();
  }

  async loadSessions() {
    try {
      const response = await this.api.getSessions();
      const sessions = response.sessions || [];

      // Filter completed sessions and get winners
      const completedSessions = sessions.filter((s) => s.status === 'completed');

      if (completedSessions.length === 0) {
        this.sessionsList.innerHTML = '<p>Geen gespeelde sessies gevonden.</p>';
        return;
      }

      // Load winners for each session
      const sessionsWithWinners = await Promise.all(
        completedSessions.slice(0, 5).map(async (session) => {
          const winnerInfo = await this.getSessionWinner(session);
          return { ...session, winner: winnerInfo };
        })
      );

      const sessionsHtml = sessionsWithWinners
        .map((session) => {
          const date = new Date(session.created_at).toLocaleDateString('nl-NL');
          const winnerText = session.winner ? `${session.winner.name}${session.winner.points ? ` (${session.winner.points} punten)` : ''}` : 'Onbekend';
          let playersHtml = '';
          if (session.winner && session.winner.players) {
            playersHtml = '<div class="players">' + session.winner.players.map((p) => `<div>${p.name}: ${p.score} punten</div>`).join('') + '</div>';
          }
          return `
                    <div class="session-item">
                        <div>
                            <h4>${session.name}</h4>
                            <div class="winner">Winnaar: ${winnerText}</div>
                            <div class="date">Datum: ${date}</div>
                            ${playersHtml}
                        </div>
                    </div>
                `;
        })
        .join('');

      this.sessionsList.innerHTML = sessionsHtml;
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessionsList.innerHTML = '<p>Fout bij laden sessies.</p>';
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
          name: `${winner.team}, speler ${winner.name}`,
          points: winner.score,
          players: null, // Don't show duplicate
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
          players: sortedTeamPlayers,
        };
      } else {
        // For team mode, no players
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

        return {
          name: winner.name,
          points: winner.score,
          players: null,
        };
      }
    } catch (error) {
      console.error('Error getting winner for session', session.id, error);
      return null;
    }
  }

  async loadTemplates() {
    try {
      const templates = JSON.parse(localStorage.getItem('sportScoreTemplates') || '[]');

      if (templates.length === 0) {
        this.templatesList.innerHTML = '<p>Geen templates gevonden.</p>';
        return;
      }

      const templatesHtml = templates
        .map(
          (template) => `
                <div class="template-item">
                    <div>
                        <h4>${template.name}</h4>
                    </div>
                    <div class="template-actions">
                        <button class="btn" onclick="homepage.loadTemplate(${template.id})">Gebruiken</button>
                        <button class="delete-team-btn" onclick="homepage.deleteTemplate(${template.id})">Verwijderen</button>
                    </div>
                </div>
            `
        )
        .join('');

      this.templatesList.innerHTML = templatesHtml;
    } catch (error) {
      console.error('Error loading templates:', error);
      this.templatesList.innerHTML = '<p>Fout bij laden templates.</p>';
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
