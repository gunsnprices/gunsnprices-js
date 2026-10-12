// Numbers from product titles: magazine capacity, barrel length, rounds per box and cost per round.
// Port of gunsnprices/specs.py.
import { round4, unescapeHtml } from "./util.js";

function prep(text) {
  let s = unescapeHtml(unescapeHtml(text || "")).toLowerCase();
  s = s.replace(/”/g, '"').replace(/″/g, '"').replace(/“/g, '"').replace(/''/g, '"').replace(/’’/g, '"');
  s = s.replace(/®/g, "").replace(/™/g, "");
  return s.replace(/\s+/g, " ");
}

const NUM = "(\\d{1,3}(?:,\\d{3})+|\\d{1,5})";
const AMMO = new RegExp(
  "\\b(?:ammo|ammunition|shotshells?|shot ?shells?|cartridges?|bullets?|primers?|slugs?|buckshot|pellets?|bbs?|grains?|\\d+\\s*gr|" +
    "per box|box of|rounds? box|rds?/box)\\b|/\\s*(?:box|bx|pk|pack|case|cs|tin)\\b",
);

/** True if the title reads like ammunition (bullet weight, "ammo", "20/box", ...) rather than a firearm. */
export function looksLikeAmmo(title) {
  return AMMO.test(prep(title));
}

// --- magazine capacity ---

const CAP_PLUS = /(?<![\d.:/x])(\d{1,3})\s*\+\s*1(?!\d)/g;
const CAP_RD = /(?<![\d.:/x])(\d{1,3})\s*-?\s*(?:rd|rds|rnd|rnds|round|rounds|shot|shots)\b(?!\s*\/?\s*(?:per\b|box|bx|pack|pk|case))/g;
// "13rd/15rd", "1-30Rd/1-10Rd Mag": ships with magazines of two sizes - take the larger one
const CAP_PAIR = /(?<![\d.:/x])(\d{1,3})\s*-?\s*(?:rd|rds|rnd|rnds|rounds?)?\s*\/\s*(?:1?-)?(\d{1,3})\s*-?\s*(?:rd|rds|rnd|rnds|rounds?)\b/;
const CAP_MAG = /\b(?:cap|capacity)\s*[:=]?\s*(\d{1,3})\b(?!\s*(?:"|in\b|gr\b))/g;

/**
 * Magazine capacity of a firearm or magazine from its title ("17RD", "15+1", "10-shot"), or null.
 * For "15+1" the magazine capacity (15) is returned.
 */
export function magazineCapacity(title) {
  const s = prep(title);
  const p = CAP_PAIR.exec(s);
  if (p) {
    const n = Math.max(parseInt(p[1], 10), parseInt(p[2], 10));
    if (n >= 1 && n <= 110) return n;
  }
  for (const re of [CAP_PLUS, CAP_RD, CAP_MAG]) {
    for (const m of s.matchAll(re)) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 110) return n;
    }
  }
  return null;
}

// --- barrel length ---

const INCH = '(?:"|in\\b(?!\\s*(?:1\\b|stock\\b|one\\b))\\.?|inch(?:es)?\\b|-inch\\b|-in\\b)';
const LEN = "(\\d{1,2}(?:\\.\\d{1,3})?)(?:[\\s-]+(\\d{1,2})/(\\d{1,2}))?";
const BBL = "(?:bbl|brl|barrel)\\b";
const BAR_TAGGED = [
  new RegExp("(?<![\\d.:/x#$-])" + LEN + "\\s*-?\\s*" + INCH + "?\\s*" + BBL, "g"),
  new RegExp("\\b(?:bbl|brl|barrel)\\s*(?:length)?\\s*[:=]?\\s*" + LEN + "\\s*" + INCH, "g"),
];
const BAR_INCH = new RegExp("(?<![\\d.:/x#$-])" + LEN + "\\s*-?\\s*" + INCH, "g");
const NOT_BARREL_AFTER = /\s*-?\s*(?:chamber|chbr|chmbr|shells?|m-?lok|mlok|handguard|hg\b|rail|keymod|quad|lop\b|length of pull|oal\b|twist|rate)/y;
const NOT_BARREL_BEFORE = /(?:lop|oal|overall|length of pull|pull|twist|1:|chamber|m-?lok|mlok|handguard|rail|sight radius)\s*[:=]?\s*$/;
const SHOTGUN = /\b(?:\d{1,2}|410)\s*(?:ga|gauge|g)\b|\.410|shotgun|o\/u|over\/under|sxs|side by side|\b(?:12|16|20|28|410)\/\d\d\b/;
// "O/U 12/28": gauge / barrel length (10 is left out: "10/22" is a Ruger rifle)
const GAUGE_SLASH = /(?<![a-z0-9./$#-])(?:12|16|20|28|410)\/(1[89](?:\.5)?|2\d|3[0-4])(?![\d/.])(?!\s*(?:ga|gauge|rd|round))/;

function length(m) {
  let v = parseFloat(m[1]);
  if (m[2] && m[3]) {
    const num = parseInt(m[2], 10);
    const den = parseInt(m[3], 10);
    if ([2, 4, 8, 16].includes(den) && num < den) v += num / den;
  }
  return v;
}

/**
 * Barrel length in inches from a firearm title ('4.25"', "16 in", "20-inch", '16 1/2"', "22 BBL"), or null.
 * Chamber length (3" on shotguns), twist rate, handguard and length-of-pull values are skipped.
 */
export function barrelLength(title) {
  const s = prep(title);
  for (const re of BAR_TAGGED) {
    for (const m of s.matchAll(re)) {
      const v = length(m);
      if (v >= 1.5 && v <= 36) return v;
    }
  }
  const g = GAUGE_SLASH.exec(s);
  if (g) return parseFloat(g[1]);
  const shotgun = SHOTGUN.test(s);
  for (const m of s.matchAll(BAR_INCH)) {
    const v = length(m);
    if (!(v >= 1.5 && v <= 36)) continue;
    NOT_BARREL_AFTER.lastIndex = m.index + m[0].length;
    if (NOT_BARREL_AFTER.test(s) || NOT_BARREL_BEFORE.test(s.slice(Math.max(0, m.index - 20), m.index))) continue;
    if (shotgun && v <= 3.5) continue; // 3" chamber
    return v;
  }
  return null;
}

// --- rounds per box ---

const B = "(?<![a-z0-9.#$/])";
const RPB = [
  new RegExp(B + NUM + "\\s*-?\\s*(?:rd|rds|round|rounds|rnd|rnds|ct|count|pcs|pc|cartridges|shells|shotshells|bullets)\\b(?!\\s*(?:mag|magazine|capacity|cap)\\b)"),
  new RegExp(B + NUM + "\\s*(?:/\\s*|per\\s+)(?:box|bx|pack|pk|case|cs|tin|can|bag|ct)\\b"),
  new RegExp("(?:box|pack|case|tin|bx|bag|can) of\\s*" + NUM),
  new RegExp(B + NUM + "\\s*-?\\s*(?:pack|pk|packs)\\b"),
];
// distributor notation "50/10", "20/25": rounds per box / boxes per case
const BOX_CASE = /(?<![\d.\-/])(5|10|15|18|20|25|30|40|50|100|200|250|500|1000)\s*\/\s*(\d{1,3})(?![\d/."])/g;
const CALIBER_SLASH = new Set(["30/30", "45/70", "30/06", "22/250", "25/06", "38/55", "44/40", "32/20", "38/40", "25/20", "32/40"]);

/** Number of rounds in one package of ammunition ("20rds", "50/box", "Box of 25", "1,000 Rounds"), or null. */
export function roundsPerBox(title) {
  const s = prep(title);
  for (const re of RPB) {
    const m = re.exec(s);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (n >= 1 && n <= 20000) return n;
    }
  }
  for (const m of s.matchAll(BOX_CASE)) {
    if (!CALIBER_SLASH.has(m[1] + "/" + m[2]) && !["2", "4", "8", "16", "32"].includes(m[2])) return parseInt(m[1], 10);
  }
  return null;
}

/** Price of one round, rounded to 4 decimals (null without a price or a round count). */
export function costPerRound(price, rounds) {
  if (!price || !rounds || price <= 0 || rounds <= 0) return null;
  return round4(price / rounds);
}
