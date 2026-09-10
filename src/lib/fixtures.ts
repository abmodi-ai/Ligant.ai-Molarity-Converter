/**
 * §10: reference cases.
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
import type { FlagCode, ThresholdId } from './flags'

// The threshold names live in flags.ts beside the register that defines them,
// so the guard and the disclosure cannot describe different sets.
export type { ThresholdId }

/** Which side of its threshold a boundary case sits on. Geometric, not "flags or not". */
export type BoundarySide = 'below' | 'on' | 'above'

export interface Fixture {
  /** The §10 fixture this case belongs to. */
  id: string
  name: string
  /** C1-FX-08. Why this case has the values it has. */
  assumption: string
  /** The standard §10 evaluates it against. */
  standard: string
  request: ConversionRequest
  /**
   * C1-FX-04 only. Which threshold the case is about and where it sits.
   *
   * Declared rather than inferred from the values, so `fixtures.test.ts` can
   * assert coverage of every threshold, on every side, in both conversion
   * directions. The guard this replaces asserted a count over the whole set and
   * "at least one fixture of each direction", which is a set-level check
   * standing in for a per-threshold property, and it passed while the two
   * molecular-weight bounds were tested in one direction only.
   */
  boundary?: { threshold: ThresholdId; side: BoundarySide }
  expect: {
    /** Displayed to six significant figures. Computed independently: see fixtures.test.ts. */
    displayedMolar?: string
    displayedMass?: string
    /** The exact set of flags. An empty array means no flags, and is asserted as such. */
    flags: FlagCode[]
    /**
     * C1-UN-07. Whether the computed quantity is a zero that is not the value.
     *
     * The representability boundary needs this because its three sides raise
     * IDENTICAL flags: what differs across the threshold is the marker, not the
     * flag set, so a fixture that asserted only flags would pass on all three
     * sides without testing anything.
     */
    underflowed?: boolean
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
    standard: 'C1-IV-03: displayed precision, not bit-exact',
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
    standard: 'C1-IV-01: ≤ 1 ULP',
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
      'Everything else about this case is clean, plausible weight, assembled basis, working concentration; so that C1-FL-05 is the only flag raised and the fixture cannot pass because of an unrelated condition. A conjugate of unrecorded provenance would test two things and isolate neither.',
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
      'An scFv at 27,743 g/mol, a weight that is genuinely a single chain rather than an assembled molecule, so the declaration matches the reagent instead of being asserted against an IgG weight. Provenance is a certificate of analysis so C1-FL-06 is isolated. The weight and the concentration are both non-round deliberately: an earlier draft used 25.6 kDa at 0.5 mg/mL, which is exact in binary and gives 19.53125 µM: a value whose seventh significant digit is an exact 5, so the displayed result depends on the tie-breaking rule rather than on the conversion. See docs/rounding-ties.md.',
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
      'A PE-conjugated IgG at 390 kDa, 150 kDa of antibody and 240 kDa of R-phycoerythrin, the case §3.3 costs at ~2.6×. The weight is the conjugate weight, so the declaration is the one that reagent actually warrants.',
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
      'The entered concentration carries more than six significant figures, 1234.5678 µg/mL, the shape of a value pasted from an instrument or a LIMS export. That is the necessary condition: with six or fewer, normalising to g/L moves the decimal point without creating a digit to lose, and the defect this fixture detects has nothing to bite on. Rounding the intermediate to six figures gives 8.32330 µM against a correct 8.32328 µM.',
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
      '1 g/L at 51.2 kDa, which is exactly 19.53125 µM: a value whose exact decimal expansion terminates at the seventh significant digit, and that digit is a 5. It therefore sits exactly halfway at six significant figures and its displayed value is decided by the rounding mode alone: 19.5312 under half-to-even, 19.5313 under half-up. Both the reagent and the concentration are ordinary; nothing about this case is contrived. Verified to give exactly 19.53125 through all three plausible unit-normalisation paths, folded from kDa, folded from g/mol, and stepwise; so it tests the rounding mode and not an artefact of one implementation. Ties are unit-dependent and cannot be excluded from the input space: the same result expressed in M is 1.9531250000000000406e-5, which is not a tie and rounds up under either rule. This fixture exists because suppressing ties would make the suite pass by excluding the input class that exposes the ambiguity.',
    standard: 'C1-UN-06: six significant figures, rounded half-to-even',
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
    id: 'C1-FX-12',
    name: 'A declaration retained across a change of direction',
    assumption:
      'The clean case of C1-FX-09 in the reverse direction, with the molecular weight and its source carried across the switch and the mass basis re-confirmed. Everything about the numbers is inside every bound, so C1-FL-09 is the only flag and the fixture cannot pass because of an unrelated condition. Two fields retained rather than one or three: one would not show that the message enumerates, and three would not show that a confirmed field drops out of it. This fixture exists because retention was a property of the FORM until v0.2.0: the badge was the whole of it, so a result computed from carried values said "as declared" in its derivation and left no trace at all in the structured object.',
    standard: 'C1-FL-09 raised, and declarations.retained recording which fields',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 8.42733,
      mwValue: 148327,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
      retained: { mw: true, provenance: true, massBasis: false },
    },
    expect: { flags: ['C1-FL-09'] },
  },
  {
    id: 'C1-FX-13',
    name: 'Zero concentration',
    assumption:
      'Zero is legal under §7 and is not excluded by §8, so until v0.2.0 both requirements were met and their interaction was the defect: 0 mg/mL returned 0.00000 µM flagged "below the range typical of biologic working solutions", which is true of zero and says nothing about it. Zero is the absence of solute, not an implausibly low concentration. Declarations are clean so the zero flag is isolated.',
    standard: 'C1-FL-10 raised and C1-FL-03 NOT raised',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 0,
      mwValue: 148327,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '0.00000', flags: ['C1-FL-10'] },
  },
  {
    id: 'C1-FX-03b',
    name: 'Subnormal input, output unit that cannot hold the value',
    assumption:
      '1e-320 mg/mL at 1000 kDa is 1e-326 mol/L, below the smallest subnormal double (about 4.94e-324), so reported in M the conversion returns exactly zero. C1-FL-10 correctly does not fire, because the entered quantity is not zero. The pair with C1-FX-14 is the point: the same input reported in pM holds the value and round-trips losslessly, so what fails here is the choice of output unit and not the subnormal regime. Added because corpus.ts generates concentrations over eleven decades of the NORMAL range, which is why neither the round-trip test nor directions.test.ts had ever entered this regime; the same mechanism by which the molecular-weight bounds went unexercised in one direction.',
    standard: 'The documented behaviour in this regime, NOT the 1 ULP bound, which cannot apply',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1e-320,
      mwValue: 1000,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'M', mw: 'kDa' },
    },
    expect: { displayedMolar: '0.00000', flags: ['C1-FL-03'] },
  },
  {
    id: 'C1-FX-14',
    name: 'Subnormal input, output unit that holds the value',
    assumption:
      'The same input as C1-FX-03b reported in pM rather than M. It returns 9.99988867e-315 and the round trip is exact, which is what establishes that the regime is not the problem. Round 3 reported that all five molar units underflow for this input; four of the five hold it, and this fixture is why that is now a measurement rather than a recollection.',
    standard: 'C1-IV-01 holds here: the value is representable, so the bound applies',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1e-320,
      mwValue: 1000,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'pM', mw: 'kDa' },
    },
    expect: { flags: ['C1-FL-03'] },
  },
  {
    id: 'C1-FX-15',
    name: 'A real concentration whose base-unit form underflows',
    assumption:
      '1e-320 ng/mL at 150 kDa. The value is non-zero and the user typed it, but the ng/mL factor of 1e-6 takes it to 1e-326 in g/L, which underflows to exactly zero. C1-FL-10 read the normalised value and reported that the solution contained no solute, which is the defect C1-FL-10 was added to remove, reproduced by C1-FL-10 in a unit nothing had tested. The unit matters and mg/mL would not expose it, because its factor is 1. Fixed by testing the quantities rather than their base-unit forms.',
    standard: 'C1-FL-03 raised, C1-FL-10 NOT raised, and the record marks the computed zero',
    request: {
      direction: 'mass-to-molar',
      enteredValue: 1e-320,
      mwValue: 150,
      ...CLEAN,
      units: { mass: 'ng/mL', molar: 'M', mw: 'kDa' },
    },
    expect: { displayedMolar: '0.00000', flags: ['C1-FL-03'] },
  },
  {
    id: 'C1-FX-09',
    name: 'Negative control',
    assumption:
      'A plausible molecular weight (148,327 g/mol), certificate-of-analysis provenance, assembled mass basis, and 1.25 mg/mL: a working concentration well inside every bound rather than close to one. Deliberately not near a threshold: a clean case sitting just under a bound would pass for the wrong reason and would fail as soon as a boundary operator was corrected. This is the fixture that fails if an implementation raises flags spuriously, and without it every other fixture in the set could pass while the tool flagged everything.',
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
// C1-FX-04: every §8 threshold, either side and exactly on it, both directions.
// ---------------------------------------------------------------------------

/**
 * The value that puts the computed molar concentration exactly on 1 pM.
 *
 * Derived rather than written as a literal. `massToMolar` divides by
 * `effectiveMw`, so entering exactly that value returns exactly 1: x/x is 1 for
 * every finite non-zero double. A decimal literal chosen by hand would land a
 * fraction of a ULP off the threshold and would silently test the wrong side of
 * the operator: which is the one thing a boundary fixture must not do.
 */
const MASS_FOR_EXACTLY_1PM = effectiveMw(150000, { mass: 'g/L', molar: 'pM', mw: 'g/mol' })

const MW_BOUNDS: {
  suffix: string
  name: string
  mwValue: number
  threshold: ThresholdId
  side: BoundarySide
  flags: FlagCode[]
  why: string
}[] = [
  // --- C1-FL-01, lower MW bound: flag when MW < 1 kDa ---
  {
    suffix: 'a', name: 'MW just below 1 kDa', mwValue: 999, threshold: 'mw-lower', side: 'below', flags: ['C1-FL-01'],
    why: 'One g/mol inside the lower bound, so the comparison is against a weight that differs from the threshold by the smallest step a reader can check by eye.',
  },
  {
    suffix: 'b', name: 'MW exactly 1 kDa', mwValue: 1000, threshold: 'mw-lower', side: 'on', flags: [],
    why: 'The operator is `<`, so a weight exactly on the bound does not flag. This fixture is the one that fails if `<` is written `<=`.',
  },
  {
    suffix: 'c', name: 'MW just above 1 kDa', mwValue: 1001, threshold: 'mw-lower', side: 'above', flags: [],
    why: 'The quiet side of the lower bound, so the set covers both sides rather than only the flagging one.',
  },
  // --- C1-FL-01, upper MW bound: flag when MW > 1000 kDa ---
  {
    suffix: 'd', name: 'MW just below 1000 kDa', mwValue: 999999, threshold: 'mw-upper', side: 'below', flags: [],
    why: 'One g/mol inside the upper bound. Paired with 04f so a `>=` written for `>` is caught.',
  },
  {
    suffix: 'e', name: 'MW exactly 1000 kDa', mwValue: 1000000, threshold: 'mw-upper', side: 'on', flags: [],
    why: 'The operator is `>`, so exactly 1000 kDa does not flag.',
  },
  {
    suffix: 'f', name: 'MW just above 1000 kDa', mwValue: 1000001, threshold: 'mw-upper', side: 'above', flags: ['C1-FL-01'],
    why: 'One g/mol outside. A real protein this large exists; the flag says confirm, not reject.',
  },
]

/**
 * Every molecular-weight boundary case, in BOTH conversion directions.
 *
 * §10 requires either side of, and exactly on, every §8 threshold, in both
 * directions. The molecular-weight cases ran in `mass-to-molar` only until
 * v0.1.1, while the helper that built them claimed both in its own docstring.
 * No wrong answer was possible, C1-FL-01 reads the declared weight and no
 * direction enters the comparison, but the requirement is written about
 * coverage, and the guard that was supposed to enforce it counted fixtures
 * instead of checking thresholds.
 */
export const BOUNDARY_FIXTURES: readonly Fixture[] = MW_BOUNDS.flatMap((b) => [
  boundary(`C1-FX-04${b.suffix}`, b, 'mass-to-molar'),
  boundary(`C1-FX-04${b.suffix}-rev`, b, 'molar-to-mass'),
])

/**
 * A molecular-weight boundary case in one direction.
 *
 * The entered concentration is 1 in either direction, and that single choice
 * keeps every case far inside the two concentration bounds across the whole
 * weight range used here: 1 mg/mL entered gives 0.999 to 1001 µM computed, and
 * 1 µM entered gives 0.000999 to 1.000001 mg/mL computed. So the only flag
 * available to any case in this group is the one under test, in both
 * directions, without the entered value having to be tuned per weight.
 */
function boundary(
  id: string,
  b: (typeof MW_BOUNDS)[number],
  direction: 'mass-to-molar' | 'molar-to-mass',
): Fixture {
  const entered = direction === 'mass-to-molar' ? '1 mg/mL' : '1 µM'
  return {
    id,
    name: `${b.name}, ${direction}`,
    assumption: `${b.why} Entered as ${entered}, which sits far inside the mass and molar bounds at every weight in this group, so the only flag available to the case is the one under test. Run in both conversion directions because §10 requires it: C1-FL-01 reads the declared weight and cannot depend on the direction, and this pair is what establishes that rather than assuming it.`,
    standard: 'The operators as written in §8, in both conversion directions',
    boundary: { threshold: b.threshold, side: b.side },
    request: {
      direction,
      enteredValue: 1,
      mwValue: b.mwValue,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    },
    expect: { flags: b.flags },
  }
}

/**
 * The concentration boundaries, which cannot use the helper above because each
 * has to be constructed so the *computed* quantity lands on the threshold in
 * the direction where it is computed.
 */
export const CONCENTRATION_BOUNDARY_FIXTURES: readonly Fixture[] = [
  {
    id: 'C1-FX-04o',
    name: 'Mass concentration just below 250 mg/mL, entered',
    assumption:
      'The quiet side of the upper mass bound in the entered direction. Added with the per-threshold coverage guard: the set had an on-the-bound case and an above-it case for this threshold and no below-it case, so a `>` silently rewritten as `>=` would have been caught while a bound moved downwards would not.',
    standard: 'The operators as written in §8',
    boundary: { threshold: 'mass-upper', side: 'below' },
    request: {
      direction: 'mass-to-molar',
      enteredValue: 249.9999,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'mg/mL', molar: 'mM', mw: 'g/mol' },
    },
    expect: { flags: [] },
  },
  {
    id: 'C1-FX-04g',
    name: 'Mass concentration exactly 250 mg/mL, entered',
    boundary: { threshold: 'mass-upper', side: 'on' },
    assumption:
      'Entered directly in the mass-to-molar direction, so the threshold is compared against the typed value. MW 150,000 g/mol keeps the resulting molar concentration far above 1 pM.',
    standard: 'The operators as written in §8, `>`, so exactly on does not flag',
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
    boundary: { threshold: 'mass-upper', side: 'above' },
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
    id: 'C1-FX-04p',
    name: 'Mass concentration just below 250 mg/mL, computed',
    assumption:
      'As 04i with the entered molar concentration lowered by one unit in its last decimal place, giving a computed 249.99936 g/L. The below-the-bound case in the computed direction, added with the per-threshold coverage guard.',
    standard: 'The operators as written in §8, in the computed direction',
    boundary: { threshold: 'mass-upper', side: 'below' },
    request: {
      direction: 'molar-to-mass',
      enteredValue: 0.00390624,
      mwValue: 64000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'M', mw: 'g/mol' },
    },
    expect: { displayedMass: '249.999', flags: [] },
  },
  {
    id: 'C1-FX-04i',
    name: 'Mass concentration exactly 250 mg/mL, computed',
    boundary: { threshold: 'mass-upper', side: 'on' },
    assumption:
      'The other direction, where the mass concentration is the computed quantity; which is the case §8 is written to catch and a fixture set could easily miss. Constructed from exactly-representable binary values so the product is exactly 250 and not a ULP either side: 2⁻⁸ M against 64,000 g/mol. A decimal pair such as 1 mM × 250,000 g/mol lands near 250 but not on it, and would test the wrong side of the operator.',
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
    boundary: { threshold: 'mass-upper', side: 'above' },
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
    boundary: { threshold: 'molar-lower', side: 'on' },
    assumption:
      'Entered directly in the molar-to-mass direction. 1 × 1e-12 is the same double as the threshold constant, so the comparison is genuinely against equality rather than against a value that merely rounds to it.',
    standard: 'The operators as written in §8, `<`, so exactly on does not flag',
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
    boundary: { threshold: 'molar-lower', side: 'below' },
    assumption: 'As 04k at 0.999 pM, one part in a thousand below the bound; a step large enough to read at a glance and far larger than any rounding effect, so a failure here means the operator is wrong and not that the arithmetic drifted.',
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
    boundary: { threshold: 'molar-lower', side: 'on' },
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
    boundary: { threshold: 'molar-lower', side: 'below' },
    assumption:
      'As 04m with the entered mass concentration stepped down by one double, giving a computed molar concentration one ULP below 1 pM; the smallest possible violation, and the one a tolerance-based comparison would miss. It also displays as 1.00000 pM, exactly as 04m does, because the difference is far below the sixth significant figure. That pair is the point: 04m raises nothing and 04n raises C1-FL-03, and the two are indistinguishable on screen. Both fixtures therefore assert the rendering as well as the flag, so the collision is recorded as correct behaviour rather than looking like a defect to whoever reads this suite next.',
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
  {
    id: 'C1-FX-04q',
    name: 'Molar concentration just above 1 pM, entered',
    boundary: { threshold: 'molar-lower', side: 'above' },
    assumption:
      'As 04k at 1.001 pM, one part in a thousand above the bound. The quiet side of the lower molar bound in the entered direction, added with the per-threshold coverage guard: the set had on-the-bound and below-the-bound cases for this threshold and no above-it case.',
    standard: 'The operators as written in §8',
    request: {
      direction: 'molar-to-mass',
      enteredValue: 1.001,
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'ug/mL', molar: 'pM', mw: 'g/mol' },
    },
    expect: { flags: [] },
  },
  {
    id: 'C1-FX-04r',
    name: 'Molar concentration just above 1 pM, computed',
    boundary: { threshold: 'molar-lower', side: 'above' },
    assumption:
      'As 04m with the entered mass concentration stepped UP by one double, giving a computed molar concentration one ULP above 1 pM. The mirror of 04n: the smallest possible step onto the quiet side, and it displays as 1.00000 pM like both of the others. Three fixtures now render identically at this threshold, one below flagging, one on and one above not; which is the strongest form of the point 04m/04n exist to record.',
    standard: 'The operators as written in §8, in the computed direction; rendering per C1-UN-06',
    request: {
      direction: 'mass-to-molar',
      enteredValue: nextUp(MASS_FOR_EXACTLY_1PM),
      mwValue: 150000,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'pM', mw: 'g/mol' },
    },
    expect: { displayedMolar: '1.00000', flags: [] },
  },
]

/**
 * C1-FX-04, representability. Three sides, both directions, constructed exactly.
 *
 * The divisor is a power of two so the division is exact and the side is not a
 * matter of luck: at an effective divisor of 2, an entered MIN_VALUE halves to
 * exactly the midpoint between 0 and MIN_VALUE and rounds to zero, 2×MIN_VALUE
 * lands exactly ON the smallest representable value, and 3×MIN_VALUE lands
 * above it. A hand-chosen decimal cannot place a subnormal boundary reliably,
 * which is the same reasoning C1-FX-04m already used.
 *
 * All six raise the SAME two flags. The molecular weight has to be tiny to make
 * the divisor a small power of two, so C1-FL-01 fires throughout, and the
 * concentration is far below 1 pM, so C1-FL-03 does too. That is not noise
 * obscuring the test: it is what makes the test necessary, because nothing in
 * the flag set distinguishes a value the tool kept from one it lost.
 */
const MIN = Number.MIN_VALUE

export const REPRESENTABILITY_BOUNDARY_FIXTURES: readonly Fixture[] = [
  representability('C1-FX-04s', 'below', 'mass-to-molar', MIN, true),
  representability('C1-FX-04t', 'on', 'mass-to-molar', 2 * MIN, false),
  representability('C1-FX-04u', 'above', 'mass-to-molar', 3 * MIN, false),
  representability('C1-FX-04s-rev', 'below', 'molar-to-mass', MIN, true),
  representability('C1-FX-04t-rev', 'on', 'molar-to-mass', 2 * MIN, false),
  representability('C1-FX-04u-rev', 'above', 'molar-to-mass', 3 * MIN, false),
]

function representability(
  id: string,
  side: BoundarySide,
  direction: 'mass-to-molar' | 'molar-to-mass',
  enteredValue: number,
  underflowed: boolean,
): Fixture {
  // Forward halves the entered value, reverse also halves it: 2 and 0.5 are the
  // two ways to reach an effective divisor that moves one step of the subnormal
  // ladder, and both are exact in binary.
  const mwValue = direction === 'mass-to-molar' ? 2 : 0.5
  const where =
    side === 'below'
      ? 'halves to the exact midpoint between zero and the smallest representable value, and rounds to zero'
      : side === 'on'
        ? 'lands exactly ON the smallest representable value'
        : 'lands one step above it'
  return {
    id,
    name: `Computed quantity ${side} the representable range, ${direction}`,
    assumption: `Entered as ${enteredValue} with a molecular weight of ${mwValue} g/mol, giving an effective divisor of ${direction === 'mass-to-molar' ? 2 : 0.5}, which is exact in binary. The entered value ${where}. All six representability fixtures raise the same two flags, C1-FL-01 for the tiny weight the construction requires and C1-FL-03 for the tiny concentration, so the flag set cannot tell the three sides apart and the fixture asserts the underflow marker instead. That is the property under test: nothing a user sees distinguishes a value the tool kept from one it lost.`,
    standard: 'C1-UN-07. The computed quantity is marked underflowed if and only if it is a zero that is not the value',
    boundary: { threshold: 'representability', side },
    request: {
      direction,
      enteredValue,
      mwValue,
      ...CLEAN,
      units: { mass: 'g/L', molar: 'M', mw: 'g/mol' },
    },
    expect: { flags: ['C1-FL-01', 'C1-FL-03'], underflowed },
  }
}

function nextUp(x: number): number {
  const buf = new DataView(new ArrayBuffer(8))
  buf.setFloat64(0, x)
  return (buf.setBigUint64(0, buf.getBigUint64(0) + 1n), buf.getFloat64(0))
}

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
  ...REPRESENTABILITY_BOUNDARY_FIXTURES,
]
