/**
 * bundle-ui.mjs
 *
 * Builds the dashboard (the root Vite app) into cli/dist/public so the package
 * can serve it. Runs as part of `npm run build` in cli/.
 */

import { readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(cliRoot, '..');
const outDir = join(cliRoot, 'dist', 'public');

let build;
try {
  ({ build } = await import('vite'));
} catch (err) {
  if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  console.error('Vite not found. Run `npm ci` in the repository root first.');
  process.exit(1);
}

// Start from an empty dist/ so files from deleted sources are never published
rmSync(join(cliRoot, 'dist'), { recursive: true, force: true });

await build({
  root: repoRoot,
  configFile: join(repoRoot, 'vite.config.ts'),
  // Skip .env files so a local VITE_FAAS_TOKEN is never published.
  // The UI gets its settings from /__launchpad/config instead.
  envDir: false,
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
  },
});

// Landing page video (~10 MB), not used by the dashboard
rmSync(join(outDir, 'MetaCall_Launchpad.mp4'), { force: true });

function removeSourceMaps(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) removeSourceMaps(path);
    else if (name.endsWith('.map')) rmSync(path);
  }
}
removeSourceMaps(outDir);

console.log(`Dashboard bundled into ${outDir}`);
