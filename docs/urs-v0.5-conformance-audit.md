# C1: conformance audit against URS v0.5

Audited 4 September 2026 against `85c7d2d` (branch `Main`), URS v0.5 as at
`docs/molarity-converter-urs-v0.5.md`. Untracked; not a build artefact.

> **Superseded in part, same day.** The developer work instruction of 4 September 2026
> ranked nine items off this audit and NADIRA's review of the running tool. Items C1
> (C1-ST-03), C2 (compelled input units; narrowed to the two INPUT units) and C3
> (C1-FX-04 both directions) below are **fixed**; C1-OUT-03 is **no longer held** behind
> open item 1; the footer's network claim is now gated on acceptance test 14; and open
> item 7 is recorded as **open**, not closed. Sections A–G record the state at the time of
> the audit and are kept as the finding, not as current status. Current status is the
> README.

## Method

1. Read every numbered requirement in §3–§14 against `src/`, `scripts/`, `reference/`.
2. Ran the full `npm run verify` chain (exit 0): typecheck, 96 tests, build,
   `check-privacy`, `check-network`, `check:reimplementation` (20,029 cases).
3. **Independently recomputed all ten §10 fixture expected values** in Python using
   exact rational arithmetic (`fractions.Fraction`) and `Decimal` half-to-even at six
   significant figures: not by running the tool. All ten agree.
4. Drove the running app in a real browser for the requirements no test covers
   (C1-ST-03, unit selection).

## Score

Counting the 53 numbered `C1-xx-nn` requirements in §3–§14 (52 priority M, one D;
C1-OUT-09, met), and the 21 acceptance tests in §16 (1–20 plus 9a).

| Requirements (53) | | Acceptance (21) | |
|---|---|---|---|
| Met | 46 | Passing | 15 |
| Blocked on an open item | 4 | Partial | 1 (test 10) |
| Defective | 1 | Satisfied by construction, not executed | 2 (15, 16) |
| Questionable: needs a decision | 2 | Outstanding | 3 (4, 14, 19) |

Blocked: C1-OUT-03 and C1-OUT-04 (open item 1, ADC format); C1-NF-01 and C1-NF-05
(open item 5, nothing is deployed). Defective: C1-ST-03. Questionable: C1-UN-01 and
C1-MW-03.

---

## A. Met, with evidence

- **§3 declarations**: C1-MW-01/02/03/04/05/06/07/08. `no-inference.test.ts` asserts
  C1-MW-02 against the *source text*, not just the type signature. "not recorded" is a
  value with no `undefined` member in the type; a blank is a separate UI state.
- **§4 units**: C1-UN-02..07. All five mass and five molar units present. No rounding
  before display; `format.ts` rounds from the exact IEEE-754 decimal expansion via
  BigInt, so `toPrecision`'s half-up is not inherited. (C1-UN-01: see C2 below.)
- **§5 conversion**: C1-CV-01/02/03. `relationApplied` is displayed.
- **§6 invariance**: C1-IV-01/02/03. The three inserted defects (clamp, floor, nudge)
  each detected *and* each shown to exceed 1 ULP; plus a control (a clamp above every
  corpus value) asserted to be **undetected**, which is what makes the other three mean
  something. Saturation at exactly 1.0 ULP is asserted directly, so `≤` stays load-bearing.
- **§7 reject**: C1-HI-01/02, messages name quantity and physical reason; tests assert
  the negative (no generic validation string). Zero concentration accepted, not refused.
- **§8 flags**: all eight, evaluated on the computed system. `directions.test.ts` proves
  flag-set equality across 20,000 cases entered from either side; a property no
  single-direction fixture could establish.
- **§9 / §11 disclosure**: C1-FC-01, C1-CN-01 rendered on the page from the same
  constants the flag rules read, so the page cannot describe a threshold the tool
  doesn't apply. `check-network.mjs` asserts the text is present in the served DOM.
- **§10 fixtures**: C1-FX-01..10 present, C1-FX-08 enforced as a required field with a
  length floor. The tie guard is inverted correctly: the suite **fails if the set
  contains no tie**, and `compare.py` fails if the reference set has none.
- **§13 output**: C1-OUT-01/02/05/06/07/08/09 met. One computation; rendering reads it.

### Independent arithmetic check (acceptance 1 and 2)

| Fixture | Exact rational value | 6 s.f. half-to-even | Fixture asserts | |
|---|---|---|---|---|
| Acceptance 1 | 6.66666666667 | 6.66667 | 6.66667 | ✓ |
| C1-FX-01 | 16.1804661323 | 16.1805 | 16.1805 | ✓ |
| C1-FX-02 (kDa arm) | 16.1804661323 | 16.1805 | 16.1805 | ✓ |
| C1-FX-05 | 837.897079426 | 837.897 | 837.897 | ✓ |
| C1-FX-06a | 15.1389539704 | 15.1390 | 15.1390 | ✓ |
| C1-FX-06b | 0.512820512821 | 0.512821 | 0.512821 | ✓ |
| C1-FX-07 | 8.32328436495 | 8.32328 | 8.32328 | ✓ |
| C1-FX-09 | 8.42732611055 | 8.42733 | 8.42733 | ✓ |
| C1-FX-10 | 19.53125 (exact tie) | 19.5312 | 19.5312 | ✓ |
| Acceptance 1, monomer | 13.3333333333 | 13.3333 | 13.3333 | ✓ |

---

## B. Held or blocked: the team's own recorded status, not new findings

| Item | Status | Owner |
|---|---|---|
| C1-OUT-03, C1-OUT-04, acceptance 4 | The ADC has no structured result format to conform to. Escalated, not extended locally; `docs/open-item-01-adc-format-finding.md` | Developer + NADIRA (open item 1) |
| C1-NF-01, C1-NF-05, acceptance 14 | UNRUN. Instrument built and verified locally; needs the deployed address | A. Modi (open item 5: URL slug) |
| 1 kDa / 1000 kDa bounds | Disclosed as uncharacterised in the register | NADIRA (open item 2) |
| 250 mg/mL / 1 pM bounds | Disclosed as uncharacterised | NADIRA (open item 3) |
| C3 boundary | Not started here | A. Modi (open item 6) |

`docs/correspondence.md` already records six further instances (proxy-for-property and
over-tightened comparisons). Nothing in section C below duplicates it.

---

## C. New findings: not in the team's own records

Ranked by severity. C1 and C2 can produce a wrong answer a user acts on; C3 cannot.

### C1. C1-ST-03: retained values stop being marked as soon as any one is touched

**Live UI defect. Confirmed in a real browser. No test covers it.**

`App.tsx:56` holds retention as a single boolean driving three badges (`:173`, `:212`,
`:244`), and every field's `onChange` calls `clearRetained()` (`:185`, `:194`, `:219`,
`:256`).

Observed sequence:

| Step | MW | Source | Mass basis | Badges shown |
|---|---|---|---|---|
| Fill and convert (mass → molar), result 6.66667 µM | 150 | certificate of analysis | assembled | none |
| Switch to molar → mass | 150 | certificate of analysis | assembled | **all three** |
| Edit **only** the MW field → 1500 | 1500 | certificate of analysis | assembled | **none** |

Source and mass basis are still the values carried across the direction switch, and are
no longer marked. C1-ST-03: *"Any value retained shall be visibly marked as retained."*
This is the silently-retained declaration the rationale to C1-ST-02/03 calls "the paste
defect in a different form", reached in three clicks.

**Second facet:** the badge also appears on fields that hold nothing. Filling only the
MW and then switching direction marks *Source of that weight* and *the stated weight is
the mass of* as "retained: confirm" while both are still unanswered (`prov=""`, no
radio checked).

**Fix:** three independent flags (or a `Set<'mw'|'prov'|'basis'>`), set only for fields
that actually hold a value, cleared per field.

**Why it is live:** no test renders `App.tsx`. `check-network.mjs` is the only thing
that drives the UI and it never switches direction, so C1-ST-03 has zero coverage
anywhere in the suite.

### C2. The mass-concentration unit is pre-selected, a silent 1000× error with no flag

`App.tsx:44-46` initialises `massUnit: 'mg/mL'`, `molarUnit: 'uM'`, `mwUnit: 'kDa'`.
A conversion completes without the user ever touching a unit control.

Provenance and mass basis are correctly compelled, `<option value="" disabled>(select a source)</option>`
and no radio pre-checked, and `computeConversion` is not called until both are answered.
The build demonstrably knows how to compel a choice; the unit controls are the exception.

**The realistic error is on the entered concentration, and nothing catches it.**
125 µg/mL is an ordinary antibody concentration. Typed as `125` under the default:

```
125 entered as mg/mL (meant µg/mL), MW 150 kDa  →  833.333 µM   flags: []
125 µg/mL as intended,              MW 150 kDa  →  0.833333 µM  flags: []
```

`massGPerL = 125`, under the 250 threshold (`flags.ts:159`), and the molar value is far
above 1 pM (`flags.ts:174`). Zero flags, 1000× wrong, squarely inside the plausible
range for both quantities.

**The MW-unit default is mostly self-catching**, and should not be conflated with it:
a g/mol figure left on kDa is enormous and C1-FL-01 fires,

```
MW 148327 left on kDa, 1 mg/mL  →  0.00674186 µM  flags: ['C1-FL-01']
```

For the MW default to go uncaught the user would have to have meant a weight of
1–1000 g/mol, which is not a protein.

C1-MW-03 says the MW unit *"shall be explicitly selected"*; C1-UN-01 says *"every numeric
input shall carry an explicitly selected unit."* A default is arguably a selection made
for the user. **This may be deliberate: it trades directly against the one-minute
target in acceptance 19: but it is not recorded as a decision anywhere.**

### C3. C1-FX-04 / acceptance 10: MW bounds tested in one direction only

**Coverage hygiene, not a behavioural risk.** C1-FL-01 reads `input.mwValue`
(`flags.ts:143`) with no direction involved, so the missing cases cannot produce a wrong
answer. It is a literal-text gap in §10 and a weak guard, and should be triaged as such.

§10 C1-FX-04 requires either side of, and exactly on, **every** §8 threshold **in both
conversion directions**.

- Mass-concentration bound: entered (04g/04h) **and** computed (04i/04j) ✓
- Molar-concentration bound: entered (04k/04l) **and** computed (04m/04n) ✓
- **MW bounds (04a–04f): `mass-to-molar` only.** `fixtures.ts:253` hardcodes the
  direction, while the helper's own docstring (`:236`) says *"run in both conversion
  directions."*

The guard meant to enforce this (`fixtures.test.ts:158`) asserts only
`covered.length >= 12` plus "at least one fixture of each direction **across the whole
set**": a set-level check standing in for a per-threshold property. That is the
`docs/correspondence.md` §I failure mode occurring inside the guard written to prevent it.

**Partial mitigation:** `directions.test.ts` proves flag-set equality across directions
over 20,000 cases: but `corpus.ts:44` generates MW in `[10³, 10⁶]` g/mol, i.e. strictly
inside the bounds, so C1-FL-01 is essentially never exercised there either.

**Fix:** give `boundary()` a direction parameter and emit each MW case twice; tighten the
guard to assert per-threshold, per-direction coverage.

---

## D. Spec drift: a URS v0.6 is owed

The code has moved ahead of v0.5. Until v0.6 exists these read as unauthorised
deviations rather than closed items:

| Drift | Code | URS v0.5 |
|---|---|---|
| Constants register size | 8 rows (adds `reimplementation-tolerance`, `rounding-mode`) | §11 lists 6 |
| Displayed precision | "Confirmed at build: open item 7 closed" | §11 "Proposed"; §17 item 7 open |
| Rounding mode | half-to-even, named and tested | §4 names no rounding mode (`docs/rounding-ties.md` owes the C1-UN-06 edit for v0.6) |
| Acceptance 3 standard | unrounded ≤ 1 ULP **and** displayed rendering | §16.3 says "to displayed precision" only |
| Test count | 96 | README says 88 |

---

## E. Satisfied by construction, not by execution

- **Acceptance 15 / 16 (reload).** Determinism is unit-tested over 100 repeats;
  `check-network.mjs` asserts `localStorage`/`sessionStorage`/`document.cookie` are all
  empty after use, and there is no URL state. But no test performs an actual reload.
- **C1-ST-01.** Only the clipboard notebook line exists (and it does carry every flag
  and declaration: asserted). There is no machine handoff to another tool yet, so the
  requirement has nothing to be violated by and nothing to be verified against.
- **C1-NF-06.** `ENGINE_VERSION` is a constant; nothing enforces that it changes when
  calculation behaviour changes.

## F. Not evidenced at all

- **Acceptance 19**: first-time user completes a conversion in under one minute without
  instruction. No record of any observed user. Needs a human; cannot be automated.
- **C1-OUT-03**: held behind open item 1 together with C1-OUT-04, but its text does not
  reference the ADC format. Whether it is genuinely blocked by that escalation is a scope
  decision, not a technical one. Separately, `ConversionResult` does not literally attach
  units to *every* quantity: `massValue`/`molarValue`/`effectiveMw` are bare numbers
  beside one shared `units` object.

---

## G. Questions

1. **Unit defaults (C2): deliberate or a defect?** Compelling the mass-concentration
   unit the way provenance and mass basis are compelled closes a silent 1000× error, at
   the cost of one more required interaction against acceptance 19's one-minute target.
   Options: compel all three units; compel only the entered-concentration unit (the
   output unit default is harmless, since the result is labelled); or record the current
   behaviour as an accepted decision in the URS.
2. **Should a v0.6 URS be drafted** capturing §D, open item 7 closed, half-to-even named
   in C1-UN-06, the two extra register rows, and acceptance 3's split standard? §0 also
   asks whether you want acceptance 9a reflowed into a clean 1–21 sequence.
3. **Acceptance 19**: is the observed-user session yours to run, or do you want a
   protocol and a recording instrument built for it?
4. **C1-OUT-03**: hold it with C1-OUT-04, or specify a minimal JSON result object now
   with the schema owned by C1 and reconciled to the bench-tools format when open item 1
   lands?
5. **Open item 5 (the URL slug)**, deciding it unblocks acceptance 14, C1-NF-01 and
   C1-NF-05 in one step; it is the single highest-leverage open item. Is it waiting on
   anything other than a decision?
