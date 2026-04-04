-- Convert base_price from REAL (euros) to INTEGER (cents)
-- and price_delta from REAL (euros) to INTEGER (cents)

-- menu_items recreation
CREATE TABLE menu_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  base_price INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO menu_items_new (id, sort_order, is_visible, base_price, created_at, updated_at)
  SELECT id, sort_order, is_visible, CAST(ROUND(base_price * 100) AS INTEGER), created_at, updated_at FROM menu_items;
DROP TABLE menu_items;
ALTER TABLE menu_items_new RENAME TO menu_items;
CREATE INDEX IF NOT EXISTS idx_menu_items_order ON menu_items(sort_order);

-- options recreation
CREATE TABLE options_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  price_delta INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO options_new (id, option_group_id, price_delta, sort_order, created_at, updated_at)
  SELECT id, option_group_id, CAST(ROUND(price_delta * 100) AS INTEGER), sort_order, created_at, updated_at FROM options;
DROP TABLE options;
ALTER TABLE options_new RENAME TO options;
CREATE INDEX IF NOT EXISTS idx_options_group ON options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_options_group_order ON options(option_group_id, sort_order);
