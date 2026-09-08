/**
 * The measurements behind open item 7. `npm run study:precision`.
 *
 * Run against the real conversion code, so the determination in
 * docs/open-item-07-displayed-precision.md stays a measurement of what ships
 * rather than a claim about it.
 */

import { massToMolar } from '../src/lib/convert'
import { formatSigFigs } from '../src/lib/format'
import { seededRandom } from '../src/lib/corpus'

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
console.log(`   pairs differing in the last bit: ${bitDiff} / ${pairs.length} (${((100 * bitDiff) / pairs.length).toFixed(3)}%): URS §6 says ~0.9%`)
console.log('   figs  disagreeing at that displayed precision')
for (let figs = 4; figs <= 16; figs++) {
  const d = pairs.filter(([a, b]) => formatSigFigs(a, figs) !== formatSigFigs(b, figs)).length
  console.log(`   ${String(figs).padStart(4)}  ${String(d).padStart(6)}${figs === 6 ? '   <-- C1-UN-06' : ''}`)
}

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
