// Munich Event Picks – static front end. Data: data/events.json, UI strings: i18n/*.json
const LANGS = ["zh-TW", "en", "de"];
const LOCALE = { "zh-TW": "zh-TW", en: "en-GB", de: "de-DE" };
const HTML_LANG = { "zh-TW": "zh-Hant", en: "en", de: "de" };
const CATEGORIES = ["music", "exhibition", "festival", "stage", "asia", "gaming", "nearby"];
const DISTANCES = ["city", "suburb", "daytrip"];
const ENGLISH_FRIENDLY = new Set(["en-subs", "english", "none-needed"]);
const LONG_RUN_DAYS = 14; // longer events show in the calendar's "ongoing" strip instead of every cell
const TZ = "Europe/Berlin";

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode etc. */ } },
};

const state = {
  lang: pickLang(),
  view: store.get("view") === "calendar" ? "calendar" : "list",
  cats: new Set(),
  distance: "all",
  englishOnly: false,
  q: "",
  month: null, // {y, m} (m: 0-11)
  selectedDay: null, // day number
  ongoingExpanded: false,
  data: null,
  dict: {},
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function pickLang() {
  const saved = store.get("lang");
  if (LANGS.includes(saved)) return saved;
  for (const l of navigator.languages || [navigator.language || ""]) {
    const s = l.toLowerCase();
    if (s.startsWith("zh")) return "zh-TW";
    if (s.startsWith("de")) return "de";
    if (s.startsWith("en")) return "en";
  }
  return "en";
}

function t(key, vars = {}) {
  let s = state.dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
const L = (obj) => (obj && (obj[state.lang] || obj.en || obj["zh-TW"] || obj.de)) || "";

/* ---------- Dates (all day math in UTC day numbers, dates are Munich-local strings) ---------- */
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = (s) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fromDayNum = (n) => new Date(n * 864e5);
const timeOf = (s) => (s && s.length > 10 ? s.slice(11, 16) : "");
const startDay = (e) => dayNum(e.start);
const endDay = (e) => dayNum(e.end || e.start);
const fmt = (n, opts) => new Intl.DateTimeFormat(LOCALE[state.lang], { timeZone: "UTC", ...opts }).format(fromDayNum(n));
const fmtShort = (n) => fmt(n, { month: "short", day: "numeric" });
const fmtLong = (n) => fmt(n, { weekday: "short", month: "short", day: "numeric" });

function dateLabel(e) {
  if (e.tba || !e.start) return t("dateTBA");
  const s = startDay(e), en = endDay(e), today = dayNum(todayStr());
  if (en === s) return fmtLong(s);
  if (s < today) return t("until", { date: fmtShort(en) });
  return `${fmtShort(s)} – ${fmtShort(en)}`;
}

/* ---------- Filtering & grouping ---------- */
function isActive(e, today) { return e.tba || !e.start ? false : endDay(e) >= today; }

function matches(e) {
  if (state.cats.size && !state.cats.has(e.category)) return false;
  if (state.distance !== "all" && e.distance !== state.distance) return false;
  if (state.englishOnly && !ENGLISH_FRIENDLY.has(e.language)) return false;
  if (state.q) {
    const hay = [e.titleOriginal, e.venue, e.city, ...Object.values(e.title || {}), ...Object.values(e.summary || {}), ...(e.tags || []).map((x) => t(`tag.${x}`))]
      .join(" ").toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function groupOf(e, today) {
  const diff = Math.max(startDay(e), today) - today;
  if (diff <= 14) return "soon";
  if (diff <= 31) return "month";
  if (diff <= 92) return "later";
  return "beyond";
}

const byStart = (a, b) => (a.start || "9999").localeCompare(b.start || "9999") || a.id.localeCompare(b.id);

/* ---------- Icons ---------- */
const ICON = {
  pin: '<svg viewBox="0 0 16 16"><path d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8Z"/><circle cx="8" cy="6" r="1.8"/></svg>',
  euro: '<svg viewBox="0 0 16 16"><path d="M12 4.5A5 5 0 1 0 12 11.5M2.5 7h7M2.5 9h7"/></svg>',
  ext: '<svg viewBox="0 0 16 16"><path d="M9 3h4v4M13 3 7 9M11 9v4H3V5h4"/></svg>',
  ticket: '<svg viewBox="0 0 16 16"><path d="M2 5h12v2a1.5 1.5 0 0 0 0 3v2H2v-2a1.5 1.5 0 0 0 0-3Z"/></svg>',
  cal: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5 1.5v3M11 1.5v3"/></svg>',
  prev: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m10 3-5 5 5 5"/></svg>',
  next: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 3 5 5-5 5"/></svg>',
};

/* ---------- Card ---------- */
function cardHTML(e, { pick = false } = {}) {
  const title = L(e.title) || e.titleOriginal;
  const showOrig = title.trim() !== e.titleOriginal.trim();
  const time = timeOf(e.start);
  const s = e.start ? startDay(e) : null;
  const langOk = ENGLISH_FRIENDLY.has(e.language);
  const langCls = e.language === "none-needed" ? "" : langOk ? " badge--lang-ok" : " badge--lang-warn";
  const hard = e.hardToGet;
  const hardStatus = hard && (hard.saleStart ? t("saleStart", { date: fmtShort(dayNum(hard.saleStart)) }) : hard.saleStatus ? t(`saleStatus.${hard.saleStatus}`) : "");

  const dateBlock = s === null
    ? `<div class="date"><b>?</b><span>${esc(t("dateTBA"))}</span></div>`
    : pick
      ? `<div class="date"><b>${esc(dateLabel(e))}</b>${time ? `<span>${time}</span>` : ""}</div>`
      : `<div class="date"><b>${fmt(Math.max(s, dayNum(todayStr())) , { day: "numeric" })}</b><span>${esc(fmt(Math.max(s, dayNum(todayStr())), { month: "short" }))}</span></div>`;

  return `
  <article class="card${pick ? " card--pick" : ""}" style="--c: var(--c-${esc(e.category)})" data-id="${esc(e.id)}">
    ${dateBlock}
    <div class="card__body">
      <div class="card__head">
        <div>
          <h3 class="card__title">${esc(title)}</h3>
          ${showOrig ? `<p class="card__orig">${esc(e.titleOriginal)}</p>` : ""}
        </div>
        ${!pick && time ? `<span class="card__time">${time}</span>` : ""}
      </div>
      <div class="card__meta">
        ${!pick ? `<span>${esc(dateLabel(e))}</span>` : ""}
        <span>${ICON.pin}${esc(e.venue)}${e.city && !e.venue.includes(e.city) ? `, ${esc(e.city)}` : ""}</span>
        ${e.price ? `<span>${ICON.euro}${esc(e.price)}</span>` : ""}
      </div>
      <p class="card__summary">${esc(L(e.summary))}</p>
      ${hard ? `<p class="card__hard"><b>★</b> ${esc(L(hard.reason))}${hardStatus ? ` · <b>${esc(hardStatus)}</b>` : ""}</p>` : ""}
      <div class="badges">
        <span class="badge badge--cat">${esc(t(`cat.${e.category}`))}</span>
        <span class="badge${langCls}">${esc(t(`lang.${e.language}`))}</span>
        ${e.distance !== "city" ? `<span class="badge">${esc(t(`dist.${e.distance}`))}</span>` : ""}
        ${(e.tags || []).map((x) => `<span class="badge">#${esc(t(`tag.${x}`))}</span>`).join("")}
      </div>
      <div class="actions">
        ${e.links?.tickets ? `<a class="btn btn--primary" href="${esc(e.links.tickets)}" target="_blank" rel="noopener">${ICON.ticket}${esc(t("tickets"))}</a>` : ""}
        ${e.links?.official ? `<a class="btn" href="${esc(e.links.official)}" target="_blank" rel="noopener">${ICON.ext}${esc(t("official"))}</a>` : ""}
        ${e.start ? `<button type="button" class="btn" data-ics="${esc(e.id)}">${ICON.cal}${esc(t("addToCalendar"))}</button>` : ""}
      </div>
    </div>
  </article>`;
}

/* ---------- List view ---------- */
function renderList(events, today) {
  const picks = (state.data.weekPicks || []).map((id) => events.find((e) => e.id === id)).filter(Boolean);
  const hard = state.data.events.filter((e) => e.hardToGet && matches(e) && (e.tba || isActive(e, today))).sort(byStart);
  const active = events.filter((e) => isActive(e, today)).sort(byStart);

  const groups = { soon: [], month: [], later: [], beyond: [] };
  for (const e of active) groups[groupOf(e, today)].push(e);

  let html = "";
  if (picks.length) {
    html += `<section class="section"><h2 class="section__title"><b>${esc(t("weekPicks"))}</b></h2>
      <div class="picks">${picks.map((e) => cardHTML(e, { pick: true })).join("")}</div></section>`;
  }
  if (hard.length) {
    html += `<section class="section"><h2 class="section__title"><b>${esc(t("hardToGet"))}</b></h2>
      <div class="list">${hard.map((e) => cardHTML(e)).join("")}</div></section>`;
  }
  for (const [key, list] of Object.entries(groups)) {
    if (!list.length) continue;
    html += `<section class="section"><h2 class="section__title"><b>${esc(t(`groups.${key}`))}</b> · ${list.length}</h2>
      <div class="list">${list.map((e) => cardHTML(e)).join("")}</div></section>`;
  }
  if (!active.length && !hard.length) html += `<p class="empty">${esc(t("noResults"))}</p>`;
  return html;
}

/* ---------- Calendar view ---------- */
function renderCalendar(events, today) {
  if (!state.month) { const d = fromDayNum(today); state.month = { y: d.getUTCFullYear(), m: d.getUTCMonth() }; }
  const { y, m } = state.month;
  const first = Date.UTC(y, m, 1) / 864e5;
  const last = Date.UTC(y, m + 1, 0) / 864e5;
  const lead = (fromDayNum(first).getUTCDay() + 6) % 7; // Monday first
  const gridStart = first - lead;
  const cells = Math.ceil((lead + last - first + 1) / 7) * 7;

  const dated = events.filter((e) => e.start && !e.tba && endDay(e) >= today);
  const isLong = (e) => endDay(e) - startDay(e) + 1 > LONG_RUN_DAYS;
  const long = dated.filter((e) => isLong(e) && startDay(e) <= last && endDay(e) >= first).sort(byStart);
  const short = dated.filter((e) => !isLong(e));
  const onDay = (n) => short.filter((e) => startDay(e) <= n && endDay(e) >= n).sort(byStart);

  const dows = Array.from({ length: 7 }, (_, i) => fmt(4 + i, { weekday: "short" })); // 1970-01-05 was a Monday
  const pill = (e, cls = "") => `<span role="button" tabindex="0" class="pill${cls}" style="--c: var(--c-${esc(e.category)})" data-open="${esc(e.id)}">${timeOf(e.start) ? `${timeOf(e.start)} ` : ""}${esc(L(e.title) || e.titleOriginal)}</span>`;

  const ONGOING_LIMIT = 2;
  const longExpanded = state.ongoingExpanded || long.length <= ONGOING_LIMIT;
  const longVisible = longExpanded ? long : long.slice(0, ONGOING_LIMIT);
  const ongoingToggle = long.length > ONGOING_LIMIT
    ? `<button type="button" class="cal__ongoing-toggle" data-toggle="ongoing">${longExpanded ? esc(t("ongoingLess")) : esc(t("ongoingMore", { n: long.length - ONGOING_LIMIT }))}</button>`
    : "";

  let grid = dows.map((d) => `<div class="cal__dow">${esc(d)}</div>`).join("");
  for (let i = 0; i < cells; i++) {
    const n = gridStart + i;
    const list = onDay(n);
    const out = n < first || n > last;
    const cls = ["cal__cell", out && "cal__cell--out", n === today && "cal__cell--today", n === state.selectedDay && "cal__cell--sel"].filter(Boolean).join(" ");
    grid += `<div class="${cls}" data-day="${n}" role="button" tabindex="0" aria-label="${esc(fmtLong(n))}">
      <span class="cal__num">${fromDayNum(n).getUTCDate()}</span>
      ${list.slice(0, 3).map((e) => pill(e)).join("")}
      ${list.length > 3 ? `<span class="cal__more">+${list.length - 3}</span>` : ""}
      <span class="cal__dots">${list.slice(0, 4).map((e) => `<i style="--c: var(--c-${esc(e.category)})"></i>`).join("")}</span>
    </div>`;
  }

  const monthName = new Intl.DateTimeFormat(LOCALE[state.lang], { timeZone: "UTC", year: "numeric", month: "long" }).format(new Date(Date.UTC(y, m, 1)));
  let html = `<div class="cal">
    <div class="cal__bar">
      <span class="cal__month">${esc(monthName)}</span>
      <div class="cal__nav">
        <button type="button" class="cal__today" data-nav="0">${esc(t("today"))}</button>
        <button type="button" data-nav="-1" aria-label="${esc(t("prevMonth"))}">${ICON.prev}</button>
        <button type="button" data-nav="1" aria-label="${esc(t("nextMonth"))}">${ICON.next}</button>
      </div>
    </div>
    ${long.length ? `<div class="cal__ongoing"><span>${esc(t("ongoing"))}:</span>${longVisible.map((e) => pill(e, " pill--inline")).join("")}${ongoingToggle}</div>` : ""}
    <div class="cal__grid">${grid}</div>
  </div>`;

  if (state.selectedDay !== null) {
    const list = onDay(state.selectedDay);
    html += `<section class="section cal__day"><h2 class="section__title"><b>${esc(fmtLong(state.selectedDay))}</b></h2>
      ${list.length ? `<div class="list">${list.map((e) => cardHTML(e)).join("")}</div>` : `<p class="empty">${esc(t("noEventsDay"))}</p>`}</section>`;
  }
  return html;
}

/* ---------- .ics ---------- */
const VTZ = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Berlin",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];
const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
const ymd = (n) => fromDayNum(n).toISOString().slice(0, 10).replace(/-/g, "");
function fold(line) {
  const out = []; let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  return [...out, cur].join("\r\n");
}

function downloadICS(e) {
  const time = timeOf(e.start);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//my-munich-events//EN", "CALSCALE:GREGORIAN", ...(time ? VTZ : []), "BEGIN:VEVENT",
    `UID:${e.id}@my-munich-events`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`];
  if (time) {
    const s = `${ymd(startDay(e))}T${time.replace(":", "")}00`;
    const endTime = timeOf(e.end);
    const endStamp = endTime ? `${ymd(endDay(e))}T${endTime.replace(":", "")}00` : null;
    lines.push(`DTSTART;TZID=Europe/Berlin:${s}`);
    lines.push(endStamp ? `DTEND;TZID=Europe/Berlin:${endStamp}` : "DURATION:PT2H");
  } else {
    lines.push(`DTSTART;VALUE=DATE:${ymd(startDay(e))}`, `DTEND;VALUE=DATE:${ymd(endDay(e) + 1)}`);
  }
  const title = L(e.title) || e.titleOriginal;
  const desc = [title !== e.titleOriginal ? e.titleOriginal : "", L(e.summary), e.links?.official || ""].filter(Boolean).join("\n");
  lines.push(`SUMMARY:${icsEsc(title)}`, `LOCATION:${icsEsc([e.venue, e.city].filter(Boolean).join(", "))}`, `DESCRIPTION:${icsEsc(desc)}`);
  if (e.links?.official) lines.push(`URL:${e.links.official}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  const blob = new Blob([lines.map(fold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${e.id}.ics` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Render ---------- */
function render() {
  const today = dayNum(todayStr());
  const events = state.data.events.filter(matches);

  document.documentElement.lang = HTML_LANG[state.lang];
  document.title = t("siteTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $("#q").placeholder = t("search");
  document.querySelectorAll(".langswitch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  document.querySelectorAll(".viewtabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === state.view)));

  const activeCount = state.data.events.filter((e) => isActive(e, today)).length;
  $("#meta").textContent = `${t("updated", { date: fmtLong(dayNum(state.data.updatedAt)) })} · ${t("count", { n: activeCount })}`;

  $("#chips").innerHTML =
    `<button type="button" class="chip" data-cat="" aria-pressed="${!state.cats.size}">${esc(t("allCategories"))}</button>` +
    CATEGORIES.map((c) => `<button type="button" class="chip" data-cat="${c}" style="--c: var(--c-${c})" aria-pressed="${state.cats.has(c)}"><i></i>${esc(t(`cat.${c}`))}</button>`).join("");

  $("#distance").innerHTML = `<option value="all">${esc(t("distanceAll"))}</option>` +
    DISTANCES.map((d) => `<option value="${d}"${state.distance === d ? " selected" : ""}>${esc(t(`dist.${d}`))}</option>`).join("");
  $("#distance").setAttribute("aria-label", t("distance"));

  $("#view").innerHTML = state.view === "calendar" ? renderCalendar(events, today) : renderList(events, today);
}

function openDetail(id) {
  const e = state.data.events.find((x) => x.id === id);
  if (!e) return;
  $("#detailBody").innerHTML = cardHTML(e);
  $("#detail").showModal();
}

async function loadDict(lang) {
  const res = await fetch(`i18n/${lang}.json`);
  if (!res.ok) throw new Error(`i18n ${lang}: ${res.status}`);
  return res.json();
}

async function setLang(lang) {
  state.dict = await loadDict(lang);
  state.lang = lang;
  store.set("lang", lang);
  render();
}

/* ---------- Events ---------- */
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-lang],[data-view],[data-cat],[data-ics],[data-open],[data-nav],[data-day],[data-toggle]");
  if (!el) return;
  const d = el.dataset;
  if (d.lang) { if (d.lang !== state.lang) setLang(d.lang); return; }
  if (d.view) { state.view = d.view; store.set("view", d.view); render(); return; }
  if (d.cat !== undefined) {
    if (!d.cat) state.cats.clear(); else state.cats.has(d.cat) ? state.cats.delete(d.cat) : state.cats.add(d.cat);
    render(); return;
  }
  if (d.ics) { const e = state.data.events.find((x) => x.id === d.ics); if (e) downloadICS(e); return; }
  if (d.open) { ev.stopPropagation(); openDetail(d.open); return; }
  if (d.toggle === "ongoing") { state.ongoingExpanded = !state.ongoingExpanded; render(); return; }
  if (d.nav !== undefined) {
    const n = Number(d.nav);
    if (n === 0) { state.month = null; state.selectedDay = dayNum(todayStr()); }
    else { const { y, m } = state.month; const dt = new Date(Date.UTC(y, m + n, 1)); state.month = { y: dt.getUTCFullYear(), m: dt.getUTCMonth() }; state.selectedDay = null; }
    state.ongoingExpanded = false;
    render(); return;
  }
  if (d.day) { const n = Number(d.day); state.selectedDay = state.selectedDay === n ? null : n; render(); }
});

document.addEventListener("keydown", (ev) => {
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches("[role=button][data-open],[role=button][data-day]")) {
    ev.preventDefault(); ev.target.click();
  }
});

$("#q").addEventListener("input", (ev) => { state.q = ev.target.value.trim(); render(); });
$("#distance").addEventListener("change", (ev) => { state.distance = ev.target.value; render(); });
$("#englishOnly").addEventListener("change", (ev) => { state.englishOnly = ev.target.checked; render(); });
$("#detail").addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) ev.currentTarget.close(); });

/* ---------- Boot ---------- */
(async function boot() {
  try {
    const [data, dict] = await Promise.all([
      fetch("data/events.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(`events: ${r.status}`); return r.json(); }),
      loadDict(state.lang),
    ]);
    state.data = data;
    state.dict = dict;
    render();
  } catch (err) {
    console.error(err);
    $("#view").innerHTML = `<p class="empty">Could not load events. Please try again later.</p>`;
  }
})();
