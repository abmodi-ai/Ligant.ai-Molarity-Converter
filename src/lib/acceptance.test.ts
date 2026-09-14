import { describe, expect, it } from 'vitest'
import { computeConversion, notebookLine, type ConversionRequest } from './compute'
import { agreesToDisplayedPrecision } from './format'
import { MASS_BASIS, MASS_BASIS_LABEL, MW_PROVENANCE, type MassBasis, type MwProvenance } from './units'
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

describe('Acceptance 1: the reference case', () => {
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

describe('Acceptance 6 / C1-IV-03, g/mol and kDa agree to displayed precision', () => {
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

describe('Acceptance 8 / §7, rejection names the quantity and the physical reason', () => {
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

  it('unparseable input is a different code from a physically impossible value', () => {
    /*
     * C1-OUT-03 makes the rejection code machine-readable, and a reader could
     * not tell "the user entered a negative number" from "the user entered
     * something that is not a number" while both reused a §7 code. Those call
     * for different responses: one is a quantity the physics forbids, the other
     * is not a quantity at all.
     *
     * Both are still refusals, and both still name the quantity and the reason.
     */
    const negativeMw = computeConversion({ ...BASE, mwValue: -150 })
    const unreadableMw = computeConversion({ ...BASE, mwValue: Number('150 kDa') })
    const negativeConc = computeConversion({ ...BASE, enteredValue: -1 })
    const unreadableConc = computeConversion({ ...BASE, enteredValue: Number('1,5') })

    for (const o of [negativeMw, unreadableMw, negativeConc, unreadableConc]) expect(o.ok).toBe(false)
    if (negativeMw.ok || unreadableMw.ok || negativeConc.ok || unreadableConc.ok) return

    expect(negativeMw.rejections.map((r) => r.code)).toEqual(['C1-HI-01'])
    expect(unreadableMw.rejections.map((r) => r.code)).toEqual(['C1-AD-01'])
    expect(negativeConc.rejections.map((r) => r.code)).toEqual(['C1-HI-02'])
    expect(unreadableConc.rejections.map((r) => r.code)).toEqual(['C1-AD-02'])

    // The four codes are distinct, which is the whole requirement.
    const codes = [negativeMw, unreadableMw, negativeConc, unreadableConc].flatMap((o) =>
      o.ok ? [] : o.rejections.map((r) => r.code),
    )
    expect(new Set(codes).size).toBe(4)

    // And the unparseable messages tell the user what to do about it, rather
    // than restating that the value is not a number.
    for (const o of [unreadableMw, unreadableConc]) {
      if (o.ok) continue
      expect(o.rejections[0].message).toMatch(/choose the unit beside it/)
    }
  })

  it('zero concentration is legal and is not rejected defensively', () => {
    const outcome = computeConversion({ ...BASE, enteredValue: 0 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.molarValue).toBe(0)
      // It converts to zero, creates no division, and is not refused.
      //
      // It also does NOT raise C1-FL-03. Zero is the absence of solute, not an
      // implausibly low concentration, and "below the range typical of biologic
      // working solutions" is true of zero while saying nothing about it. This
      // test asserted the opposite until v0.2.0, which is how the interaction
      // between two individually-correct requirements survived: §7 makes zero
      // legal, §8 does not exclude it, and the suite recorded the result as
      // intended behaviour.
      expect(outcome.flags.map((f) => f.code)).toContain('C1-FL-10')
      expect(outcome.flags.map((f) => f.code)).not.toContain('C1-FL-03')
    }
  })
})

describe('Acceptance 9 / §8, flags compute a result and carry a reason code', () => {
  it('every flag raised has a machine-readable code and a message', () => {
    const flagged = ok({ ...BASE, provenance: 'not-recorded', massBasis: 'not-recorded', mwValue: 0.5 })
    expect(flagged.flags.length).toBeGreaterThan(0)
    for (const f of flagged.flags) {
      expect(f.code).toMatch(/^C1-FL-(0[1-9]|1[01])$/)
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

describe('Acceptance 13: every mass-basis value behaves as specified', () => {
  const expected: Record<MassBasis, string[]> = {
    assembled: [],
    monomer: ['C1-FL-06'],
    conjugate: ['C1-FL-08'],
    'not-recorded': ['C1-FL-07'],
  }
  // What the output is checked to contain per basis. Not the enum value
  // itself for `monomer`: round 7 reworded MASS_BASIS_LABEL.monomer to drop
  // the word "monomer" entirely, which is the whole point of the ruling, so
  // the check is against a substring of the new label instead.
  const labelSubstring: Record<MassBasis, string> = {
    assembled: 'assembled',
    monomer: 'subunit',
    conjugate: 'conjugate',
    'not-recorded': 'not recorded',
  }

  for (const basis of MASS_BASIS) {
    it(`${basis} raises ${expected[basis].join(', ') || 'no flag'}`, () => {
      const r = ok({ ...BASE, massBasis: basis })
      expect(r.flags.map((f) => f.code)).toEqual(expected[basis])
      // ...and appears on the output.
      expect(r.declarations.massBasis).toBe(basis)
      expect(notebookLine(r)).toContain(labelSubstring[basis])
    })
  }

  it('a single-chain conjugate raises C1-FL-08 and not C1-FL-06', () => {
    // §3.3's consequence, recorded as correct rather than merely safe: the
    // conjugate flag already says what the number refers to.
    const r = ok({ ...BASE, mwValue: 267.7, massBasis: 'conjugate' })
    expect(r.flags.map((f) => f.code)).toEqual(['C1-FL-08'])
  })
})

describe('Acceptance 12: "not recorded" provenance', () => {
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

describe('Acceptance 15 / C1-ST-04, determinism', () => {
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

describe('Acceptance 17 and 18, disclosure', () => {
  it('every threshold is listed with its value and basis, and inspection-chosen ones say so', () => {
    // Named rather than only counted, so that adding a row is a deliberate act
    // and removing one is caught. §11 exists so that no behaviour-determining
    // choice is silent; a register that quietly lost a row would satisfy a
    // count-only assertion for exactly as long as someone added another.
    expect(CONSTANTS_REGISTER.map((t) => t.id)).toEqual([
      'round-trip-tolerance',
      'mw-lower',
      'mw-upper',
      'mw-upper-conjugate',
      'mass-upper',
      'molar-lower',
      'viewport-supported',
      'representability',
      'displayed-precision',
      'reimplementation-tolerance',
      'rounding-mode',
    ])
    for (const t of CONSTANTS_REGISTER) {
      expect(t.value).toBeTruthy()
      expect(t.status).toBeTruthy()
      if (t.basis === 'inspection') expect(t.status.length).toBeGreaterThan(10)
    }
    // The distinction the register exists to draw: what was measured or follows
    // from a standard, against what was chosen by looking at it. Three rows are
    // derived: the round-trip tolerance, the reimplementation tolerance, and
    // the rounding mode. The last two are not thresholds at which the tool
    // changes behaviour, but they are behaviour-determining, and the register
    // exists so that no behaviour-determining choice is silent.
    expect(CONSTANTS_REGISTER.filter((t) => t.basis === 'derived').length).toBe(4)

    // The two tolerances state a requirement and record what was observed
    // against it, so drift from the observed figure stays visible rather than
    // being absorbed by the tolerance.
    for (const id of ['round-trip-tolerance', 'reimplementation-tolerance']) {
      const row = CONSTANTS_REGISTER.find((t) => t.id === id)!
      expect(row.value).toMatch(/ULP/)
      expect(row.status, `${id} records no observed figure`).toMatch(/observed|Observed/)
    }
    expect(CONSTANTS_REGISTER.filter((t) => t.status.includes('Uncharacterised')).length).toBe(5)

    // C1-NF-03 is not met and says so on the page. An unmet requirement that is
    // written down everywhere except where a user would look is the one kind of
    // omission the register cannot allow.
    const deviation = CONSTANTS_REGISTER.find((t) => t.id === 'viewport-supported')!
    expect(deviation.status).toMatch(/ACCEPTED DEVIATION/)
    expect(deviation.status).toMatch(/1012px/)
    expect(deviation.status).toMatch(/open item 15/)
  })

  it('the failure classes the tool cannot detect are enumerated', () => {
    expect(UNDETECTABLE_FAILURES.length).toBe(8)
    for (const f of UNDETECTABLE_FAILURES) expect(f.length).toBeGreaterThan(30)
  })
})

describe('C1-OUT: the output carries what §13 requires', () => {
  it('the relation, the assumptions, the input echo, and the engine version', () => {
    const r = ok(BASE)
    expect(r.relation).toMatch(/molar concentration = mass concentration/)
    expect(r.assumptions.length).toBeGreaterThanOrEqual(3)
    expect(r.engineVersion).toBeTruthy()
    expect(r.statements.precision).toMatch(/6 significant figures/)
    expect(r.statements.scope).toMatch(/not qualified for GxP/i)
    // Content is round 7's own test below; "paratope" alone would still match
    // the pre-round-7 wording and stop discriminating anything.
    expect(r.statements.moleculesNotSites).toBeTruthy()
    expect(r.statements.cleanPanelScope).toBeTruthy()
  })

  it('C1-OUT-02: the weight, its source and its mass basis are in the derivation', () => {
    const r = ok({ ...BASE, provenance: 'mass-spectrometry', massBasis: 'conjugate' })
    const derivation = r.assumptions.join(' ')
    expect(derivation).toMatch(/150 kDa/)
    expect(derivation).toMatch(/mass spectrometry/)
    expect(derivation).toMatch(/conjugate/)
  })

  it('C1-ST-01: a notebook line cannot be produced stripped of its flags', () => {
    const r = ok({ ...BASE, massBasis: 'conjugate', provenance: 'not-recorded' })
    const line = notebookLine(r)
    for (const f of r.flags) expect(line).toContain(f.code)
  })
})

describe("Round 7: NADIRA's rulings, 11 September 2026", () => {
  it('C1-OUT-08 states the principle rather than one construct\'s worked example', () => {
    // True for every construct, false for none: the old wording named a
    // bivalent IgG, which reads verbatim on a result declared monomer or
    // conjugate, where it is not true.
    const r = ok(BASE)
    expect(r.statements.moleculesNotSites).toMatch(/valency/)
    expect(r.statements.moleculesNotSites).not.toMatch(/IgG/)
    expect(r.statements.moleculesNotSites).not.toMatch(/bivalent/i)
  })

  it('C1-FL-04 names its own condition instead of asserting the mass is wrong outright', () => {
    const r = ok({ ...BASE, provenance: 'calculated-from-sequence' })
    const flag = r.flags.find((f) => f.code === 'C1-FL-04')!
    expect(flag.message).toMatch(/where these are present/)
    expect(flag.message).toMatch(/aglycosylated construct the sequence mass is the actual mass/)
    // Expression system is not a safe proxy for format: a Pichia-expressed VHH
    // is glycosylated and a mammalian-expressed BiTE is not aglycosylated by
    // construction, so the flag names neither.
    expect(flag.message).not.toMatch(/E\. coli|Pichia|mammalian|BiTE|VHH/i)
  })

  it('the dilute-solution assumption is deleted outright, not conditioned', () => {
    expect(ok(BASE).assumptions.join(' ')).not.toMatch(/dilute/i)
  })

  it('the solute-volume ambiguity moved to §9 and to C1-FL-02, not onto every result', () => {
    expect(
      UNDETECTABLE_FAILURES.some((f) => /per volume of solution or per volume of solvent/.test(f)),
    ).toBe(true)
    // 300 mg/mL exceeds the 250 mg/mL threshold, so C1-FL-02 fires.
    const r = ok({ ...BASE, enteredValue: 300 })
    const flag = r.flags.find((f) => f.code === 'C1-FL-02')!
    expect(flag.message).toMatch(/solute's own volume/)
    expect(flag.message).toMatch(/per volume of solution or per volume of solvent/)
  })

  it('the mass-basis label describes a part, not a chain count', () => {
    // The old label conflated a subunit of a multi-chain assembly with a
    // natively single-chain construct, for which "assembled" was already
    // correct. The word "monomer" is gone from the label; the enum key is not.
    expect(MASS_BASIS_LABEL.monomer).not.toMatch(/\bmonomer\b/i)
    expect(MASS_BASIS_LABEL.monomer).toMatch(/subunit/)
  })

  it('the clean panel states its own scope once', () => {
    const r = ok(BASE)
    expect(r.flags.length).toBe(0)
    expect(r.statements.cleanPanelScope).toMatch(/right one for this construct/)
  })

  it('C1-NF-06: the engine version moved for round 7\'s text-only changes', () => {
    expect(ok(BASE).engineVersion).toBe('0.5.0')
  })
})
