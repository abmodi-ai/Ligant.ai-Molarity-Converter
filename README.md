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
| **7** — displayed precision | **Measured, not closed.** C1-IV-03 first fails at thirteen figures, so six has seven orders of headroom, and acceptance test 2 is unblocked. The decision is NADIRA's and the document has not reached her, so **open item 7 stays open** and the constants register says so. | [`docs/open-item-07-displayed-precision.md`](docs/open-item-07-displayed-precision.md) |

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
- [`docs/correspondence.md`](docs/correspondence.md) — instances where a check stood in for
  the property it was meant to establish, or a comparison was tightened past what correct
  code satisfies. **Seven in the first family, three in the second.** Instances 1–4 were
  found by accident; 5–7 by a clause-by-clause audit against the URS, and are marked as such
  because a schedulable method is weaker evidence than a stumble. Includes three patterns
  transferable to C3: make the fixture-distribution rule executable, assert coverage per
  instance rather than per set, and give interface-only requirements a check that drives the
  interface.

## Status

**Held pending open item 1:** C1-OUT-04's **conformance to the bench-tools format**, and
acceptance test 4. **C1-OUT-03 is no longer held with it** — its text does not reference the
ADC, and a finding about another tool was stopping this one emitting anything
machine-readable. C1 now emits a structured object under **its own schema**
(`src/lib/serialise.ts`, `schema.version` separate from the engine version), to be reconciled
when open item 1 lands. No ADC shape has been invented to stand in for one. The result
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
155 unit tests, plus a static privacy check and two real-browser checks — one for the form's
own requirements and the suite's chrome (`check:ui`) and one for the network claim
(`check:network`).

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
| C1-OUT-03 — structured result, units on every quantity | `src/lib/serialise.ts`, `src/lib/serialise.test.ts` |
| C1-ST-03 — retention marked per field | `src/lib/retention.ts`, `scripts/check-ui.mjs` |
| C1-FL-09 — retention in the result, derivation and record | `src/lib/flags.ts`, `src/lib/retention.test.ts` |
| C1-FL-10 — zero is empty, not implausibly low | `src/lib/flags.ts`, `reference/molarity.py` |
| C1-UN-01, C1-MW-03 — both input units compelled | `src/App.tsx`, `scripts/check-ui.mjs` |
| Suite identity — tokens, masthead, footer, mark | `src/tokens.css`, `src/Brand.tsx`, `src/branding.test.ts` |
| C1-NF-01 — client-side, verified as far as it can be | `scripts/check-privacy.mjs`, `scripts/check-network.mjs` |
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
npm run verify               # typecheck, 155 tests, build, privacy, two real browsers,
                             # and acceptance test 3 (20,039-case cross-language comparison)

npm run check:ui             # the form's own requirements in a real browser:
                             # C1-ST-03 retention, the two compelled input units,
                             # C1-CV-03's relation, and what the footer is allowed to claim

npm run study:precision      # regenerates the open item 7 measurements
npm run record:invariance    # regenerates docs/invariance-confirmation.md from the code

node scripts/check-network.mjs https://<deployed-address>/   # acceptance test 14
```

## Retention is not only a badge

C1-ST-03 asked for a retained value to be visibly marked, and until v0.2.0 the badge was the
whole of it. That satisfied the requirement and left the record wrong in a way the screen was
not: the tool computed on carried values while the badge showed, the derivation said
*"Molecular weight taken as 1210 kDa, **as declared**"* of a value the user had never
re-affirmed in this direction, and the structured object carried no trace of retention at
all. Arithmetically correct, provenance misrepresented — the paste defect wearing the tool's
own wording, and worse in the export than on screen.

Retention now reaches the computation. Not to change the arithmetic, which it does not touch,
but because C1-ST-01 requires what qualifies a value to travel with it:

- **C1-FL-09**, a flag with its own reason code and its own `kind`. Not withholding — the
  value is present and valid, only its re-affirmation is missing — and not a declaration
  flag either, because it reads what the user did *not* do. Its own kind is what keeps the
  threshold caveat from appearing beside it.
- **The derivation** says *retained from the previous conversion direction, not
  re-confirmed*, per field, for exactly the fields that were carried.
- **`declarations.retained`** in the structured object, all three keys always present. The
  flag says *that* something was retained; this says *which*, because one flag cannot and a
  consumer deciding whether to trust a molecular weight needs to know it was the weight. An
  absent key would read as `false` to a careless consumer and as "this tool does not record
  retention" to a careful one, and those are different facts.

The badge reads **"Retained — not re-confirmed"**: the previous wording implied an action the
interface does not offer.

## Zero is the absence of solute

`0 mg/mL` returned `0.00000 µM` flagged *"below the range typical of biologic working
solutions"*. §7 makes zero legal and §8 does not exclude it, so both requirements were met and
their interaction was the defect. The flag was true of zero and said nothing about it, which
is the inert-check pattern in miniature.

Zero now raises **C1-FL-10** and not C1-FL-03. Both quantities are tested rather than one: a
mass concentration small enough to underflow the division leaves a real trace amount reported
as a zero molarity, and that *is* implausibly low, so C1-FL-03 is still right there.

## Suite identity

C1 shared **no design token** with the shipped Antigen Density Calculator until 4 September
2026 — a second palette of cool blue-greys against the suite's warm ones, navy where the
accent should have been, its own radii and type scale, and a lettered favicon that was not
the Ligant mark. Not drift: the two were built from different starting points.

`src/tokens.css` is the suite's `:root` block, read from the deployed reference tool and
copied whole. `src/Brand.tsx` is the mark, the masthead and the footer. **Both belong in a
package both tools depend on**; they sit here only because that package does not exist yet,
and the rule until it does is that they are edited in the reference tool and copied here.

C1's semantic layer in `styles.css` — `--flag`, `--reject`, `--retained` — is defined
entirely in terms of brand tokens. `src/branding.test.ts` fails if a hex literal appears in
C1's stylesheet at all, because the divergence happened one plausible hex value at a time
and a rendered-page check cannot see a value that bypasses the tokens.

**The footer's transmission claim is a required parameter of the shared component**, with no
default. The reference tool's footer states "no data is transmitted" unconditionally; that
is an environment claim only acceptance test 14 can establish, and a shared component that
hard-codes it is a mechanism for reintroducing the beacon failure. C1 does not opt out of
the shared footer — the shared footer stopped being able to make an unearned claim.

**C1-NF-03 has no standard, and the check no longer invents one.** It was 1440×820, then
1440×900 — and both were *viewport* heights this repository chose. A 1440×900 laptop does not
have a 900px viewport: browser chrome takes about a hundred pixels and the page gets 797. The
check was passing against a screen nobody owns, which is the proxy pattern in
`docs/correspondence.md` §I applied to a requirement rather than a fixture.

`check-network.mjs` now reports the worst case at three candidate windows and declares
**STANDARD NOT SET**, the same shape as acceptance test 14 reporting UNRUN. Current worst
case, five flags: **995px**, against 797 / 697 / 665px of viewport. The content width is
capped at 1120px, so the three candidates differ in available height only.

Owner: A. Modi — smallest supported window *and* zoom level, then it becomes a register row
with its basis and a gate again. Not compacted in the meantime: a layout that fits only
because the type got smaller fails again on the next flag.

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

**And until it is, the footer does not make the claim.** `NETWORK_CLAIM_VERIFIED` in
`src/lib/site.ts` is `false`, so the page states what has actually been established — a
static check and a real browser against the build — and says in terms that the deployed
address is unverified. The flag is a deployment step, not a build step: deploy, run
`check-network.mjs` against the deployed address, and only then set it. `check-network.mjs`
enforces the pairing in the other direction and **fails** if the flag is set on a local run,
so the strong claim cannot ship on evidence that cannot support it. An accurate weaker claim
is worth more than an unverified stronger one; that is the whole finding of the beacon
incident recorded in `docs/correspondence.md`.
