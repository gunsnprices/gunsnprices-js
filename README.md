# gunsnprices

[![npm](https://img.shields.io/npm/v/gunsnprices)](https://www.npmjs.com/package/gunsnprices)
[![Tests](https://github.com/gunsnprices/gunsnprices-js/actions/workflows/ci.yml/badge.svg)](https://github.com/gunsnprices/gunsnprices-js/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20CC%20BY%204.0%20data-blue)](#license)

Parse firearm and ammunition product titles into structured data: brand, model, caliber, magazine capacity, barrel length,
rounds per box and cost per round.

```js
import { parseTitle } from "gunsnprices";

const info = parseTitle("Glock 19 Gen 5 MOS 9mm 4.02in 15rd Pistol PA195S203MOS");
info.model.model     // 'Glock 19 Gen 5 MOS'
info.caliber.name    // '9×19mm Parabellum'
info.capacity        // 15
info.barrelLength    // 4.02
```

This is the title parser behind [GunsNPrices](https://gunsnprices.com), a price comparison site that tracks 40+ US gun
and ammo stores. Store titles are messy (`G19 GEN5 9MM 15RD FS`, `O/U 12/28 BL/WD 3"`, `Federal 308 150gr ... 20rds`),
and matching the same product across stores starts with reading them reliably. The model dictionaries and the caliber
list in this package are the ones the site uses to group listings, so you get the same model names you see on
gunsnprices.com.

No dependencies, ES modules, TypeScript types included, Node 18+ and modern browsers, about 0.5 ms per title.
It is a port of the [Python package](https://pypi.org/project/gunsnprices/)
([source](https://github.com/gunsnprices/gunsnprices-python)) and gives identical results: both are checked against the
same 1,150 recorded titles, and they agree on all 63,755 titles of the GunsNPrices catalog.

## Install

```bash
npm install gunsnprices
```

## What it recognizes

| Field | Example in a title | Result |
|---|---|---|
| Firearm or ammo | `... 150gr ... 20rds` | `kind: "ammo"` |
| Brand and model (50 brands) | `G19 Gen5 MOS`, part number `PA195S203` | `Glock 19 Gen 5 MOS` |
| Calibers (293) | `.357 Mag / .38 Spl`, `6.5 CM`, `12ga`, `300 BLK`, `7MM RM` | `.357 Mag`, `.38 S&W Special`, ... |
| Magazine capacity | `15+1`, `17RD`, `13rd/15rd`, `10-shot` | `15`, `17`, `15`, `10` |
| Barrel length, inches | `4.02in`, `16 1/2"`, `22 BBL`, `O/U 12/28` | `4.02`, `16.5`, `22`, `28` |
| Rounds per box | `50/Box`, `Box of 20`, `1,000 Rounds`, `20/25` | `50`, `20`, `1000`, `20` |
| Cost per round | price `449.99` + `1000 Rounds` | `0.45` |

Brands with model dictionaries: Barrett, Benelli, Beretta, Bergara, Browning, Cadex, Canik, Charles Daly, Chiappa,
Christensen Arms, Cimarron, CMMG, Colt, CVA, CZ, Daniel Defense, Desert Eagle, Diamondback, Fierce, FN, Glock,
Great Lakes, Henry, Heritage, HK, Howa, Kel-Tec, Kimber, Kriss, Marlin, Mossberg, Remington, Retay, Rossi, Ruger, Savage,
SCCY, Seekins, Shadow Systems, Sig Sauer, Smith & Wesson, Springfield, Stevens, Stoeger, Taurus, Tikka, Tristar, Walther,
Weatherby, Winchester.

## Usage

### Everything at once

```js
import { parseTitle } from "gunsnprices";

const info = parseTitle("Federal American Eagle 5.56x45mm 55gr FMJ 1000 Rounds", { price: 449.99 });
info.kind            // 'ammo'
info.caliber.name    // '5.56×45mm NATO'
info.rounds          // 1000
info.costPerRound    // 0.45
```

`parseTitle(title, { brand, mpn, sku, price, kind })` returns:

| Field | Type | Notes |
|---|---|---|
| `kind` | `"firearm" \| "ammo"` | pass `kind` to skip the guess |
| `brand` | `string` | brand of the identified model, else the `brand` you passed |
| `model` | `ModelMatch \| null` | firearms only |
| `caliber` | `Caliber \| null` | first caliber in the title |
| `calibers` | `Caliber[]` | all calibers, in order |
| `capacity` | `number \| null` | magazine capacity (for `15+1` it is 15), firearms only |
| `barrelLength` | `number \| null` | inches, firearms only |
| `rounds` | `number \| null` | rounds per box, ammo only |
| `costPerRound` | `number \| null` | ammo with `price` only |

Passing `brand` (the manufacturer field from a feed) helps with titles that don't name the brand. Passing `mpn` lets it
decode Glock part numbers when the title says nothing useful:

```js
import { identifyModel } from "gunsnprices";

identifyModel("GLOCK 9MM PISTOL 15RD", { brand: "Glock", mpn: "UA4350201" });
// { brand: 'Glock', family: 'Glock 43', model: 'Glock 43', generation: '', configs: [], features: [], source: 'mpn' }
```

### Models

```js
import { identifyModel, listBrands } from "gunsnprices";

const m = identifyModel('Sig Sauer P365 XL 9mm 3.7" 12+1 Optic Ready');
m.family   // 'Sig Sauer P365'
m.model    // 'Sig Sauer P365 XL'
```

A model has `brand`, `family`, `model` (the most specific name), `generation`, `configs` (such as `MOS`, `Compact`),
`features` (such as `Threaded Barrel`, `FDE`) and `source` (`"title"` or `"mpn"`). Accessories, parts, airguns and
airsoft are rejected, so it returns `null` for "Glock 19 holster" and "Umarex Glock 19 CO2 BB pistol".

### Calibers

```js
import { findCalibers, normalizeCaliber, listCalibers } from "gunsnprices";

findCalibers("Henry Big Boy .44 Mag/.44 Spl 20in").map((c) => c.name);
// ['.44 Magnum', '.44 S&W Special']

normalizeCaliber("308 WIN (7.62X51 NATO)");
// { id: '308win', name: '.308 Win', type: 'rifle', url: 'https://gunsnprices.com/ammo/rifle-ammo/308-win' }
```

Each caliber has a stable `id`, a display `name`, a `type` (`handgun`, `rifle`, `rimfire`, `shotgun`, `airgun`,
`muzzleloader`) and the `url` of its GunsNPrices price comparison page. `normalizeCaliber` is meant for caliber fields
in product feeds; `findCalibers` searches free text.

### Numbers

```js
import { magazineCapacity, barrelLength, roundsPerBox, costPerRound } from "gunsnprices";

magazineCapacity("Springfield Hellcat Pro OSP 9mm 3.7in 15rd/17rd");   // 17
barrelLength('Mossberg 590 Persuader 12/20 BL/SY 3"');                // 20 (3" is the chamber)
roundsPerBox("Winchester 308 150gr PowerMax Bonded 20rds");           // 20
costPerRound(31.99, 20);                                              // 1.5995
```

### Command line

```bash
npx gunsnprices "Ruger GP100 .357 Mag / .38 Special 4.2in 6-shot Revolver"
cat titles.txt | npx gunsnprices > parsed.jsonl
npx gunsnprices --price 18.99 "Federal 9mm 115gr FMJ 50/Box"
```

## Accuracy

Measured on 50,202 firearm and 13,555 ammunition listings from 40+ stores on gunsnprices.com (October 2026),
against the attributes stored on the site:

| What | Found in the title | Right when found |
|---|---|---|
| Model (32,317 listings with a known model) | 99.97% | 100% same model as the site |
| Caliber, firearms | 81% | 97.8% |
| Caliber, ammo | 91% | 94.9% |
| Magazine capacity | 46% | 95.6% |
| Barrel length | 58% | 94.4% |
| Rounds per box | 80% | 96.6% |

"Found" is limited by the titles themselves: many stores don't put the caliber or barrel length in the title at all.
Most of the "wrong" cases we checked by hand are errors in the store data, not in the parser: a 6mm Creedmoor rifle
labeled 6.5 Creedmoor, a "1000 Rounds" case stored as a box of 20.

## Data

The model dictionaries and caliber list ship inside the package (`src/data/`). The same data, with listing counts and
price levels, is published as open datasets:

- Hugging Face: [gunsnprices/firearm-calibers](https://huggingface.co/datasets/gunsnprices/firearm-calibers),
  [gunsnprices/firearm-models](https://huggingface.co/datasets/gunsnprices/firearm-models)
- GitHub: [gunsnprices/firearm-datasets](https://github.com/gunsnprices/firearm-datasets)
- Kaggle: [gunsnprices](https://www.kaggle.com/gunsnprices)

## Limitations

- Titles from US retailers, in English.
- Models are covered for the 50 brands above. Other brands still get calibers and numbers.
- Built for firearms and ammunition. Magazines, parts and accessories get calibers and numbers but no model.
- The data is part of the module (about 430 KB, 84 KB gzipped). In a browser, load it with a dynamic `import()` if
  bundle size matters.

## License

The code is under the [MIT License](LICENSE). The data files in `src/data/` are under [CC BY 4.0](LICENSE-DATA): you
can use them for anything, including commercial use, if you credit **GunsNPrices (gunsnprices.com)** with a link.

Questions, corrections and missing models: open an issue or write to app@gunsnprices.com.
Current gun and ammo prices: [gunsnprices.com](https://gunsnprices.com).
