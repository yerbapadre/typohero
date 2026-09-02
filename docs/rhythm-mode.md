# Rhythm mode — scoping

Today a note is a **word** that must be finished before its deadline, and the deadline comes
from a WPM preset. The proposal: a note is a **letter** placed on the song's rhythm, and score
depends on *when* you hit it as well as *whether* you hit the right key.

This doc scopes the change. See **Status** for what is built.

## What actually changes

| | today | rhythm mode |
|---|---|---|
| note | one word | one letter |
| timing source | `wpm/5` words per minute | the song (beat grid or per-stem onsets) |
| deadline | word's `hitMs`, pass/fail | hit window around an exact time, graded |
| reducer | cursor-driven: keystroke → char at `cursor` | note-driven: keystroke → note whose window contains `now` |
| score | `base × streak` | `base × streak × timing` |
| difficulty | WPM preset | rhythmic subdivision + note density |
| stem audio | background flavour | the clock everything is judged against |

The cursor→note inversion is the core engine rework. Everything else hangs off it.

## Status

Phase 1 groundwork is on `feat/rhythm-mode`:

- **Engine** — `chart.ts` (chart representation, hit windows, judgment) and `rhythm.ts` (the
  note-driven reducer, timing-graded scoring, quality signal, summary). 42 tests. Word mode is
  untouched.
- **Pipeline** — `scripts/chart-song.py` charts per-stem onsets into a `chart.json` sidecar, wired
  into `add-song.sh`; `setup-demucs.sh` installs librosa.
- **Client** — charted lanes type letters on the beat through the existing stage highway; playback
  is anchored to the song start; judgment feedback on screen. Off by default behind a host toggle.
- **Not started** — the calibration screen, and rhythm-specific canvas work (beat lines from
  `beatsMs`, judgment pops drawn on the highway rather than as a DOM overlay).

Validated against a synthetic fixture with a known rhythm per instrument (12s at 120 BPM):

| stem | plays | true notes | easy | medium | hard | expert | god |
|---|---|---|---|---|---|---|---|
| drums | 8ths | 48 | 24 | 24 | 47 | 47 | 47 |
| bass | 1/4 | 24 | 23 | 23 | 23 | 23 | 23 |
| guitar | halves | 12 | 11 | 11 | 11 | 11 | 11 |
| piano | 16ths | 96 | 24 | 32 | 48 | 95 | 95 |

Detection lands one note short on every lane — the onset at *t=0* has no preceding frame to detect
against, which is harmless. Density genuinely differs per instrument for the same song, which is
the whole premise: guitar 11 notes, piano 95.

**Still unvalidated: real music.** This machine has no ffmpeg, no Demucs venv, and the real songs
are gitignored, so the pipeline has only ever seen synthetic sine-tone stems. Two things need a
real-song pass before `god` is trusted: dense material, and beat tracking.

### Findings worth keeping

- **Beat tracking is the weak link.** librosa returned 95.7 BPM for a 120 BPM fixture and 117.45 for
  the 120 BPM placeholder loop. A wrong tempo makes the subdivision grid coarser than the music and
  notes collapse onto shared grid points — piano capped at 76 of 96 before the tempo was forced.
  Hence `--bpm`: pass the known tempo for the show song rather than trusting detection.
- **Onset spacing must equal the quantization radius**, i.e. half a grid step. Suppressing onsets
  closer than a *full* grid step throws away real adjacent notes whenever detection jitters by a
  frame (piano 60 of 96); half a step keeps them (95 of 96) and still deduplicates, because anything
  closer snaps to the same grid point anyway.
- **Thin in grid steps, not seconds.** Beat times come back frame-quantized (~23ms at hop 512), so
  grid points one subdivision apart sit slightly closer than the nominal gap; comparing seconds
  dropped every other note (bass 12 of 24). Counting subdivisions is exact.
- Smaller FFT hops do not help and slightly hurt — the limit was never time resolution.

## 1. Where the rhythm comes from

Three options, increasing fidelity and cost:

**(a) Beat grid.** Detect tempo + downbeat, emit a note every 1/4, 1/8 or 1/16. Always
"on the music", but mechanical and identical across lanes — the drummer and the bassist type the
same rhythm.

**(b) Per-stem onsets — chosen.** Run onset detection on *each separated stem*. The
drummer's notes land on drum hits, the bassist's on bass notes, the vocalist's on syllables. Demucs
has already done the hard part (isolation), which is the whole reason this is cheap for us and
expensive for everyone else. Non-uniform by nature — bursts and rests — which is more fun than a
constant stream.

**(c) Hand-charted.** A human-authored chart per song. Best feel, most labour. Worth it for the one
show song, as an override layer on top of (b).

Recommended pipeline: **onsets → quantize to the beat grid → thin to a density target**. Quantizing
keeps notes musically placed even when detection is a few ms off; thinning is the difficulty knob.

## 2. Density is the difficulty knob, and it caps the speed

At 120 BPM:

| subdivision | interval | notes/min | effective WPM |
|---|---|---|---|
| 1/4 | 500ms | 120 | 24 |
| 1/8 | 250ms | 240 | 48 |
| 1/16 | 125ms | 480 | 96 |

Current presets are 70 (easy) → 190 (god) WPM. So **even 16ths at 120 BPM is slower than today's
`hard`**, and `god`'s 190 WPM would need 16ths at 237 BPM. Rhythm play is inherently slower than
free typing, because you can't run ahead.

Consequences:
- `DIFFICULTY_WPM` stops being meaningful. Difficulty becomes `{ subdivision, densityFraction }`.
- The whole ladder rescales. Expect to re-tune from scratch; today's "easy" is roughly rhythm
  mode's "expert".
- Sparse-lane problem solves itself: at 1/8 with a ~2s travel time there are ~8 notes in flight,
  versus ~2 today.

## 3. Content: the passages are far too short

A 3-minute lane at 1/8 needs **~720 letters**. The longest passage in the library is **136**
(`keyboard-anthem`, 33 words). Every passage is a warm-up-sized sentence.

Options:
- **Long-form passages** (500–1500 letters), authored per song or per mood. Simple, no new
  mechanics, but someone has to write them.
- **Word pool consumed cyclically** — the chart pulls words from a bank as it needs them. Endless
  by construction; risks feeling repetitive.
- **Lyrics** for the vocal lane. Best possible fit (you type what's being sung, syllable on
  syllable) but per-song authoring, and copyright applies to lyrics as much as to audio.

This is a real workstream, not a footnote — the mode doesn't ship without it.

## Turning it on

`noteMode` lives on the room and defaults to `words`. The host flips it in the lobby; it is locked
during a performance and open again in setup. A lane goes rhythm only when the setting is on *and*
its song has a chart for that instrument and difficulty — otherwise it falls back to the word
highway, so a partially charted song still plays.

## 4. Engine changes

New `packages/engine/src/chart.ts`:

```ts
type ChartNote = { index; char; timeMs; wordIndex; wordStart };
type Judgment = "perfect" | "great" | "good" | "miss";

buildChart(text, timesMs, { loop }): Chart      // zip letters onto rhythm
windowsFor(chart, index): HitWindows            // capped by the neighbouring notes
judge(deltaMs, windows): Judgment

chartFromFile(file, lane, difficulty, text): Chart   // straight from chart.json
laneTimes(file, lane, difficulty): number[]
isChartedLane(file, lane): boolean
```

`rhythm.ts` sits beside `typing.ts` rather than replacing it, so word mode keeps working:

```ts
applyRhythmKeypress(run, { char, atMs }): RhythmRun   // match against the hittable note
expireRhythmNotes(run, atMs): RhythmRun               // miss notes whose window has closed
rhythmQuality(run, window): number                    // drives stem degradation
liveStatFromRhythmRun(run): LiveStat                  // existing wire format, unchanged
summarizeRhythmRun(run): RhythmSummary                // judgment counts + timing bias
```

Proposed windows (generous on purpose — see §5):

| judgment | window | points |
|---|---|---|
| perfect | ±80ms | ×1.0 |
| great | ±150ms | ×0.7 |
| good | ±220ms | ×0.4 |
| miss | outside, or wrong key inside | 0, streak breaks |

Decisions baked in above, each reversible:
- **One note hittable at a time** — the nearest un-resolved note. No typing ahead.
- **Wrong key inside the window fails that note** and advances, so you can't get stuck.
- **No backspace.** It's meaningless when notes are time-boxed; frees the key for something else.

`timingMultiplier` and `notePoints` live in `rhythm.ts` rather than `scoring.ts`, which keeps
`scoring.ts` free of a dependency on `chart.ts`.

Touched: `quality.ts` (fold timing into the signal so a
technically-correct-but-sloppy lane still sounds sloppy), `pace.ts` (`applyNotePace` is replaced by
window expiry), `summary.ts` + results (judgment counts, timing histogram).

## 5. The hard part: audio and clock sync

A note at song time *T* must be drawn at the hit line exactly when the player **hears** *T*, and
their keystroke must be timestamped on the same axis. Every link in that chain is currently
unmeasured.

**What's broken today:**

- `MultiStemPlayer.start()` (`apps/web/src/audio/StemPlayer.ts`) starts at `ctx.currentTime + 0.1`
  *whenever the effect happens to run* — after fetching and decoding six stems. It is not anchored
  to `startedAtEpochMs` at all, sources are `loop: true`, and there's no seek. Song position and
  game clock are currently unrelated. This is the single biggest blocker.
- No clock-offset handshake. `startedAtEpochMs` is wall-clock `Date.now()` from the DO; two laptops
  can disagree by tens of ms with nothing correcting it. Invisible today, a scoring bug tomorrow.
- `useTransport.ts` is an empty stub — the seam for exactly this was left open.

**The offset chain:**

| source | typical | notes |
|---|---|---|
| output latency | 10–40ms | `AudioContext.outputLatency` + `baseLatency`; **100–300ms on Bluetooth** |
| input latency | 5–15ms | use `event.timeStamp`, not `performance.now()` inside the handler |
| cross-machine clock | 10s of ms | needs an SNTP-style offset handshake with the DO |
| room acoustics | ~3ms/metre | 10m from the PA = 30ms |

**Mitigations, in order of value:**

1. **Calibration screen.** Metronome plays, player taps space on the beat, we store their personal
   offset. Collapses output + input + distance into one measured number. Every rhythm game does
   this; it is not optional.
2. **Re-anchor playback.** Schedule stem start against a known epoch and derive song position from
   `ctx.currentTime` — the audio clock is the only one that matches what leaves the speakers.
   Fill in `useTransport.ts`.
3. **Judge locally, never server-side.** Only the player's machine knows its own offsets. Send the
   judgment, not the keystroke time.
4. **Generous windows** (§4). For a party game in a room with one PA, ±80/±150/±220 absorbs a lot
   of residual error. Tighten later if it feels mushy.
5. **Clock handshake** for distributed mode. Skippable if the show runs shared-audio.

For a talent show in one room on one PA: shared audio + per-player calibration + generous windows.
That combination makes items 3–5 mostly moot.

## 6. Renderer changes

Mostly additive — the highway from `render/stage/` already covers the structure.

- Notes become single letters: smaller boxes, ~8 in flight instead of ~2.
- Travel time becomes a constant in seconds (~1.8–2.5s), not a function of WPM.
- **Beat lines replace the decorative scrolling rungs** — the lane pulses with the actual music.
  Near-free: the rung renderer exists and just needs beat times instead of a fake scroll.
- Judgment popups per lane (`PERFECT` / `LATE`), hit-window flash, and an early/late timing meter
  on the deck.
- `LiveStat` gains judgment counts (and possibly `lastJudgment` for remote-lane popups). At 20Hz,
  remote judgments land within ~50ms — fine for juice.

## 7. Offline pipeline

New `scripts/chart-song.py`, run from `add-song.sh` alongside `analyze-song.py`:

1. `librosa.beat.beat_track` on the full mix → tempo + beat times
2. `librosa.onset.onset_detect` per stem → raw onsets
3. quantize onsets to the beat grid at 1/8 and 1/16; drop duplicates
4. thin to each difficulty's density target
5. emit per-lane, per-difficulty time arrays

Storage: a **sidecar `chart.json`**, not `song.json`. Six lanes × three difficulties × 3 minutes of
16ths is ~26k numbers (~150KB raw); delta-encoded ints keep it small. `song.json` stays a manifest.

Cost: `librosa` into the `.demucs` venv (pulls numba + llvmlite, ~100MB). Songs with no chart fall
back to a synthesized fixed grid, or stay in word mode.

## 8. Phasing

The real unknown is **whether typing to a rhythm is fun at all**. Phase 1 answers that with none of
the pipeline work.

| phase | scope | proves |
|---|---|---|
| **1. Feel** | letter notes on the highway against a real chart, new reducer + windows + scoring. Engine and charts are done; the client is not. | does it feel good? is the density right? |
| **2. Sync** | re-anchor playback to the transport, calibration screen, `event.timeStamp` | is it *fair*? do windows feel honest? |
| **3. Real charts** | `chart-song.py` with per-stem onsets, sidecar charts, fallback grid | do lanes feel like their instrument? |
| **4. Content + tune** | long-form passages, density per difficulty, hand overrides for the show song | is it shippable? |

Phase 1 is deliberately throwaway-able: if typing-to-rhythm doesn't feel good, we've spent nothing
on librosa, calibration, or charting.

## 9. Decisions needed

1. ~~**Rhythm source**~~ — decided: per-stem onsets.
2. ~~**Coexist or replace**~~ — decided: they coexist. `noteMode` is a room setting the host flips
   in the lobby, defaulting to `words`. Solo is still word-only.
3. **Content** — long-form passages, cyclic word pool, or lyrics for the vocal lane.
4. **Audio topology for the show** — one PA (shared) or everyone on headphones (distributed).
   This decides whether the clock handshake matters at all.
5. **Window generosity** — party-friendly (±80/150/220) or strict (±45/90/140).
