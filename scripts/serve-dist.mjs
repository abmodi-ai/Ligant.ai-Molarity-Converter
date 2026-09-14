/**
 * A static server over `dist/`, shared by the two browser checks.
 *
 * Written once and imported rather than copied, on the same reasoning as
 * `src/lib/site.ts`: two copies of "how this tool is served" drift, and the
 * one that drifts is the one nobody is reading when it matters.
 *
 * It serves the build artefact, not the dev server. `check-network.mjs` needs
 * that because a dev server injects its own client and websocket, and
 * `check-ui.mjs` needs it because the behaviour under test should be the
 * behaviour that ships.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

/** Starts a server over dist/ and resolves to `{ server, origin }`. */
export async function serveDist(port) {
  if (!existsSync('dist')) {
    console.error('dist/ not found: run `npm run build` first.')
    process.exit(1)
  }
  const server = createServer(async (req, res) => {
    let path = req.url.split('?')[0]
    if (path.endsWith('/')) path += 'index.html'
    const file = join('dist', normalize(path).replace(/^(\.\.[/\\])+/, ''))
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  await new Promise((r) => server.listen(port, r))
  return { server, origin: `http://localhost:${port}/` }
}
