/**
 * The runtime half of the C1-NF-01 proof, and the instrument for acceptance
 * test 14.
 *
 * Acceptance test 14: "C1-NF-01 is verified in a real browser against the
 * deployed address, with network monitoring initialised before page load, and
 * re-verified after any deployment or CDN configuration change. Verification
 * against the build artefact does not satisfy this test."
 *
 * So three things are load-bearing here and none of them is optional:
 *
 *   1. A REAL BROWSER. String scanning cannot establish what is requested.
 *   2. MONITORING BEFORE LOAD. The listeners are attached to a blank page and
 *      the navigation happens afterwards, so a request issued by the document
 *      itself: a stylesheet, a font, a CDN default injected by the host; is
 *      recorded. Attaching after `goto` misses exactly the requests that
 *      matter, which is how a claim like this gets made falsely.
 *   3. AGAINST THE DEPLOYED ADDRESS. A CDN or static host can add headers,
 *      inject scripts, or rewrite the document, and none of that is in the
 *      artefact. The two previous failures of this claim were both CDN
 *      defaults invisible in the build output.
 *
 * Requests are RECORDED, not blocked. Blocking would prove the page survives
 * without a third party; recording proves it never asks for one.
 *
 * Usage:
 *   node scripts/check-network.mjs                     # serves dist/ locally
 *   node scripts/check-network.mjs https://host/path/   # acceptance test 14
 */

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'
import { serveDist } from './serve-dist.mjs'

const PORT = 8972
const target = process.argv[2] ?? null
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'

const SITE_TS = readFileSync('src/lib/site.ts', 'utf8')
const SITE_URL = (SITE_TS.match(/SITE_URL\s*=\s*['"]([^'"]+)['"]/) ?? [])[1]
const TOOL_PATH = (SITE_TS.match(/TOOL_PATH\s*=\s*['"]([^'"]+)['"]/) ?? [])[1]
const TOOL_NAME = (SITE_TS.match(/TOOL_NAME\s*=\s*['"]([^'"]+)['"]/) ?? [])[1]
/** The one address acceptance test 14 is about, composed rather than retyped. */
const DEPLOYED_URL = SITE_URL && TOOL_PATH ? `${SITE_URL}${TOOL_PATH}` : null

/*
 * The footer's network claim, and the gate on it.
 *
 * The page asserts "no network request of any kind" only when this is true, and
 * it may only be set true after acceptance test 14 has passed against the
 * DEPLOYED address. This check enforces the other half of that pairing: if the
 * claim is live and this run is a local server over dist/, the check fails.
 * Otherwise the strong claim could ship on the strength of a run that cannot
 * see the CDN path: which is exactly how the claim failed twice before.
 */
const NETWORK_CLAIM_VERIFIED = /NETWORK_CLAIM_VERIFIED\s*=\s*true/.test(SITE_TS)

/*
 * C1-NF-03 HAS NO STANDARD, and this script must not invent one.
 *
 * "Inputs and result shall fit one screen without scrolling on a standard
 * laptop display." Nothing defines the display. The figure was 1440x820 until
 * 4 September 2026 and then 1440x900, and BOTH were viewport heights this
 * script chose: which is the defect, not the numbers. A 1440x900 laptop does
 * not have a 900px viewport: browser chrome takes about a hundred pixels and
 * the page gets 797. So the check was passing against a screen nobody owns.
 *
 * An undeclared constant governing a pass/fail test is the class §11 exists
 * for, and a check that passes against a number it made up is the proxy pattern
 * in docs/correspondence.md §I. So this reports the measurement at each
 * candidate and declares the standard UNSET, the same shape as acceptance test
 * 14 reporting UNRUN rather than a false pass.
 *
 * Owner: A. Modi. Smallest supported window AND zoom level, then it becomes a
 * register row with its basis and this becomes a gate again.
 *
 * Widths differ per candidate because they change wrapping, and heights are
 * viewport heights measured from the real windows rather than assumed.
 */
const VIEWPORT_CANDIDATES = [
  { window: '1440 x 900', width: 1440, height: 797 },
  { window: '1280 x 800', width: 1280, height: 697 },
  { window: '1366 x 768', width: 1366, height: 665 },
]

/** The size this script drives the page at while exercising it. */
const VIEWPORT = { width: 1440, height: 900 }

let server = null
let origin = target

if (!target) {
  ;({ server, origin } = await serveDist(PORT))
}

/*
 * Chromium's own background services, autofill, account sync, component
 * updates: talk to Google on startup regardless of what the page does. Those
 * are browser requests, not page requests, and Playwright's page/context
 * listeners below do not report them. They are disabled anyway so that anyone
 * watching this run at the network layer sees a clean trace and cannot mistake
 * browser telemetry for something the tool did.
 */
const browser = await chromium.launch({
  ...(existsSync(CHROME) ? { executablePath: CHROME } : {}),
  args: [
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
  ],
})
const context = await browser.newContext()
const page = await context.newPage()

// ---------------------------------------------------------------------------
// Monitoring is armed HERE, on a page that has not navigated anywhere. Every
// listener below is attached before the `goto` at the bottom of this block.
// ---------------------------------------------------------------------------
const requests = []
const failures = []

// Both listeners are attached: `context` catches requests from popups and
// other pages, `page` is the reliable one for the main document. They overlap,
// so the record is de-duplicated on the way out rather than by dropping one and
// hoping the other saw everything.
const record = (r) => {
  const entry = { url: r.url(), type: r.resourceType(), method: r.method() }
  if (!requests.some((x) => x.url === entry.url && x.method === entry.method && x.type === entry.type)) {
    requests.push(entry)
  }
}
page.on('request', record)
context.on('request', record)
page.on('websocket', (ws) => failures.push(`WebSocket opened to ${ws.url()}`))
page.on('worker', (w) => requests.push({ url: w.url(), type: 'worker', method: 'GET' }))

const pageOrigin = new URL(origin).origin
const isOwn = (url) =>
  url.startsWith(pageOrigin) ||
  (SITE_URL && url.startsWith(SITE_URL)) ||
  url.startsWith('data:') ||
  url.startsWith('blob:') ||
  url === 'about:blank'

/*
 * Now navigate, and SURVIVE FAILING TO.
 *
 * This threw an unhandled TimeoutError the first time it was pointed at a
 * deployed address, which is the one thing the instrument for acceptance test
 * 14 must not do: a stack trace is not a result, and a reader cannot tell a
 * crash from a failure from a pass. The test has three outcomes and they are
 * different facts.
 *
 * `networkidle` is also the wrong wait for a real host. A page behind bot
 * protection, or one holding a keepalive, may never reach it, and waiting for
 * idle is not what the test needs: the listeners are already armed, so every
 * request is recorded whether or not the page settles. Load, then observe for a
 * fixed window.
 */
let navigationError = null
try {
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(3_000) // observe late requests rather than wait for idle
} catch (error) {
  navigationError = error
}

if (navigationError) {
  await browser.close()
  if (server) server.close()
  console.error(`\ncheck-network: the address did not load\n  ${origin}\n  ${navigationError.message.split('\n')[0]}`)
  console.error('\n  ACCEPTANCE TEST 14: NOT RUN.')
  console.error('  This is not a failure of the claim and not a pass. Nothing was')
  console.error('  observed, because nothing was served to observe. Distinguish it from')
  console.error('  a run that saw a third-party request: that would be a FAILURE.')
  process.exit(2)
}

/*
 * And confirm it is THIS tool. Pointing the instrument at a sibling in the
 * suite would otherwise exercise nothing, mis-report, or pass on another tool's
 * clean page, and the addresses differ by one path segment.
 */
const servedTitle = await page.title()
if (target && !servedTitle.includes(TOOL_NAME)) {
  const challenged =
    /just a moment|checking your browser|attention required/i.test(servedTitle) ||
    requests.some((r) => /challenges\.cloudflare\.com|\/cdn-cgi\/challenge-platform/.test(r.url))
  await browser.close()
  if (server) server.close()

  if (challenged) {
    /*
     * A distinct outcome, and the most consequential one this instrument has
     * reported. The host interposes a bot challenge before the tool is served,
     * so an automated browser never reaches the page and acceptance test 14
     * cannot be run from automation at this address at all.
     *
     * It is also a finding about the CLAIM and not only about the test. The
     * challenge itself contacts a third party, so a visitor who is challenged
     * has already made requests to it before any part of this tool exists. The
     * tool still asks for nothing, which is what C1-NF-01 is about; "no data is
     * transmitted", unqualified, is a broader statement than the tool can make
     * about an address it does not control.
     *
     * This is the beacon of docs/correspondence.md §I.1 in its other form. That
     * one was a host inserting a request into the response; this is a host
     * inserting an entire page. Neither is visible in the build, which is why
     * this script exists and why it must say so rather than fail obscurely.
     */
    console.error(`\ncheck-network: ${origin} is behind a bot challenge`)
    console.error(`  served "${servedTitle}" instead of the tool`)
    const challengeHosts = [...new Set(requests.filter((r) => !isOwn(r.url)).map((r) => new URL(r.url).host))]
    console.error(`  the challenge contacted: ${challengeHosts.join(', ') || 'nothing recorded'}`)
    console.error('\n  ACCEPTANCE TEST 14: CANNOT RUN HERE.')
    console.error('  Not a pass and not a failure of the claim. An automated browser is')
    console.error('  served the challenge, so the tool is never reached and nothing about')
    console.error('  it is observed.')
    console.error('\n  Two things follow, and the second is not about this script:')
    console.error('    1. Test 14 needs the challenge lifted for this path, or a session')
    console.error('       that satisfies it. Decide which before relying on the result.')
    console.error('    2. A visitor who IS challenged contacts the challenge host before')
    console.error('       the tool loads. The tool still asks for nothing. Whether the')
    console.error('       footer may say "no data is transmitted" at an address that does')
    console.error('       is a question about the claim, not about the code.')
    process.exit(2)
  }

  console.error(`\ncheck-network: ${origin} is serving a different page`)
  console.error(`  expected a title containing "${TOOL_NAME}", got "${servedTitle}"`)
  console.error('\n  ACCEPTANCE TEST 14: NOT RUN.')
  console.error('  The address is reachable and is not this tool, so the tool is not')
  console.error('  deployed there yet.')
  process.exit(2)
}

// Exercise the tool, because a request can be triggered by use rather than by
// load: an autocomplete lookup, a telemetry ping on submit.
await page.fill('#entered', '1')
await page.selectOption('#enteredunit', 'mg/mL')
await page.fill('#mw', '150')
await page.selectOption('#mwunit', 'kDa')
await page.selectOption('#prov', 'certificate-of-analysis')
await page.check('input[name="massBasis"][value="assembled"]')
await page.waitForTimeout(400)

const result = (await page.textContent('.result-value'))?.trim() ?? ''
if (!result.startsWith('6.66667')) {
  failures.push(`the reference case did not return 6.66667 µM in a real browser; got "${result}"`)
}

// C1-NF-03: inputs and result fit one screen without scrolling on a standard
// laptop display.
await page.setViewportSize(VIEWPORT)
await page.waitForTimeout(150)
const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
if (overflows) failures.push('the page scrolls horizontally at 1440px')

/*
 * C1-NF-03 again, on the worst case rather than the happy one.
 *
 * The clean case fits trivially. The case that decides the requirement is the
 * one raising the most flags at once, an implausible weight, a concentration
 * below the working range, and both declarations unrecorded; because every
 * flag adds a paragraph to the column that has to fit. Measuring only the
 * negative control would let the layout regress without anything noticing,
 * which is the same shape of gap C1-FX-09 exists to close in the fixture set.
 */
await page.fill('#entered', '0.0000000001')
await page.selectOption('#enteredunit', 'mg/mL')
await page.fill('#mw', '0.5')
await page.selectOption('#mwunit', 'kDa')
await page.selectOption('#prov', 'not-recorded')
await page.check('input[name="massBasis"][value="not-recorded"]')
await page.waitForTimeout(250)

/*
 * The worst case gained a fifth flag at v0.2.0 and the measurement has to
 * follow it. C1-FL-09 fires on a result computed from declarations carried
 * across a direction switch, so reaching the true worst case now means driving
 * the switch rather than filling the form once.
 */
await page.click('.directions button:has-text("molar → mass")')
await page.waitForTimeout(150)
await page.fill('#entered', '0.0001')
await page.selectOption('#enteredunit', 'pM')
await page.waitForTimeout(250)

const flagCount = await page.locator('.flag').count()
if (flagCount < 5) failures.push(`the worst case raised ${flagCount} flags, expected at least 5`)

const measure = async ({ window: label, width, height }) => {
  await page.setViewportSize({ width, height })
  await page.waitForTimeout(120)
  /*
   * BOTH numbers, because confusing them is how this went unrecorded.
   *
   * The converter's HEIGHT is about 180px less than its BOTTOM, since the
   * shared masthead and the page padding sit above it. A reviewer measuring
   * height against viewport concluded a clean result fits at 1440x900 with room
   * to spare; measured as a bottom edge it overflows by 71px. "Fits one screen
   * without scrolling" is a statement about the bottom edge, so both are
   * printed and the one that answers the requirement is named.
   */
  const box = await page.evaluate(() => {
    const el = document.querySelector('main.converter')
    if (!el) return { bottom: Infinity, height: Infinity }
    const r = el.getBoundingClientRect()
    return { bottom: Math.round(r.bottom), height: Math.round(r.height) }
  })
  return { label, height, bottom: box.bottom, boxHeight: box.height, over: box.bottom - height }
}

const measurements = []
for (const candidate of VIEWPORT_CANDIDATES) measurements.push(await measure(candidate))
await page.setViewportSize(VIEWPORT)

console.log(`\n  C1-NF-03: worst case, ${flagCount} flags`)
for (const m of measurements) {
  const verdict = m.over <= 0 ? `fits, ${-m.over}px spare` : `over by ${m.over}`
  console.log(
    `    window ${m.label}  viewport ${m.height}px  converter bottom ${m.bottom}px (height ${m.boxHeight}px)  ${verdict}`,
  )
}
console.log('    (identical converter heights: .wrap caps content at 1120px, so all three')
console.log('     candidates differ in available height only, not in wrapping)')
console.log('    C1-NF-03 IS NOT MET, and is declared as an accepted deviation in')
console.log('    the constants register on the page rather than left as an unwritten')
console.log('    shortfall. The supported display is still undecided (open item 15),')
console.log('    so there is no standard to fail against; what is reported is the')
console.log('    measurement and the fact that the requirement is unmet.')
console.log('    Not compacted: a layout that fits only because the type got smaller')
console.log('    fails again on the next flag.')

// C1-ST-02: nothing persists across a reload unless its persistence is visible.
const stored = await page.evaluate(() => ({
  local: Object.keys(localStorage).length,
  session: Object.keys(sessionStorage).length,
  cookies: document.cookie.length,
}))
if (stored.local || stored.session || stored.cookies) {
  failures.push(`C1-ST-02: browser storage is not empty after use: ${JSON.stringify(stored)}`)
}

// §9 and §11 must be at the tool's own address, not only in documentation.
const bodyText = (await page.textContent('body')) ?? ''
for (const required of [
  'cannot detect',
  'Constants register',
  'Research use',
  'significant figures',
  'not of binding sites',
]) {
  if (!bodyText.includes(required)) failures.push(`the page does not state: "${required}"`)
}

await browser.close()
if (server) server.close()

/*
 * The claim-versus-evidence gate. Not about this run's requests at all: it is
 * about whether the page is allowed to say what it says.
 */
if (NETWORK_CLAIM_VERIFIED && !target) {
  failures.push(
    'NETWORK_CLAIM_VERIFIED is true in src/lib/site.ts, so the footer asserts no network request ' +
      'of any kind: but this run was a LOCAL SERVER over dist/, which cannot establish it. ' +
      'Set the flag only after this script passes against the deployed address.',
  )
}

const external = requests.filter((r) => !isOwn(r.url))
console.log(`\ncheck-network: ${origin}`)
console.log(`  requests observed: ${requests.length} (monitoring armed before navigation)`)
for (const r of requests) console.log(`    ${isOwn(r.url) ? 'own     ' : 'EXTERNAL'} ${r.method} ${r.type.padEnd(10)} ${r.url}`)

if (external.length) {
  failures.unshift(`${external.length} request(s) to another origin: ${external.map((r) => r.url).join(', ')}`)
}

if (failures.length) {
  console.error('\ncheck-network FAILED')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}

if (target) {
  console.log('\nACCEPTANCE TEST 14: PASSED')
  console.log(`  Verified in a real browser against ${origin}, monitoring initialised before page load.`)
  console.log('  Re-run after any deployment or CDN configuration change.')
  if (!NETWORK_CLAIM_VERIFIED) {
    console.log('\n  The footer currently states the WEAKER claim, because')
    console.log('  NETWORK_CLAIM_VERIFIED is false in src/lib/site.ts.')
    console.log('  This run is the evidence that permits the stronger one:')
    console.log('  set the flag to true, rebuild, redeploy, and re-run this against')
    console.log('  the deployed address so the claim and the evidence ship together.')
  }
} else {
  // A local run is NOT a pass and must not be logged as one.
  //
  // The failure mode this test exists to catch is a host or CDN injecting a
  // request into the response - conditionally on request characteristics, so
  // not necessarily on every request, and invisible anywhere but the deployed
  // address. Two previous failures of this claim were exactly that. A local
  // server over dist/ cannot see any of it, so what a local run establishes is
  // that the INSTRUMENT works and that the build is clean. That is a
  // precondition for the test, not the test.
  console.log('\nInstrument verified against the local build. No request left the origin.')
  console.log('\n  ACCEPTANCE TEST 14: UNRUN.')
  console.log('  This was a LOCAL SERVER over dist/, and the URS is explicit that')
  console.log('  verification against the build artefact does not satisfy the test.')
  console.log('  A CDN can inject conditionally on request characteristics; that is')
  console.log('  invisible anywhere but the deployed address.')
  console.log(`\n      node scripts/check-network.mjs ${DEPLOYED_URL ?? 'https://<deployed-address>/'}`)
  console.log('      (or: npm run check:deployed)')
  console.log('\n  Open item 5 is CLOSED: the slug is decided and the address above is')
  console.log('  composed from src/lib/site.ts rather than typed here. What remains is')
  console.log('  the deploy, and then this command.')
}
