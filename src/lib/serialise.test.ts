import { describe, expect, it } from 'vitest'
import { ALL_FIXTURES } from './fixtures'
import { computeConversion, type ConversionRequest } from './compute'
import {
  SCHEMA_NAME,
  SCHEMA_VERSION,
  reproduceFrom,
  toJson,
  toStructuredResult,
  validateStructuredResult,
} from './serialise'
import { MASS_BASIS, MW_PROVENANCE } from './units'

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

describe('C1-OUT-03 — a structured object for every calculation', () => {
  it('every fixture in §10 produces one that validates', () => {
    for (const f of ALL_FIXTURES) {
      const obj = toStructuredResult(ok(f.request))
      const problems = validateStructuredResult(obj)
      expect(problems, `${f.id}: ${problems.map((p) => `${p.path} ${p.problem}`).join('; ')}`).toEqual([])
    }
  })

  it('every declaration combination produces one that validates', () => {
    for (const provenance of MW_PROVENANCE) {
      for (const massBasis of MASS_BASIS) {
        const obj = toStructuredResult(ok({ ...BASE, provenance, massBasis }))
        expect(validateStructuredResult(obj), `${provenance} / ${massBasis}`).toEqual([])
      }
    }
  })

  it('the schema is C1\'s own and is versioned separately from the engine', () => {
    // Open item 1 is not closed. The object must not claim to be an ADC format,
    // and reconciliation later has to be visible — which is what a schema
    // version distinct from the engine version buys.
    const obj = toStructuredResult(ok(BASE))
    expect(obj.schema.name).toBe(SCHEMA_NAME)
    expect(obj.schema.version).toBe(SCHEMA_VERSION)
    expect(obj.tool.engineVersion).toBeTruthy()
    expect(obj.schema.version).not.toBe(obj.tool.engineVersion)
  })
})

describe('C1-OUT-03 — units attached to every quantity', () => {
  it('each quantity is a value and a unit, not a bare number', () => {
    const q = toStructuredResult(ok(BASE)).quantities
    expect(q.massConcentration).toEqual({ value: 1, unit: 'mg/mL' })
    expect(q.molarConcentration.unit).toBe('uM')
    expect(q.molecularWeight).toEqual({ value: 150, unit: 'kDa' })
    expect(q.effectiveDivisor.unit).toBe('mg/mL per µM')
    for (const key of Object.keys(q) as (keyof typeof q)[]) {
      expect(typeof q[key].value, `${key} has no numeric value`).toBe('number')
      expect(q[key].unit, `${key} has no unit`).toBeTruthy()
    }
  })

  it('a quantity stripped of its unit fails validation', () => {
    // The guard on the guard. The requirement is easy to satisfy in appearance
    // — four bare numbers beside one shared `units` object read as satisfying
    // it — so the validator is checked against the shape that does not.
    const obj = toStructuredResult(ok(BASE)) as any
    obj.quantities.molarConcentration = { value: 6.666 }
    const problems = validateStructuredResult(obj)
    expect(problems.some((p) => p.path === 'quantities.molarConcentration.unit')).toBe(true)
  })
})

describe('C1-UN-07 — the unrounded value is in the structured object', () => {
  it('quantities carry the double, and the rendering is carried separately', () => {
    const r = ok({ ...BASE, enteredValue: 2.4, mwValue: 148327, units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } })
    const obj = toStructuredResult(r)
    expect(obj.quantities.molarConcentration.value).toBe(r.molarValue)
    // Unrounded: the double carries more than the six figures displayed.
    expect(obj.quantities.molarConcentration.value).not.toBe(Number(obj.displayed.molarConcentration))
    expect(obj.displayed.molarConcentration).toBe('16.1805')
    expect(obj.displayed.significantFigures).toBe(6)
    expect(obj.displayed.roundingMode).toBe('half-to-even')
  })

  it('survives a JSON round trip without losing the last bits', () => {
    const r = ok({ ...BASE, enteredValue: 2.4, mwValue: 148327, units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } })
    const back = JSON.parse(toJson(r))
    expect(back.quantities.molarConcentration.value).toBe(r.molarValue)
    expect(validateStructuredResult(back)).toEqual([])
  })
})

describe('C1-DAT-03 — the object alone reproduces the reported result', () => {
  it('over the whole fixture set, through JSON', () => {
    for (const f of ALL_FIXTURES) {
      const original = ok(f.request)
      // Through JSON deliberately: reproduction must not depend on anything
      // that survives in memory but not in the serialised form.
      const again = reproduceFrom(JSON.parse(toJson(original)))

      expect(again.massValue, `${f.id} mass`).toBe(original.massValue)
      expect(again.molarValue, `${f.id} molar`).toBe(original.molarValue)
      expect(again.displayed, `${f.id} displayed`).toEqual(original.displayed)
      expect(again.flags.map((x) => x.code), `${f.id} flags`).toEqual(original.flags.map((x) => x.code))
      expect(again.relation, `${f.id} relation`).toBe(original.relation)
    }
  })

  it('reproduces from the computed side as well as the entered side', () => {
    // The molar-to-mass fixtures enter the molar quantity, so reproduction has
    // to read `direction` and pick the right one. A reproduction that always
    // read `massConcentration` would pass every mass-to-molar case.
    const original = ok({ ...BASE, direction: 'molar-to-mass', enteredValue: 6.66666, mwValue: 150 })
    const again = reproduceFrom(toStructuredResult(original))
    expect(again.molarValue).toBe(original.molarValue)
    expect(again.massValue).toBe(original.massValue)
    expect(again.entered).toBe('molar')
  })
})

describe('§8 — flags survive serialisation with their reason codes', () => {
  it('every flag carries its code, message and kind', () => {
    const r = ok({ ...BASE, mwValue: 0.5, provenance: 'not-recorded', massBasis: 'not-recorded' })
    const obj = toStructuredResult(r)
    expect(obj.flags.length).toBeGreaterThanOrEqual(3)
    expect(obj.flags.map((f) => f.code)).toEqual(r.flags.map((f) => f.code))
    for (const f of obj.flags) {
      expect(f.code).toMatch(/^C1-FL-0[1-8]$/)
      expect(f.message.length).toBeGreaterThan(20)
      expect(['threshold', 'declaration']).toContain(f.kind)
    }
  })

  it('C1-ST-01 — the no-flags case is an empty array, not an absent key', () => {
    // "A value shall not be transferable stripped of its flags." An absent key
    // and an empty array are the same thing to a careless consumer and
    // different things to a careful one; only one of them says "checked, none".
    const obj = toStructuredResult(ok(BASE))
    expect(obj.flags).toEqual([])
    expect(Object.prototype.hasOwnProperty.call(obj, 'flags')).toBe(true)
    const stripped = toStructuredResult(ok(BASE)) as any
    delete stripped.flags
    expect(validateStructuredResult(stripped).some((p) => p.path === 'flags')).toBe(true)
  })
})

describe('C1-OUT-05 — the structured and human-readable outputs cannot disagree', () => {
  it('the object is a projection of the result, not a recomputation', () => {
    const r = ok({ ...BASE, enteredValue: 1234.5678, mwValue: 148327, units: { mass: 'ug/mL', molar: 'uM', mw: 'g/mol' } })
    const obj = toStructuredResult(r)
    expect(obj.displayed.molarConcentration).toBe(r.displayed.molar)
    expect(obj.displayed.massConcentration).toBe(r.displayed.mass)
    expect(obj.derivation.assumptions).toEqual([...r.assumptions])
    expect(obj.statements).toEqual(r.statements)
    expect(obj.quantities.effectiveDivisor.value).toBe(r.effectiveMw)
  })

  it('C1-OUT-01/02 — the weight, its source and its mass basis are in the derivation', () => {
    const obj = toStructuredResult(ok({ ...BASE, provenance: 'mass-spectrometry', massBasis: 'conjugate' }))
    const derivation = obj.derivation.assumptions.join(' ')
    expect(derivation).toMatch(/150 kDa/)
    expect(derivation).toMatch(/mass spectrometry/)
    expect(derivation).toMatch(/conjugate/)
  })
})

describe('the validator rejects what it is meant to reject', () => {
  it('a non-object, and an object missing its required parts', () => {
    expect(validateStructuredResult(null).length).toBeGreaterThan(0)
    expect(validateStructuredResult('{}').length).toBeGreaterThan(0)
    expect(validateStructuredResult({}).length).toBeGreaterThan(0)
  })

  it('a result with no engine version', () => {
    const obj = toStructuredResult(ok(BASE)) as any
    obj.tool.engineVersion = ''
    expect(validateStructuredResult(obj).some((p) => p.path === 'tool.engineVersion')).toBe(true)
  })

  it('a flag with a message but no machine-readable code', () => {
    const obj = toStructuredResult(ok({ ...BASE, massBasis: 'monomer' })) as any
    delete obj.flags[0].code
    expect(validateStructuredResult(obj).some((p) => p.path === 'flags[0].code')).toBe(true)
  })
})
