# TypoHero

A co-op typing performance game — a cross between MonkeyType and Guitar Hero. Players each take
an instrument lane; typing accuracy drives the playback of that instrument's audio stem, so a tight
band sounds great and a fumbled lane audibly falls apart. 

## Architecture

Dependencies point **downward only**. The engine is a pure TypeScript brain with no I/O.

```
packages/
  engine/    Pure game logic: state machine, typing eval, scoring, timing. No React/DOM/network.
  protocol/  Wire contracts shared by client and server (ClientMsg | ServerMsg).
apps/
  web/       Vite + React client. Solo, band (player), crowd (spectator), and stage routes.
  server/    Cloudflare Worker + Durable Object. One DO instance = one game room.
```

Client routes: `/` mode select, `/solo/*` single-player flow, `/band` + `/room/:code` multiplayer
lobby and performance, `/crowd` + `/crowd/:code` spectators, `/stage` big-screen view. Everything
sits behind a password gate (`apps/web/src/ui/Gate.tsx`).

- **Audio plays only on the Stage machine** (wired to venue speakers) — no cross-device sync problem.
- **Controllers** send keystroke/state events; the DO relays; the Stage renders the highway + reacts audio.
- **Animation** (note highway, particles) is a canvas renderer on its own rAF loop, decoupled from React.

## Dev

### Prerequisites

- Node >= 22, pnpm 9.15 (`packageManager` is pinned; use `corepack enable`)
- `ffmpeg` (only needed to ingest new songs): `brew install ffmpeg`

### First-time setup

```
pnpm install

# 1. Local Worker secrets. The first two are required or the Worker won't boot;
#    UNLOCK_CODES is optional (unset just means no premium frog is unlockable).
cat > apps/server/.dev.vars <<'EOF'
GATE_SECRET=frogs
UPLOAD_TOKEN=dev-upload-token
UNLOCK_CODES=encore:SIDLIVES,headliner:STAIRWAY
EOF

# 2. Build the web client once. `wrangler dev` binds apps/web/dist as its
#    [assets] directory and hard-fails if it doesn't exist yet.
pnpm build

# 3. Seed a song. The catalog lives in R2, which starts empty locally, so
#    song selection is a dead end until something is uploaded.
node apps/web/scripts/generate-loop.mjs apps/web/public/songs/placeholder/loop.wav
#    (then copy to vocals/drums/bass/guitar/piano/other .wav + write song.json)
./scripts/sync-songs.sh placeholder
```

### Running

Two processes, Worker first:

```
pnpm dev:server   # Cloudflare Worker (wrangler dev) -> localhost:8799
pnpm dev          # Vite web client                  -> localhost:5173
```

Develop against **5173** — Vite proxies `/api` and `/songs` to the Worker, and `RoomClient` dials
`ws://localhost:8799` directly for `/room/:code/ws`. Hitting 8799 directly serves the last
`pnpm build` output, not live code.

The gate password is whatever you set as `GATE_SECRET`.

### Checks

```
pnpm typecheck                    # all packages
pnpm test                         # engine unit tests (vitest)
pnpm build                        # tsc --noEmit + vite build
node apps/server/test-client.mjs  # drives a real DO room: lobby -> countdown -> frames -> results
```

### Songs

The catalog is R2-backed (`SONGS` bucket, keys `songs/<id>/...`), served through the Worker behind
the session gate. Local song folders under `apps/web/public/songs/<id>/` are the source; the Worker's
authenticated `PUT /api/songs/:id/:file` is how they get into the catalog.

```
./scripts/setup-demucs.sh                                   # one-time: uv + py3.11 + demucs (~2GB)
./scripts/add-song.sh <file.mp3> <id> "<Title>" "<Artist>"   # split -> opus -> manifest -> sync
./scripts/sync-songs.sh [id ...]                             # upload local song folders (no args = all)
./scripts/remove-song.sh <id>                                # delete from the catalog
```

Keep copyrighted audio out of the repo — real songs are gitignored; only `placeholder/` is committed.

### Deploy

Push to `main`. CI runs typecheck + test + build, then `wrangler deploy` from `apps/server`
(needs `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets). Production `GATE_SECRET`,
`UPLOAD_TOKEN` and `UNLOCK_CODES` are set with `wrangler secret put`, not `.dev.vars`.

### Premium frogs

Frogs in `apps/web/src/characters.ts` marked `premium: true` render dimmed behind a padlock until
the player redeems a code. `UNLOCK_CODES` is a comma-separated `frogId:CODE` list — one code per
frog, so you control who gets which:

```
wrangler secret put UNLOCK_CODES   # e.g. encore:SIDLIVES,headliner:STAIRWAY
```

`POST /api/unlock` checks the code behind the gate cookie and answers with the frog id; the client
remembers it in `localStorage` under `typohero:unlocked`. The check is cosmetic-grade — it keeps
codes off the client, but a determined player can still edit their own localStorage. Art lives in
`apps/web/public/frogs/premium/`; a card whose PNG is missing falls back to a silhouette, so entries
can ship before their assets do.
