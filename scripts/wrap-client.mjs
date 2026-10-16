/**
 * Wrap the Vite CJS client bundle into the DSH web shell's lazy-CJS plugin
 * registration format.
 *
 * The web shell's module loader executes the served /plugins/<id>/client.js
 * classic script, which must REGISTER — not run — the plugin: a single
 * `window.__ModuleLoader__.load({ id, factory })` call whose factory
 * materializes the module on demand with a host-provided `require`
 * (react, @deepseek-ai/* leaves). The factory body is the CJS bundle
 * verbatim; `module.exports` is the plugin's exports surface
 * (name / inject / apply).
 *
 * The `id` MUST equal the package name (package.json "name"); a mismatch
 * makes the module loader reject the registration. For this package that is
 * `dsh-qq-relay` (directory name = package name = client registration id).
 *
 * Vite 6 library builds emit `dist/client.cjs` when package.json declares
 * "type": "module" — fall back to `dist/client.js` for other setups.
 *
 * This module is dual-use: it is imported by vite.config.ts (called from the
 * `closeBundle` hook after every build, including `vite build --watch` rebuilds)
 * and can be run directly (`node scripts/wrap-client.mjs`) for a one-off wrap.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Wrap the current dist/client.cjs (or dist/client.js) into lib/client.js. */
export function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

  const distCjs = join(root, 'dist', 'client.cjs')
  const distJs = join(root, 'dist', 'client.js')
  const cjsPath = existsSync(distCjs) ? distCjs : distJs
  const cjs = readFileSync(cjsPath, 'utf8')

  const out = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${cjs
  .split('\n')
  .map(line => (line === '' ? '' : `\t\t${line}`))
  .join('\n')}
\t\treturn module.exports;
\t}
});
`

  const outPath = join(root, 'lib', 'client.js')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, out)
  console.log(`wrapped ${cjsPath.split('/').pop()} (${cjs.length} bytes) -> lib/client.js (${out.length} bytes)`)
}

// Direct execution (`node scripts/wrap-client.mjs`) when this file is the entry.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) run()
