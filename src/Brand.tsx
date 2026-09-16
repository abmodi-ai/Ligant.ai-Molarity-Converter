/**
 * Ligant Bench Tools: shared chrome: the mark, the masthead, the footer.
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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  APP_VERSION,
  BENCH_TOOLS,
  CATALOG_URL,
  CITATION_DOI,
  DEPLOYED_URL,
  RELEASE_YEAR,
  REPO_URL,
  SITE_URL,
} from './lib/site'

/**
 * The Ligant mark. A hexagonal node figure, six vertices and a centre.
 *
 * Geometry is the reference's, to three decimal places. The fills are brand
 * tokens rather than literals so the mark cannot drift from the palette, and
 * `stroke-width` scales with the rendered size the way the reference's does,
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
 * The suite label, made into navigation: which other Bench Tools exist, and
 * a way to reach them without going back to the catalog to search.
 *
 * NEW, C1's addition; the reference masthead's "Bench Tools" label is
 * currently inert text. This turns the label itself into the trigger rather
 * than adding a second control beside it, so the masthead's footprint does
 * not grow.
 *
 * `current` is matched against `BENCH_TOOLS[].name` (see lib/site.ts) and
 * rendered as plain text, not a link: the one thing worse than no link to a
 * tool is a link back to the page already open, which reloads state the
 * §C1-ST-02 "nothing persisted" design cannot restore.
 */
function ToolSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="tool-switcher" ref={ref}>
      <button
        type="button"
        className="eyebrow suite-mark tool-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Bench Tools
        <svg className="tool-switcher-caret" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <path
            d="M1 2.5 L4 5.5 L7 2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="tool-switcher-menu" role="menu">
          {BENCH_TOOLS.map((t) =>
            t.name === current ? (
              <span key={t.name} className="tool-switcher-current" role="menuitem" aria-current="page">
                {t.name}
              </span>
            ) : (
              <a key={t.name} className="tool-switcher-item" role="menuitem" href={`${SITE_URL}${t.path}`}>
                {t.name}
              </a>
            ),
          )}
          <a className="tool-switcher-all" role="menuitem" href={CATALOG_URL}>
            All Bench Tools
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * The masthead: lockup and tool name at left, suite label at right.
 *
 * `meta` is C1's addition: the tool id and the URS version it was built
 * against. The reference has no equivalent, so it is set as caption text under
 * the suite label rather than placed on the H1 line, which is the reference's
 * and is left alone.
 *
 * `description` is a node rather than a string so a tool can supply more than
 * one paragraph; a string still renders as the single paragraph it always did.
 */
export function SiteHeader({ tool, description, meta }: { tool: string; description: ReactNode; meta?: ReactNode }) {
  return (
    <header className="masthead">
      <div>
        {/* Matches the catalog page's own lockup: `<a class="lockup" href="https://ligant.ai">`. */}
        <a className="lockup" href="https://ligant.ai">
          <LigantMark />
          <span className="wordmark">Ligant</span>
        </a>
        <h1>{tool}</h1>
        {typeof description === 'string' ? <p>{description}</p> : <div className="standfirst">{description}</div>}
      </div>
      <div className="suite">
        <ToolSwitcher current={tool} />
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
 * establish it is a real browser against the deployed address, C1's acceptance
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
 * component and supply its own evidence state, its footer is currently
 * ungated, which is the same finding pointing the other way.
 */
export type TransmissionEvidence =
  /** Verified in a real browser AT THIS ADDRESS. C1: acceptance test 14 passed. */
  | { verifiedAtThisAddress: true }
  /** Not verified at this address. `outstanding` says what is missing, on the page. */
  | { verifiedAtThisAddress: false; outstanding: string }

/**
 * The citation, in three pieces, so what is shown and what is copied cannot
 * differ. Matches the reference tool's SOFTWARE citation exactly; there is no
 * paper behind this tool, so there is no preferred-citation half to add.
 */
const SOFTWARE_TITLE = 'Molarity Converter for Biologics'
const SOFTWARE_LEAD = `Modi, A.B. (${RELEASE_YEAR}). `
const SOFTWARE_TAIL =
  ` (${APP_VERSION}) [Computer software]. Ligant AI Incorporated. ` +
  `${DEPLOYED_URL.replace('https://', '')}` +
  (CITATION_DOI ? ` doi:${CITATION_DOI}` : '')

/**
 * One reference, with a control that takes it in a single action.
 *
 * `copied` is set only once the write resolves, not on click: a claim this
 * page makes about itself should be as accurate as every other one on it.
 */
function CitationRow({ lead, title, tail }: { lead: string; title: string; tail: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(lead + title + tail)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // A browser may refuse clipboard access. The reference is on the page
      // and selectable regardless, so silence is better than an error the
      // reader cannot act on.
    }
  }

  return (
    <div className="footer-citation-row">
      <p>
        {lead}
        <cite>{title}</cite>
        {tail}
      </p>
      <button type="button" onClick={copy} aria-label="Copy the software citation" aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function SiteFooter({
  transmission,
  children,
}: {
  /** Required. There is deliberately no default, see TransmissionEvidence. */
  transmission: TransmissionEvidence
  /** Tool-specific lines, after the shared prose. */
  children?: ReactNode
}) {
  const repoLabel = REPO_URL.replace(/^https?:\/\//, '')
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-prose">
          {/*
            The privacy statement. "never sent anywhere" is the one clause here
            that is an environment claim about THIS served page rather than
            about Ligant's data handling, so it alone carries the
            TransmissionEvidence gate; the sentences around it hold regardless
            of where they're read from and are not conditional on anything.
          */}
          <p>
            Your data stays in your browser. Everything you enter into this tool is calculated
            on your own device and never sent anywhere
            {transmission.verifiedAtThisAddress ? (
              <>, verified in a real browser at this address.</>
            ) : (
              <>
                {' '}in this build, verified statically and in a real browser against the
                build.{' '}
                <strong>Not yet verified at this address:</strong> {transmission.outstanding}
              </>
            )}{' '}
            We do not see it, store it, or have any way to retrieve it. Closing the page ends
            it.
          </p>
          <p>
            There is no account and no tracking of you. No login, no sign up, no cookies for
            advertising, no analytics scripts, and no third-party code of any kind runs on
            this page.
          </p>
          <p>
            We do count visits. Our hosting provider records basic traffic: which pages get
            opened, how often, and roughly where in the world from. Because we collect
            nothing about who you are, this is the only signal we have about whether these
            tools are useful and which one to build next.
          </p>
          <p>
            Every figure on this page comes from code you can read, download or run yourself, at{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {repoLabel}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            . Clone it and <code>npm run dev</code> for a local copy.
          </p>
          <p>
            These tools are standalone calculators. Ligant's enterprise platform adds reference
            databases, connected agentic workflows, on-premise language models, and full GxP
            validation. If your lab needs that, please email us{' '}
            <a href="mailto:hello@ligant.ai">hello@ligant.ai</a>.
          </p>
          <p>Ligant Bench Tools are free and open source, under the licence below.</p>
          {children}
        </div>

        <address className="footer-address">
          <span className="eyebrow">Ligant AI Incorporated</span>
          3675 Market Street
          <br />
          Suite 200
          <br />
          Philadelphia PA 19104
          <br />
          <a href="mailto:hello@ligant.ai">hello@ligant.ai</a>
        </address>
      </div>

      <div className="footer-citation">
        <span className="eyebrow">How to cite</span>
        <p className="footer-citation-note">Cite the software as below.</p>
        <CitationRow lead={SOFTWARE_LEAD} title={SOFTWARE_TITLE} tail={SOFTWARE_TAIL} />
      </div>

      <p className="footer-licence">
        Licensed under the Apache License, Version 2.0. You may obtain a copy of the License in
        the{' '}
        <a href="./LICENSE" target="_blank" rel="noopener">
          <code>LICENSE</code>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>{' '}
        file served with this page and distributed with the source. Unless required by applicable
        law or agreed to in writing, software distributed under the License is distributed on an
        "AS IS" basis, without warranties or conditions of any kind, either express or implied.{' '}
        <strong>Research use only. Not qualified for GxP decision-making.</strong>
      </p>
    </footer>
  )
}
