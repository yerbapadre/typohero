#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: ./scripts/add-song.sh <mp3> <id> \"<title>\" \"<artist>\""
  exit 1
fi

SRC="$1"; ID="$2"; TITLE="$3"; ARTIST="$4"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$ROOT/.demucs"
OUT="$ROOT/apps/web/public/songs/$ID"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -x "$VENV/bin/python" ]; then
  echo "demucs venv missing — run ./scripts/setup-demucs.sh first"
  exit 1
fi

echo "splitting (htdemucs_6s, MPS-accelerated on Apple Silicon)..."
"$VENV/bin/python" -m demucs -n htdemucs_6s -o "$WORK" "$SRC"

STEMS_DIR="$(dirname "$(find "$WORK" -name vocals.wav | head -1)")"
DURATION_MS="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC" | awk '{printf "%d", $1 * 1000}')"

mkdir -p "$OUT"
LANES=""
for lane in vocals drums bass guitar piano other; do
  ffmpeg -hide_banner -loglevel error -y -i "$STEMS_DIR/$lane.wav" -c:a libopus -b:a 96k "$OUT/$lane.webm"
  LANES="$LANES    { \"instrument\": \"$lane\", \"stem\": \"$lane.webm\" },
"
done
LANES="${LANES%,
}"

cat > "$OUT/song.json" <<JSON
{
  "id": "$ID",
  "title": "$TITLE",
  "artist": "$ARTIST",
  "durationMs": $DURATION_MS,
  "lanes": [
$LANES
  ]
}
JSON

echo "wrote $OUT (6 stems + song.json)"
