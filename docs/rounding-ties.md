# Note — displayed precision has a tie-breaking rule, and the URS does not name it

**Found while building the C1-FX-06 fixtures. A question for A. Modi, not a decision taken.**

## What happened

The first draft of C1-FX-06a used an scFv at 25.6 kDa and 0.5 mg/mL. Both values are
exactly representable in binary and the quotient is exact:

```
0.5 g/L ÷ 25 600 g/mol = 1.953125e-5 mol/L = 19.53125 µM
```

The seventh significant digit is a `5` with nothing after it — an exact tie. At six
significant figures that value displays as:

- **19.5313** under round-half-up, which is what JavaScript's `toPrecision` does, and
  what the implementation therefore does;
- **19.5312** under round-half-to-even, which is IEEE 754's default rounding mode and
  what a hand calculation in Python's `decimal` module gives unless told otherwise.

The expected value had been computed by exact rational arithmetic with half-to-even, so
the fixture failed against a conversion that was arithmetically perfect. The failure looks
exactly like an arithmetic bug and is not one.

## Why it matters beyond the one fixture

Acceptance test 2 evaluates a non-round molecular weight case "against hand calculation, to
displayed precision", and acceptance test 3 requires an independent reimplementation in a
second language to agree "to displayed precision" on the full reference set.

Neither test says how a tie is broken. A reimplementation in Python, R or Julia that
formats with half-to-even — the default in all three — will disagree with the shipped
JavaScript on exactly these values, and the disagreement will be reported as a
reimplementation failure when it is a formatting convention difference.

Ties are rare and are not randomly distributed: they occur when the exact result terminates
at the seventh significant digit, which happens when the arithmetic is exact in binary,
which happens when the molecular weight and concentration are round. That is precisely the
property §10 tells the fixture set not to have. So the two guards reinforce each other, and
the tie is much more likely to appear in a hand-written test case than in bench data.

## What was done

1. **C1-FX-06a was rebuilt** on a non-round weight — an scFv at 27,743 g/mol at
   0.42 mg/mL, giving 15.1390 µM, which is not a tie and displays identically under either
   rule.
2. **Every other fixture was checked** for the same property. None had it.
3. **A guard was added** to `fixtures.test.ts`: no fixture may land on a rounding tie. It
   fails with the value and the fixture id, so the next one is diagnosed in seconds rather
   than mistaken for an arithmetic defect.

The implementation itself was not changed. It uses `toPrecision`, and `toPrecision` is
half-up.

## The question

**Should C1-UN-06 name a tie-breaking rule, and if so which?**

- **Half-up** (current behaviour) is what JavaScript does natively and needs no code.
- **Half-to-even** is IEEE 754's default and is what an independent reimplementation in
  most other languages will do without being asked, which makes it the cheaper choice for
  acceptance test 3.

The values affected are a vanishing fraction of real cases and none of them are wrong under
either rule. But acceptance test 3 is a comparison between two implementations, and it is
the test most likely to be tripped by this. Naming the rule in the URS costs one sentence
and removes a class of false failure from a gate item that is established by execution.

Recommendation, offered rather than taken: **name half-to-even**, because the cost lands
once here and the alternative pays it every time someone writes the second implementation.
Say which you want and it will be changed before the fixtures harden.
