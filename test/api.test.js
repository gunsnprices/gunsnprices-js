import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as g from "../src/index.js";

test("identifyModel", () => {
  const cases = [
    ["Glock 19 Gen 5 MOS 9mm 4.02in 15rd Pistol", {}, "Glock 19 Gen 5 MOS"],
    ["G19 Gen5 9mm 15rd FS", { brand: "Glock" }, "Glock 19 Gen 5"],
    ["Glock 43X 9mm 3.41in 10rd Black", {}, "Glock 43X"],
    ["GLOCK 9MM PISTOL 15RD", { brand: "Glock", mpn: "PA195S203" }, "Glock 19 Gen 5"],
    ["Sig Sauer P365 XL 9mm 3.7in 12rd Pistol", {}, "Sig Sauer P365 XL"],
    ["Ruger GP100 .357 Mag 4.2in 6rd Revolver", {}, "Ruger GP100"],
  ];
  for (const [title, opts, model] of cases) assert.equal(g.identifyModel(title, opts)?.model, model, title);
  assert.equal(g.identifyModel("GLOCK 9MM PISTOL 15RD", { brand: "Glock", mpn: "PA195S203" }).source, "mpn");
});

test("identifyModel rejects airguns, accessories and unknown titles", () => {
  for (const t of ["Umarex Glock 19 CO2 BB Pistol .177", "Hornady 9mm 115gr FTX Critical Defense 25rd", "Glock 19 holster",
    "Sig P365 XL 12rd Magazine 9mm", "Magpul PMAG for Glock 19", ""]) assert.equal(g.identifyModel(t), null, t);
  assert.equal(g.identifyModel("Glock 19 Gen 5 9mm 15rd w/ 3 magazines").model, "Glock 19 Gen 5");
});

test("findCalibers", () => {
  const cases = [
    ["Ruger GP100 .357 Mag / .38 Special 4.2in Revolver", [".357 Mag", ".38 S&W Special"]],
    ["Federal American Eagle 9mm Luger 115gr FMJ 50rd", ["9×19mm Parabellum"]],
    ["Hornady 6.5 Creedmoor 143gr ELD-X", ["6.5mm Creedmoor"]],
    ["PSA AR-15 300 Blackout 16in Rifle", [".300 AAC Blackout"]],
    ["Kent 12G Fasteel 3in BBB", ["12 Gauge"]],
    ['Beretta 686 O/U 12/28 BL/WD 3"', ["12 Gauge"]],
    ["Winchester 308 150gr PowerMax Bonded 20rds", [".308 Win"]],
    ['Remington 7mm RM 26" Bolt Rifle', ["7mm Remington Magnum"]],
    ["Model 1911 Range Officer Parkerized", []],
    ["Umarex 12g CO2 Cartridges 15 pack", []],
  ];
  for (const [t, names] of cases) assert.deepEqual(g.findCalibers(t).map((c) => c.name), names, t);
});

test("normalizeCaliber and lists", () => {
  assert.equal(g.normalizeCaliber("9mm Luger").id, "9x19mmparabellum");
  assert.equal(g.normalizeCaliber("12 GA").name, "12 Gauge");
  assert.equal(g.normalizeCaliber("nothing here"), null);
  assert.equal(g.listBrands().length, 50);
  const cals = g.listCalibers();
  assert.ok(cals.length > 250 && new Set(cals.map((c) => c.id)).size === cals.length);
});

test("numbers", () => {
  assert.equal(g.magazineCapacity("Glock 19 Gen5 9mm 4.02in 15+1"), 15);
  assert.equal(g.magazineCapacity("Kimber CDS9 9mm 3.18in 13rd/15rd Black"), 15);
  assert.equal(g.magazineCapacity("Ruger 10/22 Carbine 22LR"), null);
  assert.equal(g.barrelLength('Beretta A300 Ultima 12 GA 3" Chamber 28" Barrel'), 28);
  assert.equal(g.barrelLength('Mossberg 590 Persuader 12/20 BL/SY 3"'), 20);
  assert.equal(g.barrelLength('Colt Python 4 1/4" .357'), 4.25);
  assert.equal(g.barrelLength("Ruger 10/22 SBR 22LR 8in 15rd"), 8);
  assert.equal(g.roundsPerBox("Federal American Eagle 9mm 115gr FMJ, 50/Box"), 50);
  assert.equal(g.roundsPerBox("Prvi Partizan 5.56x45mm M193 55gr 1,000 Rounds"), 1000);
  assert.equal(g.roundsPerBox("Barnaul 7.62x39 123gr FMJ 20/25"), 20);
  assert.equal(g.costPerRound(18.99, 50), 0.3798);
  assert.equal(g.costPerRound(425, 800), 0.5312);
  assert.equal(g.costPerRound(0, 50), null);
});

test("parseTitle", () => {
  const gun = g.parseTitle("Glock 19 Gen5 MOS 9mm 4.02in 15+1 Black");
  assert.equal(gun.kind, "firearm");
  assert.equal(gun.model.model, "Glock 19 Gen 5 MOS");
  assert.deepEqual([gun.capacity, gun.barrelLength, gun.rounds], [15, 4.02, null]);
  const ammo = g.parseTitle("Federal American Eagle 9mm Luger 115gr FMJ, 50/Box", { price: 18.99 });
  assert.deepEqual([ammo.kind, ammo.rounds, ammo.costPerRound, ammo.caliber.id], ["ammo", 50, 0.3798, "9x19mmparabellum"]);
});

test("cli", () => {
  const out = execFileSync(process.execPath, [new URL("../bin/gunsnprices.js", import.meta.url).pathname, "Glock", "19", "Gen", "5", "9mm"]);
  assert.equal(JSON.parse(out).model.model, "Glock 19 Gen 5");
});
