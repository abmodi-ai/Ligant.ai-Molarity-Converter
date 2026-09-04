/**
 * Display formatting.
 *
 * C1-UN-06: results are displayed to six significant figures, rounded
 * half-to-even, and the displayed precision is stated on the output
 * (C1-OUT-07). Six is confirmed rather than assumed — see
 * docs/open-item-07-displayed-precision.md.
 *
 * ON THE ROUNDING MODE. JavaScript's `toPrecision` resolves a tie to the larger
 * candidate — round-half-up. That is not what this tool does. Half-to-even is
 * the IEEE 754 default and the default in Python, R and Julia, so an
 * independent reimplementation agrees without being told; and being told is
 * exactly what compromises the independence acceptance test 3 depends on. It is
 * also unbiased under repeated rounding, where half-up drifts upward.
 *
 * Ties are unit-dependent and cannot be designed out of the input space. 1 g/L
 * at 51.2 kDa is exactly 19.53125 µM — a tie — and the same result expressed in
 * M is 1.9531250000000000406e-5, which is not one and rounds up under any rule.
 * The reagent is ordinary; only the output unit decides. That is why the rule
 * has to be named rather than avoided.
 *
 * This is deliberately not the Antigen Density Calculator's `formatNumber`,
 * which is magnitude-adaptive because its quantity is always in one unit. C1's
 * quantity spans eleven decades by unit selection alone, so a fixed
 * significant-figure count is the only rule that means the same thing at every
 * magnitude.
 */

/** C1-UN-06. The one place the number six is written down. */
export const DISPLAY_SIG_FIGS = 6

/** §11. The rounding mode is behaviour-determining and is therefore named. */
export const ROUNDING_MODE = 'half-to-even' as const

/** Stated on the output, per C1-OUT-07. */
export const PRECISION_STATEMENT = `Displayed to ${DISPLAY_SIG_FIGS} significant figures, rounded half-to-even. The unrounded value is in the structured result.`

/**
 * The exact decimal expansion of a double, as an integer and a power of ten.
 *
 * Every finite double is exactly `significand × 2^e`, and therefore exactly
 * `N / 10^k` for integers N and k ≥ 0. Computing that exactly is the only way to
 * know whether a value is really halfway: `toPrecision` cannot tell, because it
 * has already rounded, and a round-trip test cannot tell either — the double
 * nearest 1.953125e-5 round-trips through seven significant digits while its
 * exact expansion continues `…0004065…` and is not a tie at all.
 */
function exactDecimal(v: number): { digits: string; pointFromRight: number; negative: boolean } {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, v)
  const bits = view.getBigUint64(0)
  const negative = bits >> 63n === 1n
  const biasedExponent = Number((bits >> 52n) & 0x7ffn)
  const fraction = bits & 0xf_ffff_ffff_ffffn

  // Subnormals carry no implicit leading bit and sit at a fixed exponent.
  const significand = biasedExponent === 0 ? fraction : fraction | (1n << 52n)
  const exponent2 = biasedExponent === 0 ? -1074 : biasedExponent - 1075

  if (exponent2 >= 0) {
    return { digits: (significand << BigInt(exponent2)).toString(), pointFromRight: 0, negative }
  }
  // v = significand / 2^k = significand × 5^k / 10^k
  const k = -exponent2
  return { digits: (significand * 5n ** BigInt(k)).toString(), pointFromRight: k, negative }
}

/**
 * Round a digit string to `figs` significant digits, half-to-even.
 *
 * Returns the kept digits and how far the decimal exponent moved, which is
 * non-zero only when rounding carried across a decade — 999999.5 to six figures
 * is 1000000, seven digits, and has to become 1.00000e+6.
 */
function roundHalfEven(digits: string, figs: number): { digits: string; carried: boolean } {
  if (digits.length <= figs) return { digits: digits.padEnd(figs, '0'), carried: false }

  const kept = digits.slice(0, figs)
  const dropped = digits.slice(figs)
  const first = dropped[0]
  const restNonZero = /[1-9]/.test(dropped.slice(1))

  let roundUp: boolean
  if (first > '5') roundUp = true
  else if (first < '5') roundUp = false
  else if (restNonZero) roundUp = true
  // An exact tie. Round to even: up only when the last kept digit is odd.
  else roundUp = (Number(kept[figs - 1]) & 1) === 1

  if (!roundUp) return { digits: kept, carried: false }

  const bumped = (BigInt(kept) + 1n).toString()
  // 999999 + 1 is 1000000: one digit wider, so the exponent moves and the
  // trailing digit falls off.
  if (bumped.length > figs) return { digits: bumped.slice(0, figs), carried: true }
  return { digits: bumped.padStart(figs, '0'), carried: false }
}

/**
 * Render to exactly `figs` significant figures, rounded half-to-even.
 *
 * Trailing zeros are kept: a value of exactly 2 µM displays `2.00000`, not `2`.
 * Suppressing them would make "agrees to displayed precision" mean two
 * different things depending on the value.
 *
 * The choice between fixed and exponential form matches `toPrecision`, so that
 * only the tie behaviour differs from the platform default and nothing else
 * about the rendering is a surprise.
 */
export function formatSigFigs(v: number, figs: number = DISPLAY_SIG_FIGS): string {
  if (!Number.isFinite(v)) return 'n/a'
  if (v === 0) return figs > 1 ? `0.${'0'.repeat(figs - 1)}` : '0'

  const { digits, pointFromRight, negative } = exactDecimal(v)
  const trimmed = digits.replace(/^0+/, '') || '0'
  const leadingZeros = digits.length - trimmed.length
  // Scientific exponent before rounding.
  let exponent = digits.length - leadingZeros - pointFromRight - 1

  const rounded = roundHalfEven(trimmed, figs)
  if (rounded.carried) exponent += 1

  const sign = negative ? '-' : ''
  const d = rounded.digits

  if (exponent < -6 || exponent >= figs) {
    const mantissa = figs > 1 ? `${d[0]}.${d.slice(1)}` : d[0]
    return `${sign}${mantissa}e${exponent >= 0 ? '+' : '-'}${Math.abs(exponent)}`
  }
  if (exponent >= 0) {
    const intPart = d.slice(0, exponent + 1)
    const fracPart = d.slice(exponent + 1)
    return `${sign}${intPart}${fracPart ? `.${fracPart}` : ''}`
  }
  return `${sign}0.${'0'.repeat(-exponent - 1)}${d}`
}

/**
 * Whether a value sits exactly halfway at `figs` significant figures.
 *
 * Exposed because §10 requires the fixture set to contain such a case rather
 * than to exclude one: suppressing ties in the fixtures would make the suite
 * pass by excluding the input class that exposes the ambiguity, which is the
 * fixture-distribution failure §10 and C1-FX-09 exist to prevent.
 */
export function isExactTie(v: number, figs: number = DISPLAY_SIG_FIGS): boolean {
  if (!Number.isFinite(v) || v === 0) return false
  const { digits } = exactDecimal(v)
  const trimmed = digits.replace(/^0+/, '').replace(/0+$/, '')
  return trimmed.length === figs + 1 && trimmed.endsWith('5')
}

/**
 * The comparison standard for "identical to displayed precision".
 *
 * C1-IV-03 is evaluated with this. Note that acceptance test 3 is NOT: per the
 * conflict recorded in docs/rounding-ties.md, an independent reimplementation is
 * compared against the unrounded value (C1-UN-07), because correctness must not
 * depend on a formatting choice.
 */
export function agreesToDisplayedPrecision(a: number, b: number, figs: number = DISPLAY_SIG_FIGS): boolean {
  return formatSigFigs(a, figs) === formatSigFigs(b, figs)
}
