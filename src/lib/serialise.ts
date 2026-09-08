/**
 * C1-OUT-03 — the structured, machine-readable result object.
 *
 * WHY THIS EXISTS SEPARATELY FROM C1-OUT-04. C1-OUT-04 requires the object to
 * use the shipped Antigen Density Calculator's format, and that format does not
 * exist — `docs/open-item-01-adc-format-finding.md`. C1-OUT-03's text does not
 * reference the ADC at all. The two were held together until 4 September 2026,
 * which meant a finding about another tool stopped this one emitting anything
 * machine-readable. The hold on C1-OUT-03 is lifted; the hold on C1-OUT-04
 * stands.
 *
 * So the schema below is OWNED BY C1 and versioned separately from the engine.
 * It is to be reconciled with a bench-tools format when open item 1 lands, and
 * `schema.version` is what makes that reconciliation visible rather than silent.
 * Nothing here is an extension of the ADC's CSV; no ADC shape has been invented
 * to stand in for one.
 *
 * TWO PROPERTIES THE SHAPE IS BUILT FOR:
 *
 *   1. C1-OUT-03 — "units attached to every quantity". Every number that has a
 *      unit is a `{ value, unit }` pair. The first draft of `ConversionResult`
 *      put four bare numbers beside one shared `units` object, which reads as
 *      satisfying the requirement and does not: a consumer holding one quantity
 *      cannot tell what it is in.
 *   2. C1-DAT-03 — the object alone is sufficient to reproduce the reported
 *      result. Nothing is elided as derivable. `reproduceFrom` below does the
 *      reproduction and `serialise.test.ts` runs it over the whole fixture set,
 *      so sufficiency is established by execution rather than by inspection.
 *
 * C1-OUT-05: this is a projection of `ConversionResult`, not a recomputation.
 * It takes the finished result and rearranges it. There is no arithmetic in
 * this file, which is why the structured and human-readable outputs cannot
 * disagree.
 *
 * C1-UN-07: every `value` is the UNROUNDED double. The six-significant-figure
 * renderings are carried alongside, under `displayed`, and are never the only
 * form a quantity appears in.
 */

import type { ConversionResult } from './compute'
import { computeConversion } from './compute'
import { ENGINE_VERSION, type Direction } from './convert'
import { DISPLAY_SIG_FIGS, ROUNDING_MODE } from './format'
import type { FlagCode } from './flags'
import { TOOL_ID, TOOL_NAME } from './site'
import type { MassBasis, MassUnit, MolarUnit, MwProvenance, MwUnit } from './units'
import { NOTHING_RETAINED, type RetainedFields } from './retention'

/**
 * The schema's own version, independent of the engine's.
 *
 * C1-NF-06 ties `engineVersion` to calculation behaviour. A change to the shape
 * of this object is not a change to the numbers, and versioning the two
 * together would make one of them lie. They move separately and both are on
 * the object.
 */
export const SCHEMA_NAME = 'ligant-benchtools-c1-conversion'
/**
 * 1.0.0 → 1.1.0: `declarations.retained` added, and `flags[].kind` gained
 * `retention`. Additive for a consumer that ignores unknown keys; a new required
 * field for one that validates. Moving independently of ENGINE_VERSION, which
 * also moved this release for an unrelated reason — which is the point of
 * having two.
 */
export const SCHEMA_VERSION = '1.1.0'

/** A number that means nothing without its unit, carrying it. */
export interface Quantity<U extends string = string> {
  /** Unrounded, per C1-UN-07. */
  value: number
  unit: U
}

export interface StructuredFlag {
  /** The machine-readable reason code §8 requires. */
  code: FlagCode
  message: string
  evaluatedOn: string
  kind: 'threshold' | 'declaration' | 'retention'
}

export interface StructuredResult {
  schema: { name: string; version: string }
  tool: { id: string; name: string; engineVersion: string }
  /** C1-CV-02. Part of the reproduction set. */
  direction: Direction
  /** Which quantity the user typed; the other was computed. */
  entered: 'mass' | 'molar'
  quantities: {
    massConcentration: Quantity<MassUnit>
    molarConcentration: Quantity<MolarUnit>
    molecularWeight: Quantity<MwUnit>
    /** The single folded divisor, in mass concentration per molar concentration. */
    effectiveDivisor: Quantity<string>
  }
  declarations: {
    molecularWeightProvenance: MwProvenance
    massBasis: MassBasis
    /**
     * C1-ST-03. Which declarations were carried across a change of conversion
     * direction without being re-confirmed.
     *
     * The flag (C1-FL-09) says that something was; this says WHICH, because one
     * flag cannot, and a consumer deciding whether to trust a molecular weight
     * needs to know it was the weight rather than the mass basis. Same division
     * the mass basis already uses: the flag warns, the declaration records.
     *
     * All three keys are always present. An absent key would be read as `false`
     * by a careless consumer and as "this tool does not record retention" by a
     * careful one, and those are different facts.
     */
    retained: RetainedFields
  }
  displayed: {
    massConcentration: string
    molarConcentration: string
    significantFigures: number
    roundingMode: typeof ROUNDING_MODE
  }
  flags: StructuredFlag[]
  derivation: {
    relation: string
    unitHandling: string
    assumptions: string[]
  }
  statements: {
    precision: string
    scope: string
    moleculesNotSites: string
    thresholdEvaluation: string
  }
}

/** C1-OUT-03. Produced for every calculation, from the one computation. */
export function toStructuredResult(result: ConversionResult): StructuredResult {
  return {
    schema: { name: SCHEMA_NAME, version: SCHEMA_VERSION },
    tool: { id: TOOL_ID, name: TOOL_NAME, engineVersion: result.engineVersion },
    direction: result.direction,
    entered: result.entered,
    quantities: {
      massConcentration: { value: result.massValue, unit: result.units.mass },
      molarConcentration: { value: result.molarValue, unit: result.units.molar },
      molecularWeight: { value: result.declarations.mwValue, unit: result.units.mw },
      effectiveDivisor: { value: result.effectiveMw, unit: result.effectiveMwUnit },
    },
    declarations: {
      molecularWeightProvenance: result.declarations.provenance,
      massBasis: result.declarations.massBasis,
      retained: { ...result.declarations.retained },
    },
    displayed: {
      massConcentration: result.displayed.mass,
      molarConcentration: result.displayed.molar,
      significantFigures: result.displayed.sigFigs,
      roundingMode: ROUNDING_MODE,
    },
    flags: result.flags.map((f) => ({
      code: f.code,
      message: f.message,
      evaluatedOn: f.evaluatedOn,
      kind: f.kind,
    })),
    derivation: {
      relation: result.relation,
      unitHandling: result.unitHandling,
      assumptions: [...result.assumptions],
    },
    statements: { ...result.statements },
  }
}

/** The serialised form. Stable key order, so two runs of one case diff cleanly. */
export function toJson(result: ConversionResult): string {
  return JSON.stringify(toStructuredResult(result), null, 2)
}

/**
 * C1-DAT-03 — recompute the result from the object alone.
 *
 * Reads only the structured object. If a field the reproduction needs were
 * dropped from the schema, this stops compiling or stops agreeing, which is the
 * point of writing it as code rather than asserting sufficiency in a comment.
 */
export function reproduceFrom(obj: StructuredResult): ConversionResult {
  const q = obj.quantities
  const enteredValue =
    obj.direction === 'mass-to-molar' ? q.massConcentration.value : q.molarConcentration.value

  const outcome = computeConversion({
    direction: obj.direction,
    enteredValue,
    mwValue: q.molecularWeight.value,
    provenance: obj.declarations.molecularWeightProvenance,
    massBasis: obj.declarations.massBasis,
    // C1-DAT-03. Retention changes no arithmetic but does change the flag set
    // and the derivation, so a reproduction that dropped it would return a
    // different result while looking like a faithful one.
    retained: obj.declarations.retained ?? NOTHING_RETAINED,
    units: {
      mass: q.massConcentration.unit,
      molar: q.molarConcentration.unit,
      mw: q.molecularWeight.unit,
    },
  })
  if (!outcome.ok) {
    throw new Error(`the structured object did not reproduce: ${outcome.rejections.map((r) => r.code).join(', ')}`)
  }
  return outcome
}

export interface ValidationProblem {
  path: string
  problem: string
}

/**
 * Structural validation, as acceptance 4 will need against whichever format
 * open item 1 settles on.
 *
 * Written against C1's own schema in the meantime, and deliberately strict
 * about the property that motivated the requirement: a quantity is a value AND
 * a unit, and a unit that is an empty string is not a unit.
 */
export function validateStructuredResult(obj: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = []
  const fail = (path: string, problem: string) => problems.push({ path, problem })

  if (typeof obj !== 'object' || obj === null) {
    return [{ path: '', problem: 'not an object' }]
  }
  const o = obj as Record<string, any>

  if (o.schema?.name !== SCHEMA_NAME) fail('schema.name', `expected ${SCHEMA_NAME}`)
  if (typeof o.schema?.version !== 'string' || !o.schema.version) fail('schema.version', 'missing')
  if (typeof o.tool?.engineVersion !== 'string' || !o.tool.engineVersion) {
    fail('tool.engineVersion', 'missing — C1-NF-06 and C1-OUT-01 require it on the output')
  }
  if (o.direction !== 'mass-to-molar' && o.direction !== 'molar-to-mass') fail('direction', 'not a direction')
  if (o.entered !== 'mass' && o.entered !== 'molar') fail('entered', 'not "mass" or "molar"')

  for (const key of ['massConcentration', 'molarConcentration', 'molecularWeight', 'effectiveDivisor']) {
    const q = o.quantities?.[key]
    const path = `quantities.${key}`
    if (typeof q !== 'object' || q === null) {
      fail(path, 'missing')
      continue
    }
    // C1-UN-07: the unrounded value, and a real number rather than a rendering.
    if (typeof q.value !== 'number' || !Number.isFinite(q.value)) fail(`${path}.value`, 'not a finite number')
    if (typeof q.unit !== 'string' || q.unit === '') {
      fail(`${path}.unit`, 'C1-OUT-03 requires a unit attached to every quantity')
    }
  }

  if (typeof o.declarations?.molecularWeightProvenance !== 'string' || !o.declarations.molecularWeightProvenance) {
    fail('declarations.molecularWeightProvenance', 'missing — C1-MW-04 makes it required')
  }
  if (typeof o.declarations?.massBasis !== 'string' || !o.declarations.massBasis) {
    fail('declarations.massBasis', 'missing — C1-MW-07 makes it required')
  }
  // C1-ST-03. Every key, every time — see the note on the field.
  for (const key of ['mw', 'provenance', 'massBasis']) {
    if (typeof o.declarations?.retained?.[key] !== 'boolean') {
      fail(`declarations.retained.${key}`, 'missing — C1-ST-03 requires the retention state to be recorded, not implied by absence')
    }
  }

  if (o.displayed?.significantFigures !== DISPLAY_SIG_FIGS) fail('displayed.significantFigures', 'not the displayed precision')
  if (o.displayed?.roundingMode !== ROUNDING_MODE) fail('displayed.roundingMode', 'not stated')
  for (const key of ['massConcentration', 'molarConcentration']) {
    if (typeof o.displayed?.[key] !== 'string' || !o.displayed[key]) fail(`displayed.${key}`, 'missing')
  }

  if (!Array.isArray(o.flags)) {
    fail('flags', 'missing — an empty array is the no-flags case and is not the same as absent')
  } else {
    o.flags.forEach((f: any, i: number) => {
      if (!/^C1-FL-(0[1-9]|10)$/.test(f?.code ?? '')) fail(`flags[${i}].code`, 'not a machine-readable reason code')
      if (typeof f?.message !== 'string' || !f.message) fail(`flags[${i}].message`, 'missing')
      if (!['threshold', 'declaration', 'retention'].includes(f?.kind)) fail(`flags[${i}].kind`, 'missing')
    })
  }

  if (typeof o.derivation?.relation !== 'string' || !o.derivation.relation) fail('derivation.relation', 'missing — C1-CV-03')
  if (typeof o.derivation?.unitHandling !== 'string' || !o.derivation.unitHandling) fail('derivation.unitHandling', 'missing')
  if (!Array.isArray(o.derivation?.assumptions) || o.derivation.assumptions.length === 0) {
    fail('derivation.assumptions', 'missing — C1-OUT-01')
  }
  for (const key of ['precision', 'scope', 'moleculesNotSites', 'thresholdEvaluation']) {
    if (typeof o.statements?.[key] !== 'string' || !o.statements[key]) fail(`statements.${key}`, 'missing')
  }

  return problems
}

/** The engine version this schema was emitted alongside. Re-exported for consumers. */
export { ENGINE_VERSION }
