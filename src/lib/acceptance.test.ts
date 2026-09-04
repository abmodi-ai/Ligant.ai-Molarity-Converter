import { describe, expect, it } from 'vitest'
import { computeConversion, notebookLine, type ConversionRequest } from './compute'
import { agreesToDisplayedPrecision } from './format'
import { MASS_BASIS, MW_PROVENANCE, type MassBasis, type MwProvenance } from './units'
import { UNDETECTABLE_FAILURES, CONSTANTS_REGISTER } from './flags'

const BASE: ConversionRequest = {
  direction: 'mass-to-molar',
  enteredValue: 1,
  mwValue: 150,
  provenance: 'certificate-of-analysis',
  massBasis: 'assembled',
  units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' },
}

function ok(r: ConversionRequest) {
  const o = computeConversion(r)
  if (!o.ok) throw new Error(o.rejections.map((x) => x.message).join('; '))
  return o
}

describe('Acceptance 1 — the reference case', () => {
  it('IgG at 150 kDa, 1 mg/mL returns 6.66667 µM at six significant figures', () => {
    expect(ok(BASE).displayed.molar).toBe('6.66667')
  })

  it('the same case declared as a monomer is unmistakably different', () => {
    // Six figures exposes the factor-of-two mass-basis error unambiguously,
    // which is the job §4 gives the precision.
    const monomer = ok({ ...BASE, mwValue: 75, massBasis: 'monomer' })
    expect(monomer.displayed.molar).toBe('13.3333')
    expect(monomer.displayed.molar).not.toBe(ok(BASE).displayed.molar)
  })
})

describe('Acceptance 6 / C1-IV-03 — g/mol and kDa agree to displayed precision', () => {
  it('over a sweep of realistic weights and concentrations', () => {
    let checked = 0
    for (let mw = 10_000; mw <= 500_000; mw += 617) {
      for (const c of [0.1, 1.25, 2.4, 12.5, 137.9]) {
        const gmol = ok({ ...BASE, mwValue: mw, enteredValue: c, units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } })
        const kda = ok({ ...BASE, mwValue: mw / 1000, enteredValue: c, units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' } })
        expect(kda.displayed.molar, `MW ${mw} at ${c} mg/mL`).toBe(gmol.displayed.molar)
        expect(agreesToDisplayedPrecision(gmol.molarValue, kda.molarValue)).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(3000)
  })
})

describe('Acceptance 8 / §7 — rejection names the quantity and the physical reason', () => {
  const cases: { name: string; request: ConversionRequest; mustName: RegExp[] }[] = [
    {
      name: 'C1-HI-01, MW zero',
      request: { ...BASE, mwValue: 0 },
      mustName: [/molecular weight/i, /mass per mole/i, /zero or negative/i],
    },
    {
      name: 'C1-HI-01, MW negative',
      request: { ...BASE, mwValue: -150 },
      mustName: [/molecular weight/i, /mass per mole/i],
    },
    {
      name: 'C1-HI-02, negative mass concentration',
      request: { ...BASE, enteredValue: -1 },
      mustName: [/mass concentration/i, /cannot be negative/i],
    },
    {
      name: 'C1-HI-02, negative molar concentration',
      request: { ...BASE, direction: 'molar-to-mass', enteredValue: -5 },
      mustName: [/molar concentration/i, /cannot be negative/i],
    },
  ]

  for (const { name, request, mustName } of cases) {
    it(`${name} is rejected with a message naming both`, () => {
      const outcome = computeConversion(request)
      expect(outcome.ok).toBe(false)
      if (outcome.ok) return
      const text = outcome.rejections.map((r) => r.message).join(' ')
      for (const pattern of mustName) expect(text).toMatch(pattern)
      // §7 in terms: a generic validation error does not satisfy the section.
      expect(text).not.toMatch(/^(invalid|error|bad) (input|value)/i)
      expect(text.length).toBeGreaterThan(40)
    })
  }

  it('zero concentration is legal and is not rejected defensively', () => {
    const outcome = computeConversion({ ...BASE, enteredValue: 0 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.molarValue).toBe(0)
      // It converts to zero, creates no division, and flags as below the
      // working range rather than being refused.
      expect(outcome.flags.map((f) => f.code)).toContain('C1-FL-03')
    }
  })
})

describe('Acceptance 9 / §8 — flags compute a result and carry a reason code', () => {
  it('every flag raised has a machine-readable code and a message', () => {
    const flagged = ok({ ...BASE, provenance: 'not-recorded', massBasis: 'not-recorded', mwValue: 0.5 })
    expect(flagged.flags.length).toBeGreaterThan(0)
    for (const f of flagged.flags) {
      expect(f.code).toMatch(/^C1-FL-0[1-8]$/)
      expect(f.message.length).toBeGreaterThan(20)
      expect(f.evaluatedOn).toBeTruthy()
    }
  })

  it('a flag never blocks the calculation', () => {
    const r = ok({ ...BASE, mwValue: 0.5, provenance: 'not-recorded', massBasis: 'not-recorded' })
    expect(Number.isFinite(r.molarValue)).toBe(true)
    expect(r.displayed.molar).toBeTruthy()
  })
})

describe('Acceptance 13 — every mass-basis value behaves as specified', () => {
  const expected: Record<MassBasis, string[]> = {
    assembled: [],
    monomer: ['C1-FL-06'],
    conjugate: ['C1-FL-08'],
    'not-recorded': ['C1-FL-07'],
  }

  for (const basis of MASS_BASIS) {
    it(`${basis} raises ${expected[basis].join(', ') || 'no flag'}`, () => {
      const r = ok({ ...BASE, massBasis: basis })
      expect(r.flags.map((f) => f.code)).toEqual(expected[basis])
      // ...and appears on the output.
      expect(r.declarations.massBasis).toBe(basis)
      expect(notebookLine(r)).toContain(basis === 'assembled' ? 'assembled' : basis.replace('-', ' '))
    })
  }

  it('a single-chain conjugate raises C1-FL-08 and not C1-FL-06', () => {
    // §3.3's consequence, recorded as correct rather than merely safe: the
    // conjugate flag already says what the number refers to.
    const r = ok({ ...BASE, mwValue: 267.7, massBasis: 'conjugate' })
    expect(r.flags.map((f) => f.code)).toEqual(['C1-FL-08'])
  })
})

describe('Acceptance 12 — "not recorded" provenance', () => {
  it('is accepted, appears on the output, and raises C1-FL-05', () => {
    const r = ok({ ...BASE, provenance: 'not-recorded' })
    expect(r.flags.map((f) => f.code)).toContain('C1-FL-05')
    expect(r.declarations.provenance).toBe('not-recorded')
    expect(notebookLine(r)).toContain('not recorded')
  })

  it('is distinguishable in the structured result from a field left blank', () => {
    // C1-MW-05. "not-recorded" is a value; a blank field is the absence of one,
    // and the two must not collapse to the same thing.
    const recorded = ok({ ...BASE, provenance: 'not-recorded' })
    expect(recorded.declarations.provenance).toBe('not-recorded')
    expect(recorded.declarations.provenance).not.toBeUndefined()
    expect(recorded.declarations.provenance).not.toBe('')

    const blank = computeConversion({ ...BASE, provenance: undefined as unknown as MwProvenance })
    // A blank provenance is not a valid declaration and does not silently
    // become "not recorded".
    if (blank.ok) expect(blank.declarations.provenance).not.toBe('not-recorded')
  })

  it('every provenance value is accepted', () => {
    for (const p of MW_PROVENANCE) expect(computeConversion({ ...BASE, provenance: p }).ok).toBe(true)
  })

  it('calculated-from-sequence states the glycosylation exclusion (C1-MW-06)', () => {
    const r = ok({ ...BASE, provenance: 'calculated-from-sequence' })
    const flag = r.flags.find((f) => f.code === 'C1-FL-04')
    expect(flag).toBeDefined()
    expect(flag!.message).toMatch(/glycosylation/i)
    expect(flag!.message).toMatch(/post-translational/i)
  })
})

describe('Acceptance 15 / C1-ST-04 — determinism', () => {
  it('the same inputs always produce the same outputs', () => {
    const request: ConversionRequest = { ...BASE, enteredValue: 2.4, mwValue: 148327, units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } }
    const first = ok(request)
    for (let i = 0; i < 100; i++) {
      const again = ok(request)
      expect(again.molarValue).toBe(first.molarValue)
      expect(again.massValue).toBe(first.massValue)
      expect(again.displayed).toEqual(first.displayed)
      expect(again.flags).toEqual(first.flags)
    }
  })

  it('no result carries a timestamp or other time dependence', () => {
    const json = JSON.stringify(ok(BASE))
    expect(json).not.toMatch(/\b20\d\d-\d\d-\d\dT/)
    expect(json).not.toMatch(/timestamp|generatedAt|now/i)
  })
})

describe('Acceptance 17 and 18 — disclosure', () => {
  it('every threshold is listed with its value and basis, and inspection-chosen ones say so', () => {
    expect(CONSTANTS_REGISTER.length).toBe(7)
    for (const t of CONSTANTS_REGISTER) {
      expect(t.value).toBeTruthy()
      expect(t.status).toBeTruthy()
      if (t.basis === 'inspection') expect(t.status.length).toBeGreaterThan(10)
    }
    // The distinction the register exists to draw: what was measured or follows
    // from a standard, against what was chosen by looking at it. Two rows are
    // now derived — the round-trip tolerance, and the rounding mode, which is
    // not a threshold but is behaviour-determining, and the register exists so
    // that no behaviour-determining choice is silent.
    expect(CONSTANTS_REGISTER.filter((t) => t.basis === 'derived').length).toBe(2)
    expect(CONSTANTS_REGISTER.some((t) => t.id === 'rounding-mode')).toBe(true)
    expect(CONSTANTS_REGISTER.filter((t) => t.status.includes('Uncharacterised')).length).toBe(4)
  })

  it('the failure classes the tool cannot detect are enumerated', () => {
    expect(UNDETECTABLE_FAILURES.length).toBe(6)
    for (const f of UNDETECTABLE_FAILURES) expect(f.length).toBeGreaterThan(30)
  })
})

describe('C1-OUT — the output carries what §13 requires', () => {
  it('the relation, the assumptions, the input echo, and the engine version', () => {
    const r = ok(BASE)
    expect(r.relation).toMatch(/molar concentration = mass concentration/)
    expect(r.assumptions.length).toBeGreaterThanOrEqual(3)
    expect(r.engineVersion).toBeTruthy()
    expect(r.statements.precision).toMatch(/6 significant figures/)
    expect(r.statements.scope).toMatch(/not qualified for GxP/i)
    expect(r.statements.moleculesNotSites).toMatch(/paratope/)
  })

  it('C1-OUT-02 — the weight, its source and its mass basis are in the derivation', () => {
    const r = ok({ ...BASE, provenance: 'mass-spectrometry', massBasis: 'conjugate' })
    const derivation = r.assumptions.join(' ')
    expect(derivation).toMatch(/150 kDa/)
    expect(derivation).toMatch(/mass spectrometry/)
    expect(derivation).toMatch(/conjugate/)
  })

  it('C1-ST-01 — a notebook line cannot be produced stripped of its flags', () => {
    const r = ok({ ...BASE, massBasis: 'conjugate', provenance: 'not-recorded' })
    const line = notebookLine(r)
    for (const f of r.flags) expect(line).toContain(f.code)
  })
})
