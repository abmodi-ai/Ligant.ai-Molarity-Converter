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
