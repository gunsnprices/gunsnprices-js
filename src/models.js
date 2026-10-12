// Identify the firearm model in a product title: brand -> family -> model.
// Port of gunsnprices/models.py; the rules are GunsNPrices' model dictionaries (50 brands).
import DATA from "./data/models.js";
import { reEscape, unescapeHtml } from "./util.js";

// airguns and airsoft are not firearms (the site filters them by category; here we go by the title)
const AIRGUN = /\bair\s*-?\s*(?:gun|rifle|pistol)s?\b|\bairgun|\bairsoft|\bbb\s*(?:gun|pistol|rifle)|\bpellets?\b|\bco2\b/i;

// accessories named after a gun ("Glock 19 holster", "Sig P365 XL 12rd Magazine", "Magpul PMAG for Glock 19")
const ACC_NOUN = new RegExp(
  "\\b(?:holsters?|magazines?(?!\\s*(?:pattern|compatible|well|release|disconnect|safety|catch|cut|tube|extension|fed)\\b)|pmags?|slings?|" +
    "grip panels?|scope mounts?|recoil pads?|speed ?loaders?|mag(?:azine)? loaders?|cleaning kits?|pouch(?:es)?|snap caps?|replacement barrels?|" +
    "conversion kits?|parts kits?)\\b",
  "g",
);
const ACC_INCLUDED = new RegExp(
  "(?:(?:\\bw/|\\bwith\\b|\\bwithout\\b|\\bno\\b|\\band\\b|&|\\+|\\bincl\\w*|\\bplus\\b|\\(\\d\\)|\\b[1-9]\\b|\\btwo\\b|\\bthree\\b|\\bfour\\b|,|\\bor\\b|\\bextra\\b|" +
    "\\bspare\\b|\\bfactory\\b|\\bfits\\b|\\btakes\\b|\\baccepts\\b|\\buses\\b)[^,]{0,14}|/\\s*)$",
);
const GUN_WORDS = new RegExp(
  "\\b(?:pistol|rifle|shotgun|revolver|handgun|carbine|firearm|semi-?auto(?:matic)?|bolt[- ]?action|pump|lever[- ]?action|single[- ]?shot|" +
    'o/u|over/under|sxs|sbr|derringer)\\b|\\d+\\+1\\b|\\d+(?:\\.\\d+)?\\s*-?\\s*(?:"|in\\b|inch)',
);

function isAccessory(title) {
  const t = unescapeHtml(unescapeHtml(title)).toLowerCase();
  if (GUN_WORDS.test(t)) return false;
  for (const m of t.matchAll(ACC_NOUN)) {
    if (!ACC_INCLUDED.test(t.slice(Math.max(0, m.index - 16), m.index))) return true;
  }
  return false;
}

const DASHES = { "‐": "-", "‑": "-", "–": "-", "—": "-", "“": '"', "”": '"', "’": "'", "|": " | ", "*": " ", "®": "", "™": "" };
const DASHES_RE = /[‐‑–—“”’|*®™]/g;

let DICTS = null;

function anyRe(patterns) {
  return patterns && patterns.length ? new RegExp(patterns.join("|"), "i") : null;
}

function key(s) {
  return unescapeHtml(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dicts() {
  if (DICTS) return DICTS;
  DICTS = DATA.dicts.map((src) => {
    const d = { ...src };
    d._rewrite = (d.title_rewrite || []).map(([k, v]) => [new RegExp(k, "gi"), v]);
    d._exclude = anyRe(d.exclude);
    d._exclude_soft = anyRe(d.exclude_soft);
    d._block = anyRe(d.other_brand_block);
    d._brand_any = d.brand_rx ? new RegExp(d.brand_rx, "i") : new RegExp("(?<![a-z])" + reEscape(d.brand_word) + "(?![a-z])", "i");
    d._brand_start = d.brand_rx ? new RegExp("^\\W*(?:" + d.brand_rx + ")", "i") : null;
    d._configs = (d.configs || []).map(([k, v]) => [k, new RegExp(v, "i")]);
    d._features = (d.features || []).map(([k, v]) => [k, new RegExp(v, "i")]);
    d._gens = (d.gens || []).map(([k, v]) => [k, new RegExp(v, "i")]);
    d._brand_names = new Set((d.brand_names || []).map(key));
    d._deny_names = new Set((d.deny_brand_names || []).map(key));
    if (d.mode === "terms") {
      d.models = d.models.map((m) => ({ ...m, _match: new RegExp(m.match, "i"), _not: m.not ? new RegExp(m.not, "i") : null }));
    } else {
      d._numeric_rx = numericRe(d.brand_word);
    }
    return d;
  });
  return DICTS;
}

function norm(s, d) {
  let t = unescapeHtml(s || "").replace(DASHES_RE, (ch) => DASHES[ch]);
  t = t.toLowerCase().replace(/\s+/g, " ").trim();
  for (const [re, to] of d._rewrite) t = t.replace(re, to);
  return t;
}

/** Brands covered by the model dictionaries. */
export function listBrands() {
  return dicts().map((d) => d.brand);
}

const has = (obj, k) => obj != null && Object.prototype.hasOwnProperty.call(obj, k);

// ---------- numeric mode (Glock): codes like 19, 19X, 43X, 20SF; generation from the title or the part number ----------
function numericRe(brandWord) {
  const bw = reEscape(brandWord);
  return new RegExp(
    "(?<![a-z0-9.])(?:" + bw + "\\s*-?\\s*g?\\s*-?\\s*|g)(\\d{2})(?:(sf|x|c|l|m|s)|\\s(sf|x)(?![a-z0-9]))?(?:g([1-6])(?:us)?|(v))?(fs|mos|rtf)?" +
      '(?![a-z0-9&"+/])(?!\\s*-?\\s*(?:round|rounds|rd|rds|rnd|mag|mags|magazine)\\b)',
    "gi",
  );
}

function findModels(t, d) {
  const found = [];
  for (const m of t.matchAll(d._numeric_rx)) {
    const num = m[1].toLowerCase();
    const suf = (m[2] || m[3] || "").toUpperCase();
    const code = has(d.models, num + suf) ? num + suf : has(d.models, num) ? num : "";
    if (!code) continue;
    found.push({ code, num, pos: m.index, end: m.index + m[0].length, mos: (m[6] || "").toLowerCase() === "mos", gen: m[4] || (m[5] ? "V" : "") });
  }
  return found;
}

function decodeMpn(name, mpn, sku, d) {
  const cands = [mpn || "", sku || ""];
  for (const m of (name || "").matchAll(/\b(?:gl)?[pue][a-z0-9]\d{3}[a-z0-9-]*|\bg\d{2}c?\d{3}us\b|\bg\d{4}[a-z]*aut\b/gi)) cands.push(m[0]);
  for (let c of cands) {
    c = c.trim();
    let m = /^G(\d{2}C?)([345])(\d{2})US$/i.exec(c);
    if (m && has(d.models, m[1].toUpperCase())) return { code: m[1].toUpperCase(), letter: "", mpn: c, gen: m[2] };
    m = /^G(\d{2})\d{2}[A-Z]*AUT$/i.exec(c);
    if (m && has(d.models, m[1])) return { code: m[1], letter: "", mpn: c, gen: "" };
    m = /^(?:GL)?([PUE])([A-Z0-9])(\d{2})(\d)/i.exec(c);
    if (!m) continue;
    const letter = m[2].toUpperCase();
    let num = m[3];
    const alias = d.mpn_model_alias || {};
    if (has(alias, num)) num = alias[num];
    const lm = d.mpn_letter_model || {};
    const code = has(lm, letter + num) ? lm[letter + num] : num;
    if (!has(d.models, code)) continue;
    const lg = d.mpn_letter_gen || {};
    return { code, letter, mpn: c, gen: has(lg, letter) ? lg[letter] : "" };
  }
  return null;
}

function parseNumeric(t, name, brand, mpn, sku, d) {
  const pm = decodeMpn(name, mpn, sku, d);
  if (!pm && d._exclude_soft && d._exclude_soft.test(t)) return null;
  let own;
  if (brand) own = d._brand_names.has(key(brand)) || Boolean(pm);
  else own = Boolean(pm) || new RegExp("^\\W*" + reEscape(d.brand_word) + "\\b", "i").test(t);
  let models = findModels(t, d);
  if (!models.length && own) {
    const m = /^(\d{2})(x)?\b/.exec(t);
    if (m && has(d.models, m[1] + (m[2] || "").toUpperCase())) {
      const code = m[1] + (m[2] || "").toUpperCase();
      models = [{ code, num: m[1], pos: 0, end: m[0].length, mos: false, gen: "" }];
    }
  }
  if (!models.length && own && d.bare_model_tokens && d.bare_model_tokens.length) {
    const m = new RegExp("\\b(" + d.bare_model_tokens.join("|") + ")\\b").exec(t);
    if (m) models = [{ code: m[1].toUpperCase(), num: m[1].slice(0, 2), pos: m.index, end: m.index + m[0].length, mos: false, gen: "" }];
  }
  if (!own) {
    if (!models.length) return null;
    if (d._block && d._block.test(t)) return null;
  }
  let src = "title";
  let first = null;
  let code;
  if (models.length) {
    first = models[0];
    code = first.code;
    for (const x of models) if (x.num === first.num && x.code.length > code.length) code = x.code;
  } else if (own && pm) {
    code = pm.code;
    src = "mpn";
  } else {
    return null;
  }
  let gen = "";
  if (first && first.gen) {
    gen = first.gen;
  } else {
    const m = /\bgen(?:eration)?\.?\s*-?\s*([1-6])\b|\b([1-6])(?:st|nd|rd|th)\s*gen\b|\bg([1-6])\b/.exec(t);
    if (m) gen = m[1] || m[2] || m[3];
    else if (first && /^\s*v\b/.test(t.slice(first.end))) gen = "V";
    else if (pm && pm.gen && pm.code === code) gen = pm.gen;
  }
  if ((d.no_gen_models || []).includes(code) && gen !== "V") gen = "";
  const configs = d._configs
    .filter(([n, re]) => re.test(t) || (n === "MOS" && ((first && first.mos) || (pm && pm.mpn.toLowerCase().includes("mos")))))
    .map(([n]) => n);
  const features = d._features.filter(([, re]) => re.test(t)).map(([n]) => n);
  if (pm && /\d(?:mos)?tb\b/i.test(pm.mpn) && !features.includes("Threaded Barrel")) features.push("Threaded Barrel");
  return { code, family: d.models[code], gen, configs, features, src };
}

// ---------- terms mode (all other brands): ordered list of model patterns, first match wins ----------
function parseTerms(t, brand, d) {
  if (brand && d._deny_names.has(key(brand))) return null;
  const own = (Boolean(brand) && d._brand_names.has(key(brand))) || d._brand_start.test(t);
  if (!own) {
    if (!d._brand_any.test(t)) return null;
    if (d._block && d._block.test(t)) return null;
  }
  const hit = d.models.find((m) => m._match.test(t) && !(m._not && m._not.test(t)));
  if (!hit) return null;
  const allowed = d.other_brand_models;
  if (!own && allowed && allowed.length && !allowed.includes(hit.name)) return null;
  const g = d._gens.find(([, re]) => re.test(t));
  const gen = g ? g[0] : "";
  const configs = [];
  const implied = d.config_implied_by_gen_family || {};
  for (const [name, re] of d._configs) {
    if (!(hit.configs || []).includes(name)) continue;
    const imp = has(implied, name) && has(implied[name], hit.family) ? implied[name][hit.family] : [];
    if (re.test(t) || (gen && imp.includes(gen)) || (hit.implied_configs || []).includes(name)) configs.push(name);
  }
  const features = d._features.filter(([, re]) => re.test(t)).map(([n]) => n);
  return { code: hit.name, family: hit.family, gen, configs, features, src: "title" };
}

// which matching dictionary wins: the product's own brand -> brand at the start of the title -> brand mentioned earlier
function rank(title, d, brand) {
  if (brand && d._brand_names.has(key(brand))) return [0, 0];
  const t = norm(title, d);
  const m = d._brand_any.exec(t);
  if (m && m.index <= 2) return [1, 0];
  return [2, m ? m.index : 1e6];
}

function leaf(r, d) {
  let s;
  if (d.mode === "terms") {
    s = r.code + (r.gen ? " " + r.gen : "");
  } else {
    s = d.brand + " " + r.code;
    if (r.gen) s += r.gen === "V" ? " V" : " Gen " + r.gen;
  }
  const words = (x) => x.toLowerCase().match(/[a-z0-9.&+]+/g) || [];
  for (const c of r.configs) {
    // skip a config already spelled out in the name ("Plus Shield" on "S&W M&P Shield Plus")
    const have = new Set(words(s));
    if (!new RegExp("(?<![a-z0-9])" + reEscape(c) + "(?![a-z0-9])", "i").test(s) && !words(c).every((w) => have.has(w))) s += " " + c;
  }
  const needed = d.needed && has(d.needed, r.family) ? d.needed[r.family] : [];
  for (const f of d.feature_order || []) if (r.features.includes(f) && needed.includes(f)) s += " " + f;
  return s;
}

function parseOne(title, d, brand, mpn, sku) {
  const t = norm(title, d);
  if (d._exclude && d._exclude.test(t)) return null;
  if (d.mode === "terms") return parseTerms(t, brand, d);
  // the numeric dictionary (Glock) only runs when the brand is given or named in the title
  if (!((brand && d._brand_names.has(key(brand))) || d._brand_any.test(t))) return null;
  return parseNumeric(t, title, brand, mpn, sku, d);
}

/**
 * Find the brand, model family and model in a firearm product title.
 * @param {string} title product title as a store shows it
 * @param {{brand?: string, mpn?: string, sku?: string}} [opts] manufacturer, part number and SKU, if known
 * @returns {{brand: string, family: string, model: string, generation: string, configs: string[], features: string[], source: string} | null}
 */
export function identifyModel(title, opts = {}) {
  const brand = opts.brand || null;
  const mpn = opts.mpn || "";
  const sku = opts.sku || "";
  if (!title || AIRGUN.test(title) || isAccessory(title)) return null;
  const hits = [];
  for (const d of dicts()) {
    const r = parseOne(title, d, brand, mpn, sku);
    if (r) hits.push([rank(title, d, brand), d, r]);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1]);
  const [, d, r] = hits[0];
  const fd = d.family_display || {};
  const family = (has(fd, r.family) && fd[r.family]) || (d.mode !== "terms" ? d.brand + " " + r.family : r.family);
  return { brand: d.brand, family, model: leaf(r, d), generation: r.gen, configs: [...r.configs], features: [...r.features], source: r.src };
}
