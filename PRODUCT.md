# Product

## Register

brand

## Users

Three audiences, ranked by primacy:

1. **The diehard daily check-in** (primary). A Cubs fan who opens the site on phone over morning coffee, again during the game, and once before bed. Wants to know the magic number, where the Cubs sit in the NL Central, and whether anything is happening right now, at a glance, in under five seconds. The streak counter exists for them.
2. **The casual late-season fan** (secondary). Shows up in August / September when the playoff math turns real. Doesn't track box scores; cares about the countdown drama, the W-flag moment, and whether tonight matters.
3. **Friends-and-family of the maker** (tertiary). Arrived via a shared link or portfolio. Reading the site as much as a craft object as a tracker. "Cool, somebody actually built this."

The site has to serve the diehard first without losing the drama for the casual fan or the craft for the visitor.

## Product Purpose

Fly the W is a single-page, live Cubs magic-number tracker. It exists because the official sources (MLB.com, ESPN, the team app) bury the magic number under ad chrome, store CTAs, and navigation bloat. For a real fan, the magic number is a daily ritual, not a feature.

Success is the diehard opening this every morning instead of MLB.com, the casual fan tabbing back to it during a September pennant race, and a first-time visitor staying long enough to click the W flag once.

## Brand Personality

**Hand-set. Tactile. Public-square.**

The page is a Wrigley manual scoreboard rendered in HTML. Deep ivy field. Weathered cream tile cards slid into iron slots. Painted white labels. Ceremonial trim where it matters; nothing decorative. Numbers are physical artifacts that feel like someone walked up an iron ladder, plucked a tile, and dropped a new one in.

Three words: **hand-set, ceremonial, public-square.**

Tone of copy: short. Numeric where possible. No marketing voice, no hype, no exclamation points outside the win-celebration moment. Where prose appears, it has the cadence of a public-address voice between innings: terse, factual, faintly affectionate.

The design isn't a magazine, isn't a SaaS dashboard, isn't a TV broadcast graphic. It's the actual scoreboard at the back of the bleachers, made readable through a phone. The aim is for someone to see it and think "wait, this is a real scoreboard, it just lives in a browser."

## Anti-references

**Corporate baseball / SaaS-template / editorial-magazine, full stop.** Specifically:

- MLB.com / team-app chrome: nav bloat, ad slots, "shop the team store" CTAs.
- The hero-metric SaaS template (big number with KPI strip).
- Sportsbook / DraftKings urgency: oversaturated greens and reds, blinking odds, push-CTA energy.
- Generic "futuristic" sports tech: neon gradients, glassmorphism, orbital glows.
- Editorial-typographic templates: cream paper + Frank Ruhl Libre + IBM Plex Mono + ruled list rows. (Round-2 register; superseded.)
- Cards-on-cards dashboard layouts.

## Design Principles

1. **The number is the page.** Magic number / Chase number is the largest, most physical element. It renders as scoreboard tile cards, not as type. Everything else is supporting label.
2. **One loud moment, earned.** The page is quiet 99% of the time so that the W-flag flutter and confetti on a fresh win actually mean something. The flag is the only thing on the page that's allowed to be loud.
3. **Glanceable in five seconds.** A diehard on the bus should get magic number, division position, and "is something happening now?" without scrolling or reading.
4. **Scoreboard tactility.** Cards slot into the green field. Labels are painted on the iron. Numerals look hand-set. Drop shadows imply physical depth, never decoration. Animation is mechanical, not motion-design.
5. **Hand-built, not branded.** This is a fan's project, not a product team's deliverable. Idiosyncratic micro-detail (a real W flag flutter, a tile that flips when a number drops, a ceremonial countdown to first pitch) beats slick generic polish every time.

## Accessibility & Inclusion

No formal WCAG target, but hold a working floor:

- Body text and UI numerics meet roughly AA contrast against their backgrounds; never sacrifice legibility for vibe. Cream tiles on green field need a clean ink color.
- Keyboard: clicking the W flag and any nav-style controls must be reachable by tab + enter.
- Motion: confetti and the W-flag flutter and any tile-flip animations respect `prefers-reduced-motion` with quieter substitutes (static flag, no confetti, instant tile updates). Reduced-motion users are still part of the diehard cohort.
- No flashing or strobing effects, ever; the celebration is joyful, not seizure-risky.
