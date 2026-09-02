# LeCoin Store — Design

**Date:** 2026-09-01
**Status:** approved design, ready for implementation planning

Crowd spectators can walk up to a booth in the pit, open a menu, and spend **LeCoin** on
joke merchandise. Balances and every transaction persist in a database. What you buy shows
above your frog so the rest of the pit sees it.

The booth props, proximity detection, and the Enter keybinding already exist
(`apps/web/src/screens/multi/CrowdFloor.tsx`, commit `217e3d4`). This design covers the
functionality behind them.

## 1. Architecture

Money logic lives in the **Worker + D1**. The Durable Object stays a relay for one room's
live state, so wallets never get tangled up in room lifecycle.

```
CrowdFloor (booth click / Enter)
   → StoreMenu  ──HTTP──►  Worker /api/store/*  ──►  D1  (wallets, products, transactions)
   → on success  ──WS───►  GameRoom  ──►  crowd broadcast (holding)  ──►  every pit
```

Layering follows the repo's existing rule that dependencies point downward only:

| Layer | Adds |
|---|---|
| `packages/engine/src/store.ts` | Pure rules + types: `STARTING_LECOIN`, `normalizeUsername`, `canAfford`, `applyPurchase`. Unit tested. No I/O. |
| `packages/protocol/src/messages.ts` | `hold` client message; `holding` field on crowd members. |
| `apps/server` | D1 binding, migrations, `/api/store/*` routes, `holding` relay in `GameRoom`. |
| `apps/web` | Username entry, `useStore` hook, `StoreMenu`, booth clicks, held-item rendering. |

This is the project's first D1 binding. `apps/server/migrations/0001_init.sql` already exists
but was never wired to anything; this work adds the binding that makes migrations real.

## 2. Data model

### Migration `apps/server/migrations/0002_store.sql`

```sql
CREATE TABLE wallets (
  username     TEXT PRIMARY KEY,   -- normalized: trimmed, lowercased, inner whitespace collapsed
  display_name TEXT NOT NULL,      -- as typed, most recent spelling wins
  balance      INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  booth       TEXT NOT NULL,           -- 'merch' | 'bar' | 'recs'
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  icon        TEXT NOT NULL,           -- emoji, or an asset path beginning with '/'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE transactions (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL REFERENCES wallets(username),
  kind          TEXT NOT NULL,      -- 'grant' | 'purchase'
  product_id    TEXT,               -- NULL for 'grant'
  amount        INTEGER NOT NULL,   -- signed: +grant, -purchase
  balance_after INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_transactions_username ON transactions(username, created_at);
```

**There is deliberately no inventory table.** What a user owns is a query over
`transactions WHERE kind = 'purchase'` grouped by `product_id`. The ledger is already the
source of truth; a second table would only be a chance for the two to disagree.

**Icon column:** holds an emoji by default. If the value starts with `/`, the client renders
it as an `<img>` from `apps/web/public/`. One column covers both, with no component registry,
and items added later without art can still fall back to an emoji.

### Migration `apps/server/migrations/0003_seed_products.sql`

Seeds ship as a migration so local and production both get them by applying migrations.
Prices are tuned against a 500 LeCoin start: two impulse buys, one mid, two aspirational.

| id | booth | name | price | icon | description |
|---|---|---|---|---|---|
| `diet-coke` | bar | Case of Diet Coke | 25 | `/store/diet-coke.png` | A full case. Room temperature, obviously. |
| `baja-blast-pie` | bar | Carter's Baja Blast Pie | 60 | `/store/baja-blast-pie.png` | Carter swears the teal is a flavor, not a dye. |
| `board-game` | merch | Jake's Board Game | 120 | `/store/board-game.png` | Rules explained for 45 minutes. Played for 10. |
| `zando-headshot` | merch | Framed Headshot of Zando | 200 | `/store/zando-headshot.png` | Hangs itself. Watches you type. |
| `seths-boat` | merch | Seth's Boat | 450 | `/store/seths-boat.png` | Not a boat payment. The boat. |

Adding products later is a plain insert — `wrangler d1 execute typohero --command "INSERT INTO
products ..."` — documented in the README.

**The Recs booth sells nothing in this pass** and renders an empty state ("nothing on the
table yet"). It stays a booth so items can be added to it with one insert.

## 3. Currency constant

```ts
// packages/engine/src/store.ts
export const STARTING_LECOIN = 500;
```

One typed place to change it. A new wallet is credited this amount on first touch, recorded
as a `grant` transaction so the ledger explains every coin in circulation.

Deliberately *not* a `[vars]` env override: every other knob in this project needs a redeploy
anyway, and two sources of truth for one number invites drift.

## 4. HTTP API

All routes sit behind the existing `hasSession` cookie gate in `apps/server/src/worker.ts`,
and must be added to `run_worker_first` coverage (`/api/*` already matches).

| Route | Body | Returns |
|---|---|---|
| `POST /api/store/wallet` | `{ username }` | `{ username, displayName, balance, owned: [{productId, count}] }` — creates the wallet and grants `STARTING_LECOIN` if this username is new. |
| `GET /api/store/products` | — | `Product[]` where `active = 1`, ordered by `booth, sort_order`. Client groups by booth. |
| `POST /api/store/purchase` | `{ username, productId }` | `{ ok: true, balance, transactionId }`, or `{ ok: false, error: 'insufficient_funds' }` with 402. |

### Purchase atomicity — stated honestly

D1 has no interactive transactions, so the debit is a conditional write:

```sql
UPDATE wallets SET balance = balance - ?1 WHERE username = ?2 AND balance >= ?1
```

`meta.changes === 1` means the debit landed; `0` means insufficient funds → 402. The ledger
insert follows as a second statement.

A crash between the two statements would debit a wallet without writing its receipt. That is
acceptable at talent-show scale and will carry a comment saying so, rather than being dressed
up as fully atomic. The conditional `WHERE balance >= ?` is what actually prevents overdraft
under concurrent buys, and that part *is* safe.

## 5. Identity

Crowd spectator IDs are regenerated every page load (`crypto.randomUUID()` in
`Crowd.tsx`), so they cannot key a wallet. **The username does.**

- The existing "Your name" input on both crowd-entry screens becomes **"Username"**.
- One identifier: it is both the wallet key and the frog's nameplate.
- Normalized (trim, lowercase, collapse inner whitespace) for the DB key; displayed as typed.
- Moves from `sessionStorage` to `localStorage` so coins survive a browser restart.

Accepted tradeoff: two people who both type `jake` share a wallet. Fine for a company talent
show; the alternative is an account system nobody wants at the door.

## 6. Client

| File | Change |
|---|---|
| `screens/Crowd.tsx` | Name input → username; `localStorage`; thread username through to `CrowdFloor`. |
| `net/useStore.ts` *(new)* | Loads catalog + wallet once, exposes `buy()`. Optimistic balance update reconciled against the response. |
| `screens/multi/StoreMenu.tsx` *(new)* | Replaces the "coming soon" `InteractPanel`: booth marquee, LeCoin balance, product grid (art, name, flavor text, price, Buy), unaffordable items disabled with the shortfall shown, owned count per item, Esc to close. Styled via the project's `frog-cabinet-ui` skill. |
| `screens/multi/CrowdFloor.tsx` | Booth props become clickable; render `holding` above each frog; balance HUD beside the 👥 count. |
| `screens/multi/StageView.tsx` | Pass username down to `CrowdFloor`. |

### Interaction

- **Enter** stays proximity-gated (`REACH = 8`), exactly as built.
- **Click** opens a booth **regardless of distance** — props become `pointer-events-auto`
  with a hover highlight. Requiring you to walk into range before a click registers reads as
  broken rather than immersive.

### Visible effect

On a successful purchase the client sends `{ type: "hold", productId }`. `GameRoom` stores it
on that connection's `CrowdEntry` and includes `holding` in the existing `crowd` broadcast.
Every client already has the catalog, so it looks up the icon and floats it above that frog.

Your **most recent purchase** is what you hold — a second buy replaces the first. `holding`
lives on the connection's `CrowdEntry`, so it clears naturally when you leave the pit and is
never persisted to D1 (it is presentation, not money).

Cost: one client message, one optional field on an existing broadcast. No new channel.

## 7. Art assets

Five source images live in `~/Downloads/typehero assets/` — pixel art JPEGs, 1169×912 (the
headshot 1024×1024), on a **cream background, not transparent**. Dropped in as-is they would
show cream boxes against the dark pit and menu, so they need prep.

**Verified recipe** (ImageMagick, confirmed working on the two hardest images — the boat's
interior gaps and the framed headshot both cut cleanly):

```sh
magick "$src" -alpha set -fuzz 18% \
  -fill none -draw "alpha 0,0 floodfill" \
  -fill none -draw "alpha %[fx:w-1],0 floodfill" \
  -fill none -draw "alpha 0,%[fx:h-1] floodfill" \
  -fill none -draw "alpha %[fx:w-1],%[fx:h-1] floodfill" \
  -trim +repage -filter point -resize 256x256 "$out"
```

Flood-filling from all four corners only clears the connected outer region, so interior
detail survives. `-filter point` is nearest-neighbor, which keeps the pixel edges hard
instead of blurring them. Output is ~60–100 KB per PNG.

- Ships as `scripts/prep-store-assets.sh <src-dir>`, matching the existing `scripts/`
  convention (`add-song.sh`, `sync-songs.sh`) so item #6 follows the same path.
- Outputs to `apps/web/public/store/{diet-coke,baja-blast-pie,board-game,zando-headshot,seths-boat}.png`.
  Vite copies `public/` into `dist/`, which is what wrangler binds as `[assets]`.
- Only processed PNGs are committed; the source JPEGs stay out of the repo.
- Store art renders with `image-rendering: pixelated` so CSS downscaling (≈96px in the menu,
  ≈36px above a frog) does not soften the pixel art.

Source → product mapping, confirmed by eye:

| Source file | Product |
|---|---|
| `Gemini_Generated_Image_2hrxly…` | Diet Coke can |
| `Gemini_Generated_Image_jdmg6f…` | Teal Baja Blast pie slice |
| `Gemini_Generated_Image_ivkyl9…` | Wooden chess pawn → Jake's Board Game |
| `Gemini_Generated_Image_z6znms…` | Framed pixel headshot → Zando |
| `Gemini_Generated_Image_jk1cbo…` | Green wakeboard boat → Seth's Boat |

## 8. Testing

**Unit (vitest in `packages/engine`, matching where every other test lives):**

- `normalizeUsername`: trims, lowercases, collapses inner whitespace; empty/whitespace-only is rejected.
- `canAfford`: exact balance passes; one short fails.
- `applyPurchase`: returns the new balance and signed amount; returns `null` on insufficient funds.
- Grant-on-first-touch: a fresh wallet starts at `STARTING_LECOIN`.

**Manual against local `wrangler dev` + local D1** — the same way the DO was verified:

1. Apply migrations locally; confirm the five products come back from `/api/store/products`.
2. Join `/crowd/<code>` as a new username → balance reads 500.
3. Walk to the Bar, press Enter, buy a Diet Coke → balance 475, item shows as owned.
4. Click the Merch booth from across the pit → menu opens; Seth's Boat is disabled with the shortfall shown.
5. Second browser in the same room → the first frog visibly holds its item.
6. Refresh → balance and inventory persist (localStorage username + D1 wallet).
7. `SELECT * FROM transactions` → one `grant` and one `purchase` row, balances consistent.

## 9. Risks and accepted tradeoffs

- **Shared wallets on identical usernames.** Accepted; see §5.
- **Debit/receipt is two statements, not one transaction.** Accepted and commented; overdraft
  is still prevented by the conditional update.
- **First D1 binding in the project.** Needs `wrangler d1 create typohero`, the
  `[[d1_databases]]` block, migrations applied to both local and production, and README setup
  steps. This is the main "new infra" risk in the work.
- **Small held icons.** The boat and framed headshot are detailed; at ≈36px above a frog they
  read as silhouettes. Acceptable — the menu is where the art is legible.
