# Local Development Guide

## Environment Setup

### Option A: Nix (recommended)

```bash
nix develop
# or with direnv:
direnv allow
```

This provides: bun, node, sqlite, curl, jq, git, openssl, Playwright Chromium, and the project wrapper commands (`dev-backend`, `dev-menu`, `dev-admin`, `e2e`, `db`).

### Option B: Manual

- Install Bun (>=1.3)
- Install Node.js (>=20)
- Install wrangler globally or use `bunx wrangler`

```bash
bun install
```

---

## Available Commands

### Nix wrapper commands (available after `nix develop` or `direnv allow`)

| Command | Description |
|---------|-------------|
| `dev-backend` | Start Hono API worker via `wrangler dev` on :8787 |
| `dev-menu` | Start menu frontend via Vite on :5173 |
| `dev-admin` | Start admin frontend via Vite on :5174 |
| `e2e [flags]` | Run Playwright tests (accepts `--headed`, `--ui`, file path, etc.) |
| `db <args>` | Run `wrangler d1` commands (e.g. `db execute live_menu --local --command "..."`) |

### Root workspace scripts

```bash
bun run dev:backend          # same as dev-backend
bun run dev:menu             # same as dev-menu
bun run dev:admin            # same as dev-admin
bun run test:backend         # run backend integration tests
bun run e2e                  # run Playwright e2e suite
bun run db:migrate:local     # apply D1 migrations locally
bun run db:migrate:remote    # apply D1 migrations to production
bun run build:all            # build both frontends + merge dist
bun run deploy               # build:all + wrangler deploy
```

---

## Running Dev Servers

Open three terminals from the project root:

```bash
# Terminal 1 — API
dev-backend
# or: cd backend && bun run dev

# Terminal 2 — Menu frontend
dev-menu
# or: cd frontend-menu && bun run dev

# Terminal 3 — Admin frontend
dev-admin
# or: cd frontend-admin && bun run dev
```

- Menu: http://localhost:5173
- Admin: http://localhost:5174
- Both frontends proxy `/api/*` and `/media/*` requests to the backend at :8787

---

## Database

### Apply migrations locally

```bash
bun run db:migrate:local
```

### Seed menu data

```bash
cd backend && bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql
```

The seed file inserts GB + EE languages before FK-dependent rows (traits, options, UI translations). Migrations must be applied first. The seed data does not include scheduling — menu items are created without schedule constraints (always visible).

### Query the local database

```bash
db execute live_menu --local --command "SELECT * FROM users"
```

### Local D1 data location

```
backend/.wrangler/state/
```

### Reset local database

```bash
rm -rf backend/.wrangler/state/
bun run db:migrate:local
cd backend && bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql
```

### First-time setup (new D1 database)

The `database_id` in `backend/wrangler.toml` must be set before deploying remotely:

```bash
bunx wrangler d1 create live_menu
# Paste the returned database_id into backend/wrangler.toml
```

---

## Testing

### Backend integration tests (264 tests)

```bash
bun run test:backend
```

Uses `@cloudflare/vitest-pool-workers` with real D1/R2/DO bindings via Miniflare. Migrations are applied automatically before each test run.

```bash
# Watch mode
cd backend && bun run test:watch
```

### Frontend type checking

```bash
cd frontend-admin && bunx svelte-check
cd frontend-menu && bunx svelte-check
```

### E2E tests (22 tests, Chromium)

```bash
e2e                                    # Run all tests
e2e --headed                           # Watch tests run in browser
e2e --ui                               # Interactive Playwright UI mode
e2e tests/admin-menu.spec.ts           # Run a single test file
```

E2E tests use `baseURL: http://localhost:8787` and require the backend dev server to be running. The Playwright Chromium binary is provided by the Nix devShell via `PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH`. Running Playwright outside the Nix devShell requires a separately installed Chromium.

### Scheduled handler

The Worker has a `scheduled` handler (cron trigger) that cleans up expired sessions and challenges every Sunday at midnight UTC. In development, you can trigger it manually via the wrangler dev dashboard or `curl http://localhost:8787/__scheduled`.

---

## Project Structure

```
live-menu-cf/
├── backend/           # Hono API on Cloudflare Workers (port 8787)
│   ├── src/
│   │   ├── index.ts           # App entry point and route registration
│   │   ├── services/          # Business logic (D1-injected service classes)
│   │   │   ├── menu.ts, gallery.ts, media.ts, language.ts, auth.ts
│   │   │   ├── trait.ts, trait-group.ts
│   │   │   ├── option-group.ts, option.ts
│   │   │   ├── settings.ts, version-vector.ts
│   │   │   └── ...
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.ts, users.ts, languages.ts, menu-items.ts, gallery.ts, public.ts
│   │   │   ├── traits.ts, trait-groups.ts
│   │   │   ├── option-groups.ts, options.ts
│   │   │   └── settings.ts
│   │   ├── middleware/        # Auth, CORS, logging middleware
│   │   └── do/                # Durable Object classes (BroadcastRoom)
│   ├── src/db/
│   │   ├── migrations/        # D1 SQL migration files
│   │   └── seed.sql           # Default menu data (traits, options, UI translations)
│   └── wrangler.toml          # Worker config (D1, R2, DO bindings)
├── frontend-menu/     # Customer-facing menu SPA (SvelteKit 5, port 5173)
│   └── src/
│       ├── routes/
│       │   └── customer/      # Customer interaction page (+page.svelte)
│       └── lib/stores/
│           ├── menu.svelte.ts      # Find Your Drink products
│           ├── gallery.svelte.ts   # Gallery pages (schedule-filtered)
│           └── customer.svelte.ts  # Customer filtering store
├── frontend-admin/    # Restaurant admin SPA (SvelteKit 5, port 5174)
│   └── src/
│       ├── routes/
│       │   ├── customer-menu/ # Customer menu admin page (+page.svelte)
│       │   └── gallery/       # Gallery page management (+page.svelte)
│       └── lib/stores/
│           ├── gallery.svelte.ts
│           ├── traits.svelte.ts, trait-groups.svelte.ts
│           ├── option-groups.svelte.ts, settings.svelte.ts
│           └── (includes @simplewebauthn/browser for passkey auth)
├── shared/            # Shared TypeScript types (@live-menu/shared)
│   └── src/types.ts
├── e2e/               # Playwright end-to-end tests
│   ├── tests/
│   ├── global-setup.ts
│   └── playwright.config.ts
├── scripts/
│   └── merge-dist.mjs  # Merges frontend builds for static asset serving
├── flake.nix          # Nix devShell with wrapper scripts
└── package.json       # Bun workspace root
```

---

## Code Conventions

- **SvelteKit 5:** Use runes only — `$state`, `$derived`, `$effect`, `$props`. Never use legacy Svelte stores.
- **D1 queries:** Prepared statements with `.bind()` only. Never interpolate values into SQL strings.
- **Durable Objects:** Always use the Hibernation API (`this.ctx.acceptWebSocket`), never legacy `handleWebSocket`.
- **Commits:** Conventional commits — `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- **TypeScript:** Strict mode, no `any`. Functions over 30 lines should be split.
- **Secrets:** Use `wrangler secret put`. Never commit secrets to `wrangler.toml`.
