# Confirmation: the invariance test is capable of failing

**C1-IV-01 and C1-IV-02.** Acceptance tests 5 and 7.

Generated from the conversion code by `npm run record:invariance`. Every number below
is measured, not transcribed. Engine version `0.1.0`.

## Corpus

500,008 cases: 8 recognisable bench cases at non-round
molecular weights, plus a seeded sweep over every combination of the five mass-concentration
units, the five molar-concentration units and both molecular-weight units, molecular weights
from 10³ to 10⁶ g/mol, and concentrations spanning eleven decades.

Seeded rather than random, so this record refers to a specific set of cases and a failure is
reproducible. The magnitude span is load-bearing: a corpus of realistic antibody
concentrations alone leaves the clamp and the floor undetected, and a test that cannot
detect them is what C1-IV-02 exists to rule out.

## C1-IV-01: the correct implementation

| | |
|---|---|
| Worst round-trip error | **1.0000 ULP** |
| Cases exceeding 1 ULP | **0** of 500,008 |
| Cases at exactly 1.0 ULP | 49,329 (9.866%) |

**The bound is saturated.** 9.866% of correct conversions land exactly on
1.0 ULP, so a strict `<` would reject correct code in roughly one case in
10. This is the same failure mode that made
bit-exactness unusable, reintroduced at the operator. The test is written `≤`, and
`invariance.test.ts` asserts the saturation directly so that the operator cannot quietly
stop being load-bearing.

## C1-IV-02: each inserted defect is detected, and each exceeds the tolerance

Both columns matter. That a defect is caught says the test fires; that its error exceeds
1 ULP says it was caught because it is real, and not because the tolerance was too tight
to admit correct code in the first place.

| Inserted defect | Detected | Worst error | Cases breaching |
|---|---|---|---|
| Clamp: molar result capped at 1e3 | **yes** | 9005798960281539.0000 ULP | 73,179 (14.636%) |
| Floor: molar result below 1e-9 flushed to zero | **yes** | 9007182539264312.0000 ULP | 90,857 (18.171%) |
| Nudge: molar result scaled by 1 + 2⁻⁵⁰ | **yes** | 10.0000 ULP | 500,008 (100.000%) |

Each defect is a plausible thing a developer writes for a reason that sounds good at the
time: a cap on implausible output, a denormal guard, a slightly wrong constant; rather
than a random corruption. A defect nobody would write proves nothing about a test's
sensitivity.

The nudge is the one that matters most. A relative error of 2⁻⁵⁰ (1.0000000000000009) changes
no digit at six significant figures, so displayed-precision comparison cannot see it at
all. The round-trip bound catches it by 10.0×. That gap is the whole
argument for having both checks.

A control is included in the test file: a clamp set above every value in the corpus is
undetectable, and the suite reports it as undetected rather than as a pass. Without it,
"the defect was detected" would not be a claim about the defect.

## The fourth defect, which was not inserted deliberately

| | |
|---|---|
| Worst round-trip error | **3.0000 ULP** |
| Cases exceeding 1 ULP | **2,769** of 500,008 (0.554%) |

The obvious implementation of the correct formula, normalise the concentration to a base
unit, divide by the molecular weight, denormalise to the output unit; breaches the
tolerance. It computes the right answer to six significant figures every time, and it fails
C1-IV-01.

§11 derives the tolerance from "each of the **two** operations contributes at most ½ ULP of
the result". Stepwise normalisation is not two operations: the unit factors are applied on
the way out and again on the way back, and 1e-3, 1e-6, 1e-9 and 1e-12 are not exactly
representable in binary, so their error accumulates instead of cancelling.

C1 therefore folds the unit factors and the molecular weight into a single effective
divisor (`effectiveMw` in `src/lib/convert.ts`), so that a round trip really is one
division and one multiplication against an identical double. It costs nothing: measured
against exact rational arithmetic the two strategies sit within 2.9 ULP of the true value
and neither disagrees with it at six significant figures.

The stepwise path is kept in `invariance.ts` and asserted to fail, as a permanent
regression guard.

**This is the tolerance doing work a disclosed constant could not.** A threshold chosen by
inspection would have been widened to accommodate the implementation. A derived one
rejected it.
