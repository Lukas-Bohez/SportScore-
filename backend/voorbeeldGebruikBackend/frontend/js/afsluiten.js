(function () {
    const shutdownNav = document.getElementById('shutdown-nav');

    if (!shutdownNav) return;

    function setBusy(state) {
        if (state) {
            shutdownNav.style.opacity = '0.6';
            shutdownNav.style.pointerEvents = 'none';
            const label = shutdownNav.querySelector('.label');
            if (label) label.textContent = 'Uit (bezig...)';
        } else {
            shutdownNav.style.opacity = '';
            shutdownNav.style.pointerEvents = '';
            const label = shutdownNav.querySelector('.label');
            if (label) label.textContent = 'Uit';
        }
    }

    async function doShutdown() {
        if (!confirm('Weet je het zeker? Hiermee wordt de Raspberry Pi uitgeschakeld.')) return;

        // No-admin-secret mode: send shutdown request without prompting for a password.
        setBusy(true);
        try {
            const backend = `${location.protocol}//${location.hostname}:8000`;
            const res = await fetch(`${backend}/api/v1/system/shutdown`, {
                method: 'POST'
            });

            if (res.status === 202 || res.status === 200) {
                alert('Shutdown gestart. De Raspberry Pi zal nu afsluiten.');
                // Keep the UI in disabled state
            } else if (res.status === 403) {
                alert('Fout: ongeldige admin secret.');
                setBusy(false);
            } else {
                const body = await res.json().catch(() => ({}));
                alert('Fout bij afsluiten: ' + (body.detail || res.statusText));
                setBusy(false);
            }
        } catch (err) {
            alert('Netwerkfout: ' + err.message);
            setBusy(false);
        }
    }

    shutdownNav.addEventListener('click', doShutdown);
    shutdownNav.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            doShutdown();
        }
    });
})();
