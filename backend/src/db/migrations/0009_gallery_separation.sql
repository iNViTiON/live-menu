-- Separate gallery pages from menu items (products)
-- Gallery pages are media boards displayed on the menu screen with scheduling
-- Products (menu_items) no longer have scheduling

-- New tables for gallery pages
CREATE TABLE IF NOT EXISTS gallery_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  schedule_start TEXT,
  schedule_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_pages_order ON gallery_pages(sort_order);

CREATE TABLE IF NOT EXISTS gallery_page_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallery_page_id INTEGER NOT NULL REFERENCES gallery_pages(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(gallery_page_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_gallery_page_names_page ON gallery_page_names(gallery_page_id);
CREATE INDEX IF NOT EXISTS idx_gallery_page_names_lang ON gallery_page_names(language_code);

CREATE TABLE IF NOT EXISTS gallery_page_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallery_page_id INTEGER NOT NULL REFERENCES gallery_pages(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(gallery_page_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_gallery_page_media_page ON gallery_page_media(gallery_page_id);
CREATE INDEX IF NOT EXISTS idx_gallery_page_media_lang ON gallery_page_media(language_code);

CREATE TABLE IF NOT EXISTS gallery_page_availability_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallery_page_id INTEGER NOT NULL REFERENCES gallery_pages(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  day_sun INTEGER NOT NULL DEFAULT 0,
  day_mon INTEGER NOT NULL DEFAULT 0,
  day_tue INTEGER NOT NULL DEFAULT 0,
  day_wed INTEGER NOT NULL DEFAULT 0,
  day_thu INTEGER NOT NULL DEFAULT 0,
  day_fri INTEGER NOT NULL DEFAULT 0,
  day_sat INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_rules_page ON gallery_page_availability_rules(gallery_page_id);

-- Remove schedule columns from menu_items (products don't have schedules)
-- SQLite doesn't support DROP COLUMN, so we recreate the table
CREATE TABLE menu_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  base_price INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO menu_items_new (id, sort_order, is_visible, base_price, created_at, updated_at)
  SELECT id, sort_order, is_visible, base_price, created_at, updated_at FROM menu_items;
DROP TABLE menu_items;
ALTER TABLE menu_items_new RENAME TO menu_items;
CREATE INDEX IF NOT EXISTS idx_menu_items_order ON menu_items(sort_order);

-- Drop old availability rules table (scheduling moved to gallery pages)
DROP TABLE IF EXISTS menu_item_availability_rules;

-- DOWN MIGRATION:
-- DROP TABLE IF EXISTS gallery_page_availability_rules;
-- DROP TABLE IF EXISTS gallery_page_media;
-- DROP TABLE IF EXISTS gallery_page_names;
-- DROP TABLE IF EXISTS gallery_pages;
-- Recreate menu_items with schedule_start/schedule_end columns (table recreation required)
