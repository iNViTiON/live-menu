-- Remove Russian/Ukrainian (RU) language and all translations.

DELETE FROM option_names WHERE language_code = 'RU';
DELETE FROM option_group_names WHERE language_code = 'RU';
DELETE FROM trait_group_names WHERE language_code = 'RU';
DELETE FROM trait_names WHERE language_code = 'RU';
DELETE FROM gallery_page_names WHERE language_code = 'RU';
DELETE FROM menu_item_names WHERE language_code = 'RU';
DELETE FROM settings WHERE key LIKE 'ui:%:RU';
DELETE FROM languages WHERE code = 'RU';
