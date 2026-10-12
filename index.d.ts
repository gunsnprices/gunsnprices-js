export interface Caliber {
  /** stable id, e.g. "9x19mmparabellum" */
  id: string;
  /** display name, e.g. "9×19mm Parabellum" */
  name: string;
  type: "handgun" | "rifle" | "rimfire" | "shotgun" | "airgun" | "muzzleloader";
  /** GunsNPrices page comparing prices for this caliber ("" if none) */
  url: string;
}

export interface ModelMatch {
  /** brand as named on GunsNPrices, e.g. "Glock" */
  brand: string;
  /** model family, e.g. "Glock 19" */
  family: string;
  /** most specific model, e.g. "Glock 19 Gen 5 MOS" */
  model: string;
  /** "5", "V", "V3" ... or "" when unknown */
  generation: string;
  /** configurations found, e.g. ["MOS"], ["Compact"] */
  configs: string[];
  /** features found, e.g. ["Threaded Barrel", "FDE"] */
  features: string[];
  /** "title" or "mpn" (Glock part number decoded) */
  source: "title" | "mpn";
}

export interface ProductInfo {
  title: string;
  kind: "firearm" | "ammo";
  /** brand of the identified model, else the brand option, else "" */
  brand: string;
  /** firearms only */
  model: ModelMatch | null;
  /** first caliber in the title */
  caliber: Caliber | null;
  /** every caliber in the title, in order */
  calibers: Caliber[];
  /** magazine capacity (15 for "15+1"), firearms only */
  capacity: number | null;
  /** inches, firearms only */
  barrelLength: number | null;
  /** rounds per box, ammo only */
  rounds: number | null;
  /** ammo with a price only */
  costPerRound: number | null;
}

export interface ParseOptions {
  /** manufacturer, if known */
  brand?: string;
  /** manufacturer part number, if known */
  mpn?: string;
  /** store SKU, if known */
  sku?: string;
  /** listing price; with ammo it gives costPerRound */
  price?: number;
  /** skip the firearm/ammo guess */
  kind?: "firearm" | "ammo";
}

export function parseTitle(title: string, opts?: ParseOptions): ProductInfo;
export function identifyModel(title: string, opts?: { brand?: string; mpn?: string; sku?: string }): ModelMatch | null;
export function listBrands(): string[];
export function findCalibers(text: string): Caliber[];
export function findCaliber(text: string): Caliber | null;
export function normalizeCaliber(value: string): Caliber | null;
export function listCalibers(): Caliber[];
export function magazineCapacity(title: string): number | null;
export function barrelLength(title: string): number | null;
export function roundsPerBox(title: string): number | null;
export function costPerRound(price: number, rounds: number | null): number | null;
export function looksLikeAmmo(title: string): boolean;
export const VERSION: string;
