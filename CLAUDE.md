# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev servers (Nix shell provides these as commands; otherwise use bun run scripts)
dev-backend              # wrangler dev on :8787
dev-menu                 # vite dev on :5173 (proxy → :8787)
dev-admin                # vite dev on :5174 (proxy → :8787)

# Testing
bun run test:backend     # 290 integration tests (vitest + @cloudflare/vitest-pool-workers)
e2e                      # 22 Playwright tests (requires Nix devShell for Chromium)
e2e --headed             # Playwright in browser
e2e tests/admin-menu.spec.ts   # Single test file
cd frontend-admin && bunx svelte-check   # Type check admin
cd frontend-menu && bunx svelte-check    # Type check menu

# Database
bun run db:migrate:local                  # Apply D1 migrations locally
db execute live_menu --local --command "SQL"  # Query local D1
cd backend && bunx wrangler d1 execute live_menu --local --file=src/db/seed.sql  # Seed menu data

# Build + Deploy
bun run build:all        # Build both SPAs (menu + admin, in parallel)
bun run deploy           # build:all + wrangler deploy (worker) + deploy:pages + deploy:admin + deploy:notify
bun run deploy:pages     # Deploy menu SPA to CF Pages (live-menu)
bun run deploy:admin     # Deploy admin SPA to CF Pages (live-menu-admin)
```

## Architecture

Two **Cloudflare Pages** projects serve the SPAs as static files. A single **Cloudflare Worker** (`live-menu-api`) handles API and media routes on both domains, intercepting before CF Pages via Worker Routes:

1. `/api/public/sync-ws` + WebSocket upgrade → forward to `BroadcastRoom` Durable Object (public clients)
2. `/api/sync-ws` + WebSocket upgrade → forward to `BroadcastRoom` Durable Object (admin, origin-checked against both `FRONTEND_URL` and `ADMIN_URL`)
3. `/media/*` → R2 proxy with immutable cache headers
4. `/api/*` → Hono app (middleware chain: security → cors → db PRAGMA → services → auth)
5. Everything else → CF Pages (SPA fallback via `_redirects`)

**CF Pages project `live-menu`**: Custom domain `menu.mitch.ee`. Serves the menu SPA (gallery, customer). Deployed from `frontend-menu/build/`. SPA routing via `frontend-menu/static/_redirects`:
```
/*  /index.html  200
```

**CF Pages project `live-menu-admin`**: Custom domain `menu-admin.mitch.ee`. Serves the admin SPA. Deployed from `frontend-admin/build/`. SPA routing via `frontend-admin/static/_redirects`:
```
/*  /index.html  200
```

**Worker routes** cover both domains: `menu.mitch.ee/api/*`, `menu.mitch.ee/media/*`, `menu-admin.mitch.ee/api/*`, `menu-admin.mitch.ee/media/*`.

**Multi-origin**: Backend accepts requests from both `FRONTEND_URL` (menu) and `ADMIN_URL` (admin) for CORS, CSRF, and WebSocket origin checks. Registration links use `ADMIN_URL`. WebAuthn uses `ADMIN_URL` as expected origin (`WEBAUTHN_RP_ID=mitch.ee` covers both subdomains).

### Key type: `HonoEnv`

All Hono middleware and routes use `HonoEnv` from `backend/src/types.ts`:
- `Bindings`: `DB` (D1), `MEDIA_BUCKET` (R2), `BROADCAST_ROOM` (DO), `FRONTEND_URL`, `ADMIN_URL`, plus WebAuthn vars
- `Variables`: `user` (AuthUser), `authService` (AuthService), `versionVectorService` (VersionVectorService)

Access via `c.env.DB`, `c.get('user')`, `c.get('authService')`, etc.

### Service pattern

Services are classes with D1/R2 injected via constructor, instantiated per-request in `middleware/services.ts`:
- `AuthService` — WebAuthn, sessions, registration tokens
- `MenuService` — menu item CRUD, names, reorder, trait/option-group assignments, base price
- `GalleryService` — gallery page CRUD, names, reorder, media, scheduling, availability rules
- `MediaService` — R2 upload/delete, variant management
- `LanguageService` — language CRUD with R2 cascade cleanup
- `TraitService` — trait CRUD, multilingual names
- `TraitGroupService` — trait group CRUD, names, trait membership
- `OptionGroupService` — option group CRUD, names, multi_select/required flags
- `OptionService` — option CRUD, names, price deltas
- `SettingsService` — key-value settings (currency, UI translations)
- `VersionVectorService` — notify BroadcastRoom DO of changes

All services use D1 `.batch()` to minimise round-trips for multi-statement operations.

### Realtime sync

`BroadcastRoom` DO (Hibernation API) manages WebSocket connections. Auth-first: client sends `{type:"auth", token}` as first message. On mutations, backend calls `versionVectorService.notifyChange(['menuItem', 'media', ...])` which POSTs to the DO's internal `/update` endpoint, broadcasting version vectors to authenticated clients. Resource keys: `menuItem`, `media`, `language`, `user`, `trait`, `traitGroup`, `option`, `optionGroup`, `setting`, `gallery`.

A cron trigger (`scheduled` handler) runs every Sunday at midnight UTC to clean up expired sessions and challenges.

### Frontend stores

Both SPAs use Svelte 5 rune-based class stores (e.g., `class MenuStore { items = $state.raw<...>([]) }`). The admin's `version-sync.svelte.ts` subscribes to WebSocket updates and triggers store refreshes when resources are stale.

### Customer interaction

Trait-based interactive menu filtering. Admin manages traits, trait groups, option groups, options, and assigns them to menu items. Public `/customer` page lets users filter by traits (single-select per group), expand items to see options with pricing, and "Surprise Me" for random selection.

**Database**: 12 additional tables — `traits`, `trait_names`, `trait_groups`, `trait_group_names`, `trait_group_traits`, `option_groups`, `option_group_names`, `options`, `option_names`, `menu_item_traits`, `menu_item_option_groups`, `settings`. Menu items also have `base_price` and `description` (on `menu_item_names`).

**Seed data**: `backend/src/db/seed.sql` — standalone SQL file, run after migrations to populate menu data. Inserts GB + EE languages before FK-dependent rows.

**UI translations**: Stored as settings with `ui:{key}:{languageCode}` convention (e.g., `ui:find_your_drink:GB`). Managed via admin Languages tab. Used in menu SPA via `getUiText(settings, key, lang)` helper with GB fallback.

**Idle timer**: Both gallery (`/`) and customer (`/customer`) pages use `createIdleTimer({ timeoutMs: 60000, warningMs: 5000, onWarning, onDismiss, onIdle })`. At 55s idle (5s remaining) `onWarning` fires and `IdleWarningOverlay.svelte` renders — a full-screen warm-palette card with title "Are you still there?", a live circular-ring countdown (5 → 0), and hint "Tap anywhere to continue". The overlay is `pointer-events: none` so the existing passive document listeners in `idle-timer.ts` still see the first interaction and call `onDismiss`, which hides the overlay and resets both internal timers. If nothing happens by 60s, `onIdle` fires the existing reset (gallery: language + scroll; customer: `goto('/')` + language reset). Warning title and hint are translatable via `ui:idle_warning_title:{lang}` and `ui:idle_warning_hint:{lang}` settings keys (GB + EE seeded in migration 0010). Both `/api/public/menu` and `/api/public/gallery` return the full `settings` payload, and `'setting'` is wired into `GALLERY_RESOURCES` + `MENU_RESOURCES` + `CUSTOMER_RESOURCES` in `version-sync.ts` so admin translation edits propagate live to every surface.

**Item unavailability**: Menu items have an `is_unavailable` flag (migration 0012), independent of `is_visible`. Admin toggles availability via a checkbox in the product list (amber accent when unavailable). On the customer page, unavailable items are shown with strikethrough name, "(unavailable)" label (i18n via `ui:unavailable:{lang}` settings), dimmed card (opacity 0.6), and disabled expand. Items remain in the public API response with `is_unavailable: 1`.

**Customer page layout**: Item cards display in a 2-column CSS grid on desktop/tablet (>768px) and single column on mobile. Expanded cards span both columns via `grid-column: 1 / -1`.

**Page transitions**: Menu ↔ Customer pages slide side-by-side using Svelte `fly`-style `translateX` transition (600ms, no opacity fade).

**Product media**: Find Your Drink products (`menu_items`) support per-language media variants (image or autoplay video) uploaded from the admin Customer Menu → Products editor and rendered inside the expanded customer card. This is **separate from gallery media** — do not conflate the two:
- Product media → `media_variants` table (FK → `menu_items`), R2 prefix `media/{menuItemId}/{lang}/{uuid}.{ext}`, endpoints `POST`/`DELETE /api/menu-items/:id/media/:lang`, served on `/api/public/menu`.
- Gallery media → `gallery_page_media` table (FK → `gallery_pages`), R2 prefix `gallery/*`, served on `/api/public/gallery`.
Cascade delete is wired on both sides: deleting a menu item removes its `media_variants` rows (and backing R2 objects via `MediaService`).

### Gallery scheduling

Gallery pages (menu board display, served at `/`) support optional time-based visibility scheduling evaluated in `Europe/Tallinn` timezone. Scheduling applies **only to gallery pages** — Find Your Drink products (`menu_items`) are never schedule-gated.
- **Gallery tables**: `gallery_pages`, `gallery_page_names`, `gallery_page_media`, `gallery_page_availability_rules` (separate from `menu_items`).
- **Date window**: optional `schedule_start`/`schedule_end` datetime columns on `gallery_pages` (ISO 8601 local time, either bound nullable)
- **Availability rules**: `gallery_page_availability_rules` table — time-of-day ranges (`HH:MM`, no midnight crossing) + day-of-week toggles (Sun–Sat). Multiple rules OR'd together.
- **Visibility logic**: date window AND (any rule matches). No rules = visible all day within the date window. No schedule fields = always visible.
- **Frontend-only enforcement**: backend serves schedule data via `/api/public/gallery`; the menu SPA evaluates `isScheduleVisible()` every 60 seconds and removes hidden pages from the DOM. All media is pre-cached regardless of schedule state.
- **Admin**: `ScheduleEditor` component (generic, callback-based) in the gallery page editor for managing date windows and availability rules.

### Offline PWA (menu frontend)

The menu frontend is a fully offline-capable PWA after first visit. Three service worker caches (`menu-shell-v1`, `menu-manifest-v1`, `menu-media-v1`) handle shell assets, API data, and media respectively.

- **Service worker** (`frontend-menu/static/sw.js`): hand-written (no Workbox). Shell assets precached from a build-time manifest. API data uses cache-then-network (return cached instantly, update in background). Media uses cache-first. Background updates notify the app via `postMessage`.
- **Precache manifest**: `scripts/generate-precache-manifest.mjs` runs after SvelteKit build, scans `frontend-menu/build/`, and injects a `PRECACHE_MANIFEST` array into `build/sw.js`. Chained in `build:menu` script.
- **Gallery + menu media**: all language variants are proactively pre-cached. Orphan eviction runs when both API responses are cached.
- **Connection status** (`connection-status.svelte.ts`): combines `navigator.onLine` + WebSocket state (5s delay on WS disconnect to avoid flash). `ConnectionStatus.svelte` shows a fixed pill at bottom-left: red "Offline" or green "Back online" (auto-dismiss 3s).
- **App version detection**: `GET /api/public/check-app-update` fetches `/_app/version.json` from CF Pages (via outbound HTTP to `FRONTEND_URL`), compares with D1 `settings` key `app:build_version`. On mismatch, broadcasts `appVersion` via the DO version vector. Triggered by `deploy:notify` script (post-deploy curl) and as backup on WS reconnect.
- **Auto-reload on deploy**: when `appVersion` changes via WS, kiosks reload on next idle (or immediately if already idle). Wired through `menuSync.onAppVersionChange` callback + idle timer integration in both pages.

> **WARNING**: `deploy:notify` script hardcodes `https://menu.mitch.ee`. Update in `package.json` if the production domain changes.

## Conventions

- **Package manager**: `bun` / `bunx` only — never npm, npx, yarn, pnpm
- **SvelteKit 5**: runes only (`$state`, `$derived`, `$effect`, `$props`) — never legacy `writable`/`readable` stores
- **D1**: prepared statements with `.bind()` only — never string interpolation. `PRAGMA foreign_keys = ON` is enforced per-connection via `middleware/db.ts`
- **Durable Objects**: Hibernation API (`this.ctx.acceptWebSocket`) — never `ws.accept()`
- **Shared types**: `@live-menu/shared` package — both frontends and backend import from it
- **Commits**: conventional format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Roles**: `admin` and `staff` only (no viewer). Staff can manage menu content; admin can also manage users and languages
- **Base language**: GB (English UK) — always exists, cannot be deleted, used as fallback
- **Settings keys**: must match `/^[a-zA-Z0-9:_-]{1,100}$/` (uppercase allowed for language codes in UI translation keys like `ui:find_your_drink:GB`)
- **Timezone**: `Europe/Tallinn` (EET/EEST) — used for all schedule evaluation, DST handled automatically

## Agent Team Conventions

- Use `@lead` to orchestrate multi-agent workflows
- Agents work in git worktrees to avoid file conflicts
- Prefix messages with role: `[Lead]`, `[Backend]`, `[Frontend]`, `[QA]`, etc.
- Review findings use structured format: `Severity / File / Line / Issue / Fix`
- Verify framework APIs via Context7 MCP before implementing
