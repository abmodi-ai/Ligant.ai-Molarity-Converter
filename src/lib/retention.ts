/**
 * C1-ST-03 — what is carried across a change of conversion direction, and what
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
