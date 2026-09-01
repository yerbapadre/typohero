---
name: frog-cabinet-ui
description: The "Amber Cabinet" visual language for this game (Frog Sinatra and the Tadpoles). Use whenever building or restyling any screen/component in apps/web so it matches the established look — dark low-res arcade chrome, Silkscreen pixel type, hard offset shadows, amber accent, crisp frog art.
---

# Frog Cabinet — visual language

Low-res, intentionally anti-polished arcade look. Think faded amber cabinet in a
dark bar, not a rounded mascot app. The **frog line art is the hero and stays
crisp**; everything *around* it goes lo-fi.

## Non-negotiables

- **NO** tilts/rotations on titles or panels.
- **NO** radial/green glows, gradients, or soft blurred shadows.
- **NO** rounded corners (`rounded-*`). Everything is hard-edged.
- **NO** rounded "friendly" fonts (Baloo, Fredoka, Comic-anything). That reads
  "Diary of a Wimpy Kid" — the thing we're avoiding.
- Frogs are never pixelated/filtered — render them clean. Only the UI chrome is lo-fi.

## Type

- Display / all UI chrome: **Silkscreen** → Tailwind `font-pixel`.
  Loaded in `apps/web/index.html`, registered in `tailwind.config.ts`
  (`fontFamily.pixel`).
- Silkscreen is a pixel face — great for labels/titles/buttons, unreadable for
  long paragraphs. For body copy (descriptions, help text) use a plain mono, not
  Silkscreen.
- Buttons/labels: `uppercase tracking-widest`.

## Palette

Tokens live in `tailwind.config.ts` under `colors.cabinet.*`:

| token | hex | use |
|-------|-----|-----|
| `cabinet-bg` | `#12100a` | screen background (warm near-black) |
| `cabinet-accent` | `#f5b53f` | amber — primary action, highlights, accent word |
| `cabinet-ink` | `#1a1305` | text on top of amber fills |
| `cabinet-frame` | `#2a2212` | panel borders, dividers |
| `cabinet-shadow` | `#6b4e18` | hard offset shadow (use as arbitrary `#6b4e18`) |
| `cabinet-btn` | `#1a1710` | default button fill |
| `cabinet-border` | `#322a18` | default button border |
| `cabinet-text` | `#ecdcb4` | body/label text |

Accent is used sparingly: primary button, one highlighted word, focus rings.

## Signature components

**Pixel frame** — bordered box with a hard, un-blurred offset shadow:

```tsx
<div className="border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_#6b4e18]">
  …
</div>
```

**Cabinet buttons** — boxed, uppercase, 2px border. Primary = solid amber:

```tsx
// primary
className="border-2 border-cabinet-accent bg-cabinet-accent text-cabinet-ink px-5 py-5 text-base uppercase tracking-widest"
// default
className="border-2 border-cabinet-border bg-cabinet-btn text-cabinet-text px-5 py-5 text-base uppercase tracking-widest hover:border-cabinet-accent"
```

**Divider** — thin frame-colored bar: `<div className="h-0.5 bg-cabinet-frame" />`.

**Inputs** — dark fill, 2px border, amber focus:
`border-2 border-cabinet-border bg-cabinet-btn focus:border-cabinet-accent`.

## Layout

- Hero frog crisp on top (`/frogs/*.png`, transparent cutouts in `apps/web/public/frogs/`).
- Title **under** the frog, centered, stacked like a band bill
  (main line white, secondary line amber). No tilt.
- Menus: a single centered pixel-frame panel; buttons stacked full-width.
- Keep text generous — this is a big-screen arcade UI, not a dense form.

## Canonical reference

`apps/web/src/screens/ModeSelect.tsx` is the reference implementation of this
language. Match it when styling new screens.

## Assets

- Frog cutouts: `apps/web/public/frogs/{gunslinger,boxer,wizard}.png`
  (transparent, background flood-cut, cropped to content).
- Roster/stats for the frogs: `apps/web/src/characters.ts`.
