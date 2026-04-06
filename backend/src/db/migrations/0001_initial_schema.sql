-- Users (roles: admin + staff)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  has_passkey BOOLEAN NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Passkey credentials
CREATE TABLE passkey_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_name TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_passkey_user ON passkey_credentials(user_id);

-- WebAuthn challenges (server-side, 5-min expiry)
CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  user_id INTEGER,
  type TEXT NOT NULL CHECK(type IN ('registration', 'authentication')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Sessions (bearer token, 30-day expiry)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Registration tokens (6-hour expiry, invitation-based)
CREATE TABLE registration_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  pre_filled_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Languages (GB is base, always exists)
CREATE TABLE languages (
  code TEXT PRIMARY KEY CHECK(length(code) = 2),
  display_name TEXT NOT NULL,
  is_base BOOLEAN NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Menu items (each item = a "page" in the menu)
CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_menu_items_order ON menu_items(sort_order);

-- Translatable page names per item per language
CREATE TABLE menu_item_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(menu_item_id, language_code)
);
CREATE INDEX idx_names_item ON menu_item_names(menu_item_id);

-- Media variants: one media file per item per language
CREATE TABLE media_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  r2_key TEXT NOT NULL,
  original_filename TEXT,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(menu_item_id, language_code)
);
CREATE INDEX idx_media_item ON media_variants(menu_item_id);

-- Seed base language
INSERT INTO languages (code, display_name, is_base, sort_order, created_at)
VALUES ('GB', 'English (UK)', 1, 0, unixepoch());

-- DOWN MIGRATION:
-- DROP TABLE IF EXISTS media_variants;
-- DROP TABLE IF EXISTS menu_item_names;
-- DROP TABLE IF EXISTS menu_items;
-- DROP TABLE IF EXISTS registration_tokens;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS webauthn_challenges;
-- DROP TABLE IF EXISTS passkey_credentials;
-- DROP TABLE IF EXISTS languages;
-- DROP TABLE IF EXISTS users;
