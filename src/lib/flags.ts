/**
 * §8 — compute and flag.
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

export type FlagCode =
  | 'C1-FL-01'
  | 'C1-FL-02'
  | 'C1-FL-03'
  | 'C1-FL-04'
  | 'C1-FL-05'
  | 'C1-FL-06'
  | 'C1-FL-07'
  | 'C1-FL-08'

export interface Flag {
  code: FlagCode
  /** What the flag states, in the terms §8 requires it to be stated. */
  message: string
  /** Which declaration or quantity the condition was evaluated on. */
  evaluatedOn: 'molecular weight' | 'mass concentration' | 'molar concentration' | 'provenance declaration' | 'mass-basis declaration'
}

/**
 * §11 constants register. Every threshold at which the tool changes behaviour,
 * with its value and its basis, and stated as inspection-chosen where it is.
 *
 * Four of these five are open items 2 and 3, owned by NADIRA and not blocking
 * the build. Built against the values as written; the wording of the disclosure
 * may change and the numbers are not expected to.
 */
export interface Threshold {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly basis: 'derived' | 'inspection'
  readonly status: string
}

export const CONSTANTS_REGISTER: readonly Threshold[] = [
  {
    id: 'round-trip-tolerance',
    label: 'Round-trip tolerance',
    value: '1 ULP, compared with ≤',
    basis: 'derived',
    status:
      'Derived. Analytic: each of the two operations contributes at most ½ ULP of the result. Confirmed empirically — 500,000 random pairs, MW 10³–10⁶ g/mol, concentrations spanning 11 decades, both directions; worst observed error exactly 1.0 ULP, zero cases exceeding.',
  },
  { id: 'mw-lower', label: 'Lower MW plausibility bound', value: '1 kDa', basis: 'inspection', status: 'Uncharacterised — open item 2' },
  { id: 'mw-upper', label: 'Upper MW plausibility bound', value: '1000 kDa', basis: 'inspection', status: 'Uncharacterised — open item 2' },
  { id: 'mass-upper', label: 'Upper mass concentration bound', value: '250 mg/mL', basis: 'inspection', status: 'Uncharacterised — open item 3' },
  { id: 'molar-lower', label: 'Lower molar concentration bound', value: '1 pM', basis: 'inspection', status: 'Uncharacterised — open item 3' },
  { id: 'displayed-precision', label: 'Displayed precision', value: '6 significant figures', basis: 'inspection', status: 'Confirmed at build — open item 7 closed; see docs/open-item-07-displayed-precision.md' },
  {
    id: 'rounding-mode',
    label: 'Rounding mode at displayed precision',
    value: 'half-to-even',
    basis: 'derived',
    status:
      'IEEE 754 default, and the default in Python, R and Julia, so an independent reimplementation agrees without being told. Unbiased under repeated rounding, where half-up drifts upward. Not a threshold, but behaviour-determining: 1 g/L at 51.2 kDa is exactly 19.53125 µM and its displayed value is decided by this row alone.',
  },
] as const

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
}

/**
 * Every §8 condition, evaluated against the computed system.
 *
 * The mass and molar conditions are evaluated on the system's quantity in
 * whichever role it occupies — entered or computed — so the same implausibility
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

  // C1-FL-01 — MW < 1 kDa or MW > 1000 kDa.
  if (mwGPerMol < MW_LOWER_G_PER_MOL || mwGPerMol > MW_UPPER_G_PER_MOL) {
    flags.push({
      code: 'C1-FL-01',
      evaluatedOn: 'molecular weight',
      message:
        'Outside the usual range for a biologic; confirm the units and the value.',
    })
  }

  // C1-FL-02 — mass concentration > 250 mg/mL.
  if (massGPerL > MASS_UPPER_G_PER_L) {
    flags.push({
      code: 'C1-FL-02',
      evaluatedOn: 'mass concentration',
      message:
        'Above the range of typical high-concentration biologic formulations; confirm the units.',
    })
  }

  // C1-FL-03 — molar concentration < 1 pM.
  //
  // Zero is a legal concentration (§7) and is below the bound, so it flags
  // rather than being rejected. That is the specified behaviour: the flag says
  // the value is below the range of biologic working solutions, which zero is.
  if (molarMolPerL < MOLAR_LOWER_MOL_PER_L) {
    flags.push({
      code: 'C1-FL-03',
      evaluatedOn: 'molar concentration',
      message: 'Below the range typical of biologic working solutions.',
    })
  }

  // C1-FL-04 — provenance is "calculated from sequence". Also C1-MW-06.
  if (input.provenance === 'calculated-from-sequence') {
    flags.push({
      code: 'C1-FL-04',
      evaluatedOn: 'provenance declaration',
      message:
        'Sequence-derived mass excludes glycosylation and other post-translational modification.',
    })
  }

  // C1-FL-05 — provenance is "not recorded".
  if (input.provenance === 'not-recorded') {
    flags.push({
      code: 'C1-FL-05',
      evaluatedOn: 'provenance declaration',
      message:
        'Molecular weight provenance not recorded; the result cannot be traced to a source and should not be carried into a method record without one.',
    })
  }

  // C1-FL-06 — mass basis is monomer or single chain.
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
      evaluatedOn: 'mass-basis declaration',
      message: 'Molar concentration computed is of monomer, not of assembled molecule.',
    })
  }

  // C1-FL-07 — mass basis is "not recorded".
  if (input.massBasis === 'not-recorded') {
    flags.push({
      code: 'C1-FL-07',
      evaluatedOn: 'mass-basis declaration',
      message:
        'Mass basis not recorded; whether this concentration refers to the assembled molecule, a monomer, or a conjugate cannot be determined from the record.',
    })
  }

  // C1-FL-08 — mass basis is conjugate.
  if (input.massBasis === 'conjugate') {
    flags.push({
      code: 'C1-FL-08',
      evaluatedOn: 'mass-basis declaration',
      message:
        'Molecular weight includes label or payload; the molar concentration computed is of the conjugate, not of the underlying protein. The tool does not correct for drug-to-antibody ratio or degree of labelling.',
    })
  }

  return flags
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
  'A monomer mass quoted where the assembled mass was needed, or the reverse — C1-MW-07 compels the declaration but cannot verify it.',
  'A unit-magnitude transcription error where the entered weight still falls inside the plausible range. C1-FL-01 catches a 1000× error that lands outside 1–1000 kDa; it cannot catch one that lands inside, and it cannot distinguish a genuinely unusual protein from a typo.',
  'Any error in the input concentration itself.',
  'A conjugate mass declared as unconjugated, or the reverse — C1-MW-07 compels the declaration but cannot verify it, as above.',
] as const

/** C1-OUT-06 and C1-OUT-08. Displayed with every result. */
export const SCOPE_STATEMENT = 'Research use. Not qualified for GxP decision-making.'
export const MOLECULES_NOT_SITES_STATEMENT =
  'The molar concentration is of molecules, not of binding sites. A bivalent IgG at 1 µM presents 2 µM of paratope.'
