/**
 * The form's own requirements, in a real browser.
 *
 * WHY THIS EXISTS. C1-ST-03 shipped defective — one retention flag for three
 * fields, so confirming the molecular weight silently unmarked the source and
 * the mass basis while both were still carrying pre-switch values. Nothing
 * caught it, and the reason is exact: no test rendered `App.tsx`, and
 * `check-network.mjs` drives the form but never changes direction. Requirements
 * that live only in the component had no execution behind them at all.
 *
 * `src/lib/retention.test.ts` tests the rules without a DOM, which is where the
 * defect actually was. This checks the WIRING — that the component asks the
 * rules the right question and renders the answer — which a pure test cannot.
 * Both are needed: the first would have caught the original, the second catches
 * the next one.
 *
 * Against `dist/`, not the dev server: the behaviour under test should be the
 * behaviour that ships.
 *
 *   node scripts/check-ui.mjs
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { serveDist } from './serve-dist.mjs'

/*
 * Read from the source rather than inferred from the page, so the two halves of
 * the pairing are checked against the same declaration. Inferring it from the
 * rendered text means the flag being true makes this block skip itself, which
 * is the check agreeing with whatever the page happens to say.
 */
const NETWORK_CLAIM_VERIFIED = /NETWORK_CLAIM_VERIFIED\s*=\s*true/.test(readFileSync('src/lib/site.ts', 'utf8'))

const PORT = 8973
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

const { server, origin } = await serveDist(PORT)

const browser = await chromium.launch({
  ...(existsSync(CHROME) ? { executablePath: CHROME } : {}),
  args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run'],
})
// A context rather than a bare page, so the structured-object assertion can
// read what the copy button actually put on the clipboard rather than trusting
// that the button exists.
const context = await browser.newContext()
await context.grantPermissions(['clipboard-read', 'clipboard-write'])
const page = await context.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

/** Which field labels currently carry a "retained — confirm" badge. */
const badgedFields = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.retained')].map((el) => {
      const owner = el.closest('label, legend')
      return owner ? owner.textContent.replace('Retained — not re-confirmed', '').trim() : '(orphan badge)'
    }),
  )

const resultText = async () => ((await page.textContent('.result-value').catch(() => null)) ?? '').trim()

async function fillEverything() {
  await page.fill('#entered', '1')
  await page.selectOption('#enteredunit', 'mg/mL')
  await page.fill('#mw', '150')
  await page.selectOption('#mwunit', 'kDa')
  await page.selectOption('#prov', 'certificate-of-analysis')
  await page.check('input[name="massBasis"][value="assembled"]')
  await page.waitForTimeout(150)
}

// ---------------------------------------------------------------------------
// C1-UN-01 and C1-MW-03 — the two input units are chosen, not supplied.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })

const initial = await page.evaluate(() => ({
  enteredUnit: document.querySelector('#enteredunit').value,
  mwUnit: document.querySelector('#mwunit').value,
  outUnit: document.querySelector('#outunit').value,
}))
check(initial.enteredUnit === '', `the entered-concentration unit arrives pre-filled with "${initial.enteredUnit}"`)
check(initial.mwUnit === '', `the molecular-weight unit arrives pre-filled with "${initial.mwUnit}"`)
// The result unit is the deliberate exception: it is rendered beside the number,
// so an unintended choice is visible rather than silent.
check(initial.outUnit !== '', 'the result unit lost its default; only the two INPUT units are compelled')

// Everything but the units, and no number may appear.
await page.fill('#entered', '1')
await page.fill('#mw', '150')
await page.selectOption('#prov', 'certificate-of-analysis')
await page.check('input[name="massBasis"][value="assembled"]')
await page.waitForTimeout(200)
check(
  (await page.locator('.result-value').count()) === 0,
  'a conversion completed without the input units being chosen — C1-UN-01 is not compelled',
)

await page.selectOption('#enteredunit', 'mg/mL')
await page.selectOption('#mwunit', 'kDa')
await page.waitForTimeout(200)
check(
  (await resultText()).startsWith('6.66667'),
  `choosing the units did not complete the reference case; got "${await resultText()}"`,
)

// ---------------------------------------------------------------------------
// C1-ST-03 — the three-step sequence from the conformance audit.
//
// This is the defect, as a script. Under the single boolean, step 3 reported
// zero badges while the source and the mass basis were still carrying their
// pre-switch values.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })
await fillEverything()

check((await badgedFields()).length === 0, 'a badge appeared before any direction change')

// Step 2 — switch direction. All three declarations are carried, so all three
// are marked.
await page.click('.directions button:has-text("molar → mass")')
await page.waitForTimeout(200)
const afterSwitch = await badgedFields()
check(afterSwitch.length === 3, `after the direction change ${afterSwitch.length} of 3 declarations were marked: ${afterSwitch.join(' | ')}`)
check(
  (await page.inputValue('#entered')) === '' && (await page.evaluate(() => document.querySelector('#enteredunit').value)) === '',
  'the entered concentration or its unit survived the direction change — its unit changes what it measures across the swap',
)
check(
  (await page.inputValue('#mw')) === '150' && (await page.evaluate(() => document.querySelector('#mwunit').value)) === 'kDa',
  'the molecular weight was not carried across the direction change',
)

// Step 3 — confirm ONLY the molecular weight. The other two are still
// unconfirmed and must still be marked.
await page.fill('#mw', '1500')
await page.waitForTimeout(200)
const afterConfirmingWeight = await badgedFields()
check(
  !afterConfirmingWeight.some((f) => f.includes('Molecular weight')),
  'confirming the molecular weight left its own badge in place',
)
check(
  afterConfirmingWeight.some((f) => f.includes('Source of that weight')),
  'confirming the molecular weight also cleared the badge on Source — C1-ST-03: a retained value is unmarked',
)
check(
  afterConfirmingWeight.some((f) => f.includes('mass of')),
  'confirming the molecular weight also cleared the badge on Mass basis — C1-ST-03: a retained value is unmarked',
)

// Confirming the remaining two clears the rest, one at a time.
await page.selectOption('#prov', 'vendor-datasheet')
await page.waitForTimeout(120)
check((await badgedFields()).length === 1, 'confirming the source did not leave the mass basis marked on its own')
await page.check('input[name="massBasis"][value="monomer"]')
await page.waitForTimeout(120)
check((await badgedFields()).length === 0, 'confirming all three declarations left something marked')

// ---------------------------------------------------------------------------
// The second facet — a field holding nothing is never badged.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })
await page.fill('#mw', '150')
await page.selectOption('#mwunit', 'kDa')
await page.click('.directions button:has-text("molar → mass")')
await page.waitForTimeout(200)
const partial = await badgedFields()
check(
  partial.length === 1 && partial[0].includes('Molecular weight'),
  `an empty declaration was marked as retained: ${partial.join(' | ')}`,
)

// ---------------------------------------------------------------------------
// C1-CV-03 — the displayed relation carries no coined unit.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })
await fillEverything()

const relation = await page.evaluate(() => {
  const dts = [...document.querySelectorAll('dl.derivation dt')]
  const dt = dts.find((d) => d.textContent.trim() === 'Relation')
  return dt ? dt.nextElementSibling.textContent : ''
})
check(!/effective (kDa|g\/mol|mg\/mL|µM|M\b)/i.test(relation), `the relation still names a coined unit: "${relation}"`)
check(/molar concentration = mass concentration ÷ molecular weight/.test(relation), `the physical relation is not stated: "${relation}"`)
check(/mg\/mL per µM/.test(relation), 'the folded divisor is not given in standard units')

// ---------------------------------------------------------------------------
// C1-FL-09 — a retained declaration reaches the RESULT, not only the form.
//
// The badge was the whole of retention until v0.2.0. It satisfied C1-ST-03 as
// written and left the record wrong in a way the screen was not: the derivation
// said "as declared" of a value the user had never re-affirmed in this
// direction, and the structured object carried no trace of it at all. So this
// drives the switch and then inspects the result and the exported object,
// rather than stopping at the badge.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })
await fillEverything()
await page.click('.directions button:has-text("molar → mass")')
await page.waitForTimeout(200)

// Re-enter only the concentration. The three declarations stay carried.
await page.fill('#entered', '6.66667')
await page.selectOption('#enteredunit', 'uM')
await page.waitForTimeout(250)

check((await page.locator('.result-value').count()) === 1, 'no result after re-entering the concentration')

const retentionFlag = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.flag')].find((p) => p.textContent.includes('C1-FL-09'))
  return el ? el.textContent : null
})
check(retentionFlag !== null, 'a result computed from carried declarations raised no C1-FL-09')
if (retentionFlag) {
  check(/molecular weight/i.test(retentionFlag), 'C1-FL-09 does not name which declarations were carried')
  check(/not re-confirmed/i.test(retentionFlag), 'C1-FL-09 does not say the values were not re-confirmed')
}

// The derivation must stop claiming a declaration that was not made here.
const derivation = await page.evaluate(() => {
  const dt = [...document.querySelectorAll('dl.derivation dt')].find((d) => d.textContent.trim() === 'Assumptions')
  return dt ? dt.nextElementSibling.textContent : ''
})
check(/not re-confirmed/.test(derivation), 'the derivation does not mark the retained weight')
check(
  !/as declared/.test(derivation),
  'the derivation still says "as declared" of a value carried across the direction switch',
)

// The threshold caveat is scoped to threshold flags, and retention is not one.
check(
  !(await page.evaluate(() => [...document.querySelectorAll('.statements p')].some((p) => p.textContent.includes('display identically')))),
  'the threshold caveat appeared beside a retention-only flag',
)

// And the record. Read the clipboard rather than trusting the button.
const exported = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll('button.copy')].find((b) => b.textContent.includes('JSON'))
  btn.click()
  await new Promise((r) => setTimeout(r, 150))
  return navigator.clipboard.readText()
})
let obj = null
try {
  obj = JSON.parse(exported)
} catch {
  check(false, 'the structured result on the clipboard is not valid JSON')
}
if (obj) {
  check(
    obj.declarations?.retained?.mw === true,
    `the structured object does not record WHICH declarations were retained: ${JSON.stringify(obj.declarations?.retained)}`,
  )
  check(
    obj.declarations?.retained?.massBasis === true,
    'the mass basis was carried across the switch and the object does not say so',
  )
  check(
    obj.flags.some((f) => f.code === 'C1-FL-09' && f.kind === 'retention'),
    'C1-FL-09 is missing from the exported flags',
  )
  check(
    !obj.derivation.assumptions.join(' ').includes('as declared'),
    'the exported derivation still claims "as declared" for a carried value',
  )
}

// ---------------------------------------------------------------------------
// C1-FL-10 — zero is the absence of solute, not a low concentration.
// ---------------------------------------------------------------------------

await page.goto(origin, { waitUntil: 'networkidle' })
await page.fill('#entered', '0')
await page.selectOption('#enteredunit', 'mg/mL')
await page.fill('#mw', '150')
await page.selectOption('#mwunit', 'kDa')
await page.selectOption('#prov', 'certificate-of-analysis')
await page.check('input[name="massBasis"][value="assembled"]')
await page.waitForTimeout(250)

const zeroFlags = await page.evaluate(() =>
  [...document.querySelectorAll('.flag')].map((p) => p.textContent.trim()),
)
check(zeroFlags.length === 1, `zero raised ${zeroFlags.length} flags, expected exactly one`)
check(zeroFlags.some((t) => t.includes('C1-FL-10')), 'zero does not raise C1-FL-10')
check(
  !zeroFlags.some((t) => t.includes('C1-FL-03')),
  'zero still raises C1-FL-03 — "below the range typical of biologic working solutions" is true of zero and says nothing about it',
)

// ---------------------------------------------------------------------------
// Ratified as built, 4 September 2026 — NADIRA, against the running tool.
//
// These are fixed points, not new requirements. They were confirmed live rather
// than from the suite, which means the suite was not what was holding them:
// asserted here so that a later change has to break a check rather than a
// memory.
// ---------------------------------------------------------------------------

// Half-to-even in the SHIPPED path, not only in the fixtures. 1 g/L at 51.2 kDa
// is exactly 19.53125 µM, and the rounding mode alone decides the last digit.
await page.goto(origin, { waitUntil: 'networkidle' })
await page.fill('#entered', '1')
await page.selectOption('#enteredunit', 'g/L')
await page.fill('#mw', '51.2')
await page.selectOption('#mwunit', 'kDa')
await page.selectOption('#prov', 'certificate-of-analysis')
await page.check('input[name="massBasis"][value="assembled"]')
await page.waitForTimeout(200)
check(
  (await resultText()).startsWith('19.5312') && !(await resultText()).startsWith('19.5313'),
  `the exact tie did not round half-to-even in the shipped path; got "${await resultText()}"`,
)

// Acceptance 9a as a VISIBLE state: the clean case says so rather than showing
// an absence.
await page.goto(origin, { waitUntil: 'networkidle' })
await fillEverything()
check((await page.locator('.no-flags').count()) === 1, 'the clean case does not render "No flags raised"')
check(
  (await page.locator('.flag').count()) === 0,
  'the negative control raised a flag',
)

// The flag-versus-display sentence appears only when a THRESHOLD flag fires.
// A declaration flag has no rounding between the input and the condition, so
// the sentence would be noise on it.
const thresholdSentence = () =>
  page.evaluate(() => [...document.querySelectorAll('.statements p')].some((p) => p.textContent.includes('display identically')))

check(!(await thresholdSentence()), 'the threshold caveat appeared on a result with no flags')

await page.selectOption('#prov', 'not-recorded')
await page.waitForTimeout(200)
check((await page.locator('.flag').count()) === 1, 'the declaration flag did not render')
check(!(await thresholdSentence()), 'the threshold caveat appeared on a declaration-only flag')

await page.fill('#mw', '0.5')
await page.waitForTimeout(200)
check(await thresholdSentence(), 'the threshold caveat did not appear when a threshold flag fired')

// ---------------------------------------------------------------------------
// C1-OUT-03 — the structured object is reachable from the page.
// ---------------------------------------------------------------------------

check(
  (await page.locator('button.copy', { hasText: 'JSON' }).count()) === 1,
  'the structured result is not offered on the page',
)

// ---------------------------------------------------------------------------
// C1-NF-01 — the footer claims only what has been established.
// ---------------------------------------------------------------------------

const footer = (await page.textContent('footer.site')) ?? ''
/*
 * The claim now lives in the SHARED footer component, which will not render one
 * without being told the evidence state. Both branches are asserted, so the
 * component cannot lose the gate by acquiring a default.
 */
const STRONG_CLAIM = /No data is transmitted/
if (NETWORK_CLAIM_VERIFIED) {
  check(STRONG_CLAIM.test(footer), 'NETWORK_CLAIM_VERIFIED is true but the footer still hedges')
} else {
  check(
    /Not yet verified at this address/.test(footer),
    'the footer does not say the deployed address is unverified while acceptance test 14 is unrun',
  )
  check(!STRONG_CLAIM.test(footer), 'the footer makes the unverified strong transmission claim')
}

// ---------------------------------------------------------------------------
// Branding conformance — the suite's chrome, not C1's own.
//
// C1 reached a conformance audit at 46 of 53 requirements while sharing no
// design token with the shipped tool, because no requirement asked. Asserted
// here so that re-divergence is a failure rather than a discovery.
// ---------------------------------------------------------------------------

check(page.url().length > 0, 'no page')
check(
  (await page.title()) === 'Ligant · Molarity Converter for Biologics',
  `the title tag does not follow the suite pattern; got "${await page.title()}"`,
)

const brand = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const pressed = document.querySelector('.directions button[aria-pressed="true"]')
  return {
    bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g, ''),
    bodySize: getComputedStyle(document.body).fontSize,
    page: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
    accent: pressed ? getComputedStyle(pressed).backgroundColor : null,
    cardRadius: getComputedStyle(document.querySelector('.panel')).borderRadius,
    controlRadius: getComputedStyle(document.querySelector('#mw')).borderRadius,
    h1: (() => { const s = getComputedStyle(document.querySelector('h1')); return `${s.fontSize}/${s.fontWeight}/${s.letterSpacing}` })(),
    markLabel: document.querySelector('header.masthead svg')?.getAttribute('aria-label'),
    wordmark: document.querySelector('header.masthead .wordmark')?.textContent,
    suite: (() => {
      const e = document.querySelector('.eyebrow.suite-mark')
      if (!e) return null
      const s = getComputedStyle(e)
      return { text: e.textContent, size: s.fontSize, weight: s.fontWeight, tracking: s.letterSpacing, transform: s.textTransform }
    })(),
    teal: cs.getPropertyValue('--brand-teal').trim(),
    offwhite: cs.getPropertyValue('--brand-offwhite').trim(),
  }
})

check(brand.bodyFont === 'Inter', `body face is "${brand.bodyFont}", not Inter`)
check(brand.bodySize === '14px', `body size is ${brand.bodySize}, not the suite's 14px`)
check(brand.page === 'rgb(250, 247, 242)', `page ground is ${brand.page}, not --brand-offwhite`)
check(brand.ink === 'rgb(27, 42, 74)', `primary text is ${brand.ink}, not --brand-navy`)
check(brand.accent === 'rgb(13, 124, 102)', `the accent is ${brand.accent}, not --brand-teal — navy is the TEXT colour`)
check(brand.cardRadius === '10px', `card radius is ${brand.cardRadius}, not --radius`)
check(brand.controlRadius === '6px', `control radius is ${brand.controlRadius}, not --radius-sm`)
check(brand.h1 === '25px/700/-0.275px', `H1 treatment is ${brand.h1}, not the suite's 25px/700/-0.275px`)
check(brand.markLabel === 'Ligant', 'the masthead carries no Ligant mark')
check(brand.wordmark === 'Ligant', 'the masthead carries no Ligant wordmark')
check(brand.suite?.text === 'Bench Tools', 'the masthead carries no suite label')
check(
  brand.suite?.size === '11px' && brand.suite?.weight === '600' && brand.suite?.tracking === '1.54px' && brand.suite?.transform === 'uppercase',
  `the suite label treatment differs from the reference: ${JSON.stringify(brand.suite)}`,
)

// The favicon is the tab identity. It must be the suite mark — not lettered,
// not recoloured per tool.
const favicon = await page.evaluate(async () => {
  const href = document.querySelector('link[rel~="icon"]')?.getAttribute('href')
  if (!href) return null
  const res = await fetch(href)
  return res.ok ? await res.text() : null
})
check(favicon !== null, 'the page declares no favicon')
if (favicon) {
  check(favicon.includes('#0D7C66'), 'the favicon is not on the brand teal ground')
  check(favicon.includes('#E0A416'), 'the favicon has no amber centre node')
  check((favicon.match(/<circle/g) ?? []).length === 7, 'the favicon is not the six-vertex node mark')
  check(!/<text|font-family/i.test(favicon), 'the favicon is lettered — it must be the mark alone')
}

await context.close()
await browser.close()
server.close()

console.log(`\ncheck-ui — ${origin}`)
if (failures.length) {
  console.error('\ncheck-ui FAILED')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log('  C1-UN-01 / C1-MW-03 — both input units compelled, result unit defaulted')
console.log('  C1-ST-03 — retention marked per field, and never on an empty field')
console.log('  C1-CV-03 — the relation names no coined unit')
console.log('  C1-OUT-03 — the structured result is reachable')
console.log('  C1-NF-01 — the footer claims only what has been established')
console.log('  §0 ratified — half-to-even live, 9a visible, threshold caveat scoped')
console.log('  C1-FL-09 — retention reaches the result, the derivation and the record')
console.log('  C1-FL-10 — zero is flagged as empty, not as implausibly low')
console.log('  Branding — suite tokens, masthead, suite label, mark, title tag')
console.log('\ncheck-ui passed.')
