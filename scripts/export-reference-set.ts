/**
 * Exports the reference set and this implementation's results, for comparison
 * by an independent reimplementation. `npm run export:reference`.
 *
 * Acceptance test 3 compares two implementations, so the artefact in between
 * has to be data rather than code: inputs, and what the shipped tool returns
 * for them. reference/compare.py reads this and never imports anything from
 * src/.
 */

import { writeFileSync } from 'node:fs'
import { ALL_FIXTURES } from '../src/lib/fixtures'
import { computeConversion, type ConversionRequest } from '../src/lib/compute'
import { generateCases } from '../src/lib/corpus'
import { MASS_BASIS, MW_PROVENANCE } from '../src/lib/units'
import { ENGINE_VERSION } from '../src/lib/convert'

const requests: { source: string; request: ConversionRequest }[] = []

// §10's fixtures — "the full reference set" acceptance test 3 names.
for (const f of ALL_FIXTURES) requests.push({ source: f.id, request: f.request })

/*
 * Plus a deterministic sweep. Twenty-one fixtures is the specified set and is
 * not enough on its own to establish agreement between two implementations:
 * they exercise a handful of magnitudes, and the disagreements worth finding
 * are at the edges of the unit table. The sweep covers every unit combination
 * across eleven decades, and rotates the two declarations so the flag rules are
 * compared as well as the arithmetic.
 */
generateCases(20_000, 0xacce7).forEach((c, i) => {
  requests.push({
    source: `sweep-${i}`,
    request: {
      direction: i % 2 === 0 ? 'mass-to-molar' : 'molar-to-mass',
      enteredValue: i % 2 === 0 ? c.massValue : c.massValue / 1000,
      mwValue: c.mwValue,
      provenance: MW_PROVENANCE[i % MW_PROVENANCE.length],
      massBasis: MASS_BASIS[i % MASS_BASIS.length],
      units: c.units,
    },
  })
})

// A few cases chosen to be awkward for a formatter rather than for arithmetic.
for (const [entered, mw] of [[0, 150], [2, 150], [1e-7, 300], [999999, 1000], [1.5e8, 150]] as const) {
  requests.push({
    source: `edge-${entered}-${mw}`,
    request: {
      direction: 'mass-to-molar',
      enteredValue: entered,
      mwValue: mw,
      provenance: 'certificate-of-analysis',
      massBasis: 'assembled',
      units: { mass: 'mg/mL', molar: 'uM', mw: 'kDa' },
    },
  })
}

const cases = requests.map(({ source, request }) => {
  const outcome = computeConversion(request)
  return {
    source,
    request,
    expected: outcome.ok
      ? {
          ok: true,
          massValue: outcome.massValue,
          molarValue: outcome.molarValue,
          displayed: { mass: outcome.displayed.mass, molar: outcome.displayed.molar },
          flags: outcome.flags.map((f) => f.code),
        }
      : { ok: false, rejections: outcome.rejections.map((r) => r.code) },
  }
})

writeFileSync(
  new URL('../reference/reference-set.json', import.meta.url),
  JSON.stringify({ engineVersion: ENGINE_VERSION, generatedFrom: 'src/lib/compute.ts', cases }, null, 1),
)
console.log(`wrote reference/reference-set.json — ${cases.length} cases, engine ${ENGINE_VERSION}`)
