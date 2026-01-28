#!/usr/bin/env bash
set -euo pipefail

# start-kiosk.sh
# Lightweight wrapper to reliably start a Chromium-based kiosk in a graphical session.
# Usage: start-kiosk.sh <URL>

# The URL to open can be supplied as first argument or via the KIOSK_URL env var.
# If neither is provided, the script will probe a set of sensible defaults and pick the first
# working URL it finds (helps with Pi setups where the usable host may be an IP address).
URL_ARG="${1:-}"
URL_ENV="${KIOSK_URL:-}"
DISPLAY="${DISPLAY:-:0}"
XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
USER_DATA_DIR="${HOME}/.config/sportscore-kiosk-profile"

# Prefer local deployed dist (file://) if present — this ensures kiosk loads the built app even
# when Apache isn't available or misconfigured.
LOCAL_DIST_FILE="/var/www/sportscore/index.html"

# Helper: determine candidate URLs in order of preference
CANDIDATES=()
# If a local file exists, prefer it (file URI allows opening the built app directly)
if [ -f "$LOCAL_DIST_FILE" ]; then
  CANDIDATES+=("file://$LOCAL_DIST_FILE")
fi
if [ -n "$URL_ARG" ]; then
  CANDIDATES+=("$URL_ARG")
fi
if [ -n "$URL_ENV" ]; then
  CANDIDATES+=("$URL_ENV")
fi
# Common defaults (add or reorder as needed for your environment)
CANDIDATES+=("http://localhost" "http://192.168.123.241" "http://sportscore.local")

# Normalize candidates (ensure no trailing slash)
for i in "${!CANDIDATES[@]}"; do
  CANDIDATES[$i]=$(echo "${CANDIDATES[$i]}" | sed -E 's/\/$//')
done

# Selected URL eventually set here
URL=""

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
# if [ "$ON_RPI" -eq 1 ]; then
#   RPI_FLAGS=(--use-gl=egl)
#   echo "Detected Raspberry Pi: adding RPI flags: ${RPI_FLAGS[*]}" >> /tmp/sportscore-kiosk.log
# fi

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

# Probe candidate URLs and prefer one that serves the SPA (looks for index HTML / app root)
log() { echo "$(date --iso-8601=seconds) - $*" >> /tmp/sportscore-kiosk.log; }

probe_ok() {
  local u="$1"
  # Support file:// URLs by checking file contents directly
  if echo "$u" | grep -q '^file://'; then
    local file_path
    file_path=$(echo "$u" | sed -E 's#^file://##')
    if [ -f "$file_path" ]; then
      if grep -q '<div id="app">' "$file_path" 2>/dev/null || grep -qi 'SportScore' "$file_path" 2>/dev/null; then
        return 0
      fi
    fi
    return 1
  fi

  # simple HTTP(S) health check: must return 200 and contain the app root or title text
  local body
  if ! body=$(curl -sSf --max-time 3 "$u" 2>/dev/null); then
    return 1
  fi
  echo "$body" | grep -q "<div id=\"app\">" || echo "$body" | grep -qi "SportScore" && return 0 || return 1
}

log "Probing candidate URLs: ${CANDIDATES[*]}"
selected=""
for candidate in "${CANDIDATES[@]}"; do
  # Identify base host (strip any path/hash)
  base="$(echo "$candidate" | sed -E 's#(https?://[^/]+).*#\1#')"

  # 1) If full candidate responds with app root, prefer it
  if probe_ok "$candidate"; then
    selected="$candidate"
    log "Selected candidate (direct): $selected"
    break
  fi

  # 2) If base host serves index, use hash fallback (works even when history-mode routes are not served)
  if probe_ok "$base"; then
    # For file:// base we prefer the file with hash appended
    if echo "$base" | grep -q '^file://'; then
      selected="$base#/#/bigscreen/qrscreen"
    else
      selected="$base/#/bigscreen/qrscreen"
    fi
    log "Selected candidate (base+hash): $selected"
    break
  fi

done

# If no candidate matched within probe criteria, fall back to first candidate with hash appended and continue anyway
if [ -z "$selected" ]; then
  selected="${CANDIDATES[0]}/#/bigscreen/qrscreen"
  log "No candidate responded like SPA; falling back to: $selected"
fi

URL="$selected"

# Ensure user profile dir exists
mkdir -p "$USER_DATA_DIR"

log "Launching Chromium (bin=$CHROMIUM_BIN) with URL: $URL"
# Launch Chromium with a minimal, reproducible kiosk configuration
# Note: do not append "$@" here to avoid accidentally passing the URL again from systemd
# Add some extra flags that help on Raspberry Pi / embedded setups
EXTRA_LAUNCH_FLAGS=(--use-gl=egl --disable-gpu-compositing)

# Final exec: try launching; if it fails, log and attempt with the URL wrapped as a hash fallback
set -o errexit
if ! exec "$CHROMIUM_BIN" "${FLAGS[@]}" "${EXTRA_LAUNCH_FLAGS[@]}" --kiosk "$URL" --user-data-dir="$USER_DATA_DIR"; then
  log "Chromium failed to start with URL: $URL"
  # try opening the base with hash fallback
  base=$(echo "$URL" | sed -E 's/(#\/.*)$//')
  fallback="$base/#/bigscreen/qrscreen"
  log "Attempting fallback URL: $fallback"
  exec "$CHROMIUM_BIN" "${FLAGS[@]}" "${EXTRA_LAUNCH_FLAGS[@]}" --kiosk "$fallback" --user-data-dir="$USER_DATA_DIR"
fi
