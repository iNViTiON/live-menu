-- DOWN (rollback) — uncomment and run to revert
-- =============================================================================
DELETE FROM option_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM option_group_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM trait_group_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM trait_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM gallery_page_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM menu_item_names WHERE language_code IN ('FI', 'JP', 'TH');
DELETE FROM settings WHERE key LIKE 'ui:%:FI' OR key LIKE 'ui:%:JP' OR key LIKE 'ui:%:TH';
DELETE FROM languages WHERE code IN ('FI', 'JP', 'TH');
