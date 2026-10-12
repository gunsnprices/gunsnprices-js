#!/usr/bin/env node
// gunsnprices "Glock 19 Gen 5 9mm 15rd"  -> parsed title as JSON
// cat titles.txt | gunsnprices           -> JSON Lines, one per input line
import { createInterface } from "node:readline";
import { parseTitle, VERSION } from "../src/index.js";

const args = process.argv.slice(2);
const opts = {};
const words = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--brand") opts.brand = args[++i];
  else if (a === "--price") opts.price = parseFloat(args[++i]);
  else if (a === "--kind") opts.kind = args[++i];
  else if (a === "--version") {
    console.log(`gunsnprices ${VERSION}`);
    process.exit(0);
  } else if (a === "-h" || a === "--help") {
    console.log('usage: gunsnprices [--brand B] [--price P] [--kind firearm|ammo] ["title"]\nReads titles from stdin, one per line, when no title is given.');
    process.exit(0);
  } else words.push(a);
}

if (words.length) {
  console.log(JSON.stringify(parseTitle(words.join(" "), opts), null, 2));
} else {
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const t = line.trim();
    if (t) console.log(JSON.stringify(parseTitle(t, opts)));
  });
}
