// Simple Score Input JavaScript
class SimpleScoreInput {
  constructor() {
    this.sessionId = new URLSearchParams(window.location.search).get('session');
    this.session = null;
    this.teams = [];
    this.isSubmitting = false;

    if (!this.sessionId) {
      alert('Geen sessie ID gevonden. Ga terug naar de setup.');
      window.location.href = 'simple-setup.html';
      return;
    }

    this.init();
  }

  async init() {
    this.bindElements();
    this.setupEventListeners();
    await this.loadSession();
    await this.loadTeams();
    await this.loadLeaderboard();
    this.setupHotkeys();
  }

  bindElements() {
    this.sessionName = document.getElementById('session-name');
    this.roundInfo = document.getElementById('round-info');
    this.timer = document.getElementById('timer');
    this.leaderboard = document.getElementById('leaderboard');
    this.teamSelect = document.getElementById('team-select');
    this.playerSelect = document.getElementById('player-select');
    this.playerGroup = document.getElementById('player-group');
    this.pointsInput = document.getElementById('points-input');
    this.reasonInput = document.getElementById('reason-input');
    this.submitScoreBtn = document.getElementById('submit-score-btn');
    this.subtractBtn = document.getElementById('subtract-btn');
    this.addBtn = document.getElementById('add-btn');
    this.pauseSessionBtn = document.getElementById('pause-session-btn');
    this.nextRoundBtn = document.getElementById('next-round-btn');
    this.endSessionBtn = document.getElementById('end-session-btn');
    this.scoreAnimation = document.getElementById('score-animation');
    this.animTeamIcon = document.getElementById('anim-team-icon');
    this.animScoreChange = document.getElementById('anim-score-change');
    this.animTeamName = document.getElementById('anim-team-name');
  }

  setupEventListeners() {
    this.submitScoreBtn.addEventListener('click', () => this.submitScore());
    this.subtractBtn.addEventListener('click', () => this.adjustPoints(-1));
    this.addBtn.addEventListener('click', () => this.adjustPoints(1));
    this.pauseSessionBtn.addEventListener('click', () => this.pauseSession());
    this.nextRoundBtn.addEventListener('click', () => this.nextRound());
    this.endSessionBtn.addEventListener('click', () => this.endSession());
    this.teamSelect.addEventListener('change', () => this.updatePlayers());
  }

  setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key >= '0' && e.key <= '9') {
        this.pointsInput.value = e.key;
      } else if (e.key === 'Enter') {
        this.submitScore();
      } else if (e.key === '-') {
        this.adjustPoints(-1);
      } else if (e.key === '+') {
        this.adjustPoints(1);
      }
    });
  }

  adjustPoints(delta) {
    const current = parseInt(this.pointsInput.value) || 0;
    this.pointsInput.value = current + delta;
  }

  async loadSession() {
    try {
      this.session = await window.api.getSession(this.sessionId);
      this.sessionName.textContent = this.session.name;
      this.roundInfo.textContent = `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
      if (this.session.scoring_mode === 'player') {
        this.playerGroup.style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }

  async loadTeams() {
    try {
      const teamsResponse = await window.api.getSessionTeams(this.sessionId);
      this.teams = teamsResponse.teams || teamsResponse || [];
      this.updateTeamSelect();
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }

  updateTeamSelect() {
    this.teamSelect.innerHTML = '<option value="">Kies een team...</option>' + this.teams.map((team) => `<option value="${team.id}">${team.name}</option>`).join('');
  }

  async updatePlayers() {
    const teamId = this.teamSelect.value;
    if (!teamId) return;

    try {
      const players = await window.api.getTeamPlayers(teamId);
      this.playerSelect.innerHTML = '<option value="">Heel team / geen specifieke speler</option>' + players.map((player) => `<option value="${player.id}">${player.name}</option>`).join('');
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  async loadLeaderboard() {
    try {
      const leaderboard = await window.api.getLiveLeaderboard(this.sessionId);
      this.renderLeaderboard(leaderboard.leaderboard);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  renderLeaderboard(teams) {
    this.leaderboard.innerHTML = teams
      .map(
        (team, index) => `
      <div class="team-row ${index === 0 ? 'leader' : ''}">
        <div class="rank">${index + 1}</div>
        <div class="team-name">${team.name}</div>
        <div class="score">${team.score}</div>
      </div>
    `
      )
      .join('');
  }

  async submitScore() {
    if (this.isSubmitting) return;

    const teamId = this.teamSelect.value;
    const playerId = this.playerSelect.value || null;
    const points = parseInt(this.pointsInput.value) || 0;
    const reason = this.reasonInput.value.trim();

    if (!teamId || points === 0) {
      alert('Selecteer een team en geef punten op.');
      return;
    }

    this.isSubmitting = true;
    this.submitScoreBtn.disabled = true;

    try {
      await window.api.createSessionScore(this.sessionId, {
        team_id: teamId,
        player_id: playerId,
        points: points,
        reason: reason,
      });

      this.showScoreAnimation(points, this.teams.find((t) => t.id == teamId).name);
      this.pointsInput.value = '1';
      this.reasonInput.value = '';
      await this.loadLeaderboard();
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Fout bij toevoegen score: ' + error.message);
    } finally {
      this.isSubmitting = false;
      this.submitScoreBtn.disabled = false;
    }
  }

  showScoreAnimation(points, teamName) {
    this.animScoreChange.textContent = (points > 0 ? '+' : '') + points;
    this.animTeamName.textContent = teamName;
    this.scoreAnimation.classList.add('show');

    setTimeout(() => {
      this.scoreAnimation.classList.remove('show');
    }, 2000);
  }

  async pauseSession() {
    // Implement pause logic if needed
    alert('Pauze functie nog niet geïmplementeerd.');
  }

  async nextRound() {
    try {
      await window.api.updateSession(this.sessionId, { current_round: this.session.current_round + 1 });
      this.session.current_round++;
      this.roundInfo.textContent = `Ronde ${this.session.current_round}/${this.session.total_rounds}`;
    } catch (error) {
      console.error('Error advancing round:', error);
    }
  }

  async endSession() {
    if (confirm('Weet je zeker dat je de sessie wilt beëindigen?')) {
      try {
        await window.api.updateSession(this.sessionId, { status: 'ended' });
        window.location.href = 'leaderboard.html?session=' + this.sessionId;
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
  }
}

// Initialize API and app
window.api = new ScoreboardAPI();
window.api.initSocket();

const simpleScoreInput = new SimpleScoreInput();
