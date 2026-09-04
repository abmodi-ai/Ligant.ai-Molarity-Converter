/**
 * The static half of the C1-NF-01 proof.
 *
 * Fails the build if anything could contact a third party. Three rules:
 *   1. index.html loads nothing from an external URL.
 *   2. Application source contains no network primitive.
 *   3. The built bundle embeds no external URL, apart from inert identifiers
 *      such as XML namespaces and our own origin.
 *
 * This is necessary and NOT sufficient. String scanning cannot establish what a
 * browser actually requests — the two previous failures of this claim were both
 * CDN defaults invisible in the artefact. scripts/check-network.mjs is the
 * runtime half, and acceptance test 14 is that script run against the deployed
 * address.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

const failures = []
const fail = (rule, detail) => failures.push(`  [${rule}] ${detail}`)

/** Our own origin is not a third party. Read from the one module that defines it. */
const SITE_URL = (readFileSync('src/lib/site.ts', 'utf8').match(/SITE_URL\s*=\s*['"]([^'"]+)['"]/) ?? [])[1]
const REPO_URL = (readFileSync('src/lib/site.ts', 'utf8').match(/REPO_URL\s*=\s*['"]([^'"]+)['"]/) ?? [])[1]
if (!SITE_URL) fail('config', 'could not read SITE_URL from src/lib/site.ts')

// --- Rule 1: index.html loads nothing external -----------------------------
const html = readFileSync('index.html', 'utf8')
for (const [, attr, url] of html.matchAll(/\b(src|href)\s*=\s*["']([^"']+)["']/g)) {
  if (/^(https?:)?\/\//i.test(url)) fail('rule 1', `index.html loads ${attr}="${url}"`)
}
// A preconnect or dns-prefetch is a network request even without a resource.
for (const [, rel] of html.matchAll(/rel\s*=\s*["']([^"']+)["']/g)) {
  if (/preconnect|dns-prefetch|prefetch|preload/i.test(rel)) fail('rule 1', `index.html declares rel="${rel}"`)
}

// --- Rule 2: no network primitive in application source --------------------
const PRIMITIVES = [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /\bnavigator\.sendBeacon\b/,
  /\bnew\s+WebSocket\b/,
  /\bnew\s+EventSource\b/,
  /\bimportScripts\s*\(/,
  /\bnavigator\.geolocation\b/,
]
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) { walk(path); continue }
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(extname(path))) continue
    if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) continue
    const text = readFileSync(path, 'utf8')
    // Comments discuss these by name; strip before matching.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const p of PRIMITIVES) if (p.test(code)) fail('rule 2', `${path} contains ${p}`)
  }
}
walk('src')

// --- Rule 3: the built bundle embeds no external URL -----------------------
const ALLOWED = [
  'http://www.w3.org/',       // XML namespaces; inert, never requested
  'https://www.w3.org/',
  SITE_URL,
  REPO_URL,
  // React's minified-error decoder. Verified inert by reading the bundle: the
  // only use is
  //   function w(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e, ...)
  //     return "Minified React error #"+e+"; visit "+t+" for the full message"}
  // which concatenates the URL into an Error's message string. Nothing fetches
  // it, and no element carries it as an attribute. Allowlisted by exact prefix
  // rather than by host, so a future React build that actually requested
  // something from that origin would still fail this rule.
  //
  // This entry is why the runtime check exists: an allowlist is a judgement
  // about a string, and only the browser can settle what is requested.
  'https://reactjs.org/docs/error-decoder.html?invariant=',
].filter(Boolean)

if (!existsSync('dist')) {
  fail('rule 3', 'dist/ not found — run `npm run build` before this check')
} else {
  const bundles = []
  ;(function collect(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) collect(path)
      else if (['.js', '.css', '.html'].includes(extname(path))) bundles.push(path)
    }
  })('dist')

  for (const path of bundles) {
    const text = readFileSync(path, 'utf8')
    for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)\\]+/g)) {
      if (!ALLOWED.some((a) => url.startsWith(a))) fail('rule 3', `${path} embeds ${url}`)
    }
  }
}

if (failures.length) {
  console.error('check-privacy FAILED\n' + failures.join('\n'))
  process.exit(1)
}
console.log('check-privacy passed — no external resource, no network primitive, no embedded third-party URL.')
console.log('  This is the STATIC half only. Acceptance test 14 requires scripts/check-network.mjs against the deployed address.')
