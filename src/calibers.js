// Recognize firearm calibers in product titles and normalize caliber fields.
// Port of gunsnprices/calibers.py; see that file for the reasoning behind each rule.
import DATA from "./data/calibers.js";
import { reEscape, unescapeHtml } from "./util.js";

// word -> spellings used in titles. A word marked optional may be left out ("300 Blackout" for ".300 AAC Blackout").
const SYN = {
  win: ["win", "winchester"], winchester: ["winchester", "win"],
  rem: ["rem", "remington"], remington: ["remington", "rem"],
  mag: ["mag", "magnum"], magnum: ["magnum", "mag"],
  wby: ["wby", "weatherby"], weatherby: ["weatherby", "wby"],
  spl: ["spl", "special"], special: ["special", "spl"],
  sprg: ["sprg", "springfield", "spfd"], springfield: ["springfield", "sprg", "spfd"],
  government: ["government", "govt", "gov"],
  acp: ["acp", "auto"], auto: ["auto", "acp"],
  "s&w": ["s&w", "s & w", "sw", "smith & wesson", "smith and wesson", "smith&wesson"],
  blackout: ["blackout", "blk", "black out"],
  creedmoor: ["creedmoor", "creed", "cm", "crd", "creedmore"],
  parabellum: ["parabellum", "para", "luger"],
  gauge: ["gauge", "ga", "gauges"],
  bore: ["bore", "ga", "gauge"],
  lr: ["lr", "long rifle"],
  "h&h": ["h&h", "h & h", "holland & holland", "holland and holland"],
  "h&r": ["h&r", "h & r"],
  bm: ["bm", "bushmaster", "bush"],
};
const OPTIONAL = new Set(["aac", "nato", "win", "winchester", "rem", "remington", "sprg", "springfield", "government"]);
const SEP = "[\\s\\-]*";

// common title spellings that the synonym table does not produce
const EXTRA = {
  ".300 AAC Blackout": ["300 aac", "300 bo", "300 black out", "300 blackout", "300 blk"],
  "6.5mm Creedmoor": ["6.5 creedmoor", "6.5 crd", "6.5 cm", "6.5mm cm", "6.5 cr"],
  "6mm Creedmoor": ["6 creedmoor"],
  ".22 LR": ["22lr", "22 lr", "22 long rifle"],
  ".22 WMR": ["22 mag", "22 magnum", "22 win mag", "22 wmr"],
  "5.56×45mm NATO": ["5.56 nato", "5.56mm nato", "556 nato", "5.56x45", "5.56", "5.56mm", "5.56 mm"],
  "7.62x51mm NATO": ["7.62 nato", "7.62mm nato", "762 nato", "762x51"],
  "7.62x39mm": ["762x39"],
  ".410 Bore": ["410 ga", "410 gauge", "410 bore"],
  ".45 Colt": ["45 lc", "45 long colt"],
  ".44 S&W Special": ["44 spl", "44 special", "44 spcl"],
  ".38 S&W Special": ["38 spl", "38 special", "38 spcl", "38 spc", "38 sp", "38 spp", "38+p"],
  ".357 Mag": ["357 rm", "357 rem mag", "357 rem magnum", "357 remington magnum", "357 remington mag"],
  "9×19mm Parabellum": ["9mm luger", "9mm para", "9 mm luger", "9mm"],
  "10mm Auto": ["10mm", "10 mm"],
  ".45 ACP": ["45 acp", "45 auto", "45 automatic", "45 automatic colt pistol"],
  ".40 S&W": ["40 s&w", "40 sw", "40 cal", "40s", ".40"],
  ".380 ACP": ["380 acp", "380 auto", "380"],
  ".243 Win": ["243", ".243"],
  ".308 Win": ["308", ".308"],
  ".350 Legend": [".350", "350 leg", "350 lgnd", "350 lgd"],
  ".450 BM": ["450 bushmaster", "450 bush"],
  ".204 Ruger": [".204"],
  ".177": ["177", ".177"],
  ".300 Win Mag": ["300 wm"],
  "7mm Remington Magnum": ["7mm rm", "7 rm", "7mm rem mag"],
  ".338 Lapua Mag": ["338 lapua", "338 lap"],
  ".30 Carbine": ["30 m1", "30 m1 carbine"],
  ".30-06 Springfield": ["30-06 sp"],
  "7.92×57mm Mauser": ["8x57", "8x57mm", "8x57 js", "8x57 is"],
  ".50 AE": ["50 action express"],
  "12 Gauge": ["12 ga", "12ga", "12 gauge", "12-gauge", "12g"],
  "20 Gauge": ["20 ga", "20ga", "20 gauge", "20-gauge", "20g"],
  "16 Gauge": ["16 ga", "16ga", "16 gauge", "16g"],
  "28 Gauge": ["28 ga", "28ga", "28 gauge", "28g"],
  "10 Gauge": ["10g"],
};
// a bare number or "Nmm" in a title is usually something else, not a caliber; these exceptions were checked on listings
const BARE = /^\.?\d+(?:\.\d+)?(?:\s*mm)?$/;
const ALLOW_BARE = new Set(["380", "410", "9mm", "10mm", "10 mm", "5.56", "5.56mm", "5.56 mm", "243", ".243", "308", ".308", ".40", ".350", ".204", "177", ".177"]);
// "12g" next to CO2 is a 12-gram CO2 cartridge, not 12 gauge
const GRAM = /^\d+\s?g$/;
// shotguns "O/U 12/28": gauge / barrel length; on ammo "20/25" is rounds per box / boxes per case
const CONTEXT = [
  [/(?<![a-z0-9./$#-])12\/(?:1[89]|2\d|3[0-4])(?:\.5)?(?![\d/.])(?!\s*(?:ga|gauge|rd|round))/g, "12gauge"],
  [/(?<![a-z0-9./$#-])20\/(?:18|18\.5|2[0-46-9]|3[0-2])(?![\d/.])(?!\s*(?:ga|gauge|rd|round))/g, "20gauge"],
  [/(?<![a-z0-9./$#-])28\/(?:2[6-9]|3[0-2])(?![\d/.])(?!\s*(?:ga|gauge|rd|round))/g, "28gauge"],
  [/(?<![a-z0-9.$#-])\.?357(?=\s*\/\s*\.?38)/g, "357mag"],
];

export function key(s) {
  let t = unescapeHtml(s || "").toLowerCase().replace(/×/g, "x").replace(/х/g, "x");
  t = t.replace(/(?<=\d)\.(?=\d)/g, "#");
  t = t.replace(/[^a-z0-9#&]+/g, "");
  return t.replace(/#/g, ".").replace(/&/g, "and");
}

function tokens(name) {
  let s = unescapeHtml(name).toLowerCase().replace(/×/g, "x");
  s = s.replace(/^\./, "");
  return s.trim().split(/\s+/).filter(Boolean);
}

function tokenAlts(tok) {
  if (/^\.?\d+(?:\.\d+)?x\d+mm[a-z]*$/.test(tok)) return [tok, tok.replace(/mm/g, "")];
  if (/^\d+mm$/.test(tok)) return [tok, tok.slice(0, -2) + " mm"];
  const alts = [...(SYN[tok] || [tok])];
  if (OPTIONAL.has(tok)) alts.push("");
  return alts;
}

function variants(name) {
  const toks = tokens(name);
  if (!toks.length || name.includes("/")) return [];
  const lists = toks.map(tokenAlts);
  const out = new Set();
  // itertools.product order (last list varies fastest), first 400 combinations
  const idx = new Array(lists.length).fill(0);
  for (let n = 0; n < 400; n++) {
    const v = idx.map((i, k) => lists[k][i]).filter(Boolean).join(" ");
    if (v && (!BARE.test(v) || ALLOW_BARE.has(v))) out.add(v);
    let k = lists.length - 1;
    while (k >= 0 && ++idx[k] === lists[k].length) idx[k--] = 0;
    if (k < 0) break;
  }
  return [...out].sort();
}

function rx(variant) {
  const parts = variant.split(" ").map((tok) => {
    let t = reEscape(tok);
    t = t.replace(/(?<=\d)x(?=\d)/g, "\\s*x\\s*");
    return t.split("\\-").join(SEP);
  });
  const body = parts.join(SEP);
  return /^\d/.test(variant) ? "\\.?" + body : body;
}

let INDEX = null;

function index() {
  if (INDEX) return INDEX;
  const byId = new Map();
  const conflict = new Map();
  const pats = new Map();
  for (const c of DATA.calibers) {
    const cal = Object.freeze({ id: c.id, name: c.name, type: c.type, url: c.url || "" });
    byId.set(c.id, cal);
    const names = [c.name, c.site_name, ...c.aliases, ...(EXTRA[c.name] || [])];
    for (const n of names) {
      const own = unescapeHtml(n).toLowerCase();
      const vs = variants(n);
      if (!BARE.test(own) || ALLOW_BARE.has(own)) vs.push(own);
      for (const v of vs) {
        const k = key(v);
        if (!k || !/\d/.test(k)) continue;
        if (!conflict.has(k)) conflict.set(k, []);
        const list = conflict.get(k);
        if (list.every((x) => x[1].id !== cal.id)) list.push([c.n || 0, cal]);
        if (!pats.has(k)) pats.set(k, v !== own || !v.includes("/") ? rx(v) : reEscape(v));
      }
    }
  }
  const byKey = new Map();
  for (const [k, cands] of conflict) {
    cands.sort((a, b) => b[0] - a[0]);
    // one spelling, several calibers: keep the one with 10x+ more listings, otherwise the spelling is ambiguous
    if (cands.length === 1 || cands[0][0] >= 10 * Math.max(1, cands[1][0])) byKey.set(k, cands[0][1]);
  }
  const keys = [...byKey.keys()].sort((a, b) => pats.get(b).length - pats.get(a).length);
  const big = new RegExp("(?<![a-z0-9.$])(?:" + keys.map((k) => pats.get(k)).join("|") + ")(?![a-z0-9])", "gi");
  INDEX = { byKey, big, byId };
  return INDEX;
}

function prep(text) {
  let s = unescapeHtml(text || "").toLowerCase().replace(/×/g, "x").replace(/”/g, '"').replace(/″/g, '"');
  s = s.replace(/®/g, "").replace(/™/g, "");
  return s.replace(/\s+/g, " ");
}

/**
 * All calibers mentioned in `text`, in order of appearance, without duplicates.
 * @param {string} text
 * @returns {{id: string, name: string, type: string, url: string}[]}
 */
export function findCalibers(text) {
  const { byKey, big, byId } = index();
  const s = prep(text);
  const co2 = s.includes("co2");
  const hits = [];
  for (const m of s.matchAll(big)) {
    if (co2 && GRAM.test(m[0])) continue;
    const c = byKey.get(key(m[0]));
    if (c) hits.push([m.index, c]);
  }
  for (const [re, id] of CONTEXT) {
    for (const m of s.matchAll(re)) hits.push([m.index, byId.get(id)]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  const out = [];
  const seen = new Set();
  for (const [, c] of hits) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/** The first caliber mentioned in `text`, or null. */
export function findCaliber(text) {
  const found = findCalibers(text);
  return found.length ? found[0] : null;
}

/** Normalize a caliber field ("9mm Luger", "5.56 NATO", "12 GA"); falls back to the first caliber found inside it. */
export function normalizeCaliber(value) {
  return index().byKey.get(key(value)) || findCaliber(value);
}

/** The full caliber list, sorted by name. */
export function listCalibers() {
  return [...index().byId.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
