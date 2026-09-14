/**
 * The case corpus the invariance and defect tests run over.
 *
 * Deterministic: a seeded generator rather than `Math.random`, so a failure is
 * reproducible and so the confirmation recorded under C1-IV-02 refers to a
 * specific set of cases rather than to whichever ones happened to run that day.
 * C1-ST-04's determinism is a property of the tests as much as of the tool.
 */

import type { ConversionUnits } from './convert'
import { MASS_UNITS, MOLAR_UNITS, MW_UNITS } from './units'
import type { RoundTripCase } from './invariance'

/** mulberry32. Small, seeded, and adequate for spreading cases over a range. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Cases spanning the magnitudes and every unit combination.
 *
 * The magnitude span is what gives the clamp and the floor something to bite
 * on: a corpus of realistic antibody concentrations alone would leave both
 * defects undetected, and a test that cannot detect them is the thing C1-IV-02
 * exists to rule out.
 */
export function generateCases(count: number, seed = 0x0c1a5e): RoundTripCase[] {
  const rnd = seededRandom(seed)
  const cases: RoundTripCase[] = []
  for (let i = 0; i < count; i++) {
    const units: ConversionUnits = {
      mass: MASS_UNITS[Math.floor(rnd() * MASS_UNITS.length)],
      molar: MOLAR_UNITS[Math.floor(rnd() * MOLAR_UNITS.length)],
      mw: MW_UNITS[Math.floor(rnd() * MW_UNITS.length)],
    }
    // MW 10^3 to 10^6 g/mol, expressed in whichever unit was selected.
    const mwGPerMol = Math.pow(10, 3 + rnd() * 3)
    const mwValue = units.mw === 'kDa' ? mwGPerMol / 1000 : mwGPerMol
    // Eleven decades of concentration, as §11's empirical confirmation used.
    const massValue = Math.pow(10, -8 + rnd() * 11)
    cases.push({ massValue, mwValue, units })
  }
  return cases
}

/**
 * Cases a bench scientist would recognise, kept beside the generated sweep.
 *
 * A generated corpus can pass while the tool is wrong about the only numbers
 * anyone will actually type, and a corpus of round numbers is what made v0.1's
 * fixtures unrepresentative. These are neither: real constructs at
 * non-round weights.
 */
export const REALISTIC_CASES: readonly RoundTripCase[] = [
  { massValue: 1, mwValue: 150, units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } },
  { massValue: 2.4, mwValue: 148327, units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } },
  { massValue: 0.5, mwValue: 27.7, units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } },
  { massValue: 125, mwValue: 149183, units: { mass: 'ug/mL', molar: 'nM', mw: 'g/mol' } },
  { massValue: 50, mwValue: 240000, units: { mass: 'ug/mL', molar: 'nM', mw: 'g/mol' } },
  { massValue: 10, mwValue: 104000, units: { mass: 'ng/mL', molar: 'pM', mw: 'g/mol' } },
  { massValue: 200, mwValue: 12.4, units: { mass: 'mg/L', molar: 'uM', mw: 'kDa' } },
  { massValue: 33.7, mwValue: 76543, units: { mass: 'g/L', molar: 'mM', mw: 'g/mol' } },
] as const
