-- idx_options_group is redundant — idx_options_group_order covers all lookups
DROP INDEX IF EXISTS idx_options_group;

-- DOWN MIGRATION:
-- CREATE INDEX IF NOT EXISTS idx_options_group ON options(option_group_id);
