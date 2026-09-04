"""
An independent reimplementation of C1, in a second language.

Acceptance test 3: "An independent reimplementation in a second language agrees
with the shipped implementation on the full reference set, to displayed
precision. Code review does not satisfy this test."

WRITTEN FROM URS v0.5, NOT FROM THE TYPESCRIPT. That is the whole point: a
transliteration of the shipped code would reproduce its arithmetic defects
faithfully and agree perfectly, which is exactly the failure mode this test
exists to rule out. Where this file and the TypeScript resemble each other it is
because they implement the same specification.

Two decisions taken here, both recorded because they are the places an
independent author has to choose something the URS does not state:

  1. UNIT NORMALISATION. Section 11 derives the round-trip tolerance from "each
     of the two operations contributes at most half a ULP of the result", so the
     conversion is written as exactly two operations against a single effective
     divisor. Applying the unit factors as separate steps is the arithmetically
     obvious reading and breaches the tolerance; see
     docs/invariance-confirmation.md.

  2. TIE-BREAKING AT SIX SIGNIFICANT FIGURES. The URS does not name a rule.
     ECMAScript's Number.prototype.toPrecision resolves a tie to the larger
     candidate - round-half-up - so this matches it deliberately, to keep the
     comparison a test of the arithmetic rather than of a formatting convention.
     Python's own default is round-half-even and would disagree on exact ties.
     Flagged as an open question in docs/rounding-ties.md.
"""

from decimal import Decimal, ROUND_HALF_UP

# Section 4. Multipliers to the base units, written from the unit tables in the
# URS rather than copied from the shipped source.
MASS_TO_G_PER_L = {
    "mg/mL": 1.0,
    "ug/mL": 1e-3,
    "ng/mL": 1e-6,
    "g/L": 1.0,
    "mg/L": 1e-3,
}

MOLAR_TO_MOL_PER_L = {
    "M": 1.0,
    "mM": 1e-3,
    "uM": 1e-6,
    "nM": 1e-9,
    "pM": 1e-12,
}

MW_TO_G_PER_MOL = {"g/mol": 1.0, "kDa": 1000.0}

# Section 11 constants register.
MW_LOWER_G_PER_MOL = 1_000.0        # 1 kDa
MW_UPPER_G_PER_MOL = 1_000_000.0    # 1000 kDa
MASS_UPPER_G_PER_L = 250.0          # 250 mg/mL
MOLAR_LOWER_MOL_PER_L = 1e-12       # 1 pM

DISPLAY_SIG_FIGS = 6


def effective_mw(mw_value, units):
    """The molecular weight expressed in (mass unit) per (molar unit)."""
    g_per_mol = mw_value * MW_TO_G_PER_MOL[units["mw"]]
    return (g_per_mol * MOLAR_TO_MOL_PER_L[units["molar"]]) / MASS_TO_G_PER_L[units["mass"]]


def convert(direction, entered_value, mw_value, units):
    """Section 5. Returns (mass_value, molar_value), both unrounded."""
    eff = effective_mw(mw_value, units)
    if direction == "mass-to-molar":
        return entered_value, entered_value / eff
    return entered_value * eff, entered_value


def format_sig_figs(v, figs=DISPLAY_SIG_FIGS):
    """
    Section 4, C1-UN-06. Six significant figures, trailing zeros kept.

    Rendered from the exact decimal expansion of the double, so the value being
    rounded is the value the machine holds and not a shortest-repr of it.
    Ties resolve upward, matching ECMAScript toPrecision - see the module note.
    """
    if v != v or v in (float("inf"), float("-inf")):
        return "n/a"
    if v == 0:
        return "0." + "0" * (figs - 1)
    d = Decimal(v)                      # exact, not Decimal(str(v))
    quantum = Decimal(1).scaleb(d.adjusted() - (figs - 1))
    r = d.quantize(quantum, rounding=ROUND_HALF_UP)
    # Rounding can carry across a decade boundary - 0.9999999999999999 to six
    # figures is 1.00000, not 1.000000 - which leaves the result one digit wider
    # than asked for. Re-quantize against the exponent the rounded value
    # actually has. Found by acceptance test 3 on fixture C1-FX-04n, which sits
    # one ULP below 1 pM and is the only case in the reference set that crosses
    # a decade while rounding.
    if r.adjusted() != d.adjusted():
        quantum = Decimal(1).scaleb(r.adjusted() - (figs - 1))
        r = r.quantize(quantum, rounding=ROUND_HALF_UP)
    # Match toPrecision's choice of fixed vs exponential form.
    exponent = r.adjusted()
    if exponent < -6 or exponent >= figs:
        mantissa = r.scaleb(-exponent).normalize()
        digits = str(abs(mantissa)).replace(".", "").rstrip("0") or "0"
        digits = digits.ljust(figs, "0")
        head = digits[0] + ("." + digits[1:] if figs > 1 else "")
        sign = "-" if r < 0 else ""
        return f"{sign}{head}e{'+' if exponent >= 0 else '-'}{abs(exponent)}"
    return str(r)


def rejections(direction, entered_value, mw_value, units):
    """Section 7. Returns a list of rejection codes."""
    out = []
    if not _finite(mw_value) or mw_value <= 0:
        out.append("C1-HI-01")
    if not _finite(entered_value) or entered_value < 0:
        out.append("C1-HI-02")
    return out


def _finite(x):
    return x == x and x not in (float("inf"), float("-inf"))


def flags(mw_value, units, provenance, mass_basis, mass_value, molar_value):
    """
    Section 8. Conditions are evaluated against the computed system, so this
    takes both quantities and never sees the conversion direction.
    """
    out = []
    mw_g_per_mol = mw_value * MW_TO_G_PER_MOL[units["mw"]]
    mass_g_per_l = mass_value * MASS_TO_G_PER_L[units["mass"]]
    molar_mol_per_l = molar_value * MOLAR_TO_MOL_PER_L[units["molar"]]

    if mw_g_per_mol < MW_LOWER_G_PER_MOL or mw_g_per_mol > MW_UPPER_G_PER_MOL:
        out.append("C1-FL-01")
    if mass_g_per_l > MASS_UPPER_G_PER_L:
        out.append("C1-FL-02")
    if molar_mol_per_l < MOLAR_LOWER_MOL_PER_L:
        out.append("C1-FL-03")
    if provenance == "calculated-from-sequence":
        out.append("C1-FL-04")
    if provenance == "not-recorded":
        out.append("C1-FL-05")
    if mass_basis == "monomer":
        out.append("C1-FL-06")
    if mass_basis == "not-recorded":
        out.append("C1-FL-07")
    if mass_basis == "conjugate":
        out.append("C1-FL-08")
    return out


def compute(request):
    """The whole determination, matching the shape the TypeScript exports."""
    direction = request["direction"]
    entered = request["enteredValue"]
    mw = request["mwValue"]
    units = request["units"]

    rej = rejections(direction, entered, mw, units)
    if rej:
        return {"ok": False, "rejections": rej}

    mass_value, molar_value = convert(direction, entered, mw, units)
    return {
        "ok": True,
        "massValue": mass_value,
        "molarValue": molar_value,
        "displayed": {
            "mass": format_sig_figs(mass_value),
            "molar": format_sig_figs(molar_value),
        },
        "flags": flags(mw, units, request["provenance"], request["massBasis"], mass_value, molar_value),
    }
