import { describe, expect, it } from 'vitest'
import {
  NUDGE_FACTOR,
  ROUND_TRIP_TOLERANCE_ULP,
  clampedPath,
  correctPath,
  flooredPath,
  nudgedPath,
  roundTripUlps,
  stepwisePath,
  ulpsBetween,
  withinTolerance,
  type ConversionPath,
  type RoundTripCase,
} from './invariance'
import { REALISTIC_CASES, generateCases } from './corpus'

const CASES: RoundTripCase[] = [...REALISTIC_CASES, ...generateCases(20000)]

/** Worst round-trip error over the corpus, and where it occurred. */
function worst(path: ConversionPath) {
  let worstUlps = 0
  let worstCase: RoundTripCase | null = null
  let breaches = 0
  let saturated = 0
  for (const c of CASES) {
    const u = roundTripUlps(c, path)
    if (!withinTolerance(u)) breaches++
    if (u === ROUND_TRIP_TOLERANCE_ULP) saturated++
    if (u > worstUlps) {
      worstUlps = u
      worstCase = c
    }
  }
  return { worstUlps, worstCase, breaches, saturated, total: CASES.length }
}

describe('C1-IV-01 — round-trip invariance', () => {
  it('returns the input to within 1 ULP over the whole corpus', () => {
    const { worstUlps, breaches, total } = worst(correctPath)
    expect(breaches, `${breaches} of ${total} cases exceeded ${ROUND_TRIP_TOLERANCE_ULP} ULP`).toBe(0)
    expect(worstUlps).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE_ULP)
  })

  it('saturates the bound, which is why the comparison is <= and not <', () => {
    // §6: the worst observed round-trip error is exactly 1.0 ULP, so a strict
    // `<` fails on correct code. This asserts the saturation rather than
    // trusting it: if a future change made the bound un-saturated, the operator
    // could be tightened, and this test is what would say so.
    const { saturated, total } = worst(correctPath)
    expect(saturated, 'no case reached exactly 1 ULP; the <= is no longer load-bearing').toBeGreaterThan(0)
    // Not a small corner of the corpus.
    expect(saturated / total).toBeGreaterThan(0.001)
  })

  it('a strict < would reject correct code', () => {
    const strictFailures = CASES.filter((c) => !(roundTripUlps(c, correctPath) < ROUND_TRIP_TOLERANCE_ULP))
    expect(strictFailures.length).toBeGreaterThan(0)
  })
})

/**
 * C1-IV-02.
 *
 * Two things are demonstrated for each defect, and the second is the one that
 * is easy to skip: that the test catches it, AND that the error it introduces
 * exceeds 1 ULP. Without the second, a defect could be "caught" by a test whose
 * tolerance was too tight rather than by the defect being real, and the
 * tolerance would have disabled the test without anyone noticing.
 */
describe('C1-IV-02 — the invariance test is confirmed capable of failing', () => {
  const defects: { name: string; path: ConversionPath }[] = [
    { name: 'clamp', path: clampedPath(1e3) },
    { name: 'floor', path: flooredPath(1e-9) },
    { name: 'nudge', path: nudgedPath() },
  ]

  for (const { name, path } of defects) {
    describe(`inserted ${name}`, () => {
      it('is detected — the round-trip test fails', () => {
        const { breaches } = worst(path)
        expect(breaches, `the inserted ${name} was not detected by the invariance test`).toBeGreaterThan(0)
      })

      it('exceeds 1 ULP, so the tolerance has not disabled the test', () => {
        const { worstUlps } = worst(path)
        expect(worstUlps).toBeGreaterThan(ROUND_TRIP_TOLERANCE_ULP)
      })
    })
  }

  it('the nudge is invisible at displayed precision — which is what the ULP bound is for', () => {
    // A relative error of 2^-50 changes no digit anyone sees. Six significant
    // figures cannot detect it and is not supposed to: this is the class of
    // defect the invariance test exists to catch, and the demonstration that
    // the two checks are not redundant.
    const c = REALISTIC_CASES[1]
    const clean = correctPath.massToMolar(c.massValue, c.mwValue, c.units)
    const nudged = clean * NUDGE_FACTOR
    expect(nudged.toPrecision(6)).toBe(clean.toPrecision(6))
    expect(ulpsBetween(clean, nudged)).toBeGreaterThan(ROUND_TRIP_TOLERANCE_ULP)
  })

  it('a defect that bites nowhere in the corpus would not be counted as detected', () => {
    // The guard on the guard. A clamp set above every value in the corpus is
    // undetectable, and the test says so rather than reporting a pass. This is
    // what makes the three demonstrations above mean something.
    const inertClamp = clampedPath(Number.MAX_VALUE)
    expect(worst(inertClamp).breaches).toBe(0)
  })
})

describe('the stepwise unit-normalisation path — regression guard', () => {
  it('breaches the tolerance, which is why the folded divisor is used', () => {
    const { breaches, worstUlps, total } = worst(stepwisePath())
    expect(breaches).toBeGreaterThan(0)
    expect(worstUlps).toBeGreaterThan(ROUND_TRIP_TOLERANCE_ULP)
    // Roughly one case in two hundred, so it is not something a small corpus
    // would reliably have found.
    expect(breaches / total).toBeGreaterThan(0.0005)
  })
})
