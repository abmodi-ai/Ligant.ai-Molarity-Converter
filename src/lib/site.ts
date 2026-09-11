/**
 * The single place the tool's own identity is defined.
 *
 * `scripts/check-privacy.mjs` and `scripts/check-network.mjs` read SITE_URL from
 * here textually, so that neither carries its own copy of what counts as this
 * tool's own origin. Our own origin is not a third party; every other one is.
 *
 * The slug is open item 5 and becomes citable at preprint submission, so it is
 * written once and referenced, not repeated across metadata, the footer and the
 * checks.
 */
export const SITE_URL = 'https://benchtools.ligant.ai'
export const TOOL_PATH = '/molarity-converter/'
export const TOOL_NAME = 'Molarity Converter for Biologics'
export const TOOL_ID = 'C1'
export const URS_VERSION = '0.5'
export const REPO_URL = 'https://github.com/abmodi-ai/Ligant.ai-Molarity-Converter'

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
 */
export const NETWORK_CLAIM_VERIFIED = false
