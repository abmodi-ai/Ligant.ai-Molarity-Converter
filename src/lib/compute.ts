/**
 * One computation, from which every output is generated.
 *
 * C1-OUT-05 requires the structured and human-readable outputs to be generated
 * from one computation and to be unable to disagree. That is a property of
 * this module being the only place a number is produced: rendering reads the
 * result, and never recomputes.
 *
 * NOTE ON C1-OUT-03/04. `ConversionResult` below is the tool's internal result,
 * not the machine-readable structured object those requirements call for. The
 * structured object is specified to use the shipped Antigen Density
 * Calculator's format, and that format does not exist; see
 * docs/open-item-01-adc-format-finding.md. No serialiser is written here, and
 * no local extension of the ADC's CSV has been invented to stand in for one.
 * C1-OUT-04 and acceptance test 4 are held pending that escalation.
 */

import {
  ENGINE_VERSION,
  convert,
  effectiveMw,
  effectiveMwUnit,
  relationApplied,
  unitHandling,
  type ConversionUnits,
  type Direction,
} from './convert'
import { DISPLAY_SIG_FIGS, PRECISION_STATEMENT, formatSigFigs } from './format'
import {
  MOLECULES_NOT_SITES_STATEMENT,
  SCOPE_STATEMENT,
  THRESHOLD_EVALUATION_STATEMENT,
  raiseFlags,
  type Flag,
} from './flags'
import { checkConcentration, checkMolecularWeight, type Rejection } from './validate'
import {
  MASS_BASIS_LABEL,
  MW_PROVENANCE_LABEL,
  UNIT_LABEL,
  type MassBasis,
  type MwProvenance,
} from './units'
import { NOTHING_RETAINED, type RetainedFields } from './retention'
import { detectUnderflow, type UnderflowState } from './underflow'

/**
 * Everything the user declared. There are no optional fields and no defaults.
 *
 * C1-MW-02: the system shall not infer, default, pre-fill, or suggest a
 * molecular weight under any circumstance. At this layer that is enforced by
 * `mwValue` being required and by there being no table of weights anywhere in
 * the source to draw one from. `src/lib/no-inference.test.ts` asserts the
 * second, because the first is only a compile-time guarantee and the
 * requirement is the tool's reason to exist.
 */
export interface ConversionRequest {
  direction: Direction
  /** The value the user typed, in `units.mass` or `units.molar` per direction. */
  enteredValue: number
  mwValue: number
  provenance: MwProvenance
  massBasis: MassBasis
  units: ConversionUnits
  /**
   * C1-ST-03. Which declarations were carried across a change of conversion
   * direction and not re-confirmed.
   *
   * Optional, and defaulted to nothing retained, because a conversion with no
   * direction change behind it is the overwhelmingly common case and every
   * §10 fixture is one. It is NOT optional in the structured object, see
   * `serialise.ts`, where an absent key would be indistinguishable from a tool
   * that never recorded this.
   */
  retained?: RetainedFields
}

export interface ConversionResult {
  ok: true
  engineVersion: string
  direction: Direction
  /** Unrounded. C1-UN-07 makes this the value a reimplementation is compared against. */
  massValue: number
  molarValue: number
  /** Which one the user typed; the other is computed. */
  entered: 'mass' | 'molar'
  displayed: { mass: string; molar: string; sigFigs: number }
  flags: Flag[]
  /**
   * C1-UN-07. Which computed quantity, if any, is a zero that is not the value.
   *
   * Detection and the record proceed; the PRESENTATION is held pending NADIRA
   *: whether this belongs in §8 as a flag beside the zero or in §7 as a
   * refusal to display is her ruling, and nothing here decides it. This field
   * is the single decision point: either outcome reads it.
   */
  underflow: UnderflowState
  units: ConversionUnits
  declarations: {
    mwValue: number
    provenance: MwProvenance
    massBasis: MassBasis
    /** C1-ST-03. Always present, all three fields, whether or not anything was carried. */
    retained: RetainedFields
  }
  /** C1-CV-03, C1-OUT-01. The physical relation, in named quantities only. */
  relation: string
  /** The unit handling, stated separately from the relation. */
  unitHandling: string
  effectiveMw: number
  /** The divisor's unit, as a ratio of two standard units. */
  effectiveMwUnit: string
  assumptions: readonly string[]
  statements: {
    precision: string
    scope: string
    moleculesNotSites: string
    /** Shown wherever a threshold flag is. See THRESHOLD_EVALUATION_STATEMENT. */
    thresholdEvaluation: string
  }
}

export interface ConversionRejected {
  ok: false
  rejections: Rejection[]
}

export type ConversionOutcome = ConversionResult | ConversionRejected

/**
 * §7 first, then §8. A rejection is a refusal to compute; a flag never blocks.
 *
 * Both concentration checks run against the entered value only, because the
 * computed one cannot be negative if the entered one is not and the molecular
 * weight is positive: both of which are established before the conversion
 * runs. Nothing here needs the computed value to decide a rejection.
 */
export function computeConversion(request: ConversionRequest): ConversionOutcome {
  const { direction, enteredValue, mwValue, units } = request

  const rejections: Rejection[] = []
  const mwRejection = checkMolecularWeight(mwValue, units.mw)
  if (mwRejection) rejections.push(mwRejection)

  const enteredIsMass = direction === 'mass-to-molar'
  const concRejection = checkConcentration(
    enteredValue,
    enteredIsMass ? units.mass : units.molar,
    enteredIsMass ? 'mass concentration' : 'molar concentration',
  )
  if (concRejection) rejections.push(concRejection)

  if (rejections.length > 0) return { ok: false, rejections }

  const pair = convert(direction, enteredValue, mwValue, units)
  const retained = request.retained ?? NOTHING_RETAINED
  // Detected before the flag rules run, because C1-FL-11 reads it.
  const underflow = detectUnderflow(pair)

  const flags = raiseFlags({
    mwValue,
    mwUnit: units.mw,
    provenance: request.provenance,
    massBasis: request.massBasis,
    massValue: pair.massValue,
    massUnit: units.mass,
    molarValue: pair.molarValue,
    molarUnit: units.molar,
    retained,
    underflow,
  })

  return {
    ok: true,
    engineVersion: ENGINE_VERSION,
    direction,
    massValue: pair.massValue,
    molarValue: pair.molarValue,
    entered: pair.entered,
    displayed: {
      mass: formatSigFigs(pair.massValue),
      molar: formatSigFigs(pair.molarValue),
      sigFigs: DISPLAY_SIG_FIGS,
    },
    flags,
    underflow,
    units,
    declarations: { mwValue, provenance: request.provenance, massBasis: request.massBasis, retained },
    relation: relationApplied(direction),
    unitHandling: unitHandling(direction, units),
    effectiveMw: effectiveMw(mwValue, units),
    effectiveMwUnit: effectiveMwUnit(units),
    assumptions: assumptionsFor(request),
    statements: {
      precision: PRECISION_STATEMENT,
      scope: SCOPE_STATEMENT,
      moleculesNotSites: MOLECULES_NOT_SITES_STATEMENT,
      thresholdEvaluation: THRESHOLD_EVALUATION_STATEMENT,
    },
  }
}

/**
 * C1-OUT-01 and C1-OUT-02: the assumptions made, with the molecular weight, its
 * source and its mass basis appearing in the derivation rather than only in the
 * input echo.
 */
function assumptionsFor(request: ConversionRequest): readonly string[] {
  const { units } = request
  const retained = request.retained ?? NOTHING_RETAINED

  /*
   * "as declared" is a claim about provenance, and it was false for any value
   * carried across a direction change: the user declared it in the other
   * direction and has not re-affirmed it in this one. Arithmetically the result
   * was correct and its provenance was misrepresented, which is the paste
   * defect wearing the tool's own wording.
   */
  const CARRIED = 'retained from the previous conversion direction, not re-confirmed'

  return [
    `Molecular weight taken as ${request.mwValue} ${UNIT_LABEL[units.mw]}, ${
      retained.mw ? CARRIED : 'as declared'
    }. The tool does not supply or check molecular weights.`,
    `Source of that weight: ${MW_PROVENANCE_LABEL[request.provenance]}${retained.provenance ? `: ${CARRIED}` : ''}.`,
    `The stated weight is the mass of: ${MASS_BASIS_LABEL[request.massBasis]}${retained.massBasis ? `: ${CARRIED}` : ''}.`,
    'The solution is dilute enough that solute volume is not accounted for separately.',
  ]
}

/**
 * C1-OUT-09. A form suitable for pasting into a lab notebook.
 *
 * Carries the declarations and every flag rather than only the two numbers,
 * because a value pasted without them is the failure the tool exists to
 * replace, and because C1-ST-01 forbids a value being transferred stripped of
 * its flags.
 */
export function notebookLine(result: ConversionResult): string {
  const { units, declarations, displayed } = result
  const head = `${displayed.mass} ${UNIT_LABEL[units.mass]} = ${displayed.molar} ${UNIT_LABEL[units.molar]}`
  const mw = `MW ${declarations.mwValue} ${UNIT_LABEL[units.mw]} (${MW_PROVENANCE_LABEL[declarations.provenance]}; ${MASS_BASIS_LABEL[declarations.massBasis]})`
  const flags = result.flags.length
    ? ` | flags: ${result.flags.map((f) => f.code).join(', ')}`
    : ' | no flags'
  return `${head} | ${mw}${flags} | ${DISPLAY_SIG_FIGS} s.f. | Molarity Converter engine ${result.engineVersion} | ${SCOPE_STATEMENT}`
}
