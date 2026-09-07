# Correspondence file — instances of the thesis, from the C1 build

Cases where a check stood in for the property it was supposed to establish, or where a
comparison was tightened past what correct code can satisfy. Kept because the manuscript's
argument is about exactly this, and because instances 1 to 4 were found by accident rather
than by looking — which is itself the point.

Instances 5 to 7 are the exception and are marked as such: they were found by a clause-by-clause
audit against the URS, which is a schedulable method and a weaker kind of evidence. Both
provenances belong in the file. If every instance had to be stumbled over, the argument would
be that nothing can be done.

Two families. The first is the manuscript's thesis directly. The second is its mirror.

---

## I. A proxy accepted for the property

The check is not the thing. It correlates with the thing, usually strongly, and the gap is
invisible until something falls into it.

### 1. The beacon — the build as a proxy for what is served

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

### 2. The span guard — absolute magnitude as a proxy for implausibility

**Tool: Antigen Density Calculator.** A floor on intensity stood in for "this reading is
wrong". But a log-log fit makes the intensity unit arbitrary: the same 0.0001 is a typo on a
channel scale and a legitimate reading on a normalised one. An absolute floor refuses a
legitimate rescaling and admits a genuine defect.

The property is the **span** — what cannot be legitimate is one standard covering nine
decades — and the span is scale-invariant, so it survives a change of unit that defeats any
absolute threshold.

### 3. The tie detector — round-tripping as a proxy for a terminating expansion

**Tool: C1, this build.** To decide whether a value sits exactly halfway at six significant
figures, both the TypeScript and the Python asked whether it *round-trips* through seven
significant digits. That is not the same question.

The double nearest `1.953125e-5` round-trips through seven digits, so both detectors called
it a tie. Its exact decimal expansion continues `…00040657581468…`, it is not halfway, and it
rounds up under either rule. The detector reported four ordinary values — 125, 250, 1.25,
0.00390625 — as ties on the same reasoning.

The property is that the **exact decimal expansion terminates** at the seventh significant
digit with a 5. Both implementations now decide on the exact expansion: `BigInt` arithmetic
on the IEEE 754 fields in TypeScript, `Decimal(v)` in Python. `Decimal(str(v))` would have
reintroduced the same defect one layer down.

Found only because the same value was examined in two output units and behaved differently —
which is the observation in §III below, not a method.

### 4. Excluding the input class as a proxy for handling it

**Tool: C1, this build.** On discovering that displayed precision has a tie-breaking rule the
URS did not name, the first response was a guard asserting that **no fixture may land on a
tie**. The suite then passed — by excluding the input class that exposes the ambiguity.

This is the fixture-distribution failure §10 and C1-FX-09 were written against, in the form
that is hardest to see: it looks like hygiene. Two implementations could disagree on real
user data with the suite green.

Ties are unit-dependent (§III), so they cannot be excluded from the input space at all — only
from the fixtures, which is strictly worse than not checking.

**The guard is now inverted**, and that inversion is the transferable part: see §IV.

### 5. A count over the set as a proxy for coverage of each threshold

**Tool: C1, this build.** §10's C1-FX-04 requires cases either side of, and exactly on, **every**
§8 threshold, **in both conversion directions**. The guard written to enforce it asserted that
the boundary set had at least twelve fixtures, and that at least one fixture ran in each
direction — **across the whole set**.

Both are properties of the set. Neither is the property required, which is per threshold. The
guard passed while both molecular-weight bounds ran in `mass-to-molar` only, and the helper
that built them claimed both directions in its own docstring.

Rewritten to assert every threshold × side × direction by name, the guard immediately found two
more gaps it had been hiding: no below-the-bound case for the mass threshold and no
above-the-bound case for the molar one, in either direction. Twelve boundary fixtures became
twenty-four.

**No wrong answer was ever possible** — C1-FL-01 reads the declared weight and no direction
enters the comparison — which is what makes this the cleanest instance in the file. Nothing was
broken. The check was simply not about the thing, and a count is the easiest proxy in the world
to write, because it is true.

### 6. A control that exists as a proxy for a choice that was made

**Tool: C1, this build.** C1-MW-03 and C1-UN-01 require every unit to be "explicitly selected".
The build put a `<select>` beside each numeric field, pre-filled with the common answer. The
requirement's text was met by the control being present; what it was written to compel — the
user having *decided* — was not.

The provenance and mass-basis fields in the same form were compelled properly, with a disabled
`— select —` and no computation until answered. So the build knew how to compel a choice and
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
evaluate it — so the requirement was satisfied in form and defeated in exactly the respect it
was written for. The relation is now named quantities only, with the unit handling as its own
statement and the divisor given in `mg/mL per µM`, which is a ratio of two standard units and
can be checked against.

**A note on provenance for 5, 6 and 7.** Instances 1 to 4 were found by accident, which the
preamble records as the point. These three were found by **looking** — a clause-by-clause
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
reimplementation — and a language with wider intermediates, or one that contracts a
multiply-add, can differ in the last bit on the same two operations.

Requirement: **≤ 1 ULP**. Observed: **0 ULP**, recorded in §11 beside it so drift from exact
agreement stays visible rather than being absorbed by the tolerance.

**The honest consequence, stated rather than left implicit:** a defect uniformly smaller than
1 ULP is invisible to acceptance test 3 *and* to acceptance test 5, because the round trip
cancels a uniform scaling and this comparison admits it. The observed 0 ULP makes that a weak
concern here. It is not nothing, and it should not have to be rediscovered.

---

## III. Two observations that are not defects but were mistaken for them

### Ties are unit-dependent

1 g/L at 51.2 kDa is exactly **19.53125 µM** — a tie, decided by the rounding mode. The same
result expressed in **M** is `1.9531250000000000406e-5` — not a tie, and it rounds up under
either rule.

Same reagent, same concentration, same conversion. Only the output unit differs. This is why
the rounding mode had to be *named* rather than avoided, and it is what exposed the proxy in
§I.3.

### A flagged and an unflagged result can display identically

A molar concentration one ULP below 1 pM raises C1-FL-03 and displays as `1.00000 pM`. One
exactly at 1 pM raises nothing and displays as `1.00000 pM`.

Neither is wrong: §8 evaluates on the computed system, C1-UN-06 governs the rendering. But a
user who cannot reconcile the flag with the number in front of them loses confidence in
both — and in a tool whose claim is that it records what a spreadsheet hides, that is
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

## IV. Transferable to C3 and after

**Make the fixture-distribution rule executable, not an audit.**

§10 tells the author to audit the fixture set for shared properties. An audit is performed
once, by whoever is looking, and passes silently thereafter. Two of the instances above —
C1-FX-09's absence, and the tie exclusion in §I.4 — are failures an audit would have to
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

**Assert the property per instance, not per set.**

§I.5 is the same failure one level up: the guard on the fixtures was itself a set-level count.
`covered.length >= 12` and "at least one fixture of each direction" are both true of a set that
covers one threshold twelve times and another not at all.

The rewrite carries the coverage claim in the data — each boundary fixture declares which
threshold it is about and which side it sits on — so the guard can enumerate
threshold × side × direction and name the combinations that are missing. It found two gaps on
the first run. **A guard that reports a count can only ever say "fewer than expected"; a guard
that enumerates says which one.**

Transferable test: if a guard's failure message could not tell you *which* case to go and write,
it is measuring the wrong thing.

**A requirement that lives only in the interface needs a check that drives the interface.**

C1-ST-03 shipped defective through a conformance audit with 96 passing tests, because not one of
them rendered the component and the only browser check never changed conversion direction. The
requirement had no execution behind it at all — not a weak check, no check.

This is worth separating from the rest of the file. Instances 1 to 7 are checks that were not
about the thing. This is a requirement with nothing pointed at it, which is harder to see
precisely because there is no bad check to inspect: coverage tools report on lines executed, not
on requirements established. C1's answer is C1-VE-01 in URS v0.6, and a second browser check
whose only job is the form's own requirements.

The pair matters more than either half. `retention.test.ts` tests the rules with no DOM — that
is where the defect actually was, and it would have caught the original. `check-ui.mjs` tests
that the component asks those rules the right question and renders the answer, which a pure test
cannot. Both were confirmed capable of failing by reinstating the defect and watching each go
red.
