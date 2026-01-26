#!/usr/bin/env bash
set -euo pipefail

# Copy site config to Apache, enable rewrite and site, deploy files, and reload Apache.
CONF_SRC="$(cd "$(dirname "$0")" && pwd)/sportscore.conf"
CONF_DEST="/etc/apache2/sites-available/sportscore.conf"

if [ ! -f "$CONF_SRC" ]; then
  echo "Error: $CONF_SRC not found." >&2
  exit 1
fi

# Backup existing conf if present
if [ -f "$CONF_DEST" ]; then
  TS=$(date -u +%Y%m%dT%H%M%SZ)
  echo "Backing up existing $CONF_DEST -> ${CONF_DEST}.bak.$TS"
  sudo mv "$CONF_DEST" "${CONF_DEST}.bak.$TS"
fi

# Copy config
sudo cp "$CONF_SRC" "$CONF_DEST"

# Enable rewrite module and site
sudo a2enmod rewrite
sudo a2ensite sportscore

# Test Apache config
sudo apachectl configtest

# Deploy built files and set ownership
sudo /home/lukas/Documents/apache/deploy_to_var_www.sh

# Reload apache
sudo systemctl reload apache2

# Show site enablement and status
sudo ls -la /etc/apache2/sites-enabled | grep sportscore || true
sudo systemctl is-active apache2 && sudo systemctl status apache2 --no-pager | sed -n '1,120p'

echo "Done. Visit http://<server-ip-or-hostname>/ to view the site. Adjust ServerName in apache/sportscore.conf if needed."
