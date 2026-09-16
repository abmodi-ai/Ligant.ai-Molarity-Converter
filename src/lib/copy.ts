/**
 * The page's reader-facing copy: the standfirst, a tooltip on every control,
 * and the material below the converter.
 *
 * Written for a bench scientist who has never seen the tool, so nothing here
 * carries a requirement code, an open item or a version number. Exported as
 * data on the same terms as `UNDETECTABLE_FAILURES`: the page renders it and
 * does not restate it, so a wording change is made once.
 *
 * `**` marks emphasis and nothing else. `Emphasised` in App.tsx is the only
 * reader of it.
 */

/** Above the converter. Short on purpose: every line here pushes the flags down. */
export const STANDFIRST: readonly string[] = [
  'Converts between mass and molar concentration for a protein whose molecular weight you declare.',
  'The arithmetic is simple. The molecular weight is what goes wrong, and a spreadsheet keeps no record of it. This tool asks for the weight, where it came from, and what it is the mass of, then puts all three in the result.',
]

/**
 * One per control. Each says what to enter and why it matters, and does not
 * restate the label. A tooltip is an array of paragraphs.
 */
export const TOOLTIPS = {
  direction: [
    'Pick the direction before you enter anything. Mass to molar takes mg/mL, µg/mL and similar and returns M, mM, µM, nM or pM. Molar to mass does the reverse. The same molecular weight is required either way.',
  ],
  concentration: [
    'The concentration you are starting from. Enter the number on its own and choose the unit beside it. A value typed with its unit in the same field, or with a comma for a decimal point, cannot be read.',
  ],
  concentrationUnit: [
    'Choose it deliberately. There is no default, because a pre-filled unit is a decision the tool would be making for you, and mistaking µg/mL for mg/mL is a thousandfold error that lands inside the plausible range and raises nothing.',
  ],
  mw: [
    'The tool never supplies, looks up or suggests this, including for common antibodies. A weight carried across from a different construct is the most common way a conversion goes wrong, and it is invisible in the answer.',
  ],
  mwUnit: [
    'Choose g/mol or kDa explicitly. The tool will not infer it from the size of the number, because a weight that is wrong by a thousandfold can still look reasonable.',
  ],
  provenance: [
    'Where the number came from: a certificate of analysis, a vendor datasheet, calculated from sequence, or mass spectrometry. "Not recorded" is a real answer and appears on the result. A sequence-derived weight excludes glycosylation where it is present.',
  ],
  massBasis: [
    'The same protein has more than one correct molecular weight depending on what is being weighed. A subunit mass used where the assembled mass was needed is out by a factor of two or four. A conjugate mass includes the label, which for a phycoerythrin conjugate is heavier than the antibody.',
    'Pick conjugate whenever a label or payload is in the stated mass, whatever the format underneath.',
  ],
  resultUnit: [
    'Independent of the units you entered. This is the one control with a default, because the unit is printed next to the answer, so a choice you did not intend is visible in the result.',
  ],
} as const satisfies Record<string, readonly string[]>

export interface Step {
  readonly title: string
  readonly body: string
}

/** Below the converter: how to use it, in order. */
export const HOW_TO_USE: readonly Step[] = [
  {
    title: 'Choose the direction.',
    body: 'Mass to molar, or molar to mass. Do this first, because it decides which fields you see.',
  },
  {
    title: 'Enter your concentration and choose its unit.',
    body: 'The number goes in the box, the unit in the menu beside it. Neither has a default.',
  },
  {
    title: 'Enter the molecular weight and choose its unit.',
    body: 'Take it from your certificate of analysis, vendor datasheet, sequence calculation or mass spec result. Do not take it from memory or from a similar construct: that is the error this tool exists to catch, and it cannot detect it for you.',
  },
  {
    title: 'Say where the weight came from, and what it is the mass of.',
    body: 'Both are required. If you do not know the source, choose "not recorded" and it will appear on the result rather than being left blank. For what the weight is the mass of, see the worked examples below if you are unsure.',
  },
  {
    title: 'Read the result with its notes.',
    body: 'The number comes with the relation applied, every input echoed back, and any notes raised. A note never blocks the result. Copy it for your notebook, or copy the structured record if you want a machine-readable version.',
  },
]

export const WORKED_EXAMPLES_INTRO =
  'The third field is the one people hesitate on. These cover the common cases.'

/**
 * The words in bold match the leading word of each mass-basis option as it is
 * labelled on the form (`MASS_BASIS_LABEL`), which is what makes them
 * findable. A change to those labels needs a look here.
 */
export const WORKED_EXAMPLES: readonly Step[] = [
  {
    title: 'A whole antibody.',
    body: 'You have an unconjugated IgG and your certificate says 150 kDa. That is the assembled molecule as it exists in solution. Choose **assembled**.',
  },
  {
    title: 'A single-chain construct.',
    body: 'You have an scFv, a VHH or a nanobody at 15 to 30 kDa. There is no larger assembly it belongs to, so it is already the whole molecule. Choose **assembled**, not subunit.',
  },
  {
    title: 'One chain of something larger.',
    body: 'Your certificate quotes 75 kDa for an IgG, which is a heavy and light chain pair rather than the whole antibody. Choose **subunit**. Using this figure as though it were the assembled mass gives an answer twice the true one.',
  },
  {
    title: 'A fluorophore conjugate.',
    body: 'You have an anti-CD19 PE at around 390 kDa. The stated mass includes the phycoerythrin, which is roughly 240 kDa on its own. Choose **conjugate**. The molarity you get is of the conjugate, not of the antibody inside it.',
  },
  {
    title: 'A conjugated single chain.',
    body: 'A VHH labelled with BV421. It is both a single chain and a conjugate. Choose **conjugate**, because that mass is what your number refers to.',
  },
  {
    title: 'You are not sure.',
    body: 'Choose **not recorded**. The result will say so, which is more useful to whoever reads your method later than a confident guess.',
  },
]

export const WHY_THIS_TOOL_EXISTS: readonly string[] = [
  'Converting nM to µg/mL requires a molecular weight, and in practice that weight is guessed, carried over from a different construct, or taken from a sequence when the protein is glycosylated.',
  'Two errors are common and neither is visible in the resulting number. A subunit mass quoted where the assembled mass was needed is a factor of two or four for an IgG, a bispecific, an scFv-Fc or a VHH construct. A conjugate mass used for the underlying protein matters in flow cytometry, where R-phycoerythrin is roughly 240 kDa against 150 kDa for the antibody it is attached to.',
  'A spreadsheet produces a clean, plausible number in all of these cases and keeps no record of which one you were in.',
  'So this tool will not complete a conversion without a molecular weight, and never supplies or suggests one. It asks where the weight came from, with "not recorded" accepted as an answer that appears on the output. It asks what the weight is the mass of. All three appear with the result and in the machine-readable record, so the number can be checked later by someone who was not there when it was produced.',
]

/** Introduces `UNDETECTABLE_FAILURES`, which is unchanged. */
export const CANNOT_DETECT_INTRO =
  'The tool guarantees the arithmetic, and guarantees that the weight, its source and what it is the mass of are recorded. It cannot check whether the weight you entered is the right one. Specifically, it cannot detect:'
