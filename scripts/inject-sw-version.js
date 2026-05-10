/**
 * Post-build script — rewrites the hardcoded VERSION placeholder in
 * the output sw.js with a base-36 timestamp so every deploy gets a
 * unique cache name and stale caches are actually purged on activate.
 *
 * adapter-vercel writes static assets to .vercel/output/static/.
 * Earlier adapter-static wrote to build/, so we check both for
 * resilience.
 *
 * Run automatically via the "build" script in package.json.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(__dirname, '../.vercel/output/static/sw.js'),
  resolve(__dirname, '../build/sw.js'),
];
const swPath = candidates.find(existsSync);

if (!swPath) {
  console.warn('[inject-sw-version] WARNING: sw.js not found in any of:', candidates);
  process.exit(1);
}

const version = Date.now().toString(36);
let content = readFileSync(swPath, 'utf8');
const updated = content.replace(/const VERSION = "v1"/, `const VERSION = "${version}"`);

if (updated === content) {
  console.warn(`[inject-sw-version] WARNING: VERSION placeholder not found in ${swPath}`);
  process.exit(1);
}

writeFileSync(swPath, updated);
console.log(`[inject-sw-version] VERSION = "${version}" (${swPath})`);
