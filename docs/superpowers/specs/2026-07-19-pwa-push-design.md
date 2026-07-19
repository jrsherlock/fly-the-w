# Fly the W — PWA + Push design (delta from CC Tracker)

Date: 2026-07-19 · Approved: user requested "same notification system as CC Tracker"
and chose full migration of hosting to Vercel over a hybrid split.

Reference architecture: `CC Tracker/docs/superpowers/specs/2026-07-19-pwa-push-design.md`
and its implementation plan. This doc records only the deltas.

## Hosting migration

- New Vercel project `fly-the-w` (scope `jrsherlocks-projects`), Git-connected to
  jrsherlock/fly-the-w `main` for auto-deploys. GitHub Pages copy keeps working:
  the front end auto-detects a `github.io` host and calls the Vercel API
  absolutely; `/api/subscribe` sends CORS headers for that origin.

## App differences

- Single-file app: push UI JS/CSS are inlined into `index.html`, using the
  existing `toast(msg)` helper and `$(id)` = getElementById convention.
  Bell + Install chip go in the topbar `.status` cluster.
- `viewport-fit=cover` added; topbar pads by `env(safe-area-inset-*)` from the
  start (lesson learned from CC Tracker's iOS overlay bug).
- `apple-touch-icon` currently points at an SVG (unsupported) — replaced with a
  generated 180px PNG. Icons rasterized from `favicon.svg` (cream W flag);
  maskable = full-bleed cream, badge = white W on transparent.
- Manifest: name "Fly the W — Cubs Magic Number", short_name "Fly the W",
  `background_color #04081a`, `theme_color #0E3386`.
- Service worker hosts: data = `statsapi.mlb.com` (network-first, stale-if-error);
  assets = `midfield.mlbstatic.com`, `img.mlbstatic.com`, Google Fonts
  (cache-first). Shell = `/`, manifest, favicon, cubs-logo.png, icons.

## Alert semantics (MLB, Cubs team id 112)

Data: `statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=112&startDate=…&endDate=…&hydrate=team,linescore,broadcasts`;
game state from `status.codedGameState` ('F'/'O' final, 'I' live, else pre).

- `firstpitch` — next game starts within ≤35 min: "First pitch soon —
  vs Reds · 7:05 PM CT · Marquee" (America/Chicago).
- `lateclose` — live, inning ≥8, margin ≤2 runs, once per game.
- `final` — win: "🚩 Fly the W! Cubs X, Opp Y" with the updated magic number
  ("Magic number down to N") when the Cubs lead the NL Central; loss: plain final.
  Magic number mirrors the app's binding-chaser math (`(162+1) − cubsW −
  chaserL`, chaser = fewest losses among non-leaders) from NL standings
  (`leagueId=104`, division 205).
- No player-watch equivalent (skipped by design).
- Poller windows: first-pitch lead 45 min; post-game tail 4.5 h (baseball games
  run longer); alerts keyed by `gamePk` so double-headers dedupe independently.

## Unchanged from CC Tracker

Subscribe endpoint contract (GET publicKey / POST / DELETE), AES-256-GCM-sealed
subscription blobs + state blob in a dedicated public Blob store
(`fly-the-w-push`), fresh VAPID keypair + `POLL_SECRET` + `BLOB_ENC_KEY` env
(this project's own set), header-only Bearer auth on `/api/poll`, GitHub Actions
`push-poller` workflow (repo is public — free minutes), pure alert logic
unit-tested via `node --test`.
