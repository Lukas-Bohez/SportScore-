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

        const secret = prompt('Voer admin secret in om uit te schakelen:');
        if (!secret) return;

        setBusy(true);
        try {
            const res = await fetch('/api/v1/system/shutdown', {
                method: 'POST',
                headers: {
                    'X-Admin-Secret': secret
                }
            });

            if (res.status === 202) {
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
