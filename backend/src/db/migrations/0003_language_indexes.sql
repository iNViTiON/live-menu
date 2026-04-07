-- M5: Add indexes on language_code columns for join/filter performance
CREATE INDEX IF NOT EXISTS idx_media_lang ON media_variants(language_code);
CREATE INDEX IF NOT EXISTS idx_names_lang ON menu_item_names(language_code);

-- DOWN MIGRATION:
-- DROP INDEX IF EXISTS idx_names_lang;
-- DROP INDEX IF EXISTS idx_media_lang;
