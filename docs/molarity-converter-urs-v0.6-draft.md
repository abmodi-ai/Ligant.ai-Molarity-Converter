# User Requirements Specification
## Molarity Converter for Biologics

| Field | Value |
|---|---|
| Tool ID | C1 |
| Product | Ligant Bench Tools |
| Version | **0.6 — DRAFT** |
| Date | 4 September 2026 |
| Owner | A. Modi |
| Status | **Draft for review. Not approved.** Prepared by Developer against the built tool. v0.5 remains the authority until this is approved |
| Supersedes | v0.5, v0.4, v0.3, v0.2, v0.1 |
| Revision basis | Conformance audit against `85c7d2d`; NADIRA's review of the running tool, 4 September 2026; the developer work instruction and the branding conformance instruction of the same day |

Everything below is either built and verified, or marked as held. Nothing in this revision is
speculative: each changed requirement names the behaviour that already exists and the check
that establishes it.

Gate items 2, 3, 7 and 8 remain established by execution. Specification-level approval is not
build acceptance.

---

## 0. Change log — v0.5 → v0.6

Eleven changes. The first five change what the tool does; the rest record decisions that were
already being acted on and were not written down.

| # | Item | Change |
|---|---|---|
| 1 | **C1-UN-01, C1-MW-03** | Both **input** units are compelled. Neither the entered concentration's unit nor the molecular weight's unit may be supplied by default. New **C1-UN-08** states the result unit's exception and why it is one |
| 2 | **C1-ST-03** | Retention marking is **per field**. Confirming one retained declaration no longer clears the marking on another, and a field holding no value is never marked |
| 3 | **C1-OUT-03** | **Separated from C1-OUT-04** and no longer held by it. A structured object is produced under a C1-owned schema, with a unit on every quantity. New **C1-OUT-10** requires the schema version to be distinct from the engine version |
| 4 | **C1-CV-03** | The relation is displayed in named quantities and standard units only. Coined units are prohibited. Unit handling is a separate statement |
| 5 | **C1-NF-01** | A no-transmission claim may not be displayed at an address where acceptance 14 has not passed. Where it has not, the tool states what is and is not established |
| 6 | **C1-NF-03** | The standard is stated: **1440 × 900**, raised from 1440 × 820. Inspection-chosen, and the basis is recorded |
| 7 | **C1-UN-06** | Names **half-to-even**. The rounding mode was behaviour-determining and unspecified; two implementations could satisfy v0.5 and disagree |
| 8 | **§10 C1-FX-04** | Every §8 threshold, on **each side and exactly on it**, in **both conversion directions** — 24 cases. The requirement was already written this way; the fixture set did not meet it |
| 9 | **§11** | Two rows added — the reimplementation tolerance and the rounding mode. A note records what is deliberately **not** a row, and why |
| 10 | **Acceptance 3** | Split into a correctness gate on the unrounded value and a separate display check. v0.5 compared "to displayed precision", which makes correctness depend on a formatting choice |
| 11 | **§15, new** | **Suite identity.** Shared tokens, masthead, footer and mark, and the evidenced-claim rule for the shared footer |
| 12 ✚ | **C1-FL-09, C1-ST-05** | Retention becomes a **flag with a reason code** and a **recorded field in the structured object**. The derivation stops saying "as declared" of a carried value |
| 13 ✚ | **C1-FL-10** | Zero raises its own flag. It is the absence of solute, not an implausibly low concentration |
| 14 ✚ | **C1-NF-03** | The 1440 × 900 standard entered at round 1 is **withdrawn**. It was a viewport height, not a display, and no laptop of that size has it. The standard is UNSET and owed |
| 15 | **C1-FL-01** | **Open, not resolved.** The 1000 kDa bound misfires on IgM–PE at 1210 kDa. Awaiting NADIRA's ruling — see §18 open item 2 |

**On the acceptance numbering.** Still not reflowed, and still offered. v0.5 raised this and it
was not answered; this revision adds tests 21–26 at the end rather than interleaving them, so
the question is now cheaper to answer either way. **Open item 14.**

**What did not change.** The conversion, the invariance tolerance and its operator, the flag
set, the failure classes, the plausibility bounds, and every behaviour ratified against the
running tool on 4 September 2026 — the reference case, half-to-even in the shipped path, the
visible no-flags state, the withholding of a result until every declaration is present, and
the scoping of the flag-versus-display sentence to threshold flags.

---

## 1. Purpose

**Determination:** the molar concentration corresponding to a stated mass concentration, or the
reverse, for a protein whose molecular weight the user declares along with its source.

The tool performs one conversion. It does not plan dilutions, prepare stocks, identify
proteins, or supply molecular weights.

**The failure being replaced:** nM ↔ µg/mL conversion requires a molecular weight, and in
practice that weight is guessed, carried over from a different construct, or taken from a
sequence when the protein is glycosylated. A spreadsheet returns a clean-looking number in
every one of those cases and records none of them. This tool requires the weight, requires its
source, and puts both in the derivation.

---

## 2. Users

| Group | Need |
|---|---|
| Bench scientist (primary) | Get the number right, fast, without opening a spreadsheet |
| Lab head / method reader | See which molecular weight was used, where it came from, and what it described |

Assumed competence: the user knows what their protein is. The tool does not identify proteins
or look up molecular weights.

---

## 3. Declarations

Three things the user must state. Each exists because it is invisible in the resulting number
and changes it materially.

### 3.1 Molecular weight

| ID | Requirement | Pri |
|---|---|---|
| C1-MW-01 | Molecular weight shall be a required input. No conversion shall complete without it. | M |
| C1-MW-02 | The system shall not infer, default, pre-fill, or suggest a molecular weight under any circumstance, including for common biologics. | M |
| C1-MW-03 ✎ | The unit of molecular weight shall be **explicitly selected by the user** (g/mol or kDa). It shall not be supplied by default, and it shall never be inferred from magnitude. | M |

**✎ On C1-MW-03.** v0.5 said "explicitly selected" and the build pre-filled `kDa`. That is a
reading the wording permitted, and the audit of 4 September 2026 found it: the tool compelled a
declaration of *where the digits came from* and then supplied the exponent itself. **"150" is
not a molecular weight; "150 kDa" is.** The requirement now says which of the two readings it
means. See C1-UN-01 for the same correction on the entered concentration, which is where the
consequence was severe.

### 3.2 Provenance — where the weight came from

| ID | Requirement | Pri |
|---|---|---|
| C1-MW-04 | The source of the molecular weight shall be a required field: certificate of analysis, vendor datasheet, calculated from sequence, mass spectrometry, or not recorded. | M |
| C1-MW-05 | "Not recorded" shall be an accepted answer, shall appear on the output, and shall be distinguishable in the structured object from a field left blank. | M |
| C1-MW-06 | Where the source is "calculated from sequence", the output shall state that sequence-derived mass excludes glycosylation and other post-translational modification. | M |

### 3.3 Mass basis — what the weight is the mass *of*

| ID | Requirement | Pri |
|---|---|---|
| C1-MW-07 | The user shall declare what the stated molecular weight is the mass of. The declaration shall appear on the output. The options shall be presented as: | M |

> — **the assembled molecule** as it exists in solution
> — **a monomer or single chain**
> — **a conjugate, including its label or payload** — select this whenever a label or payload is included in the stated mass, whatever the format of the underlying protein
> — **not recorded**

| ID | Requirement | Pri |
|---|---|---|
| C1-MW-08 | "Not recorded" shall be an accepted answer to C1-MW-07, on the same terms as C1-MW-05. | M |

*Rationale.* Provenance and mass basis are different questions. A certificate of analysis is a
legitimate source and may quote a monomer mass, a conjugate mass, or an assembled mass;
provenance does not disambiguate which.

Both error modes are large and both are invisible in the number:

| Confusion | Factor |
|---|---|
| Monomer or single chain quoted where assembled mass was needed | 2× or 4× for an IgG, bispecific, scFv-Fc or VHH construct |
| Conjugate mass used for the underlying protein | ~2.6× for a PE-conjugated IgG — R-phycoerythrin is 240 kDa against 150 kDa for the antibody. Allophycocyanin is ~104 kDa. Small-molecule payloads are a few percent by comparison; protein fluorophores dominate in flow cytometry |

These are one question asked twice — *what is the stated mass the mass of?* — and are therefore
one field, not two. Folding them keeps C1-NF-03 and the one-minute target intact.

**On the precedence rule in the conjugate option.** The options are single-select and are not
strictly exclusive in the abstract: a PE-conjugated scFv is both single-chain and conjugated.
The field's own question resolves this. For that reagent the answer is *conjugate*, and that
answer is complete — the molarity computed from the conjugate mass is molarity of scFv–PE, and
knowing that the protein inside is a single chain changes neither what the number means nor how
a reader should use it. Conjugate is therefore the correct selection, not merely the safer one.
The precedence is stated in the option label because without it two people in the same lab will
answer differently for the same reagent, which is worse than the ambiguity it resolves.

A consequence worth recording: a single-chain conjugate raises C1-FL-08 and not C1-FL-06. That
is correct. The monomer warning exists to say the number does not refer to the assembled
molecule; the conjugate flag already says what the number does refer to.

**The option labels shall be shown in full.** The precedence clause is the working part of the
conjugate option, and a control that truncates its options to its own width hides exactly that
clause.

---

## 4. Units and precision

| ID | Requirement | Pri |
|---|---|---|
| C1-UN-01 ✎ | Every numeric input shall carry an explicitly selected unit. No bare numeric fields. **The unit of an entered quantity shall not be supplied by default**; it shall be selected by the user, on the same terms as the declarations in §3. | M |
| C1-UN-02 | Input and output units shall be independently selected. Neither shall be implied by the other. | M |
| C1-UN-03 | Mass concentration units shall include at minimum: mg/mL, µg/mL, ng/mL, g/L, mg/L. | M |
| C1-UN-04 | Molar concentration units shall include at minimum: M, mM, µM, nM, pM. | M |
| C1-UN-05 | Unit conversion shall be exact within floating-point representation. No rounding shall be applied before final display. | M |
| C1-UN-06 ✎ | Results shall be displayed to **6 significant figures** ↯, **rounded half-to-even**. The displayed precision **and the rounding mode** shall be stated on the output. | M |
| C1-UN-07 | The unrounded value shall be present in the structured object, and is the value against which an independent reimplementation is compared. | M |
| C1-UN-08 ✚ | The unit in which the **result** is reported may carry a default. It shall be rendered beside the value, and the output shall state that it is the only unit with one. | M |

**✎ On C1-UN-01 and ✚ C1-UN-08 — why the two are asymmetric.**

v0.5's "explicitly selected" was satisfied, in the build, by a select element that arrived
pre-filled. The consequence is not cosmetic:

```
125 entered as mg/mL (meant µg/mL), MW 150 kDa  →  833.333 µM   flags: []
125 µg/mL as intended,              MW 150 kDa  →  0.833333 µM  flags: []
```

125 µg/mL is an ordinary antibody concentration. Under an `mg/mL` default it is 1000× wrong
with the mass concentration below the 250 mg/mL bound and the molar concentration far above the
1 pM bound, so **§8 raises nothing and there is nothing on screen to catch it.** That is §9
failure class 4, arising from a tool default rather than from the user. A default that is
usually right is more dangerous than one that is usually wrong, because it stops being read.

The **result** unit is a different case and is deliberately excluded. A wrong output unit yields
a correct quantity displayed in an unexpected unit, with that unit rendered beside the number:
visible, and wrong about nothing. Two compelled selections, not three, and the asymmetry is
stated here so it reads as a decision rather than an oversight.

**↯ C1-UN-06's figure remains proposed — open item 7.** Six significant figures makes
acceptance test 2 evaluable and exposes a factor-of-two mass-basis error unambiguously, while
staying below the point where floating-point noise becomes visible; C1-IV-03 first fails at
thirteen figures, so six has seven orders of headroom
(`docs/open-item-07-displayed-precision.md`). **The measurement is not the decision.** The
document has not reached NADIRA and the item stays open; §11 says so.

**✎ On naming half-to-even.** v0.5 specified a number of significant figures and no rounding
mode, which leaves a behaviour-determining choice unspecified: 1 g/L at 51.2 kDa is exactly
19.53125 µM, and the displayed value is decided by the tie rule alone — 19.5312 under
half-to-even, 19.5313 under half-up. Two implementations could satisfy v0.5 and disagree on an
ordinary reagent. Half-to-even is the IEEE 754 default and the default in Python, R and Julia,
so an independent reimplementation agrees **without being told** — which is what preserves the
independence acceptance test 3 depends on. It is also unbiased under repeated rounding.

Ties cannot be designed out of the input space: the same result expressed in M is
`1.9531250000000000406e-5`, which is not a tie and rounds up under either rule. Only the output
unit decides. The rule therefore had to be named rather than avoided.

---

## 5. Conversion

| ID | Requirement | Pri |
|---|---|---|
| C1-CV-01 | Convert mass concentration to molar concentration and molar to mass. | M |
| C1-CV-02 | The conversion direction shall be selected before data entry. Direction is not a mode; it does not change which inputs are required. | M |
| C1-CV-03 ✎ | The relation applied shall be displayed with the result, **in named quantities and standard units only. No coined unit shall appear in it.** The handling of units shall be stated **separately** from the relation, and the effective divisor shall be given with its unit. | M |

**✎ On C1-CV-03.** The build displayed
`mass concentration ÷ molecular weight (mg/mL ÷ effective kDa → µM)`. "Effective kDa" is not a
unit; it was a name for the folded divisor. C1-CV-03 exists so a reader can check the
arithmetic against the displayed relation, and a coined term cannot be evaluated — the
requirement was met in form and defeated in substance. The relation is now the physical
statement; the units are their own line, and the divisor appears as a value in `mg/mL per µM`,
which is a ratio of two standard units and can be checked.

---

## 6. Invariance

| ID | Requirement | Pri |
|---|---|---|
| C1-IV-01 | Converting a mass concentration to molar and converting the result back, using the same molecular weight, shall return the input value to within **≤ 1 ULP**. This shall be expressed as an executable test. | M |
| C1-IV-02 | The invariance test shall be confirmed capable of failing, by inserting a clamp, a floor and a nudge into the conversion path and demonstrating that each is detected. Each inserted defect shall be demonstrated to exceed 1 ULP, so that the tolerance is shown not to have disabled the test. The confirmation shall be recorded. | M |
| C1-IV-03 | The same molecular weight entered as g/mol and as kDa shall produce identical results **to displayed precision**. | M |

**On the comparison operator.** The bound is saturated: 9.87% of correct conversions land at
exactly 1.0 ULP over 500,008 cases. A strict `<` therefore fails on correct code roughly one
time in ten — the same failure mode that made bit-exactness unusable, reintroduced at the
operator. The test is written `≤`, and the saturation is asserted directly so the operator
cannot quietly stop being load-bearing.

**On C1-IV-03's standard.** Entering the same weight as a kDa decimal and as a g/mol integer
produces molarities differing by 1 ULP in roughly 0.9% of realistic cases. Agreement is
therefore specified to displayed precision, not bit-exactly. C1-FX-02 tests against this
standard and no other.

**On the control in C1-IV-02.** The build added one the URS did not ask for: a clamp set above
every value in the corpus, which **must be reported as undetected**. Without it, "the test
catches three inserted defects" is a claim about three defects rather than about the test.
Ratified as built and now required: the confirmation shall include a defect that bites nowhere
in the corpus and shall record it as undetected.

---

## 7. Validation — reject

Conditions are stated against the computed system, not against entry fields, so that the same
physical impossibility is caught wherever it arises.

| ID | Condition | Message shall name |
|---|---|---|
| C1-HI-01 | `MW ≤ 0` | The molecular weight, and that mass per mole cannot be zero or negative |
| C1-HI-02 | `concentration < 0` | Which concentration, and that a concentration cannot be negative |

**Zero concentration is legal.** It converts to zero and creates no division. It shall not be
rejected defensively.

Rejection messages shall name the quantity and the physical reason. **Generic validation errors
do not satisfy this section.**

---

## 8. Validation — compute and flag

**Conditions are stated against the computed system, not against entry fields.** Every
conversion yields both a mass concentration and a molar concentration — one entered, one
computed. Each condition below is evaluated against that quantity in whichever role it
occupies, so that the same implausibility is caught in both conversion directions.

Flags never block the calculation. Each appears in both the human-readable and structured
output with a machine-readable reason code.

| ID | Condition | Evaluated on | Flag states |
|---|---|---|---|
| C1-FL-01 | `MW < 1 kDa` or `MW > 1000 kDa` | The declared molecular weight | Outside the usual range for a biologic; confirm the units and the value |
| C1-FL-02 | `mass concentration > 250 mg/mL` ↯ | The system's mass concentration, entered or computed | Above the range of typical high-concentration biologic formulations; confirm the units |
| C1-FL-03 | `molar concentration < 1 pM` | The system's molar concentration, entered or computed | Below the range typical of biologic working solutions |
| C1-FL-04 | MW source is "calculated from sequence" | The provenance declaration | Sequence-derived mass excludes glycosylation and other post-translational modification |
| C1-FL-05 | MW source is "not recorded" | The provenance declaration | Molecular weight provenance not recorded; the result cannot be traced to a source and should not be carried into a method record without one |
| C1-FL-06 | Mass basis is monomer or single chain | The mass-basis declaration | Molar concentration computed is of monomer, not of assembled molecule |
| C1-FL-07 | Mass basis is "not recorded" | The mass-basis declaration | Mass basis not recorded; whether this concentration refers to the assembled molecule, a monomer, or a conjugate cannot be determined from the record |
| C1-FL-08 | Mass basis is conjugate | The mass-basis declaration | Molecular weight includes label or payload; the molar concentration computed is of the conjugate, not of the underlying protein. The tool does not correct for drug-to-antibody ratio or degree of labelling |
| C1-FL-09 ✚ | A declaration was carried across a change of conversion direction and not re-confirmed | The retention state | Which declarations were carried, that they were not re-confirmed, and that the result is computed from them |
| C1-FL-10 ✚ | `mass concentration = 0` **and** `molar concentration = 0` | The system's two quantities | The concentration is zero: no solute is present. This is not an implausibly low concentration, and the conversion is exact |

**↯ C1-FL-02 threshold remains inspection-chosen — open item 3.**

**✚ On C1-FL-09.** Retention was a property of the FORM until v0.2.0 and the badge was the
whole of it. That satisfied C1-ST-03 as written and left the record wrong in a way the screen
was not: the derivation claimed "as declared" of a value the user had never re-affirmed in
this direction, and the structured object carried no trace at all. It is a flag rather than a
withholding because the value is present and valid — only its re-affirmation is missing, and
C1-MW-01 already covers absence. It is a THIRD kind of flag, neither threshold nor
declaration, because it reads what the user did not do; that is what keeps the C1-OUT-11
caveat from appearing beside it.

**✚ On C1-FL-10.** §7 makes zero legal and §8 did not exclude it, so both requirements were
satisfied and their interaction was the defect: zero was flagged "below the range typical of
biologic working solutions", which is true of zero and says nothing about it. **Both
quantities are tested, not one.** They are zero together for every legal input, but a mass
concentration small enough to underflow the division leaves a genuine trace amount reported
as a zero molarity — and that is implausibly low rather than empty, so C1-FL-03 is still the
right flag there.

**On the numbering.** The reason-code series is now `C1-FL-01` to `C1-FL-10`. The v0.6 draft
of 4 September deliberately did NOT use C1-FL-09 for the threshold caveat, on the grounds that
a ninth identifier would imply a ninth flag that did not exist. It exists now, and the caveat
kept its C1-OUT-11 number.

Boundary behaviour is specified by the operators above and tested by acceptance test 10, in
both conversion directions.

**A result with an assembled mass basis, a recorded provenance other than sequence-derived, and
values inside every bound raises no flags.** This is the expected case, is tested by acceptance
9a, and shall be **visible as a state** — the output says that no flags were raised rather than
showing an absence. Ratified against the running tool, 4 September 2026.

**Threshold flags are evaluated on the unrounded value.** A molar concentration one ULP below
1 pM raises C1-FL-03 and renders `1.00000 pM`; one exactly at 1 pM raises nothing and renders
`1.00000 pM`. Both are correct — §8 evaluates the computed system, C1-UN-06 governs the
rendering — but a user who cannot reconcile the flag with the number loses confidence in both.

This is stated on the output where it arises — **C1-OUT-11**, in §13. The requirement is
numbered in the output series deliberately: `C1-FL-nn` is the machine-readable reason-code
series that appears in the structured object, and a ninth identifier in it would imply a ninth
flag that does not exist.

---

## 9. Failure classes this tool cannot detect

Required on the tool's own page, visible to the user, not confined to documentation.

The tool guarantees that the arithmetic is correct and that the molecular weight, its source
and its mass basis are recorded. It cannot detect:

1. A molecular weight that is correct for a **different construct**
2. A molecular weight that was correct for a **prior lot or formulation**
3. A **monomer mass** quoted where the assembled mass was needed, or the reverse — C1-MW-07 compels the declaration but cannot verify it
4. A **unit-magnitude transcription error** where the entered weight still falls inside the plausible range. C1-FL-01 catches a 1000× error that lands outside 1–1000 kDa; it cannot catch one that lands inside, and it cannot distinguish a genuinely unusual protein from a typo
5. Any error in the **input concentration** itself
6. A **conjugate mass declared as unconjugated**, or the reverse — C1-MW-07 compels the declaration but cannot verify it, as for item 3

| ID | Requirement | Pri |
|---|---|---|
| C1-FC-01 | The above list shall be displayed at the tool's own address. | M |

**Note added at v0.6.** Class 4 is the failure the pre-filled input units made reachable
without any user error at all. C1-UN-01 and C1-MW-03 close the tool's own contribution to it;
the class itself remains undetectable and stays on the list.

---

## 10. Fixtures and verification

Reference cases shall not share the properties that made v0.1's cases unrepresentative — round
molecular weight, round concentration, exact arithmetic. **Nor shall the set share the property
that something is always wrong with the input:** C1-FX-09 is a negative control, and without it
an implementation that raises flags spuriously would pass every other fixture.

| ID | Fixture | Standard it is evaluated against |
|---|---|---|
| C1-FX-01 | A non-round molecular weight (e.g. 148,327 g/mol) | Hand calculation, to displayed precision |
| C1-FX-02 | The same weight entered as g/mol and as kDa | **C1-IV-03 — displayed precision, not bit-exact** |
| C1-FX-03 | A round-trip conversion | **C1-IV-01 — ≤ 1 ULP** |
| C1-FX-04 ✎ | Values immediately either side of **every** threshold in §8, **and exactly on it**, in **both conversion directions** — every threshold × every side × both directions | The operators as written in §8 |
| C1-FX-05 | A "not recorded" provenance case | C1-FL-05 raised and present on the output |
| C1-FX-06 | One case per mass-basis value: monomer, conjugate, and "not recorded" | C1-FL-06, C1-FL-08 and C1-FL-07 respectively |
| C1-FX-07 | A case in which rounding the **unit-normalised intermediate** changes the sixth significant figure of the result | The unrounded intermediate is used |
| C1-FX-09 | **Negative control.** A plausible molecular weight, certificate-of-analysis provenance, assembled mass basis, and a working concentration well inside every bound | **No flags raised** |
| C1-FX-10 ✚ | An **exact rounding tie** — 1 g/L at 51.2 kDa, exactly 19.53125 µM | **C1-UN-06 — six significant figures, half-to-even** |

| ID | Requirement | Pri |
|---|---|---|
| C1-FX-08 | Every constructed fixture shall state the assumption under which it was constructed, so that the fixture set is auditable. | M |
| C1-FX-11 ✚ | The properties the fixture set as a whole must have shall be asserted **as executable checks**, not established by audit. For each, the check shall fail on a set that lacks the property. | M |

**✎ On C1-FX-04.** The requirement is unchanged in intent; the fixture set did not meet it. The
molecular-weight bounds were exercised in `mass-to-molar` only, and the guard asserted a count
over the whole set plus "at least one fixture of each direction", which is a set-level property
standing in for a per-threshold one. Tightening the guard exposed two further gaps it had
hidden: no below-the-bound case for the mass threshold and no above-the-bound case for the
molar one, in either direction. **Four thresholds × three sides × two directions = 24 cases**,
and the guard now asserts each combination by name.

No wrong answer was ever possible — C1-FL-01 reads the declared weight and no direction enters
the comparison — which is why this is recorded as a coverage failure and not as a defect. It is
kept in the change log because the *guard* was the thing that failed, and that is the pattern
`docs/correspondence.md` exists to collect.

**✚ On C1-FX-10.** Added by the build without being specified, and ratified. It is what makes
§11's rounding-mode row testable: without a case that lands exactly halfway, the rounding mode
is a claim nothing exercises.

**✚ On C1-FX-11.** §10 told the author to audit the set for shared properties. An audit is
performed once, by whoever is looking, and passes silently thereafter — and two of the set's
failures (C1-FX-09's absence, and an earlier guard that asserted *no* fixture may land on a tie)
are exactly what an audit has to notice. Written as tests they cannot be passed by omission.
The transferable form: for each property the set must have, write the check that fails on a set
that lacks it. Carried to C3.

**On C1-FX-07.** The only intermediate in this tool is unit normalisation. The fixture is a case
where rounding that normalised value changes the displayed answer. If no such case can be
constructed at six significant figures, that finding is recorded and the fixture dropped, rather
than kept in weakened form.

---

## 11. Constants register

| ID | Requirement | Pri |
|---|---|---|
| C1-CN-01 | Every threshold at which the tool changes behaviour shall be listed with its value and its basis. Thresholds chosen by inspection shall be stated as such. This list shall appear at the tool's own address, not only in a manuscript. | M |

Current register:

| Threshold | Value | Basis | Status |
|---|---|---|---|
| Round-trip tolerance | **1 ULP**, compared with `≤` | Analytic: each of the two operations contributes at most ½ ULP of the result. Confirmed empirically — 500,000 random pairs, MW 10³–10⁶ g/mol, concentrations spanning 11 decades, both directions; worst observed error exactly 1.0 ULP, zero cases exceeding | **Derived** |
| Lower MW plausibility bound | 1 kDa | Inspection | Uncharacterised — open item 2 |
| Upper MW plausibility bound | 1000 kDa | Inspection | Uncharacterised — open item 2 |
| Upper mass concentration bound | 250 mg/mL | Inspection | Uncharacterised — open item 3 |
| Lower molar concentration bound | 1 pM | Inspection | Uncharacterised — open item 3 |
| Displayed precision | 6 significant figures | Inspection | **Proposed — open item 7 remains OPEN.** Measured as evaluable with seven orders of headroom; the measurement is with the developer, the decision is NADIRA's and has not been made |
| Independent reimplementation agreement ✚ | **≤ 1 ULP**, compared with `≤` | Requirement, not observation. Bit-identical is what was measured; making it the requirement would generalise one measured pair into a claim about all future reimplementations, and a language with wider intermediates or FMA contraction can differ in the last bit on the same two operations. Observed: 0 ULP over 40,078 values | **Derived** |
| Rounding mode at displayed precision ✚ | half-to-even | IEEE 754 default, and the default in Python, R and Julia, so an independent reimplementation agrees without being told. Unbiased under repeated rounding. Not a threshold, but behaviour-determining | **Derived** |

**✚ Two rows added.** Neither is a threshold. The register exists so that **no
behaviour-determining choice is silent**, and both determine behaviour: one decides the
displayed digit of an ordinary reagent, the other decides whether acceptance test 3 passes. The
register's scope is therefore stated here as behaviour-determining choices, not thresholds
alone, which is what it had already become.

**A consequence, stated rather than left implicit:** a defect uniformly smaller than 1 ULP is
invisible to acceptance test 3 *and* to acceptance test 5, because the round trip cancels a
uniform scaling and the reimplementation comparison admits it. The observed 0 ULP makes that a
weak concern here. It is not nothing, and it should not have to be rediscovered.

### 11.1 What is deliberately not in the register

Recorded because "nobody looked" is not an acceptable answer to an omission from this list.

| Choice | Why it is not a row |
|---|---|
| The acceptance-14 claim gate (C1-NF-01) | It determines what the **footer** says, and the footer states which claim it is making and that acceptance 14 is unrun. The disclosure and the behaviour are the same sentence; a register row would restate on one part of the page what another part already says in full. It also governs nothing the engine computes |
| C1-NF-03's 1440 × 900 standard | A standard the **verification** is held to, not a threshold at which the tool changes behaviour. It is recorded where it is applied, with its basis |

Both are revisited if either ever gates something computed.

---

## 12. State and handoff

| ID | Requirement | Pri |
|---|---|---|
| C1-ST-01 | Any value handed to another tool shall carry its molecular weight, the molecular weight's declared source, its mass-basis declaration, and every flag raised on it. A value shall not be transferable stripped of its flags. | M |
| C1-ST-02 | No input shall persist across a page reload unless its persistence is visible on screen. Recoverability is not sufficient; the user must be able to see that a value was carried over. | M |
| C1-ST-03 ✎ | Changing the conversion direction shall not silently carry a molecular weight, its source, or its mass-basis declaration. Any value retained shall be visibly marked as retained, **and shall remain marked until that value is itself confirmed**. Marking shall be **per field**: confirming one retained value shall not clear the marking on another. A field holding **no** value shall not be marked. | M |
| C1-ST-05 ✚ | A result computed from a retained declaration shall raise **C1-FL-09**, and the **structured object shall record which** declarations were retained. The derivation shall not describe a retained value as declared. | M |
| C1-ST-04 | Same inputs shall always produce the same outputs. No hidden state, no time dependence. | M |

**✎ On C1-ST-03.** The build held retention as one flag for the whole form. It satisfied the
requirement at the moment of the switch and broke one keystroke later: editing the molecular
weight cleared the marking from the source and the mass basis, both of which were still
carrying their pre-switch values and were now unmarked. Reachable in three clicks. It also
marked fields holding nothing, which teaches the user that the marking means nothing.

The requirement was always per field; v0.5 did not say so because the reading that fails did
not occur to anyone. It says so now.

**Why it survived to a conformance audit:** no test rendered the interface, and the one browser
check that drove the form never changed direction. Requirements that live only in the
component had no execution behind them. See C1-VE-01.

*Rationale for C1-ST-02 and C1-ST-03:* a silently retained molecular weight is a stale value
that biases the result and passes every other gate in this document. It is the paste defect in
a different form.

*Downstream note.* The titration tool is next in the build order and its users work in PE and
APC routinely. A concentration handed forward without its mass basis is a concentration that
tool cannot interpret. C1-ST-01 is what prevents that.

---

## 13. Output

| ID | Requirement | Pri |
|---|---|---|
| C1-OUT-01 | The result shall be accompanied by the relation applied, the assumptions made, a full echo of every input with its unit, and the engine version. | M |
| C1-OUT-02 | The molecular weight, its source, and its mass-basis declaration shall appear in the derivation, not only in the input echo. | M |
| C1-OUT-03 ✎ | A structured, machine-readable result object shall be produced for every calculation, with **its own unit attached to every quantity**. **This requirement is independent of C1-OUT-04 and shall not be held by it.** | M |
| C1-OUT-04 | The structured object shall use the same format as the shipped Antigen Density Calculator. **HELD — open item 1.** | M |
| C1-OUT-05 | The structured and human-readable outputs shall be generated from one computation and cannot disagree. | M |
| C1-OUT-06 | The scope statement — research use, not qualified for GxP decision-making — shall be displayed. | M |
| C1-OUT-07 | Displayed precision shall be stated on the output. | M |
| C1-OUT-08 | The output shall state that the molar concentration is of molecules, not of binding sites. A bivalent IgG at 1 µM presents 2 µM of paratope. | M |
| C1-OUT-09 | The result shall be copyable in a form suitable for pasting into a lab notebook. | D |
| C1-OUT-10 ✚ | The structured object shall carry a **schema version distinct from the engine version**, and shall name its schema. | M |
| C1-OUT-11 ✚ | Where a **threshold** flag is raised, the output shall state that threshold flags are evaluated on the unrounded value and that a flagged and an unflagged result can therefore display identically. It shall **not** state this where only declaration flags are raised, there being no rounding between a declaration and its condition. | M |

**✎ On separating C1-OUT-03 from C1-OUT-04.** The Antigen Density Calculator has no structured
result format — `docs/open-item-01-adc-format-finding.md`. The two requirements were held
together, which meant a finding about **another tool** stopped this one emitting anything
machine-readable at all. C1-OUT-03's text never referenced the ADC; only C1-OUT-04 does.

C1 therefore emits a structured object under **its own schema**, to be reconciled with a
bench-tools format when open item 1 lands. Nothing has been invented to stand in for the ADC's
format and C1-OUT-04 is not satisfied by this.

**✚ On C1-OUT-10.** The schema and the engine move for different reasons: C1-NF-06 ties the
engine version to calculation behaviour, and a change to the object's shape is not a change to
the numbers. Versioning them together would make one of them lie, and the reconciliation
required by open item 1 has to be visible rather than silent.

**On "a unit attached to every quantity".** The requirement is easy to satisfy in appearance:
four bare numbers beside one shared `units` object reads as satisfying it and does not — a
consumer holding one quantity cannot tell what it is in. Every quantity is a value and a unit
together.

**✚ On C1-OUT-11.** Built before it was specified, and ratified by NADIRA against the running
tool as better than what v0.5 asked for. Written down so it cannot be removed later as an
unrequested extra. Its scoping is the working part: said on threshold flags, silent on
declaration flags, because there is no rounding between a declaration and its condition and the
caveat would be noise there.

**On reproduction.** The object alone shall be sufficient to reproduce the reported result
(**C1-DAT-03, platform URS**). This is established by execution — a reproduction from the
serialised object over the whole fixture set — and not by inspection.

---

## 14. Non-functional

| ID | Requirement | Pri |
|---|---|---|
| C1-NF-01 ✎ | Entirely client-side. No user-entered data leaves the browser. Verified per acceptance test 14. **No claim that data is not transmitted shall be displayed at an address at which acceptance test 14 has not passed.** Where it has not, the tool shall state what has been verified and what has not. | M |
| C1-NF-02 | No account, login, or registration. | M |
| C1-NF-03 ✎ | Inputs and result shall fit one screen without scrolling on a standard laptop display. **The display is UNDEFINED and is owed — open item 15.** Until it is set there is no pass or fail; the verification reports the measurement. | M |
| C1-NF-04 | Result shall be perceptibly immediate. No progress indicator. | M |
| C1-NF-05 | Reachable and usable at its own address, independently of any other tool. | M |
| C1-NF-06 | Engine version stated on output, changing whenever calculation behaviour changes. | M |

**✎ On C1-NF-01.** The tool asserted "no network request of any kind" while acceptance test 14
was unrun. That is an environment claim about the **served** page, and the two previous failures
of this claim across the tool set were both hosts inserting a request into a response that
every build-level check called clean. An accurate weaker claim is worth more than an unverified
stronger one.

The claim is now gated, and the gate is a deployment step rather than a build step: deploy, run
the network check against the deployed address, and only then may the claim be displayed. The
check **fails** if the claim is enabled on a local run, so it cannot ship on evidence that
cannot support it. See C1-ID-06 for the same rule bound to the shared component.

**✎ On C1-NF-03, and the withdrawal of the 1440 × 900 standard.**

The figure was 1440 × 820, then 1440 × 900 at round 1. **Both were viewport heights the
verification chose, and neither describes a laptop.** A 1440 × 900 display does not give the
page 900 pixels: browser chrome takes about a hundred and the page gets 797. The check was
passing against a screen nobody owns — an undeclared constant governing a pass/fail test,
which is the class §11 exists for, and the §I proxy pattern applied to a requirement rather
than to a fixture.

Measured at the worst case, five flags: **995px** of converter against

| Window | Viewport | Over by |
|---|---|---|
| 1440 × 900 | 797 | 198 |
| 1280 × 800 | 697 | 298 |
| 1366 × 768 | 665 | 330 |

Content is capped at 1120px wide, so the three differ in available height only. What falls
below the fold is not decoration — the copy buttons, the scope statement and the tail of the
flag list — and a user seeing the answer without the warnings attached to it inverts
C1-OUT-05's guarantee that the two travel together.

**Not compacted in the meantime.** A layout that fits only because the type got smaller fails
again on the next flag, and C1-FL-09 and C1-FL-10 have just demonstrated it. The verification
reports **STANDARD NOT SET**, the same shape as acceptance test 14 reporting UNRUN. Open item
15: smallest supported window AND zoom level, owner A. Modi, then a register row with its
basis and a gate again.

### 14.1 Verification

| ID | Requirement | Pri |
|---|---|---|
| C1-VE-01 ✚ | Every requirement that is satisfied only by the interface shall have an executable check that exercises the interface. A requirement whose only evidence is that someone looked at the page is not verified. | M |

**✚ Why.** C1-ST-03 reached a conformance audit defective because nothing rendered the
interface and the one browser check that drove the form never changed direction. The tool had
**96 passing tests and zero coverage of that requirement**. This is the general form of that
finding.

---

## 15. Suite identity

**New at v0.6.** No requirement in v0.5 covered visual identity, which is why C1 could reach a
conformance audit at 46 of 53 requirements met while sharing **no design token** with the
shipped tool: a second palette of cool blue-greys against the suite's warm ones, navy where the
accent should have been, its own radii and type scale, and a lettered favicon that was not the
Ligant mark. The audit was right; the URS did not ask.

| ID | Requirement | Pri |
|---|---|---|
| C1-ID-01 | The tool shall consume the **shared token set**. No colour, radius or type value shall be defined locally. Semantic names the suite has no equivalent of may be introduced, and each shall be defined **in terms of** a shared token. | M |
| C1-ID-02 | The tool shall render the **shared masthead**: the Ligant mark and wordmark, the tool name, and the suite label, in the suite's treatment. | M |
| C1-ID-03 | The **suite mark** shall be the favicon, unlettered and not recoloured per tool. | M |
| C1-ID-04 | The tool shall render the **shared footer**. | M |
| C1-ID-05 | The document title shall follow the suite pattern: `Ligant · <tool name>`. | M |
| C1-ID-06 | The shared footer's **transmission claim shall be a required, evidenced parameter with no default.** A tool shall not be able to render the footer without declaring whether the claim has been verified at the address it is served from. | M |
| C1-ID-07 | The shared token set and the shared components shall be **one artefact consumed by every tool**, not one implementation per tool. | M |
| C1-ID-08 | No web font shall be fetched. Faces shall be named first in the stack and fall back to the system, per C1-NF-01. | M |

**On C1-ID-06 — the conflict this resolves.** The reference tool's footer states "no data is
transmitted" unconditionally. A shared component that hard-codes that sentence is a mechanism
for reintroducing exactly the failure acceptance test 14 exists to catch, on every tool that
adopts it at once. The claim is therefore not a string in the component; it is a required
parameter with two variants and no default, so a tool with no evidence cannot inherit the
sentence belonging to one that has it. **C1 does not opt out of the shared footer; the shared
footer stopped being able to make an unearned claim.** The reference tool's footer is still
ungated — open item 12.

**On C1-ID-01's guard.** Enforcement is on the **source**, not on the rendered page. A
rendered-page check sees a token being wrong; it cannot see a value that bypasses the tokens
altogether, and bypassing is how the divergence happened — one plausible hex value at a time,
none of them a mistake on its own.

**These belong in the platform URS.** C1-ID-01 to C1-ID-08 bind every tool in the catalog and
are restated here only until the platform URS carries them. Extracting the shared artefact is
open item 11; the catalog's own note applies, that extracting shared components later is the
main avoidable cost in the programme.

---

## 16. Out of scope

| Item | Where it belongs |
|---|---|
| **All dilution planning, of any length**, including single-step C₁V₁ = C₂V₂ | C3, Dilution Planner |
| Reconstitution — volume of solution to add to a vial of stated mass | C3, as a candidate first step |
| Weighing out solute for a target concentration | Nowhere, unless an observed user is found. Open item 4 |
| Concentration determination from A280 or extinction coefficient | Not currently in the catalog |
| Molecular weight lookup, protein identification, sequence handling | Deliberately excluded — see C1-MW-02 |
| Molarity of small molecules and salts | Not excluded by the mathematics; the tool is named and framed for biologics |
| Binding-site or paratope molarity | Titration tool. Flagged here at origin per C1-OUT-08 |
| DAR or degree-of-labelling correction | Not in the catalog. The conjugate declaration records that a payload is included; it does not correct for it. Stated in C1-FL-08 |

**Boundary with C3:** C1 converts. C3 plans dilutions of any length. There is no single/serial
distinction and no threshold at which work transfers between them.

**Carried to the C3 URS.** Two items that must not be lost:

1. Reconstitution — a vial states 1 mg, the target is 1 mg/mL, therefore add 1 mL — is the real
   biologics case and is the step immediately preceding a dilution series.
2. v0.1's C1-M3-02 said "volume of solvent" while C1-M3-04 assumed no volume displacement.
   Under that assumption the computed quantity is the volume of **solution**, not of solvent.
   Whichever tool inherits the requirement must fix the term.

A third, added at v0.6: **C1-FX-11's pattern** — make the fixture-distribution rule executable
rather than an audit.

---

## 17. Acceptance

**Correctness**

1. A reference case verifies: IgG at 150 kDa, 1 mg/mL, returns **6.66667 µM** at six significant figures.
2. A non-round molecular weight case verifies against hand calculation to displayed precision.
3. ✎ An independent reimplementation in a second language agrees with the shipped implementation on the full reference set. **Two separate standards:** a **correctness gate** on the **unrounded** value at **≤ 1 ULP** (C1-UN-07), and a **display check** that every value renders identically at six significant figures (C1-UN-06). Code review does not satisfy this test.
4. Every calculation produces a structured object validating against the Antigen Density Calculator's format. **HELD — open item 1.**

**Invariance**

5. Round-trip conversion returns the input to within **≤ 1 ULP**.
6. The same weight entered as g/mol and as kDa produces identical results **to displayed precision**.
7. The invariance test is confirmed capable of failing under an inserted clamp, floor and nudge, each demonstrated to exceed 1 ULP; and a defect that bites nowhere in the corpus is reported as **undetected**.

**Validation behaviour**

8. Every §7 condition is rejected with a message naming the quantity and the physical reason.
9. Every §8 condition computes a result and raises a flag with a machine-readable reason code.
9a. **Negative control.** The clean case of C1-FX-09 produces a result with **no flags raised**, in both conversion directions, and the absence is shown as a state rather than as an empty space.
10. ✎ Boundary fixtures behave as specified for **every threshold, on each side and exactly on it, in both conversion directions** — every combination, asserted by name.

**Declaration**

11. No conversion completes without an explicit molecular weight.
12. "Not recorded" provenance is accepted, appears on the output distinguishably from blank, and raises C1-FL-05.
13. Each mass-basis value behaves as specified: monomer raises C1-FL-06, conjugate raises C1-FL-08, "not recorded" raises C1-FL-07, assembled raises none, and each flag appears on the output.

**Environment and determinism**

14. C1-NF-01 is verified in a real browser against the deployed address, with network monitoring initialised before page load, and re-verified after any deployment or CDN configuration change. Verification against the build artefact does not satisfy this test. **UNRUN — open item 5.**
15. Reloading and re-entering the same inputs reproduces the result exactly.
16. Nothing persists across reload except where persistence is visible on screen.

**Disclosure**

17. The tool's own page lists every threshold with its value and basis, and states which are uncharacterised.
18. The tool's own page enumerates the failure classes it cannot detect.

**Usability**

19. A first-time user completes a conversion in under one minute without instruction. **To be measured against the form as revised by C1-UN-01 — open item 13.**
20. Inputs and result fit one screen without scrolling, at 1440 × 900.

**Added at v0.6**

21. ✚ No conversion completes without the unit of the entered concentration **and** the unit of the molecular weight having been explicitly selected. The result unit's default is stated on the page.
22. ✚ A declaration carried across a change of direction is marked as retained; confirming one leaves the others marked; and a field holding no value is never marked. Exercised in a real browser.
23. ✚ Every calculation produces a structured object that validates, carries a unit on every quantity and the unrounded values, and **from which the reported result can be reproduced** — through serialisation, over the whole fixture set.
24. ✚ The displayed relation contains no coined unit, and the effective divisor is given in standard units.
25. ✚ The tool consumes the shared token set, renders the shared masthead and footer, uses the suite mark as its favicon, and titles itself to the suite pattern. Asserted against the source **and** the rendered page.
26. ✚ The footer states the tool's transmission-claim evidence state, and the verified claim cannot be rendered where acceptance test 14 has not passed at that address.
27. ✚ A result computed from a declaration carried across a change of direction raises C1-FL-09 on screen and in the structured object; the object records **which** declarations were carried; and the derivation describes them as retained rather than as declared. Exercised in a real browser and through the exported JSON.
28. ✚ Zero concentration raises C1-FL-10 and **not** C1-FL-03, in both conversion directions, and a concentration that is merely very small still raises C1-FL-03.

---

## 18. Open items

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | Confirm the ADC output format can express a single conversion with provenance and mass-basis fields. If not, escalate — do not extend locally | Developer + NADIRA | **Open.** Answered as *no format exists*; the escalation is unresolved. C1-OUT-04 and acceptance 4 held. C1-OUT-03 is no longer held with it |
| 2 ✎ | Characterise or disclose the 1 kDa / 1000 kDa bounds | NADIRA | **Open, and escalated. The upper bound is WRONG, not merely uncharacterised.** IgM–PE at 1210 kDa is an ordinary flow reagent and is told it is outside the usual range for a biologic. Disclosure covers a threshold that is unmeasured; it does not cover one that misfires on a case the tool was extended to handle. **Moves before ship.** Two candidate resolutions in the note below |
| 3 | Characterise or disclose the 250 mg/mL and 1 pM bounds, or remove | NADIRA | Open. Disclosed as uncharacterised |
| 4 | Establish whether anyone weighs out protein before that scope is built anywhere | A. Modi | Open |
| 5 | Decide C1's public URL slug | A. Modi | **Open, and the highest-leverage item.** It alone unblocks acceptance 14, C1-NF-01's verified claim, and C1-NF-05 |
| 6 | Confirm the C3 boundary covers all dilution including single-step, and carries the items in §16 | A. Modi | Open |
| 7 | Decide displayed precision. 6 significant figures proposed | A. Modi + NADIRA | **Open.** Measured with seven orders of headroom; `docs/open-item-07-displayed-precision.md` is owed to NADIRA and a register line is not a review |
| 8 | ~~Round-trip tolerance~~ | ~~NADIRA~~ | **Closed** at v0.3 |
| 9 | ~~Conjugation: declaration or undetectable failure~~ | ~~NADIRA~~ | **Closed** at v0.4 |
| 10 | ~~Mass-basis exclusivity~~ | ~~NADIRA~~ | **Closed** at v0.5 |
| 11 ✚ | Extract the shared token set and the shared components into one artefact both tools depend on, and move C1-ID-01..08 to the platform URS | Developer + A. Modi | They live in C1's tree today, which is the divergence waiting to happen again |
| 12 ✚ | The reference tool's footer asserts no transmission unconditionally. Adopt the evidenced-claim component there | Developer | Same finding as C1-NF-01, pointing the other way |
| 13 ✚ | Run the acceptance 19 observed-user session against the form as revised by C1-UN-01 | A. Modi | Never measured. Two added selections change the first-time path |
| 14 ✚ | Reflow the acceptance numbering into a clean sequence, or keep 9a | A. Modi | Raised at v0.5, unanswered. Cheaper now than later |
| 15 ✚ | Define the supported display for C1-NF-03 and acceptance 20 — smallest supported **window** and **zoom level** | A. Modi | The requirement has governed a pass/fail test with no constant behind it since v0.1. Two figures have been used and both were viewport heights the verification invented. Nothing to build against until this is set |

No open item blocks the build. Items 5 and 7 block claims the tool would otherwise be entitled
to make. **Item 2 now blocks ship**, and item 15 blocks any further layout work.

**On item 2 — the mechanism matters more than the number.** Adding the conjugate mass basis at
v0.4 made masses above 1000 kDa ordinary. The constant and the declaration were changed *in
the same document* without either being checked against the other, and that is the
transferable finding: the heterogeneity tool will add declarations to a tool that already has
bounds.

Two resolutions are on the table and the choice is NADIRA's.

*Raise the figure.* Replaces one inspection-chosen constant with another, and the headroom is
thin whatever is picked — unconjugated IgM is already around 970 kDa, so a bound that clears
IgM–PE sits close to useless for detecting a genuine unit error.

*Condition the bound on the mass-basis declaration.* A conjugate legitimately carries a higher
ceiling than an unconjugated protein. This makes the coupling explicit in the code rather than
something to remember, and gives the register row a basis better than inspection. If it is
chosen, **C1-FL-01 stops being a single constant**: the register row changes shape, and
C1-FX-04 needs boundary fixtures per mass-basis branch.

Nothing is implemented either way. The register row discloses the misfire in the meantime,
which is strictly more than it said before and strictly less than a fix.

---

## Annex — Gate status

| # | Gate item | Where addressed | Established by | State |
|---|---|---|---|---|
| 1 | One determination, stated | §1 | Specification | Met |
| 2 | Independent reimplementation agrees | Acceptance 3 | Execution | Met — 0 ULP over 40,078 values |
| 3 | Invariance test, confirmed capable of failing | C1-IV-01/02, acceptance 5–7 | Execution | Met, with a control |
| 4 | Every constant derived, characterised or disclosed | C1-CN-01, §11, §11.1, acceptance 17 | Specification + execution | Met as disclosure; items 2, 3, 7 open |
| 5 | Failure classes enumerated, including undetectable ones | §9, acceptance 18 | Specification | Met |
| 6 | Invisible variables are compelled declarations | C1-MW-04, C1-MW-07, C1-UN-01, C1-MW-03, C1-FL-05/06/07/08 | Specification | Met — **and widened at v0.6**: a unit is an invisible variable too |
| 7 | Fixtures audited for shared properties | §10, C1-FX-09, C1-FX-11 | Execution | Met, and the audit is now executable |
| 8 | Environment claims verified against the deployed artefact | Acceptance 14, C1-NF-01 | Execution | **Not met — unrun.** The claim is gated in the meantime |
| 9 | Flags propagate to display, interpretation and export | C1-ST-01, C1-OUT-03, acceptance 9, 9a, 12, 13, 23 | Execution | Met |
| 10 ✚ | Interface requirements have execution behind them | C1-VE-01, acceptance 21, 22, 25, 26 | Execution | Met |
| 11 ✚ | The tool is visibly part of the suite | §15, acceptance 25 | Execution | Met |

Items 2, 3, 7, 8, 10 and 11 are established by execution, not specification.

---

## Drafting note

Prepared by Developer, 4 September 2026, against the tool as built on branch
`claude/c1-conformance-and-branding`. Every requirement marked ✎ or ✚ describes behaviour that
exists and is checked; none is aspirational.

**Not approved.** v0.5 remains the authority. The changes needing a decision rather than a
ratification are: C1-UN-06's figure (open item 7), C1-NF-03's raised standard, and whether
C1-ID-01 to C1-ID-08 should be here at all or only in the platform URS.
