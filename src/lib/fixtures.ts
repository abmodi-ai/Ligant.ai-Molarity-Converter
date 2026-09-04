/**
 * §10 — reference cases.
 *
 * Two properties the set as a whole must not have, both of which v0.1's
 * fixtures did have:
 *
 *   1. Round molecular weights, round concentrations, exact arithmetic. A set
 *      like that agrees with a wrong implementation as readily as a right one.
 *   2. Something always wrong with the input. C1-FX-09 is the negative control;
 *      without it an implementation that raises flags spuriously passes every
 *      other fixture in the set.
 *
 * C1-FX-08: every constructed fixture states the assumption under which it was
 * constructed, so the set is auditable. `assumption` is a required field, not an
 * optional note, so a fixture cannot be added without one.
 */

import type { ConversionRequest } from './compute'
import { effectiveMw } from './convert'
import type { FlagCode } from './flags'

export interface Fixture {
  /** The §10 fixture this case belongs to. */
  id: string
  name: string
  /** C1-FX-08. Why this case has the values it has. */
  assumption: string
  /** The standard §10 evaluates it against. */
  standard: string
  request: ConversionRequest
  expect: {
    /** Displayed to six significant figures. Computed independently — see fixtures.test.ts. */
    displayedMolar?: string
    displayedMass?: string
    /** The exact set of flags. An empty array means no flags, and is asserted as such. */
    flags: FlagCode[]
  }
}

/** Shorthand for the clean declarations, so a fixture that is not about them reads as such. */
const CLEAN = { provenance: 'certificate-of-analysis', massBasis: 'assembled' } as const

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'C1-FX-01',
    name: 'Non-round molecular weight',
    assumption:
      'IgG1 at 148,327 g/mol and 2.4 mg/mL. The weight is deliberately not 150 kDa and the concentration is not 1 mg/mL: with round values, division by the weight is close enough to exact that an implementation carrying a rounded intermediate would still agree. Expected value computed by exact rational arithmetic, not by this implementation.',
    standard: 'Hand calculation, to displayed precision',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 2.4,
      mwValue: 148327,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '16.1805', flags: [] },
  },
  {
    id: 'C1-FX-02',
    name: 'The same weight entered as g/mol and as kDa',
    assumption:
      'The kDa arm of the pair whose g/mol arm is C1-FX-01. 148,327 g/mol and 148.327 kDa are the same weight, and the kDa form is a decimal that is not exactly representable in binary, which is the condition under which the two paths differ in the last bit. Evaluated to displayed precision and not bit-exactly, per C1-IV-03.',
    standard: 'C1-IV-03 — displayed precision, not bit-exact',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 2.4,
      mwValue: 148.327,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' },
    },
    expect: { displayedMolar: '16.1805', flags: [] },
  },
  {
    id: 'C1-FX-03',
    name: 'Round-trip conversion',
    assumption:
      'A working antibody concentration at a non-round weight. The round trip is exercised exhaustively over 500,008 cases in invariance.test.ts; this fixture exists so the set contains a named, readable instance of it rather than only a sweep.',
    standard: 'C1-IV-01 — ≤ 1 ULP',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 0.5,
      mwValue: 27.7,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' },
    },
    expect: { flags: [] },
  },
  {
    id: 'C1-FX-05',
    name: '"Not recorded" provenance',
    assumption:
      'Everything else about this case is clean — plausible weight, assembled basis, working concentration — so that C1-FL-05 is the only flag raised and the fixture cannot pass because of an unrelated condition. A conjugate of unrecorded provenance would test two things and isolate neither.',
    standard: 'C1-FL-05 raised and present on the output',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 125,
      mwValue: 149183,
      provenance: 'not-recorded',
      massBasis: 'assembled',
      units: { mass: 'ug/mL', molar: 'nM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '837.897', flags: ['C1-FL-05'] },
  },
  {
    id: 'C1-FX-06a',
    name: 'Mass basis: monomer or single chain',
    assumption:
      'An scFv at 27,743 g/mol, a weight that is genuinely a single chain rather than an assembled molecule, so the declaration matches the reagent instead of being asserted against an IgG weight. Provenance is a certificate of analysis so C1-FL-06 is isolated. The weight and the concentration are both non-round deliberately: an earlier draft used 25.6 kDa at 0.5 mg/mL, which is exact in binary and gives 19.53125 µM — a value whose seventh significant digit is an exact 5, so the displayed result depends on the tie-breaking rule rather than on the conversion. See docs/rounding-ties.md.',
    standard: 'C1-FL-06',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 0.42,
      mwValue: 27743,
      provenance: 'certificate-of-analysis',
      massBasis: 'monomer',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '15.1390', flags: ['C1-FL-06'] },
  },
  {
    id: 'C1-FX-06b',
    name: 'Mass basis: conjugate',
    assumption:
      'A PE-conjugated IgG at 390 kDa — 150 kDa of antibody and 240 kDa of R-phycoerythrin, the case §3.3 costs at ~2.6×. The weight is the conjugate weight, so the declaration is the one that reagent actually warrants.',
    standard: 'C1-FL-08',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 0.2,
      mwValue: 390,
      provenance: 'certificate-of-analysis',
      massBasis: 'conjugate',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' },
    },
    expect: { displayedMolar: '0.512821', flags: ['C1-FL-08'] },
  },
  {
    id: 'C1-FX-06c',
    name: 'Mass basis: not recorded',
    assumption:
      'Provenance is recorded and is not sequence-derived, so C1-FL-07 is the only flag. The pairing matters: an unrecorded mass basis alongside an unrecorded provenance is the common real case, but it would not show that the two declarations raise separate flags.',
    standard: 'C1-FL-07',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1,
      mwValue: 148327,
      provenance: 'vendor-datasheet',
      massBasis: 'not-recorded',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { flags: ['C1-FL-07'] },
  },
  {
    id: 'C1-FX-07',
    name: 'Rounding the unit-normalised intermediate changes the sixth significant figure',
    assumption:
      'The entered concentration carries more than six significant figures — 1234.5678 µg/mL, the shape of a value pasted from an instrument or a LIMS export. That is the necessary condition: with six or fewer, normalising to g/L moves the decimal point without creating a digit to lose, and the defect this fixture detects has nothing to bite on. Rounding the intermediate to six figures gives 8.32330 µM against a correct 8.32328 µM.',
    standard: 'The unrounded intermediate is used (C1-UN-05)',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1234.5678,
      mwValue: 148327,
      ...CLEAN,
      units: { mass: 'ug/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '8.32328', flags: [] },
  },
  {
    id: 'C1-FX-10',
    name: 'Exact rounding tie',
    assumption:
      '1 g/L at 51.2 kDa, which is exactly 19.53125 µM — a value whose exact decimal expansion terminates at the seventh significant digit, and that digit is a 5. It therefore sits exactly halfway at six significant figures and its displayed value is decided by the rounding mode alone: 19.5312 under half-to-even, 19.5313 under half-up. Both the reagent and the concentration are ordinary; nothing about this case is contrived. Verified to give exactly 19.53125 through all three plausible unit-normalisation paths — folded from kDa, folded from g/mol, and stepwise — so it tests the rounding mode and not an artefact of one implementation. Ties are unit-dependent and cannot be excluded from the input space: the same result expressed in M is 1.9531250000000000406e-5, which is not a tie and rounds up under either rule. This fixture exists because suppressing ties would make the suite pass by excluding the input class that exposes the ambiguity.',
    standard: 'C1-UN-06 — six significant figures, rounded half-to-even',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1,
      mwValue: 51.2,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'uM', mw: 'kDa' },
    },
    expect: { displayedMolar: '19.5312', flags: [] },
  },
  {
    id: 'C1-FX-09',
    name: 'Negative control',
    assumption:
      'A plausible molecular weight (148,327 g/mol), certificate-of-analysis provenance, assembled mass basis, and 1.25 mg/mL — a working concentration well inside every bound rather than close to one. Deliberately not near a threshold: a clean case sitting just under a bound would pass for the wrong reason and would fail as soon as a boundary operator was corrected. This is the fixture that fails if an implementation raises flags spuriously, and without it every other fixture in the set could pass while the tool flagged everything.',
    standard: 'No flags raised',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1.25,
      mwValue: 148327,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '8.42733', flags: [] },
  },
] as const

// ---------------------------------------------------------------------------
// C1-FX-04 — every §8 threshold, either side and exactly on it, both directions.
// ---------------------------------------------------------------------------

/**
 * The value that puts the computed molar concentration exactly on 1 pM.
 *
 * Derived rather than written as a literal. `massToMolar` divides by
 * `effectiveMw`, so entering exactly that value returns exactly 1: x/x is 1 for
 * every finite non-zero double. A decimal literal chosen by hand would land a
 * fraction of a ULP off the threshold and would silently test the wrong side of
 * the operator — which is the one thing a boundary fixture must not do.
 */
const MASS_FOR_EXACTLY_1PM = effectiveMw(150000, { mass: 'g/L', molar: 'pM', mw: 'g/mol' })

export const BOUNDARY_FIXTURES: readonly Fixture[] = [
  // --- C1-FL-01, lower MW bound: flag when MW < 1 kDa ---
  boundary('C1-FX-04a', 'MW just below 1 kDa', 999, 'g/mol', ['C1-FL-01'],
    'Entered directly, so the comparison is against the value the user typed and no arithmetic sits between them.'),
  boundary('C1-FX-04b', 'MW exactly 1 kDa', 1000, 'g/mol', [],
    'The operator is `<`, so a weight exactly on the bound does not flag. This fixture is the one that fails if `<` is written `<=`.'),
  boundary('C1-FX-04c', 'MW just above 1 kDa', 1001, 'g/mol', [],
    'The quiet side of the lower bound, so the set covers both sides rather than only the flagging one.'),

  // --- C1-FL-01, upper MW bound: flag when MW > 1000 kDa ---
  boundary('C1-FX-04d', 'MW just below 1000 kDa', 999999, 'g/mol', [],
    'One g/mol inside the upper bound. Paired with 04f so a `>=` written for `>` is caught.'),
  boundary('C1-FX-04e', 'MW exactly 1000 kDa', 1000000, 'g/mol', [],
    'The operator is `>`, so exactly 1000 kDa does not flag.'),
  boundary('C1-FX-04f', 'MW just above 1000 kDa', 1000001, 'g/mol', ['C1-FL-01'],
    'One g/mol outside. A real protein this large exists; the flag says confirm, not reject.'),
]

/**
 * A molecular-weight boundary case, run in both conversion directions.
 *
 * The entered concentration is chosen to sit far inside the mass and molar
 * bounds for every weight used here, so the only flag a case can raise is the
 * one under test.
 */
function boundary(
  id: string,
  name: string,
  mwValue: number,
  mwUnit: 'g/mol' | 'kDa',
  flags: FlagCode[],
  why: string,
): Fixture {
  return {
    id,
    name,
    assumption: `${why} Concentration is 1 mg/mL, far inside the mass and molar bounds at every weight in this group, so the only flag available to the case is the one under test.`,
    standard: 'The operators as written in §8',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1,
      mwValue,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: mwUnit },
    },
    expect: { flags },
  }
}

/**
 * The concentration boundaries, which cannot use the helper above because each
 * has to be constructed so the *computed* quantity lands on the threshold in
 * the direction where it is computed.
 */
export const CONCENTRATION_BOUNDARY_FIXTURES: readonly Fixture[] = [
  {
    id: 'C1-FX-04g',
    name: 'Mass concentration exactly 250 mg/mL, entered',
    assumption:
      'Entered directly in the mass-to-molar direction, so the threshold is compared against the typed value. MW 150,000 g/mol keeps the resulting molar concentration far above 1 pM.',
    standard: 'The operators as written in §8 — `>`, so exactly on does not flag',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 250,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'mM', mw: 'g/mol' },
    },
    expect: { flags: [] },
  },
  {
    id: 'C1-FX-04h',
    name: 'Mass concentration just above 250 mg/mL, entered',
    assumption: 'The same case as 04g one ten-thousandth above the bound, which is the smallest step that is still legible to a reader auditing the fixture.',
    standard: 'The operators as written in §8',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 250.0001,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'mM', mw: 'g/mol' },
    },
    expect: { flags: ['C1-FL-02'] },
  },
  {
    id: 'C1-FX-04i',
    name: 'Mass concentration exactly 250 mg/mL, computed',
    assumption:
      'The other direction, where the mass concentration is the computed quantity — which is the case §8 is written to catch and a fixture set could easily miss. Constructed from exactly-representable binary values so the product is exactly 250 and not a ULP either side: 2⁻⁸ M against 64,000 g/mol. A decimal pair such as 1 mM × 250,000 g/mol lands near 250 but not on it, and would test the wrong side of the operator.',
    standard: 'The operators as written in §8, in the computed direction',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 0.00390625,
      mwValue: 64000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'M', mw: 'g/mol' },
    },
    expect: { displayedMass: '250.000', flags: [] },
  },
  {
    id: 'C1-FX-04j',
    name: 'Mass concentration just above 250 mg/mL, computed',
    assumption: 'As 04i, with the entered molar concentration raised by one unit in its last decimal place, giving a computed 250.00064 g/L.',
    standard: 'The operators as written in §8, in the computed direction',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 0.00390626,
      mwValue: 64000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'M', mw: 'g/mol' },
    },
    expect: { flags: ['C1-FL-02'] },
  },
  {
    id: 'C1-FX-04k',
    name: 'Molar concentration exactly 1 pM, entered',
    assumption:
      'Entered directly in the molar-to-mass direction. 1 × 1e-12 is the same double as the threshold constant, so the comparison is genuinely against equality rather than against a value that merely rounds to it.',
    standard: 'The operators as written in §8 — `<`, so exactly on does not flag',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 1,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'ug/mL', molar: 'pM', mw: 'g/mol' },
    },
    expect: { flags: [] },
  },
  {
    id: 'C1-FX-04l',
    name: 'Molar concentration just below 1 pM, entered',
    assumption: 'As 04k at 0.999 pM, one part in a thousand below the bound — a step large enough to read at a glance and far larger than any rounding effect, so a failure here means the operator is wrong and not that the arithmetic drifted.',
    standard: 'The operators as written in §8',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 0.999,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'ug/mL', molar: 'pM', mw: 'g/mol' },
    },
    expect: { flags: ['C1-FL-03'] },
  },
  {
    id: 'C1-FX-04m',
    name: 'Molar concentration exactly 1 pM, computed',
    assumption:
      'The mass-to-molar direction, where the molar concentration is computed. The entered mass concentration is set to the effective molecular weight itself, because x/x is exactly 1 for every finite non-zero double, so the computed value is exactly 1 pM rather than within a ULP of it. A hand-chosen decimal cannot do this reliably, and a boundary fixture that sits a ULP off the boundary tests the wrong side of the operator while looking correct.',
    standard: 'The operators as written in §8, in the computed direction',
    request: {
      direction: 'mass-to-molar',
      enteredValue: MASS_FOR_EXACTLY_1PM,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'pM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '1.00000', flags: [] },
  },
  {
    id: 'C1-FX-04n',
    name: 'Molar concentration just below 1 pM, computed',
    assumption:
      'As 04m with the entered mass concentration stepped down by one double, giving a computed molar concentration one ULP below 1 pM — the smallest possible violation, and the one a tolerance-based comparison would miss. It also displays as 1.00000 pM, exactly as 04m does, because the difference is far below the sixth significant figure. That pair is the point: 04m raises nothing and 04n raises C1-FL-03, and the two are indistinguishable on screen. Both fixtures therefore assert the rendering as well as the flag, so the collision is recorded as correct behaviour rather than looking like a defect to whoever reads this suite next.',
    standard: 'The operators as written in §8, in the computed direction; rendering per C1-UN-06',
    request: {
      direction: 'mass-to-molar',
      enteredValue: nextDown(MASS_FOR_EXACTLY_1PM),
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'pM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '1.00000', flags: ['C1-FL-03'] },
  },
]

function nextDown(x: number): number {
  const buf = new DataView(new ArrayBuffer(8))
  buf.setFloat64(0, x)
  return (buf.setBigUint64(0, buf.getBigUint64(0) - 1n), buf.getFloat64(0))
}

/** Every fixture in §10, as one set. */
export const ALL_FIXTURES: readonly Fixture[] = [
  ...FIXTURES,
  ...BOUNDARY_FIXTURES,
  ...CONCENTRATION_BOUNDARY_FIXTURES,
]
