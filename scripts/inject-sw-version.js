/**
 * Post-build script — rewrites the hardcoded VERSION placeholder in
 * build/sw.js with a base-36 timestamp so every deploy gets a unique
 * cache name and stale caches are actually purged on activate.
 *
 * Run automatically via the "build" script in package.json.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = resolve(__dirname, '../build/sw.js');
const version = Date.now().toString(36);

let content = readFileSync(swPath, 'utf8');
const updated = content.replace(/const VERSION = "v1"/, `const VERSION = "${version}"`);

if (updated === content) {
  console.warn('[inject-sw-version] WARNING: VERSION placeholder not found in build/sw.js');
  process.exit(1);
}

writeFileSync(swPath, updated);
console.log(`[inject-sw-version] VERSION = "${version}"`);
