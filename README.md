# Molarity Converter for Biologics

Converts between mass concentration and molar concentration for a protein or
antibody, given its molecular weight, its source, and what that weight is the
mass of. Computes the number, shows the arithmetic that produced it, and
flags what it cannot verify rather than staying silent about it.

Free, open source, and built by [Ligant](https://ligant.ai) and
[A.B. Modi](https://www.linkedin.com/in/abmodi-ai/) for biologics researchers.
It runs entirely in your browser. Nothing you enter ever leaves your
computer.

Live at
**[benchtools.ligant.ai/molarity-converter](https://benchtools.ligant.ai/molarity-converter/)**.
Source at
**[github.com/abmodi-ai/Ligant.ai-Molarity-Converter](https://github.com/abmodi-ai/Ligant.ai-Molarity-Converter)**,
linked from the footer of the tool itself so the licence on the page can be
checked by the reader it is addressed to.

## Why this exists

A molarity conversion is one division: `molar = mass ÷ molecular weight`. The
arithmetic was never the hard part. Two things around it are.

**A default unit is worse than no default**, because it stops being read.
`125` meant as µg/mL, typed into a field that defaults to mg/mL, is a
concentration wrong by a factor of 1,000, and both the number entered and the
number computed can land comfortably inside every plausibility check a tool
might run: nothing about either value looks wrong on its own. So this tool
supplies no default for the entered concentration's unit or the molecular
weight's unit. Both are chosen, every time, from a blank selector. The one
place a default remains is the result unit, deliberately, because a wrong
result unit produces a visibly wrong-looking number next to an unmistakable
unit label; a wrong input unit produces a confidently wrong number with
nothing on screen to catch it.

**A molecular weight is never supplied, looked up, or assumed**, not even for
common antibodies. The same weight declared as *the assembled molecule*
versus *a subunit of it* changes the answer by exactly the construct's
oligomeric multiplicity, and a spreadsheet does not ask which one was meant.
This tool requires three declarations before it will compute anything: the
weight, where it came from, and what it is the mass of. All three travel with
the result, in the derivation shown on screen and in the structured object
you can copy.

## What it does

One determination, in either direction: the molar concentration corresponding
to a stated mass concentration, or the reverse, for a protein whose molecular
weight you declare along with its source and what that weight is the mass of.
It does not plan dilutions, prepare stocks, identify proteins, or supply
molecular weights.

Every calculation requires:

- a concentration, with its unit
- a molecular weight, with its unit
- where that weight came from (certificate of analysis, vendor datasheet,
  calculated from sequence, mass spectrometry, or not recorded)
- what the weight is the mass of (the assembled molecule, a subunit of it, a
  conjugate including its label or payload, or not recorded)

Nothing computes until all four are present. The result carries the relation
applied, the divisor used, every assumption made, the engine version, and a
structured JSON object with a unit on every quantity and the unrounded value
alongside the displayed one.

### What it flags

Flags never block a calculation; they attach a machine-readable reason code
to a result the tool still computed and still shows you.

| Code | Fires when | Says |
|---|---|---|
| `C1-FL-01` | Molecular weight outside 1–1000 kDa (1–2000 kDa if declared a conjugate) | Outside the usual range; confirm the units and the value |
| `C1-FL-02` | Mass concentration above 250 mg/mL | Above the range of typical high-concentration formulations; also names the solute-volume ambiguity that appears at that concentration |
| `C1-FL-03` | Molar concentration below 1 pM | Below the range typical of biologic working solutions |
| `C1-FL-04` | Weight's source is "calculated from sequence" | Excludes glycosylation and other post-translational modification where these are present; for an aglycosylated construct the sequence mass is the actual mass |
| `C1-FL-05` | Weight's source is "not recorded" | The result cannot be traced to a source |
| `C1-FL-06` | Weight is declared a subunit | The molar concentration is of the subunit, not the assembled molecule |
| `C1-FL-07` | Mass basis is "not recorded" | Whether this refers to the assembled molecule, a subunit, or a conjugate cannot be determined from the record |
| `C1-FL-08` | Weight is declared a conjugate | The concentration is of the conjugate, not the underlying protein; drug-to-antibody ratio and labelling degree are not corrected for |
| `C1-FL-09` | A declaration was carried across a change of direction without re-confirmation | Which declarations were carried, and that the result is computed from them |
| `C1-FL-10` | Both quantities are exactly zero | The absence of solute, not an implausibly low concentration; the conversion is exact |
| `C1-FL-11` | A computed quantity underflows to zero in the chosen unit | The value is too small to represent in that unit, and is not actually zero; suggests a unit that can represent it, if one exists |

Two conditions are rejected outright rather than flagged, because no
quantity exists to compute from: a molecular weight that is zero or
negative, and a concentration that is negative. An entry that does not parse
as a number at all is rejected the same way, with its own reason code.

### What it cannot detect

Stated on the tool's own page, not only here:

- A molecular weight that is correct for a different construct.
- A molecular weight that was correct for a prior lot or formulation.
- A subunit mass quoted where the assembled mass was needed, or the reverse:
  the declaration is compelled but cannot be verified.
- A unit-magnitude transcription error that still lands inside the plausible
  range. `C1-FL-01` catches a 1000× error landing outside 1–1000 kDa; it
  cannot catch one that lands inside, and cannot distinguish a genuinely
  unusual protein from a typo.
- Any error in the input concentration itself.
- That a result shown as `0.00000` is a real concentration too small to
  represent in the unit you chose, rather than an empty solution. The tool
  detects and records this; what it cannot do is show you the value, since
  the two cases are indistinguishable on screen by eye. Reporting in a
  smaller unit is usually enough.
- A conjugate mass declared as unconjugated, or the reverse.
- Whether a stated concentration is per volume of solution or per volume of
  solvent. Near 250 mg/mL, a partial specific volume around 0.73 mL/g means
  the solute occupies roughly 18% of the volume, and the two are not the
  same number; `C1-FL-02` names this where it fires.

## The functions that do the work

The computation is a small, pure core with no framework in it.

| Module | Does |
|---|---|
| `src/lib/convert.ts` | The conversion itself: one folded divisor per direction, rather than a chain of unit operations, which is what keeps the round-trip error inside 1 ULP and preserves range at the subnormal end |
| `src/lib/compute.ts` | The single computation every output is generated from: assembles the relation, the derivation, the assumptions and the flags into one result |
| `src/lib/flags.ts` | Every §8 condition, the constants register (every threshold, its value, and whether it is derived or chosen by inspection), and the failure classes the tool discloses that it cannot detect |
| `src/lib/validate.ts` | The two conditions that reject outright: a molecular weight that cannot be positive, a concentration that cannot be negative |
| `src/lib/underflow.ts` | Detects when a computed quantity has underflowed to zero, and checks which output units, if any, could represent it |
| `src/lib/retention.ts` | Which declarations survive a change of conversion direction, and which of those are marked as carried rather than re-affirmed |
| `src/lib/serialise.ts` | The structured, machine-readable result: a schema versioned independently of the engine, with a unit on every quantity and the unrounded value alongside the displayed one |
| `src/lib/format.ts` | Six-significant-figure display, rounded half-to-even |
| `src/lib/units.ts` | The unit tables and the option labels, including the mass-basis label's precedence rule |

## Reproducibility and determinism

**Every reported number comes from one computation**, `computeConversion` in
`src/lib/compute.ts`. The structured object and the on-screen result are two
views of the same call, never two separate calculations, so they cannot
disagree with each other.

Two properties of the arithmetic are readable directly in the source, not
just asserted here:

- **Rounding is half-to-even** (`src/lib/format.ts`), the IEEE 754 default
  and the default in Python, R and Julia.
- **Round-trip is a structural requirement, not an incidental property**
  (`src/lib/convert.ts`). Converting a value and converting the result back
  returns the original to within 1 ULP, because the unit factors are folded
  into a single divisor rather than applied as a chain of operations. An
  unfolded chain both rounds worse and underflows sooner.

No AI or model output reaches a computed value. The conversion is a handful
of pure functions over the values you enter, with no runtime dependency
beyond React.

During development, every value was additionally checked against an
independent Python reimplementation written from the specification, and
against exact rational arithmetic rather than against another
implementation, which is what distinguished "the two agree" from "either is
right". That verification tooling is not part of this repository: this
paragraph describes how the tool was built, not something reproducible from
what is here.

## Privacy

Nothing you enter is transmitted, and the page contacts no third party.
`src/` contains no `fetch`, no `XMLHttpRequest`, and no other network
primitive: a property you can confirm yourself by reading the source,
rather than just trusting this sentence.

- No analytics script, no error reporting, no telemetry.
- Nothing persists between visits. There is no localStorage, no
  sessionStorage and no URL state that repopulates an input.

**The footer states only what has actually been verified**, with one
deliberately conditional claim. Whether the deployed address itself (not
just the build) has been driven by a real browser with network monitoring
armed before the page loads is gated on `NETWORK_CLAIM_VERIFIED` in
`src/lib/site.ts`, which flips only once that specific run has passed. As of
this writing it has not: the deployed host interposes a bot challenge that
blocks an automated browser from reaching the page at all, so that check is
currently unrunnable rather than run and clean. The footer says exactly
that, rather than the stronger claim it cannot yet back up.

## Running it

```sh
npm install
npm run dev         # development server
npm run typecheck   # type-check only
npm run build       # static site to dist/
npm run preview     # serves the build at a local address
```

## Contributing

The most valuable contributions are corrections to the arithmetic or the
disclosures: if a flag fires when it should not, if a threshold is wrong, or
if something the tool cannot detect is missing from the list that says so, an
issue with the case that shows it is worth more than a patch.

No AI or model output may reach a computed value. A new threshold needs the
measurement that justifies it, not just a plausible-looking number.

## Status and limitations

`v0.1.0`. **Research use only. Not qualified for GxP decision-making.**

Inputs and result are not guaranteed to fit one screen without scrolling on
every laptop display; this is a known, declared deviation rather than an
unwritten shortfall. See "What it cannot detect" above for what the flag set
does not, and cannot, cover.

## Citation

> Modi, A.B. (2026). Molarity Converter for Biologics (`v0.1.0`) [Computer
> software]. Ligant AI Incorporated.
> <https://benchtools.ligant.ai/molarity-converter/>

No DOI yet. This repository is not archived on Zenodo at the time of
writing; the citation above is complete and correct without one, and a DOI
will be added to it, to [`CITATION.cff`](CITATION.cff), and to the footer's
copy of the same string, once a tagged release is archived there. The
footer of the running tool carries this citation with a control that copies
it.

## Licence

Apache License 2.0. See [`LICENSE`](LICENSE), which is also served at
`/LICENSE` on the live site so the footer's reference resolves.

Apache-2.0 rather than MIT because it grants an express patent licence,
which matters for a measurement tool published by a company. Copyright 2026
Ligant AI Incorporated.
