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
| `festival`   | **Priority: food** (food festivals, street-food markets, culinary markets, food halls' special events). Also beer festivals, Christmas markets, flea markets, street festivals. |
| `stage`      | Film festivals/series, opera, ballet, musicals, theatre, stand-up/Kabarett. |
| `asia`       | Taiwan-related events, Asian film festivals/series, Asian food festivals, Japanese/Korean culture festivals, Mandarin community meetups. |
| `gaming`     | Game expos, retro gaming, anime/manga/comic cons, board-game events, esports viewing. |
| `nearby`     | Notable events in the surrounding cities / mountains that don't fit better elsewhere. |

Not wanted unless exceptional: tech/developer meetups, outdoor sports.

### Priority interests

**Film score, video-game music, oboe and food.** Search for each of them deliberately every run, favour them for
`weekPicks`, and always tag them (`film-score`, `game-music`, `oboe`, `food`) – the weekly digest and the site rely
on these tags to flag events for Johnny.

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
- `weekPicks`: 2–3 ids, the best of the week (priority interests – film score / game music / oboe / food – first).
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
    "verifiedAt": "YYYY-MM-DD",
    "addedAt": "YYYY-MM-DD"             // date the event first appeared; never change it for an existing id
  }]
}
```

Writing rules:
- Summaries must say concretely what the event is (Johnny often can't tell from the name alone).
  If the source has no details, say so ("頁面未提供詳細內容" / "No programme details on the page" / "Keine Details angegeben").
- zh-TW in natural Taiwanese Traditional Chinese; keep proper names in their original form where no common translation exists.
- Every date, venue and link must come from a page you actually opened this run. No guessing.
- New tags: add `tag.<name>` to **all three** files in `i18n/` in the same commit.
- `addedAt` powers the site's "New" badge and the `/#new` page: copy it unchanged for every event you keep,
  set it to today (= `updatedAt`) for every new id. The validator compares against the last commit and fails otherwise.

## Steps each run

1. Read the current `data/events.json` and keep a copy of it in memory (you need it for the digest in step 7).
   Drop events whose end (or start) date is in the past.
2. Re-verify kept events that are within the next 4 weeks (date, venue, still on); update `verifiedAt`.
3. Search for new events per category (search each category separately – not just music), plus a dedicated search
   for each priority interest (film score, game music, oboe, food), incl. the hard-to-get pass. Use the current year in queries. Good sources: muenchen.de, in-muenchen.de,
   rausgegangen.de, muenchenticket.de, eventim.de, olympiapark.de, gasteig.de, brso.de, mphil.de,
   staatsoper.de, muenchner-stadtmuseum.de (Filmmuseum), venue sites, nordbayern.de, salzburg.info.
4. Write the new `data/events.json` (2-space indent, UTF-8, trailing newline), set `updatedAt` to today,
   keep `addedAt` of kept events and set `addedAt` = today on new ones.
5. Run `node scripts/validate.mjs`. Fix every error it reports and re-run until it passes.
   **Never push a file that fails validation.**
6. Commit to the default branch (`master`; the repo has no `main`) with message `data: weekly update YYYY-MM-DD (N events)` and push to `origin master`, even if the session names a feature branch, unless something is wrong (validation fails, merge conflict, push rejected). If so, push to the session branch instead and notify.
   Vercel deploys automatically on push.
7. Finish with the **weekly digest** below as your final message. It is delivered to Johnny as a push notification
   and by email, so it must stand on its own (he may forward it to friends): full titles, dates and links in every
   item, no "see above", no references to files or tools. Write it in Traditional Chinese (Taiwan), keep
   `titleOriginal` next to the zh-TW title, link each title to `links.official`. Omit a section that would be empty,
   except section 1 (say 「本週沒有新加入的活動」).

   ```
   🗓️ 慕尼黑活動精選・YYYY-MM-DD 更新

   🆕 本週新加入（N）
   - M/D（週X）[zh-TW 標題 · titleOriginal](official) — 類別・城市
     (every event whose addedAt is today, sorted by start; TBA ones last)

   ⭐ 近期為你推薦（未來 3 週）
   - M/D（週X）[標題](official) — #film-score / #game-music / #oboe / #food・一句重點
     (every event tagged film-score, game-music, oboe or food that starts or runs in the next 21 days,
      new or not – this is the reminder for things already on the site)

   🎟️ 搶票提醒
   - [標題](official) — 開賣 M/D ／ 狀態變更：announced → on-sale
     (hardToGet events with saleStart in the next 14 days, or whose saleStatus/saleStart changed
      compared with last week's file)

   本週推薦：標題、標題、標題
   共 N 個活動：音樂 n・展覽 n・節慶美食 n・影劇 n・亞洲 n・遊戲 n・周邊 n
   未能核實：…（only if any）

   👉 所有新活動：https://my-munich-events.vercel.app/#new
   ```
