/**
 * §8: compute and flag.
 *
 * Flags never block the calculation. Each appears in both the human-readable
 * and the structured output with a machine-readable reason code.
 *
 * The reason code is the C1-FL-nn identifier itself. The Antigen Density
 * Calculator's shared `Flag` type carries only `level`, `message` and an
 * optional `remedy` and has no code, which is one of the three gaps recorded in
 * docs/open-item-01-adc-format-finding.md. Matching on message text is not a
 * machine-readable code: §8's wording is still being revised under open items 2
 * and 3, and a fixture that matched on it would break when the wording changed
 * without the behaviour changing.
 */

import { MASS_TO_G_PER_L, MOLAR_TO_MOL_PER_L, MW_TO_G_PER_MOL } from './units'
import type { MassBasis, MassUnit, MolarUnit, MwProvenance, MwUnit } from './units'
import { anyRetained, retainedFieldNames, type RetainedFields } from './retention'

export type FlagCode =
  | 'C1-FL-01'
  | 'C1-FL-02'
  | 'C1-FL-03'
  | 'C1-FL-04'
  | 'C1-FL-05'
  | 'C1-FL-06'
  | 'C1-FL-07'
  | 'C1-FL-08'
  | 'C1-FL-09'
  | 'C1-FL-10'

export interface Flag {
  code: FlagCode
  /** What the flag states, in the terms §8 requires it to be stated. */
  message: string
  /** Which declaration or quantity the condition was evaluated on. */
  evaluatedOn:
    | 'molecular weight'
    | 'mass concentration'
    | 'molar concentration'
    | 'provenance declaration'
    | 'mass-basis declaration'
    | 'retention state'
  /**
   * Whether the condition compares a quantity against a numeric threshold,
   * reads a declaration, or reads whether a declaration was re-confirmed.
   *
   * The first distinction is not cosmetic. A threshold flag is evaluated on the
   * UNROUNDED value, which can differ from the displayed value in the last
   * significant figure: so a flagged result and an unflagged one can render
   * identically. See THRESHOLD_EVALUATION_STATEMENT. A declaration flag has no
   * such property: the declaration is what the user selected.
   *
   * `retention` is a third thing and not a declaration flag, because it does
   * not read what the user chose, it reads what the user did NOT do. Keeping
   * it separate is what stops the threshold caveat from being shown beside it.
   */
  kind: 'threshold' | 'declaration' | 'retention'
}

/**
 * C1-OUT. Said once on the output, wherever a threshold flag is shown.
 *
 * The case that requires it: a molar concentration one ULP below 1 pM raises
 * C1-FL-03 and displays as 1.00000 pM. A molar concentration of exactly 1 pM
 * raises nothing and displays as 1.00000 pM. Two results, identical on screen,
 * one flagged and one not.
 *
 * Neither is wrong: §8 evaluates against the computed system and C1-UN-06
 * governs the rendering: but a user who cannot reconcile the flag with the
 * number in front of them loses confidence in both, and in a tool whose whole
 * claim is that it records what a spreadsheet hides, that is expensive.
 */
export const THRESHOLD_EVALUATION_STATEMENT =
  'Threshold flags are evaluated on the unrounded value, which may differ from the displayed value in its last significant figure. A flagged result and an unflagged one can therefore display identically.'

/**
 * §11 constants register. Every threshold at which the tool changes behaviour,
 * with its value and its basis, and stated as inspection-chosen where it is.
 *
 * Four of these five are open items 2 and 3, owned by NADIRA and not blocking
 * the build. Built against the values as written; the wording of the disclosure
 * may change and the numbers are not expected to.
 */
/**
 * The four §8 thresholds plus representability, named once.
 *
 * This union and `BOUNDARY_THRESHOLDS` below are the SINGLE SOURCE the fixture
 * guard enumerates from. It used to keep its own hardcoded list of four names,
 * which is why representability could be added to the register and to the
 * documentation while the guard reported full coverage: a guard cannot report a
 * threshold it was never told exists. The register has rendered from the same
 * constants the flag rules read since v0.1, precisely so the page cannot
 * describe a threshold the tool does not apply; the guard now does the same.
 */
export type ThresholdId =
  | 'mw-lower'
  | 'mw-upper'
  | 'mass-upper'
  | 'molar-lower'
  | 'representability'

export interface Threshold {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly basis: 'derived' | 'inspection'
  readonly status: string
  /**
   * Set where the row is a threshold WITH SIDES: a quantity can sit below it,
   * exactly on it, or above it, and the output changes across it. C1-FX-04 must
   * cover every such row on every side in both conversion directions, and
   * `fixtures.test.ts` derives its enumeration from this field.
   *
   * Adding a row with this set makes the guard demand the fixtures immediately.
   * That is the point: the previous arrangement closed the instance and left
   * the class open, so the next threshold would have been invisible again.
   */
  readonly boundaryCoverage?: true
}

export const CONSTANTS_REGISTER: readonly Threshold[] = [
  {
    id: 'round-trip-tolerance',
    label: 'Round-trip tolerance',
    value: '1 ULP, compared with ≤',
    basis: 'derived',
    status:
      'Derived, and a REQUIREMENT ON HOW THE CONVERSION IS STRUCTURED rather than an observation about it. The bound holds only because the unit factors are folded into a single divisor, so a round trip is two operations and not six, and folding is required for two independent reasons. Rounding: the stepwise path reaches 3.0 ULP and exceeds the bound in 0.54% of cases, against 1.0 ULP and zero exceedances folded. Range: the stepwise intermediate underflows where the folded divisor does not, so 1e-320 mg/mL at 1000 kDa returns 0 stepwise and 1e-320 in µM folded. A tool inheriting this row as an observation would fail the bound and lose range. APPLIES TO RESULTS THE CHOSEN UNITS CAN REPRESENT: once a result underflows, the ULP distance is unbounded and is not a rounding difference. Measured: 500,000 random pairs, MW 10³ to 10⁶ g/mol, 11 decades, both directions; worst observed error exactly 1.0 ULP, zero cases exceeding.',
  },
  { boundaryCoverage: true, id: 'mw-lower', label: 'Lower MW plausibility bound', value: '1 kDa', basis: 'inspection', status: 'Uncharacterised: open item 2' },
  {
    boundaryCoverage: true,
    id: 'mw-upper',
    label: 'Upper MW plausibility bound',
    value: '1000 kDa',
    basis: 'inspection',
    // The value is UNCHANGED and stays NADIRA's to rule on. What changed is
    // what the register admits: this bound is not merely unmeasured, it is
    // known to misfire. IgM-PE at 1210 kDa is an ordinary flow reagent and
    // raises "outside the usual range for a biologic" beside a correct
    // conjugate flag. Adding the conjugate mass basis at v0.4 made masses above
    // this bound ordinary, and the constant and the declaration were changed in
    // the same document without either being checked against the other.
    status:
      'Uncharacterised: open item 2, and KNOWN TO MISFIRE. IgM–PE at 1210 kDa is an ordinary reagent and is flagged as outside the usual range. Adding the conjugate mass basis made masses above this bound ordinary; the bound was not revisited. Under review: the candidate resolutions are a higher figure or a bound conditioned on the mass-basis declaration.',
  },
  { boundaryCoverage: true, id: 'mass-upper', label: 'Upper mass concentration bound', value: '250 mg/mL', basis: 'inspection', status: 'Uncharacterised: open item 3' },
  { boundaryCoverage: true, id: 'molar-lower', label: 'Lower molar concentration bound', value: '1 pM', basis: 'inspection', status: 'Uncharacterised: open item 3' },
  {
    boundaryCoverage: true,
    id: 'representability',
    label: 'Representable range of a computed quantity',
    value: '4.94e-324 in the reported unit (the smallest positive double)',
    basis: 'derived',
    status:
      'Derived from IEEE 754 double precision, not chosen. A computed quantity below this is reported as 0 and marked `underflowed` in the structured object; a bare 0 there is not a rounded value but a different number. It is the CHOICE OF UNIT that decides representability rather than the value alone: 1e-320 mg/mL at 1000 kDa underflows reported in M and is exact reported in pM. Listed under C1-CN-01 because it is a threshold at which the output changes, even though it is not a §8 flag condition. How an underflowed result is PRESENTED is open item 16 and is not settled by this row.',
  },
  {
    id: 'displayed-precision',
    label: 'Displayed precision',
    value: '6 significant figures',
    basis: 'inspection',
    // Open item 7 is NOT closed here, and the register must not say it is.
    //
    // The measurement exists: docs/open-item-07-displayed-precision.md, seven
    // orders of headroom before C1-IV-03 first fails, but it has not reached
    // NADIRA, and a register line is not a review. The row said "open item 7
    // closed" until 4 September 2026, which is the register claiming an
    // owner's decision on her behalf: precisely the kind of silent
    // behaviour-determining choice §11 exists to prevent.
    status:
      'Proposed: open item 7 remains OPEN. Measured as evaluable at build with seven orders of headroom before C1-IV-03 fails (docs/open-item-07-displayed-precision.md). The measurement is with the developer; the decision is NADIRA\'s and has not been made.',
  },
  {
    id: 'reimplementation-tolerance',
    label: 'Independent reimplementation agreement',
    value: '≤ 1 ULP, compared with ≤',
    basis: 'derived',
    status:
      'Requirement, not an observation. Bit-identical is what was measured, but making it the requirement would generalise one measured pair into a claim about all future reimplementations: a language with wider intermediates or FMA contraction can differ in the last bit on the same two operations, and bit-identical would then fail on correct code. APPLIES TO RESULTS THE CHOSEN UNITS CAN REPRESENT, on the same terms as the round-trip row: an implementation with a wider exponent range returns a small positive number where this returns zero, and that disagreement is unbounded in ULP terms rather than being a rounding difference. C1-FX-03b and C1-FX-14 put both regimes in the reference set, so the qualifier is exercised rather than asserted. Observed: 0 ULP over the comparison set, so any drift from exact agreement is visible rather than absorbed. Consequence, stated rather than left implicit: a defect uniformly smaller than 1 ULP is invisible to acceptance tests 3 and 5 alike.',
  },
  {
    id: 'rounding-mode',
    label: 'Rounding mode at displayed precision',
    value: 'half-to-even',
    basis: 'derived',
    status:
      'IEEE 754 default, and the default in Python, R and Julia, so an independent reimplementation agrees without being told. Unbiased under repeated rounding, where half-up drifts upward. Not a threshold, but behaviour-determining: 1 g/L at 51.2 kDa is exactly 19.53125 µM and its displayed value is decided by this row alone.',
  },
] as const

/**
 * The rows C1-FX-04 must cover, derived rather than restated.
 *
 * `fixtures.test.ts` reads this. Nothing maintains a second list.
 */
export const BOUNDARY_THRESHOLDS: readonly ThresholdId[] = CONSTANTS_REGISTER.filter(
  (t) => t.boundaryCoverage,
).map((t) => t.id as ThresholdId)

/** The threshold values themselves, in base units, written once. */
export const MW_LOWER_G_PER_MOL = 1_000        // 1 kDa
export const MW_UPPER_G_PER_MOL = 1_000_000    // 1000 kDa
export const MASS_UPPER_G_PER_L = 250          // 250 mg/mL
export const MOLAR_LOWER_MOL_PER_L = 1e-12     // 1 pM

export interface FlagInput {
  mwValue: number
  mwUnit: MwUnit
  provenance: MwProvenance
  massBasis: MassBasis
  massValue: number
  massUnit: MassUnit
  molarValue: number
  molarUnit: MolarUnit
  /** C1-FL-09. Which declarations were carried without re-confirmation. */
  retained: RetainedFields
}

/**
 * Every §8 condition, evaluated against the computed system.
 *
 * The mass and molar conditions are evaluated on the system's quantity in
 * whichever role it occupies, entered or computed, so the same implausibility
 * is caught in both conversion directions. Nothing here reads the direction.
 *
 * Boundary behaviour is the operators exactly as §8 writes them: `<` and `>`
 * for the bounds, so a value sitting exactly on a threshold does not flag.
 * Acceptance test 10 tests this in both directions.
 */
export function raiseFlags(input: FlagInput): Flag[] {
  const flags: Flag[] = []

  const mwGPerMol = input.mwValue * MW_TO_G_PER_MOL[input.mwUnit]
  const massGPerL = input.massValue * MASS_TO_G_PER_L[input.massUnit]
  const molarMolPerL = input.molarValue * MOLAR_TO_MOL_PER_L[input.molarUnit]

  // C1-FL-01: MW < 1 kDa or MW > 1000 kDa.
  if (mwGPerMol < MW_LOWER_G_PER_MOL || mwGPerMol > MW_UPPER_G_PER_MOL) {
    flags.push({
      code: 'C1-FL-01',
      kind: 'threshold',
      evaluatedOn: 'molecular weight',
      message:
        'Outside the usual range for a biologic; confirm the units and the value.',
    })
  }

  // C1-FL-02: mass concentration > 250 mg/mL.
  if (massGPerL > MASS_UPPER_G_PER_L) {
    flags.push({
      code: 'C1-FL-02',
      kind: 'threshold',
      evaluatedOn: 'mass concentration',
      message:
        'Above the range of typical high-concentration biologic formulations; confirm the units.',
    })
  }

  /*
   * Zero is not a low concentration; it is the absence of solute.
   *
   * §7 makes zero legal and §8 does not exclude it, so until v0.1.2 both
   * requirements were satisfied and their interaction was the defect: 0 mg/mL
   * returned 0.00000 µM flagged "below the range typical of biologic working
   * solutions", which is true of zero and says nothing about it. A flag that
   * carries no information is the inert-check pattern in miniature, it looks
   * like the tool noticed something.
   *
   * Both quantities are tested rather than one. They are zero together for
   * every legal input, but a mass concentration small enough to underflow the
   * division still leaves a genuine trace amount reported as a zero molarity,
   * and THAT is an implausibly low concentration rather than an empty one.
   * C1-FL-03 is the right flag there and still fires.
   */
  /*
   * Tested on the quantities themselves, NOT on their base-unit forms.
   *
   * Normalising first can manufacture a zero: 1e-320 ng/mL is a real, non-zero
   * concentration, and multiplying it by the ng/mL factor of 1e-6 gives 1e-326,
   * which underflows to exactly 0. Read from the normalised value, the rule
   * concluded that a solution the user had described contained no solute, and
   * said so confidently. That is the defect C1-FL-10 was added to remove,
   * reproduced by C1-FL-10 itself in a unit nothing had tested.
   *
   * Zero is zero in every unit, so the raw comparison is strictly safer: a
   * genuinely empty system still has both quantities at exactly 0, and no unit
   * factor can turn a non-zero quantity into one.
   */
  const isEmpty = input.massValue === 0 && input.molarValue === 0

  // C1-FL-10: the system contains no solute.
  if (isEmpty) {
    flags.push({
      code: 'C1-FL-10',
      kind: 'threshold',
      evaluatedOn: 'molar concentration',
      message:
        'The concentration is zero: no solute is present. This is not an implausibly low concentration, and the conversion is exact.',
    })
  }

  // C1-FL-03: molar concentration < 1 pM, excluding an empty system.
  if (!isEmpty && molarMolPerL < MOLAR_LOWER_MOL_PER_L) {
    flags.push({
      code: 'C1-FL-03',
      kind: 'threshold',
      evaluatedOn: 'molar concentration',
      message: 'Below the range typical of biologic working solutions.',
    })
  }

  // C1-FL-04: provenance is "calculated from sequence". Also C1-MW-06.
  if (input.provenance === 'calculated-from-sequence') {
    flags.push({
      code: 'C1-FL-04',
      kind: 'declaration',
      evaluatedOn: 'provenance declaration',
      message:
        'Sequence-derived mass excludes glycosylation and other post-translational modification.',
    })
  }

  // C1-FL-05: provenance is "not recorded".
  if (input.provenance === 'not-recorded') {
    flags.push({
      code: 'C1-FL-05',
      kind: 'declaration',
      evaluatedOn: 'provenance declaration',
      message:
        'Molecular weight provenance not recorded; the result cannot be traced to a source and should not be carried into a method record without one.',
    })
  }

  // C1-FL-06: mass basis is monomer or single chain.
  //
  // A single-chain conjugate raises C1-FL-08 and not this, because the
  // declaration is single-select and the precedence in the option label makes
  // `conjugate` the answer for that reagent. That is correct rather than merely
  // safe: the monomer warning exists to say the number does not refer to the
  // assembled molecule, and the conjugate flag already says what it does refer
  // to.
  if (input.massBasis === 'monomer') {
    flags.push({
      code: 'C1-FL-06',
      kind: 'declaration',
      evaluatedOn: 'mass-basis declaration',
      message: 'Molar concentration computed is of monomer, not of assembled molecule.',
    })
  }

  // C1-FL-07: mass basis is "not recorded".
  if (input.massBasis === 'not-recorded') {
    flags.push({
      code: 'C1-FL-07',
      kind: 'declaration',
      evaluatedOn: 'mass-basis declaration',
      message:
        'Mass basis not recorded; whether this concentration refers to the assembled molecule, a monomer, or a conjugate cannot be determined from the record.',
    })
  }

  // C1-FL-08: mass basis is conjugate.
  if (input.massBasis === 'conjugate') {
    flags.push({
      code: 'C1-FL-08',
      kind: 'declaration',
      evaluatedOn: 'mass-basis declaration',
      message:
        'Molecular weight includes label or payload; the molar concentration computed is of the conjugate, not of the underlying protein. The tool does not correct for drug-to-antibody ratio or degree of labelling.',
    })
  }

  /*
   * C1-FL-09: a declaration was carried across a change of conversion
   * direction and has not been re-confirmed.
   *
   * NOT a refusal to compute. The value is present and valid; only its
   * re-affirmation in this direction is missing, so the calculation proceeds
   * and the result carries the qualification. Withholding would be the wrong
   * instrument: it would treat an unconfirmed weight as an absent one, and
   * C1-MW-01 already covers absence.
   *
   * The message names the fields because a reader on screen needs to know which
   * one to look at. `declarations.retained` in the structured object records the
   * same thing in a form a consumer can branch on, the flag warns, the
   * declaration records, exactly as the mass basis already works.
   */
  if (anyRetained(input.retained)) {
    const names = retainedFieldNames(input.retained)
    const list =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    const verb = names.length === 1 ? 'was' : 'were'
    flags.push({
      code: 'C1-FL-09',
      kind: 'retention',
      evaluatedOn: 'retention state',
      message: `${capitalise(list)} ${verb} retained from the previous conversion direction and ${verb} not re-confirmed. The result is computed from carried values; confirm them before recording it.`,
    })
  }

  return flags
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * §9. Failure classes this tool cannot detect.
 *
 * Required on the tool's own page and visible to the user, not confined to
 * documentation (C1-FC-01). Exported as data so the page cannot drift from the
 * specification by being edited as prose in a template.
 */
export const UNDETECTABLE_FAILURES: readonly string[] = [
  'A molecular weight that is correct for a different construct.',
  'A molecular weight that was correct for a prior lot or formulation.',
  'A monomer mass quoted where the assembled mass was needed, or the reverse; C1-MW-07 compels the declaration but cannot verify it.',
  'A unit-magnitude transcription error where the entered weight still falls inside the plausible range. C1-FL-01 catches a 1000× error that lands outside 1–1000 kDa; it cannot catch one that lands inside, and it cannot distinguish a genuinely unusual protein from a typo.',
  'Any error in the input concentration itself.',
  'A computed concentration too small to represent, which is reported as 0.00000 in the unit you chose. The tool marks it in the structured record, but a zero on screen for a non-zero solution is indistinguishable from an empty one by eye. Reporting the result in a smaller unit is usually enough: 1e-320 mg/mL of a 1000 kDa protein is zero in M and exact in pM.',
  'A conjugate mass declared as unconjugated, or the reverse; C1-MW-07 compels the declaration but cannot verify it, as above.',
] as const

/** C1-OUT-06 and C1-OUT-08. Displayed with every result. */
export const SCOPE_STATEMENT = 'Research use. Not qualified for GxP decision-making.'
export const MOLECULES_NOT_SITES_STATEMENT =
  'The molar concentration is of molecules, not of binding sites. A bivalent IgG at 1 µM presents 2 µM of paratope.'
