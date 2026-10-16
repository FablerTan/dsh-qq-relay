import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { run as wrapClient } from './scripts/wrap-client.mjs'

/**
 * Library-mode build for the browser half: src/client.tsx -> dist/client.cjs,
 * then the wrap-client plugin below turns it into lib/client.js in the DSH
 * web shell's lazy-CJS registration format.
 *
 * external is critical: react / react/jsx-runtime and @deepseek-ai/* must NOT
 * be bundled — the shell injects them at load time. Bundling a second React
 * yields two React instances and the classic "Invalid hook call" crash.
 */
export default defineConfig({
  plugins: [
    react(),
    // Wrap after every bundle write — runs for `pnpm build` AND every
    // `pnpm watch` rebuild, keeping lib/client.js always in sync.
    {
      name: 'wrap-client',
      closeBundle() {
        wrapClient()
      },
    },
  ],
  build: {
    lib: { entry: 'src/client.tsx', formats: ['cjs'], fileName: 'client' },
    rollupOptions: {
      external: [/^react($|\/)/, /^@deepseek-ai\/(cordis|dsh-client)/],
      output: { format: 'cjs', exports: 'named' },
    },
  },
})
