import { describe, expect, it } from 'vitest'
import { computeConversion, type ConversionRequest } from './compute'
import { generateCases } from './corpus'

/**
 * §8 states its conditions against the computed system, not against entry
 * fields, "so that the same implausibility is caught in both conversion
 * directions".
 *
 * The property that follows is stronger than any individual fixture: a physical
 * system flags identically however it was entered. A flag rule that read the
 * entered field rather than the quantity would pass every single-direction
 * fixture and fail this.
 */
describe('§8 — conditions are evaluated on the computed system, not on entry fields', () => {
  it('a system flags identically whichever direction it was entered from', () => {
    let compared = 0
    for (const c of generateCases(20000, 0x51de5)) {
      const forward: ConversionRequest = {
        direction: 'mass-to-molar',
        enteredValue: c.massValue,
        mwValue: c.mwValue,
        provenance: 'certificate-of-analysis',
        massBasis: 'assembled',
        units: c.units,
      }
      const a = computeConversion(forward)
      if (!a.ok) continue

      // Re-enter the computed molar concentration from the other side.
      const b = computeConversion({ ...forward, direction: 'molar-to-mass', enteredValue: a.molarValue })
      if (!b.ok) continue

      expect(b.flags.map((f) => f.code).sort(), `direction changed the flags for ${JSON.stringify(c)}`).toEqual(
        a.flags.map((f) => f.code).sort(),
      )
      compared++
    }
    expect(compared).toBeGreaterThan(19000)
  })

  it('acceptance 10 — threshold behaviour is the same in both directions', () => {
    // Walked across each concentration bound rather than sampled, so the step
    // either side of the operator is exercised directly.
    const mw = 150000
    const units = { mass: 'mg/mL', molar: 'nM', mw: 'g/mol' } as const

    for (const mass of [249.9999, 250, 250.0001]) {
      const entered = computeConversion({
        direction: 'mass-to-molar',
        enteredValue: mass,
        mwValue: mw,
        provenance: 'certificate-of-analysis',
        massBasis: 'assembled',
        units,
      })
      expect(entered.ok).toBe(true)
      if (!entered.ok) continue

      const computed = computeConversion({
        direction: 'molar-to-mass',
        enteredValue: entered.molarValue,
        mwValue: mw,
        provenance: 'certificate-of-analysis',
        massBasis: 'assembled',
        units,
      })
      expect(computed.ok).toBe(true)
      if (!computed.ok) continue

      expect(computed.flags.map((f) => f.code)).toEqual(entered.flags.map((f) => f.code))
      expect(entered.flags.some((f) => f.code === 'C1-FL-02')).toBe(mass > 250)
    }
  })

  it('C1-CV-02 — direction does not change which inputs are required', () => {
    // "Direction is not a mode." Both directions reject an absent molecular
    // weight, and neither accepts an input the other refuses.
    for (const direction of ['mass-to-molar', 'molar-to-mass'] as const) {
      const outcome = computeConversion({
        direction,
        enteredValue: 1,
        mwValue: NaN,
        provenance: 'certificate-of-analysis',
        massBasis: 'assembled',
        units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
      })
      expect(outcome.ok).toBe(false)
    }
  })
})
