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

**Outstanding:** acceptance test 14. The instrument is built and passes locally
(`scripts/check-network.mjs` — a real browser, monitoring armed before navigation), but the
test requires the **deployed address**, and the URL slug is open item 5. Checking the build
artefact does not satisfy it; run
`node scripts/check-network.mjs https://<deployed-address>/` once there is one.

Also outstanding: acceptance test 3, the independent reimplementation in a second language.

**Built and passing:** the conversion engine, validation, flags, the fixture set, the
invariance confirmation, and the interface including the tool's own page (§9 failure
classes and §11 constants register, rendered from the same constants the flag rules read).
88 unit tests, plus a static privacy check and a real-browser runtime check.

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
| §13 — output | `src/lib/compute.ts`, `src/App.tsx` |
| C1-NF-01 — client-side, verified | `scripts/check-privacy.mjs`, `scripts/check-network.mjs` |
| C1-NF-03 — one screen | `src/App.tsx`, checked at 1440×820 on the worst case |
| C1-FC-01, C1-CN-01 — disclosure at the tool's own address | `src/App.tsx` |

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
npm run dev                  # the tool
npm run verify               # typecheck, 88 tests, build, privacy, real browser

npm run study:precision      # regenerates the open item 7 measurements
npm run record:invariance    # regenerates docs/invariance-confirmation.md from the code

node scripts/check-network.mjs https://<deployed-address>/   # acceptance test 14
```

## C1-NF-01, and why there are two checks

`check-privacy.mjs` is static: no external resource in `index.html`, no network primitive
in the source, no third-party URL in the bundle. It is necessary and **not sufficient** —
it caught one embedded URL (React's minified-error decoder) which had to be read and
judged inert, and a judgement about a string is not a proof about a request.

`check-network.mjs` is the real browser. Monitoring is armed on a blank page and the
navigation happens afterwards, so a request issued by the document itself is recorded;
attaching listeners after `goto` misses exactly the requests that matter. Requests are
recorded rather than blocked, so what it proves is that the page never asks. Chromium's own
background services are disabled so that browser telemetry cannot be mistaken for something
the tool did.

Neither is acceptance test 14 until the second is run against the deployed address.
