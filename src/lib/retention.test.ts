import { describe, expect, it } from 'vitest'
import {
  RETAINABLE_FIELDS,
  confirmField,
  retainedOnDirectionChange,
  type RetainableField,
} from './retention'

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
