# Project Instructions

<!-- TEMPLATE: Copy this file to your project root and customize the sections below. -->

## Project Structure

```
project/
├── backend/           # Hono API on Cloudflare Workers
│   ├── src/
│   │   ├── index.ts       # Hono app entry + routes
│   │   ├── services/      # Business logic (D1 injected)
│   │   ├── middleware/     # Auth, CORS, logging
│   │   └── do/            # Durable Object classes
│   ├── wrangler.toml
│   └── vitest.config.ts
├── frontend/          # SvelteKit 5 SPA on CF Pages
│   ├── src/
│   │   ├── routes/        # SvelteKit routes
│   │   ├── lib/
│   │   │   ├── stores/    # Svelte 5 rune stores
│   │   │   ├── components/
│   │   │   └── api/       # API client
│   │   └── app.html
│   ├── svelte.config.js
│   └── vite.config.ts
├── wasm/              # Rust WASM modules (optional)
│   ├── src/lib.rs
│   └── Cargo.toml
├── shared/            # Shared TypeScript types
└── package.json       # Bun workspace root
```

## Tech Stack

- **Package manager:** Bun
- **Backend:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite) — raw prepared statements, no ORM
- **Realtime:** Durable Objects with Hibernation API + WebSocket
- **Frontend:** SvelteKit 5 (runes mode) + adapter-static → CF Pages
- **WASM:** Rust via wasm-bindgen (optional, for perf-critical code)
- **Auth:** WebAuthn / Passkeys
- **Testing:** Vitest + @cloudflare/vitest-pool-workers (backend), Playwright (e2e)
- **Deploy:** Wrangler CLI
- **Dev env:** Nix + direnv (optional)

## Commands

```bash
# Development
bun install                    # Install all workspace deps
bun run --filter backend dev   # Start backend (wrangler dev)
bun run --filter frontend dev  # Start frontend (vite dev)

# Testing
bun run --filter backend test  # Vitest + CF pool
bun run --filter frontend test # Vitest
bun run e2e                    # Playwright

# Database
wrangler d1 migrations create <DB> <desc>   # New migration
wrangler d1 migrations apply <DB> --local   # Apply locally
wrangler d1 migrations apply <DB> --remote  # Apply to prod

# Deploy
wrangler deploy --config backend/wrangler.toml  # Deploy backend
wrangler pages deploy frontend/build            # Deploy frontend

# WASM (optional)
wasm-pack build wasm/ --target web
```

## Code Standards

- TypeScript strict mode, no `any`
- Functions over 30 lines should be split
- Every endpoint needs at least one integration test
- Handle errors explicitly — no swallowed exceptions

## Conventions

- **SvelteKit 5:** MUST use runes (`$state`, `$derived`, `$effect`, `$props`), NEVER legacy stores
- **Hono:** typed bindings via generics, service classes with D1 injection
- **D1:** prepared statements only, never string interpolation in queries
- **Durable Objects:** ALWAYS use Hibernation API (`this.ctx.acceptWebSocket`)
- **Secrets:** use `wrangler secret put`, never commit to `wrangler.toml`
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Always use Context7 MCP to verify framework APIs before implementing

## Agent Team Conventions

### Git Worktree Isolation

Backend and Frontend agents work in separate worktrees to avoid file conflicts:

```
.claude/worktrees/backend/   <- branch: agent/backend
.claude/worktrees/frontend/  <- branch: agent/frontend
.claude/worktrees/realtime/  <- branch: agent/realtime
```

Lead merges worktrees back to the feature branch when all complete (order: backend → realtime → frontend).

### Communication Protocol

- Prefix messages with your role: `[Lead]`, `[Backend]`, `[Frontend]`, `[QA]`, `[Realtime]`, `[WASM]`, `[Infra]`, `[Security]`, `[Performance]`, `[TestCoverage]`, `[Migration]`, `[Writer]`, `[Reviewer]`
- Bug reports from QA go directly to the responsible agent, not through Lead
- Review findings use structured format: Severity / File / Line / Issue / Fix

### Human-in-the-Loop Checkpoints

Lead pauses for human approval at:

1. After planning — before starting implementation
2. After code review — which non-critical findings to fix vs defer
3. After migration — before running on real data
4. After QA — ship or fix

### Patterns Reference

| Pattern | Used In | Description |
|---------|---------|-------------|
| API Spec as Contract | Build, Add Feature | Backend writes spec first; everyone builds against it |
| Structured Output | Code Review | Findings use severity/file/line/issue/fix format |
| Phased Execution | Add Feature | Tasks with hard dependencies execute in phases |
| Rolling Review | Documentation | Reviewer starts checking as soon as any writer submits |
| Competing Hypotheses | Debug | Investigators form hypotheses, then challenge each other |
| CHANGELOG as Contract | Cross-Repo | Library publishes CHANGELOG; consumers migrate from it |
