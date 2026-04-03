# Live Menu

Cloudflare-native restaurant digital menu display system with admin management. Replaces a Firebase-based Angular app. Deployed at [menu.mitch.ee](https://menu.mitch.ee).

A single Cloudflare Worker serves the entire stack:

| Path | Handled by |
|------|------------|
| `/api/*` | Hono API (D1 database, WebAuthn auth) |
| `/media/*` | R2 media proxy (immutable cache) |
| `/admin/*` | Admin SPA (SvelteKit 5, passkey login) |
| `/*` | Menu PWA (SvelteKit 5, fullscreen) |
| `GET /api/sync-ws` | Durable Object WebSocket (realtime sync) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| API | Hono |
| Database | Cloudflare D1 (SQLite, raw prepared statements) |
| Media storage | Cloudflare R2 |
| Realtime | Durable Objects + WebSocket Hibernation API |
| Frontend | SvelteKit 5 (runes mode) + adapter-static |
| Auth | WebAuthn passkeys |
| Testing | Vitest + @cloudflare/vitest-pool-workers, Playwright |
| Package manager | Bun |
| Dev environment | Nix + direnv |

---

## Project Structure

```
live-menu-cf/
├── backend/               # Hono API — Cloudflare Worker entry point
│   ├── src/
│   │   ├── index.ts       # Worker fetch handler + route wiring
│   │   ├── routes/        # auth, users, languages, menu-items, public
│   │   ├── services/      # Business logic (D1 injected)
│   │   ├── middleware/    # security, cors, db, services, auth
│   │   ├── do/            # BroadcastRoom Durable Object
│   │   ├── db/
│   │   │   └── migrations/
│   │   ├── validation/    # Zod schemas
│   │   └── types.ts
│   └── wrangler.toml
├── frontend-admin/        # Admin SPA → served at /admin/
│   └── src/
│       ├── routes/        # login, register/[token], users, languages
│       └── lib/
│           ├── components/admin/
│           ├── stores/    # auth, menu, languages, users (runes)
│           └── services/  # webauthn, version-sync
├── frontend-menu/         # Menu PWA → served at /
│   └── src/
│       ├── routes/
│       └── lib/
│           ├── components/ # GalleryBar, MediaItem, LanguageSwitcher
│           ├── stores/     # menu (runes)
│           └── services/  # idle-timer, sw-bridge
├── shared/                # Shared TypeScript types (both frontends + backend)
│   └── src/types.ts
├── e2e/                   # Playwright end-to-end tests
│   └── tests/             # admin-auth, admin-menu, admin-languages, admin-users, public-menu, public-pwa
├── scripts/
│   └── merge-dist.mjs     # Copies both SPA builds into backend/dist/
└── package.json           # Bun workspace root
```

---

## Quickstart

### Prerequisites

**Option A — Nix (recommended):**
```bash
nix develop
# or with direnv:
direnv allow
```

**Option B — manual:**
- [Bun](https://bun.sh) >= 1.x
- Node.js >= 18 (for Wrangler)
- Wrangler CLI: `bun add -g wrangler`

### Install dependencies

```bash
bun install
```

### Configure Cloudflare resources

Before running locally you need a D1 database. Create one and paste the `database_id` into `backend/wrangler.toml`:

```bash
cd backend
bunx wrangler d1 create live_menu
# paste the returned database_id into wrangler.toml [[d1_databases]]
```

### Apply database migrations

```bash
bun run db:migrate:local
```

### Start dev servers

Open three terminals (or use a process manager):

```bash
bun run dev:backend   # wrangler dev on :8787
bun run dev:menu      # vite dev on :5173
bun run dev:admin     # vite dev on :5174
```

### Bootstrap the first admin user

There is no seed user. Insert one directly and generate a registration link:

```bash
cd backend

# 1. Insert user row
bunx wrangler d1 execute live_menu --local \
  --command "INSERT INTO users (name, role, is_active, has_passkey, created_at, updated_at) VALUES ('Admin', 'admin', 1, 0, unixepoch(), unixepoch())"

# 2. Get the user ID
bunx wrangler d1 execute live_menu --local \
  --command "SELECT id FROM users WHERE name = 'Admin'"

# 3. Insert a registration token (replace <user_id> with the id from step 2)
bunx wrangler d1 execute live_menu --local \
  --command "INSERT INTO registration_tokens (token, user_id, pre_filled_name, role, expires_at, created_by, created_at) VALUES ('setup-token', <user_id>, 'Admin', 'admin', unixepoch()+21600, <user_id>, unixepoch())"
```

Then open `http://localhost:5174/admin/register/setup-token` to complete passkey registration.

---

## Key Features

**Multi-language menu**
Each menu item has a name and a media file (image or video) per language. The base language is `GB` (English UK). Additional languages can be added from the admin panel.

**Image and video support**
Media variants are stored in R2 and proxied through `/media/*` with immutable cache headers. Videos auto-play/pause as items scroll into and out of view.

**PWA with offline support**
The menu frontend ships a service worker (`sw.js`) and a fullscreen web manifest. The menu is accessible offline after first load.

**60-second idle reset**
After 60 seconds of no interaction the menu scrolls to the top and resets the language to `GB`. Triggered by scroll, click, touch, and mousemove events.

**WebAuthn passkey authentication**
Admin and staff users authenticate with device passkeys — no passwords. Registration is invitation-based via time-limited tokens (6-hour expiry).

**Realtime sync via Durable Objects**
When the admin changes menu content, a version-vector update is broadcast over WebSocket to all connected menu clients. Clients re-fetch only if their version is stale.

**Non-destructive hide**
Menu items can be toggled visible/hidden without deleting them. The public API only returns visible items; the admin API returns all.

---

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev:backend` | Start backend (wrangler dev) |
| `bun run dev:menu` | Start menu frontend (vite dev) |
| `bun run dev:admin` | Start admin frontend (vite dev) |
| `bun run build:menu` | Build menu SPA |
| `bun run build:admin` | Build admin SPA |
| `bun run build:merge` | Merge both builds into `backend/dist/` |
| `bun run build:all` | Build everything (menu + admin + merge) |
| `bun run test:backend` | Vitest (Cloudflare Workers pool) |
| `bun run test:menu` | Vitest (menu frontend) |
| `bun run test:admin` | Vitest (admin frontend) |
| `bun run e2e` | Playwright end-to-end tests |
| `bun run db:migrate:local` | Apply D1 migrations locally |
| `bun run db:migrate:remote` | Apply D1 migrations to production |
| `bun run deploy` | Build all + `wrangler deploy` |

---

## Further Reading

- [API.md](docs/API.md) — complete API reference
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — production deployment guide
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) — local development guide
