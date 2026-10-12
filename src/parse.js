// One call for everything: parse a firearm or ammunition product title. Port of gunsnprices/parse.py.
import { findCalibers } from "./calibers.js";
import { identifyModel } from "./models.js";
import { barrelLength, costPerRound, looksLikeAmmo, magazineCapacity, roundsPerBox } from "./specs.js";

/**
 * Parse a product title into brand, model, caliber, capacity, barrel length, rounds per box and cost per round.
 * @param {string} title product title as a store shows it
 * @param {{brand?: string, mpn?: string, sku?: string, price?: number, kind?: "firearm" | "ammo"}} [opts]
 */
export function parseTitle(title, opts = {}) {
  title = title || "";
  const brand = opts.brand || null;
  let kind = opts.kind;
  if (kind !== "firearm" && kind !== "ammo") kind = looksLikeAmmo(title) ? "ammo" : "firearm";
  const calibers = findCalibers(title);
  const base = { title, kind, brand: brand || "", model: null, caliber: calibers[0] || null, calibers, capacity: null, barrelLength: null, rounds: null, costPerRound: null };
  if (kind === "ammo") {
    const rounds = roundsPerBox(title);
    return { ...base, rounds, costPerRound: opts.price ? costPerRound(opts.price, rounds) : null };
  }
  const model = identifyModel(title, { brand, mpn: opts.mpn || "", sku: opts.sku || "" });
  return { ...base, brand: model ? model.brand : brand || "", model, capacity: magazineCapacity(title), barrelLength: barrelLength(title) };
}
