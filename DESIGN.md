# Design

> **Status: target, not as-built.** This file is the destination DESIGN.md the upcoming `/impeccable` work converges on. Re-run `/impeccable document` after the visual passes land to reconcile.

## Scene

A Cubs fan opens this on a phone over morning coffee in late August. The page should feel like the actual Wrigley center-field scoreboard rendered in HTML: deep ivy iron, weathered cream tile cards slid into slots, hand-painted white labels, a small red flag for "live now" and a real W flag for the celebration. Not a tribute to a scoreboard. Not a stylized scoreboard. A scoreboard.

When the W flag flies, it's the same physical object the actual stadium raises after a win.

## Color

**Strategy: Drenched.** A single saturated color (deep ivy green) carries the surface; cream tile cards are the data containers, ink is the numeral color, and red is the celebration / live-state accent. Gold is the only optional trim. No neutrals, no grays.

```css
/* === FIELD === the scoreboard's painted iron */
--field:        oklch(0.30 0.07 145);   /* primary green ground */
--field-deep:   oklch(0.22 0.07 145);   /* recesses, shadow under tile */
--field-shade:  oklch(0.36 0.06 145);   /* slightly lighter green for inner panels */
--field-light:  oklch(0.42 0.06 145);   /* hairline rule lines on the iron */

/* === TILE === weathered cream cards that slot into the iron */
--card:         oklch(0.93 0.025 75);   /* tile face — like aged scoreboard stock */
--card-shade:   oklch(0.86 0.03 75);    /* slight bottom-edge wear */
--card-edge:    oklch(0.74 0.04 75);    /* tile-edge shadow line */
--ink:          oklch(0.18 0.04 260);   /* numeral ink on tile, deep navy */
--ink-faint:    oklch(0.42 0.04 260);   /* secondary ink */

/* === PAINT === hand-lettered text on the green iron */
--paint:        oklch(0.95 0.02 80);    /* white painted text */
--paint-dim:    oklch(0.78 0.04 80);    /* dim painted text */
--paint-faint:  oklch(0.62 0.05 80);    /* footnote painted */

/* === ACCENTS === */
--gold:         oklch(0.62 0.10 70);    /* weathered brass trim, ceremonial */
--gold-soft:    oklch(0.50 0.07 70);    /* deeper brass for shadows */

/* === SEMANTICS === */
--w-red:        oklch(0.55 0.20 25);    /* W-flag red — the loud moment */
--flag-red:     oklch(0.50 0.16 25);    /* small live-flag glyph, dimmer */
--win:          var(--card);            /* a win is a fresh tile */
--loss:         var(--paint-faint);     /* a loss is dim painted text */
```

**Rules:**
- Background = `--field`. The body is green, full stop. No paper, no cream surface, no overlay washes.
- Numerals only appear on `--card` (cream tile faces). Never directly on green.
- Labels appear directly on green as `--paint`. Never on cream.
- Gold is reserved for ceremonial trim and lead-team highlights only. ≤5% of surface.
- W-flag red = celebration. Live-flag red = a small dim flag glyph for "game in progress." They are visibly different shades so the celebration outshines the indicator.
- No gradients on text, ever.
- No `backdrop-filter` outside the highlights modal scrim.
- No shadows in brand colors; shadows are `oklch(0 0 0 / 0.20–0.40)` for tile depth only.

## Typography

**Four roles, four families.**

```css
--font-display: 'Bowlby One', 'Impact', 'Arial Black', sans-serif;
--font-label:   'Anton', 'Impact', sans-serif;
--font-body:    'Public Sans', system-ui, -apple-system, sans-serif;
--font-mono:    'IBM Plex Mono', ui-monospace, monospace;
```

**Bowlby One** carries every numeral on a tile card and every section heading rendered as painted block letters. It's a chunky, mid-century industrial display sans with a single weight (400). On a tile card, set it large and slightly negative-tracked so the ink fills the cream face with authority.

**Anton** carries small uppercase labels painted on the green iron: "MAGIC NUMBER", "NL CENTRAL", "RECORD", etc. Extra-condensed, single-weight (400). Track 0.18em–0.22em.

**Public Sans** carries running prose (the sublabel under the magic number, glossary tooltips, footer disclaimer). Quiet, neutral, humanist, US-government-issued. Out of the AI-default lane.

**IBM Plex Mono** carries inline numerics that don't get the tile treatment: dates, times, win percentage, scoreboard cells in the linescore. Editorial-coded; works on either tile or paint.

**Type scale.** The tile-card hero dominates; everything else is small.

```css
--text-tile-hero:   clamp(8rem, 22vw, 14rem);   /* the magic number tile */
--text-tile-large:  clamp(2.5rem, 6vw, 4rem);   /* live-card score tiles */
--text-tile-mid:    clamp(1.5rem, 3vw, 2.25rem); /* standings W/L tiles */
--text-h1:          clamp(2rem, 4vw, 3rem);     /* painted section heads (Bowlby) */
--text-label-lg:    clamp(13px, 1.4vw, 16px);   /* painted eyebrow (Anton tracked) */
--text-label:       11px;                       /* small painted labels (Anton tracked) */
--text-body:        15px;                       /* Public Sans body */
--text-meta:        13px;                       /* mono numerics */
--text-caption:     11px;                       /* footnote */
```

**Weights:** display 400 (Bowlby is single-weight), label 400 (Anton is single-weight), body 400/600 (Public Sans), mono 400/500 (Plex). No extra-bold anywhere; the chunkiness comes from Bowlby itself.

**Body measure** capped at 60–70ch. Line-height 1.5 for body, 1.0 for tile numerals, 1.15 for painted heads.

## Tile cards

The defining component. A tile is a cream-faced rectangle that holds one or more numerals, slid into the green iron with a subtle drop shadow.

```css
.tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  color: var(--ink);
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1;
  padding: 0.06em 0.18em 0.10em;
  border-radius: 4px;
  box-shadow:
    inset 0 -3px 0 var(--card-shade),    /* worn bottom edge */
    inset 0 1px 0 oklch(1 0 0 / 0.4),    /* highlight along top */
    0 3px 0 var(--field-deep),           /* tile drops onto the iron */
    0 6px 14px oklch(0 0 0 / 0.30);
  position: relative;
}

.tile + .tile { margin-left: 0.08em; }   /* small gap between digits */

/* When a tile updates, it flips. Quick mechanical flip, no easing past curve. */
.tile.flip {
  animation: tile-flip 380ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes tile-flip {
  0%   { transform: rotateX(0); }
  50%  { transform: rotateX(-90deg); }
  51%  { transform: rotateX(90deg); }
  100% { transform: rotateX(0); }
}
```

The hero magic number is a row of `.tile` digits. "42" → `<span class="tile">4</span><span class="tile">2</span>`. Each digit is its own tile. When the number drops, the affected tile flips.

**Reduced-motion fallback:** tiles update instantly without rotation; an opacity fade on the new digit replaces the flip.

## Painted labels

Text that lives directly on the green iron, never inside a tile. White paint that looks like it was applied with a stencil and then weathered.

```css
.painted {
  font-family: var(--font-label);
  color: var(--paint);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 400;
  line-height: 1.15;
  /* subtle paint-cracking effect: very faint inner shadow */
  text-shadow: 0 1px 0 oklch(0 0 0 / 0.25);
}
.painted.dim    { color: var(--paint-dim); }
.painted.faint  { color: var(--paint-faint); }
.painted.gold   { color: var(--gold); letter-spacing: 0.12em; }
```

Section heads ("NEXT UP", "NL CENTRAL", "RECENT RESULTS") use `.painted` with `--text-h1` size. They sit on the green field with no decoration.

## Spacing

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

Section breaks use `--space-16` minimum on desktop. Within a section, tile rows are `--space-2` apart.

Page max-width: `min(960px, 92vw)`. The hero tile row can break out wider via negative margin. Nothing else does.

## Elevation

```css
--elev-tile-1:  0 2px 0 var(--field-deep), 0 4px 10px oklch(0 0 0 / 0.25);
--elev-tile-2:  0 3px 0 var(--field-deep), 0 6px 14px oklch(0 0 0 / 0.30);
--elev-modal:   0 30px 60px oklch(0 0 0 / 0.55);
```

The dual-shadow approach (a hard offset shadow plus a soft halo) is what makes a tile look like it sits on iron rather than floats in space. Use it consistently.

## Motion

**Energy: mechanical.** Tiles flip when their value changes. The W-flag flutters when raised. Live indicators pulse. That's it. Nothing transitions for transition's sake.

```css
--ease:           cubic-bezier(0.22, 1, 0.36, 1);
--ease-emphasis:  cubic-bezier(0.16, 1, 0.3, 1);

--dur-fast:   180ms;
--dur-base:   320ms;
--dur-slow:   640ms;

@keyframes live-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
```

**Bans:**
- No bouncy easing (overshoot).
- Never animate layout (`width`, `height`, `padding`, `margin`, `top/left`). Use `transform` and `opacity`.
- No hover-lift on cards or rows. The tiles don't levitate.
- No rotation on hover. Logo doesn't spin.
- All motion respects `@media (prefers-reduced-motion: reduce)`: tile flips become instant value swaps, flag flutter is static, confetti is skipped, count-up animation jumps to final value, live-pulse stills.

The W-flag celebration earns its volume because nothing else on the page moves like that.

## Components

### Magic number (the hero)

The page's primary affordance. A row of tile-card digits set huge, sitting on the green iron with shadow depth. Asymmetric left-aligned at desktop ≥768px; centered on mobile.

```
ASCII shape (desktop):

  MAGIC NUMBER

  ┌───┐ ┌───┐
  │ 4 │ │ 2 │
  └───┘ └───┘

  RECORD 134-67  ·  PCT .667  ·  STREAK W4  ·  LAST10 9-1

  Cubs lead the NL Central. Any Cubs win or
  Brewers loss drops the number by one.
```

- Eyebrow "MAGIC NUMBER" / "CHASE NUMBER": `.painted` Anton tracked 0.22em, `--paint` color, ~13–16px, sits 12–16px above the tile row.
- Tile row: each digit a `.tile` with `--text-tile-hero` font-size. Small gap between tiles. Drops onto the iron with `--elev-tile-2`.
- Meta line: IBM Plex Mono, all-caps tracked, mid-dot separators, painted color (`--paint-dim`).
- Sublabel: Public Sans body, `--paint-dim`, max 60ch, italic optional.

When the number drops, the affected tile flips. When the magic number reaches 0 (clinch), the entire tile row flashes white once, then the W-flag flies.

### Live game card

Default mode: editorial line + linescore + WP sparkline. The score is rendered as small tile cards.

```
ASCII shape (live):

  ▣ LIVE  ·  BOT 7TH
  ┌────┐ ┌────┐                ┌──┐ ┌──┐
  │CHC │ │ 4  │                │STL│ 2 │
  └────┘ └────┘                └──┘ └──┘
  Happ at the plate, 2-1 count. Suzuki on second.
  ─────  linescore  ─────
  ─────  win probability  ─────
```

- LIVE indicator: small red flag glyph + `BOT 7TH` painted. Red here is `--flag-red`, dim, never as bright as the W-flag.
- Score: each team's runs in a `.tile.tile-mid`. Team abbreviation in a smaller `.tile.tile-small` next to it. Lead team's score tile gets a `--gold` border-color.
- Last play: Public Sans body, `--paint-dim`, italic optional.
- Linescore: IBM Plex Mono, `--paint-dim`, hairline `--field-light` rules.
- WP sparkline: 1px `--paint` line on a slightly darker `--field-deep` panel.

When no game is live, the card collapses to one painted line: `NEXT GAME · FRI vs BREWERS · 7:05PM CT · 6h 12m TO FIRST PITCH`.

### Standings

A scoreboard panel: each team is a row of small tile cards (W and L numbers as tiles) with painted team name beside.

```
TEAM             W    L    PCT    GB    L10
─────────────────────────────────────────────
CUBS            ⊞134 ⊞ 67  .667    ·    ⊞7-3   ← Cubs row brighter, gold trim
BREWERS         ⊞130 ⊞ 72  .644   3.5   ⊞6-4
CARDINALS       ⊞121 ⊞ 80  .602  12.0   ⊞5-5
REDS            ⊞ 88 ⊞113  .438  46.0   ⊞4-6
PIRATES         ⊞ 72 ⊞130  .356  61.5   ⊞3-7
```

- Header row: `.painted` Anton tracked, dim color.
- Team name: `.painted` Anton tracked, `--paint` color (full white for Cubs row, `--paint-dim` for others).
- W and L: small tile cards (`.tile.tile-mid`) with the count as Bowlby numerals.
- PCT, GB: IBM Plex Mono, painted directly on green.
- L10: small tile card.
- Cubs row gets a hairline `--gold` border-bottom and slightly brighter painted text. No background fill change.

Pace bars retired (replaced by the W/L tile sizing).

### Game rows (Recent + Coming Up)

Editorial list rows survive from round 2, but recolored: cream tile chips on green for date and result, painted labels for opponent, hairline `--field-light` between rows.

```
SAT 8/24    vs BREWERS         ⊞ W  ⊞6-4    Bellinger 2-HR · Suzuki 3 RBI
FRI 8/23    vs BREWERS         ⊞ W  ⊞5-2    Imanaga 7 IP · 9 K
THU 8/22    @ REDS             ⊞ L  ⊞3-7    bullpen rough
WED 8/21    @ REDS             ⊞ W  ⊞8-1    Tucker 2-HR
```

- Date: small `.tile.tile-small` cream chip with the date (Bowlby small or Plex Mono).
- Opponent: `.painted` Anton tracked.
- W/L: single-letter tile (`.tile.tile-letter`). W tile has cream face + ink letter; L tile has darker stock + faint letter.
- Score: `.tile.tile-small` chip with mono digits.
- Notes: Public Sans body, italic, `--paint-dim`.
- Hairline `--field-light` between rows. No card outlines.

### LIVE pill

Small red flag glyph + "LIVE" painted, sitting in the topbar, only when a Cubs game is live.

```css
.live-flag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-label);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--flag-red);
  font-size: 12px;
}
.live-flag::before {
  content: ''; width: 9px; height: 12px;
  background: var(--flag-red);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 70%);
  animation: live-pulse 1.8s ease-in-out infinite;
}
```

Hidden via `[hidden]` when no game is live.

### Toast / inline status

A single quiet line at the bottom of the page: `· UPDATED 4:23PM`. Painted Anton tracked, `--paint-faint`. No pill, no background, no border.

### W-flag celebration (the loud moment)

The flag is the actual W flag: white field, blue W, blue cross-stripes, gold tassel. The clip-pathed swallowtail trick stays.

On a fresh win:
1. The hero tile row flashes white (each tile face goes briefly to `oklch(0.99 0 0)`) for 200ms then settles.
2. The flag rises from below the magic number, flutters once with a wind curve (3 keyframes, ease-out-expo, total 1400ms).
3. Confetti: cream + ivy-bright + flag-red + gold, no rainbow. Burst from the flag's pole, gravity-driven, settles in 2.5s.
4. The number on screen ticks down by one; the affected tile flips.
5. A single line of painted copy underneath: `CUBS WIN · MAGIC NUMBER NOW 41`.
6. Reduced-motion fallback: number ticks (instant value swap), flag fades in static, no confetti, copy line appears with opacity fade.

This is the only place `--w-red` (the bright shade) appears on the page.

## Copy

- No em dashes anywhere in user-facing copy. Periods, colons, semicolons, mid-dot separators, parentheses.
- Numerics over prose. "Magic number 42" beats "The Cubs need 42 wins or losses by other teams."
- All-caps tracked is the page's natural label voice. Lowercase appears only in body prose and tooltips.
- Glossary: provide quiet inline definitions for *Magic / Chase / Tragic* on first appearance via a hairline-underlined `cite` element with native `title` tooltip.
- No marketing voice. No exclamation points outside the win-celebration line.

## Anti-patterns (forbidden)

- `background-clip: text` with a gradient
- `backdrop-filter: blur` outside the modal scrim
- Side-stripe borders or pseudo-stripes (`border-left/right >1px` colored accents OR `::before` 3px+ colored bars next to headings)
- Cards with shadows in brand colors
- KPI card grids
- Bouncy easing curves (overshoot)
- Animating `width`, `height`, `padding`, `margin`
- Tailwind hexes outside this file
- `#fff`, `#000`, `white`, `black` as raw values
- Inter, Bebas Neue, Roboto, Open Sans, Lato, Montserrat as font choices (Frank Ruhl Libre and IBM Plex Mono are kept; Bowlby One, Anton, Public Sans replace the rest)
- Em dashes in copy
- Glow effects on text or cards
- Modal-as-first-thought
- Hover lift on rows or cards
- Hover rotation on logos
- More than three border-radius values across the site (tiles 4px, modal 4px, nothing else)
