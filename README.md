# SportScore
The repository for development for our SportScore! team project.

## Linux Setup

The application is set up to run on Linux with Apache2 hosting the frontend and a systemd service for the backend.

### Prerequisites
- Python 3
- Apache2
- SQLite

### Setup Steps
1. Virtual environment is created in `backend/venv/`
2. Dependencies installed from `backend/requirements.txt`
3. Database initialized in `backend/scoreboard.db`
4. Apache2 configured to serve frontend from `/var/www/sportscore`
5. Backend service created as `sportscore-backend.service`

### Running the Application
- Frontend: http://localhost
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

Run `./backend/launch_linux.sh` to ensure services are running.

### Services
- Backend: `sudo systemctl status sportscore-backend` (auto-reloads on code changes)
- Frontend: `sudo systemctl status apache2`

Both services start automatically on boot.

---

## Kiosk / Bigscreen autostart 🔧
If you want the frontend to auto-open in a browser in kiosk mode after login, there's an example wrapper and service in `scripts/kiosk/`.

Files added:
- `scripts/kiosk/start-kiosk.sh` — wrapper that waits for the display and the webserver before launching Chromium.
- `scripts/kiosk/sportscore-kiosk.service` — example **systemd user** service (copy to `~/.config/systemd/user/`).
- `scripts/kiosk/sportscore-kiosk.desktop` — example autostart `.desktop` (copy to `~/.config/autostart/` and edit the `Exec` path).

Quick install (per-user, recommended):
1. Copy the wrapper:
   ```bash
   mkdir -p ~/.local/bin
   cp scripts/kiosk/start-kiosk.sh ~/.local/bin/start-kiosk.sh
   chmod +x ~/.local/bin/start-kiosk.sh
   ```
2. Install and enable the user service:
   ```bash
   mkdir -p ~/.config/systemd/user
   cp scripts/kiosk/sportscore-kiosk.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now sportscore-kiosk.service
   ```
3. Alternative: Use the `.desktop` autostart if you prefer (edit `Exec` to point to your home dir):
   ```bash
   mkdir -p ~/.config/autostart
   cp scripts/kiosk/sportscore-kiosk.desktop ~/.config/autostart/
   ```

Notes & troubleshooting:
- The script now **auto-detects a Chromium/Chrome binary** from your PATH (common names: `chromium-browser`, `chromium`, `google-chrome-stable`). If none is found, it will log an error to `/tmp/sportscore-kiosk.log` and exit — install Chromium or set the `EXTRA_CHROMIUM_FLAGS` environment variable or edit the script.
- **Raspberry Pi**: the wrapper auto-detects Raspberry Pi devices and **adds Pi-friendly flags** (`--disable-gpu --use-gl=egl`) to improve rendering on Pi 3/4. If you run into rendering issues, try adding further flags via `EXTRA_CHROMIUM_FLAGS` (for example `EXTRA_CHROMIUM_FLAGS='--disable-gpu --use-gl=egl --disable-software-rasterizer'`).
- **Wayland**: when running in Wayland the script adds `--enable-features=UseOzonePlatform --ozone-platform=wayland`. If you prefer X11, export `GDK_BACKEND=x11` or specify `EXTRA_CHROMIUM_FLAGS='--ozone-platform=x11 --disable-features=UseOzonePlatform'`.
- The kiosk disables use of the GNOME keyring by default to avoid an unlock prompt on autologin: the wrapper starts Chromium with `--password-store=basic --disable-save-password-bubble --disable-features=PasswordManager`, and the installer creates `~/.config/autostart/` overrides to prevent common `gnome-keyring` autostarters from running for the kiosk user.
- To permanently add or override Chromium flags set the `EXTRA_CHROMIUM_FLAGS` environment variable in your user service file, e.g. `Environment=EXTRA_CHROMIUM_FLAGS='--disable-gpu --use-gl=egl'` in `~/.config/systemd/user/sportscore-kiosk.service`.
- If you see a blank/managed page, it usually means the browser started before the display or before the server was reachable — the wrapper waits for both, but you can increase timeouts in the script if needed.
- Check logs/debug files:
  - `journalctl --user -u sportscore-kiosk -b`
  - `/tmp/sportscore-kiosk.log` and `/tmp/sportscore-kiosk.env`.

---

### System installation for Raspberry Pi (auto-reboot ready) 🖥️🔁
If you want the kiosk to start automatically after a full reboot (no manual login), run the installer which will:
- install the wrapper to `/home/<user>/.local/bin/start-kiosk.sh` (keeps it in the user's home)
- install a templated systemd service `/etc/systemd/system/sportscore-kiosk@.service` which you enable for the user (e.g. `sportscore-kiosk@pi.service`)
- detect your display manager and configure autologin automatically when possible (supports LightDM, GDM (gdm3), SDDM and LXDM). If your DM isn't detected the installer will print guidance to set up autologin manually.

Quick install (run as root):
```bash
sudo ./scripts/kiosk/install-kiosk-pi.sh pi
```

After running the installer verify:
- `sudo systemctl status sportscore-kiosk@pi.service`
- `sudo journalctl -u sportscore-kiosk@pi -b --no-pager`

If you use another display manager (not LightDM) enable autologin for your user via your DM's config so the user session (and X/Wayland) is available at boot.


