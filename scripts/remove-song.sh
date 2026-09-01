#!/usr/bin/env bash
set -euo pipefail

# Remove songs from the R2-backed catalog (and local staging folder).
# Usage: ./scripts/remove-song.sh <id> [id ...]
# Env:   BASE (default http://localhost:8799), UPLOAD_TOKEN (default: read apps/server/.dev.vars)

if [ "$#" -eq 0 ]; then
  echo "usage: ./scripts/remove-song.sh <id> [id ...]"; exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SONGS_DIR="$ROOT/apps/web/public/songs"
BASE="${BASE:-http://localhost:8799}"

if [ -z "${UPLOAD_TOKEN:-}" ] && [ -f "$ROOT/apps/server/.dev.vars" ]; then
  UPLOAD_TOKEN="$(grep -E '^UPLOAD_TOKEN=' "$ROOT/apps/server/.dev.vars" | cut -d= -f2- | tr -d '"')"
fi
if [ -z "${UPLOAD_TOKEN:-}" ]; then
  echo "UPLOAD_TOKEN not set (env or apps/server/.dev.vars)"; exit 1
fi

for id in "$@"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
    -H "Authorization: Bearer $UPLOAD_TOKEN" \
    "$BASE/api/songs/$id")"
  echo "DELETE $id -> $code"
  rm -rf "${SONGS_DIR:?}/$id"
done
