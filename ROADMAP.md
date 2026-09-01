# TypoHero — Roadmap

A co-op typing performance game (Nitro Type × Guitar Hero) for a company talent show.
Everyone joins a band, picks an instrument, and "plays" their part by typing against a
paced passage. Type well → your stem sounds tight. Choke → *your* instrument audibly
falls apart while the band keeps going.

See `README.md` for architecture. This file tracks what's done, what's next, and the
open decisions.

## Architecture at a glance

Dependencies point downward only. The engine is pure and knows nothing about React,
audio, network, or Cloudflare.

```
packages/engine    pure TS: typing reducer, pace, scoring, room state machine
packages/protocol  wire contracts (ClientMsg / ServerMsg, LiveStat)
apps/web           Vite + React client (player controller + audio host)
apps/server        Cloudflare Worker + Durable Object (one DO = one room)
scripts/           offline Demucs stem-splitting pipeline
```

## Done

- [x] **Typing engine** — forgiving reducer (backspace → fixed), streak tracking. Tested.
- [x] **Pace layer** — difficulty → WPM; a pace cursor burns un-typed chars (hard mode). Tested.
- [x] **Scoring** — base points × streak-multiplier ladder (up to 5×). Tested.
- [x] **Navigation** — top-level screen state machine (mode → band → waiting → … → performance).
- [x] **Audio reaction** — Web Audio per-stem degradation (lowpass + distortion + duck), driven by a rolling typing-quality signal.
- [x] **Multi-stem playback** — 6 lanes mixed live, sample-synced; per-lane gating (your stem reacts, others play clean backing).
- [x] **Offline stem pipeline** — `setup-demucs.sh` + `add-song.sh` (Demucs 6-source → Opus → manifest).
- [x] **Room state machine** — pure reducer: join/reconnect, host, propose/confirm song & start, per-player instrument/passage/difficulty, audio-output modes, lifecycle. Tested.
- [x] **Protocol** — full client/server message contracts.
- [x] **Durable Object shell** — `GameRoom` wraps `roomReducer` with WebSocket I/O: connection ↔ player mapping, reconnect tokens, `session` snapshots, 20Hz `frame` flush, synced countdown, end-of-song alarm. Verified end-to-end in local Miniflare.
- [x] **Deploy + CI/CD** — one Worker serves the web SPA + the room DO. GitHub Actions: checks on PRs, auto-deploy on merge to `main`. Live at https://typohero.ejake370.workers.dev.
- [x] **Password gate** — client-side hash gate (sessionStorage) to keep bots/randoms out.
- [x] **Client networking** — `RoomClient` + `useRoom`; live lobby (create/join by code, roster, song propose/confirm, instrument pick with live uniqueness, ready, host mode/start) and multiplayer performance (20Hz `LiveStat` send, pace anchored to the shared song start, audio-output machine drives stems from the room frame). Verified with two isolated browser clients end-to-end.
- [x] **Performance decomposition** — extracted `useTypingRun` / `useStatBroadcast` / `useStemOutput` hooks + `Roster`; pure `liveStatFromRun` / `qualityFromRun` in the engine. Solo + multi share the typing/pace/audio logic.

## Done (recent)

- [x] **Visual highway** — canvas note-highway on a shared Stage view: one perspective lane per
      player, yours pulled to the centre (`centerOn`), on a cabinet-styled rig (truss, par cans,
      swinging beams, amp stacks in the wings). Each lane carries a deck — nameplate, points,
      streak multiplier, quality meter — plus juice: pixel-burst hits, miss shake, star-power
      chevrons, and lane tearing that mirrors the audio degradation. Band members, spectators and
      the `/stage/<code>` big screen all draw the same scene; remote lanes are rebuilt from the
      room snapshot (deterministic notes) plus the 20Hz `LiveStat`, so only the local lane has
      per-character truth.
- [x] **Crowd pit** — the crowd stands along the front of the stage for the whole show and can
      walk/jump their frog there (`useCrowdWalk`, shared with the lobby playground); two rows of
      NPC frogs keep the pit full, and the whole pit bobs faster as the band plays tighter.
- [x] **Stage route** — `/stage/<code>` big screen joins as an *observer* (a spectator that takes
      no crowd frog): pre-show marquee with the band code and bill, then the live highway.

- [x] **Stem presence + activity** — `analyze-song.py` (ffmpeg `silencedetect`) bakes per-lane
      `present` + `active` segments into `song.json`; runs in `add-song.sh` + backfills existing
      songs. Engine helpers (`presentLanes`/`laneActiveAt`/`laneFirstActiveMs`, tested). Instrument
      pickers (solo + lobby) hide absent stems; each lane's words hold until its instrument comes
      in (count-in overlay). Solo flow reordered character → song → instrument (song unlocks lanes).
- [x] **WPM bump** — +50 across all difficulties (easy 70 … god 190). Old presets felt too easy.

- [x] **Wire nav → real flow** — single-player character (look + instrument + difficulty),
      song, and passage screens are real pickers backed by `RunConfig`; each gates its Next.
- [x] **Passage picker** — engine passage library (`PASSAGES`); solo passage screen +
      multiplayer lobby passage/difficulty pickers. Both performances build notes from the
      selected passage (no more hardcoded text).
- [x] **Results screen** — solo `results` view (points/accuracy/best streak + replay) driven
      by `summarizeRun`; multiplayer `MultiResults` (ranked players + band total) on
      `phase: results`, fed by the authoritative `results` frame.

- [x] **Premium frogs** — `Frog.premium` marks a character as locked. Locked frogs still ride the
      carousel (solo picker *and* lobby) with their art dimmed under a padlock, so everyone can see
      what's on offer; picking one is blocked until a code is redeemed. `POST /api/unlock` matches
      the code against the Worker's `UNLOCK_CODES` secret (`frogId:CODE,…`, behind the gate cookie)
      and returns the frog id; the client keeps unlocks in `localStorage`. Cosmetic-grade — it keeps
      codes off the client but doesn't stop a player editing their own storage. `FrogArt` falls back
      to a silhouette when the PNG is missing, so entries ship before their art does.

## Backlog

- [ ] **Content screens** — song picker, passage library, character customization (D1-backed).
- [ ] **D1 seed** — script to upsert `song.json` manifests into the D1 catalog.
- [ ] **Miss stinger** — discrete "clunk" on error, on top of continuous degradation.
- [ ] **Profiles** — single-player stats persisted to D1.
- [ ] **Stems → R2** — move real song stems to a private R2 bucket (kept out of the public repo).
- [ ] **`index.html` no-cache** — serve the SPA entry uncached so deploys show up instantly (hashed assets stay immutable).
- [ ] **Cloudflare Access** — company SSO in front of the app before the show (replaces the dumb gate).
- [ ] **Feel tuning** — degradation intensity, recovery speed, quality window, WPM presets.
- [ ] **Highway density** — one note per word at `wpm/5` words per minute means only ~2 notes are
      in flight (`TRAVEL_MS` 6000). Denser chunking would fill the lanes; it changes gameplay, so
      it's a deliberate decision, not a tweak.
- [ ] **Own-lane-local audio** — in distributed mode, drive your own lane from your local run
      (zero latency) instead of the round-tripped frame. Only if the ~100ms feels laggy.
- [ ] **Reconnect UX** — the token/rejoin plumbing exists; add the actual "reconnecting…" flow
      and handle a mid-performance drop gracefully.

## Open decisions

- **Cheating** — stats are currently trust-the-client (fine for a friendly show). Promote
  the engine into the DO for server-authoritative scoring only if needed.
- **Stem hosting** — static `public/songs/` (only the safe `placeholder` is deployed; real songs are gitignored). Move real stems to R2 before the show.
- **6-lane mapping** — Demucs gives vocals/drums/bass/guitar/piano/other. Revisit if a
  song needs finer separation.
- **Song upload / auto-split** — deferred product feature (needs a GPU service + job queue
  + copyright review). The offline pipeline leaves the seam.

## Local dev

```
pnpm install
pnpm dev            # web client → localhost:5173
pnpm test           # engine unit tests
pnpm typecheck      # all packages
```

Add a song (needs a local audio file — keep copyrighted audio OUT of the repo; real songs
are gitignored, the synthesized `placeholder` is committed for testing):

```
./scripts/setup-demucs.sh                                  # one-time (uv + py3.11 + demucs)
./scripts/add-song.sh <file.mp3> <id> "<Title>" "<Artist>" # → apps/web/public/songs/<id>/
```

## Conventions

- Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`); atomic commits.
- **No code comments** — code should be self-documenting.
- Engine stays pure: no React/DOM/network/time. Keep time and I/O at the boundaries.
- Every engine change ships with tests.
