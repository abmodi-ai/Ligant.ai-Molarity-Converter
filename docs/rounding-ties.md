# Rounding at displayed precision — resolved, and a conflict it exposed

**Raised while building the C1-FX-06 fixtures. Decided by A. Modi, 4 September 2026.**

## Decision

**C1-UN-06 names half-to-even.** Implemented in both the shipped TypeScript and the
independent Python reimplementation.

The reasons, as given:

- It is the IEEE 754 default and the default in Python, R and Julia, so **an independent
  reimplementation agrees without being told — and being told is exactly what compromises
  its independence.** Acceptance test 3 depends on the second author not having to be
  briefed on conventions.
- It is **unbiased under repeated rounding**, where half-up drifts upward.

JavaScript's `toPrecision` is half-up, so the tool implements the rounding mode explicitly
rather than inheriting the platform default. `src/lib/format.ts` rounds from the exact
decimal expansion of the double, obtained by BigInt arithmetic, because that is the only
way to know whether a value is genuinely halfway.

**§11 gains a row:** rounding mode, half-to-even, basis — IEEE 754 default and unbiased.
Not a threshold, but behaviour-determining, and the register exists so that no
behaviour-determining choice is silent.

## What was rejected, and why it matters

The third option considered was to leave the rule unnamed and simply keep ties out of the
fixture set. That was rejected outright, and the reasoning is worth keeping:

> Suppressing ties in the fixtures makes the suite pass by excluding the input class that
> exposes the ambiguity. That is the fixture-distribution failure §10 and C1-FX-09 exist to
> prevent, and it would leave two implementations disagreeing on real user data with the
> suite green.

An earlier version of this build had done exactly that — a guard asserting that **no**
fixture lands on a tie. That guard has been inverted. `fixtures.test.ts` now requires the
set to **contain** one, and the acceptance test 3 comparison **fails if the reference set
contains no tie at all**, because a comparison that never exercises the rounding mode does
not verify it.

## The fixture

**C1-FX-10 — 1 g/L at 51.2 kDa**, which is exactly **19.53125 µM**.

| | |
|---|---|
| Half-to-even (C1-UN-06) | **19.5312** |
| Half-up (JavaScript default) | 19.5313 |

Verified to give exactly 19.53125 through all three plausible unit-normalisation paths —
folded from kDa, folded from g/mol, and stepwise — so the fixture tests the rounding mode
and not an artefact of one implementation's arithmetic. Both the reagent and the
concentration are entirely ordinary.

## Ties are unit-dependent, which is the other reason the rule has to be named

The same result expressed in **M** rather than µM is
`1.9531250000000000406e-5` — **not a tie**, and it rounds up under either rule.

The exact decimal expansion of that double continues `…00040657581468…`, which is above the
halfway point. The same reagent, the same concentration, the same conversion; only the
output unit differs, and the tie appears or does not.

So ties cannot be designed out of the input space. They can only be designed out of the
fixtures, which is the failure above.

This also caught a defect in the tooling. An earlier tie detector tested whether a value
*round-trips* through seven significant digits, and `1.953125e-5` does — so it was reported
as a tie when it is not. Round-tripping is not the same question as the exact expansion
terminating. Both the TypeScript `isExactTie` and the Python `is_exact_tie` now decide on
the exact expansion.

## The larger catch — a conflict already in URS v0.5

The scenario exposed a conflict between two requirements that were both already in the
document, and this is A. Modi's finding rather than a build issue:

- **C1-UN-07** — "The unrounded value shall be present in the structured object, and **is
  the value against which an independent reimplementation is compared**."
- **Acceptance test 3** — "An independent reimplementation in a second language agrees with
  the shipped implementation on the full reference set, **to displayed precision**."

Those are different tests. As written, a display convention does load-bearing work inside a
correctness gate: two implementations agreeing on every digit of the arithmetic could fail
test 3 for rounding a tie differently, and two disagreeing in the seventh significant
figure could pass it.

**Correctness must not depend on a formatting choice.** Test 3 compares the unrounded
structured values; the displayed string is a separate check under C1-UN-06.

**This is a v0.6 edit and it is A. Modi's, not the build's.** It is implemented here in
advance of that edit, and `reference/compare.py` now reports the two separately:

| Check | Standard | Result |
|---|---|---|
| Correctness gate | unrounded values, ≤ 1 ULP, C1-UN-07 | **0** exceeding; worst observed **0 ULP** over 40,058 values |
| Display check | six significant figures half-to-even, C1-UN-06 | **0** disagreeing renderings, 1 tie exercised |

The gate is **≤ 1 ULP**, with bit-identical recorded beside it rather than required — see
`acceptance-03-reimplementation.md` and `correspondence.md`. Setting the requirement at what
one pair happened to measure is the third instance in this project of a comparison tightened
past what correct code can satisfy.
