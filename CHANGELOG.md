# Changelog

## 0.1.1 (2026-10-12)

First release on npm. JavaScript port of the [gunsnprices](https://pypi.org/project/gunsnprices/) Python package 0.1.1,
with identical results on 63,755 store titles.

- `parseTitle()`: firearm or ammo, brand, model, calibers, magazine capacity, barrel length, rounds per box, cost per round.
- `identifyModel()`: 50 brands, the same model dictionaries that GunsNPrices uses on its site; decodes Glock part numbers.
- `findCalibers()` / `normalizeCaliber()`: 293 calibers with retailer spellings.
- `magazineCapacity()`, `barrelLength()`, `roundsPerBox()`, `costPerRound()`.
- Command line: `npx gunsnprices "title"`.
- TypeScript types included.
