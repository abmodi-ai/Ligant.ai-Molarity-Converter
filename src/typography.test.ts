import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * No em dashes, anywhere in the project.
 *
 * A house rule rather than a URS requirement: the audience is a scientific one,
 * and the em dash is a rhetorical mark that reads as editorial voice. The
 * punctuation it stood for is still available, and is usually more precise
 * about the relationship between the two halves: a colon introduces, a
 * semicolon joins, a comma sets aside.
 *
 * WHY THIS IS A TEST AND NOT A STYLE NOTE. There were 624 of them across the
 * project when the rule was set, put there one at a time by someone who writes
 * with them by habit. A style note is an audit: performed once, by whoever is
 * looking, and passing silently thereafter. The same reasoning as C1-FX-11.
 *
 * EN DASHES ARE KEPT and are deliberately not matched here. They are the
 * correct mark for a numeric or coupled range, and the project uses them that
 * way throughout: 1 to 1000 kDa, sections 3 to 14, IgM-PE with an en dash
 * between the two names. Removing them would cost precision rather than
 * rhetoric.
 */

/** Built rather than written, so this file does not fail its own check. */
const EM_DASH = String.fromCharCode(0x2014)

const ROOTS = ['src', 'scripts', 'docs', 'reference']

/**
 * URS v0.5 is excluded, and the exclusion is the interesting part.
 *
 * It is approved at specification level (NADIRA, 3 September 2026) and is the
 * authority this build is held to. Its punctuation is hers. Rewriting 42 lines
 * of a controlled document to satisfy a house rule set afterwards would be a
 * silent amendment to an approved specification, which is a worse defect than
 * the punctuation.
 *
 * The rule therefore applies to the project's own text and from v0.6 onward.
 * v0.6 is a draft, is swept, and carries the two strings v0.5 specifies
 * verbatim: C1-MW-07's conjugate option label and the retention badge. Those
 * two need NADIRA's agreement rather than a find-and-replace, because the tool
 * and the specification now differ on them.
 */
const EXCLUDED = ['docs/molarity-converter-urs-v0.5.md']
const LOOSE_FILES = ['README.md', 'index.html', 'package.json']
const EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js', '.py', '.css', '.md', '.json', '.html', '.svg']

function projectFiles(): string[] {
  const found: string[] = [...LOOSE_FILES]
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (EXTENSIONS.includes(extname(path)) && !EXCLUDED.includes(path)) found.push(path)
    }
  }
  for (const root of ROOTS) walk(root)
  return found
}

describe('house rule: no em dashes', () => {
  it('no source file, script, document or asset contains one', () => {
    const offenders: string[] = []
    for (const path of projectFiles()) {
      let text: string
      try {
        text = readFileSync(path, 'utf8')
      } catch {
        continue
      }
      text.split('\n').forEach((line, i) => {
        if (line.includes(EM_DASH)) offenders.push(`${path}:${i + 1}  ${line.trim().slice(0, 70)}`)
      })
    }
    expect(offenders, `em dashes found:\n${offenders.join('\n')}`).toEqual([])
  })

  it('the check is capable of failing', () => {
    // The guard on the guard. A test that scans for a character it can never
    // find passes for the same reason whether the rule holds or not, and this
    // one runs over a file list that a bad glob could quietly empty.
    const files = projectFiles()
    expect(files.length).toBeGreaterThan(30)
    expect(files.some((f) => f.endsWith('README.md'))).toBe(true)
    expect(files.some((f) => f.startsWith('docs/'))).toBe(true)
    expect(files.some((f) => f.endsWith('.tsx'))).toBe(true)
    expect(`a ${EM_DASH} b`.includes(EM_DASH)).toBe(true)
  })

  it('the approved specification is excluded, and is excluded deliberately', () => {
    // If this ever passes because v0.5 was swept after all, the exclusion has
    // stopped meaning anything and the amendment happened without being noticed.
    expect(projectFiles()).not.toContain(EXCLUDED[0])
    expect(readFileSync(EXCLUDED[0], 'utf8').includes(EM_DASH)).toBe(true)
  })

  it('en dashes are untouched, because a range is not a rhetorical pause', () => {
    const readme = readFileSync('README.md', 'utf8')
    const tokens = readFileSync('src/lib/flags.ts', 'utf8')
    expect(readme.includes(String.fromCharCode(0x2013)) || tokens.includes(String.fromCharCode(0x2013))).toBe(true)
  })
})
