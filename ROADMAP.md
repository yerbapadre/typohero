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

## Next up

- [ ] **Wire nav → real flow** — the single-player screens (character/song/text) are still
      click-through stubs; back them with real pickers. Multiplayer lobby is live already.
- [ ] **Passage picker** — passage is currently hardcoded in both performance screens;
      surface the per-player passage selection (data model already supports it).
- [ ] **Results screen** — dedicated view on `phase: results`: final scores per player +
      band total (both solo and multi land in `results` with no real screen yet).

## Backlog

- [ ] **Content screens** — song picker, passage library, character customization (D1-backed).
- [ ] **D1 seed** — script to upsert `song.json` manifests into the D1 catalog.
- [ ] **Miss stinger** — discrete "clunk" on error, on top of continuous degradation.
- [ ] **Visual highway** — canvas note-highway / juice on the Stage view.
- [ ] **Profiles** — single-player stats persisted to D1.
- [ ] **Stems → R2** — move real song stems to a private R2 bucket (kept out of the public repo).
- [ ] **`index.html` no-cache** — serve the SPA entry uncached so deploys show up instantly (hashed assets stay immutable).
- [ ] **Cloudflare Access** — company SSO in front of the app before the show (replaces the dumb gate).
- [ ] **Feel tuning** — degradation intensity, recovery speed, quality window, WPM presets.
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
