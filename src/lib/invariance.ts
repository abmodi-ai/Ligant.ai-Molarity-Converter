/**
 * The round-trip invariance harness, and the defects used to confirm it can
 * fail.
 *
 * C1-IV-02 requires the invariance test to be confirmed capable of failing, by
 * inserting a clamp, a floor and a nudge into the conversion path and
 * demonstrating that each is detected. A test that has never been shown to fail
 * is not evidence, so the defective conversions live here as real code the test
 * runs, rather than as a description of an experiment someone once did.
 */

import { effectiveMw, type ConversionUnits } from './convert'
import { MASS_TO_G_PER_L as MASS_FACTOR, MOLAR_TO_MOL_PER_L as MOLAR_FACTOR, MW_TO_G_PER_MOL as MW_FACTOR } from './units'

/**
 * Units in the last place between two doubles.
 *
 * Measured against the larger magnitude, so the count does not change depending
 * on which value is called the expected one. Returns Infinity when the two sit
 * either side of a sign change or one is not finite, so a defect can never look
 * small by accident.
 */
export function ulpsBetween(a: number, b: number): number {
  if (a === b) return 0
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity
  const magnitude = Math.max(Math.abs(a), Math.abs(b))
  const ulp = ulpOf(magnitude)
  if (ulp === 0) return Infinity
  return Math.abs(a - b) / ulp
}

/** The spacing of doubles at `x`. */
export function ulpOf(x: number): number {
  const a = Math.abs(x)
  if (a === 0) return Number.MIN_VALUE
  if (!Number.isFinite(a)) return Infinity
  const next = nextUp(a)
  return next - a
}

function nextUp(x: number): number {
  const buf = new DataView(new ArrayBuffer(8))
  buf.setFloat64(0, x)
  const bits = buf.getBigUint64(0)
  buf.setBigUint64(0, bits + 1n)
  return buf.getFloat64(0)
}

/** A conversion path, so a defective one can be substituted for the real one. */
export interface ConversionPath {
  massToMolar(massValue: number, mwValue: number, units: ConversionUnits): number
  molarToMass(molarValue: number, mwValue: number, units: ConversionUnits): number
}

/** The real path. One division, one multiplication, against an identical divisor. */
export const correctPath: ConversionPath = {
  massToMolar: (massValue, mwValue, units) => massValue / effectiveMw(mwValue, units),
  molarToMass: (molarValue, mwValue, units) => molarValue * effectiveMw(mwValue, units),
}

export interface RoundTripCase {
  massValue: number
  mwValue: number
  units: ConversionUnits
}

/**
 * Convert out and back, and report how far the returned value sits from the
 * one that went in.
 *
 * C1-IV-01 is a tolerance on the unrounded value, so nothing here rounds.
 */
export function roundTripUlps(c: RoundTripCase, path: ConversionPath = correctPath): number {
  const molar = path.massToMolar(c.massValue, c.mwValue, c.units)
  const back = path.molarToMass(molar, c.mwValue, c.units)
  return ulpsBetween(c.massValue, back)
}

/** The tolerance, and the operator. §6: the bound is saturated, so `≤` not `<`. */
export const ROUND_TRIP_TOLERANCE_ULP = 1

export function withinTolerance(ulps: number): boolean {
  return ulps <= ROUND_TRIP_TOLERANCE_ULP
}

// ---------------------------------------------------------------------------
// The three inserted defects.
//
// Each is a plausible thing a developer writes for a reason that sounds good at
// the time, not a random corruption. That is what makes them worth inserting:
// a defect nobody would write proves nothing about a test's sensitivity.
// ---------------------------------------------------------------------------

/**
 * A clamp. "Nothing sensible is above this, so cap it."
 *
 * Bites only on large molar values, which is why the corpus has to span
 * magnitudes for the test to catch it at all.
 */
export function clampedPath(ceiling: number): ConversionPath {
  return {
    massToMolar: (m, mw, u) => Math.min(correctPath.massToMolar(m, mw, u), ceiling),
    molarToMass: correctPath.molarToMass,
  }
}

/**
 * A floor. "Values this small are numerical noise, so flush them."
 *
 * The shape of a denormal guard, and the reason C1-FL-03 flags rather than
 * rejects a very low concentration: a real 0.5 pM solution is not noise.
 */
export function flooredPath(floor: number): ConversionPath {
  return {
    massToMolar: (m, mw, u) => {
      const v = correctPath.massToMolar(m, mw, u)
      return Math.abs(v) < floor ? 0 : v
    },
    molarToMass: correctPath.molarToMass,
  }
}

/**
 * A nudge. A relative scaling error of the size a slightly wrong constant, or
 * an extra normalisation step, would introduce.
 *
 * 2^-50 is four times the double epsilon: far too small to see at six
 * significant figures, and far too large to pass a 1 ULP round-trip bound.
 * That gap is the point of the invariance test.
 */
export const NUDGE_FACTOR = 1 + Math.pow(2, -50)

export function nudgedPath(factor: number = NUDGE_FACTOR): ConversionPath {
  return {
    massToMolar: (m, mw, u) => correctPath.massToMolar(m, mw, u) * factor,
    molarToMass: correctPath.molarToMass,
  }
}

/**
 * The stepwise unit-normalisation path, a fourth defect, and the only one that
 * was not inserted deliberately.
 *
 * This is the obvious implementation of the correct formula: normalise the
 * concentration to a base unit, divide by the molecular weight, denormalise to
 * the output unit. It computes the right answer to six significant figures and
 * breaches the round-trip tolerance in about one case in two hundred, because
 * the powers of ten among the unit factors are not exactly representable in
 * binary and are applied twice rather than cancelling.
 *
 * Kept as a permanent regression guard, not as a curiosity: it is what C1 would
 * have shipped if the tolerance had been treated as a test to satisfy rather
 * than as a bound the implementation has to earn.
 */
export function stepwisePath(): ConversionPath {
  return {
    massToMolar: (massValue, mwValue, units) => {
      const gPerL = massValue * MASS_FACTOR[units.mass]
      const molPerL = gPerL / (mwValue * MW_FACTOR[units.mw])
      return molPerL / MOLAR_FACTOR[units.molar]
    },
    molarToMass: (molarValue, mwValue, units) => {
      const molPerL = molarValue * MOLAR_FACTOR[units.molar]
      const gPerL = molPerL * (mwValue * MW_FACTOR[units.mw])
      return gPerL / MASS_FACTOR[units.mass]
    },
  }
}
