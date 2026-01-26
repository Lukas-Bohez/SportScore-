# 📘 Gebruikershandleiding — SportScore op een Raspberry Pi (Nederlands)

**Doel:** korte, praktische stappen om een Raspberry Pi in te pluggen, met wifi te verbinden, de applicatie te starten en te gebruiken. ✅

---

## 🔌 1) Hardware & eerste setup
- Steek de Raspberry Pi in het stopcontact en verbind een HDMI‑scherm. Verbind eventueel een toetsenbord en muis voor de eerste setup.
- Zorg dat je Pi draait op Raspberry Pi OS (of een vergelijkbare Linux-distributie).

> Tip: voor de eerste keer is een HDMI‑scherm handig; later kun je de Pi zonder scherm gebruiken als dat gewenst is.

---

## 🌐 2) Verbinden met Wi‑Fi
- Open de Wi‑Fi‑instellingen op het aangesloten scherm, kies het netwerk (SSID) en voer het wachtwoord in.
- De Wi‑Fi‑gegevens (SSID en wachtwoord) worden ook op het QR‑scherm van de bigscreen getoond zodat deelnemers snel kunnen verbinden.

> Let op: in de bigscreen-UI staat een voorbeeld hotspot: **SSID:** SportScore-Event, **Password:** SportScore2024 — controleer/wijzig dit voor productie.

---

## 🚀 3) Applicatie starten — snel overzicht
Er zijn meerdere manieren om frontend/back-end te starten. Gebruik de optie die bij jouw installatie past.

### Aanbevolen (productie-opzet met systemd + Apache)
- Start beide services: `sudo systemctl start sportscore-backend` en `sudo systemctl start apache2`.
- Of gebruik het helper-script: `./backend/launch_linux.sh` (zorg dat je in de repository root staat).
- Frontend beschikbaar op: `http://<pi-ip>/`
- Backend (API & Socket.IO) op: `http://<pi-ip>:8000` en API docs op `http://<pi-ip>:8000/docs`

### Test/ontwikkel (zonder Apache)
- Backend (in repo):
  1. Maak virtuele omgeving en installeer dependencies: in `backend/`:
     ```bash
     python3 -m venv venv
     ./venv/bin/pip install -r requirements.txt
     ./venv/bin/python app.py
     ```
  2. Of gebruik `backend/voorbeeldGebruikBackend/run.py` (maakt venv en start automatisch)
- Frontend (snel statisch serveren):
  - `python3 backend/voorbeeldGebruikBackend/serve_frontend.py 3000` → open `http://<pi-ip>:3000`
- Frontend (ontwikkel):
  - In `frontend/`: `npm install` en `npm run dev` (Vite) → standaard `http://<pi-ip>:5173`

---

## 🧭 4) Hoe gebruik je de applicatie (snelstart)
1. Open de site op een apparaat: `http://<pi-ip>/` (of het dev/static adres).
2. Op de startpagina: klik **"Nieuwe sessie"**.
3. Stap 1: voer een **sessie naam** in → klik **Volgende**.
4. Stap 2: **Activiteiten** toevoegen (nieuw maken of kiezen).
5. Stap 3: **Deelnemers / teams** toevoegen (naam, emoji/icoon).
6. Stap 4: controleer het **sessie overzicht** en klik **Opslaan**.
7. Start de sessie (via de admin/Actief pagina). Gebruik de Big Screen modus om live resultaten te tonen.

- QR‑scherm (BigScreen > QR): laat deelnemers verbinden met het event-netwerk of scan de QR om het score-invoerscherm te openen.
- Deelnemers kunnen via hun telefoon scores invoeren (low-friction, zonder gebruikersaccounts).

---

## 🔧 5) Belangrijke commando's & troubleshooting
- Start helper script: `./backend/launch_linux.sh`
- Backend status: `sudo systemctl status sportscore-backend`
- Apache status: `sudo systemctl status apache2`
- Backend logs: `sudo journalctl -u sportscore-backend -f` (of bekijk de terminal waar `app.py` draait)
- Database initialiseren: `python3 backend/scripts/init_database.py` (indien aanwezig voor installatie)
- Migraties: `python3 backend/scripts/run_migration.py`

Probleem: frontend niet bereikbaar → controleer of Apache draait of of je dev server/serve_frontend.py op de juiste poort draait. Firewall/poorten (80, 3000, 5173, 8000) moeten open zijn voor clients.

---

## 🔒 6) Veiligheid & onderhoud
- Wijzig standaard Wi‑Fi‑wachtwoorden (bij gebruik van hotspot).
- Maak regelmatig een backup van de database (`backend/scoreboard.db` of waar ingesteld).
- Voer `pip install -r requirements.txt` bij updates en test opnieuw.

---

## 📚 7) Nuttige links in het project
- Startscript (Linux): `backend/launch_linux.sh`
- Backend run-helper: `backend/voorbeeldGebruikBackend/run.py`
- Simple frontend server: `backend/voorbeeldGebruikBackend/serve_frontend.py`
- Frontend (Vite): `frontend/` (`npm run dev`, `npm run build`)
- API docs (na starten backend): `http://<pi-ip>:8000/docs`

---

Heb je specifieke wensen (bv. automatische hotspot setup, pre‑built image, of een papieren quickstart met only‑buttons), dan maak ik graag een korte how‑to voor die setup. 💡

---

*Gemaakt door het SportScore team* — kort, praktisch en klaar voor gebruik. ✅
