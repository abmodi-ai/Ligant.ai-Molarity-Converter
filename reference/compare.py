"""
Acceptance test 3 — the comparison.

Reads reference/reference-set.json, which carries the inputs and what the
shipped TypeScript returns for them, recomputes every case with molarity.py,
and reports disagreement. Nothing here imports from src/.

TWO CHECKS, DELIBERATELY SEPARATE.

  1. THE CORRECTNESS GATE compares the UNROUNDED values, to within 1 ULP.
     C1-UN-07 makes the
     unrounded value "the value against which an independent reimplementation is
     compared", and correctness must not depend on a formatting choice. As URS
     v0.5 was written this was ambiguous: C1-UN-07 says unrounded, acceptance
     test 3 says "to displayed precision", and those are different tests. With
     the second reading, a display convention does load-bearing work inside a
     correctness gate - two implementations that agreed on every digit of the
     arithmetic could fail for rounding a tie differently, and two that disagreed
     in the seventh significant figure could pass. Resolved in C1's favour by
     A. Modi; the URS edit is v0.6 and is his.

  2. THE DISPLAY CHECK compares the rendered strings, under C1-UN-06. It still
     has to pass - it is how the half-to-even rounding mode is verified across
     two implementations - but it is reported as a formatting check and not as
     the correctness result.

Run: python3 reference/compare.py
"""

import json
import math
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from molarity import compute, DISPLAY_SIG_FIGS  # noqa: E402

# The REQUIREMENT, not the observation.
#
# Bit-identical is what this pair measures, and making that the requirement
# would generalise one measured instance into a claim about every future
# reimplementation. A language with wider intermediates, or one that contracts a
# multiply-add, can differ in the last bit on the same two operations, and a
# bit-exact gate would then fail on correct code - the same shape as the
# bit-exact round trip (URS section 6) and the strict '<' on the ULP tolerance.
# Third instance of that pattern in this project.
#
# The observed figure is reported beside it, so drift from exact agreement is
# visible rather than absorbed by the tolerance.
#
# One consequence, stated rather than left implicit: a defect uniformly smaller
# than 1 ULP is invisible to this test AND to the round-trip test, because the
# round trip cancels a uniform scaling and this comparison admits it. The
# observed 0 ULP makes that weak here; it is not nothing.
TOLERANCE_ULP = 1

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "reference-set.json")) as fh:
    data = json.load(fh)

cases = data["cases"]

value_failures = []      # the correctness gate
display_failures = []    # C1-UN-06
flag_failures = []
reject_failures = []
worst_ulps = 0.0
worst_case = None
identical = 0
compared_values = 0
ties = []


def ulps_between(a, b):
    if a == b:
        return 0.0
    if not (math.isfinite(a) and math.isfinite(b)):
        return math.inf
    return abs(a - b) / math.ulp(max(abs(a), abs(b)))


def is_exact_tie(v):
    """
    Whether v sits exactly halfway at six significant figures.

    Decided on the EXACT decimal expansion of the double, which Decimal(v) gives
    and a round-trip test does not. The double nearest 1.953125e-5 round-trips
    through seven significant digits, so a round-trip test calls it a tie; its
    exact expansion continues ...0004065... and it is not one, and rounds up
    under either rule. An earlier version of this function made that mistake and
    reported four ordinary values as ties.
    """
    if v == 0 or not math.isfinite(v):
        return False
    digits = Decimal(v).as_tuple().digits
    trimmed = list(digits)
    while trimmed and trimmed[-1] == 0:
        trimmed.pop()
    return len(trimmed) == DISPLAY_SIG_FIGS + 1 and trimmed[-1] == 5


for case in cases:
    got = compute(case["request"])
    want = case["expected"]
    src = case["source"]

    if want["ok"] != got["ok"]:
        reject_failures.append((src, want.get("rejections"), got.get("rejections")))
        continue

    if not want["ok"]:
        if sorted(want["rejections"]) != sorted(got["rejections"]):
            reject_failures.append((src, want["rejections"], got["rejections"]))
        continue

    # --- 1. the correctness gate: unrounded values, to within 1 ULP ---
    for key in ("massValue", "molarValue"):
        compared_values += 1
        a, b = want[key], got[key]
        u = ulps_between(a, b)
        if a == b:
            identical += 1
        if u > TOLERANCE_ULP:
            value_failures.append((src, key, a, b, u))
        if u > worst_ulps:
            worst_ulps, worst_case = u, (src, key, a, b)
        if is_exact_tie(a):
            ties.append((src, key, a))

    # --- 2. the display check: C1-UN-06 ---
    for quantity in ("mass", "molar"):
        if want["displayed"][quantity] != got["displayed"][quantity]:
            display_failures.append((src, quantity, want["displayed"][quantity], got["displayed"][quantity]))

    if want["flags"] != got["flags"]:
        flag_failures.append((src, want["flags"], got["flags"]))

print("Acceptance test 3 — independent reimplementation (Python) vs shipped (TypeScript)")
print(f"  engine under test : {data['engineVersion']}")
print(f"  cases compared    : {len(cases)}  ({compared_values} unrounded values)")
print()
print(f"  CORRECTNESS GATE — unrounded values, <= {TOLERANCE_ULP} ULP (C1-UN-07)")
print(f"    exceeding {TOLERANCE_ULP} ULP                        : {len(value_failures)}")
print(f"    worst ULP distance observed          : {worst_ulps:g}")
print(f"    bit-identical (recorded, not required): {identical}/{compared_values}")
if worst_case:
    src, key, a, b = worst_case
    print(f"        at {src} {key}: {a!r} vs {b!r}")
print()
print(f"  DISPLAY CHECK — {DISPLAY_SIG_FIGS} significant figures, half-to-even (C1-UN-06)")
print(f"    disagreeing renderings             : {len(display_failures)}")
print(f"    exact ties in the reference set    : {len(ties)}")
if ties:
    for src, key, v in ties[:5]:
        print(f"        {src} {key} = {v!r}  (rounding mode decides this value)")
else:
    print("        NONE — the rounding mode is untested by this comparison")
print()
print(f"  flag-set disagreements               : {len(flag_failures)}")
print(f"  rejection disagreements              : {len(reject_failures)}")

for src, key, a, b, u in value_failures[:20]:
    print(f"  VALUE   {src} {key}: shipped {a!r}, reimplementation {b!r} ({u:g} ULP, over {TOLERANCE_ULP})")
for src, quantity, want_s, got_s in display_failures[:20]:
    print(f"  DISPLAY {src} {quantity}: shipped {want_s!r}, reimplementation {got_s!r}")
for src, want_f, got_f in flag_failures[:20]:
    print(f"  FLAGS   {src}: shipped {want_f}, reimplementation {got_f}")
for src, want_r, got_r in reject_failures[:20]:
    print(f"  REJECT  {src}: shipped {want_r}, reimplementation {got_r}")

# The gate is set at bit-identical because that is what two implementations of
# the same two IEEE-754 operations produce, and it is what is observed here. If
# a future reimplementation in a language with wider intermediates disagrees by
# a ULP, that is a tolerance the URS has to state rather than something this
# script should decide quietly.
if not ties:
    print("\n  WARNING: no exact tie in the reference set — C1-UN-06's rounding mode")
    print("  is not exercised by this comparison. See docs/rounding-ties.md.")

failed = value_failures or display_failures or flag_failures or reject_failures or not ties
print()
print("FAILED" if failed else "PASSED — the two implementations agree on every unrounded value, and render every value identically.")
sys.exit(1 if failed else 0)
