/**
 * The same claim, in three documents.
 *
 * The tool's footer, CITATION.cff and package.json all state the tool name,
 * author, version, repository and origin. Three copies of one string is three
 * chances to disagree, and the disagreement is silent: nothing fails when
 * they drift, a reader simply finds two citations for one artefact and cannot
 * tell which is right. src/lib/site.ts is the source; the rest are asserted
 * against it.
 *
 * Adapted from the reference tool's own check-citation.mjs. There is no paper
 * behind this tool, so there is no preferred-citation half to hold in step,
 * and README.md is deliberately not a fourth place the version is stated: it
 * is written for a reader who wants none of this detail. If that changes,
 * check it here too rather than trusting it separately.
 *
 * A script rather than a test, for the same reason check-privacy is a
 * script: it reads files from disk, and the application's TypeScript project
 * targets a browser with no node types.
 */

import { readFileSync } from 'node:fs'

const cff = readFileSync('CITATION.cff', 'utf8')
const site = readFileSync('src/lib/site.ts', 'utf8')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const failures = []
const fail = (message) => failures.push(message)

/** A top-level scalar from the CFF document. Enough for the flat fields here. */
const cffField = (name) =>
  (cff.match(new RegExp(`^${name}:\\s*(.+)$`, 'm')) ?? [])[1]?.trim().replace(/^['"]|['"]$/g, '')

/**
 * A string constant from the single module that defines the site's identity.
 *
 * Anchored to an actual `export const NAME = ...` line, not merely to the
 * name appearing anywhere: this file's own prose mentions `TOOL_PATH` and
 * `DEPLOYED_URL` by name in comments ahead of their declarations, and an
 * unanchored search for the name followed eventually by a quote finds
 * whichever quoted assignment comes next in the file, silently.
 */
const siteConst = (name) =>
  (site.match(new RegExp(`^export const ${name}\\s*(?::[^=]*)?=\\s*['"]([^'"]+)['"]`, 'm')) ?? [])[1]

for (const [cffName, siteName] of [
  ['version', 'APP_VERSION'],
  ['repository-code', 'REPO_URL'],
]) {
  const stated = cffField(cffName)
  const actual = siteConst(siteName)
  if (actual === undefined) {
    fail(`could not read ${siteName} from src/lib/site.ts`)
  } else if (stated !== actual) {
    fail(`CITATION.cff says ${cffName}: ${stated ?? '(absent)'}, but ${siteName} is ${actual}`)
  }
}

// DEPLOYED_URL is a template literal, not a quoted string, so it is composed
// here from its two plain-string parts rather than regex-matched directly:
// matching the literal backtick expression is fragile in a way that fails
// silently, by finding some other quoted assignment instead of finding none.
const siteUrl = siteConst('SITE_URL')
const toolPath = siteConst('TOOL_PATH')
const deployedUrl = siteUrl && toolPath ? `${siteUrl}${toolPath}` : undefined
const statedUrl = cffField('url')
if (!deployedUrl) {
  fail('could not read SITE_URL and TOOL_PATH from src/lib/site.ts')
} else if (statedUrl !== deployedUrl) {
  fail(`CITATION.cff says url: ${statedUrl ?? '(absent)'}, but SITE_URL + TOOL_PATH is ${deployedUrl}`)
}

if (!/family-names:\s*Modi/.test(cff) || !/given-names:\s*A\.B\./.test(cff)) {
  fail('CITATION.cff does not name the author the footer names')
}
if (!/affiliation:\s*Ligant AI Incorporated/.test(cff)) {
  fail('CITATION.cff does not name the affiliation the footer names')
}

// The version is stated in two places, not one: CITATION.cff and
// package.json. site.ts's APP_VERSION is the source; both are asserted
// against it, not against each other, so a release that bumps one and not
// the other fails here instead of shipping a footer that disagrees with its
// own package.
const appVersion = siteConst('APP_VERSION')
if (appVersion) {
  // package.json is semver, so it carries no leading v.
  const bare = appVersion.replace(/^v/, '')
  if (pkg.version !== bare) {
    fail(`package.json version is ${pkg.version}, but APP_VERSION is ${appVersion}`)
  }
}

if (cffField('license') !== 'Apache-2.0') {
  fail(`CITATION.cff states the licence as ${cffField('license')}, not Apache-2.0`)
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(cffField('date-released') ?? '')) {
  fail('CITATION.cff has no release date, which the tag must match')
}

/*
 * No DOI is a valid state; a placeholder that looks like one is not. Zenodo
 * has not archived a release yet, so CITATION_DOI is null and CITATION.cff
 * carries no doi field, on purpose: a placeholder can be copied into a
 * reference list before anyone checks it, which is worse than an absent
 * field a reader will notice is missing. The two are held together in
 * whichever state they are in, so a future release that sets one and
 * forgets the other fails here instead of shipping a citation that half
 * resolves.
 */
const citationDoi = siteConst('CITATION_DOI')
const cffDoi = cffField('doi')
if (citationDoi === undefined) {
  if (cffDoi) {
    fail(
      `CITATION.cff states doi: ${cffDoi}, but CITATION_DOI in src/lib/site.ts is null. ` +
        'Set CITATION_DOI once Zenodo mints one, in the same change that adds it here.',
    )
  }
  if (/10\.5281\/zenodo\.0+\b/.test(cff)) {
    fail('CITATION.cff carries a placeholder DOI, which is worse than no DOI')
  }
} else if (cffDoi !== citationDoi) {
  fail(`CITATION.cff says doi: ${cffDoi ?? '(absent)'}, but CITATION_DOI is ${citationDoi}`)
}

if (failures.length > 0) {
  console.error(`Citation check failed with ${failures.length} issue(s):\n`)
  for (const f of failures) console.error('  ' + f)
  console.error('\nThe footer and CITATION.cff must state one citation.')
  process.exit(1)
}

console.log(
  `Citation check passed: CITATION.cff and package.json agree with src/lib/site.ts on version ` +
    `${cffField('version')}${citationDoi ? `, and on DOI ${citationDoi}` : ' (no DOI yet: Zenodo has not archived a release)'}.`,
)
