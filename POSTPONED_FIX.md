# Postponed Fixes

## L14: End-to-End Tests (Playwright)

**Severity:** LOW
**Source:** Test Coverage Review (2026-04-02)
**Status:** COMPLETED (2026-04-03)

### Resolution
Playwright e2e tests added in `e2e/` package covering:
- Admin login with passkey (WebAuthn CDP virtual authenticator)
- Admin menu management (CRUD, reorder, media upload, visibility toggle)
- Admin language management (add/delete, base language protection)
- Admin user management (list users, generate/revoke registration links)
- Public menu display (items, media, language switcher, gallery bar)
- PWA features (service worker registration, cache verification, idle timer reset)

22 tests total, all passing. Run with `nix develop` then `bun run --filter e2e test`.

### Bugs Found & Fixed During E2E
- Frontend admin menu store used wrong API paths (`/api/menu/items` → `/api/menu-items`)
- Frontend admin menu store reorder used wrong method/key (POST `{order}` → PUT `{items}`)
- Frontend admin languages store sent snake_case body (`display_name` → `displayName`)
- Frontend admin register page read wrong response key (`pre_filled_name` → `preFilledName`)
- Frontend admin menu store mutations returned wrong types (refactored to refetch pattern)
- Backend wrangler.toml SPA fallback broke admin deep-links (fixed `not_found_handling` + `run_worker_first`)
- Backend admin SPA fallback returned 307 redirect (fixed to serve `/admin/` directly for SPA routes)
