
// Team vs Time logic for ScoreInput
class ScoreInputTeamVsTime {
	constructor(parent) {
		this.parent = parent;
		// Timer State (for countdown)
		this.timeRemaining = 0;
		this.timerInterval = null;
		// Round State
		this.currentActivity = null;
		this.roundStatus = 'not_started';
		this.currentRound = 1;
		this.totalRounds = 1;
		this.roundStartTime = null;
		this.timeLimitPerRound = null;
		this.roundTimeRemaining = 0;
		this.roundTimerInterval = null;
	}

	// Time Mode Helpers
	async setTimeFromInputs() {
		if (!this.validateTimeInputs()) return;
		const desiredMs = this.getTimeFromInputs();
		const { teamId, playerId } = this.getTeamAndPlayer();
		if (!teamId) {
			alert('Selecteer een team.');
			return;
		}
		this.parent.disableSubmitButtons();
		try {
			const currentMs = await this.getCurrentRecordedMs(teamId, playerId);
			const deltaMs = desiredMs - currentMs;
			console.debug('Set Time:', { teamId, playerId, desiredMs, currentMs, deltaMs });
			if (deltaMs === 0) {
				this.parent.showScoreFeedback('Tijd is al ingesteld op die waarde', 'info');
				return;
			}
			const newMs = Math.max(0, currentMs + deltaMs);
			this.parent.elements.pointsInput.value = SharedUtils.formatMs(newMs);
			await this.submitDeltaScore(deltaMs, teamId, playerId);
		} finally {
			this.parent.enableSubmitButtons();
		}
	}
	async addTimeFromInputs() {
		if (!this.validateTimeInputs()) return;
		const deltaMs = this.getTimeFromInputs();
		const { teamId, playerId } = this.getTeamAndPlayer();
		if (!teamId) {
			alert('Selecteer een team.');
			return;
		}
		this.parent.disableSubmitButtons();
		try {
			const currentMs = await this.getCurrentRecordedMs(teamId, playerId);
			const newMs = Math.max(0, currentMs + deltaMs);
			console.debug('Add Time:', { teamId, playerId, deltaMs, currentMs, newMs });
			this.parent.elements.pointsInput.value = SharedUtils.formatMs(newMs);
			await this.submitDeltaScore(deltaMs, teamId, playerId);
		} finally {
			this.parent.enableSubmitButtons();
		}
	}
	validateTimeInputs() {
		const mins = parseInt(this.parent.elements.setMinutes?.value) || 0;
		const secs = parseInt(this.parent.elements.setSeconds?.value) || 0;
		const ms = parseInt(this.parent.elements.setMs?.value) || 0;
		if (secs < 0 || secs > 59 || ms < 0 || ms > 999 || mins < 0) {
			alert('Voer een geldige tijd in (seconden 0-59, milliseconden 0-999).');
			return false;
		}
		return true;
	}
	getTimeFromInputs() {
		const mins = parseInt(this.parent.elements.setMinutes?.value) || 0;
		const secs = parseInt(this.parent.elements.setSeconds?.value) || 0;
		const ms = parseInt(this.parent.elements.setMs?.value) || 0;
		return (mins * 60000) + (secs * 1000) + ms;
	}
	getTeamAndPlayer() {
		const teamId = parseInt(this.parent.elements.teamSelect?.value) || null;
		const playerId = this.parent.elements.playerSelect?.value 
			? parseInt(this.parent.elements.playerSelect.value) 
			: null;
		return { teamId, playerId };
	}
	async getCurrentRecordedMs(teamId, playerId) {
		try {
			const allScores = await this.parent.fetchAllScores();
			let total = 0;
			allScores.forEach(s => {
				if (Number(s.team_id) !== Number(teamId)) return;
				if (playerId && Number(s.player_id) !== Number(playerId)) return;
				total += (s.points || 0);
			});
			return total || 0;
		} catch (error) {
			console.warn('getCurrentRecordedMs failed:', error);
			throw error;
		}
	}
	async submitDeltaScore(deltaMs, teamId, playerId) {
		const scoreData = {
			activity_id: parseInt(this.parent.selectedActivityId),
			team_id: teamId,
			points: deltaMs,
			round_number: this.parent.session.current_round
		};
		if (playerId) {
			scoreData.player_id = playerId;
		}
		try {
			if (this.parent.selectedActivityId) {
				await api.createActivityScore(this.parent.selectedActivityId, scoreData);
			} else {
				await api.postSilent(`/api/v1/scores`, scoreData);
			}
			this.parent.onScoreSubmitSuccess(teamId, deltaMs);
		} catch (error) {
			api.handleError(error, 'submitting delta score');
			alert('Fout bij het toevoegen van de score.');
		}
	}

	// Round Control Methods
	async startRound() {/* Lines 1379-1390 from simple-scoreinput.js */}
	async pauseRound() {/* Lines 1393-1402 from simple-scoreinput.js */}
	async resumeRound() {/* Lines 1405-1414 from simple-scoreinput.js */}
	async endRound() {/* Lines 1417-1426 from simple-scoreinput.js */}
	async nextActivityRound() {/* Lines 1429-1446 from simple-scoreinput.js */}
	async loadRoundStatus() {/* Lines 1449-1461 from simple-scoreinput.js */}
	updateRoundDisplay(roundStatus) {/* Lines 1464-1503 from simple-scoreinput.js */}
	updateRoundControlButtons() {/* Lines 1506-1539 from simple-scoreinput.js */}
	updateRoundTimerDisplay(seconds) {/* Lines 1542-1570 from simple-scoreinput.js */}

	// Round Timer Management
	startRoundTimer(initialSeconds) {/* Lines 1577-1608 from simple-scoreinput.js */}
	stopRoundTimer() {/* Lines 1611-1615 from simple-scoreinput.js */}

	// Round Event Handlers
	handleRoundStarted(data) {/* Lines 1622-1633 from simple-scoreinput.js */}
	handleRoundEnded(data) {/* Lines 1636-1641 from simple-scoreinput.js */}
	handleRoundChanged(data) {/* Lines 1644-1649 from simple-scoreinput.js */}
	handleRoundPaused(data) {/* Lines 1652-1657 from simple-scoreinput.js */}
	handleRoundResumed(data) {/* Lines 1660-1668 from simple-scoreinput.js */}
	handleRoundTimeUpdate(data) {/* Lines 1671-1681 from simple-scoreinput.js */}
	handleRoundAutoAdvanced(data) {/* Lines 1684-1690 from simple-scoreinput.js */}
	handleActivityCompleted(data) {/* Lines 1693-1697 from simple-scoreinput.js */}
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { ScoreInputTeamVsTime };
}
