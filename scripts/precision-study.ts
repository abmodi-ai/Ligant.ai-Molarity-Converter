/**
 * The measurements behind open item 7. `npm run study:precision`.
 *
 * Run against the real conversion code, so the determination in
 * docs/open-item-07-displayed-precision.md stays a measurement of what ships
 * rather than a claim about it.
 */

import { massToMolar, type ConversionUnits } from '../src/lib/convert'
import { formatSigFigs } from '../src/lib/format'
import { generateCases, seededRandom } from '../src/lib/corpus'
import { stepwisePath } from '../src/lib/invariance'

const UM = { mass: 'mg/mL', molar: 'uM', mw: 'g/mol' } as const

console.log('1) Acceptance test 1: the reference case')
const ref = massToMolar(1, 150000, UM)
console.log(`   150 kDa, 1 mg/mL -> ${formatSigFigs(ref)} µM   (URS §16.1 expects 6.66667)`)
console.log(`   monomer error on the same case -> ${formatSigFigs(massToMolar(1, 75000, UM))} µM; unambiguous at six figures`)

console.log('\n2) C1-IV-03: g/mol vs kDa disagreement rate against displayed precision')
const rnd = seededRandom(0xc1e7)
const pairs: [number, number][] = []
for (let i = 0; i < 200_000; i++) {
  const mwGmol = Math.floor(1000 + rnd() * 999_000)
  const c = Math.pow(10, -6 + rnd() * 7)
  pairs.push([
    massToMolar(c, mwGmol, UM),
    massToMolar(c, mwGmol / 1000, { ...UM, mw: 'kDa' }),
  ])
}
const bitDiff = pairs.filter(([a, b]) => a !== b).length
console.log(`   pairs differing in the last bit: ${bitDiff} / ${pairs.length} (${((100 * bitDiff) / pairs.length).toFixed(3)}%)`)
console.log('   figs  disagreeing at that displayed precision')
for (let figs = 4; figs <= 16; figs++) {
  const d = pairs.filter(([a, b]) => formatSigFigs(a, figs) !== formatSigFigs(b, figs)).length
  console.log(`   ${String(figs).padStart(4)}  ${String(d).padStart(6)}${figs === 6 ? '   <-- C1-UN-06' : ''}`)
}

/*
 * 2b) The same quantity on three corpora, because it was reported as one.
 *
 * "Roughly 0.9%" travelled through URS §6 and this document with no corpus
 * attached, and three different measurements were then compared as though they
 * disagreed. They do not: the rate is a property of the corpus as much as of
 * the implementation, and a bare percentage cannot be checked by anyone.
 *
 * Both documents quote this table, and both quote it from this one run.
 */
type Corpus = { name: string; cases: { c: number; mwGmol: number; units: ConversionUnits }[] }

const corpora: Corpus[] = [
  {
    name: 'This study: 200,000 random pairs, MW 1e3 to 1e6 g/mol, 7 decades, mg/mL to uM',
    cases: (() => {
      const r = seededRandom(0xc1e7)
      return Array.from({ length: 200_000 }, () => ({
        mwGmol: Math.floor(1000 + r() * 999_000),
        c: Math.pow(10, -6 + r() * 7),
        units: UM as ConversionUnits,
      }))
    })(),
  },
  {
    name: 'Acceptance-6 sweep: MW 10,000 to 500,000 step 617, five concentrations, mg/mL to uM',
    cases: (() => {
      const out: Corpus['cases'] = []
      for (let mwGmol = 10_000; mwGmol <= 500_000; mwGmol += 617)
        for (const c of [0.1, 1.25, 2.4, 12.5, 137.9]) out.push({ c, mwGmol, units: UM as ConversionUnits })
      return out
    })(),
  },
  {
    name: 'Invariance corpus: 200,000 cases, every unit combination, 11 decades',
    cases: generateCases(200_000, 0x51de5).map((x) => ({
      c: x.massValue,
      mwGmol: x.units.mw === 'kDa' ? x.mwValue * 1000 : x.mwValue,
      units: x.units,
    })),
  },
]

const rate = (corpus: Corpus, convert: typeof massToMolar) => {
  let differ = 0
  for (const { c, mwGmol, units } of corpus.cases) {
    const a = convert(c, mwGmol, { ...units, mw: 'g/mol' })
    const b = convert(c, mwGmol / 1000, { ...units, mw: 'kDa' })
    if (a !== b) differ++
  }
  return (100 * differ) / corpus.cases.length
}

console.log('\n2b) The last-bit disagreement rate, per corpus and per implementation')
console.log('    folded  stepwise  n        corpus')
for (const corpus of corpora) {
  const folded = rate(corpus, massToMolar).toFixed(3)
  const step = rate(corpus, stepwisePath().massToMolar).toFixed(3)
  console.log(
    `    ${folded.padStart(6)}  ${step.padStart(8)}  ${String(corpus.cases.length).padStart(7)}  ${corpus.name}`,
  )
}
console.log('    Folded is lower everywhere. Two operations rather than six leaves')
console.log('    fewer places for the g/mol and kDa orderings to part in the last bit.')

console.log('\n3) C1-FX-07: rounding the unit-normalised intermediate')
const mw = 148327
const entered = 1234.5678
const normalised = entered * 1e-3
const roundedIntermediate = Number(normalised.toPrecision(6))
const unrounded = massToMolar(entered, mw, { mass: 'ug/mL', molar: 'uM', mw: 'g/mol' })
const early = massToMolar(roundedIntermediate, mw, { mass: 'g/L', molar: 'uM', mw: 'g/mol' })
console.log(`   MW ${mw} g/mol, ${entered} µg/mL`)
console.log(`   intermediate ${normalised} g/L, rounded to six figures ${roundedIntermediate} g/L`)
console.log(`   unrounded    -> ${formatSigFigs(unrounded)} µM`)
console.log(`   rounded early-> ${formatSigFigs(early)} µM`)
console.log(`   sixth significant figure differs: ${formatSigFigs(unrounded) !== formatSigFigs(early)}`)
