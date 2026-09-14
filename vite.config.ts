import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The footer's licence link resolves to this. Emitted from the file at the
 * repository root rather than duplicated into public/, so there is one
 * licence and the served copy cannot drift from the one the repository
 * carries.
 */
function emitLicense(): Plugin {
  return {
    name: 'emit-license',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE',
        source: readFileSync(resolve(__dirname, 'LICENSE'), 'utf8'),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), emitLicense()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
})
