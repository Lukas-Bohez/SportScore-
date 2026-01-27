#!/usr/bin/env bash
# Convenience wrapper to run the Python recreate script
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$DIR/recreate_database.py"
