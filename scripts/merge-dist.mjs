import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const backendDist = resolve(root, 'backend/dist');
const menuBuild = resolve(root, 'frontend-menu/build');
const adminBuild = resolve(root, 'frontend-admin/build');

if (!existsSync(menuBuild)) {
  console.error(`ERROR: ${menuBuild} not found — run "bun run build:menu" first`);
  process.exit(1);
}
if (!existsSync(adminBuild)) {
  console.error(`ERROR: ${adminBuild} not found — run "bun run build:admin" first`);
  process.exit(1);
}

// Clean backend/dist
rmSync(backendDist, { recursive: true, force: true });
mkdirSync(backendDist, { recursive: true });

// Copy menu SPA to backend/dist/
cpSync(menuBuild, backendDist, { recursive: true });

// Copy admin SPA to backend/dist/admin/
cpSync(adminBuild, resolve(backendDist, 'admin'), { recursive: true });

// Write _redirects for CF Pages SPA routing (after merge so adapter-static can't overwrite)
writeFileSync(resolve(backendDist, '_redirects'), [
  '/admin    /admin/index.html  200',
  '/admin/*  /admin/index.html  200',
  '/*        /index.html        200',
].join('\n') + '\n');

console.log('Merged frontend builds into backend/dist/');
