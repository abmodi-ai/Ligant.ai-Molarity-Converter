/**
 * Units, and the declarations that travel with a molecular weight.
 *
 * Every unit is explicitly selected (C1-UN-01) and never inferred from
 * magnitude (C1-MW-03). Input and output units are independent (C1-UN-02),
 * which is why mass and molar units are separate types rather than one union
 * with a runtime check.
 */

/** C1-UN-03. Mass concentration. */
export type MassUnit = 'mg/mL' | 'ug/mL' | 'ng/mL' | 'g/L' | 'mg/L'

/** C1-UN-04. Molar concentration. */
export type MolarUnit = 'M' | 'mM' | 'uM' | 'nM' | 'pM'

/** C1-MW-03. Never inferred from magnitude. */
export type MwUnit = 'g/mol' | 'kDa'

export const MASS_UNITS: readonly MassUnit[] = ['mg/mL', 'ug/mL', 'ng/mL', 'g/L', 'mg/L']
export const MOLAR_UNITS: readonly MolarUnit[] = ['M', 'mM', 'uM', 'nM', 'pM']
export const MW_UNITS: readonly MwUnit[] = ['g/mol', 'kDa']

/**
 * Multipliers to the base units: g/L for mass concentration, mol/L for molar,
 * g/mol for molecular weight.
 *
 * These are the only place a magnitude relationship between units is written
 * down. Nothing else in the tool may derive one.
 */
export const MASS_TO_G_PER_L: Readonly<Record<MassUnit, number>> = {
  'mg/mL': 1,
  'ug/mL': 1e-3,
  'ng/mL': 1e-6,
  'g/L': 1,
  'mg/L': 1e-3,
}

export const MOLAR_TO_MOL_PER_L: Readonly<Record<MolarUnit, number>> = {
  M: 1,
  mM: 1e-3,
  uM: 1e-6,
  nM: 1e-9,
  pM: 1e-12,
}

export const MW_TO_G_PER_MOL: Readonly<Record<MwUnit, number>> = {
  'g/mol': 1,
  kDa: 1000,
}

/** How a unit is written for a reader. ASCII identifiers, real symbols on screen. */
export const UNIT_LABEL: Readonly<Record<MassUnit | MolarUnit | MwUnit, string>> = {
  'mg/mL': 'mg/mL',
  'ug/mL': 'µg/mL',
  'ng/mL': 'ng/mL',
  'g/L': 'g/L',
  'mg/L': 'mg/L',
  M: 'M',
  mM: 'mM',
  uM: 'µM',
  nM: 'nM',
  pM: 'pM',
  'g/mol': 'g/mol',
  kDa: 'kDa',
}

/**
 * C1-MW-04. Where the molecular weight came from.
 *
 * "not recorded" is an accepted answer and is a value, not an absence — it must
 * be distinguishable in the structured object from a field left blank
 * (C1-MW-05), which is why the type has no `undefined` member and the form
 * carries a separate unanswered state.
 */
export type MwProvenance =
  | 'certificate-of-analysis'
  | 'vendor-datasheet'
  | 'calculated-from-sequence'
  | 'mass-spectrometry'
  | 'not-recorded'

export const MW_PROVENANCE: readonly MwProvenance[] = [
  'certificate-of-analysis',
  'vendor-datasheet',
  'calculated-from-sequence',
  'mass-spectrometry',
  'not-recorded',
]

export const MW_PROVENANCE_LABEL: Readonly<Record<MwProvenance, string>> = {
  'certificate-of-analysis': 'certificate of analysis',
  'vendor-datasheet': 'vendor datasheet',
  'calculated-from-sequence': 'calculated from sequence',
  'mass-spectrometry': 'mass spectrometry',
  'not-recorded': 'not recorded',
}

/**
 * C1-MW-07. What the stated molecular weight is the mass of.
 *
 * Single-select. The options are not strictly exclusive in the abstract — a
 * PE-conjugated scFv is both single-chain and conjugated — and the precedence
 * is carried in the option label rather than resolved by a fourth value or a
 * multi-select, which is how open item 10 was closed at v0.5.
 */
export type MassBasis = 'assembled' | 'monomer' | 'conjugate' | 'not-recorded'

export const MASS_BASIS: readonly MassBasis[] = ['assembled', 'monomer', 'conjugate', 'not-recorded']

/**
 * The option labels as §3.3 requires them to be presented.
 *
 * The conjugate label carries its precedence rule inline. Without it two people
 * in the same lab answer differently for the same reagent, which is worse than
 * the ambiguity it resolves.
 */
export const MASS_BASIS_LABEL: Readonly<Record<MassBasis, string>> = {
  assembled: 'the assembled molecule as it exists in solution',
  monomer: 'a monomer or single chain',
  conjugate:
    'a conjugate, including its label or payload — select this whenever a label or payload is included in the stated mass, whatever the format of the underlying protein',
  'not-recorded': 'not recorded',
}
