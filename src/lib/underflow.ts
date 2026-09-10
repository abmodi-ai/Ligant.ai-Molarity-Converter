/**
 * Underflow to zero: detection, and the instrument the message will need.
 *
 * THE CASE. 1e-320 mg/mL at 1000 kDa is 1e-326 mol/L, which is below the
 * smallest subnormal double (about 4.94e-324). Reported in M the conversion
 * returns exactly `0`, and the only flag raised says the value is below the
 * range typical of biologic working solutions, true of a small number and
 * equally true of nothing. A reader cannot tell which they have.
 *
 * WHY THIS IS A RECORD DEFECT BEFORE IT IS A DISPLAY DEFECT. C1-UN-07 makes the
 * structured object's value the one an independent reimplementation is compared
 * against. A `0` there is not a rounded version of 1e-326; it is a different
 * number, and a reimplementation with a wider exponent range returns a small
 * positive value while this says zero. The screen at least carries a flag; the
 * record carried a clean confident wrong number with nothing marking it, and a
 * flag does not travel with a number someone retypes from a notebook line.
 * That is the retention finding's shape, and it is why detection and the record
 * proceed while the presentation is held.
 *
 * NOT C1-FL-10. That flag is the genuine-zero case, where the system contains no
 * solute and both quantities are zero. Underflow is the opposite situation: the
 * entered quantity is non-zero and the computed one is zero, so the two
 * conditions are mutually exclusive by construction, and `underflow.test.ts`
 * asserts that rather than leaving it to be noticed.
 */

import { massToMolar, molarToMass, type ConversionUnits } from './convert'
import { MASS_UNITS, MOLAR_UNITS, type MassUnit, type MolarUnit } from './units'

/**
 * Which computed quantity, if any, underflowed to zero from a non-zero input.
 *
 * Both keys always present, on the same reasoning as `RetainedFields`: an
 * absent key reads as `false` to a careless consumer and as "this tool does not
 * record underflow" to a careful one.
 */
export interface UnderflowState {
  massConcentration: boolean
  molarConcentration: boolean
}

export const NO_UNDERFLOW: UnderflowState = Object.freeze({
  massConcentration: false,
  molarConcentration: false,
})

/**
 * A computed quantity is underflowed when it is zero and the quantity it was
 * computed from is not.
 *
 * The entered quantity is never marked: it is what the user typed, and a user
 * who types zero has said zero. That is C1-FL-10's case.
 */
export function detectUnderflow(pair: {
  massValue: number
  molarValue: number
  entered: 'mass' | 'molar'
}): UnderflowState {
  const enteredValue = pair.entered === 'mass' ? pair.massValue : pair.molarValue
  const computedValue = pair.entered === 'mass' ? pair.molarValue : pair.massValue
  const underflowed = enteredValue !== 0 && computedValue === 0

  return {
    massConcentration: underflowed && pair.entered === 'molar',
    molarConcentration: underflowed && pair.entered === 'mass',
  }
}

export function anyUnderflow(u: UnderflowState): boolean {
  return u.massConcentration || u.molarConcentration
}

/**
 * Which output units, if any, can represent the value; CHECKED, not assumed.
 *
 * This exists because "try a smaller unit" is only actionable when a smaller
 * unit exists, and nothing in the tool knew whether one did. It is built ahead
 * of the message it is for so that the message cannot ship an unverified
 * suggestion; suggesting pM where pM also underflows would be the inert-check
 * pattern with a helpful tone.
 *
 * It is not a hypothetical, and the way it failed is worth keeping.
 *
 * Round 3's instruction reported that all five molar units underflow for the
 * 1e-320 mg/mL case, so no unit could be suggested and the caveat against
 * suggesting one was justified. Run against the shipped conversion, four of the
 * five hold the value: only M underflows, and pM round-trips it losslessly.
 *
 * The reported measurement was taken by dividing to mol/L and then scaling to
 * the unit, which is the STEPWISE path. That forms the intermediate which
 * underflows, and avoiding it is the second of the two reasons §11 requires the
 * divisor to be folded. The probe therefore reproduced the exact defect the
 * requirement exists to prevent, while checking a finding about that
 * requirement. Its independence from this code is what made it worth trusting,
 * and it was independent in the wrong direction.
 *
 * The requirement it was written to support still stands: a suggested unit must
 * be one the tool has CHECKED. Only the worked example inverts. The check finds
 * units here; it does not find none. `underflow.test.ts` asserts both the
 * result and the mechanism, so neither is a recollection.
 */
export function representableMolarUnits(massValue: number, mwValue: number, units: ConversionUnits): MolarUnit[] {
  return MOLAR_UNITS.filter((molar) => {
    const v = massToMolar(massValue, mwValue, { ...units, molar })
    return v !== 0 && Number.isFinite(v)
  })
}

export function representableMassUnits(molarValue: number, mwValue: number, units: ConversionUnits): MassUnit[] {
  return MASS_UNITS.filter((mass) => {
    const v = molarToMass(molarValue, mwValue, { ...units, mass })
    return v !== 0 && Number.isFinite(v)
  })
}

/**
 * The units that would hold the value, for whichever quantity underflowed.
 *
 * Returns an empty array when nothing underflowed, and an empty array when
 * nothing can represent it, which are different situations and are
 * distinguished by `anyUnderflow`, not by this.
 */
export function representableAlternatives(
  u: UnderflowState,
  pair: { massValue: number; molarValue: number },
  mwValue: number,
  units: ConversionUnits,
): readonly string[] {
  if (u.molarConcentration) return representableMolarUnits(pair.massValue, mwValue, units)
  if (u.massConcentration) return representableMassUnits(pair.molarValue, mwValue, units)
  return []
}
