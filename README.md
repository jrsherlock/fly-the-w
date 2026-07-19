# Fly the W — Cubs Magic Number Countdown

A live, single-page Chicago Cubs magic-number tracker. For the Cubs fan who doesn't want to wait until September to start the countdown.

**Live site:** https://fly-the-w.vercel.app (the older GitHub Pages copy at
https://jrsherlock.github.io/fly-the-w/ still works — its alert bell talks to
the Vercel API cross-origin)

## What it does

- **Magic Number** — auto-computed from the live NL Central standings (`163 − Cubs wins − chaser losses`). When the Cubs aren't in first, it flips to a Chase Number with the elimination tragic-number underneath.
- **Live data** from the public [MLB Stats API](https://statsapi.mlb.com), refreshed every 60 seconds.
- **NL Central standings** with pace bars and Cubs highlighted.
- **Recent results + upcoming games** with W/L badges and a real-time countdown to first pitch on the next game.
- **Daily check-in streak** in the top bar (localStorage) — counts consecutive days you visit, gilds gold at 7+ days.
- **Auto-celebration** — when the page detects a fresh Cubs win since your last visit, confetti bursts and the W flag flutters.
- **Click the W flag** any time to fly the W on demand.

## Run locally

It's a single self-contained HTML file. Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tech

- Vanilla HTML / CSS / JS front end — no build step, no dependencies. The only
  server code is two Vercel Functions in `api/` (`web-push` + `@vercel/blob`).

## PWA + game-day alerts

Install it (Android/desktop get an Install chip; iOS uses Share → Add to Home
Screen) and tap the bell for push alerts:

- **First pitch soon** — ~30 minutes before the Cubs game starts.
- **Late & close** — 8th inning or later, margin ≤2 runs.
- **Fly the W / Final** — the result, and on wins the updated magic number
  (same binding-chaser math as the hero).

Subscriptions are stored AES-256-GCM-encrypted in Vercel Blob; a GitHub Actions
cron (`.github/workflows/push-poller.yml`) pings `api/poll.js` each minute
during game windows, which reads the same MLB Stats API endpoints and fans out
via Web Push (alert logic is pure and unit-tested in `tests/`).
- Bebas Neue + Inter + JetBrains Mono via Google Fonts.
- Hand-rolled canvas confetti.

## Disclaimer

Not affiliated with the Chicago Cubs or Major League Baseball. Data courtesy of the public MLB Stats API.
