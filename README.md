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
  web/       Vite + React client. Stage route (big screen + audio) and Controller route (players).
  server/    Cloudflare Worker + Durable Object. One DO instance = one game room.
```

- **Audio plays only on the Stage machine** (wired to venue speakers) — no cross-device sync problem.
- **Controllers** send keystroke/state events; the DO relays; the Stage renders the highway + reacts audio.
- **Animation** (note highway, particles) is a canvas renderer on its own rAF loop, decoupled from React.

## Dev

```
pnpm install
pnpm dev          # web client (Vite)
pnpm dev:server   # Cloudflare Worker (wrangler dev)
pnpm typecheck    # typecheck all packages
```
