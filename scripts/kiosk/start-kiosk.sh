#!/usr/bin/env bash
set -euo pipefail

# start-kiosk.sh
# Lightweight wrapper to reliably start a Chromium-based kiosk in a graphical session.
# Usage: start-kiosk.sh <URL>

URL="${1:-http://localhost}"
DISPLAY="${DISPLAY:-:0}"
XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
USER_DATA_DIR="${HOME}/.config/sportscore-kiosk-profile"

# Auto-detect Chromium/Chrome binary (common names)
CHROMIUM_BIN=""
for bin in chromium-browser chromium google-chrome-stable google-chrome; do
  if command -v "$bin" >/dev/null 2>&1; then
    CHROMIUM_BIN="$(command -v "$bin")"
    break
  fi
done

if [ -z "$CHROMIUM_BIN" ]; then
  echo "No Chromium/Chrome binary found in PATH. Install Chromium or adjust CHROMIUM_BIN in this script." >> /tmp/sportscore-kiosk.log
  exit 1
fi

export DISPLAY XAUTHORITY

# Friendly info for debugging when run as a service
echo "Starting SportScore kiosk wrapper (bin=$CHROMIUM_BIN)" >> /tmp/sportscore-kiosk.log
env >> /tmp/sportscore-kiosk.env 2>/dev/null || true

# Detect Raspberry Pi (simple check)
ON_RPI=0
if [ -f /proc/device-tree/model ] && grep -qi raspberry /proc/device-tree/model 2>/dev/null; then
  ON_RPI=1
elif grep -qi raspberry /proc/cpuinfo 2>/dev/null; then
  ON_RPI=1
fi

# Base Chromium flags
BASE_FLAGS=(
  --no-first-run
  --disable-extensions
  --disable-component-extensions-with-background-pages
  --disable-translate
  --ignore-certificate-errors
  --disable-infobars
  --disable-session-crashed-bubble
  # Avoid GNOME Keyring prompts by not using the system password store
  --password-store=basic
  --disable-save-password-bubble
  --disable-features=PasswordManager
)

# Raspberry Pi specific flags (improves rendering on Pi 3/4)
RPI_FLAGS=()
if [ "$ON_RPI" -eq 1 ]; then
  RPI_FLAGS=(--disable-gpu --use-gl=egl)
  echo "Detected Raspberry Pi: adding RPI flags: ${RPI_FLAGS[*]}" >> /tmp/sportscore-kiosk.log
fi

# Wayland flags (if running in Wayland session)
WAYLAND_FLAGS=()
if [ -n "${WAYLAND_DISPLAY:-}" ]; then
  WAYLAND_FLAGS=(--enable-features=UseOzonePlatform --ozone-platform=wayland)
  echo "Detected Wayland session: adding flags: ${WAYLAND_FLAGS[*]}" >> /tmp/sportscore-kiosk.log
fi

# Allow a user to provide extra flags with EXTRA_CHROMIUM_FLAGS env var (space-separated)
IFS=' ' read -r -a EXTRA_FLAGS <<< "${EXTRA_CHROMIUM_FLAGS:-}"

# Final flags
FLAGS=("${BASE_FLAGS[@]}" "${RPI_FLAGS[@]}" "${WAYLAND_FLAGS[@]}" "${EXTRA_FLAGS[@]}")

echo "Launching $CHROMIUM_BIN with flags: ${FLAGS[*]}" >> /tmp/sportscore-kiosk.log

# Wait until the display is available (X or Wayland)
count=0
while ! (xset q >/dev/null 2>&1 || test -n "${WAYLAND_DISPLAY:-}" ); do
  sleep 1
  count=$((count+1))
  if [ "$count" -ge 30 ]; then
    echo "Timeout waiting for display" >> /tmp/sportscore-kiosk.log
    break
  fi
done

# Wait until the web server is reachable (up to 60s)
count=0
while ! curl -sSf --max-time 2 "$URL" >/dev/null 2>&1; do
  sleep 1
  count=$((count+1))
  if [ "$count" -ge 60 ]; then
    echo "Timeout waiting for URL $URL" >> /tmp/sportscore-kiosk.log
    break
  fi
done

# Ensure user profile dir exists
mkdir -p "$USER_DATA_DIR"

# Launch Chromium with a minimal, reproducible kiosk configuration
# Note: do not append "$@" here to avoid accidentally passing the URL again from systemd
exec "$CHROMIUM_BIN" "${FLAGS[@]}" --kiosk "$URL" --user-data-dir="$USER_DATA_DIR"
