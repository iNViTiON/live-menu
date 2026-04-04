-- Customer interaction: traits, options, settings
-- Adds trait-based filtering and option/add-on system to menu items

-- Global settings (single-purpose KV)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Traits (filterable attributes)
CREATE TABLE IF NOT EXISTS traits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_traits_order ON traits(sort_order);

-- Trait names (multilingual)
CREATE TABLE IF NOT EXISTS trait_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trait_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(trait_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_trait_names_trait ON trait_names(trait_id);
CREATE INDEX IF NOT EXISTS idx_trait_names_lang ON trait_names(language_code);

-- Trait groups (filter categories)
CREATE TABLE IF NOT EXISTS trait_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trait_groups_order ON trait_groups(sort_order);

-- Trait group names (multilingual)
CREATE TABLE IF NOT EXISTS trait_group_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trait_group_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (trait_group_id) REFERENCES trait_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(trait_group_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_trait_group_names_group ON trait_group_names(trait_group_id);
CREATE INDEX IF NOT EXISTS idx_trait_group_names_lang ON trait_group_names(language_code);

-- Junction: traits in trait groups (M:N)
CREATE TABLE IF NOT EXISTS trait_group_traits (
  trait_group_id INTEGER NOT NULL,
  trait_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (trait_group_id) REFERENCES trait_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE,
  PRIMARY KEY (trait_group_id, trait_id)
);

-- Option groups (add-on categories)
CREATE TABLE IF NOT EXISTS option_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  multi_select INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_option_groups_order ON option_groups(sort_order);

-- Option group names (multilingual)
CREATE TABLE IF NOT EXISTS option_group_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_group_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(option_group_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_option_group_names_group ON option_group_names(option_group_id);
CREATE INDEX IF NOT EXISTS idx_option_group_names_lang ON option_group_names(language_code);

-- Options (individual add-ons, belong to one option group)
CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_group_id INTEGER NOT NULL,
  price_delta REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_options_group ON options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_options_order ON options(sort_order);

-- Option names (multilingual)
CREATE TABLE IF NOT EXISTS option_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  option_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(option_id, language_code)
);
CREATE INDEX IF NOT EXISTS idx_option_names_option ON option_names(option_id);
CREATE INDEX IF NOT EXISTS idx_option_names_lang ON option_names(language_code);

-- Junction: menu items <-> traits (M:N)
CREATE TABLE IF NOT EXISTS menu_item_traits (
  menu_item_id INTEGER NOT NULL,
  trait_id INTEGER NOT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, trait_id)
);

-- Junction: menu items <-> option groups (M:N)
CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  menu_item_id INTEGER NOT NULL,
  option_group_id INTEGER NOT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, option_group_id)
);

-- Extend existing tables
ALTER TABLE menu_items ADD COLUMN base_price REAL NOT NULL DEFAULT 0;
ALTER TABLE menu_item_names ADD COLUMN description TEXT;
