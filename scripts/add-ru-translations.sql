-- Add Russian/Ukrainian (RU) language with all translations.
-- Uses words maximally intelligible to both Russian and Ukrainian speakers.

-- Language
INSERT OR IGNORE INTO languages (code, display_name, is_base, sort_order, created_at)
VALUES ('RU', 'Українська / Русский', 0, 5, datetime('now'));

-- =============================================================================
-- UI Settings
-- =============================================================================

-- ui:find_your_drink
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:find_your_drink:RU', 'Знайди свій напій', 1775277641);

-- ui:menu
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:menu:RU', 'Меню', 1775277641);

-- ui:loading
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:loading:RU', 'Завантаження…', 1775277641);

-- ui:preferences_prompt
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:preferences_prompt:RU', 'Розкажи про свої вподобання', 1775277641);

-- ui:surprise_me
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:surprise_me:RU', 'Здивуй мене!', 1775277641);

-- ui:reset
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:reset:RU', 'Почати знову', 1775277641);

-- ui:clear_all
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:clear_all:RU', 'Очистити все', 1775277641);

-- ui:filters_active
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:filters_active:RU', 'фільтр(и) активні', 1775277641);

-- ui:drinks
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:drinks:RU', 'напоїв', 1775277641);

-- ui:of
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:of:RU', 'з', 1775277641);

-- ui:no_results
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_results:RU', 'Жоден напій не підходить — спробуй зняти фільтр', 1775277641);

-- ui:no_options
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_options:RU', 'Немає варіантів для вибору', 1775277641);

-- ui:idle_warning_title
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:RU', 'Ви ще тут?', 1775277641);

-- ui:idle_warning_hint
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:RU', 'Торкніться екрану, щоб продовжити', 1775277641);

-- ui:unavailable
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:unavailable:RU', 'немає в наявності', 1775277641);

-- =============================================================================
-- Menu Item Names
-- =============================================================================

-- 1: Clear Matcha
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (1, 'RU', 'Матча на воді (Clear Matcha)', 1775277641, 1775277641, 'Матча з водою, без молока');

-- 2: matcha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (2, 'RU', 'матча латте (matcha latte)', 1775277641, 1775277641, 'матча з молоком');

-- 3: Matcha strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (3, 'RU', 'Матча полуничне молоко (Matcha strawberry milk)', 1775277641, 1775277641, 'Наше домашнє полуничне пюре');

-- 4: Matcha mango milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (4, 'RU', 'Матча мангове молоко (Matcha mango milk)', 1775277641, 1775277641, 'Наше домашнє мангове пюре');

-- 5: Matcha brown sugar milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (5, 'RU', 'Матча молоко з коричневим цукром (Matcha brown sugar milk)', 1775277641, 1775277641, 'Наш домашній сироп із коричневого цукру');

-- 6: Matcha mango strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (6, 'RU', 'Матча манго-полуничне молоко (Matcha mango strawberry milk)', 1775277641, 1775277641, 'Наше домашнє манго-полуничне пюре');

-- 7: Matcha Yuzu
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (7, 'RU', 'Матча Юзу (Matcha Yuzu)', 1775277641, 1775277641, 'Юзу — японський цитрус із яскравою освіжаючою кислинкою та унікальним ароматом');

-- 8: Matcha pineapple juice
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (8, 'RU', 'Матча ананасовий сік (Matcha pineapple juice)', 1775277641, 1775277641, NULL);

-- 9: BOLD MATCHA LATTE
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (9, 'RU', 'BOLD МАТЧА ЛАТТЕ (BOLD MATCHA LATTE)', 1775277641, 1775277641, 'МАТЧА×2 тільки з молоком — без води
Насичений смак — рекомендовано тільки для справжніх поціновувачів матча');

-- 10: Matcha Honey Lemon
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (10, 'RU', 'Матча мед-лимон (Matcha Honey Lemon)', 1775277641, 1775277641, NULL);

-- 11: Hojicha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (11, 'RU', 'Ходжіча латте (Hojicha latte)', 1775277641, 1775277641, NULL);

-- 12: Hojicha strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (12, 'RU', 'Ходжіча полуничне молоко (Hojicha strawberry milk)', 1775277641, 1775277641, NULL);

-- 13: Genmaicha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (13, 'RU', 'Генмайча латте (Genmaicha latte)', 1775277641, 1775277641, NULL);

-- 14: Thai milk tea
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (14, 'RU', 'Тайський молочний чай (Thai milk tea)', 1775277641, 1775277641, NULL);

-- 15: Brown sugar milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (15, 'RU', 'Молоко з коричневим цукром (Brown sugar milk)', 1775277641, 1775277641, NULL);

-- 16: Cocoa latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (16, 'RU', 'Какао латте (Cocoa latte)', 1775277641, 1775277641, NULL);

-- 17: Strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (17, 'RU', 'Полуничне молоко (Strawberry milk)', 1775277641, 1775277641, NULL);

-- 18: Mango milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (18, 'RU', 'Мангове молоко (Mango milk)', 1775277641, 1775277641, NULL);

-- 19: Es Yen (coffee)
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (19, 'RU', 'Ес Єн (кава) (Es Yen (coffee))', 1775277641, 1775277641, 'Тайська крижана кава з молоком');

-- =============================================================================
-- Gallery Page Names
-- =============================================================================

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (1, 'RU', 'Свіжі десерти!', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (2, 'RU', 'Традиційна матча', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (3, 'RU', 'Особлива матча та інші чаї', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (4, 'RU', 'Без кофеїну та кава', 1775277641, 1775277641);

-- =============================================================================
-- Trait Names
-- =============================================================================

-- trait 1: Traditional
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (1, 'RU', 'Традиційний', NULL, 1775277641, 1775277641);

-- trait 2: Fancy
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (2, 'RU', 'Особливий', NULL, 1775277641, 1775277641);

-- trait 3: Milk
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (3, 'RU', 'З молоком', NULL, 1775277641, 1775277641);

-- trait 4: No milk
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (4, 'RU', 'Без молока', NULL, 1775277641, 1775277641);

-- trait 5: no matcha
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (5, 'RU', 'без матча', NULL, 1775277641, 1775277641);

-- trait 6: with matcha
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (6, 'RU', 'з матча', NULL, 1775277641, 1775277641);

-- trait 7: with ceremonial grade matcha powder
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (7, 'RU', 'з церемоніальним порошком матча', NULL, 1775277641, 1775277641);

-- trait 8: none (caffeine)
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (8, 'RU', 'немає', NULL, 1775277641, 1775277641);

-- trait 9: low
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (9, 'RU', 'низький', NULL, 1775277641, 1775277641);

-- trait 10: medium
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (10, 'RU', 'середній', NULL, 1775277641, 1775277641);

-- trait 11: high
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (11, 'RU', 'високий', NULL, 1775277641, 1775277641);

-- =============================================================================
-- Trait Group Names
-- =============================================================================

-- group 1: Matcha?
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'RU', 'Матча?', 'Матча у напої — як ти любиш', 1775277641, 1775277641);

-- group 2: Caffeine level
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'RU', 'Рівень кофеїну', 'Тобі сьогодні ще спати?', 1775277641, 1775277641);

-- group 3: Milk or No milk?
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'RU', 'З молоком чи без?', 'Молоко, рослинне молоко чи зовсім без', 1775277641, 1775277641);

-- group 4: Traditional or Fancy
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'RU', 'Традиційний чи особливий?', 'Класика чи щось нове?', 1775277641, 1775277641);

-- =============================================================================
-- Option Group Names
-- =============================================================================

-- group 1: Matcha powder (multi-select)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'RU', 'Порошок матча', 'Обери свій порошок матча', 1775277641, 1775277641);

-- group 2: Matcha powder
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'RU', 'Порошок матча', 'Обери свій порошок матча', 1775277641, 1775277641);

-- group 3: MATCHA POWDER (bold)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'RU', 'Порошок матча', 'Обери свій порошок матча', 1775277641, 1775277641);

-- group 4: Milk
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'RU', 'Молоко', NULL, 1775277641, 1775277641);

-- group 5: Sweetness
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (5, 'RU', 'Солодкість', 'Домашній цукровий сироп', 1775277641, 1775277641);

-- group 6: Sweetness (Thai milk tea variant)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (6, 'RU', 'Солодкість', 'Домашній цукровий сироп або справжній тайський із згущеним молоком', 1775277641, 1775277641);

-- group 7: Temperature
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (7, 'RU', 'Температура', NULL, 1775277641, 1775277641);

-- group 8: Temperature (purée warning)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (8, 'RU', 'Температура', 'Напої з пюре не можна подавати теплими — молоко може згорнутися', 1775277641, 1775277641);

-- =============================================================================
-- Option Names
-- =============================================================================

-- option 1: Regular Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (1, 'RU', 'Звичайне молоко', NULL, 1775277641, 1775277641);

-- option 2: Real Thai
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (2, 'RU', 'Справжній тайський', 'Згущене молоко', 1775277641, 1775277641);

-- option 3: No sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (3, 'RU', 'Без цукру', NULL, 1775277641, 1775277641);

-- option 4: Lactose-free milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (4, 'RU', 'Безлактозне молоко', NULL, 1775277641, 1775277641);

-- option 5: Less sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (5, 'RU', 'Менш солодкий', NULL, 1775277641, 1775277641);

-- option 6: Oat Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (6, 'RU', 'Вівсяне молоко', NULL, 1775277641, 1775277641);

-- option 7: Regular sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (7, 'RU', 'Звичайна солодкість', NULL, 1775277641, 1775277641);

-- option 8: Coconut Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (8, 'RU', 'Кокосове молоко', NULL, 1775277641, 1775277641);

-- option 9: More sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (9, 'RU', 'Більш солодкий', NULL, 1775277641, 1775277641);

-- option 10: Warm
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (10, 'RU', 'Теплий', NULL, 1775277641, 1775277641);

-- option 11: Cold
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (11, 'RU', 'Холодний', NULL, 1775277641, 1775277641);

-- option 12: Less iced
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (12, 'RU', 'Менше льоду', NULL, 1775277641, 1775277641);

-- option 13: Iced
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (13, 'RU', 'З льодом', NULL, 1775277641, 1775277641);

-- options 14-22: matcha powder cultivar names — inherit from English (no rows needed)

-- options 24-26: mystic powder — inherit from English (no rows needed)

-- options 27-29: Cold / Less iced / Iced (duplicate temperature set for purée drinks)
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (27, 'RU', 'Холодний', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (28, 'RU', 'Менше льоду', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (29, 'RU', 'З льодом', NULL, 1775277641, 1775277641);

-- options 30-33: Less sweet / Regular sweet / More sweet / No sweet (duplicate sweetness set)
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (30, 'RU', 'Менш солодкий', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (31, 'RU', 'Звичайна солодкість', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (32, 'RU', 'Більш солодкий', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (33, 'RU', 'Без цукру', NULL, 1775277641, 1775277641);

-- =============================================================================
-- DOWN (rollback) — uncomment and run to revert
-- =============================================================================
-- DELETE FROM option_names WHERE language_code = 'RU';
-- DELETE FROM option_group_names WHERE language_code = 'RU';
-- DELETE FROM trait_group_names WHERE language_code = 'RU';
-- DELETE FROM trait_names WHERE language_code = 'RU';
-- DELETE FROM gallery_page_names WHERE language_code = 'RU';
-- DELETE FROM menu_item_names WHERE language_code = 'RU';
-- DELETE FROM settings WHERE key LIKE 'ui:%:RU';
-- DELETE FROM languages WHERE code = 'RU';
