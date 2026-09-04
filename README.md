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
- [`docs/rounding-ties.md`](docs/rounding-ties.md) — **resolved: C1-UN-06 names
  half-to-even**, and §11 gains a row for it. The question exposed a conflict already in
  v0.5 between C1-UN-07 (compare the unrounded value) and acceptance test 3 (compare to
  displayed precision). Correctness must not depend on a formatting choice; the two checks
  are now separate. The URS edit is A. Modi's, for v0.6.
- [`docs/acceptance-03-reimplementation.md`](docs/acceptance-03-reimplementation.md) —
  acceptance test 3 passed. An independent Python implementation written from the URS agrees
  with the shipped TypeScript within the ≤ 1 ULP requirement; observed 0 ULP over 40,058
  values. It found a **specification gap, not a code defect**: C1-UN-06 does not say that
  significant-figure placement is fixed by the rounded value rather than the input's
  exponent, and an author following it exactly could write either.
- [`docs/correspondence.md`](docs/correspondence.md) — instances from this build where a
  check stood in for the property it was meant to establish, or a comparison was tightened
  past what correct code satisfies. Three of each so far. Includes the fixture-distribution
  pattern that is transferable to C3.

## Status

**Held pending open item 1:** C1-OUT-04's **serialiser**, and acceptance test 4. The result
object as an in-memory structure is fully specified by the URS and is built
(`ConversionResult`); only its serialised shape is unknown. The working rule is that nothing
may be written that assumes a serialised shape. No serialiser exists and no local extension
of the ADC's CSV has been invented to stand in for one.

**Outstanding: acceptance test 14 is UNRUN.** Not "passing locally" — unrun. The instrument
is built and verified (`scripts/check-network.mjs` — a real browser, monitoring armed before
navigation), and a local run reports `ACCEPTANCE TEST 14: UNRUN` rather than a pass. The
failure mode the test exists to catch is a host or CDN injecting a request conditionally on
request characteristics, which is invisible anywhere but the deployed address; a previous
tool in this set was caught by exactly that. The instrument being ready is the achievement.

**This puts open item 5 — the public URL slug — on the critical path.** It is no longer a
before-ship item; it is blocking a built instrument. Once decided:

```
node scripts/check-network.mjs https://<deployed-address>/
```

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
| Acceptance 3 — independent reimplementation | `reference/molarity.py`, `reference/compare.py` |

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
- **C1-FX-10.** An exact rounding tie — 1 g/L at 51.2 kDa, exactly 19.53125 µM. The suite
  requires the fixture set to **contain** one and acceptance test 3 fails if the reference
  set has none, because a comparison that never exercises the rounding mode does not verify
  it. Excluding ties instead would be the fixture-distribution failure §10 exists to prevent.
- **C1-FX-04m / C1-FX-04n.** A flagged and an unflagged result that **display identically**:
  a molar concentration one ULP below 1 pM raises C1-FL-03 and renders `1.00000 pM`; one
  exactly at 1 pM raises nothing and renders `1.00000 pM`. Both fixtures assert the flag
  state *and* the rendering, so the pair is recorded as correct rather than read as a defect,
  and the output says so wherever a threshold flag appears.

## Still open, owned elsewhere, not blocking

Four plausibility thresholds — 1 kDa, 1000 kDa, 250 mg/mL, 1 pM — are inspection-chosen and
Nadira is writing the basis for each (open items 2 and 3). Built against the values as
written. They are in `CONSTANTS_REGISTER` in `src/lib/flags.ts` and marked uncharacterised,
so the disclosure required by C1-CN-01 reads from the same place the behaviour does.

## Running it

```
npm install
npm run dev                  # the tool
npm run verify               # typecheck, 88 tests, build, privacy, real browser,
                             # and acceptance test 3 (20,028-case cross-language comparison)

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
