# Correspondence file: instances of the thesis, from the C1 build

Cases where a check stood in for the property it was supposed to establish, or where a
comparison was tightened past what correct code can satisfy. Kept because the manuscript's
argument is about exactly this, and because instances 1 to 4 were found by accident rather
than by looking: which is itself the point.

Instances 5 to 7 are the exception and are marked as such: they were found by a clause-by-clause
audit against the URS, which is a schedulable method and a weaker kind of evidence. Both
provenances belong in the file. If every instance had to be stumbled over, the argument would
be that nothing can be done.

Instance 8 has a third provenance, and it is the one worth wanting: it was found by **acting on
a previous finding**. Correcting the viewport number is what exposed that the number was a
viewport at all.

Five families. The first is the manuscript's thesis directly. The second is its mirror. The
last three are not about checks that were written badly at all: a change nobody reviewed, a
measurement that was independent in the wrong direction, and an instruction that was correct
and was put where it would not be read as one. Each was added when it occurred.

---

## I. A proxy accepted for the property

The check is not the thing. It correlates with the thing, usually strongly, and the gap is
invisible until something falls into it.

### 1. The beacon: the build as a proxy for what is served

**Tool: Antigen Density Calculator.** Static analysis and a runtime browser assertion, both
against the build, stood in for "no request leaves the origin". A reviewer found an
analytics beacon on the **deployed** site that no source-level check could have caught,
because a host inserts it into the response after the build.

The ADC now names the gap rather than claiming to close it: "That check is on the build, and
the build is what gets published. What it cannot see is anything a host inserts into a
response afterwards."

**Consequence for C1.** Acceptance test 14 is written to require the deployed address and to
say in terms that verification against the build artefact does not satisfy it. C1's
`check-network.mjs` reports a local run as **UNRUN**, not as a pass, precisely so this
instance cannot recur by the instrument being mistaken for the test.

### 2. The span guard: absolute magnitude as a proxy for implausibility

**Tool: Antigen Density Calculator.** A floor on intensity stood in for "this reading is
wrong". But a log-log fit makes the intensity unit arbitrary: the same 0.0001 is a typo on a
channel scale and a legitimate reading on a normalised one. An absolute floor refuses a
legitimate rescaling and admits a genuine defect.

The property is the **span**, what cannot be legitimate is one standard covering nine
decades: and the span is scale-invariant, so it survives a change of unit that defeats any
absolute threshold.

### 3. The tie detector: round-tripping as a proxy for a terminating expansion

**Tool: C1, this build.** To decide whether a value sits exactly halfway at six significant
figures, both the TypeScript and the Python asked whether it *round-trips* through seven
significant digits. That is not the same question.

The double nearest `1.953125e-5` round-trips through seven digits, so both detectors called
it a tie. Its exact decimal expansion continues `…00040657581468…`, it is not halfway, and it
rounds up under either rule. The detector reported four ordinary values, 125, 250, 1.25,
0.00390625: as ties on the same reasoning.

The property is that the **exact decimal expansion terminates** at the seventh significant
digit with a 5. Both implementations now decide on the exact expansion: `BigInt` arithmetic
on the IEEE 754 fields in TypeScript, `Decimal(v)` in Python. `Decimal(str(v))` would have
reintroduced the same defect one layer down.

Found only because the same value was examined in two output units and behaved differently,
which is the observation in §VI below, not a method.

### 4. Excluding the input class as a proxy for handling it

**Tool: C1, this build.** On discovering that displayed precision has a tie-breaking rule the
URS did not name, the first response was a guard asserting that **no fixture may land on a
tie**. The suite then passed: by excluding the input class that exposes the ambiguity.

This is the fixture-distribution failure §10 and C1-FX-09 were written against, in the form
that is hardest to see: it looks like hygiene. Two implementations could disagree on real
user data with the suite green.

Ties are unit-dependent (§VI), so they cannot be excluded from the input space at all; only
from the fixtures, which is strictly worse than not checking.

**The guard is now inverted**, and that inversion is the transferable part: see §VII.

### 5. A count over the set as a proxy for coverage of each threshold

**Tool: C1, this build.** §10's C1-FX-04 requires cases either side of, and exactly on, **every**
§8 threshold, **in both conversion directions**. The guard written to enforce it asserted that
the boundary set had at least twelve fixtures, and that at least one fixture ran in each
direction: **across the whole set**.

Both are properties of the set. Neither is the property required, which is per threshold. The
guard passed while both molecular-weight bounds ran in `mass-to-molar` only, and the helper
that built them claimed both directions in its own docstring.

Rewritten to assert every threshold × side × direction by name, the guard immediately found two
more gaps it had been hiding: no below-the-bound case for the mass threshold and no
above-the-bound case for the molar one, in either direction. Twelve boundary fixtures became
twenty-four.

**No wrong answer was ever possible**, C1-FL-01 reads the declared weight and no direction
enters the comparison: which is what makes this the cleanest instance in the file. Nothing was
broken. The check was simply not about the thing, and a count is the easiest proxy in the world
to write, because it is true.

### 6. A control that exists as a proxy for a choice that was made

**Tool: C1, this build.** C1-MW-03 and C1-UN-01 require every unit to be "explicitly selected".
The build put a `<select>` beside each numeric field, pre-filled with the common answer. The
requirement's text was met by the control being present; what it was written to compel, the
user having *decided*: was not.

The provenance and mass-basis fields in the same form were compelled properly, with a disabled
`(select a source)` and no computation until answered. So the build knew how to compel a choice and
did not, on the two fields where the wording was slightly weaker.

What it costs is not hypothetical:

```
125 entered as mg/mL (meant µg/mL), MW 150 kDa  →  833.333 µM   flags: []
125 µg/mL as intended,              MW 150 kDa  →  0.833333 µM  flags: []
```

1000× wrong, both quantities inside every §8 bound, nothing raised. It is §9's failure class 4
arising from a tool default rather than from the user. **A default that is usually right is
worse than one that is usually wrong, because it stops being read.**

Worth separating from the molecular-weight unit, which is mostly self-catching: a g/mol figure
left on kDa is enormous and C1-FL-01 fires. The two look like one finding and are not.

### 7. Displayed as a proxy for checkable

**Tool: C1, this build.** C1-CV-03 requires the relation applied to be displayed with the
result. It exists so that a reader can check the arithmetic. The build displayed

```
molar concentration = mass concentration ÷ molecular weight  (mg/mL ÷ effective kDa → µM)
```

"Effective kDa" is not a unit. It was a name for the folded divisor, and a reader cannot
evaluate it: so the requirement was satisfied in form and defeated in exactly the respect it
was written for. The relation is now named quantities only, with the unit handling as its own
statement and the divisor given in `mg/mL per µM`, which is a ratio of two standard units and
can be checked against.

### 8. A viewport the verification chose as a proxy for a display someone owns

**Tool: C1, this build.** C1-NF-03 says the inputs and result shall fit one screen "on a
standard laptop display". Nothing defines the display, so the check supplied one: first
1440 × 820, then 1440 × 900 after the shared masthead landed.

Both were **viewport** heights. A 1440 × 900 laptop does not give a page 900 pixels, browser
chrome takes about a hundred and the page gets 797. The check was passing against a screen
nobody owns, and it had been doing so since v0.1: the second number was chosen with more care
than the first and was wrong in the same way, which is the part worth recording. Raising it
felt like addressing the finding.

This is §I.5 one level further out. There the guard measured the wrong property of the right
thing; here the guard measured the right property of a thing that does not exist. Both are
comfortable to write, because a number in a test looks like a standard whether or not anything
outside the test corresponds to it.

**The resolution is not a better number.** `check-network.mjs` now reports the worst case at
three candidate windows and reports the requirement as UNMET, the same shape as acceptance
test 14 reporting `UNRUN`. There is no constant to pass against until the owner sets one, and
a check that says so is worth more than a check that passes. What the invented standard had
been concealing is that the page does not fit at any size measured, and at round 7 that
shortfall became a declared deviation on the page rather than a fact known only to the
verification.

**It recurred, one step along, which is why the transferable below gained a second sentence.**
At round 7 a clean result was reported as 698px against an 802px viewport and therefore
fitting comfortably. 698px is the converter's HEIGHT. Its bottom edge is 868px, because the
shared masthead and the page padding put 180px above it, so a clean result overflows a
1440 x 900 laptop by 71px and the conclusion inverts. The same error class as the
viewport-versus-window one: the right property of the wrong thing, measured carefully by
someone looking directly at it. `check-network.mjs` now prints both numbers and names which
one answers the requirement, because a measurement taken by hand twice will be taken by hand
a third time.

**Transferable:** when a requirement names a physical thing, a display, a bench, a plate
reader: and the check names a number, ask what the number is a measurement OF. If the answer
is "the check", the constant belongs to the register and to its owner, not to the test. And
when the number is a distance on a screen, say from where: a height and a bottom edge differ
by everything above them.

**A note on provenance for 5, 6 and 7.** Instances 1 to 4 were found by accident, which the
preamble records as the point. These three were found by **looking**, a clause-by-clause
audit of the built tool against the URS. That is a weaker kind of discovery and it should be
labelled as such: an audit finds what its author thinks to check, and instance 5 is a guard
that an audit had already passed. It is also the only kind that can be scheduled.

---

## II. A comparison tightened past what correct code satisfies

The mirror of the first family. Here the check is stricter than the property, so it fails on
code that is right. Each instance costs the same thing: a true test discarded, or a real
defect admitted while someone loosens the wrong knob.

### 1. Bit-exactness on the round trip

Rejected before v0.3. Recorded in URS §6 as the failure that made the tolerance necessary.

### 2. A strict `<` on the 1 ULP tolerance

The bound is saturated: **9.87%** of correct conversions land at exactly 1.0 ULP, measured
over 500,008 cases. `< 1 ULP` fails on correct code roughly one time in ten. The URS writes
`≤`, and `invariance.test.ts` asserts the saturation directly so the operator cannot quietly
stop being load-bearing.

### 3. Bit-identical agreement between two implementations

**This build.** Acceptance test 3's correctness gate was initially set at bit-identical,
because that is what was observed: 40,058 of 40,058 values. Making the observation the
requirement would generalise one measured pair into a claim about every future
reimplementation: and a language with wider intermediates, or one that contracts a
multiply-add, can differ in the last bit on the same two operations.

Requirement: **≤ 1 ULP**. Observed: **0 ULP**, recorded in §11 beside it so drift from exact
agreement stays visible rather than being absorbed by the tolerance.

**The honest consequence, stated rather than left implicit:** a defect uniformly smaller than
1 ULP is invisible to acceptance test 3 *and* to acceptance test 5, because the round trip
cancels a uniform scaling and this comparison admits it. The observed 0 ULP makes that a weak
concern here. It is not nothing, and it should not have to be rediscovered.

---

## III. An automated edit to a controlled artefact

Neither of the families above. Those are checks that were not about the property, and
comparisons stricter than correct code can satisfy. This is a change nobody asked for
reaching a document whose entire value is that changes to it are reviewed.

### 1. A punctuation sweep rewrote an approved specification

**Tool: C1, this build.** A house rule was set that the project should contain no em dashes,
the audience being a scientific one. There were 624 of them, so the change was made by a
script over every source file, script and document in the tree.

`docs/molarity-converter-urs-v0.5.md` was in the tree. It is the URS **approved at
specification level by NADIRA on 3 September 2026** and is the authority this build is held
to. The sweep rewrote **42 lines of it**, changing the punctuation of requirement text,
option labels and the change log, with no review and no record that anything had happened.
It was caught by reading `git diff --stat` before committing. Nothing in the process would
have caught it otherwise, and the next step was a commit.

**Why this is its own category.** The failure in §I is a check that establishes something
other than what it was written for. The failure in §II is a check stricter than the truth.
Here there was no check involved. A tool did what it was told, to everything it was pointed
at, and the thing it was pointed at included an artefact whose whole function is that its
contents are agreed rather than current. **An approved specification is not edited to match
the project; the project is edited to match it**, and a silently reworded requirement is a
requirement that now means something slightly different with nobody having decided that.

The rule itself was not wrong and is still in force. What was missing was any notion that
some files in the tree are not the project's to change.

**What was done.** v0.5 was reverted whole and is excluded from the rule, which applies from
v0.6 onward. Two strings the sweep had changed are specified verbatim in v0.5 and now differ
from it, C1-MW-07's conjugate option label and the retention badge; both are flagged for
agreement rather than quietly kept.

**The exclusion is asserted, not remembered.** `typography.test.ts` fails if v0.5 ever stops
containing an em dash, so a future sweep that catches it is reported as a failure rather than
passing because the file now complies. A guard that only checked compliance would have gone
green on exactly the outcome being guarded against.

**Transferable.** Before pointing an automated edit at a tree, ask which files in it are
agreed rather than current: approved specifications, signed records, incident evidence,
anything a third party relies on being unchanged. That set is not defined by file type or by
directory, so it has to be named, and the naming has to be enforced somewhere a person will
trip over it. A blast radius is a property of the tool, not of the change.

---

## IV. A verification that reimplemented the defect under test

The independence of a check is normally what makes it worth trusting. This is the case where
it is what makes the check wrong, and it is not any of the three above: no check was written
badly, nothing was compared too strictly, and nothing was edited without review. A
measurement was taken of the wrong system, by someone deliberately not looking at the right
one.

### 1. The unit probe took the stepwise path

**Tool: C1, this build.** Round 3 asked whether an underflowed result could suggest a smaller
output unit, and stated as a finding that it could not: all five molar units were reported to
underflow for 1e-320 mg/mL at 1000 kDa, so a suggestion would name a unit that fails too. A
requirement was written on that basis, that a suggested unit must be one the tool has checked
rather than assumed, with the case given as the worked example of a check finding nothing.

Measured against the shipped conversion, four of the five hold the value. Only M underflows,
and pM round-trips it exactly.

**The mechanism is the entry.** The probe computed the molarity in mol/L and then scaled to
each unit. That is the STEPWISE path: it forms the intermediate that underflows, and avoiding
that intermediate is the second of the two reasons §11 requires the divisor to be folded.

So the probe reproduced the exact defect the requirement exists to prevent, while checking a
finding about that requirement, and reported the result as a property of the tool. Run both
ways on the same input, the disagreement is total:

| Unit | Folded, as shipped | Stepwise, as probed |
|---|---|---|
| M | 0.00000 | 0.00000 |
| mM | 9.88131e-324 | 0.00000 |
| µM | 9.99989e-321 | 0.00000 |
| nM | 9.99989e-318 | 0.00000 |
| pM | 9.99989e-315 | 0.00000 |

**Why it is a family and not an instance of §I.** In §I a check correlates with the property
and the gap is invisible until something falls into it. Here the check was of a different
system entirely, and the reason it was a different system is the reason it was trusted: it
did not consult the implementation. Independence is the defence against a check that merely
agrees with the code, and it is not free. **An independent measurement must still be
independent about the right thing.** This one varied the implementation, which was the one
variable that had to be held fixed, because the implementation was the subject.

**The requirement survives; the example inverts.** A suggested unit must still be one the
tool has checked. What changed is that the check finds four units here rather than none, so
the caveat the example was written to support does not apply to it.

**A consequence nobody had noticed, found while writing this up.** The subnormal fixtures
added in round 3 make folding load-bearing for acceptance test 3. Before them, a stepwise
reimplementation would have agreed with the shipped tool everywhere that mattered, since the
two differ by at most 1 ULP in the normal range and the comparison tolerance is 1 ULP. On
C1-FX-14 they disagree totally, so acceptance test 3 now fails against a reimplementation
that does not fold. That is not contamination of the independence the test depends on:
folding is in the specification as a requirement on how the conversion is structured, so both
implementations folding is two authors reading the same URS. It is recorded because it looks
like contamination and is not, and because the Python reference folds today as an
implementation choice rather than as a stated obligation.

**Transferable.** When a verification and its subject are two implementations of the same
thing, write down which properties the verification is allowed to differ on. For C1 that list
is short and it is now explicit: derivation from the URS, language, and arithmetic ordering
within a bound. Structure is not on it.

---

## V. A correct instruction, placed where it would not be read as one

Nothing above covers this. The document was right, the reader was attentive, and the
instruction still did not take effect for two rounds, because of where in the document it
sat.

### 1. A ruling inside a status table

**Tool: C1, this build.** NADIRA ruled that the upper molecular-weight bound should be
conditioned on the mass-basis declaration rather than raised. The ruling reached the
developer's round-3 instruction in two places:

- §0, a table headed *verified complete*: the register row is "ratified as written, keep
  exactly as-is **until the conditional bound lands**". That presumes the form was chosen.
- §7, *still held, unchanged*: "the 1000 kDa bound | NADIRA, **ruling pending**. Constant
  stays untouched, row stays as written."

**Both statements were individually accurate.** The row was ratified; the bound's
implementation had not been scheduled. Compressed into one document they read as a
contradiction, and the reader resolved it toward the row that named an owner and an
instruction, which is the conservative reading and was the wrong one. Two rounds passed on a
blocker that was described at the time as a live defect misfiring on an ordinary reagent.

**Why it is not a communication failure in the ordinary sense.** No sentence was unclear. The
defect is positional: a ruling placed in a table whose heading says *already done* is not read
as an instruction, because the reader's model of that table is "nothing here requires action".
A status table is a summary, and a summary is the one place a new decision cannot live.

**The generalisation, which is the fix.** A ruling lives in ONE place, in its own section, and
status tables point at it rather than restating it. Restatement is what allows the two copies
to disagree, and the copy in the summary is the one that will be read as needing nothing.

**On authorship, because it is part of the finding.** The reviewer initially took the blame
for the contradiction, and the author of the compressed document corrected her. A structural
failure that gets attributed to the person downstream of it is a structural failure that will
recur, because the fix then gets aimed at the wrong place. Noted because the correction had to
be made explicitly rather than being obvious.

---

## VI. Two observations that are not defects but were mistaken for them

### Ties are unit-dependent

1 g/L at 51.2 kDa is exactly **19.53125 µM**: a tie, decided by the rounding mode. The same
result expressed in **M** is `1.9531250000000000406e-5`: not a tie, and it rounds up under
either rule.

Same reagent, same concentration, same conversion. Only the output unit differs. This is why
the rounding mode had to be *named* rather than avoided, and it is what exposed the proxy in
§I.3.

### A flagged and an unflagged result can display identically

A molar concentration one ULP below 1 pM raises C1-FL-03 and displays as `1.00000 pM`. One
exactly at 1 pM raises nothing and displays as `1.00000 pM`.

Neither is wrong: §8 evaluates on the computed system, C1-UN-06 governs the rendering. But a
user who cannot reconcile the flag with the number in front of them loses confidence in
both: and in a tool whose claim is that it records what a spreadsheet hides, that is
expensive.

The output now says so wherever a threshold flag appears, and `C1-FX-04m`/`C1-FX-04n` assert
**both** the flag state and the rendering, so the pair is recorded as correct rather than
looking like a defect to whoever reads the suite next.

### Agreement at displayed precision does not imply round-trip correctness

An independent author who read §5 but not §11 writes the stepwise unit normalisation. That
implementation computes the right answer to six significant figures every time, agrees with
the shipped tool on every case in acceptance test 3, and **fails C1-IV-01 in 0.55% of cases**.

Acceptance tests 3 and 5 are not redundant, and neither subsumes the other.

---

## VII. Transferable to C3 and after

**Make the fixture-distribution rule executable, not an audit.**

§10 tells the author to audit the fixture set for shared properties. An audit is performed
once, by whoever is looking, and passes silently thereafter. Two of the instances above,
C1-FX-09's absence, and the tie exclusion in §I.4: are failures an audit would have to
*notice*.

Written as tests, they cannot be passed by omission:

| Property the set must have | How it is asserted |
|---|---|
| Contains a case that must raise **no** flags | `C1-FX-09`, asserted in both conversion directions |
| Contains an exact rounding **tie** | `fixtures.test.ts` requires one; `compare.py` **fails** when the reference set has none |
| Weights and concentrations are not round | asserted over the non-boundary fixtures |
| Boundary cases sit **exactly** on the threshold | constructed from exactly-representable values, or derived (`x/x` is 1), never from a hand-chosen decimal |

The second row is the pattern worth carrying: **the comparison fails when the input class is
absent**, so the set cannot be made to pass by narrowing it. That converts "we audited the
distribution" into a claim a machine re-establishes on every run.

The general form: for each property the fixture set is supposed to have, ask what a set that
*lacked* it would look like, and write the test that fails on that set.

**The fixture-distribution rule applies to ASSERTIONS as much as to fixtures.**

An assertion can share a property that real cases do not, exactly as a fixture set can.
`a value exactly on a threshold never flags` asserted an EMPTY FLAG SET, and held for a year
of review passes because every boundary fixture happened to be declared assembled. The moment
the molecular-weight ceiling was conditioned on the mass basis, a conjugate sitting exactly on
its ceiling raised C1-FL-08: the declaration that lifts the ceiling is the declaration that
raises the flag. The property was never "no flags at all"; it was "this threshold's own flag
does not fire", and the two agreed only on the cases that existed.

Ask of an assertion what §10 asks of a fixture set: what does every case I am asserting over
have in common that real cases do not? Here it was a single declaration value, held fixed
across every case while the values varied, in a suite whose whole discipline is varying the
thing that matters.

**Assert the property per instance, not per set.**

§I.5 is the same failure one level up: the guard on the fixtures was itself a set-level count.
`covered.length >= 12` and "at least one fixture of each direction" are both true of a set that
covers one threshold twelve times and another not at all.

The rewrite carries the coverage claim in the data, each boundary fixture declares which
threshold it is about and which side it sits on, so the guard can enumerate
threshold × side × direction and name the combinations that are missing. It found two gaps on
the first run. **A guard that reports a count can only ever say "fewer than expected"; a guard
that enumerates says which one.**

Transferable test: if a guard's failure message could not tell you *which* case to go and write,
it is measuring the wrong thing.

**A requirement that lives only in the interface needs a check that drives the interface.**

C1-ST-03 shipped defective through a conformance audit with 96 passing tests, because not one of
them rendered the component and the only browser check never changed conversion direction. The
requirement had no execution behind it at all, not a weak check, no check.

This is worth separating from the rest of the file. Instances 1 to 7 are checks that were not
about the thing. This is a requirement with nothing pointed at it, which is harder to see
precisely because there is no bad check to inspect: coverage tools report on lines executed, not
on requirements established. C1's answer is C1-VE-01 in URS v0.6, and a second browser check
whose only job is the form's own requirements.

The pair matters more than either half. `retention.test.ts` tests the rules with no DOM, that
is where the defect actually was, and it would have caught the original. `check-ui.mjs` tests
that the component asks those rules the right question and renders the answer, which a pure test
cannot. Both were confirmed capable of failing by reinstating the defect and watching each go
red.
