/**
 * §7: reject.
 *
 * Conditions are stated against the computed system, not against entry fields,
 * so that the same physical impossibility is caught wherever it arises.
 *
 * Every message names the quantity and the physical reason. §7 says in terms
 * that generic validation errors do not satisfy it, so "Invalid input" or
 * "Please enter a positive number" is a defect here, not a style preference.
 */

import { UNIT_LABEL, type MassUnit, type MolarUnit, type MwUnit } from './units'

/**
 * C1-HI-01 and C1-HI-02 are §7's two conditions. C1-HI-03 and C1-HI-04 are not,
 * and that is the point of separating them.
 *
 * `1,5` in a concentration field and `150 kDa` pasted into a weight field were
 * both rejected correctly and both reused a §7 code, so a machine reading
 * C1-OUT-03 could not tell "the user entered a negative number" from "the user
 * entered something that is not a number". Those call for different responses:
 * one is a quantity the physics forbids, the other is not a quantity at all.
 *
 * FLAGGED, NOT SETTLED. §7's conditions are stated against the computed system,
 * and an unparseable string never enters it: there is no quantity to test `< 0`
 * against, because the parse failed before a quantity existed. So this may not
 * be a §7 condition at all but a class sitting BEFORE validation rather than
 * inside it. The codes are separated now because that is needed either way;
 * whether §7 is restructured around them is NADIRA's, as open item 19.
 */
export type RejectionCode = 'C1-HI-01' | 'C1-HI-02' | 'C1-HI-03' | 'C1-HI-04'

export interface Rejection {
  code: RejectionCode
  /** Names the quantity and the physical reason. */
  message: string
}

/**
 * C1-HI-01. MW ≤ 0.
 *
 * Zero is rejected with the same reason as a negative, because the reason is
 * the same: mass per mole cannot be zero or negative. It is also the value that
 * would divide by zero, but that is a consequence rather than the reason, and
 * the message says the reason.
 */
export function checkMolecularWeight(value: number, unit: MwUnit): Rejection | null {
  if (!Number.isFinite(value)) {
    // C1-HI-03, not C1-HI-01. Nothing was weighed; the field did not parse.
    return {
      code: 'C1-HI-03',
      message: `The molecular weight is not a number. Enter the value on its own and choose the unit beside it: a weight typed as "150 kDa", or with a comma for a decimal point, cannot be read as a quantity.`,
    }
  }
  if (value <= 0) {
    return {
      code: 'C1-HI-01',
      message: `The molecular weight is ${value} ${UNIT_LABEL[unit]}. Mass per mole cannot be zero or negative, so this cannot be a molecular weight.`,
    }
  }
  return null
}

/**
 * C1-HI-02. Concentration < 0.
 *
 * Zero concentration is legal. It converts to zero and creates no division, and
 * §7 says in terms that it shall not be rejected defensively.
 */
export function checkConcentration(
  value: number,
  unit: MassUnit | MolarUnit,
  quantity: 'mass concentration' | 'molar concentration',
): Rejection | null {
  if (!Number.isFinite(value)) {
    // C1-HI-04, not C1-HI-02. A concentration that cannot be negative is a
    // different statement from a concentration that was never read.
    return {
      code: 'C1-HI-04',
      message: `The ${quantity} is not a number. Enter the value on its own and choose the unit beside it: a value typed with a comma for a decimal point, or with its unit in the same field, cannot be read as a quantity.`,
    }
  }
  if (value < 0) {
    return {
      code: 'C1-HI-02',
      message: `The ${quantity} is ${value} ${UNIT_LABEL[unit]}. A concentration cannot be negative: it is an amount of substance in a volume.`,
    }
  }
  return null
}
