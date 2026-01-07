// homepage.js - Handles the homepage functionality

class Homepage {
    constructor() {
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
            const response = await ScoreboardAPI.getSessions();
            const sessions = response.sessions || [];

            // Filter completed sessions and get winners
            const completedSessions = sessions.filter(s => s.status === 'completed');

            if (completedSessions.length === 0) {
                this.sessionsList.innerHTML = '<p>Geen gespeelde sessies gevonden.</p>';
                return;
            }

            const sessionsHtml = completedSessions.slice(0, 5).map(session => {
                const winner = this.getSessionWinner(session);
                return `
                    <div class="session-item">
                        <div>
                            <h4>${session.name}</h4>
                            <div class="winner">Winnaar: ${winner || 'Onbekend'}</div>
                        </div>
                        <button class="btn" onclick="window.location.href='leaderboard.html?session=${session.id}'">Bekijken</button>
                    </div>
                `;
            }).join('');

            this.sessionsList.innerHTML = sessionsHtml;
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.sessionsList.innerHTML = '<p>Fout bij laden sessies.</p>';
        }
    }

    getSessionWinner(session) {
        // This is a simplified version - in reality you'd need to get the leaderboard
        // For now, return a placeholder
        return 'Team A'; // Placeholder
    }

    async loadTemplates() {
        try {
            const response = await fetch(`${ScoreboardAPI.baseURL}/session-templates`);
            const data = await response.json();
            const templates = data.templates || [];

            if (templates.length === 0) {
                this.templatesList.innerHTML = '<p>Geen templates gevonden.</p>';
                return;
            }

            const templatesHtml = templates.map(template => `
                <div class="template-item">
                    <div>
                        <h4>${template.name}</h4>
                        <div class="details">${template.template_data.sport_type || 'Aangepast'}</div>
                    </div>
                    <button class="btn" onclick="homepage.loadTemplate(${template.id})">Gebruiken</button>
                </div>
            `).join('');

            this.templatesList.innerHTML = templatesHtml;
        } catch (error) {
            console.error('Error loading templates:', error);
            this.templatesList.innerHTML = '<p>Fout bij laden templates.</p>';
        }
    }

    async loadTemplate(templateId) {
        try {
            const response = await fetch(`${ScoreboardAPI.baseURL}/session-templates/${templateId}`);
            const template = await response.json();

            // Store template data in sessionStorage and redirect to simple-setup
            sessionStorage.setItem('templateData', JSON.stringify(template.template_data));
            window.location.href = 'simple-setup.html';
        } catch (error) {
            console.error('Error loading template:', error);
            alert('Fout bij laden template.');
        }
    }
}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homepage = new Homepage();
});