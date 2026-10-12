// gunsnprices - parse firearm and ammunition product titles.
// Brand and model (Glock 19 Gen 5 MOS), caliber, magazine capacity, barrel length, rounds per box and cost per round.
// Built on the model dictionaries and caliber list behind https://gunsnprices.com.
export { parseTitle } from "./parse.js";
export { identifyModel, listBrands } from "./models.js";
export { findCalibers, findCaliber, normalizeCaliber, listCalibers } from "./calibers.js";
export { magazineCapacity, barrelLength, roundsPerBox, costPerRound, looksLikeAmmo } from "./specs.js";
export const VERSION = "0.1.1";
