import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const backendDist = resolve(root, 'backend/dist');
const menuBuild = resolve(root, 'frontend-menu/build');
const adminBuild = resolve(root, 'frontend-admin/build');

// Clean backend/dist (except .gitkeep)
rmSync(backendDist, { recursive: true, force: true });
mkdirSync(backendDist, { recursive: true });

// Copy menu SPA to backend/dist/
cpSync(menuBuild, backendDist, { recursive: true });

// Copy admin SPA to backend/dist/admin/
cpSync(adminBuild, resolve(backendDist, 'admin'), { recursive: true });

console.log('Merged frontend builds into backend/dist/');
