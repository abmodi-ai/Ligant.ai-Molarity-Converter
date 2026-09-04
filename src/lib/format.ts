/**
 * Display formatting.
 *
 * C1-UN-06: results are displayed to six significant figures, and the
 * displayed precision is stated on the output (C1-OUT-07). Six is confirmed
 * rather than assumed — see docs/open-item-07-displayed-precision.md.
 *
 * This is deliberately not the Antigen Density Calculator's `formatNumber`,
 * which is magnitude-adaptive (two decimals here, three significant figures
 * there) because its quantity is always in one unit. C1's quantity spans
 * eleven decades by unit selection alone, so a fixed significant-figure count
 * is the only rule that means the same thing at every magnitude.
 */

/** C1-UN-06. The one place the number six is written down. */
export const DISPLAY_SIG_FIGS = 6

/** Stated on the output, per C1-OUT-07. */
export const PRECISION_STATEMENT = `Displayed to ${DISPLAY_SIG_FIGS} significant figures. The unrounded value is in the structured result.`

/**
 * Render to exactly six significant figures.
 *
 * Trailing zeros are kept: a value of exactly 2 µM displays `2.00000`, not `2`.
 * Suppressing them would make "agrees to displayed precision" mean two
 * different things depending on the value, which is the standard C1-IV-03 and
 * acceptance test 2 are evaluated against.
 *
 * Below 1e-5 and at or above 1e21 `toPrecision` returns exponential form of its
 * own accord, which is where a decimal rendering stops being readable anyway.
 */
export function formatSigFigs(v: number, figs: number = DISPLAY_SIG_FIGS): string {
  if (!Number.isFinite(v)) return 'n/a'
  return v.toPrecision(figs)
}

/**
 * The comparison standard for "identical to displayed precision".
 *
 * C1-IV-03 and acceptance tests 2 and 6 are evaluated with this and no other
 * comparison. Two values agree when they render identically — not when they are
 * within some epsilon, and not bit-exactly, which §6 records as unusable.
 */
export function agreesToDisplayedPrecision(a: number, b: number, figs: number = DISPLAY_SIG_FIGS): boolean {
  return formatSigFigs(a, figs) === formatSigFigs(b, figs)
}
