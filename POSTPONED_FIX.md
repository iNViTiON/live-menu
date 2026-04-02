# Postponed Fixes

## L14: End-to-End Tests (Playwright)

**Severity:** LOW
**Source:** Test Coverage Review (2026-04-02)
**Status:** Deferred — separate cycle

### Issue
No Playwright e2e tests exist despite CLAUDE.md referencing `bun run e2e`. Full user flows are never tested end-to-end.

### Scope
Set up Playwright config and write critical path tests:
- Admin login with passkey -> create menu item -> upload media -> verify on public menu
- Admin language management -> verify language switcher on public menu
- Admin user management -> invite staff -> staff login
- Public menu offline mode (service worker caching)
- Public menu idle timer reset

### Why Deferred
Too large for the current fix cycle. Requires Playwright setup, browser automation, and potentially Miniflare for local backend. Estimate: dedicated task.

### Dependencies
- All review fixes from the current cycle should be merged first
- Backend integration tests (H7) provide partial coverage in the interim
