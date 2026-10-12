import ENT from "./data/entities.js";

const HTML5 = ENT.html5;
const INVALID_CHARREFS = ENT.invalid_charrefs;
const INVALID_CODEPOINTS = new Set(ENT.invalid_codepoints);
const CHARREF = /&(#[0-9]+;?|#[xX][0-9a-fA-F]+;?|[^\t\n\f <&#;]{1,32};?)/g;

/** Decode HTML character references exactly like Python's html.unescape. */
export function unescapeHtml(s) {
  if (!s || s.indexOf("&") < 0) return s || "";
  return s.replace(CHARREF, (whole, ref) => {
    if (ref[0] === "#") {
      const num = ref[1] === "x" || ref[1] === "X"
        ? parseInt(ref.slice(2).replace(/;$/, ""), 16)
        : parseInt(ref.slice(1).replace(/;$/, ""), 10);
      if (Object.prototype.hasOwnProperty.call(INVALID_CHARREFS, String(num))) return INVALID_CHARREFS[String(num)];
      if ((num >= 0xd800 && num <= 0xdfff) || num > 0x10ffff) return "�";
      if (INVALID_CODEPOINTS.has(num)) return "";
      return String.fromCodePoint(num);
    }
    if (Object.prototype.hasOwnProperty.call(HTML5, ref)) return HTML5[ref];
    for (let x = ref.length - 1; x > 1; x--) {
      const head = ref.slice(0, x);
      if (Object.prototype.hasOwnProperty.call(HTML5, head)) return HTML5[head] + ref.slice(x);
    }
    return "&" + ref;
  });
}

const SPECIAL = new Set("()[]{}?*+-|^$\\.&~# \t\n\r\v\f");

/** Escape a string for a regex the way Python's re.escape does (the same characters get a backslash). */
export function reEscape(s) {
  let out = "";
  for (const ch of s) out += SPECIAL.has(ch) ? "\\" + ch : ch;
  return out;
}

/** Python round(x, 4): correctly rounded, exact ties (0.53125) go to the even digit. */
export function round4(x) {
  const s = x.toFixed(20);
  const dot = s.indexOf(".");
  if (s[dot + 5] === "5" && /^0*$/.test(s.slice(dot + 6))) {
    const f = Math.floor(x * 10000);
    return (f % 2 === 0 ? f : f + 1) / 10000;
  }
  return parseFloat(x.toFixed(4));
}
