/**
 * C1-ST-03: what is carried across a change of conversion direction, and what
 * is marked as carried.
 *
 * "Changing the conversion direction shall not silently carry a molecular
 * weight, its source, or its mass-basis declaration. Any value retained shall
 * be visibly marked as retained."
 *
 * The requirement is per FIELD, and the model has to be per field too. The
 * first implementation held retention as one boolean for the whole form, which
 * satisfies the requirement at the moment of the switch and breaks one
 * keystroke later: editing the molecular weight cleared the badge from the
 * source and the mass basis, which were still carrying their pre-switch values
 * and were now unmarked. Reachable in three clicks, and invisible to every test
 * in the suite because nothing rendered the form.
 *
 * Two rules, and the second is the one the boolean got wrong:
 *
 *   1. A field is marked as retained only if it actually HOLDS a value. An
 *      empty select is not a retained value, and badging it teaches the user
 *      that the badge means nothing.
 *   2. A field stops being marked when THAT field is edited, and not when some
 *      other field is. Confirming the weight says nothing about the source.
 *
 * Kept out of the component and expressed as data so it can be tested without
 * a DOM. `retention.test.ts` would have caught the original defect; the browser
 * check in `scripts/check-ui.mjs` catches the wiring.
 */

/** The three declarations C1-ST-03 names. The entered concentration is not one. */
export type RetainableField = 'mw' | 'provenance' | 'massBasis'

export const RETAINABLE_FIELDS: readonly RetainableField[] = ['mw', 'provenance', 'massBasis']

/** Which of the three currently hold a value, at the moment of the switch. */
export interface DeclarationState {
  mw: string
  provenance: string
  massBasis: string
}

/**
 * The set of fields to mark as retained when the direction changes.
 *
 * Only fields holding a value. A field left blank is not carried, so marking it
 * would be a claim about nothing.
 */
export function retainedOnDirectionChange(state: DeclarationState): Set<RetainableField> {
  const retained = new Set<RetainableField>()
  if (state.mw.trim() !== '') retained.add('mw')
  if (state.provenance !== '') retained.add('provenance')
  if (state.massBasis !== '') retained.add('massBasis')
  return retained
}

/**
 * The set after the user edits one field.
 *
 * Removes exactly that field. The others are still carrying pre-switch values
 * and are still unconfirmed, so they stay marked.
 */
export function confirmField(
  retained: ReadonlySet<RetainableField>,
  field: RetainableField,
): Set<RetainableField> {
  const next = new Set(retained)
  next.delete(field)
  return next
}

/**
 * Which declarations a RESULT was computed from without re-confirmation.
 *
 * Retention was a property of the form until v0.1.2, and the badge was the
 * whole of it. That satisfied C1-ST-03 as written, the value is visibly
 * marked: and left the record wrong in a way the screen was not: the
 * derivation said "as declared" of a weight the user had never re-affirmed in
 * this direction, and the structured object carried no trace of it at all. A
 * result copied into a notebook claimed provenance it did not have.
 *
 * So retention crosses into the computation. Not to change the arithmetic,
 * it changes nothing there, but because C1-ST-01 requires what qualifies a
 * value to travel with it, and "carried, not re-confirmed" qualifies a value.
 *
 * All three fields are always present, deliberately. A consumer must not have
 * to read an absent key as `false`, and a tool that has never recorded this
 * must not be indistinguishable from one where nothing happened to be retained.
 */
export interface RetainedFields {
  mw: boolean
  provenance: boolean
  massBasis: boolean
}

/** The overwhelmingly common case: a conversion with no direction change behind it. */
export const NOTHING_RETAINED: RetainedFields = Object.freeze({
  mw: false,
  provenance: false,
  massBasis: false,
})

/** The form's live set, as the shape a request and a structured object carry. */
export function toRetainedFields(retained: ReadonlySet<RetainableField>): RetainedFields {
  return {
    mw: retained.has('mw'),
    provenance: retained.has('provenance'),
    massBasis: retained.has('massBasis'),
  }
}

/** Whether anything at all was carried without re-confirmation. */
export function anyRetained(r: RetainedFields): boolean {
  return r.mw || r.provenance || r.massBasis
}

/** How the retained fields read in a message, in the order the form presents them. */
export function retainedFieldNames(r: RetainedFields): string[] {
  const names: string[] = []
  if (r.mw) names.push('the molecular weight')
  if (r.provenance) names.push('its source')
  if (r.massBasis) names.push('the mass basis')
  return names
}
