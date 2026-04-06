# Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Cloudflare Resources](#step-1-create-cloudflare-resources)
3. [Step 2: Apply Migrations](#step-2-apply-migrations)
4. [Step 2.5: Seed Menu Data (optional)](#step-25-seed-menu-data-optional)
5. [Step 3: Build and Deploy](#step-3-build-and-deploy)
5. [Step 4: Configure Custom Domain](#step-4-configure-custom-domain)
6. [Step 5: Bootstrap First Admin](#step-5-bootstrap-first-admin)
7. [Step 6: Verify](#step-6-verify)
8. [Configuration Reference](#configuration-reference)
9. [Updating](#updating)
10. [Rollback](#rollback)

---

## Prerequisites

- Cloudflare account with Workers and Pages enabled
- Wrangler CLI (included in project deps — no separate install needed)
- Bun installed (`https://bun.sh`)
- Domain `menu.mitch.ee` added to your Cloudflare account

---

## Step 1: Create Cloudflare Resources

Create the D1 database:

```bash
bunx wrangler d1 create live_menu
```

Wrangler prints a `database_id`. If you need to retrieve it later from an existing database:

```bash
bunx wrangler d1 list
```

Copy the `database_id` and update `backend/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "live_menu"
database_id = "<paste-id-here>"   # replace the TODO placeholder
```

Create the R2 bucket for media uploads:

```bash
bunx wrangler r2 bucket create live-menu-media
```

---

## Step 2: Apply Migrations

Run all migrations against the remote D1 database:

```bash
bun run db:migrate:remote
```

This runs all migration files in order, including:
- `backend/src/db/migrations/0001_initial_schema.sql` — creates all tables and seeds the base language (`GB` / English UK)
- `backend/src/db/migrations/0002_review_fixes.sql` — adds indexes, fixes foreign key constraints, adds passkey sync triggers
- `backend/src/db/migrations/0008_menu_scheduling.sql` — introduced schedule fields on `menu_items` and the `menu_item_availability_rules` table (superseded by 0009)
- `backend/src/db/migrations/0009_gallery_separation.sql` — moves scheduling out of `menu_items` and into new `gallery_pages`, `gallery_page_names`, `gallery_page_media`, and `gallery_page_availability_rules` tables; drops `menu_item_availability_rules` and the schedule columns on `menu_items`

### Step 2.5: Seed Menu Data (optional)

```bash
cd backend && bunx wrangler d1 execute live_menu --remote --file=src/db/seed.sql
```

This populates the menu with the default drink menu including traits, options, and UI translations. The seed file inserts GB + EE languages before FK-dependent rows.

---

## Step 3: Build and Deploy

Build both frontends (menu + admin), merge their output, then deploy the Worker:

```bash
bun run deploy
```

This runs `build:all` (menu build → admin build → dist merge) followed by `bunx wrangler deploy` from the `backend/` directory.

The deployment includes a cron trigger configured in `backend/wrangler.toml` that runs the `scheduled` handler every Sunday at midnight UTC to clean up expired sessions and challenges.

---

## Step 4: Configure Custom Domain

1. Open the Cloudflare dashboard.
2. Navigate to **Workers & Pages** → **live-menu-api** → **Settings** → **Domains & Routes**.
3. Under **Custom Domains**, click **Add Custom Domain**.
4. Enter `menu.mitch.ee` and save.

Cloudflare provisions the TLS certificate automatically. DNS propagation may take a few minutes.

---

## Step 5: Bootstrap First Admin

There is no self-registration. The first admin must be seeded directly into D1, then a registration token must be created so the admin can register a passkey.

**5a. Insert the admin user:**

```bash
bunx wrangler d1 execute live_menu --remote --command \
  "INSERT INTO users (name, role, is_active, has_passkey, created_at, updated_at) VALUES ('Admin', 'admin', 1, 0, unixepoch(), unixepoch())"
```

Note the `id` of the inserted row (will be `1` on a fresh database).

**5b. Create a registration token for that user:**

```bash
bunx wrangler d1 execute live_menu --remote --command \
  "INSERT INTO registration_tokens (token, user_id, pre_filled_name, role, expires_at, used_at, created_by, created_at) VALUES (lower(hex(randomblob(16))), 1, 'Admin', 'admin', unixepoch() + 21600, NULL, 1, unixepoch())"
```

**5c. Retrieve the token:**

```bash
bunx wrangler d1 execute live_menu --remote --command \
  "SELECT token FROM registration_tokens WHERE user_id = 1"
```

**5d. Register a passkey:**

Visit `https://menu.mitch.ee/admin/register?token=<token>` in a browser that supports WebAuthn (Chrome, Safari, Firefox). Complete the passkey registration flow. After success, `has_passkey` is automatically set to `1` via database trigger and the token is marked used.

You can now log in at `https://menu.mitch.ee/admin` using your passkey.

**5e. Invite additional users:**

Use the admin panel to generate registration tokens for other admin or staff accounts. Each token is valid for 6 hours.

---

## Step 6: Verify

| URL | Expected |
|-----|----------|
| `https://menu.mitch.ee` | Public menu (empty until content is added) |
| `https://menu.mitch.ee/admin` | Admin login page |
| `https://menu.mitch.ee/api/health` | `{"ok":true}` (if the route exists) |

---

## Configuration Reference

All vars live in `backend/wrangler.toml` under `[vars]`. They are safe to commit (non-secret).

| Variable | Value | Description |
|----------|-------|-------------|
| `FRONTEND_URL` | `https://menu.mitch.ee` | Allowed CORS origin and redirect base for the frontend |
| `WEBAUTHN_RP_ID` | `mitch.ee` | WebAuthn Relying Party ID — must match the domain (not subdomain) |
| `WEBAUTHN_RP_NAME` | `Live Menu` | Human-readable name shown in the browser passkey prompt |
| `WEBAUTHN_ORIGIN` | `https://menu.mitch.ee` | Exact origin the WebAuthn ceremony runs on — must match the browser address bar |

---

## Updating

Pull the latest changes, reinstall dependencies, and redeploy:

```bash
git pull
bun install
bun run deploy
```

If new migrations are present, apply them before deploying:

```bash
bun run db:migrate:remote
bun run deploy
```

---

## Rollback

Roll back the Worker to the previous deployment:

```bash
bunx wrangler rollback --config backend/wrangler.toml
```

Wrangler keeps the last few deployments. To list available versions:

```bash
bunx wrangler deployments list --config backend/wrangler.toml
```

To roll back to a specific version:

```bash
bunx wrangler rollback <deployment-id> --config backend/wrangler.toml
```

> Database migrations cannot be automatically rolled back. If a migration caused data issues, apply a manual corrective migration using `bun run db:migrate:remote` after creating the fix SQL in `backend/src/db/migrations/`.
