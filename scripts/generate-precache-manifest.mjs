import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, join } from 'node:path';

const buildDir = resolve(import.meta.dirname, '../frontend-menu/build');
const swPath = join(buildDir, 'sw.js');

function walkDir(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      entries.push(...walkDir(full));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

const files = walkDir(buildDir);
const manifest = [];

for (const file of files) {
  const rel = relative(buildDir, file);
  if (rel === 'sw.js') continue; // Don't cache the SW itself

  const url = '/' + rel.replace(/\\/g, '/');

  // Files under _app/immutable/ have content hashes in their filenames
  if (rel.startsWith('_app/immutable/') || rel.startsWith('_app\\immutable\\')) {
    manifest.push({ url, revision: null });
  } else {
    const content = readFileSync(file);
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
    manifest.push({ url, revision: hash });
  }
}

// Inject into sw.js
const swContent = readFileSync(swPath, 'utf-8');
const injected = swContent.replace(
  'const PRECACHE_MANIFEST = [];',
  `const PRECACHE_MANIFEST = ${JSON.stringify(manifest)};`
);
writeFileSync(swPath, injected);

console.log(`Precache manifest: ${manifest.length} files injected into sw.js`);
