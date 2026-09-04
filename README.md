# Ligant.ai — Molarity Converter for Biologics (C1)

Build against **URS v0.5**, approved at specification level (Nadira, 3 September 2026) and
released for build.

The tool performs one determination: the molar concentration corresponding to a stated mass
concentration, or the reverse, for a protein whose molecular weight the user declares along
with its source and what that weight is the mass *of*. It does not plan dilutions, prepare
stocks, identify proteins, or supply molecular weights.

## Day-one answers

Both open items the build note put before UI work are answered, with evidence.

| Open item | Answer | Where |
|---|---|---|
| **1** — can the shipped ADC result format carry provenance and mass basis? | **No — and not because the enumerations do not fit. There is no result object to fit them into.** Escalated; nothing extended locally. | [`docs/open-item-01-adc-format-finding.md`](docs/open-item-01-adc-format-finding.md) |
| **7** — displayed precision | **Six significant figures confirmed.** C1-IV-03 first fails at thirteen figures, so six has seven orders of headroom. Acceptance test 2 is unblocked. | [`docs/open-item-07-displayed-precision.md`](docs/open-item-07-displayed-precision.md) |

Two further findings came out of the same work:

- [`docs/invariance-confirmation.md`](docs/invariance-confirmation.md) — C1-IV-02, generated
  from the code. Also records a defect that was **not** inserted deliberately: the obvious
  stepwise implementation of the correct formula breaches the 1 ULP tolerance in 0.55% of
  cases. C1 folds the unit factors into a single effective divisor to meet the bound.
- [`docs/rounding-ties.md`](docs/rounding-ties.md) — displayed precision has a tie-breaking
  rule and the URS does not name one. Matters for acceptance test 3. **Question open.**

## Status

**Held pending open item 1:** C1-OUT-04 (structured object in the ADC's format) and
acceptance test 4. No serialiser is written and no local extension of the ADC's CSV has been
invented to stand in for one. Everything else is independent of that decision and proceeds.

**Not yet built:** the interface, the tool's own page (§9 failure classes, §11 constants
register, C1-FC-01, C1-CN-01), and acceptance test 14 — which needs a real browser against
the deployed address with network monitoring started before page load, and which checking
the build artefact does not satisfy.

**Built and passing:** the conversion engine, validation, flags, the fixture set, and the
invariance confirmation. 88 tests.

| Requirement | Where |
|---|---|
| C1-MW-01/02/03 — weight required, never inferred | `src/lib/compute.ts`, `src/lib/no-inference.test.ts` |
| C1-MW-04..08 — provenance and mass basis | `src/lib/units.ts` |
| C1-UN-01..07 — explicit units, no early rounding | `src/lib/units.ts`, `src/lib/format.ts` |
| C1-CV-01..03 — the conversion | `src/lib/convert.ts` |
| C1-IV-01..03 — invariance | `src/lib/invariance.ts`, `src/lib/invariance.test.ts` |
| §7 — reject | `src/lib/validate.ts` |
| §8, §9, §11 — flag, failure classes, constants register | `src/lib/flags.ts` |
| §10 — fixtures | `src/lib/fixtures.ts` |

## Three requirements that are deliberate

- **C1-MW-02.** No molecular weight is inferred, defaulted, pre-filled or suggested, for
  any protein, ever. This is asserted against the source and not only against the type
  signature — a default parameter or a lookup table would satisfy the compiler.
  `no-inference.test.ts`.
- **C1-IV-01/02.** The round-trip test is confirmed capable of failing: a clamp, a floor
  and a nudge are inserted and each is shown to be caught **and** to exceed 1 ULP, so the
  tolerance is demonstrated not to have disabled the test. The suite also includes a
  control — a clamp above every value in the corpus, which must be reported as undetected.
  The tolerance is `≤ 1 ULP`, not `<`: 9.87% of correct conversions land exactly on 1.0
  ULP, so a strict comparison fails on correct code, and a test asserts that saturation
  directly.
- **C1-FX-09.** The negative control. A clean case that must raise no flags, in both
  conversion directions, placed well inside every bound rather than just inside one.

## Still open, owned elsewhere, not blocking

Four plausibility thresholds — 1 kDa, 1000 kDa, 250 mg/mL, 1 pM — are inspection-chosen and
Nadira is writing the basis for each (open items 2 and 3). Built against the values as
written. They are in `CONSTANTS_REGISTER` in `src/lib/flags.ts` and marked uncharacterised,
so the disclosure required by C1-CN-01 reads from the same place the behaviour does.

## Running it

```
npm install
npm test                     # 88 tests
npm run typecheck
npm run study:precision      # regenerates the open item 7 measurements
npm run record:invariance    # regenerates docs/invariance-confirmation.md from the code
```
