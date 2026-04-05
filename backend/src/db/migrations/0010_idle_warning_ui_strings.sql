-- Idle warning UI strings
-- Adds translatable strings for the 5-second warning overlay that appears
-- before the idle timer resets the customer tablet.
-- Uses the established `ui:{key}:{lang}` settings convention with GB fallback.
-- Idempotent via INSERT OR IGNORE so the migration is safe to re-run.

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:GB', 'Are you still there?', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:EE', 'Oled sa endiselt siin?', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:GB', 'Tap anywhere to continue', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:EE', 'Puuduta kuhugi, et jätkata', 1775277641);

-- ---------------------------------------------------------------------------
-- DOWN MIGRATION -----------------------------------------------------------
-- ---------------------------------------------------------------------------
-- This project does not use auto-applied .down.sql files; rollback SQL is
-- documented here for manual execution via:
--   cd backend && bunx wrangler d1 execute live_menu --local --command "<SQL>"
--
-- DELETE FROM settings WHERE key IN (
--   'ui:idle_warning_title:GB',
--   'ui:idle_warning_title:EE',
--   'ui:idle_warning_hint:GB',
--   'ui:idle_warning_hint:EE'
-- );
--
-- Data loss: none beyond the four rows this migration inserted.
-- ---------------------------------------------------------------------------
