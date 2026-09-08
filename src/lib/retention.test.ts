import { describe, expect, it } from 'vitest'
import {
  RETAINABLE_FIELDS,
  confirmField,
  retainedOnDirectionChange,
  type RetainableField,
} from './retention'
import { computeConversion, notebookLine, type ConversionRequest } from './compute'

const FILLED = { mw: '150', provenance: 'certificate-of-analysis', massBasis: 'assembled' }

/**
 * The test that would have caught the original defect.
 *
 * The first implementation was a single boolean. Every assertion below that
 * names one field while asserting about another fails against it, which is the
 * only useful definition of "would have caught".
 */
describe('C1-ST-03 — retention is marked per field', () => {
  it('every declaration holding a value is marked when the direction changes', () => {
    expect([...retainedOnDirectionChange(FILLED)].sort()).toEqual(['massBasis', 'mw', 'provenance'])
  })

  it('confirming one declaration leaves the others marked', () => {
    // The three-step sequence from the conformance audit, as data. Under the
    // single boolean the second expectation was an empty set.
    const afterSwitch = retainedOnDirectionChange(FILLED)
    const afterConfirmingTheWeight = confirmField(afterSwitch, 'mw')

    expect(afterConfirmingTheWeight.has('mw')).toBe(false)
    expect(afterConfirmingTheWeight.has('provenance')).toBe(true)
    expect(afterConfirmingTheWeight.has('massBasis')).toBe(true)
  })

  it('each field clears only itself, whichever one is confirmed first', () => {
    for (const field of RETAINABLE_FIELDS) {
      const next = confirmField(retainedOnDirectionChange(FILLED), field)
      expect(next.has(field), `confirming ${field} did not clear ${field}`).toBe(false)
      for (const other of RETAINABLE_FIELDS.filter((f) => f !== field)) {
        expect(next.has(other), `confirming ${field} also cleared ${other}`).toBe(true)
      }
    }
  })

  it('confirming all three in any order ends with nothing marked', () => {
    const orders: RetainableField[][] = [
      ['mw', 'provenance', 'massBasis'],
      ['massBasis', 'mw', 'provenance'],
      ['provenance', 'massBasis', 'mw'],
    ]
    for (const order of orders) {
      let set = retainedOnDirectionChange(FILLED)
      for (const f of order) set = confirmField(set, f)
      expect(set.size, `order ${order.join(',')} left ${[...set].join(',')} marked`).toBe(0)
    }
  })

  it('a field holding nothing is never marked', () => {
    // The second facet of the defect: the boolean badged all three labels, so
    // filling only the weight and switching direction marked two empty selects
    // as "retained — confirm". A badge on an empty field teaches the user that
    // the badge means nothing.
    expect([...retainedOnDirectionChange({ mw: '150', provenance: '', massBasis: '' })]).toEqual(['mw'])
    expect([...retainedOnDirectionChange({ mw: '  ', provenance: 'vendor-datasheet', massBasis: '' })]).toEqual([
      'provenance',
    ])
    expect(retainedOnDirectionChange({ mw: '', provenance: '', massBasis: '' }).size).toBe(0)
  })

  it('the retainable set is the three declarations and not the entered concentration', () => {
    // The entered value is cleared on a direction change rather than retained:
    // its unit changes what it measures across the swap, so carrying it is the
    // paste defect and marking it would be beside the point.
    expect([...RETAINABLE_FIELDS].sort()).toEqual(['massBasis', 'mw', 'provenance'])
  })

  it('the returned set is a copy — confirming does not mutate the previous state', () => {
    const afterSwitch = retainedOnDirectionChange(FILLED)
    confirmField(afterSwitch, 'mw')
    expect(afterSwitch.has('mw')).toBe(true)
  })
})

describe('C1-FL-09 — retention reaches the result, not only the form', () => {
  const BASE: ConversionRequest = {
    direction: 'molar-to-mass',
    enteredValue: 8.42733,
    mwValue: 148327,
    provenance: 'certificate-of-analysis',
    massBasis: 'assembled',
    units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
  }

  function ok(r: ConversionRequest) {
    const o = computeConversion(r)
    if (!o.ok) throw new Error(o.rejections.map((x) => x.message).join('; '))
    return o
  }

  it('a clean case with nothing retained raises nothing and says "as declared"', () => {
    const r = ok(BASE)
    expect(r.flags).toEqual([])
    expect(r.assumptions.join(' ')).toContain('as declared')
    expect(r.assumptions.join(' ')).not.toMatch(/retained/i)
    // Always recorded, never implied by absence.
    expect(r.declarations.retained).toEqual({ mw: false, provenance: false, massBasis: false })
  })

  it('a retained declaration raises C1-FL-09 without blocking the calculation', () => {
    const r = ok({ ...BASE, retained: { mw: true, provenance: false, massBasis: false } })
    expect(r.flags.map((f) => f.code)).toEqual(['C1-FL-09'])
    // Commitment 3, not commitment 2: the value is present and valid, only its
    // re-affirmation is missing, so a number is still produced.
    expect(Number.isFinite(r.massValue)).toBe(true)
    expect(r.displayed.mass).toBeTruthy()
  })

  it('the flag is its own kind, so the threshold caveat is not shown beside it', () => {
    const r = ok({ ...BASE, retained: { mw: true, provenance: true, massBasis: true } })
    const flag = r.flags.find((f) => f.code === 'C1-FL-09')!
    expect(flag.kind).toBe('retention')
    expect(flag.evaluatedOn).toBe('retention state')
    expect(r.flags.some((f) => f.kind === 'threshold')).toBe(false)
  })

  it('the message names which declarations were carried', () => {
    const one = ok({ ...BASE, retained: { mw: true, provenance: false, massBasis: false } })
    expect(one.flags[0].message).toMatch(/^The molecular weight was retained/)
    expect(one.flags[0].message).not.toMatch(/mass basis/)

    const two = ok({ ...BASE, retained: { mw: true, provenance: false, massBasis: true } })
    expect(two.flags[0].message).toMatch(/molecular weight and the mass basis were retained/)
    expect(two.flags[0].message).not.toMatch(/its source/)
  })

  it('the derivation stops claiming "as declared" for a carried value', () => {
    // The defect this closes: arithmetically correct, provenance misrepresented.
    // A line copied into a notebook asserted a declaration the user never made
    // in this direction.
    const r = ok({ ...BASE, retained: { mw: true, provenance: true, massBasis: false } })
    const [weight, source, basis] = r.assumptions

    expect(weight).toContain('retained from the previous conversion direction, not re-confirmed')
    expect(weight).not.toContain('as declared')
    expect(source).toContain('retained from the previous conversion direction, not re-confirmed')
    // The re-confirmed field is untouched — the wording is per field, like the badge.
    expect(basis).not.toMatch(/retained/i)
  })

  it('C1-ST-01 — the notebook line carries the retention flag', () => {
    const r = ok({ ...BASE, retained: { mw: true, provenance: false, massBasis: false } })
    expect(notebookLine(r)).toContain('C1-FL-09')
  })
})

describe('C1-FL-10 — zero is the absence of solute, not a low concentration', () => {
  const ZERO: ConversionRequest = {
    direction: 'mass-to-molar',
    enteredValue: 0,
    mwValue: 148327,
    provenance: 'certificate-of-analysis',
    massBasis: 'assembled',
    units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
  }

  it('raises C1-FL-10 and not C1-FL-03', () => {
    const o = computeConversion(ZERO)
    expect(o.ok).toBe(true)
    if (!o.ok) return
    expect(o.flags.map((f) => f.code)).toEqual(['C1-FL-10'])
    expect(o.displayed.molar).toBe('0.00000')
  })

  it('in both conversion directions', () => {
    const reverse = computeConversion({ ...ZERO, direction: 'molar-to-mass' })
    expect(reverse.ok).toBe(true)
    if (reverse.ok) expect(reverse.flags.map((f) => f.code)).toEqual(['C1-FL-10'])
  })

  it('a genuinely tiny concentration still raises C1-FL-03', () => {
    // The distinction the two-quantity test protects. This is not empty; it is
    // implausibly low, which is exactly what C1-FL-03 is for.
    const tiny = computeConversion({ ...ZERO, enteredValue: 1e-13 })
    expect(tiny.ok).toBe(true)
    if (!tiny.ok) return
    expect(tiny.flags.map((f) => f.code)).toContain('C1-FL-03')
    expect(tiny.flags.map((f) => f.code)).not.toContain('C1-FL-10')
  })
})
