#!/usr/bin/env python3
"""Annotate song.json lanes with per-stem activity.

htdemucs always emits all 6 stems, even for instruments absent from the track
(you get a near-silent file). This detects real presence + when each stem is
audibly playing, so the game can hide unavailable instruments and hold a lane's
words until its instrument comes in.

Usage:
  analyze-song.py <song_dir> [<song_dir> ...]
  analyze-song.py            # defaults to apps/web/public/songs/*
"""
import json
import re
import subprocess
import sys
from pathlib import Path

NOISE_DB = "-38dB"
MIN_SILENCE_S = 0.4
MIN_ACTIVE_S = 0.25
PRESENT_MIN_S = 1.5
PRESENT_MIN_FRAC = 0.02

ROOT = Path(__file__).resolve().parent.parent
SILENCE_RE = re.compile(r"silence_(start|end):\s*([0-9.]+)")


def silences(path: Path, dur_s: float) -> list[tuple[float, float]]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
         "-af", f"silencedetect=noise={NOISE_DB}:d={MIN_SILENCE_S}", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    out: list[tuple[float, float]] = []
    start = None
    for kind, val in SILENCE_RE.findall(proc.stderr):
        t = float(val)
        if kind == "start":
            start = t
        elif kind == "end" and start is not None:
            out.append((max(0.0, start), min(dur_s, t)))
            start = None
    if start is not None:
        out.append((max(0.0, start), dur_s))
    return out


def active_from_silence(sils: list[tuple[float, float]], dur_s: float) -> list[tuple[float, float]]:
    segs: list[tuple[float, float]] = []
    cursor = 0.0
    for s, e in sorted(sils):
        if s > cursor:
            segs.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < dur_s:
        segs.append((cursor, dur_s))
    return [(s, e) for s, e in segs if e - s >= MIN_ACTIVE_S]


def analyze(song_dir: Path) -> None:
    manifest_path = song_dir / "song.json"
    manifest = json.loads(manifest_path.read_text())
    dur_s = manifest["durationMs"] / 1000.0

    for lane in manifest["lanes"]:
        stem = song_dir / lane["stem"]
        if not stem.exists():
            print(f"  {lane['instrument']}: missing {lane['stem']}, skipping")
            continue
        active = active_from_silence(silences(stem, dur_s), dur_s)
        total = sum(e - s for s, e in active)
        present = total >= max(PRESENT_MIN_S, PRESENT_MIN_FRAC * dur_s)
        lane["present"] = present
        lane["active"] = [[round(s * 1000), round(e * 1000)] for s, e in active] if present else []
        print(f"  {lane['instrument']}: present={present} active={len(lane['active'])} segs ({total:.0f}s)")

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {manifest_path}")


def main() -> None:
    args = sys.argv[1:]
    dirs = [Path(a) for a in args] if args else sorted(
        p.parent for p in (ROOT / "apps/web/public/songs").glob("*/song.json")
    )
    for d in dirs:
        print(f"analyzing {d.name}…")
        analyze(d)


if __name__ == "__main__":
    main()
