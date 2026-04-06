-- Add is_unavailable toggle to menu_items
-- Allows admins to mark items as "temporarily unavailable" without hiding them.
-- Separate from is_visible: unavailable items still appear but are greyed out / badged.
-- Includes UI translation strings for the "unavailable" badge label (GB + EE).

ALTER TABLE menu_items ADD COLUMN is_unavailable INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO settings (key, value, updated_at)
VALUES
  ('ui:unavailable:GB', 'unavailable', unixepoch()),
  ('ui:unavailable:EE', 'pole saadaval', unixepoch());

-- ---------------------------------------------------------------------------
-- DOWN MIGRATION -----------------------------------------------------------
-- ---------------------------------------------------------------------------
-- This project does not use auto-applied .down.sql files; rollback SQL is
-- documented here for manual execution via:
--   cd backend && bunx wrangler d1 execute live_menu --local --command "<SQL>"
--
-- ALTER TABLE menu_items DROP COLUMN is_unavailable;
-- DELETE FROM settings WHERE key IN ('ui:unavailable:GB', 'ui:unavailable:EE');
--
-- Data loss: is_unavailable column values are lost; UI translation rows removed.
-- ---------------------------------------------------------------------------
