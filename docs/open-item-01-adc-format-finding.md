# Finding — the shipped result format cannot carry an enumerated declaration

**Open item 1.** Owner: Developer + NADIRA. Raised 4 September 2026, first day of C1 build.
**Status: escalated. Not resolved locally. C1-OUT-04 is held pending a decision.**

This is a finding about **the bench-tools result format**, not about C1. C1 is the
occasion on which it surfaced, which is what C1 was scheduled first to do.

## Question asked

Can the shipped Antigen Density Calculator's result object carry, as-is, the two
enumerated declaration fields C1 requires on top of the numbers?

- **Molecular weight provenance** (C1-MW-04) — five values: certificate of analysis,
  vendor datasheet, calculated from sequence, mass spectrometry, not recorded.
- **Mass basis** (C1-MW-07) — four values: assembled molecule, monomer or single chain,
  conjugate, not recorded.

## What was examined

`abmodi-ai/Ligant.ai-Antigen-Density-Calculator` at `53b49e3`, the revision deployed at
`benchtools.ligant.ai`. Cross-checked against `Ligant-ai/Antigen-Density-Calculator-OS`
at `c8f147e`. `src/lib/export.ts` and `src/lib/flags.ts` are byte-identical in the two
repositories, so "the shipped format" is unambiguous. The shipped repository is ahead of
the open-source mirror by one calibration check in `quantify.ts`, which does not touch
the result format.

## Answer

**No — and not because the enumerations do not fit. There is no result object to fit them into.**

Three separate gaps, in increasing order of how much they cost to close.

### 1. There is no structured result object

C1-OUT-03 requires "a structured, machine-readable result object [...] for every
calculation, with units attached to every quantity." C1-OUT-04 requires it to use the
shipped ADC's format.

The ADC has no such format. Its entire export surface is:

| `src/lib/export.ts` | What it emits |
|---|---|
| `exportResultsCsv` | A flat CSV, assembled by pushing literal rows |
| `exportChartSvg` | An SVG of the chart |
| `downloadCsv` | Rows in, CSV out |
| `summaryLine` | One human-readable line |

The only `JSON` anywhere in the ADC source is `localStorage` persistence of unsent UI
state (`src/lib/persist.ts:62`, `src/App.tsx:98`). That is a browser-session convenience,
not a result format: it is keyed to the ADC's own option shape, carries no results, and
is explicitly guarded against schema drift rather than versioned.

The CSV is not a format in the sense C1-OUT-04 needs. It is an ADC-specific document:
section headers (`SETTINGS`, `STANDARD CURVE`, `CALIBRATION STANDARDS`, `SAMPLES`) and
column names (`Gross ABC`, `Net ABC`, `CI lower`, `Inferred antigen sites low`) are
written as string literals at the point of emission. There is no schema, no envelope, no
versioning, and no generic quantity representation. Nothing in it is reusable by a second
tool without being rewritten, and there is no artefact a C1 result could be validated
against — which is what acceptance test 4 asks for.

### 2. Units are not attached to any quantity

Every numeric field on `SampleResult` is a bare `number | null`: `grossAbc`, `netAbc`,
`backgroundFraction`, `lower`, `upper`, `sitesLow`, `sitesHigh`. The unit lives in the
field *name* and, for a reader, in the CSV column header text.

That is workable for the ADC, where every quantity is in antibodies-bound-per-cell and
the unit never varies. It does not survive contact with C1, whose entire subject is that
the same quantity arrives in any of five mass-concentration units or five molar ones, and
where C1-UN-02 requires input and output units to be independently selected. A format
that encodes units in field names cannot express "the value the user entered, in the unit
they chose" without a new field per unit.

### 3. The shared flag type has no reason code

`src/lib/flags.ts` declares itself "Quality flags shared by every bench tool" — it is the
cross-tool contract, not an ADC-local type. It carries:

```ts
export interface Flag {
  level: 'warning' | 'critical'
  message: string
  remedy?: string
}
```

There is no code. §8 requires every C1 flag to appear "in both the human-readable and
structured output with a machine-readable reason code", and acceptance test 9 tests for
one. C1-FL-01 through C1-FL-08 are *identifiers* — the URS names them, the fixtures are
evaluated against them, and C1-ST-01 requires them to travel with any value handed to
another tool. Matching on `message` string content is not a machine-readable code; it
breaks the moment anyone edits the wording, and §8's messages are wording that Nadira is
still revising (open items 2 and 3).

## Why this is a finding about the format and not about C1

The mass-basis field is the shape of thing this format will need to carry repeatedly, and
C1 is the first tool to need it rather than the only one.

- **It is a declaration, not a measurement.** Nothing in the numbers reveals it. The ADC
  already has three of these — `antibodyHost`, `saturationConfirmed`, `valency`, all
  documented in `quantify.ts` as declarations precisely because "nothing in the numbers
  reveals it" — and it carries each as an ad-hoc field on its own options type, reachable
  only through the CSV as a literal row. It has the same problem C1 has; it has not had
  to name it, because it is one tool and its CSV is read by people.
- **The downstream tool needs it structurally.** §12 records that the titration tool is
  next in the build order and its users work in PE and APC routinely. C1-ST-01 says a
  value handed forward carries its mass basis and every flag raised on it. That handoff
  is the thing the format exists to make possible, and it is exactly what a per-tool CSV
  cannot do.
- **Extending the CSV locally would destroy the information.** Adding two columns to a
  C1-shaped CSV would produce a working C1 and would answer none of this. The next tool
  would meet the same wall with no record that C1 had already met it, and the fact that
  the format has no place for a declaration — the category of field that this tool set
  exists to compel — would go unrecorded at exactly the moment it was visible.

## What was not done

No extension, shim, adapter, or "C1-flavoured" variant of the ADC format was written.
Per C1-OUT-04 and the build instruction, this stops here.

`C1-OUT-04` is the only requirement held by this finding. The conversion engine,
validation, flags, fixtures and invariance tests are independent of the serialisation
format and proceed.

## What a decision needs to cover

Not a recommendation — the escalation is jointly owned and the choice is Nadira's to make
with A.B. These are the questions a resolution has to answer, recorded so the decision is
made once:

1. **Is there to be a shared result format at all**, or does each tool own its output and
   C1-OUT-04 get struck? §12's handoff requirement is the argument for the former; it is a
   real cost either way.
2. **Where does it live** — a fourth repository, or a package inside the ADC repo that C1
   depends on? `flags.ts` already claims cross-tool scope, so the second is closer to the
   current state than it looks.
3. **Does `Flag` gain a reason code**, and is that change made in the ADC too? The ADC's
   own flags are currently matched by message text in its CSV.
4. **Does the ADC's CSV export become a rendering of the structured object**, or stay a
   parallel path? C1-OUT-05 requires C1's two outputs to come from one computation and be
   unable to disagree; the ADC currently has no such guarantee.
5. **Does the ADC get retrofitted, or does the format start at C1** and absorb the ADC
   later? The ADC is shipped and cited (Zenodo `22283647`), so its CSV is now somebody's
   input file.

## Effect on acceptance

Acceptance test 4 — "every calculation produces a structured object validating against
the Antigen Density Calculator's format" — **cannot be executed**, and cannot be executed
by any implementation, because there is no format to validate against. This is not a C1
build failure. Recording it as one would be the quiet patch this item exists to prevent.
