/**
 * §7 — reject.
 *
 * Conditions are stated against the computed system, not against entry fields,
 * so that the same physical impossibility is caught wherever it arises.
 *
 * Every message names the quantity and the physical reason. §7 says in terms
 * that generic validation errors do not satisfy it, so "Invalid input" or
 * "Please enter a positive number" is a defect here, not a style preference.
 */

import { UNIT_LABEL, type MassUnit, type MolarUnit, type MwUnit } from './units'

export type RejectionCode = 'C1-HI-01' | 'C1-HI-02'

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
    return {
      code: 'C1-HI-01',
      message: `The molecular weight is not a number. A molecular weight is a mass per mole and must be stated as one.`,
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
    return {
      code: 'C1-HI-02',
      message: `The ${quantity} is not a number. It must be stated as one.`,
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
