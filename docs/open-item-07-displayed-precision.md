# Determination: displayed precision

**Open item 7.** Owner: A. Modi + Developer. Answered 4 September 2026, first day of C1 build.
**Blocks acceptance test 2, which is now unblocked.**

## Answer

**Six significant figures is confirmed. C1-UN-06 stands as written, with a rounding mode added; drop the `⚠ proposed` mark.**

Not "it seems fine": four things were measured, and the choice has roughly eight
significant figures of headroom before the constraint that bounds it starts to bite.

Regenerate every number below with `npm run study:precision`.

## What was tested

### 1. Acceptance test 2 becomes evaluable, and test 1 lands exactly as the URS states

150 kDa, 1 mg/mL → `6.666666666666667e-6` mol/L → **`6.66667 µM`** at six significant
figures. This is the value §16.1 asserts, reproduced rather than assumed.

Six figures also does the discriminating job §4 claims for it: a monomer-vs-assembled
mass-basis error on the same case gives `3.33333 µM`, which no reader can mistake for
`6.66667 µM`. The factor of two is unambiguous at six figures, and would be at three; six
is not doing this job alone.

### 2. Six figures sits far below floating-point noise

The binding constraint is C1-IV-03: the same weight entered as a g/mol integer and as a
kDa decimal must agree **to displayed precision**. Those two paths differ in the last bit
in roughly 0.9% of realistic cases (URS §6), so the question is whether a 1-ULP
difference can move the displayed digit.

Disagreement rate against displayed precision, 200,000 random realistic pairs
(MW 1,000–1,000,000 g/mol, concentration over seven decades), measured against the
conversion code that ships:

| Displayed precision | Pairs disagreeing |
|---|---|
| 4–12 sig figs | 0 |
| **6 sig figs** (C1-UN-06) | **0** |
| 13 sig figs | 1 (0.0005%) |
| 14 sig figs | 8 (0.004%) |
| 15 sig figs | 92 (0.046%) |
| 16 sig figs | 820 (0.410%) |

Bit-level disagreement was measured at **0.620%** of pairs. The URS puts it at "roughly
0.9%"; the difference is the folded divisor described below, which removes some of the
path-dependence the stepwise implementation has. A prototype of the stepwise path measured
0.863%, which is the figure §6 is describing. Either way the conclusion is the same and
does not depend on which is right.

**C1-IV-03 first fails at thirteen significant figures.** Six is seven orders of magnitude
inside the safe region. This is the quantitative form of the URS's "staying below the point
where floating-point noise becomes visible", and it is a much larger margin than that
phrasing implies.

Separately, against exact rational arithmetic (Python `Fraction`, no floating point),
200,000 conversions showed the double-precision result at most 2.9 ULP from exact and
**zero** disagreements at six significant figures. Six figures is safe against absolute
error, not only against path-dependence.

### 3. C1-FX-07 is constructible at six figures, the fixture is kept, not dropped

§10 anticipated that it might not be, and instructed that the finding be recorded and the
fixture dropped rather than kept in weakened form. That contingency is not needed.

A case where rounding the unit-normalised intermediate, rather than carrying it
unrounded, changes the sixth significant figure of the result:

| | |
|---|---|
| Molecular weight | 148,327 g/mol |
| Entered concentration | 1234.5678 µg/mL |
| Unit-normalised intermediate | `1.2345678` g/L: carried unrounded |
| Same intermediate rounded to 6 sf | `1.23457` g/L |
| Result, unrounded intermediate | **8.32328 µM** |
| Result, intermediate rounded early | **8.32330 µM** |

The sixth significant figure differs. This fixture detects a violation of C1-UN-05 ("no
rounding shall be applied before final display") that no other fixture in the set would
catch. Construction assumption, per C1-FX-08: **the entered concentration must carry more
than six significant figures for the defect to have anything to bite on**, realistic when
a value is pasted from an instrument or LIMS export, and not otherwise. Such cases are
common rather than contrived: a random search over realistic antibody parameters found
three within the first few thousand draws.

### 4. Six figures does not disturb the round-trip tolerance

C1-IV-01 is a tolerance on the unrounded value (C1-UN-07) and is unaffected by display.
Confirmed separately: see the finding below and `docs/invariance-confirmation.md`.

## The rounding mode, now named

The first version of this determination flagged that C1-UN-06 said "6 significant figures"
without naming a tie-breaking rule. That is now decided: **half-to-even**, added to §11 as a
behaviour-determining row. See `rounding-ties.md` for the decision, the fixture that
exercises it (C1-FX-10, 1 g/L at 51.2 kDa, exactly 19.53125 µM), and the conflict between
C1-UN-07 and acceptance test 3 that the question exposed.

Two consequences for this determination:

- The measurements above are unaffected. Ties occur in a vanishing fraction of cases and
  none of the disagreement rates in the table move by a single case under either rule.
- The C1-FX-07 value below is not a tie under either rule, so that fixture stands as
  measured.

Trailing zeros are kept, so a value of exactly 2 µM displays `2.00000` rather than `2`.
Suppressing them would make "agrees to displayed precision" mean two different things
depending on the value.

## Adjacent finding: the tolerance constrains the implementation, not just the test

Recorded here because it was found while measuring precision, and it changes an
implementation decision rather than the answer above. Full detail in
`docs/invariance-confirmation.md`.

§11 derives the 1-ULP round-trip tolerance analytically: "each of the **two** operations
contributes at most ½ ULP of the result." A conversion that normalises units as separate
steps does not perform two operations, it performs six, because the unit factors are
applied on the way out and again on the way back, and the powers of ten among them are
not exactly representable in binary.

Measured, 300,000 random pairs across all five mass-concentration and all five
molar-concentration units:

| Implementation | Worst round-trip error | Cases exceeding 1 ULP |
|---|---|---|
| Unit normalisation as separate steps | **3.0 ULP** | 1,620 / 300,000 (0.54%) |
| Unit factors folded into one effective divisor | **1.0 ULP** | **0** / 300,000 |

The obvious implementation of a correct formula **fails C1-IV-01 in about one case in two
hundred**. The tolerance is not wrong and does not need revising: it is exactly right for
an implementation that does what the derivation says. C1 therefore folds the unit factors
and the molecular weight into a single effective divisor, so that a round trip really is
one division and one multiplication against an identical value, and the error cancels.

The two strategies are equally accurate against exact arithmetic (2.90 vs 2.91 ULP worst,
zero disagreements at six significant figures), so this costs nothing and buys the bound.

Worth noting for the register: this is a case where a derived constant did work that a
disclosed one could not. The 1-ULP bound rejected an implementation. A threshold chosen by
inspection would have been widened to accommodate it.
