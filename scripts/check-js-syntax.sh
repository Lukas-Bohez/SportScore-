#!/usr/bin/env bash
set -euo pipefail

# Robust JS syntax check using acorn in module mode.
# Handles filenames with spaces using find -print0 and a while read -d '' loop.

ROOT_DIR="$(dirname "$0")/.."
# Allow passing paths; default to typical frontend locations
paths=("$ROOT_DIR/backend/voorbeeldGebruikBackend/frontend/js" "$ROOT_DIR/frontend/src" "$ROOT_DIR/frontend" )
if [ "$#" -gt 0 ]; then
  paths=("$@")
fi

failures=0

for p in "${paths[@]}"; do
  if [ -d "$p" ]; then
    find "$p" -type f -name '*.js' -print0 | while IFS= read -r -d '' file; do
      printf "Checking %s\n" "$file"
      if ! npx acorn --ecma2023 --module "$file" >/dev/null 2>&1; then
        echo "FAILED: $file"
        failures=$((failures+1))
      fi
    done
  elif [ -f "$p" ]; then
    printf "Checking %s\n" "$p"
    if ! npx acorn --ecma2023 --module "$p" >/dev/null 2>&1; then
      echo "FAILED: $p"
      failures=$((failures+1))
    fi
  fi
done

if [ "$failures" -gt 0 ]; then
  echo "\nJS syntax check found $failures failure(s)."
  exit 2
fi

echo "All checked JS files parsed as modules by acorn successfully." 
exit 0
