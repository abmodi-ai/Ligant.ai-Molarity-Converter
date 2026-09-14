"""
A third check, and the only one that is not an implementation.

WHAT THIS IS FOR. `compare.py` sets the shipped TypeScript against an
independent Python reimplementation. Both are implementations: both hold
doubles, both make the same structural choice, and both can therefore be wrong
in the same way. Acceptance test 3 establishes that they agree, not that they
are right.

This computes the answer in EXACT RATIONAL ARITHMETIC, where there is no
rounding and no underflow, then rounds the exact result to the nearest double
once. That is what a correct implementation would hold. It shares no arithmetic
with either implementation and makes no structural choice, because exact
arithmetic has no intermediate to lose.

WHY IT WAS ADDED. C1-FX-14's expected value, 9.99989e-315 for a subnormal
result, was obtained by running the folded implementation. The fixture was
therefore recording what the tool does rather than what is correct, and its
authority for the value traced back to the thing it was checking. The value
turned out to be right. It was not established to be right, and the difference
matters most exactly where this fixture operates: the folded and stepwise paths
disagree TOTALLY in the subnormal regime, so a fixture generated from either one
cannot arbitrate between them.

WHAT IT DOES NOT DO. It does not check the tool to the last bit. The conversion
performs two roundings, so its result sits within a small number of ULP of the
exact value by construction; §11's invariance note records both strategies as
within 2.9 ULP of exact. The bound here is a measurement, printed on every run,
not a target.
"""

import json
import struct
from decimal import Decimal, getcontext, ROUND_HALF_EVEN
from fractions import Fraction
from pathlib import Path

getcontext().prec = 80

MASS_TO_G_PER_L = {
    "mg/mL": Fraction(1),
    "ug/mL": Fraction(1, 1000),
    "ng/mL": Fraction(1, 10**6),
    "g/L": Fraction(1),
    "mg/L": Fraction(1, 1000),
}
MOLAR_TO_MOL_PER_L = {
    "M": Fraction(1),
    "mM": Fraction(1, 1000),
    "uM": Fraction(1, 10**6),
    "nM": Fraction(1, 10**9),
    "pM": Fraction(1, 10**12),
}
MW_TO_G_PER_MOL = {"g/mol": Fraction(1), "kDa": Fraction(1000)}

DISPLAY_SIG_FIGS = 6


def exact_convert(direction, entered_value, mw_value, units):
    """The determination in exact rationals. No rounding, no underflow, no intermediate."""
    entered = Fraction(entered_value)          # the double the user's value became
    mw_g_per_mol = Fraction(mw_value) * MW_TO_G_PER_MOL[units["mw"]]
    if mw_g_per_mol == 0:
        return None, None
    if direction == "mass-to-molar":
        mol_per_l = (entered * MASS_TO_G_PER_L[units["mass"]]) / mw_g_per_mol
        return entered, mol_per_l / MOLAR_TO_MOL_PER_L[units["molar"]]
    g_per_l = (entered * MOLAR_TO_MOL_PER_L[units["molar"]]) * mw_g_per_mol
    return g_per_l / MASS_TO_G_PER_L[units["mass"]], entered


def nearest_double(x: Fraction) -> float:
    """Correctly rounded, subnormals included. Python's int division rounds correctly."""
    return x.numerator / x.denominator


def format_sig_figs(v: float, figs: int = DISPLAY_SIG_FIGS) -> str:
    """C1-UN-06, applied to a double. Half-to-even, trailing zeros kept."""
    if v == 0:
        return "0." + "0" * (figs - 1)
    d = Decimal(v)                              # exact value of the double
    q = d.quantize(Decimal(1).scaleb(d.adjusted() - figs + 1), rounding=ROUND_HALF_EVEN)
    sign = "-" if q < 0 else ""
    digits = "".join(ch for ch in str(abs(q)) if ch.isdigit()).lstrip("0") or "0"
    digits = (digits + "0" * figs)[:figs]
    exponent = abs(q).adjusted()
    if exponent < -6 or exponent >= figs:
        head = digits[0] + ("." + digits[1:] if figs > 1 else "")
        return f"{sign}{head}e{'+' if exponent >= 0 else '-'}{abs(exponent)}"
    if exponent >= 0:
        return f"{sign}{digits[: exponent + 1]}" + (f".{digits[exponent + 1 :]}" if digits[exponent + 1 :] else "")
    return f"{sign}0." + "0" * (-exponent - 1) + digits


def ulps_between(a: float, b: float) -> float:
    if a == b:
        return 0.0
    m = max(abs(a), abs(b))
    if m == 0:
        return 0.0
    nxt = struct.unpack("<d", struct.pack("<Q", struct.unpack("<Q", struct.pack("<d", m))[0] + 1))[0]
    ulp = nxt - m
    return abs(a - b) / ulp if ulp else float("inf")


data = json.loads((Path(__file__).parent / "reference-set.json").read_text())
cases = data["cases"]

print("Exact-arithmetic check: the shipped values against rationals, not against another implementation")
print(f"  engine under test : {data['engineVersion']}")
print(f"  cases             : {len(cases)}")

worst_ulps = 0.0
worst_case = None
display_mismatches = []
skipped = 0

for case in cases:
    exp = case["expected"]
    if not exp.get("ok"):
        skipped += 1
        continue
    req = case["request"]
    mass_exact, molar_exact = exact_convert(req["direction"], req["enteredValue"], req["mwValue"], req["units"])
    if mass_exact is None:
        skipped += 1
        continue

    for name, exact_value, got in (
        ("mass", mass_exact, exp["massValue"]),
        ("molar", molar_exact, exp["molarValue"]),
    ):
        correct = nearest_double(exact_value)
        d = ulps_between(correct, got)
        if d > worst_ulps:
            worst_ulps, worst_case = d, (case["source"], name)
        # The display is checked against the CORRECTLY ROUNDED DOUBLE, not
        # against the exact rational: a correct implementation still holds a
        # double, and in the subnormal range the two differ by more than the
        # sixth figure. That difference is representation, not error.
        want_display = format_sig_figs(correct)
        got_display = exp["displayed"][name]
        if want_display != got_display and d == 0:
            display_mismatches.append((case["source"], name, want_display, got_display))

print(f"  skipped           : {skipped} (rejections, and degenerate weights with no finite answer)")
print(f"\n  worst distance from the exact value : {worst_ulps:.3f} ULP" + (f"  ({worst_case[0]}, {worst_case[1]})" if worst_case else ""))
print("    Measured, not a target. Two roundings are performed, so a small")
print("    distance is expected; §11 records both strategies within 2.9 ULP.")

failed = False
if display_mismatches:
    failed = True
    print(f"\n  RENDERING DISAGREEMENTS ON AN IDENTICAL DOUBLE: {len(display_mismatches)}")
    for src, which, want, got in display_mismatches[:10]:
        print(f"    {src} {which}: exact says {want}, tool says {got}")

if worst_ulps > 4:
    failed = True
    print(f"\n  FAILED: {worst_ulps:.3f} ULP from the exact value is beyond anything two roundings explain.")

print("\nFAILED" if failed else "\nPASSED: every shipped value is the correctly rounded one, or within two roundings of it.")
raise SystemExit(1 if failed else 0)
