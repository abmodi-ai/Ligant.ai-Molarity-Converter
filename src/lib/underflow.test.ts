import { describe, expect, it } from 'vitest'
import {
  detectUnderflow,
  representableAlternatives,
  representableMassUnits,
  representableMolarUnits,
} from './underflow'
import { computeConversion, type ConversionRequest } from './compute'
import { toStructuredResult } from './serialise'
import { MOLAR_UNITS } from './units'
import { correctPath, roundTripUlps, stepwisePath } from './invariance'

/** NADIRA's case: 1e-320 mg/mL at 1000 kDa, which is 1e-326 mol/L. */
const TINY: ConversionRequest = {
  direction: 'mass-to-molar',
  enteredValue: 1e-320,
  mwValue: 1000,
  provenance: 'certificate-of-analysis',
  massBasis: 'assembled',
  units: { mass: 'mg/mL', molar: 'M', mw: 'kDa' },
}

function ok(r: ConversionRequest) {
  const o = computeConversion(r)
  if (!o.ok) throw new Error(o.rejections.map((x) => x.message).join('; '))
  return o
}

describe('detection: a zero that is not the value', () => {
  it('marks the computed quantity, not the entered one', () => {
    const r = ok(TINY)
    expect(r.molarValue).toBe(0)
    expect(r.underflow).toEqual({ massConcentration: false, molarConcentration: true })
  })

  it('marks the mass side when the mass side is the computed one', () => {
    const reverse = ok({ ...TINY, direction: 'molar-to-mass', enteredValue: 1e-320, units: { mass: 'mg/mL', molar: 'pM', mw: 'kDa' } })
    // 1e-320 pM into mg/mL underflows in the other direction.
    expect(reverse.massValue).toBe(0)
    expect(reverse.underflow).toEqual({ massConcentration: true, molarConcentration: false })
  })

  it('stays exclusive of C1-FL-10 in a unit whose base-unit form underflows', () => {
    /*
     * The case the first version of this suite missed. The exclusivity test
     * below used mg/mL, whose base-unit factor is 1, so normalising could not
     * lose anything and the property held for a reason that had nothing to do
     * with the rule being right. In ng/mL the factor is 1e-6 and the rule
     * reported an empty system for a concentration the user had typed.
     */
    const r = ok({ ...TINY, units: { mass: 'ng/mL', molar: 'M', mw: 'kDa' }, mwValue: 150 })
    expect(r.massValue).toBe(1e-320)
    expect(r.molarValue).toBe(0)
    expect(r.flags.map((f) => f.code)).toEqual(['C1-FL-03'])
    expect(r.flags.map((f) => f.code)).not.toContain('C1-FL-10')
    expect(r.underflow.molarConcentration).toBe(true)
  })

  it('is mutually exclusive with C1-FL-10 by construction', () => {
    // C1-FL-10 is the genuine zero, where the system holds no solute and both
    // quantities are zero. Underflow is the case where the entered quantity is
    // not zero. Asserted rather than left to be noticed.
    const underflowed = ok(TINY)
    expect(underflowed.flags.map((f) => f.code)).not.toContain('C1-FL-10')
    expect(underflowed.flags.map((f) => f.code)).toContain('C1-FL-03')

    const genuineZero = ok({ ...TINY, enteredValue: 0 })
    expect(genuineZero.flags.map((f) => f.code)).toContain('C1-FL-10')
    expect(genuineZero.underflow).toEqual({ massConcentration: false, molarConcentration: false })
  })

  it('a value the unit can hold is not marked', () => {
    const held = ok({ ...TINY, units: { mass: 'mg/mL', molar: 'pM', mw: 'kDa' } })
    expect(held.molarValue).toBeGreaterThan(0)
    expect(held.underflow.molarConcentration).toBe(false)
  })

  it('detectUnderflow reads the pair, never the direction label alone', () => {
    expect(detectUnderflow({ massValue: 1e-320, molarValue: 0, entered: 'mass' }).molarConcentration).toBe(true)
    expect(detectUnderflow({ massValue: 0, molarValue: 0, entered: 'mass' }).molarConcentration).toBe(false)
    expect(detectUnderflow({ massValue: 0, molarValue: 5, entered: 'molar' }).massConcentration).toBe(true)
  })
})

describe('C1-UN-07: the record marks the zero', () => {
  it('the structured object marks the underflowed quantity on the quantity itself', () => {
    const obj = toStructuredResult(ok(TINY))
    expect(obj.quantities.molarConcentration).toEqual({ value: 0, unit: 'M', underflowed: true })
    expect(obj.quantities.massConcentration.underflowed).toBe(false)
    // A consumer holding one quantity in isolation can tell, which is the same
    // reason the unit is on the quantity.
    expect(obj.quantities.molecularWeight.underflowed).toBe(false)
    expect(obj.quantities.effectiveDivisor.underflowed).toBe(false)
  })

  it('a clean result marks nothing, and says so rather than omitting the key', () => {
    const obj = toStructuredResult(ok({ ...TINY, enteredValue: 1, units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } }))
    for (const q of Object.values(obj.quantities)) expect(q.underflowed).toBe(false)
  })
})

describe('C1-IV-01: the bound applies to representable results, and only there', () => {
  const units = (molar: (typeof MOLAR_UNITS)[number]) => ({ mass: 'mg/mL', molar, mw: 'kDa' }) as const

  it('total loss when the output unit cannot hold the value', () => {
    const ulps = roundTripUlps({ massValue: 1e-320, mwValue: 1000, units: units('M') })
    expect(ulps).toBeGreaterThan(1000)
  })

  it('exact when it can', () => {
    for (const u of ['uM', 'nM', 'pM'] as const) {
      expect(roundTripUlps({ massValue: 1e-320, mwValue: 1000, units: units(u) }), u).toBe(0)
    }
  })

  it('and partial where the unit holds the value with almost no precision left', () => {
    // mM represents 1e-323 with about one significant bit, so the round trip is
    // neither exact nor a total loss. Recorded because it is the case that
    // makes "representable" too coarse a word on its own.
    const ulps = roundTripUlps({ massValue: 1e-320, mwValue: 1000, units: units('mM') })
    expect(ulps).toBeGreaterThan(1)
    expect(ulps).toBeLessThan(1000)
  })
})

describe('the folded divisor preserves range as well as rounding', () => {
  it('the stepwise path loses the value where the folded path keeps it', () => {
    // §11's basis says folding is required because six operations round worse
    // than two. It is also required because the stepwise intermediate
    // underflows: this is the second reason, and it is not a rounding argument.
    const u = { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } as const
    expect(stepwisePath().massToMolar(1e-320, 1000, u)).toBe(0)
    expect(correctPath.massToMolar(1e-320, 1000, u)).toBeGreaterThan(0)
  })
})

describe('the unit suggestion is checked, not assumed', () => {
  it('four of the five molar units hold NADIRA\'s case; only M underflows', () => {
    const holds = representableMolarUnits(1e-320, 1000, TINY.units)
    expect(holds).toEqual(['mM', 'uM', 'nM', 'pM'])
    expect(holds).not.toContain('M')
  })

  it('the probe that reported otherwise had reimplemented the defect under test', () => {
    /*
     * Round 3 reported that every molar unit underflows for this input, so no
     * unit could be suggested. That measurement was taken by dividing to
     * mol/L and then scaling to the unit, which is the STEPWISE path: it forms
     * the intermediate that underflows, which is the second of the two reasons
     * §11 requires the divisor to be folded.
     *
     * So the probe reproduced the exact defect the requirement exists to
     * prevent, while checking a finding about that requirement, and reported
     * the result as a property of the shipped tool. Its independence from the
     * tool is what made it worth trusting, and it was independent in the wrong
     * direction.
     *
     * Asserted rather than described, because the two paths disagreeing here is
     * the whole of the explanation.
     */
    const stepwise = MOLAR_UNITS.filter(
      (molar) => stepwisePath().massToMolar(1e-320, 1000, { ...TINY.units, molar }) !== 0,
    )
    expect(stepwise, 'the stepwise path finds no unit that holds the value').toEqual([])
    expect(representableMolarUnits(1e-320, 1000, TINY.units), 'the shipped path finds four').toHaveLength(4)
  })

  it('C1-FX-14 makes folding load-bearing for acceptance test 3', () => {
    /*
     * A consequence of adding the subnormal fixtures that was not obvious.
     *
     * Before them, a stepwise reimplementation would have agreed with the
     * shipped tool everywhere that mattered: the two differ by at most 1 ULP in
     * the normal range, and the comparison tolerance is 1 ULP. In the subnormal
     * regime they disagree totally, so C1-FX-14 is now a case acceptance test 3
     * would FAIL against a reimplementation that did not fold.
     *
     * That is not a threat to the independence the test depends on. Folding is
     * in the specification, as a requirement on how the conversion is
     * structured rather than an observation about it, so both implementations
     * folding is two authors reading the same URS. It is worth stating because
     * it looks like contamination and is not.
     */
    const units = { mass: 'mg/mL', molar: 'pM', mw: 'kDa' } as const
    const shipped = correctPath.massToMolar(1e-320, 1000, units)
    const stepwise = stepwisePath().massToMolar(1e-320, 1000, units)
    expect(shipped).toBeGreaterThan(0)
    expect(stepwise).toBe(0)
    expect(shipped).not.toBe(stepwise)
  })

  it('reports an empty list when nothing can represent the value', () => {
    // The case the message must be able to state rather than suggest around.
    const nothingHolds = representableMolarUnits(1e-323, 1_000_000, {
      mass: 'ng/mL',
      molar: 'M',
      mw: 'kDa',
    })
    expect(nothingHolds).toEqual([])
  })

  it('picks the side that actually underflowed', () => {
    const r = ok(TINY)
    expect(representableAlternatives(r.underflow, r, r.declarations.mwValue, r.units)).toEqual([
      'mM',
      'uM',
      'nM',
      'pM',
    ])
    // Nothing underflowed, so there is nothing to offer.
    const clean = ok({ ...TINY, enteredValue: 1, units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } })
    expect(representableAlternatives(clean.underflow, clean, clean.declarations.mwValue, clean.units)).toEqual([])
  })

  it('the mass side is checked the same way', () => {
    expect(representableMassUnits(1, 1000, { mass: 'mg/mL', molar: 'pM', mw: 'kDa' }).length).toBeGreaterThan(0)
  })
})
