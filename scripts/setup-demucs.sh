#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$ROOT/.demucs"

if ! command -v uv >/dev/null 2>&1; then
  echo "installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "creating isolated python 3.11 venv at $VENV ..."
uv venv --python 3.11 "$VENV"

echo "installing demucs + torch (this downloads ~2GB the first time)..."
uv pip install --python "$VENV/bin/python" demucs numpy soundfile

echo "installing librosa (beat + onset detection for rhythm charts)..."
uv pip install --python "$VENV/bin/python" librosa

echo
echo "done. run ./scripts/add-song.sh <mp3> <id> \"<title>\" \"<artist>\""
