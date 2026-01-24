#!/usr/bin/env bash
set -euo pipefail

# Deploy the built frontend to /var/www/sportscore (requires sudo)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$REPO_ROOT/frontend/dist"
TARGET_DIR="/var/www/sportscore"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: dist directory not found at $DIST_DIR. Run 'npm run build' in frontend first." >&2
  exit 1
fi

echo "Deploying $DIST_DIR -> $TARGET_DIR (requires sudo)"
sudo mkdir -p "$TARGET_DIR"
sudo cp -r "$DIST_DIR/." "$TARGET_DIR/"
# Also deploy helpful repo files (htaccess for SPA fallback, README)
if [ -f "$REPO_ROOT/apache/.htaccess" ]; then
  sudo cp "$REPO_ROOT/apache/.htaccess" "$TARGET_DIR/.htaccess"
fi
if [ -f "$REPO_ROOT/apache/README.md" ]; then
  sudo cp "$REPO_ROOT/apache/README.md" "$TARGET_DIR/README.txt"
fi
sudo chown -R www-data:www-data "$TARGET_DIR"

echo "Deployed. Reload apache: sudo systemctl reload apache2"
