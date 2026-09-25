# My Munich Events

Weekly curated events in and around Munich – 繁中 / English / Deutsch.
Static site (no build step): `index.html` + `assets/` + `i18n/` + `data/events.json`.

## Develop

```bash
npm run dev        # serves the folder on http://localhost:5173
npm run validate   # checks data/events.json against the data contract
```

## How it updates

A scheduled Claude Code routine runs every Friday morning, follows [`ROUTINE.md`](ROUTINE.md),
rewrites `data/events.json`, validates it, and pushes to `main`. Vercel redeploys on push.

## Structure

| Path | Purpose |
|------|---------|
| `index.html`, `assets/` | Front end (list view, calendar view, filters, .ics export) |
| `i18n/*.json` | UI strings, category/tag/language labels per locale |
| `data/events.json` | The weekly data (contract documented in `ROUTINE.md`) |
| `scripts/validate.mjs` | Data validator, run before every push |
