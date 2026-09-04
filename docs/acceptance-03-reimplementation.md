# Acceptance test 3 — independent reimplementation

> An independent reimplementation in a second language agrees with the shipped
> implementation on the full reference set, to displayed precision. **Code review does not
> satisfy this test.**

**Result: passed.** Reproduce with `npm run check:reimplementation`.

| | |
|---|---|
| Second implementation | `reference/molarity.py` — Python 3, no dependencies |
| Cases compared | **20,028** |
| Disagreements at displayed precision | **0** |
| Flag-set disagreements | **0** |
| Rejection disagreements | **0** |
| Worst ULP distance on the unrounded values | **0** |

## How independence was kept

The Python was written from URS v0.5 — the unit tables from §4, the conversion from §5, the
rejections from §7, the flag conditions and thresholds from §8 and §11 — and not from the
TypeScript. A transliteration would reproduce the shipped code's arithmetic defects
faithfully and agree perfectly, which is the failure mode this test exists to rule out.

The two implementations meet only through `reference/reference-set.json`: inputs, and what
the shipped tool returns for them. `compare.py` imports nothing from `src/`.

Two decisions an independent author has to make, both of which the URS leaves open, are
recorded at the top of `molarity.py`:

1. **Unit normalisation.** §11 derives the round-trip tolerance from "each of the **two**
   operations", so the conversion is written as two operations against a single effective
   divisor. The arithmetically obvious stepwise reading breaches the tolerance — see
   `invariance-confirmation.md`. An independent author who read only §5 and not §11 would
   have written the stepwise form, and the comparison would still have passed at six
   significant figures while both implementations failed C1-IV-01. **Displayed-precision
   agreement does not imply round-trip correctness**, which is why acceptance tests 3 and 5
   are separate.
2. **Tie-breaking.** Matched to ECMAScript's round-half-up deliberately, so that the
   comparison tests the arithmetic rather than a formatting convention. Python's own default
   is half-to-even and would disagree on exact ties. See `rounding-ties.md` — this is the
   open question, and this test is where it would have bitten.

## The reference set

§10's 21 fixtures, which is "the full reference set" the acceptance criterion names, plus:

- a deterministic sweep of 20,000 cases over every combination of the five mass-concentration
  units, five molar-concentration units and both molecular-weight units, across eleven
  decades of concentration and three of molecular weight, in both conversion directions,
  rotating through every provenance and mass-basis value so the flag rules are compared and
  not only the arithmetic;
- five cases chosen to be awkward for a *formatter* rather than for arithmetic — zero, an
  exact integer result, a value that renders exponentially at each end, and one that crosses
  a decade boundary while rounding.

Twenty-one fixtures alone would not have established agreement. The disagreement this test
actually found was in that last group.

## What it found

One genuine defect, in the reimplementation rather than in the shipped tool:

**`C1-FX-04n`** sits one ULP below 1 pM, so its molar value is `0.9999999999999999`. Rounding
that to six significant figures carries across a decade boundary — the result is `1.00000`,
not `1.000000` — and the first version of the Python formatter quantized against the
exponent of the *input* rather than of the rounded value, producing seven digits. It was the
only case in 20,028 that crosses a decade while rounding.

Worth recording for two reasons. It is the kind of defect code review does not find, which is
what the acceptance criterion says in terms. And the fixture that caught it is a boundary
case constructed by stepping one double below a threshold — a fixture written to test a
comparison operator in §8, which caught a formatting bug in §4 instead.

The comparison also reports how many values in the set land on a rounding tie. Currently
**zero**, so the open question in `rounding-ties.md` does not presently affect this test's
result. That is a fact about today's reference set, not a reason to leave the rule unnamed:
a fixture added later could reintroduce one, and `fixtures.test.ts` guards against it.
