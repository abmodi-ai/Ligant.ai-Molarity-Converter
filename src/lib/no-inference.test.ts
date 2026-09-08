import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { computeConversion, type ConversionRequest } from './compute'

/**
 * C1-MW-02: the system shall not infer, default, pre-fill, or suggest a
 * molecular weight under any circumstance, including for common biologics.
 *
 * §15 lists molecular weight lookup and protein identification as deliberately
 * excluded, pointing here. This is the tool's reason to exist and, as the build
 * note put it, the first thing anyone will ask to relax; a convenience that
 * would be added in one line by someone who did not know that. So it is
 * asserted against the source, not only against the type signature: a default
 * parameter, an optional field, or a lookup table would all satisfy the
 * compiler.
 */

const LIB = new URL('.', import.meta.url).pathname

function sourceFiles(): { name: string; text: string }[] {
  return readdirSync(LIB)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => ({ name: f, text: readFileSync(join(LIB, f), 'utf8') }))
}

describe('C1-MW-02: no molecular weight is ever inferred', () => {
  it('no source file contains a table of protein or antibody weights', () => {
    // A lookup keyed by a protein name is the shape this would take. Names are
    // matched rather than numbers, because 150000 legitimately appears in
    // fixtures and in the plausibility bounds.
    const suspicious = /\b(trastuzumab|rituximab|bevacizumab|pembrolizumab|nivolumab|adalimumab|cetuximab|IgG1?\s*[:=]|MW_TABLE|KNOWN_WEIGHTS|COMMON_ANTIBODIES|DEFAULT_MW)\b/i
    for (const { name, text } of sourceFiles()) {
      // Comments legitimately discuss IgG; strip them before matching.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      expect(suspicious.test(code), `${name} appears to contain a molecular weight lookup`).toBe(false)
    }
  })

  it('mwValue is required: a request without one does not type-check and is rejected at runtime', () => {
    // The runtime half. TypeScript makes the field required, but the tool is
    // shipped as JavaScript and the requirement is about behaviour.
    const withoutMw = {
      direction: 'mass-to-molar',
      enteredValue: 1,
      provenance: 'certificate-of-analysis',
      massBasis: 'assembled',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    } as unknown as ConversionRequest

    const outcome = computeConversion(withoutMw)
    expect(outcome.ok, 'a conversion completed without a molecular weight').toBe(false)
    if (!outcome.ok) {
      expect(outcome.rejections.some((r) => r.code === 'C1-HI-01')).toBe(true)
    }
  })

  it('an empty or non-numeric molecular weight is rejected, not substituted', () => {
    for (const bad of [NaN, Number('' as unknown as string), undefined, null]) {
      const outcome = computeConversion({
        direction: 'mass-to-molar',
        enteredValue: 1,
        mwValue: bad as unknown as number,
        provenance: 'certificate-of-analysis',
        massBasis: 'assembled',
        units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
      })
      expect(outcome.ok, `a conversion completed with mwValue = ${String(bad)}`).toBe(false)
    }
  })

  it('acceptance 11: no conversion completes without an explicit molecular weight', () => {
    const outcome = computeConversion({
      direction: 'mass-to-molar',
      enteredValue: 1,
      mwValue: 0,
      provenance: 'certificate-of-analysis',
      massBasis: 'assembled',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' },
    })
    expect(outcome.ok).toBe(false)
  })
})
