# Acceptance test 3 — independent reimplementation

> An independent reimplementation in a second language agrees with the shipped
> implementation on the full reference set, to displayed precision. **Code review does not
> satisfy this test.**

**Result: passed.** Reproduce with `npm run check:reimplementation`.

The criterion as quoted above is URS v0.5's wording, and it is being corrected in v0.6 —
see **What the test compares** below. This build implements the corrected reading.

| | |
|---|---|
| Second implementation | `reference/molarity.py` — Python 3, no dependencies |
| Cases compared | **20,029** (40,058 unrounded values) |
| **Correctness gate** — unrounded values (C1-UN-07) | **40,058 / 40,058 bit-identical**, worst 0 ULP |
| **Display check** — 6 s.f. half-to-even (C1-UN-06) | **0** disagreeing renderings |
| Exact ties exercised | **1** (C1-FX-10) |
| Flag-set disagreements | **0** |
| Rejection disagreements | **0** |

## What the test compares

URS v0.5 contains a conflict between two requirements, identified by A. Modi:

- **C1-UN-07** makes the **unrounded** value the one an independent reimplementation is
  compared against.
- **Acceptance test 3** says agreement is **to displayed precision**.

Those are different tests, and under the second a display convention does load-bearing work
inside a correctness gate: two implementations agreeing on every digit of the arithmetic
could fail for rounding a tie differently, and two disagreeing in the seventh significant
figure could pass. Correctness must not depend on a formatting choice.

So the comparison is split. The **correctness gate** is the unrounded structured values.
The **display check** is separate, under C1-UN-06 — it still has to pass, and it is how the
half-to-even rounding mode is verified across two implementations, but it is not the
correctness result. The v0.6 edit is A. Modi's; this is the corrected reading implemented
ahead of it.

The gate is set at bit-identical because that is what two implementations of the same two
IEEE 754 operations produce, and it is what is observed across 40,058 values. A future
reimplementation in a language with wider intermediates could legitimately differ by a ULP;
that would be a tolerance for the URS to state, not for the comparison script to decide
quietly.

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
2. **Tie-breaking.** Half-to-even, per C1-UN-06 as amended — and this is the point of the
   decision. Half-to-even is Python's own default, so the independent author writes it
   **without being told**, and being told is what would compromise the independence this
   test depends on. The shipped TypeScript implements it explicitly, because ECMAScript's
   `toPrecision` is half-up. See `rounding-ties.md`.

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

## The reference set must contain a tie, and the comparison fails if it does not

`C1-FX-10` — 1 g/L at 51.2 kDa, exactly 19.53125 µM — is the case on which the two rounding
rules disagree (19.5312 half-to-even, 19.5313 half-up). Without it the display check would
pass while never exercising the rounding mode at all, so `compare.py` **fails when the
reference set contains no exact tie**, and `fixtures.test.ts` requires the set to contain
one.

An earlier version of this build asserted the opposite — that no fixture may land on a tie.
That is the fixture-distribution failure §10 and C1-FX-09 exist to prevent: the suite passes
by excluding the input class that exposes the ambiguity, and two implementations disagreeing
on real user data leave it green. Ties are unit-dependent — the same result expressed in M
is `1.9531250000000000406e-5` and is not a tie — so they cannot be excluded from the input
space, only from the fixtures.
