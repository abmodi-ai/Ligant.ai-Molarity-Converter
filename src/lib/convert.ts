/**
 * The conversion itself.
 *
 * One determination: the molar concentration corresponding to a stated mass
 * concentration, or the reverse, for a protein whose molecular weight the user
 * declares along with its source.
 */

import {
  MASS_TO_G_PER_L,
  MOLAR_TO_MOL_PER_L,
  MW_TO_G_PER_MOL,
  UNIT_LABEL,
  type MassUnit,
  type MolarUnit,
  type MwUnit,
} from './units'

/** C1-CV-02. Selected before data entry; not a mode. */
export type Direction = 'mass-to-molar' | 'molar-to-mass'

/** C1-NF-06. Changes whenever calculation behaviour changes. */
export const ENGINE_VERSION = '0.1.0'

export interface ConversionUnits {
  mass: MassUnit
  molar: MolarUnit
  mw: MwUnit
}

/**
 * The single divisor that carries the whole conversion.
 *
 * `effectiveMw` is the molecular weight expressed in (mass unit) per (molar
 * unit), so that a conversion is one division and the reverse is one
 * multiplication by the identical value.
 *
 * This is not a micro-optimisation, it is what makes C1-IV-01 achievable. §11
 * derives the 1 ULP tolerance from "each of the TWO operations contributes at
 * most ½ ULP". An implementation that normalises units as separate steps
 * performs six operations, not two: the unit factors are applied on the way out
 * and again on the way back, and the powers of ten among them (1e-3, 1e-6,
 * 1e-9, 1e-12) are not exactly representable in binary. Measured over 300,000
 * random pairs across every unit combination, that implementation reaches 3 ULP
 * and breaches the tolerance in 0.54% of cases, while this one holds at exactly
 * 1 ULP with zero breaches.
 *
 * Folded, the round trip divides and then multiplies by the same double, so the
 * unit-factor error is common to both directions and cancels instead of
 * accumulating. It costs nothing in accuracy: against exact rational arithmetic
 * both strategies sit within 2.9 ULP of the true value and neither disagrees
 * with it at six significant figures. See docs/invariance-confirmation.md.
 */
export function effectiveMw(mwValue: number, units: ConversionUnits): number {
  const gPerMol = mwValue * MW_TO_G_PER_MOL[units.mw]
  return (gPerMol * MOLAR_TO_MOL_PER_L[units.molar]) / MASS_TO_G_PER_L[units.mass]
}

/**
 * Mass concentration to molar concentration.
 *
 * No rounding is applied anywhere in here (C1-UN-05). The value returned is the
 * unrounded one that C1-UN-07 makes the comparison standard for an independent
 * reimplementation; display precision is applied at the edge and nowhere else.
 */
export function massToMolar(massValue: number, mwValue: number, units: ConversionUnits): number {
  return massValue / effectiveMw(mwValue, units)
}

/** Molar concentration to mass concentration. The exact reverse operation. */
export function molarToMass(molarValue: number, mwValue: number, units: ConversionUnits): number {
  return molarValue * effectiveMw(mwValue, units)
}

/**
 * Both quantities of a conversion, whichever one was entered.
 *
 * Every conversion yields a mass concentration and a molar concentration — one
 * entered, one computed. §8 evaluates its conditions against the computed
 * system rather than against entry fields, so that the same physical
 * implausibility is caught in whichever role the quantity occupies. Returning
 * the pair rather than a single result is what makes that possible without the
 * flag rules needing to know the direction.
 */
export interface ConvertedPair {
  massValue: number
  molarValue: number
  /** Which of the two the user typed. The other is computed. */
  entered: 'mass' | 'molar'
}

export function convert(
  direction: Direction,
  enteredValue: number,
  mwValue: number,
  units: ConversionUnits,
): ConvertedPair {
  if (direction === 'mass-to-molar') {
    return {
      massValue: enteredValue,
      molarValue: massToMolar(enteredValue, mwValue, units),
      entered: 'mass',
    }
  }
  return {
    massValue: molarToMass(enteredValue, mwValue, units),
    molarValue: enteredValue,
    entered: 'molar',
  }
}

/** C1-CV-03. The relation applied, displayed with the result. */
export function relationApplied(direction: Direction, units: ConversionUnits): string {
  // UNIT_LABEL rather than the identifiers: the reader sees µM, not uM. The
  // identifiers are ASCII so they are safe to type and to match on; the labels
  // are what a person reads.
  const mass = UNIT_LABEL[units.mass]
  const molar = UNIT_LABEL[units.molar]
  const mw = UNIT_LABEL[units.mw]
  return direction === 'mass-to-molar'
    ? `molar concentration = mass concentration ÷ molecular weight  (${mass} ÷ effective ${mw} → ${molar})`
    : `mass concentration = molar concentration × molecular weight  (${molar} × effective ${mw} → ${mass})`
}
