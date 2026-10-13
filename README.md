# BriefVault

Personal daily-briefing PWA. Four tabs, refreshed on a schedule:

1. **Local** — St. Louis, MO weather for the day + 5 ranked local stories
2. **World** — 5 ranked world stories
3. **India** — 5 ranked India stories + a dedicated **US–India immigration** section
4. **Learn** — 3–5 original microlearning cards on a theme that rotates daily

## How it works

Static site on **GitHub Pages** (served from `docs/`). A scheduled **GitHub Action**
(`.github/workflows/build-digest.yml`, 2×/day) runs `scripts/build-digest.mjs`, which:

1. fetches free **RSS** feeds for the four news pools (`rss-parser`),
2. fetches **Open-Meteo** weather for St. Louis (no API key),
3. makes **one Claude call** that ranks each pool to the top items, writes a one-line
   "why it matters", and generates the microlearning cards,
4. writes `docs/data/digest.json` and commits it.

The browser only ever reads `digest.json` — it never holds an API key and makes no
AI calls. The service worker caches the shell and last digest for offline use.

## Setup

1. Push this folder to a GitHub repo.
2. **Settings → Secrets and variables → Actions** → add `ANTHROPIC_API_KEY`.
3. **Settings → Pages** → Source: `main` branch, `/docs` folder.
4. **Actions** tab → run **Build daily digest** once via *Run workflow* to replace the seed data.

## Local development

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run build   # rebuild docs/data/digest.json
npm run check                                 # validate digest shape (assert self-check)
npm run serve                                 # http://localhost:3000  (do NOT open via file://)
```

## Notes / tuning

- **Location** is hardcoded to St. Louis (lat/lon + feed queries in `build-digest.mjs`).
- **Cadence**: cron is `0 11,23 * * *` UTC (~6am/6pm CT). Drop to once/day to cut cost.
- Icons are SVG only; add `icon-192.png` / `icon-512.png` if you want raster fallbacks.
