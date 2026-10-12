// The same 1,150 real store titles and answers as the Python package's tests/golden.jsonl.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTitle } from "../src/index.js";

const cases = readFileSync(new URL("./golden.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function compact(info) {
  const m = info.model;
  return {
    kind: info.kind, brand: info.brand,
    model: m ? [m.family, m.model, m.generation, m.configs, m.features, m.source] : null,
    calibers: info.calibers.map((c) => c.id), capacity: info.capacity, barrel_length: info.barrelLength,
    rounds: info.rounds, cost_per_round: info.costPerRound,
  };
}

test(`golden: ${cases.length} titles parse exactly like the Python package`, () => {
  const failures = [];
  for (const c of cases) {
    const { title, ...opts } = c.args;
    const got = compact(parseTitle(title, opts));
    try {
      assert.deepStrictEqual(got, c.expected);
    } catch {
      failures.push(`${title}\n    expected ${JSON.stringify(c.expected)}\n    got      ${JSON.stringify(got)}`);
    }
  }
  assert.equal(failures.length, 0, `${failures.length} mismatches:\n` + failures.slice(0, 15).join("\n"));
});
