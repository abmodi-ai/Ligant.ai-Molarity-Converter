/**
 * Ligant Bench Tools — shared chrome: the mark, the masthead, the footer.
 *
 * SHARED, NOT C1's, on the same terms as `tokens.css`: this should be one
 * component in a package that both tools depend on, and it sits in C1's tree
 * only because that package does not exist yet. Two implementations of a
 * masthead is how the suite ends up with two identities.
 *
 * Read from the Antigen Density Calculator as deployed on 4 September 2026:
 * the mark geometry, the lockup, the `Bench Tools` treatment and the footer's
 * three paragraphs are the reference's, not reinvented here.
 */

import type { ReactNode } from 'react'

/**
 * The Ligant mark. A hexagonal node figure, six vertices and a centre.
 *
 * Geometry is the reference's, to three decimal places. The fills are brand
 * tokens rather than literals so the mark cannot drift from the palette, and
 * `stroke-width` scales with the rendered size the way the reference's does —
 * 1.7 in the masthead at 28px, 2 in the favicon at 32px.
 *
 * NOT LETTERED AND NOT RECOLOURED PER TOOL. A per-tool mark fragments the
 * suite identity across a row of browser tabs, which is the one surface where
 * it has to hold.
 */
export function LigantMark({ size = 28, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Ligant"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <title>Ligant</title>
      <rect width="32" height="32" rx="7.04" fill="var(--brand-teal)" />
      <path
        d="M16.000,6.800 L23.967,11.400 L23.967,20.600 L16.000,25.200 L8.033,20.600 L8.033,11.400 Z"
        fill="none"
        stroke="var(--brand-offwhite)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {[
        [16, 6.8],
        [23.967, 11.4],
        [23.967, 20.6],
        [16, 25.2],
        [8.033, 20.6],
        [8.033, 11.4],
      ].map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="2.1" fill="var(--brand-offwhite)" />
      ))}
      <circle cx="16" cy="16" r="3.6" fill="var(--brand-amber-mark)" />
    </svg>
  )
}

/**
 * The masthead: lockup and tool name at left, suite label at right.
 *
 * `meta` is C1's addition — the tool id and the URS version it was built
 * against. The reference has no equivalent, so it is set as caption text under
 * the suite label rather than placed on the H1 line, which is the reference's
 * and is left alone.
 */
export function SiteHeader({ tool, description, meta }: { tool: string; description: string; meta?: ReactNode }) {
  return (
    <header className="masthead">
      <div>
        <span className="lockup">
          <LigantMark />
          <span className="wordmark">Ligant</span>
        </span>
        <h1>{tool}</h1>
        <p>{description}</p>
      </div>
      <div className="suite">
        <span className="eyebrow suite-mark">Bench Tools</span>
        {meta && <span className="suite-meta">{meta}</span>}
      </div>
    </header>
  )
}

/**
 * What a tool is entitled to say about data leaving the browser.
 *
 * THIS IS THE RESOLUTION OF THE CLAIM-GATE CONFLICT, and it belongs here
 * rather than in C1.
 *
 * The reference footer states "no data is transmitted" unconditionally. That is
 * an environment claim about the SERVED page, and the only thing that can
 * establish it is a real browser against the deployed address — C1's acceptance
 * test 14. A shared footer that hard-codes the strong sentence is a mechanism
 * for reintroducing exactly the failure that test exists to catch: the beacon
 * incident was a host inserting a request into a response that every
 * build-level check called clean.
 *
 * So the claim is not a string in this component. It is a REQUIRED parameter
 * with two variants, and there is no default. A tool cannot render the footer
 * without saying which evidence state it is in, and a tool with no evidence
 * cannot accidentally inherit the sentence belonging to one that has it.
 *
 * C1 does not opt out of the shared footer; the shared footer stopped being
 * able to make an unearned claim. The reference tool should adopt this
 * component and supply its own evidence state — its footer is currently
 * ungated, which is the same finding pointing the other way.
 */
export type TransmissionEvidence =
  /** Verified in a real browser AT THIS ADDRESS. C1: acceptance test 14 passed. */
  | { verifiedAtThisAddress: true }
  /** Not verified at this address. `outstanding` says what is missing, on the page. */
  | { verifiedAtThisAddress: false; outstanding: string }

export function SiteFooter({
  repoUrl,
  transmission,
  children,
}: {
  repoUrl: string
  /** Required. There is deliberately no default — see TransmissionEvidence. */
  transmission: TransmissionEvidence
  /** Tool-specific lines, after the shared three. */
  children?: ReactNode
}) {
  const repoLabel = repoUrl.replace(/^https?:\/\//, '')
  return (
    <footer className="site">
      <p>
        Ligant Bench Tools are free and open source under Apache 2.0, for research and educational
        use. They run entirely in your browser.{' '}
        {transmission.verifiedAtThisAddress ? (
          <>No data is transmitted, verified in a real browser at this address.</>
        ) : (
          <>
            This build contains no network primitive and issues no request — verified statically and
            in a real browser against the build. <strong>Not yet verified at this address:</strong>{' '}
            {transmission.outstanding}
          </>
        )}
      </p>
      <p>
        Every number on this page comes from code you can read, download or run yourself, at{' '}
        <a href={repoUrl}>{repoLabel}</a>. Clone it and <code>npm run dev</code> for a local copy.
      </p>
      <p>
        These tools are standalone calculators. Ligant's enterprise platform adds reference
        databases, connected agentic workflows, on-premise language models, and full GxP validation.
        If your lab needs that, please email us <a href="mailto:hello@ligant.ai">hello@ligant.ai</a>.
      </p>
      {children}
    </footer>
  )
}
