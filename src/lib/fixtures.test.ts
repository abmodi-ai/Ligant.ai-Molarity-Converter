import { describe, expect, it } from 'vitest'
import {
  ALL_FIXTURES,
  BOUNDARY_FIXTURES,
  CONCENTRATION_BOUNDARY_FIXTURES,
  FIXTURES,
  type BoundarySide,
  type ThresholdId,
} from './fixtures'
import { computeConversion } from './compute'
import { BOUNDARY_THRESHOLDS, CONSTANTS_REGISTER } from './flags'
import { roundTripUlps, withinTolerance } from './invariance'
import { agreesToDisplayedPrecision, isExactTie } from './format'

function run(f: (typeof ALL_FIXTURES)[number]) {
  const outcome = computeConversion(f.request)
  if (!outcome.ok) throw new Error(`${f.id} was rejected: ${outcome.rejections.map((r) => r.message).join('; ')}`)
  return outcome
}

describe('§10: the fixture set', () => {
  for (const f of ALL_FIXTURES) {
    describe(`${f.id}: ${f.name}`, () => {
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

  it('C1-FX-08: every fixture states its construction assumption', () => {
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
    // user data leave it green. Ties are unit-dependent: 1 g/L at 51.2 kDa is a
    // tie in µM and is not one in M, so they cannot be designed out of the
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

describe('C1-FX-09: the negative control', () => {
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

describe('C1-FX-02 / C1-IV-03, g/mol and kDa agree to displayed precision', () => {
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

describe('C1-FX-03: round trip', () => {
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

describe('C1-FX-03b / C1-FX-14, the subnormal regime', () => {
  /*
   * The bound cannot apply where the value is not representable, so these
   * fixtures assert the DOCUMENTED BEHAVIOUR and say which. A test that quietly
   * loosened the tolerance to accommodate this would be the second family in
   * docs/correspondence.md, run backwards.
   */
  const rt = (id: string) => {
    const f = FIXTURES.find((x) => x.id === id)!
    return roundTripUlps({ massValue: f.request.enteredValue, mwValue: f.request.mwValue, units: f.request.units })
  }

  it('an output unit that cannot hold the value loses it entirely, not by 1 ULP', () => {
    const ulps = rt('C1-FX-03b')
    // Documented, not tolerated: this is total loss of the value, and calling
    // it a rounding difference would be the more dangerous description.
    expect(withinTolerance(ulps)).toBe(false)
    expect(ulps).toBeGreaterThan(1000)
    expect(run(FIXTURES.find((x) => x.id === 'C1-FX-03b')!).molarValue).toBe(0)
  })

  it('an output unit that holds the value round-trips exactly, so the regime is not the fault', () => {
    expect(rt('C1-FX-14')).toBe(0)
    expect(run(FIXTURES.find((x) => x.id === 'C1-FX-14')!).molarValue).toBeGreaterThan(0)
  })

  it('neither raises C1-FL-10: the entered quantity is not zero', () => {
    for (const id of ['C1-FX-03b', 'C1-FX-14']) {
      const codes = run(FIXTURES.find((x) => x.id === id)!).flags.map((f) => f.code)
      expect(codes, id).toContain('C1-FL-03')
      expect(codes, id).not.toContain('C1-FL-10')
    }
  })

  it('the record marks the zero that is not the value', () => {
    const lost = run(FIXTURES.find((x) => x.id === 'C1-FX-03b')!)
    const held = run(FIXTURES.find((x) => x.id === 'C1-FX-14')!)
    expect(lost.underflow.molarConcentration).toBe(true)
    expect(held.underflow.molarConcentration).toBe(false)
    expect(lost.underflow.massConcentration).toBe(false)
  })
})

describe('C1-FX-04: boundaries in both conversion directions', () => {
  /*
   * Both lists are DERIVED, and that is the fix rather than a tidy-up.
   *
   * The fixtures are every fixture that declares a boundary, not three named
   * arrays; the thresholds are every register row marked for boundary
   * coverage, not four names retyped here. The previous version hardcoded the
   * four, which is why representability could be added to the register, to the
   * failure-class list and to the documentation while this guard went on
   * reporting complete coverage. A guard cannot report a threshold it was
   * never told exists, and the register solved that class already by
   * rendering from the constants the flag rules read.
   */
  const covered = ALL_FIXTURES.filter((f) => f.boundary !== undefined)
  const THRESHOLDS: readonly ThresholdId[] = BOUNDARY_THRESHOLDS
  const SIDES: BoundarySide[] = ['below', 'on', 'above']
  const DIRECTIONS = ['mass-to-molar', 'molar-to-mass'] as const

  it('every boundary fixture declares which threshold it is about and where it sits', () => {
    // Without this, the coverage assertion below could be satisfied by a
    // fixture that forgot its metadata and was therefore counted nowhere.
    for (const f of covered) {
      expect(f.boundary, `${f.id} declares no threshold`).toBeDefined()
    }
  })

  it('covers every §8 threshold, on every side, in BOTH conversion directions', () => {
    // The guard this replaces asserted `covered.length >= 12`, plus "at least
    // one fixture of each direction" across the whole set. Both are set-level
    // properties standing in for a per-threshold one, and both passed while the
    // two molecular-weight bounds were exercised in `mass-to-molar` only, the
    // §I failure mode from docs/correspondence.md, occurring inside the guard
    // written to prevent it.
    //
    // Every combination is required, and the failure message names the ones
    // missing rather than reporting a count that is one too small.
    const missing: string[] = []
    for (const threshold of THRESHOLDS) {
      for (const direction of DIRECTIONS) {
        for (const side of SIDES) {
          const hits = covered.filter(
            (f) =>
              f.boundary?.threshold === threshold &&
              f.boundary.side === side &&
              f.request.direction === direction,
          )
          if (hits.length === 0) missing.push(`${threshold} / ${side} / ${direction}`)
        }
      }
    }
    expect(missing, `C1-FX-04 does not cover: ${missing.join(', ')}`).toEqual([])
  })

  it("the derived threshold list is the register's, not a copy of it", () => {
    // If this ever fails, a register row was added or removed without the
    // fixture set following, which is the state the hardcoded list allowed.
    expect([...THRESHOLDS].sort()).toEqual(
      CONSTANTS_REGISTER.filter((t) => t.boundaryCoverage).map((t) => t.id).sort(),
    )
    expect(THRESHOLDS).toContain('representability')
  })

  it('representability is asserted on the marker, because its flags cannot tell the sides apart', () => {
    const rep = covered.filter((f) => f.boundary?.threshold === 'representability')
    expect(rep.length).toBe(6)
    // Identical flags on every side, so a fixture asserting only flags would be
    // inert here. That is what the `underflowed` expectation is for.
    const flagSets = new Set(rep.map((f) => [...f.expect.flags].sort().join(',')))
    expect(flagSets.size).toBe(1)
    for (const f of rep) {
      expect(f.expect.underflowed, `${f.id} declares no underflow expectation`).toBeTypeOf('boolean')
      const r = run(f)
      expect(r.underflow.molarConcentration || r.underflow.massConcentration, f.id).toBe(f.expect.underflowed)
    }
  })

  it('a value exactly on a threshold never flags, the operators are strict', () => {
    // Selected by metadata rather than by a hand-maintained list of ids: a list
    // is a second place to forget a fixture, and forgetting one there makes the
    // suite quieter rather than redder.
    /*
     * Asserted on the threshold's OWN flag, not on the flag set being empty.
     *
     * That distinction only became visible with the conditional bound. A
     * conjugate sitting exactly on its 2000 kDa ceiling raises C1-FL-08,
     * because the declaration that raises the ceiling is the declaration that
     * raises the flag. "No flags at all" was never the property; it happened to
     * hold while every boundary fixture was declared assembled, which is the
     * fixture-distribution pattern reappearing in an assertion rather than in a
     * set.
     */
    const OWN_FLAG: Partial<Record<ThresholdId, string>> = {
      'mw-lower': 'C1-FL-01',
      'mw-upper': 'C1-FL-01',
      'mw-upper-conjugate': 'C1-FL-01',
      'mass-upper': 'C1-FL-02',
      'molar-lower': 'C1-FL-03',
    }
    // Representability is excluded: it is not a plausibility bound and has no
    // flag of its own, so "on the bound does not flag" is not a claim about it.
    const onBound = covered.filter(
      (f) => f.boundary?.side === 'on' && f.boundary.threshold !== 'representability',
    )
    expect(onBound.length, 'five §8 bounds in two directions is ten on-the-bound cases').toBe(10)
    for (const f of onBound) {
      const own = OWN_FLAG[f.boundary!.threshold]!
      expect(own, `${f.boundary!.threshold} has no flag mapped`).toBeTruthy()
      expect(
        run(f).flags.map((x) => x.code),
        `${f.id} raised ${own} while sitting exactly on its threshold`,
      ).not.toContain(own)
    }
  })

  it('the molecular-weight bounds flag identically from either direction', () => {
    // C1-FL-01 reads the declared weight and no direction enters the
    // comparison, so this cannot fail without something quite serious having
    // changed. That is exactly why it is asserted rather than assumed: it is
    // the claim under which the single-direction fixtures were acceptable, and
    // it was never written down.
    for (const f of BOUNDARY_FIXTURES.filter((x) => x.request.direction === 'mass-to-molar')) {
      const reverse = BOUNDARY_FIXTURES.find((x) => x.id === `${f.id}-rev`)!
      expect(run(reverse).flags.map((x) => x.code), `${f.id} and its reverse disagree`).toEqual(
        run(f).flags.map((x) => x.code),
      )
    }
  })
})

describe('C1-FX-04m / C1-FX-04n, a flagged and an unflagged result that display identically', () => {
  // Recorded as correct, deliberately, because it reads as a bug.
  //
  // §8 evaluates its conditions on the computed system, which is the unrounded
  // value. C1-UN-06 renders six significant figures. A molar concentration one
  // ULP below 1 pM satisfies "< 1 pM" and rounds to 1.00000; one exactly at
  // 1 pM does not satisfy it and also rounds to 1.00000. Neither requirement is
  // wrong and the pair is not a contradiction, but nothing in the suite said
  // so, and the next person to read it would reasonably file a defect.
  const on = CONCENTRATION_BOUNDARY_FIXTURES.find((f) => f.id === 'C1-FX-04m')!
  const below = CONCENTRATION_BOUNDARY_FIXTURES.find((f) => f.id === 'C1-FX-04n')!

  it('render identically', () => {
    expect(run(on).displayed.molar).toBe('1.00000')
    expect(run(below).displayed.molar).toBe('1.00000')
  })

  it('but differ in the unrounded value and therefore in the flag', () => {
    expect(run(on).molarValue).toBe(1)
    expect(run(below).molarValue).toBeLessThan(1)
    expect(run(on).flags.map((f) => f.code)).toEqual([])
    expect(run(below).flags.map((f) => f.code)).toEqual(['C1-FL-03'])
  })

  it('and the output says so wherever a threshold flag appears', () => {
    const r = run(below)
    expect(r.flags.some((f) => f.kind === 'threshold')).toBe(true)
    expect(r.statements.thresholdEvaluation).toMatch(/unrounded value/i)
    expect(r.statements.thresholdEvaluation).toMatch(/display identically/i)
  })

  it('declaration flags carry no such caveat, and are marked as a different kind', () => {
    // C1-FL-05 through C1-FL-08 read a declaration the user selected; there is
    // no rounding between the input and the condition, so the statement above
    // would be noise on them.
    const declarationOnly = run(FIXTURES.find((f) => f.id === 'C1-FX-05')!)
    expect(declarationOnly.flags.every((f) => f.kind === 'declaration')).toBe(true)
  })
})
