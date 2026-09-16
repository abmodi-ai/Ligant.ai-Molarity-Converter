/**
 * The single place the tool's own identity is defined.
 *
 * `scripts/check-privacy.mjs` and `scripts/check-network.mjs` read SITE_URL from
 * here textually, so that neither carries its own copy of what counts as this
 * tool's own origin. Our own origin is not a third party; every other one is.
 *
 * The slug was open item 5 and is DECIDED: `molarity-converter`, 11 September
 * 2026. It becomes citable at preprint submission, so it is written once and
 * referenced, not repeated across metadata, the footer and the checks.
 *
 * `TOOL_PATH` had held the intended value all along and was referenced by
 * nothing, which is how a placeholder and a decision come to look identical in
 * a file. `DEPLOYED_URL` below is composed from it, and `check-network.mjs`
 * reads it rather than being handed an address, so acceptance test 14 is aimed
 * by this file.
 */
export const SITE_URL = 'https://benchtools.ligant.ai'
export const TOOL_PATH = '/molarity-converter/'

/** The one address acceptance test 14 is about. */
export const DEPLOYED_URL = `${SITE_URL}${TOOL_PATH}`
export const TOOL_NAME = 'Molarity Converter for Biologics'
export const TOOL_ID = 'C1'
export const URS_VERSION = '0.5'
export const REPO_URL = 'https://github.com/abmodi-ai/Ligant.ai-Molarity-Converter'

/** The parent site, one level up from the suite. Not `SITE_URL`: that is the
 *  Bench Tools suite's own address, this is Ligant's. */
export const LIGANT_URL = 'https://ligant.ai/'

export interface Tool {
  id: string
  /** Label in the masthead's tool navigation. */
  name: string
  /** Path from the site root, always with a trailing slash. */
  path: string
}

/**
 * The suite, as the masthead's tool navigation presents it.
 *
 * The same three entries, in the same order and with the same labels, as the
 * Antibody Titration Planner's `TOOLS` as deployed on 16 September 2026, so
 * the navigation reads identically whichever tool the reader is on. A change
 * here belongs in that list too. Add a tool only once it is live at `path`:
 * a pill that 404s is worse than a tool the navigation does not mention yet.
 *
 * The entry whose `path` is this tool's `TOOL_PATH` renders as the current
 * page rather than as a link.
 */
export const TOOLS: readonly Tool[] = [
  { id: 'antibody-titration', name: 'Antibody titration', path: '/antibody-titration-planner/' },
  { id: 'molarity', name: 'Molarity', path: '/molarity-converter/' },
  { id: 'antigen-density', name: 'Antigen density', path: '/antigen-density-calculator/' },
]

/**
 * Absolute URL for a path within the suite.
 *
 * ABSOLUTE, NOT ROOT-RELATIVE. This page is reachable at the suite's address
 * and at its own `*.pages.dev` origin, and on the latter `/antibody-titration-
 * planner/` does not exist: it is another project. Pinning every suite link to
 * `SITE_URL` makes them work from either.
 */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * The released version, cited in the footer and in CITATION.cff.
 *
 * Matches `package.json`'s version with a leading `v`, the same convention
 * the reference tool uses: the tag, the citation and the footer are one
 * string rather than three conventions for one version. `scripts/check-
 * citation.mjs` holds `package.json`, `CITATION.cff` and this file together
 * so a release that bumps one and not the others fails the build instead of
 * shipping a footer that disagrees with its own citation.
 */
export const APP_VERSION = 'v0.1.1'

/**
 * The year the citation carries. Fixed, not derived from the clock, so the
 * page renders the same for every reader and for every build.
 */
export const RELEASE_YEAR = 2026

/**
 * The Zenodo concept DOI for this software: the one that always resolves to
 * the newest archived version, and the one a software citation should carry.
 *
 * Minted 14 September 2026, when the `v0.1.0` GitHub release was archived.
 * `10.5281/zenodo.22750472` is the version DOI for that specific release,
 * recorded in `CITATION.cff`'s `identifiers` block rather than here, on the
 * same distinction the reference tool's `site.ts` draws for its own two
 * DOIs: a reader of software wants whatever version is current, so this is
 * the concept DOI, not the version DOI.
 */
export const CITATION_DOI: string | null = '10.5281/zenodo.22750471'

/**
 * Whether acceptance test 14 has been run against the DEPLOYED address.
 *
 * The footer used to assert "no network request of any kind" unconditionally.
 * That is an environment claim about the served page, and acceptance test 14;
 * the only thing that can establish it, is unrun. A local server over `dist/`
 * cannot exercise the CDN path, which is what produced both previous failures
 * of this claim across the tool set.
 *
 * So the strong claim is gated on this flag, and the flag is a deployment step,
 * not a build step:
 *
 *   1. Deploy.
 *   2. `node scripts/check-network.mjs https://<deployed-address>/`: this must
 *      print ACCEPTANCE TEST 14: PASSED.
 *   3. Only then set this to `true`, and redeploy.
 *
 * `scripts/check-network.mjs` enforces the pairing in the other direction: if
 * this is `true` and the run is local, the check FAILS, so the claim cannot go
 * live on the strength of a local run.
 *
 * Until then the footer states what is actually established, a static check
 * and a real browser against the build, and says the deployed address is
 * unverified. An accurate weaker claim is worth more than an unverified
 * stronger one; that is the whole finding of the beacon incident.
 *
 * DELIBERATELY NOT A CONSTANTS_REGISTER ROW, and the reasoning is recorded here
 * because "nobody looked" is not an acceptable answer to it.
 *
 * The register exists so that no behaviour-determining choice is silent, and it
 * already carries two rows that are not thresholds, the rounding mode and the
 * reimplementation tolerance, so "it is a boolean, not a threshold" is not on
 * its own a reason to leave it out. The reason is that this choice is not
 * silent anywhere: it determines what the FOOTER says, and the footer says
 * which of the two claims it is making and that acceptance test 14 is unrun.
 * The disclosure and the behaviour are the same sentence. A register row would
 * restate on one part of the page what another part of the page already says in
 * full, and §11's rows are for choices whose effect is otherwise invisible.
 *
 * It is also not a property of the conversion. Every register row is something
 * the engine applies to a number; this is a statement about the deployment.
 * Revisit if the flag ever gates anything computed.
 *
 * Since 11 September 2026 the register is no longer on the page at all (see
 * `CONSTANTS_REGISTER`), so "restate on one part of the page" no longer
 * applies. The conclusion stands on the rest: the footer states the claim and
 * its evidence in full, and this is not a property of the conversion.
 */
export const NETWORK_CLAIM_VERIFIED = false
