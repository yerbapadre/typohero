#!/usr/bin/env python3
"""Chart a song's rhythm from its separated stems.

Demucs has already isolated each instrument, so onsets detected on a single stem
are that instrument's own notes: the drum lane lands on drum hits, the bass lane
on bass notes. Onsets are quantized to the beat grid (detection is a few ms off,
and a note placed off-grid reads as a mistake) and then thinned per difficulty.

Writes chart.json beside song.json. song.json stays a manifest.

Usage:
  chart-song.py <song_dir> [<song_dir> ...]
  chart-song.py            # defaults to apps/web/public/songs/*

Pass --bpm <n> when the tempo is known. Beat tracking is the least reliable part
of this and a wrong tempo makes a grid too coarse to hold the notes.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 22050
HOP = 512
SUBDIVISION = 4
MIN_STEPS = {"easy": 4, "medium": 3, "hard": 2, "expert": 1}
TIERS = ("easy", "medium", "hard", "expert", "god")

ROOT = Path(__file__).resolve().parent.parent


def load_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as w:
        frames = w.readframes(w.getnframes())
        width = w.getsampwidth()
        channels = w.getnchannels()
        rate = w.getframerate()
    if width != 2:
        raise ValueError(f"{path.name}: only 16-bit wav supported, got {width * 8}-bit")
    audio = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    return resample(audio, rate, SR)


def load_ffmpeg(path: Path) -> np.ndarray:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed on {path.name}: {proc.stderr.decode()[:200]}")
    return np.frombuffer(proc.stdout, dtype="<f4").copy()


def resample(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if src_sr == dst_sr:
        return audio
    count = int(round(len(audio) * dst_sr / src_sr))
    src_positions = np.linspace(0, len(audio) - 1, count)
    return np.interp(src_positions, np.arange(len(audio)), audio).astype(np.float32)


def load_stem(path: Path) -> np.ndarray:
    if path.suffix.lower() == ".wav":
        return load_wav(path)
    return load_ffmpeg(path)


def onset_envelope(audio: np.ndarray) -> np.ndarray:
    import librosa

    return librosa.onset.onset_strength(y=audio, sr=SR, hop_length=HOP)


def detect_onsets(audio: np.ndarray, quantize_radius_s: float) -> tuple[np.ndarray, np.ndarray]:
    """Onset times in seconds, plus each onset's strength.

    A ringing stem makes spectral flux fire repeatedly for one played note, so
    onsets are held apart by the quantization radius: closer than that they snap
    to the same grid point regardless, and any wider suppresses real adjacent
    notes when detection jitters by a frame.
    """
    import librosa

    envelope = onset_envelope(audio)
    frames = librosa.onset.onset_detect(
        onset_envelope=envelope,
        sr=SR,
        hop_length=HOP,
        backtrack=True,
        wait=max(1, int(quantize_radius_s * SR / HOP)),
    )
    if len(frames) == 0:
        return np.array([]), np.array([])
    times = librosa.frames_to_time(frames, sr=SR, hop_length=HOP)
    strengths = envelope[np.clip(frames, 0, len(envelope) - 1)]
    return times, strengths


def track_beats(mix: np.ndarray, forced_bpm: float | None) -> tuple[float, np.ndarray]:
    import librosa

    envelope = onset_envelope(mix)
    if forced_bpm:
        _, beat_frames = librosa.beat.beat_track(
            onset_envelope=envelope, sr=SR, hop_length=HOP, bpm=forced_bpm
        )
        beats = librosa.frames_to_time(beat_frames, sr=SR, hop_length=HOP)
        return forced_bpm, beats

    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=envelope, sr=SR, hop_length=HOP
    )
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=SR, hop_length=HOP)
    return bpm, beats


def subdivision_grid(beats: np.ndarray, duration_s: float, bpm: float) -> np.ndarray:
    """Beat times split into SUBDIVISION steps, extended to cover the whole track."""
    if len(beats) < 2:
        step = 60.0 / max(bpm, 1e-6) / SUBDIVISION
        return np.arange(0.0, duration_s, step)

    grid: list[float] = []
    for start, end in zip(beats[:-1], beats[1:]):
        for k in range(SUBDIVISION):
            grid.append(start + (end - start) * k / SUBDIVISION)

    mean_step = float(np.mean(np.diff(beats))) / SUBDIVISION
    tail = beats[-1]
    while tail < duration_s:
        grid.append(float(tail))
        tail += mean_step

    head = beats[0] - mean_step
    lead: list[float] = []
    while head >= 0:
        lead.append(float(head))
        head -= mean_step

    return np.array(sorted(lead) + grid)


def quantize(times: np.ndarray, strengths: np.ndarray, grid: np.ndarray) -> dict[int, float]:
    """Snap onsets to grid indices, keeping the strongest onset per index."""
    snapped: dict[int, float] = {}
    for time, strength in zip(times, strengths):
        index = int(np.argmin(np.abs(grid - time)))
        if strength > snapped.get(index, -np.inf):
            snapped[index] = float(strength)
    return snapped


def thin(snapped: dict[int, float], min_steps: int) -> list[int]:
    """Greedy non-maximum suppression in grid steps, strongest onsets first.

    Spacing is counted in subdivisions rather than seconds: beat times come back
    frame-quantized, so a comparison in seconds drops notes that are legitimately
    one subdivision apart.
    """
    kept: list[int] = []
    for index, _ in sorted(snapped.items(), key=lambda kv: kv[1], reverse=True):
        if all(abs(index - other) >= min_steps for other in kept):
            kept.append(index)
    return sorted(kept)


def chart_lane(audio: np.ndarray, grid: np.ndarray, beat_s: float) -> dict[str, list[int]]:
    grid_step_s = beat_s / SUBDIVISION
    times, strengths = detect_onsets(audio, grid_step_s / 2)
    if len(times) == 0:
        return {tier: [] for tier in TIERS}

    snapped = quantize(times, strengths, grid)
    lanes: dict[str, list[int]] = {}
    for tier in TIERS:
        indices = thin(snapped, MIN_STEPS[tier]) if tier in MIN_STEPS else sorted(snapped)
        lanes[tier] = [int(round(grid[i] * 1000)) for i in indices]
    return lanes


def chart(song_dir: Path, forced_bpm: float | None = None) -> None:
    manifest = json.loads((song_dir / "song.json").read_text())

    stems: dict[str, np.ndarray] = {}
    for lane in manifest["lanes"]:
        path = song_dir / lane["stem"]
        if not path.exists():
            print(f"  {lane['instrument']}: missing {lane['stem']}, skipping")
            continue
        if lane.get("present") is False:
            print(f"  {lane['instrument']}: absent from this track, skipping")
            continue
        stems[lane["instrument"]] = load_stem(path)

    if not stems:
        print("  no usable stems, skipping")
        return

    longest = max(len(audio) for audio in stems.values())
    mix = np.zeros(longest, dtype=np.float32)
    for audio in stems.values():
        mix[: len(audio)] += audio

    duration_s = len(mix) / SR
    manifest_s = manifest["durationMs"] / 1000.0
    if manifest_s > duration_s * 1.5:
        print(f"  note: manifest claims {manifest_s:.0f}s but audio is {duration_s:.0f}s (looping stem?)")

    bpm, beats = track_beats(mix, forced_bpm)
    grid = subdivision_grid(beats, duration_s, bpm)
    beat_s = 60.0 / max(bpm, 1e-6)
    print(f"  tempo {bpm:.1f} bpm, {len(beats)} beats, {len(grid)} grid points")

    lanes: dict[str, dict[str, list[int]]] = {}
    for instrument, audio in stems.items():
        lanes[instrument] = chart_lane(audio, grid, beat_s)
        counts = " ".join(f"{name}={len(times)}" for name, times in lanes[instrument].items())
        print(f"  {instrument}: {counts}")

    out = {
        "songId": manifest["id"],
        "bpm": round(bpm, 2),
        "subdivision": SUBDIVISION,
        "beatsMs": [int(round(b * 1000)) for b in beats],
        "lanes": lanes,
    }
    path = song_dir / "chart.json"
    path.write_text(json.dumps(out) + "\n")
    print(f"wrote {path} ({path.stat().st_size // 1024}KB)")


def main() -> None:
    args = sys.argv[1:]
    forced_bpm: float | None = None
    if "--bpm" in args:
        at = args.index("--bpm")
        forced_bpm = float(args[at + 1])
        del args[at : at + 2]

    dirs = [Path(a) for a in args] if args else sorted(
        p.parent for p in (ROOT / "apps/web/public/songs").glob("*/song.json")
    )
    for d in dirs:
        print(f"charting {d.name}…")
        chart(d, forced_bpm)


if __name__ == "__main__":
    main()
