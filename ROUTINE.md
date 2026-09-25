# Weekly update routine

This file is the full instruction set for the weekly Claude Code routine that refreshes
`data/events.json`. The routine's own prompt only says: **"Follow ROUTINE.md in this repository."**
Edit this file (not the routine) to change what gets searched or how.

## Who the site is for

Johnny (moved from Taipei to Munich in Jan 2025, freelance frontend engineer) and his friends.
Native language Traditional Chinese, reads English, **German is weak**.

## Scope

Events from **today until ~3 months ahead** in Munich and surroundings
(Augsburg, Nürnberg, Salzburg, Regensburg, Ingolstadt, Alps & lakes – up to ~2–3 h by train).

### Interest categories (`category` field)

| category     | what to look for |
|--------------|------------------|
| `music`      | **Priority:** film-score concerts (Hans Zimmer, John Williams, Joe Hisaishi/Ghibli, film-in-concert, anime), **video-game music** (Game On Symphony, Zelda, Final Fantasy/Distant Worlds, Video Games Live…), **oboe** (recitals, concertos, chamber music with oboe – BRSO, Münchner Philharmoniker, Bayerisches Staatsorchester, Münchener Kammerorchester). Also classical, jazz, electronic, indie, festivals, notable pop tours. Size doesn't matter, content does. |
| `exhibition` | Museum/gallery special exhibitions (Pinakotheken, Lenbachhaus, Haus der Kunst, Brandhorst, Deutsches Museum, Kunsthalle…), photo, design. |
| `festival`   | Beer festivals, Christmas markets, flea markets, food festivals, street festivals. |
| `stage`      | Film festivals/series, opera, ballet, musicals, theatre, stand-up/Kabarett. |
| `asia`       | Taiwan-related events, Asian film festivals/series, Asian food festivals, Japanese/Korean culture festivals, Mandarin community meetups. |
| `gaming`     | Game expos, retro gaming, anime/manga/comic cons, board-game events, esports viewing. |
| `nearby`     | Notable events in the surrounding cities / mountains that don't fit better elsewhere. |

Not wanted unless exceptional: tech/developer meetups, outdoor sports.

## Language rule (important)

For language-dependent events (film, theatre, stand-up, tours, talks, workshops, opera) prefer sessions with
English subtitles (OmU with English subs, "English subtitles"), English surtitles (Übertitel), or English-language
performances. Set `language` honestly:

- `en-subs` – English subtitles/surtitles confirmed
- `english` – performed/held in English
- `german-only` – confirmed German without English help (only include if exceptional)
- `unknown` – not stated on the source page (never guess)
- `none-needed` – concerts, markets, most exhibitions, dance

## Quantity & balance

- Target **~50 events** in `events` (excluding past ones). Music at most ~1/3 (≈15–16).
  Spread the rest across the other categories. Never pad with music, and never invent events –
  fewer verified events beat 50 shaky ones.
- Recurring markets can be one event with a date range.
- `weekPicks`: 2–3 ids, the best of the week (film score / game music / oboe get priority).
- **Hard to get:** add `hardToGet` to 3–5 events worth knowing about early even if they are
  more than 3 months away (fast sell-outs, limited capacity, rare tours matching the interests).
  Spend at most ~3–5 extra searches on this.

## Data contract – `data/events.json`

```jsonc
{
  "updatedAt": "YYYY-MM-DD",            // today (Europe/Berlin)
  "weekPicks": ["event-id", "..."],     // must exist in events
  "events": [{
    "id": "kebab-case-unique",          // stable across weeks: keep the same id for the same event
    "titleOriginal": "Name as on the official page (DE/EN), never translated",
    "title":   { "zh-TW": "…", "en": "…", "de": "…" },
    "summary": { "zh-TW": "…", "en": "…", "de": "…" },   // 1 concrete sentence: WHAT happens (programme, performers, format)
    "category": "music|exhibition|festival|stage|asia|gaming|nearby",
    "tags": ["film-score"],             // only tags that exist as tag.* keys in i18n/en.json
    "start": "YYYY-MM-DD" | "YYYY-MM-DDTHH:mm",   // Munich local time; null only when "tba": true
    "end":   null | "YYYY-MM-DD" | "YYYY-MM-DDTHH:mm",
    "tba": true,                        // optional, only for announced-without-date events
    "venue": "…", "city": "…",
    "distance": "city|suburb|daytrip",
    "price": null | "€18–30",           // only if found on a source
    "language": "en-subs|english|german-only|unknown|none-needed",
    "hardToGet": {                      // optional
      "reason": { "zh-TW": "…", "en": "…", "de": "…" },
      "saleStart": null | "YYYY-MM-DD",
      "saleStatus": null | "on-sale|announced|sold-out"
    },
    "links": { "official": "https://…", "tickets": "https://…" },   // tickets optional
    "verifiedAt": "YYYY-MM-DD"
  }]
}
```

Writing rules:
- Summaries must say concretely what the event is (Johnny often can't tell from the name alone).
  If the source has no details, say so ("頁面未提供詳細內容" / "No programme details on the page" / "Keine Details angegeben").
- zh-TW in natural Taiwanese Traditional Chinese; keep proper names in their original form where no common translation exists.
- Every date, venue and link must come from a page you actually opened this run. No guessing.
- New tags: add `tag.<name>` to **all three** files in `i18n/` in the same commit.

## Steps each run

1. Read the current `data/events.json`. Drop events whose end (or start) date is in the past.
2. Re-verify kept events that are within the next 4 weeks (date, venue, still on); update `verifiedAt`.
3. Search for new events per category (search each category separately – not just music), incl. the
   hard-to-get pass. Use the current year in queries. Good sources: muenchen.de, in-muenchen.de,
   rausgegangen.de, muenchenticket.de, eventim.de, olympiapark.de, gasteig.de, brso.de, mphil.de,
   staatsoper.de, muenchner-stadtmuseum.de (Filmmuseum), venue sites, nordbayern.de, salzburg.info.
4. Write the new `data/events.json` (2-space indent, UTF-8, trailing newline), set `updatedAt` to today.
5. Run `node scripts/validate.mjs`. Fix every error it reports and re-run until it passes.
   **Never push a file that fails validation.**
6. Commit to `main` with message `data: weekly update YYYY-MM-DD (N events)` and push to `origin main`.
   Vercel deploys automatically on push.
7. Finish with a short summary: number of events per category, week picks, and anything you could not verify.
