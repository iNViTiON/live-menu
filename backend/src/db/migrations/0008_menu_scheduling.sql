-- Menu item scheduling: optional date window + availability rules
-- Date window: schedule_start/schedule_end on menu_items (NULL = unbounded)
-- Availability rules: time-of-day + day-of-week (OR'd, AND'd with date window)
-- All times stored in Europe/Tallinn local time

ALTER TABLE menu_items ADD COLUMN schedule_start TEXT;
ALTER TABLE menu_items ADD COLUMN schedule_end TEXT;

CREATE TABLE IF NOT EXISTS menu_item_availability_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_availability_rules_item ON menu_item_availability_rules(menu_item_id);
