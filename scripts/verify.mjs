// Exhaustive reachability + CTA integrity check.
// Enumerates every answer combination through the REAL scoreAnswers() and
// asserts: (a) all six archetypes are reachable, (b) every product CTA it ever
// emits points to a slug that exists in data.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { QUESTIONS } from '../src/questions.js';
import { ARCHETYPES } from '../src/archetypes.js';
import { scoreAnswers } from '../src/scoring.js';
import { SETS } from '../src/sets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'src', 'data.json'), 'utf8'));
// Individual blends come from data.json; the "whole ritual" sets live in the
// Squarespace catalog (currently hidden) so their slugs are valid CTAs too.
const slugs = new Set([...data.products.map((p) => p.slug), ...Object.values(SETS).map((s) => s.slug)]);

const byKind = (k) => QUESTIONS.find((q) => q.kind === k);
const q1 = QUESTIONS[0].options, q2 = QUESTIONS[1].options, q3 = QUESTIONS[2].options;
const q4 = byKind('context').options, q5 = byKind('format').options, q6 = byKind('depth').options;

const reached = new Set();
const badCtas = [];
let combos = 0;

const one = (opt) => ({ options: [opt], other: '' }); // single-select probe
for (const a1 of q1) for (const a2 of q2) for (const a3 of q3)
for (const a4 of q4) for (const a5 of q5) for (const a6 of q6) {
  combos++;
  const r = scoreAnswers({ q1: one(a1), q2: one(a2), q3: one(a3), q4: one(a4), q5: one(a5), q6: one(a6) });
  reached.add(r.archetypeId);
  for (const p of [r.hero?.product, r.supporting, r.pairing?.product]) {
    if (p && !slugs.has(p.slug)) badCtas.push(`${r.archetypeId}: ${p.slug}`);
  }
  if (!r.hero?.product) badCtas.push(`${r.archetypeId}: NO HERO`);
}

const allIds = ARCHETYPES.map((a) => a.id);
const missing = allIds.filter((id) => !reached.has(id));

console.log(`Combinations tested: ${combos}`);
console.log(`Archetypes reached : ${[...reached].sort().join(', ')}`);
if (missing.length) console.log(`❌ UNREACHABLE      : ${missing.join(', ')}`);
else console.log(`✓ all ${allIds.length} archetypes reachable`);
if (badCtas.length) console.log(`❌ BAD CTAs (${badCtas.length}): ${[...new Set(badCtas)].slice(0, 10).join(' | ')}`);
else console.log('✓ every CTA resolves to a real slug');

process.exit(missing.length || badCtas.length ? 1 : 0);
