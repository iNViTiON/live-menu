# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev servers (Nix shell provides these as commands; otherwise use bun run scripts)
dev-backend              # wrangler dev on :8787
dev-menu                 # vite dev on :5173 (proxy → :8787)
dev-admin                # vite dev on :5174 (proxy → :8787)

# Testing
bun run test:backend     # 264 integration tests (vitest + @cloudflare/vitest-pool-workers)
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
bun run build:all        # Build both SPAs → merge into backend/dist/
bun run deploy           # build:all + wrangler deploy
```

## Architecture

Single Cloudflare Worker (`backend/src/index.ts`) handles all routing:

1. `/api/sync-ws` + WebSocket upgrade → validate session → forward to `BroadcastRoom` Durable Object
2. `/media/*` → R2 proxy with immutable cache headers
3. `/api/*` → Hono app (middleware chain: security → cors → db PRAGMA → services → auth)
4. `/admin/*` → ASSETS binding with SPA fallback to `/admin/index.html`
5. `/*` → ASSETS binding (menu SPA)

Both SPAs are built as static files and merged into `backend/dist/` via `scripts/merge-dist.mjs`. The Worker serves them through the `ASSETS` binding with `run_worker_first` for API/media/admin paths.

### Key type: `HonoEnv`

All Hono middleware and routes use `HonoEnv` from `backend/src/types.ts`:
- `Bindings`: `DB` (D1), `MEDIA_BUCKET` (R2), `BROADCAST_ROOM` (DO), `ASSETS` (Fetcher), plus WebAuthn vars
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

**Idle timer**: Both gallery (`/`) and customer (`/customer`) pages use `createIdleTimer` (60s). Gallery resets language + scrolls to top. Customer navigates back to `/` + resets language.

**Page transitions**: Menu ↔ Customer pages slide side-by-side using Svelte `fly`-style `translateX` transition (600ms, no opacity fade).

### Gallery scheduling

Gallery pages (menu board display, served at `/`) support optional time-based visibility scheduling evaluated in `Europe/Tallinn` timezone. Scheduling applies **only to gallery pages** — Find Your Drink products (`menu_items`) are never schedule-gated.
- **Gallery tables**: `gallery_pages`, `gallery_page_names`, `gallery_page_media`, `gallery_page_availability_rules` (separate from `menu_items`).
- **Date window**: optional `schedule_start`/`schedule_end` datetime columns on `gallery_pages` (ISO 8601 local time, either bound nullable)
- **Availability rules**: `gallery_page_availability_rules` table — time-of-day ranges (`HH:MM`, no midnight crossing) + day-of-week toggles (Sun–Sat). Multiple rules OR'd together.
- **Visibility logic**: date window AND (any rule matches). No rules = visible all day within the date window. No schedule fields = always visible.
- **Frontend-only enforcement**: backend serves schedule data via `/api/public/gallery`; the menu SPA evaluates `isScheduleVisible()` every 60 seconds and removes hidden pages from the DOM. All media is pre-cached regardless of schedule state.
- **Admin**: `ScheduleEditor` component (generic, callback-based) in the gallery page editor for managing date windows and availability rules.

## Conventions

- **Package manager**: `bun` / `bunx` only — never npm, npx, yarn, pnpm
- **SvelteKit 5**: runes only (`$state`, `$derived`, `$effect`, `$props`) — never legacy `writable`/`readable` stores
- **D1**: prepared statements with `.bind()` only — never string interpolation. `PRAGMA foreign_keys = ON` is enforced per-connection via `middleware/db.ts`
- **Durable Objects**: Hibernation API (`this.ctx.acceptWebSocket`) — never `ws.accept()`
- **Shared types**: `@live-menu/shared` package — both frontends and backend import from it
- **Commits**: conventional format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- **Roles**: `admin` and `staff` only (no viewer). Staff can manage menu content; admin can also manage users and languages
- **Base language**: GB (English UK) — always exists, cannot be deleted, used as fallback
- **Settings keys**: must match `/^[a-z0-9:_-]{1,100}$/`
- **Timezone**: `Europe/Tallinn` (EET/EEST) — used for all schedule evaluation, DST handled automatically

## Agent Team Conventions

- Use `@lead` to orchestrate multi-agent workflows
- Agents work in git worktrees to avoid file conflicts
- Prefix messages with role: `[Lead]`, `[Backend]`, `[Frontend]`, `[QA]`, etc.
- Review findings use structured format: `Severity / File / Line / Issue / Fix`
- Verify framework APIs via Context7 MCP before implementing
