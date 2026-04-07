# Live Menu

Cloudflare-native restaurant digital menu display system with admin management. Replaces a Firebase-based Angular app.

- Menu: [menu.mitch.ee](https://menu.mitch.ee)
- Admin: [menu-admin.mitch.ee](https://menu-admin.mitch.ee)

A single Cloudflare Worker serves API/media routes on both domains. Two CF Pages projects serve the SPAs:

| Domain | Path | Handled by |
|--------|------|------------|
| `menu.mitch.ee` | `/api/*` | Hono API (D1 database, WebAuthn auth) |
| `menu.mitch.ee` | `/media/*` | R2 media proxy (immutable cache) |
| `menu.mitch.ee` | `/customer` | Customer interaction (trait-based drink finder) |
| `menu.mitch.ee` | `/*` | Menu PWA (SvelteKit 5, fullscreen) |
| `menu-admin.mitch.ee` | `/api/*` | Same Hono API (shared Worker) |
| `menu-admin.mitch.ee` | `/media/*` | Same R2 media proxy |
| `menu-admin.mitch.ee` | `/*` | Admin SPA (SvelteKit 5, passkey login) |
| both | `/api/sync-ws` | Durable Object WebSocket (realtime sync) |

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
│   │   ├── routes/        # auth, users, languages, menu-items, gallery, public,
│   │   │                  # traits, trait-groups, option-groups, options, settings
│   │   ├── services/      # Business logic (D1 injected)
│   │   │                  # menu, gallery, media, language, auth, + trait, trait-group,
│   │   │                  # option-group, option, settings, version-vector
│   │   ├── middleware/    # security, cors, db, services, auth
│   │   ├── do/            # BroadcastRoom Durable Object
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── seed.sql   # Default menu data (traits, options, UI translations)
│   │   ├── validation/    # Zod schemas
│   │   └── types.ts
│   └── wrangler.toml
├── frontend-admin/        # Admin SPA → served at menu-admin.mitch.ee
│   └── src/
│       ├── routes/        # login, register/[token], users, languages, customer-menu, gallery
│       └── lib/
│           ├── components/admin/
│           ├── stores/    # auth, menu, gallery, languages, users, traits, trait-groups,
│           │              # option-groups, settings (runes)
│           └── services/  # webauthn, version-sync
├── frontend-menu/         # Menu PWA → served at /
│   └── src/
│       ├── routes/        # gallery (/), customer (/customer)
│       └── lib/
│           ├── components/ # GalleryBar, GalleryMediaItem, MediaItem, LanguageSwitcher
│           ├── stores/     # menu, gallery, customer (runes)
│           └── services/  # idle-timer, sw-bridge
├── shared/                # Shared TypeScript types (both frontends + backend)
│   └── src/types.ts
├── e2e/                   # Playwright end-to-end tests
│   └── tests/             # admin-auth, admin-menu, admin-languages, admin-users, public-menu, public-pwa
├── scripts/
│   └── generate-precache-manifest.mjs  # Injects precache list into menu SW
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

### Seed menu data (optional)

Populates the database with the default drink menu (items, traits, options, UI translations, languages):

```bash
cd backend && bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql
```

### Start dev servers

Open three terminals (or use a process manager):

```bash
bun run dev:backend   # wrangler dev on :8787
bun run dev:menu      # vite dev on :5173
bun run dev:admin     # vite dev on :5174
```

### Bootstrap the first admin user

There is no seed user. Run this single command from the project root to create one and get a registration link:

```bash
cd backend && \
bunx wrangler d1 execute live_menu --local \
  --command "INSERT INTO users (name, role, is_active, has_passkey, created_at, updated_at) VALUES ('Admin', 'admin', 1, 0, unixepoch(), unixepoch())" && \
bunx wrangler d1 execute live_menu --local \
  --command "INSERT INTO registration_tokens (token, user_id, pre_filled_name, role, expires_at, created_by, created_at) VALUES ('setup-token', (SELECT id FROM users WHERE name = 'Admin' AND role = 'admin'), 'Admin', 'admin', unixepoch()+21600, (SELECT id FROM users WHERE name = 'Admin' AND role = 'admin'), unixepoch())"
```

Then open `http://localhost:5174/register/setup-token` to complete passkey registration. The token expires in 6 hours.

---

## Key Features

**Multi-language menu**
Each menu item has a name and a media file (image or video) per language. The base language is `GB` (English UK). Additional languages can be added from the admin panel.

**Image and video support**
Media variants are stored in R2 and proxied through `/media/*` with immutable cache headers. Videos auto-play/pause as items scroll into and out of view.

**Product media**
Find Your Drink products can carry their own image or video per language, uploaded from the admin Customer Menu → Products editor and displayed inside the expanded customer card on `/customer`. Product media lives in the `media_variants` table under the `media/{menuItemId}/{lang}/` R2 prefix and is cleanly separated from gallery media (which uses the `gallery_page_media` table and the `gallery/` R2 prefix).

**PWA with offline support**
The menu frontend ships a service worker (`sw.js`) and a fullscreen web manifest. The menu is accessible offline after first load.

**Customer interaction (Find Your Drink)**
Trait-based interactive menu filtering. Customers select preferences (e.g., milk/no-milk, matcha/no-matcha, caffeine level) to filter drinks, expand items to see customisation options with pricing, or tap "Surprise Me" for a random selection. Admin manages traits, trait groups, option groups, options, and pricing from the Customer Menu page. All UI text is translatable via the Languages tab.

**60-second idle reset**
After 60 seconds of no interaction the menu scrolls to the top and resets the language to `GB`. On the customer page, the idle timer navigates back to the menu gallery. Triggered by scroll, click, touch, and mousemove events.

**WebAuthn passkey authentication**
Admin and staff users authenticate with device passkeys — no passwords. Registration is invitation-based via time-limited tokens (6-hour expiry).

**Realtime sync via Durable Objects**
When the admin changes menu content, a version-vector update is broadcast over WebSocket to all connected menu clients. Clients re-fetch only if their version is stale.

**Scheduled cleanup**
Expired sessions and authentication challenges are cleaned up automatically every Sunday at midnight UTC via a cron trigger.

**Locale-aware pricing**
Prices are displayed using `Intl.NumberFormat` for locale-appropriate formatting (e.g., en-GB, et-EE).

**Gallery scheduling**
Gallery pages (the full-screen menu board at `/`) can have optional time-based visibility schedules — separate from the Find Your Drink product catalogue. A date window (start/end datetime) limits a page to a date range, and availability rules define time-of-day + day-of-week windows (OR'd together). Schedules are evaluated client-side every 60 seconds in the `Europe/Tallinn` timezone. Pages without schedules are always visible. Find Your Drink products are never schedule-gated.

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
| `bun run build:all` | Build both SPAs (menu + admin, in parallel) |
| `bun run test:backend` | Vitest (Cloudflare Workers pool) |
| `bun run test:menu` | Vitest (menu frontend) |
| `bun run test:admin` | Vitest (admin frontend) |
| `bun run e2e` | Playwright end-to-end tests |
| `bun run db:migrate:local` | Apply D1 migrations locally |
| `bun run db:migrate:remote` | Apply D1 migrations to production |
| `bun run deploy` | Build all + deploy Worker + deploy menu Pages + deploy admin Pages |
| `bun run deploy:pages` | Deploy menu SPA to CF Pages (`live-menu`) |
| `bun run deploy:admin` | Deploy admin SPA to CF Pages (`live-menu-admin`) |

---

## Further Reading

- [API.md](docs/API.md) — complete API reference
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — production deployment guide
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) — local development guide
