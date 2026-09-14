# User Requirements Specification
## Molarity Converter for Biologics

| Field | Value |
|---|---|
| Tool ID | C1 |
| Product | Ligant Bench Tools |
| Version | **0.5** |
| Date | 3 September 2026 |
| Owner | A. Modi |
| Status | **Approved at specification level** (NADIRA, CSO, 3 September 2026). Released for build |
| Supersedes | v0.4, v0.3, v0.2, v0.1 |
| Revision basis | Review feedback, NADIRA — fourth round, closing open item 10 |

Gate items 2, 3, 7 and 8 are established by execution and remain for review against the built tool. Specification-level approval is not build acceptance.

---

## 0. Change log — v0.4 → v0.5

| Item | Change |
|---|---|
| Open item 10 — mass-basis exclusivity | **Closed.** Resolved by precedence in the option label rather than by multi-select or a fourth value. C1-MW-07 restated |
| C1-FX-09 | Added — negative control. A clean case required to raise no flags |
| Acceptance 9a | Added, exercising C1-FX-09 |

**On the acceptance numbering.** The new test is numbered 9a rather than reflowing 10–20, because C1-NF-01 references acceptance 14, C1-IV-01 references 5 and 7, and §11 references 17. Renumbering would break four cross-references for no gain. Flagged as a small judgment; say if you would rather have a clean sequence and I will reflow every reference with it.

---

## 1. Purpose

**Determination:** the molar concentration corresponding to a stated mass concentration, or the reverse, for a protein whose molecular weight the user declares along with its source.

The tool performs one conversion. It does not plan dilutions, prepare stocks, identify proteins, or supply molecular weights.

**The failure being replaced:** nM ↔ µg/mL conversion requires a molecular weight, and in practice that weight is guessed, carried over from a different construct, or taken from a sequence when the protein is glycosylated. A spreadsheet returns a clean-looking number in every one of those cases and records none of them. This tool requires the weight, requires its source, and puts both in the derivation.

---

## 2. Users

| Group | Need |
|---|---|
| Bench scientist (primary) | Get the number right, fast, without opening a spreadsheet |
| Lab head / method reader | See which molecular weight was used, where it came from, and what it described |

Assumed competence: the user knows what their protein is. The tool does not identify proteins or look up molecular weights.

---

## 3. Declarations

Three things the user must state. Each exists because it is invisible in the resulting number and changes it materially.

### 3.1 Molecular weight

| ID | Requirement | Pri |
|---|---|---|
| C1-MW-01 | Molecular weight shall be a required input. No conversion shall complete without it. | M |
| C1-MW-02 | The system shall not infer, default, pre-fill, or suggest a molecular weight under any circumstance, including for common biologics. | M |
| C1-MW-03 | The unit of molecular weight shall be explicitly selected (g/mol or kDa). It shall never be inferred from magnitude. | M |

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

*Rationale.* Provenance and mass basis are different questions. A certificate of analysis is a legitimate source and may quote a monomer mass, a conjugate mass, or an assembled mass; provenance does not disambiguate which.

Both error modes are large and both are invisible in the number:

| Confusion | Factor |
|---|---|
| Monomer or single chain quoted where assembled mass was needed | 2× or 4× for an IgG, bispecific, scFv-Fc or VHH construct |
| Conjugate mass used for the underlying protein | ~2.6× for a PE-conjugated IgG — R-phycoerythrin is 240 kDa against 150 kDa for the antibody. Allophycocyanin is ~104 kDa. Small-molecule payloads are a few percent by comparison; protein fluorophores dominate in flow cytometry |

These are one question asked twice — *what is the stated mass the mass of?* — and are therefore one field, not two. Folding them keeps C1-NF-03 and the one-minute target intact.

**On the precedence rule in the conjugate option.** The options are single-select and are not strictly exclusive in the abstract: a PE-conjugated scFv is both single-chain and conjugated. The field's own question resolves this. For that reagent the answer is *conjugate*, and that answer is complete — the molarity computed from the conjugate mass is molarity of scFv–PE, and knowing that the protein inside is a single chain changes neither what the number means nor how a reader should use it. Conjugate is therefore the correct selection, not merely the safer one. The precedence is stated in the option label because without it two people in the same lab will answer differently for the same reagent, which is worse than the ambiguity it resolves.

A consequence worth recording: a single-chain conjugate raises C1-FL-08 and not C1-FL-06. That is correct. The monomer warning exists to say the number does not refer to the assembled molecule; the conjugate flag already says what the number does refer to.

---

## 4. Units and precision

| ID | Requirement | Pri |
|---|---|---|
| C1-UN-01 | Every numeric input shall carry an explicitly selected unit. No bare numeric fields. | M |
| C1-UN-02 | Input and output units shall be independently selected. Neither shall be implied by the other. | M |
| C1-UN-03 | Mass concentration units shall include at minimum: mg/mL, µg/mL, ng/mL, g/L, mg/L. | M |
| C1-UN-04 | Molar concentration units shall include at minimum: M, mM, µM, nM, pM. | M |
| C1-UN-05 | Unit conversion shall be exact within floating-point representation. No rounding shall be applied before final display. | M |
| C1-UN-06 | Results shall be displayed to **6 significant figures** ↯. The displayed precision shall be stated on the output. | M |
| C1-UN-07 | The unrounded value shall be present in the structured object, and is the value against which an independent reimplementation is compared. | M |

**↯ C1-UN-06 remains proposed — open item 7.** Six significant figures makes acceptance test 2 evaluable and exposes a factor-of-two mass-basis error unambiguously, while staying below the point where floating-point noise becomes visible. Registered as inspection-chosen in §11.

---

## 5. Conversion

| ID | Requirement | Pri |
|---|---|---|
| C1-CV-01 | Convert mass concentration to molar concentration and molar to mass. | M |
| C1-CV-02 | The conversion direction shall be selected before data entry. Direction is not a mode; it does not change which inputs are required. | M |
| C1-CV-03 | The relation applied shall be displayed with the result. | M |

---

## 6. Invariance

| ID | Requirement | Pri |
|---|---|---|
| C1-IV-01 | Converting a mass concentration to molar and converting the result back, using the same molecular weight, shall return the input value to within **≤ 1 ULP**. This shall be expressed as an executable test. | M |
| C1-IV-02 | The invariance test shall be confirmed capable of failing, by inserting a clamp, a floor and a nudge into the conversion path and demonstrating that each is detected. Each inserted defect shall be demonstrated to exceed 1 ULP, so that the tolerance is shown not to have disabled the test. The confirmation shall be recorded. | M |
| C1-IV-03 | The same molecular weight entered as g/mol and as kDa shall produce identical results **to displayed precision**. | M |

**On the comparison operator.** The bound is saturated: the worst observed round-trip error is exactly 1.0 ULP (§11). A strict `<` therefore fails on correct code — the same failure mode that made bit-exactness unusable, reintroduced at the operator. The test is written `≤`.

**On C1-IV-03's standard.** Entering the same weight as a kDa decimal and as a g/mol integer produces molarities differing by 1 ULP in roughly 0.9% of realistic cases. Agreement is therefore specified to displayed precision, not bit-exactly. C1-FX-02 tests against this standard and no other.

---

## 7. Validation — reject

Conditions are stated against the computed system, not against entry fields, so that the same physical impossibility is caught wherever it arises.

| ID | Condition | Message shall name |
|---|---|---|
| C1-HI-01 | `MW ≤ 0` | The molecular weight, and that mass per mole cannot be zero or negative |
| C1-HI-02 | `concentration < 0` | Which concentration, and that a concentration cannot be negative |

**Zero concentration is legal.** It converts to zero and creates no division. It shall not be rejected defensively.

Rejection messages shall name the quantity and the physical reason. **Generic validation errors do not satisfy this section.**

---

## 8. Validation — compute and flag

**Conditions are stated against the computed system, not against entry fields.** Every conversion yields both a mass concentration and a molar concentration — one entered, one computed. Each condition below is evaluated against that quantity in whichever role it occupies, so that the same implausibility is caught in both conversion directions.

Flags never block the calculation. Each appears in both the human-readable and structured output with a machine-readable reason code.

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

**↯ C1-FL-02 threshold remains inspection-chosen — open item 3.** 250 mg/mL sits above the highest routinely formulated antibody concentrations while remaining physically real. Deleting the requirement costs nothing elsewhere.

Boundary behaviour is specified by the operators above and tested by acceptance test 10, in both conversion directions.

**A result with an assembled mass basis, a recorded provenance other than sequence-derived, and values inside every bound raises no flags.** This is the expected case and is tested by acceptance 9a.

---

## 9. Failure classes this tool cannot detect

Required on the tool's own page, visible to the user, not confined to documentation.

The tool guarantees that the arithmetic is correct and that the molecular weight, its source and its mass basis are recorded. It cannot detect:

1. A molecular weight that is correct for a **different construct**
2. A molecular weight that was correct for a **prior lot or formulation**
3. A **monomer mass** quoted where the assembled mass was needed, or the reverse — C1-MW-07 compels the declaration but cannot verify it
4. A **unit-magnitude transcription error** where the entered weight still falls inside the plausible range. C1-FL-01 catches a 1000× error that lands outside 1–1000 kDa; it cannot catch one that lands inside, and it cannot distinguish a genuinely unusual protein from a typo
5. Any error in the **input concentration** itself
6. A **conjugate mass declared as unconjugated**, or the reverse — C1-MW-07 compels the declaration but cannot verify it, as for item 3

| ID | Requirement | Pri |
|---|---|---|
| C1-FC-01 | The above list shall be displayed at the tool's own address. | M |

---

## 10. Fixtures and verification

Reference cases shall not share the properties that made v0.1's cases unrepresentative — round molecular weight, round concentration, exact arithmetic. **Nor shall the set share the property that something is always wrong with the input:** C1-FX-09 is a negative control, and without it an implementation that raises flags spuriously would pass every other fixture.

| ID | Fixture | Standard it is evaluated against |
|---|---|---|
| C1-FX-01 | A non-round molecular weight (e.g. 148,327 g/mol) | Hand calculation, to displayed precision |
| C1-FX-02 | The same weight entered as g/mol and as kDa | **C1-IV-03 — displayed precision, not bit-exact** |
| C1-FX-03 | A round-trip conversion | **C1-IV-01 — ≤ 1 ULP** |
| C1-FX-04 | Values immediately either side of every threshold in §8, and exactly on it, in **both conversion directions** | The operators as written in §8 |
| C1-FX-05 | A "not recorded" provenance case | C1-FL-05 raised and present on the output |
| C1-FX-06 | One case per mass-basis value: monomer, conjugate, and "not recorded" | C1-FL-06, C1-FL-08 and C1-FL-07 respectively |
| C1-FX-07 | A case in which rounding the **unit-normalised intermediate** changes the sixth significant figure of the result | The unrounded intermediate is used |
| C1-FX-09 | **Negative control.** A plausible molecular weight, certificate-of-analysis provenance, assembled mass basis, and a working concentration well inside every bound | **No flags raised** |

| ID | Requirement | Pri |
|---|---|---|
| C1-FX-08 | Every constructed fixture shall state the assumption under which it was constructed, so that the fixture set is auditable. | M |

**On C1-FX-07.** The only intermediate in this tool is unit normalisation — conversion of the entered concentration to a common base before division or multiplication by molecular weight. The fixture is a case where rounding that normalised value, rather than carrying it unrounded, changes the displayed answer. If no such case can be constructed at six significant figures, that finding is recorded and the fixture dropped, rather than kept in weakened form.

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
| Displayed precision | 6 significant figures | Inspection | Proposed — open item 7 |

The round-trip tolerance is the first constant in the tool set that is characterised rather than disclosed. That distinction is the point of the register: five rows say what was chosen, one says what was measured.

---

## 12. State and handoff

| ID | Requirement | Pri |
|---|---|---|
| C1-ST-01 | Any value handed to another tool shall carry its molecular weight, the molecular weight's declared source, its mass-basis declaration, and every flag raised on it. A value shall not be transferable stripped of its flags. | M |
| C1-ST-02 | No input shall persist across a page reload unless its persistence is visible on screen. Recoverability is not sufficient; the user must be able to see that a value was carried over. | M |
| C1-ST-03 | Changing the conversion direction shall not silently carry a molecular weight, its source, or its mass-basis declaration. Any value retained shall be visibly marked as retained. | M |
| C1-ST-04 | Same inputs shall always produce the same outputs. No hidden state, no time dependence. | M |

*Rationale for C1-ST-02 and C1-ST-03:* a silently retained molecular weight is a stale value that biases the result and passes every other gate in this document. It is the paste defect in a different form.

*Downstream note.* The titration tool is next in the build order and its users work in PE and APC routinely. A concentration handed forward without its mass basis is a concentration that tool cannot interpret. C1-ST-01 is what prevents that, and the mass-basis field is what gives it something to carry.

---

## 13. Output

| ID | Requirement | Pri |
|---|---|---|
| C1-OUT-01 | The result shall be accompanied by the relation applied, the assumptions made, a full echo of every input with its unit, and the engine version. | M |
| C1-OUT-02 | The molecular weight, its source, and its mass-basis declaration shall appear in the derivation, not only in the input echo. | M |
| C1-OUT-03 | A structured, machine-readable result object shall be produced for every calculation, with units attached to every quantity. | M |
| C1-OUT-04 | The structured object shall use the same format as the shipped Antigen Density Calculator. | M |
| C1-OUT-05 | The structured and human-readable outputs shall be generated from one computation and cannot disagree. | M |
| C1-OUT-06 | The scope statement — research use, not qualified for GxP decision-making — shall be displayed. | M |
| C1-OUT-07 | Displayed precision shall be stated on the output. | M |
| C1-OUT-08 | The output shall state that the molar concentration is of molecules, not of binding sites. A bivalent IgG at 1 µM presents 2 µM of paratope. | M |
| C1-OUT-09 | The result shall be copyable in a form suitable for pasting into a lab notebook. | D |

**On C1-OUT-04:** the Antigen Density Calculator's output format is the specification, as shipped. If it cannot express a result from this tool — including the provenance and mass-basis fields — **stop and escalate rather than extending it locally.** That finding is the reason this tool was scheduled first, and quietly patching the format destroys the information. Ownership of the escalation is split per open item 1.

---

## 14. Non-functional

| ID | Requirement | Pri |
|---|---|---|
| C1-NF-01 | Entirely client-side. No user-entered data leaves the browser. Verified per acceptance test 14. | M |
| C1-NF-02 | No account, login, or registration. | M |
| C1-NF-03 | Inputs and result shall fit one screen without scrolling on a standard laptop display. | M |
| C1-NF-04 | Result shall be perceptibly immediate. No progress indicator. | M |
| C1-NF-05 | Reachable and usable at its own address, independently of any other tool. | M |
| C1-NF-06 | Engine version stated on output, changing whenever calculation behaviour changes. | M |

---

## 15. Out of scope

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

**Boundary with C3:** C1 converts. C3 plans dilutions of any length. There is no single/serial distinction and no threshold at which work transfers between them.

**Carried to the C3 URS.** Two items that must not be lost:

1. Reconstitution — a vial states 1 mg, the target is 1 mg/mL, therefore add 1 mL — is the real biologics case and is the step immediately preceding a dilution series.
2. v0.1's C1-M3-02 said "volume of solvent" while C1-M3-04 assumed no volume displacement. Under that assumption the computed quantity is the volume of **solution**, not of solvent. Whichever tool inherits the requirement must fix the term.

---

## 16. Acceptance

**Correctness**

1. A reference case verifies: IgG at 150 kDa, 1 mg/mL, returns **6.66667 µM** at six significant figures.
2. A non-round molecular weight case verifies against hand calculation to displayed precision.
3. An independent reimplementation in a second language agrees with the shipped implementation on the full reference set, to displayed precision. Code review does not satisfy this test.
4. Every calculation produces a structured object validating against the Antigen Density Calculator's format.

**Invariance**

5. Round-trip conversion returns the input to within **≤ 1 ULP**.
6. The same weight entered as g/mol and as kDa produces identical results **to displayed precision**.
7. The invariance test is confirmed capable of failing under an inserted clamp, floor and nudge, and each inserted defect is demonstrated to exceed 1 ULP.

**Validation behaviour**

8. Every §7 condition is rejected with a message naming the quantity and the physical reason.
9. Every §8 condition computes a result and raises a flag with a machine-readable reason code.
9a. **Negative control.** The clean case of C1-FX-09 produces a result with **no flags raised**, in both conversion directions.
10. Boundary fixtures either side of each threshold, and exactly on it, behave as specified — **in both conversion directions**.

**Declaration**

11. No conversion completes without an explicit molecular weight.
12. "Not recorded" provenance is accepted, appears on the output distinguishably from blank, and raises C1-FL-05.
13. Each mass-basis value behaves as specified: monomer raises C1-FL-06, conjugate raises C1-FL-08, "not recorded" raises C1-FL-07, assembled raises none, and each flag appears on the output.

**Environment and determinism**

14. C1-NF-01 is verified in a real browser against the deployed address, with network monitoring initialised before page load, and re-verified after any deployment or CDN configuration change. Verification against the build artefact does not satisfy this test.
15. Reloading and re-entering the same inputs reproduces the result exactly.
16. Nothing persists across reload except where persistence is visible on screen.

**Disclosure**

17. The tool's own page lists every threshold with its value and basis, and states which are uncharacterised.
18. The tool's own page enumerates the failure classes it cannot detect.

**Usability**

19. A first-time user completes a conversion in under one minute without instruction.
20. Inputs and result fit one screen without scrolling.

---

## 17. Open items

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | Confirm the ADC output format can express a single conversion with provenance and mass-basis fields. If not, escalate — do not extend locally | Developer + NADIRA | Mass basis is a three-value enumeration plus "not recorded" |
| 2 | Characterise or disclose the 1 kDa / 1000 kDa bounds | NADIRA | Disclosure is the proportionate answer at this size |
| 3 | Characterise or disclose the 250 mg/mL and 1 pM bounds, or remove | NADIRA | — |
| 4 | Establish whether anyone weighs out protein before that scope is built anywhere | A. Modi | If no observed user, do not build it |
| 5 | Decide C1's public URL slug before preprint submission | A. Modi | Becomes citable |
| 6 | Confirm the C3 boundary covers all dilution including single-step, and carries the two items in §15 | A. Modi | Feeds the C3 URS |
| 7 | Decide displayed precision. 6 significant figures proposed | A. Modi + Developer | Blocks acceptance test 2 |
| 8 | ~~Round-trip tolerance~~ | ~~NADIRA~~ | **Closed** at v0.3. 1 ULP, derived; see §11 |
| 9 | ~~Conjugation: declaration or undetectable failure~~ | ~~NADIRA~~ | **Closed** at v0.4. Folded into C1-MW-07 |
| 10 | ~~Mass-basis exclusivity~~ | ~~NADIRA~~ | **Closed** at v0.5. Resolved by precedence in the option label |

No open item blocks the build. Items 1 and 7 are answered in the first day of work; 2, 3, 5 and 6 are answered before ship.

---

## Annex — Gate status

| # | Gate item | Where addressed | Established by |
|---|---|---|---|
| 1 | One determination, stated | §1 | Specification |
| 2 | Independent reimplementation agrees | Acceptance 3 | Execution |
| 3 | Invariance test, confirmed capable of failing | C1-IV-01/02, acceptance 5–7 | Execution — tolerance derived |
| 4 | Every constant derived, characterised or disclosed | C1-CN-01, §11, acceptance 17 | Specification + execution |
| 5 | Failure classes enumerated, including undetectable ones | §9, acceptance 18 | Specification |
| 6 | Invisible variables are compelled declarations | C1-MW-04, C1-MW-07, C1-FL-05/06/07/08 | Specification — closed |
| 7 | Fixtures audited for shared properties | §10, C1-FX-09 | Execution |
| 8 | Environment claims verified against the deployed artefact | Acceptance 14 | Execution |
| 9 | Flags propagate to display, interpretation and export | C1-ST-01, acceptance 9, 9a, 12, 13 | Execution |

Items 2, 3, 7 and 8 are established by execution, not specification, and remain for review against the built tool.
