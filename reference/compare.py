"""
Acceptance test 3 — the comparison.

Reads reference/reference-set.json, which carries the inputs and what the
shipped TypeScript returns for them, recomputes every case with molarity.py,
and reports disagreement. Nothing here imports from src/.

Two standards are reported:

  * DISPLAYED PRECISION, which is the standard acceptance test 3 sets and the
    one that decides pass or fail.
  * ULP distance on the unrounded values, which C1-UN-07 makes the value an
    independent reimplementation is compared against. It cannot be a pass/fail
    criterion for two implementations in different languages - nothing requires
    them to be bit-identical - but it is the number that says whether agreement
    at six figures is comfortable or lucky.

Run: python3 reference/compare.py
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from molarity import compute, DISPLAY_SIG_FIGS  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "reference-set.json")) as fh:
    data = json.load(fh)

cases = data["cases"]
display_failures = []
flag_failures = []
reject_failures = []
worst_ulps = 0.0
worst_case = None
ties = []


def ulps_between(a, b):
    if a == b:
        return 0.0
    if not (math.isfinite(a) and math.isfinite(b)):
        return math.inf
    return abs(a - b) / math.ulp(max(abs(a), abs(b)))


def is_tie(v):
    """
    A value that sits exactly halfway at six significant figures.

    That means its exact decimal expansion terminates at the SEVENTH significant
    digit and that digit is a 5 - so 19.53125 is a tie and 1.25 is not. An
    earlier version tested only "ends in 5 after stripping zeros", which called
    125, 250 and 1.25 ties: they end in 5 but have three significant digits, not
    seven, and round to themselves under either rule.
    """
    if v == 0 or not math.isfinite(v):
        return False
    seven = f"%.{DISPLAY_SIG_FIGS}e" % v          # 7 significant digits
    if float(seven) != v:
        return False                              # not exact at 7 figures
    digits = seven.split("e")[0].replace(".", "").replace("-", "").rstrip("0")
    return len(digits) == DISPLAY_SIG_FIGS + 1 and digits.endswith("5")


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

    for quantity in ("mass", "molar"):
        if want["displayed"][quantity] != got["displayed"][quantity]:
            display_failures.append((src, quantity, want["displayed"][quantity], got["displayed"][quantity]))

    if want["flags"] != got["flags"]:
        flag_failures.append((src, want["flags"], got["flags"]))

    for key in ("massValue", "molarValue"):
        u = ulps_between(want[key], got[key])
        if u > worst_ulps:
            worst_ulps, worst_case = u, (src, key, want[key], got[key])
        if is_tie(want[key]):
            ties.append((src, key, want[key]))

print(f"Acceptance test 3 — independent reimplementation (Python) vs shipped (TypeScript)")
print(f"  engine under test : {data['engineVersion']}")
print(f"  cases compared    : {len(cases)}")
print(f"  standard          : displayed precision, {DISPLAY_SIG_FIGS} significant figures")
print()
print(f"  disagreements at displayed precision : {len(display_failures)}")
print(f"  flag-set disagreements               : {len(flag_failures)}")
print(f"  rejection disagreements              : {len(reject_failures)}")
print(f"  worst ULP distance (unrounded)       : {worst_ulps:g}")
if worst_case:
    src, key, a, b = worst_case
    print(f"      at {src} {key}: {a!r} vs {b!r}")
print(f"  values landing on a rounding tie     : {len(ties)}")
if ties:
    print("      (these are the cases where a half-even formatter would disagree;")
    print("       see docs/rounding-ties.md)")
    for t in ties[:5]:
        print(f"      {t[0]} {t[1]} = {t[2]!r}")

for src, quantity, want, got in display_failures[:20]:
    print(f"  DISPLAY {src} {quantity}: shipped {want!r}, reimplementation {got!r}")
for src, want, got in flag_failures[:20]:
    print(f"  FLAGS   {src}: shipped {want}, reimplementation {got}")
for src, want, got in reject_failures[:20]:
    print(f"  REJECT  {src}: shipped {want}, reimplementation {got}")

failed = display_failures or flag_failures or reject_failures
print()
print("FAILED" if failed else "PASSED — the two implementations agree on every case, to displayed precision.")
sys.exit(1 if failed else 0)
