-- Reverse FK indexes on junction tables for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trait_group_traits_trait ON trait_group_traits(trait_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_traits_trait ON menu_item_traits(trait_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_option_groups_group ON menu_item_option_groups(option_group_id);

-- Composite index: options by group + sort order (replaces less efficient idx_options_order)
DROP INDEX IF EXISTS idx_options_order;
CREATE INDEX IF NOT EXISTS idx_options_group_order ON options(option_group_id, sort_order);
