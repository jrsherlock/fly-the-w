# Fly the W — Cubs Magic Number Countdown

A live, single-page Chicago Cubs magic-number tracker. For the Cubs fan who doesn't want to wait until September to start the countdown.

**Live site:** https://jrsherlock.github.io/fly-the-w/

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

- Vanilla HTML / CSS / JS — no build step, no dependencies.
- Bebas Neue + Inter + JetBrains Mono via Google Fonts.
- Hand-rolled canvas confetti.

## Disclaimer

Not affiliated with the Chicago Cubs or Major League Baseball. Data courtesy of the public MLB Stats API.
