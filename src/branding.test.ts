import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The rule that keeps the suite one product: C1 introduces no colour of its own.
 *
 * C1 passed a conformance audit at 46 of 53 requirements while sharing no
 * design token with the shipped tool. It got there one plausible hex value at a
 * time — a slightly different off-white, a slightly different rule colour, a
 * navy where the accent should have been — and none of them was a mistake on
 * its own.
 *
 * So the guard is on the source, not on the rendered page. `check-ui.mjs`
 * asserts what the browser computes, which catches the tokens being wrong;
 * this catches a value being introduced that bypasses them at all, which is how
 * the divergence actually happened.
 */

const TOKENS = readFileSync('src/tokens.css', 'utf8')
const STYLES = readFileSync('src/styles.css', 'utf8')
const BRAND = readFileSync('src/Brand.tsx', 'utf8')

/** Comments legitimately quote the old values; strip before matching. */
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const stripTsComments = (ts: string) => ts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('the shared token set is the only source of colour', () => {
  it("C1's stylesheet declares no colour literal of its own", () => {
    const css = stripCssComments(STYLES)
    const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    const functional = css.match(/\b(rgb|rgba|hsl|hsla|color|oklch|lab)\s*\(/g) ?? []
    expect(hexes, `styles.css introduces ${hexes.join(', ')} — use a token from tokens.css`).toEqual([])
    expect(functional, 'styles.css builds a colour rather than consuming one').toEqual([])
  })

  it('the mark is filled from tokens, so it cannot drift from the palette', () => {
    const tsx = stripTsComments(BRAND)
    const hexes = tsx.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    expect(hexes, `Brand.tsx hard-codes ${hexes.join(', ')}`).toEqual([])
    expect(tsx).toMatch(/fill="var\(--brand-teal\)"/)
    expect(tsx).toMatch(/fill="var\(--brand-amber-mark\)"/)
  })

  it('every token C1 defines resolves to a shared one', () => {
    // C1's semantic layer may name things the suite has no word for —
    // `--retained`, `--flag`, `--reject` — but each has to be defined in terms
    // of a brand token rather than as a new value.
    const root = stripCssComments(STYLES).match(/:root\s*\{([\s\S]*?)\}/)
    expect(root, 'styles.css has no :root block').not.toBeNull()
    const declarations = root![1]
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d.startsWith('--'))
    expect(declarations.length).toBeGreaterThan(8)
    for (const d of declarations) {
      const [name, value] = d.split(/:(.+)/)
      expect(value?.trim(), `${name.trim()} is not defined in terms of a shared token`).toMatch(/var\(--|calc\(/)
    }
  })
})

describe('the token file is the reference tool\'s, copied whole', () => {
  it('carries the brand, neutral, surface, text, shape and type tokens the suite defines', () => {
    // Named individually rather than counted: a count passes for exactly as
    // long as it takes someone to drop one row and add another.
    for (const token of [
      '--brand-navy',
      '--brand-teal',
      '--brand-teal-pale',
      '--brand-amber',
      '--brand-amber-mark',
      '--brand-offwhite',
      '--brand-error',
      '--neutral-900',
      '--neutral-700',
      '--neutral-500',
      '--neutral-300',
      '--neutral-200',
      '--surface',
      '--page',
      '--border',
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--text-caption',
      '--radius',
      '--radius-sm',
      '--font',
      '--mono',
    ]) {
      expect(TOKENS, `tokens.css is missing ${token}`).toContain(`${token}:`)
    }
  })

  it('names Inter and IBM Plex Mono without fetching either', () => {
    // C1-NF-01. The faces are declared first in the stack and fall back to the
    // system, exactly as the reference does. A font CDN would be a third-party
    // request and would break the claim outright.
    expect(TOKENS).toMatch(/--font:\s*"Inter"/)
    expect(TOKENS).toMatch(/--mono:\s*"IBM Plex Mono"/)
    expect(TOKENS).not.toMatch(/@font-face|@import|url\(/)
  })

  it('the accent is teal and the text is navy, not both navy', () => {
    // The mismatch that mattered most: C1 used navy for text AND action, so it
    // had no accent at all.
    expect(TOKENS).toMatch(/--brand-teal:\s*#0D7C66/i)
    expect(TOKENS).toMatch(/--text-primary:\s*var\(--brand-navy\)/)
    expect(stripCssComments(STYLES)).toMatch(/--accent:\s*var\(--brand-teal\)/)
  })
})
