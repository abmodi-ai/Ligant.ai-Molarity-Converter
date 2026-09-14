# Acceptance test 3: independent reimplementation

> An independent reimplementation in a second language agrees with the shipped
> implementation on the full reference set, to displayed precision. **Code review does not
> satisfy this test.**

**Result: passed.** Reproduce with `npm run check:reimplementation`.

The criterion as quoted above is URS v0.5's wording, and it is being corrected in v0.6:
see **What the test compares** below. This build implements the corrected reading.

| | |
|---|---|
| Second implementation | `reference/molarity.py`: Python 3, no dependencies |
| Cases compared | **20,029** (40,058 unrounded values) |
| **Correctness gate**: unrounded values, ≤ 1 ULP (C1-UN-07) | **0** exceeding; worst observed **0 ULP**; 40,058 / 40,058 bit-identical |
| **Display check**: 6 s.f. half-to-even (C1-UN-06) | **0** disagreeing renderings |
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
The **display check** is separate, under C1-UN-06; it still has to pass, and it is how the
half-to-even rounding mode is verified across two implementations, but it is not the
correctness result. The v0.6 edit is A. Modi's; this is the corrected reading implemented
ahead of it.

**The gate is ≤ 1 ULP; bit-identical is recorded, not required.** Bit-identical is what this
pair measures, and making the observation the requirement would generalise one measured
instance into a claim about every future reimplementation: a language with wider intermediates
or FMA contraction can differ in the last bit on the same two operations, and a bit-exact gate
would then fail on correct code, the same shape as the bit-exact round trip (§6) and the
strict `<` on the ULP tolerance. Third instance of that pattern; see `correspondence.md`.

The observed figure is reported beside the requirement, and carried in §11, so drift from
exact agreement is visible rather than absorbed by the tolerance.

**One consequence, stated rather than left implicit:** a defect uniformly smaller than 1 ULP
is invisible to this test *and* to acceptance test 5, because the round trip cancels a uniform
scaling and this comparison admits it. The observed 0 ULP makes that weak here. It is not
nothing.

## How independence was kept

The Python was written from URS v0.5: the unit tables from §4, the conversion from §5, the
rejections from §7, the flag conditions and thresholds from §8 and §11; and not from the
TypeScript. A transliteration would reproduce the shipped code's arithmetic defects
faithfully and agree perfectly, which is the failure mode this test exists to rule out.

The two implementations meet only through `reference/reference-set.json`: inputs, and what
the shipped tool returns for them. `compare.py` imports nothing from `src/`.

Two decisions an independent author has to make, both of which the URS leaves open, are
recorded at the top of `molarity.py`:

1. **Unit normalisation.** §11 derives the round-trip tolerance from "each of the **two**
   operations", so the conversion is written as two operations against a single effective
   divisor. The arithmetically obvious stepwise reading breaches the tolerance, see
   `invariance-confirmation.md`. An independent author who read only §5 and not §11 would
   have written the stepwise form, and the comparison would still have passed at six
   significant figures while both implementations failed C1-IV-01. **Displayed-precision
   agreement does not imply round-trip correctness**, which is why acceptance tests 3 and 5
   are separate.
2. **Tie-breaking.** Half-to-even, per C1-UN-06 as amended; and this is the point of the
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
- five cases chosen to be awkward for a *formatter* rather than for arithmetic, zero, an
  exact integer result, a value that renders exponentially at each end, and one that crosses
  a decade boundary while rounding.

Twenty-one fixtures alone would not have established agreement. The disagreement this test
actually found was in that last group.

## What it found: a specification gap, not a Python bug

**`C1-FX-04n`** sits one ULP below 1 pM, so its molar value is `0.9999999999999999`. Rounding
that to six significant figures carries across a decade boundary, the result is `1.00000`,
not `1.000000`: and the first version of the Python formatter quantized against the exponent
of the *input* rather than of the *rounded value*, producing seven digits. It was the only
case in 40,058 that crosses a decade while rounding.

**The framing matters, and the framing is not "the Python was wrong".** The shipped
implementation was right. The second implementation was written from the URS, and the URS
does not say that significant-figure placement is determined by the rounded value rather than
the input's exponent. An author following the specification exactly could write either, and
one of the two is wrong.

So this is evidence that **C1-UN-06 is ambiguous**, which is a different and more useful claim
than a defect in the code. A defect in a reimplementation written from the specification is a
measurement of the specification.

That makes it the **second** convention "6 significant figures" turned out not to fix, after
half-to-even:

| Convention | Stated in v0.5? | Consequence if unstated |
|---|---|---|
| Tie-breaking rule | No: now half-to-even | Two implementations disagree on exact ties |
| Significant-figure placement after a carry | No | Seven digits where six were asked for |

C1-UN-06 needs both clauses. That edit is A. Modi's, for v0.6.

This is also the kind of defect code review does not find, which is what the acceptance
criterion says in terms. And the fixture that caught it is a boundary case constructed by
stepping one double below a threshold, **a fixture written to test a comparison operator in
§8 caught a formatting ambiguity in §4.**

## The reference set must contain a tie, and the comparison fails if it does not

`C1-FX-10`: 1 g/L at 51.2 kDa, exactly 19.53125 µM: is the case on which the two rounding
rules disagree (19.5312 half-to-even, 19.5313 half-up). Without it the display check would
pass while never exercising the rounding mode at all, so `compare.py` **fails when the
reference set contains no exact tie**, and `fixtures.test.ts` requires the set to contain
one.

An earlier version of this build asserted the opposite, that no fixture may land on a tie.
That is the fixture-distribution failure §10 and C1-FX-09 exist to prevent: the suite passes
by excluding the input class that exposes the ambiguity, and two implementations disagreeing
on real user data leave it green. Ties are unit-dependent: the same result expressed in M
is `1.9531250000000000406e-5` and is not a tie, so they cannot be excluded from the input
space, only from the fixtures.
