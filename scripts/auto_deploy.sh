#!/usr/bin/env bash
set -euo pipefail

# Helper script to build frontend, deploy to /var/www/sportscore and reload Apache
# Usage: ./scripts/auto_deploy.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building frontend..."
npm --prefix frontend run build

echo "Deploying to /var/www/sportscore..."
sudo bash "$REPO_ROOT/apache/deploy_to_var_www.sh"

echo "Reloading Apache..."
sudo systemctl reload apache2

echo "Done."
