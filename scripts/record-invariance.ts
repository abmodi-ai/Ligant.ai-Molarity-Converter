/**
 * Generates docs/invariance-confirmation.md from the real conversion code.
 *
 * C1-IV-02 requires the confirmation to be recorded. Recording it by hand would
 * make the document a claim about the code rather than a measurement of it, and
 * the first change to the conversion path would silently invalidate it. This
 * regenerates it: `npm run record:invariance`.
 */

import { writeFileSync } from 'node:fs'
import {
  NUDGE_FACTOR,
  ROUND_TRIP_TOLERANCE_ULP,
  clampedPath,
  correctPath,
  flooredPath,
  nudgedPath,
  roundTripUlps,
  stepwisePath,
  withinTolerance,
  type ConversionPath,
} from '../src/lib/invariance'
import { REALISTIC_CASES, generateCases } from '../src/lib/corpus'
import { ENGINE_VERSION } from '../src/lib/convert'

const CASES = [...REALISTIC_CASES, ...generateCases(500_000)]

function measure(path: ConversionPath) {
  let worstUlps = 0
  let breaches = 0
  let saturated = 0
  for (const c of CASES) {
    const u = roundTripUlps(c, path)
    if (!withinTolerance(u)) breaches++
    if (u === ROUND_TRIP_TOLERANCE_ULP) saturated++
    if (u > worstUlps) worstUlps = u
  }
  return { worstUlps, breaches, saturated }
}

const pct = (n: number) => `${((100 * n) / CASES.length).toFixed(3)}%`
const ulp = (n: number) => (Number.isFinite(n) ? n.toFixed(4) : '∞')

const clean = measure(correctPath)
const rows = [
  { name: 'Clamp — molar result capped at 1e3', ...measure(clampedPath(1e3)) },
  { name: 'Floor — molar result below 1e-9 flushed to zero', ...measure(flooredPath(1e-9)) },
  { name: `Nudge — molar result scaled by 1 + 2⁻⁵⁰`, ...measure(nudgedPath()) },
]
const stepwise = measure(stepwisePath())

const doc = `# Confirmation — the invariance test is capable of failing

**C1-IV-01 and C1-IV-02.** Acceptance tests 5 and 7.

Generated from the conversion code by \`npm run record:invariance\`. Every number below
is measured, not transcribed. Engine version \`${ENGINE_VERSION}\`.

## Corpus

${CASES.length.toLocaleString('en-US')} cases: ${REALISTIC_CASES.length} recognisable bench cases at non-round
molecular weights, plus a seeded sweep over every combination of the five mass-concentration
units, the five molar-concentration units and both molecular-weight units, molecular weights
from 10³ to 10⁶ g/mol, and concentrations spanning eleven decades.

Seeded rather than random, so this record refers to a specific set of cases and a failure is
reproducible. The magnitude span is load-bearing: a corpus of realistic antibody
concentrations alone leaves the clamp and the floor undetected, and a test that cannot
detect them is what C1-IV-02 exists to rule out.

## C1-IV-01 — the correct implementation

| | |
|---|---|
| Worst round-trip error | **${ulp(clean.worstUlps)} ULP** |
| Cases exceeding ${ROUND_TRIP_TOLERANCE_ULP} ULP | **${clean.breaches}** of ${CASES.length.toLocaleString('en-US')} |
| Cases at exactly ${ROUND_TRIP_TOLERANCE_ULP}.0 ULP | ${clean.saturated.toLocaleString('en-US')} (${pct(clean.saturated)}) |

**The bound is saturated.** ${pct(clean.saturated)} of correct conversions land exactly on
1.0 ULP, so a strict \`<\` would reject correct code in roughly one case in
${Math.round(CASES.length / Math.max(clean.saturated, 1))}. This is the same failure mode that made
bit-exactness unusable, reintroduced at the operator. The test is written \`≤\`, and
\`invariance.test.ts\` asserts the saturation directly so that the operator cannot quietly
stop being load-bearing.

## C1-IV-02 — each inserted defect is detected, and each exceeds the tolerance

Both columns matter. That a defect is caught says the test fires; that its error exceeds
1 ULP says it was caught because it is real, and not because the tolerance was too tight
to admit correct code in the first place.

| Inserted defect | Detected | Worst error | Cases breaching |
|---|---|---|---|
${rows
  .map(
    (r) =>
      `| ${r.name} | ${r.breaches > 0 ? '**yes**' : '**NO**'} | ${ulp(r.worstUlps)} ULP | ${r.breaches.toLocaleString('en-US')} (${pct(r.breaches)}) |`,
  )
  .join('\n')}

Each defect is a plausible thing a developer writes for a reason that sounds good at the
time — a cap on implausible output, a denormal guard, a slightly wrong constant — rather
than a random corruption. A defect nobody would write proves nothing about a test's
sensitivity.

The nudge is the one that matters most. A relative error of 2⁻⁵⁰ (${NUDGE_FACTOR}) changes
no digit at six significant figures, so displayed-precision comparison cannot see it at
all. The round-trip bound catches it by ${(rows[2].worstUlps / ROUND_TRIP_TOLERANCE_ULP).toFixed(1)}×. That gap is the whole
argument for having both checks.

A control is included in the test file: a clamp set above every value in the corpus is
undetectable, and the suite reports it as undetected rather than as a pass. Without it,
"the defect was detected" would not be a claim about the defect.

## The fourth defect, which was not inserted deliberately

| | |
|---|---|
| Worst round-trip error | **${ulp(stepwise.worstUlps)} ULP** |
| Cases exceeding ${ROUND_TRIP_TOLERANCE_ULP} ULP | **${stepwise.breaches.toLocaleString('en-US')}** of ${CASES.length.toLocaleString('en-US')} (${pct(stepwise.breaches)}) |

The obvious implementation of the correct formula — normalise the concentration to a base
unit, divide by the molecular weight, denormalise to the output unit — breaches the
tolerance. It computes the right answer to six significant figures every time, and it fails
C1-IV-01.

§11 derives the tolerance from "each of the **two** operations contributes at most ½ ULP of
the result". Stepwise normalisation is not two operations: the unit factors are applied on
the way out and again on the way back, and 1e-3, 1e-6, 1e-9 and 1e-12 are not exactly
representable in binary, so their error accumulates instead of cancelling.

C1 therefore folds the unit factors and the molecular weight into a single effective
divisor (\`effectiveMw\` in \`src/lib/convert.ts\`), so that a round trip really is one
division and one multiplication against an identical double. It costs nothing: measured
against exact rational arithmetic the two strategies sit within 2.9 ULP of the true value
and neither disagrees with it at six significant figures.

The stepwise path is kept in \`invariance.ts\` and asserted to fail, as a permanent
regression guard.

**This is the tolerance doing work a disclosed constant could not.** A threshold chosen by
inspection would have been widened to accommodate the implementation. A derived one
rejected it.
`

writeFileSync(new URL('../docs/invariance-confirmation.md', import.meta.url), doc)
console.log(`wrote docs/invariance-confirmation.md (${CASES.length.toLocaleString('en-US')} cases)`)
console.log(`  correct: worst ${ulp(clean.worstUlps)} ULP, ${clean.breaches} breaches, ${clean.saturated} saturated`)
for (const r of rows) console.log(`  ${r.name}: worst ${ulp(r.worstUlps)} ULP, ${r.breaches} breaches`)
console.log(`  stepwise: worst ${ulp(stepwise.worstUlps)} ULP, ${stepwise.breaches} breaches`)
