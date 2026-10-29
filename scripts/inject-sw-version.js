// Stamps the built sw.js with a unique VERSION so each deploy gets a new
// cache name and the service worker purges the old caches on activate.
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = resolve(__dirname, '../.vercel/output/static/sw.js');

if (!existsSync(swPath)) {
  console.warn(`[inject-sw-version] WARNING: sw.js not found at ${swPath}`);
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
