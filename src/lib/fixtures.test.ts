import { describe, expect, it } from 'vitest'
import { ALL_FIXTURES, BOUNDARY_FIXTURES, CONCENTRATION_BOUNDARY_FIXTURES, FIXTURES } from './fixtures'
import { computeConversion } from './compute'
import { roundTripUlps, withinTolerance } from './invariance'
import { agreesToDisplayedPrecision, isExactTie } from './format'

function run(f: (typeof ALL_FIXTURES)[number]) {
  const outcome = computeConversion(f.request)
  if (!outcome.ok) throw new Error(`${f.id} was rejected: ${outcome.rejections.map((r) => r.message).join('; ')}`)
  return outcome
}

describe('§10 — the fixture set', () => {
  for (const f of ALL_FIXTURES) {
    describe(`${f.id} — ${f.name}`, () => {
      it('raises exactly the specified flags and no others', () => {
        const r = run(f)
        expect(r.flags.map((x) => x.code).sort()).toEqual([...f.expect.flags].sort())
      })

      if (f.expect.displayedMolar !== undefined) {
        it(`displays ${f.expect.displayedMolar} molar`, () => {
          expect(run(f).displayed.molar).toBe(f.expect.displayedMolar)
        })
      }
      if (f.expect.displayedMass !== undefined) {
        it(`displays ${f.expect.displayedMass} mass`, () => {
          expect(run(f).displayed.mass).toBe(f.expect.displayedMass)
        })
      }
    })
  }

  it('C1-FX-08 — every fixture states its construction assumption', () => {
    for (const f of ALL_FIXTURES) {
      expect(f.assumption, `${f.id} has no assumption`).toBeTruthy()
      // A sentence, not a placeholder. An empty-ish assumption would satisfy a
      // truthiness check and defeat the requirement.
      expect(f.assumption.length, `${f.id}'s assumption is too short to be one`).toBeGreaterThan(60)
      expect(f.standard).toBeTruthy()
    }
  })

  it('the set CONTAINS an exact rounding tie', () => {
    // Deliberately the opposite of the guard this replaces.
    //
    // An earlier version of this suite asserted that no fixture lands on a tie.
    // That is the fixture-distribution failure §10 is written against, in the
    // form it is hardest to see: the suite passes by excluding the input class
    // that exposes the ambiguity, and two implementations disagreeing on real
    // user data leave it green. Ties are unit-dependent — 1 g/L at 51.2 kDa is a
    // tie in µM and is not one in M — so they cannot be designed out of the
    // input space, only out of the fixtures, which is worse than useless.
    const ties = ALL_FIXTURES.filter((f) => {
      const r = run(f)
      return isExactTie(r.massValue) || isExactTie(r.molarValue)
    })
    expect(ties.length, 'the fixture set contains no exact tie; C1-UN-06\'s rounding mode is untested').toBeGreaterThan(0)
    expect(ties.some((f) => f.id === 'C1-FX-10')).toBe(true)
  })

  it('the tie is rounded half-to-even, not half-up', () => {
    const f = ALL_FIXTURES.find((x) => x.id === 'C1-FX-10')!
    const r = run(f)
    expect(r.molarValue).toBe(19.53125)
    expect(isExactTie(r.molarValue)).toBe(true)
    expect(r.displayed.molar).toBe('19.5312')
    // The platform default would give the other answer, which is why the
    // rounding mode is implemented rather than inherited.
    expect(r.molarValue.toPrecision(6)).toBe('19.5313')
  })

  it('the set does not share the property that something is always wrong', () => {
    // §10 in terms. The audit is on the set, not on any fixture, so it belongs
    // here rather than in C1-FX-09's own case.
    const clean = ALL_FIXTURES.filter((f) => f.expect.flags.length === 0)
    expect(clean.length).toBeGreaterThan(0)
    expect(ALL_FIXTURES.some((f) => f.id === 'C1-FX-09')).toBe(true)
  })

  it('the set does not share the property of round weights and round concentrations', () => {
    // The defect that made v0.1's cases unrepresentative. Boundary fixtures are
    // exempt: their values are round precisely because they have to land on a
    // threshold exactly.
    const nonRound = FIXTURES.filter(
      (f) => !Number.isInteger(f.request.mwValue) || !Number.isInteger(f.request.enteredValue),
    )
    expect(nonRound.length).toBeGreaterThanOrEqual(FIXTURES.length / 2)
  })
})

describe('C1-FX-09 — the negative control', () => {
  const f = FIXTURES.find((x) => x.id === 'C1-FX-09')!

  it('raises no flags, in both conversion directions (acceptance 9a)', () => {
    const forward = run(f)
    expect(forward.flags).toEqual([])

    // The same case entered from the other side: take the computed molar value
    // and convert it back. §8's conditions are evaluated on the computed system,
    // so a flag rule that reads the entered field rather than the quantity would
    // pass forward and fail here.
    const reverse = computeConversion({
      ...f.request,
      direction: 'molar-to-mass',
      enteredValue: forward.molarValue,
    })
    expect(reverse.ok).toBe(true)
    if (reverse.ok) expect(reverse.flags).toEqual([])
  })

  it('sits well inside every bound rather than just inside one', () => {
    // If the negative control sat just under a threshold it would pass for the
    // wrong reason and would start failing the moment a boundary operator was
    // corrected.
    const r = run(f)
    expect(r.massValue).toBeLessThan(250 / 10)
    expect(r.molarValue * 1e-6).toBeGreaterThan(1e-12 * 1e6)
    expect(r.declarations.mwValue).toBeGreaterThan(1000 * 10)
    expect(r.declarations.mwValue).toBeLessThan(1_000_000 / 2)
  })
})

describe('C1-FX-02 / C1-IV-03 — g/mol and kDa agree to displayed precision', () => {
  it('the two arms of the pair display identically', () => {
    const gmol = run(FIXTURES.find((f) => f.id === 'C1-FX-01')!)
    const kda = run(FIXTURES.find((f) => f.id === 'C1-FX-02')!)
    expect(kda.displayed.molar).toBe(gmol.displayed.molar)
    expect(agreesToDisplayedPrecision(gmol.molarValue, kda.molarValue)).toBe(true)
  })

  it('and are not required to agree bit-exactly', () => {
    // §6 records bit-exactness as unusable. This asserts the standard actually
    // applied is the displayed one, so that a future change to bit-equality
    // would be a visible decision rather than a silent tightening.
    const gmol = run(FIXTURES.find((f) => f.id === 'C1-FX-01')!)
    const kda = run(FIXTURES.find((f) => f.id === 'C1-FX-02')!)
    expect(agreesToDisplayedPrecision(gmol.molarValue, kda.molarValue)).toBe(true)
    // Whether these two particular values happen to be bit-equal is not asserted
    // either way; the standard is displayed precision and nothing else.
    expect(typeof gmol.molarValue).toBe('number')
  })
})

describe('C1-FX-03 — round trip', () => {
  it('returns the input to within 1 ULP', () => {
    const f = FIXTURES.find((x) => x.id === 'C1-FX-03')!
    const u = roundTripUlps({
      massValue: f.request.enteredValue,
      mwValue: f.request.mwValue,
      units: f.request.units,
    })
    expect(withinTolerance(u)).toBe(true)
  })
})

describe('C1-FX-04 — boundaries in both conversion directions', () => {
  it('covers every §8 threshold, either side and exactly on it', () => {
    const covered = [...BOUNDARY_FIXTURES, ...CONCENTRATION_BOUNDARY_FIXTURES]
    // Four thresholds; each needs an on-the-bound case and at least one case on
    // each side of it.
    expect(covered.length).toBeGreaterThanOrEqual(12)
    expect(covered.some((f) => f.request.direction === 'mass-to-molar')).toBe(true)
    expect(covered.some((f) => f.request.direction === 'molar-to-mass')).toBe(true)
  })

  it('a value exactly on a threshold never flags — the operators are strict', () => {
    const onBound = ['C1-FX-04b', 'C1-FX-04e', 'C1-FX-04g', 'C1-FX-04i', 'C1-FX-04k', 'C1-FX-04m']
    for (const id of onBound) {
      const f = [...BOUNDARY_FIXTURES, ...CONCENTRATION_BOUNDARY_FIXTURES].find((x) => x.id === id)!
      expect(run(f).flags, `${id} flagged while sitting exactly on its threshold`).toEqual([])
    }
  })
})
