#!/usr/bin/env node
// Validates data/events.json against the data contract described in ROUTINE.md.
// Usage: node scripts/validate.mjs [path]   (exit code 1 on any error)
import { readFileSync } from "node:fs";

const path = process.argv[2] || new URL("../data/events.json", import.meta.url);
const LANGS = ["zh-TW", "en", "de"];
const CATEGORIES = ["music", "exhibition", "festival", "stage", "asia", "gaming", "nearby"];
const DISTANCES = ["city", "suburb", "daytrip"];
const LANGUAGE = ["en-subs", "english", "german-only", "unknown", "none-needed"];
const SALE_STATUS = ["on-sale", "announced", "sold-out"];
const TAGS = JSON.parse(readFileSync(new URL("../i18n/en.json", import.meta.url), "utf8"));
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const isUrl = (s) => { try { return new URL(s).protocol === "https:"; } catch { return false; } };
const realDate = (s) => { const d = new Date(s.slice(0, 10) + "T00:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === s.slice(0, 10); };
function i18n(where, obj, max) {
  if (!obj || typeof obj !== "object") return err(where, "must be an object with zh-TW/en/de");
  for (const l of LANGS) {
    if (typeof obj[l] !== "string" || !obj[l].trim()) err(where, `missing ${l}`);
    else if (max && obj[l].length > max) err(where, `${l} longer than ${max} chars`);
  }
}

let data;
try { data = JSON.parse(readFileSync(path, "utf8")); }
catch (e) { console.error(`✗ Cannot parse ${path}: ${e.message}`); process.exit(1); }

if (!DATE.test(data.updatedAt || "") || !realDate(data.updatedAt)) err("updatedAt", "must be YYYY-MM-DD");
if (!Array.isArray(data.events) || !data.events.length) err("events", "must be a non-empty array");
if (!Array.isArray(data.weekPicks)) err("weekPicks", "must be an array");

const ids = new Set();
for (const [i, e] of (data.events || []).entries()) {
  const w = `events[${i}]${e?.id ? ` (${e.id})` : ""}`;
  if (!e || typeof e !== "object") { err(w, "not an object"); continue; }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(e.id || "")) err(w, "id must be lowercase kebab-case");
  if (ids.has(e.id)) err(w, "duplicate id");
  ids.add(e.id);
  if (typeof e.titleOriginal !== "string" || !e.titleOriginal.trim()) err(w, "titleOriginal required");
  i18n(`${w}.title`, e.title, 140);
  i18n(`${w}.summary`, e.summary, 400);
  if (!CATEGORIES.includes(e.category)) err(w, `category must be one of ${CATEGORIES.join("|")}`);
  if (!Array.isArray(e.tags)) err(w, "tags must be an array");
  else for (const tag of e.tags) if (!(`tag.${tag}` in TAGS)) err(w, `unknown tag "${tag}" (add it to all i18n files first)`);
  if (e.tba) {
    if (e.start !== null) err(w, "tba events must have start: null");
  } else {
    if (!DATETIME.test(e.start || "") || !realDate(e.start)) err(w, "start must be YYYY-MM-DD or YYYY-MM-DDTHH:mm");
    if (e.end !== null && e.end !== undefined) {
      if (!DATETIME.test(e.end) || !realDate(e.end)) err(w, "end must be null, YYYY-MM-DD or YYYY-MM-DDTHH:mm");
      else if (e.start && e.end.slice(0, 10) < e.start.slice(0, 10)) err(w, "end is before start");
    }
  }
  for (const f of ["venue", "city"]) if (typeof e[f] !== "string" || !e[f].trim()) err(w, `${f} required`);
  if (!DISTANCES.includes(e.distance)) err(w, `distance must be one of ${DISTANCES.join("|")}`);
  if (e.price !== null && typeof e.price !== "string") err(w, "price must be string or null");
  if (!LANGUAGE.includes(e.language)) err(w, `language must be one of ${LANGUAGE.join("|")}`);
  if (!e.links || !isUrl(e.links.official)) err(w, "links.official must be an https URL");
  if (e.links?.tickets !== undefined && !isUrl(e.links.tickets)) err(w, "links.tickets must be an https URL");
  if (!DATE.test(e.verifiedAt || "")) err(w, "verifiedAt must be YYYY-MM-DD");
  if (e.hardToGet) {
    i18n(`${w}.hardToGet.reason`, e.hardToGet.reason, 200);
    if (e.hardToGet.saleStart != null && !DATE.test(e.hardToGet.saleStart)) err(w, "hardToGet.saleStart must be YYYY-MM-DD or null");
    if (e.hardToGet.saleStatus != null && !SALE_STATUS.includes(e.hardToGet.saleStatus)) err(w, `hardToGet.saleStatus must be one of ${SALE_STATUS.join("|")}`);
  }
}
for (const id of data.weekPicks || []) if (!ids.has(id)) err("weekPicks", `unknown id "${id}"`);

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in events.json:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
const counts = {};
for (const e of data.events) counts[e.category] = (counts[e.category] || 0) + 1;
console.log(`✓ events.json OK – ${data.events.length} events`, counts);
