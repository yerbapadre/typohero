#!/usr/bin/env bash
set -euo pipefail

# Upload local song folders to the R2-backed catalog via the Worker's authenticated PUT.
# Usage: ./scripts/sync-songs.sh [id ...]   (no args = all local songs)
# Env:   BASE (default http://localhost:8799), UPLOAD_TOKEN (default: read apps/server/.dev.vars)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SONGS_DIR="$ROOT/apps/web/public/songs"
BASE="${BASE:-http://localhost:8799}"

if [ -z "${UPLOAD_TOKEN:-}" ] && [ -f "$ROOT/apps/server/.dev.vars" ]; then
  UPLOAD_TOKEN="$(grep -E '^UPLOAD_TOKEN=' "$ROOT/apps/server/.dev.vars" | cut -d= -f2- | tr -d '"')"
fi
if [ -z "${UPLOAD_TOKEN:-}" ]; then
  echo "UPLOAD_TOKEN not set (env or apps/server/.dev.vars)"; exit 1
fi

content_type() {
  case "$1" in
    *.json) echo "application/json" ;;
    *.webm) echo "audio/webm" ;;
    *) echo "application/octet-stream" ;;
  esac
}

ids=("$@")
if [ "${#ids[@]}" -eq 0 ]; then
  ids=()
  for d in "$SONGS_DIR"/*/; do ids+=("$(basename "$d")"); done
fi

for id in "${ids[@]}"; do
  dir="$SONGS_DIR/$id"
  [ -d "$dir" ] || { echo "skip $id (no folder)"; continue; }
  for f in "$dir"/*; do
    name="$(basename "$f")"
    ct="$(content_type "$name")"
    code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
      -H "Authorization: Bearer $UPLOAD_TOKEN" \
      -H "Content-Type: $ct" \
      --data-binary "@$f" \
      "$BASE/api/songs/$id/$name")"
    echo "PUT $id/$name -> $code"
  done
done
