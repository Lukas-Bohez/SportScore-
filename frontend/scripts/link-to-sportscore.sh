#!/usr/bin/env bash
# Create a symlink from project dist to /var/www/sportscore for fast iteration
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "dist directory not found. Run 'npm run build' first."
  exit 1
fi
sudo rm -rf /var/www/sportscore
sudo ln -s "$DIST_DIR" /var/www/sportscore
sudo chown -R www-data:www-data /var/www/sportscore
echo "Linked $DIST_DIR -> /var/www/sportscore"