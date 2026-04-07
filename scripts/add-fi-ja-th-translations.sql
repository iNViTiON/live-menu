-- Add Finnish (FI), Japanese (JP), and Thai (TH) languages with all translations.
-- Source: remote DB export (translations-export.json) translated to FI/JP/TH.

-- Languages
INSERT OR IGNORE INTO languages (code, display_name, is_base, sort_order, created_at)
VALUES ('FI', 'Suomi', 0, 2, datetime('now'));
INSERT OR IGNORE INTO languages (code, display_name, is_base, sort_order, created_at)
VALUES ('JP', '日本語', 0, 3, datetime('now'));
INSERT OR IGNORE INTO languages (code, display_name, is_base, sort_order, created_at)
VALUES ('TH', 'ไทย', 0, 4, datetime('now'));

-- =============================================================================
-- UI Settings
-- =============================================================================

-- ui:find_your_drink
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:find_your_drink:FI', 'Löydä juomasi', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:find_your_drink:JP', 'あなたのドリンクを見つけよう', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:find_your_drink:TH', 'ค้นหาเครื่องดื่มของคุณ', 1775277641);

-- ui:menu
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:menu:FI', 'Menu', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:menu:JP', 'メニュー', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:menu:TH', 'เมนู', 1775277641);

-- ui:loading
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:loading:FI', 'Ladataan…', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:loading:JP', '読み込み中…', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:loading:TH', 'กำลังโหลด…', 1775277641);

-- ui:preferences_prompt
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:preferences_prompt:FI', 'Kerro meille mieltymyksistäsi', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:preferences_prompt:JP', 'お好みを教えてください', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:preferences_prompt:TH', 'บอกเราเกี่ยวกับความชอบของคุณ', 1775277641);

-- ui:surprise_me
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:surprise_me:FI', 'Yllätä minut!', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:surprise_me:JP', 'おまかせで！', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:surprise_me:TH', 'เซอร์ไพรส์เลย!', 1775277641);

-- ui:reset
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:reset:FI', 'Aloita alusta', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:reset:JP', 'リセット', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:reset:TH', 'เริ่มใหม่', 1775277641);

-- ui:clear_all
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:clear_all:FI', 'Tyhjennä kaikki', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:clear_all:JP', 'すべてクリア', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:clear_all:TH', 'ล้างทั้งหมด', 1775277641);

-- ui:filters_active
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:filters_active:FI', 'suodatin aktiivinen', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:filters_active:JP', 'フィルター適用中', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:filters_active:TH', 'ตัวกรองที่ใช้อยู่', 1775277641);

-- ui:drinks
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:drinks:FI', 'juomaa', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:drinks:JP', 'ドリンク', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:drinks:TH', 'เครื่องดื่ม', 1775277641);

-- ui:of
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:of:FI', '/', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:of:JP', '/', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:of:TH', 'จาก', 1775277641);

-- ui:no_results
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_results:FI', 'Yksikään juoma ei täsmää — kokeile poistaa suodatin', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_results:JP', '該当するドリンクがありません — フィルターを解除してみてください', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_results:TH', 'ไม่มีเครื่องดื่มที่ตรงกัน — ลองล้างตัวกรองดู', 1775277641);

-- ui:no_options
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_options:FI', 'Ei mukautusvaihtoehtoja', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_options:JP', 'カスタマイズオプションなし', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:no_options:TH', 'ไม่มีตัวเลือกปรับแต่ง', 1775277641);

-- ui:idle_warning_title
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:FI', 'Oletko vielä täällä?', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:JP', 'まだいらっしゃいますか？', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_title:TH', 'คุณยังอยู่ไหม?', 1775277641);

-- ui:idle_warning_hint
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:FI', 'Kosketa mitä tahansa jatkaaksesi', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:JP', '画面をタッチして続けてください', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:idle_warning_hint:TH', 'แตะที่ใดก็ได้เพื่อดำเนินการต่อ', 1775277641);

-- ui:unavailable
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:unavailable:FI', 'ei saatavilla', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:unavailable:JP', '品切れ', 1775277641);
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ui:unavailable:TH', 'ไม่พร้อมให้บริการ', 1775277641);

-- =============================================================================
-- Menu Item Names (product names get English original in parentheses)
-- =============================================================================

-- 1: Clear Matcha
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (1, 'FI', 'Kirkas matcha (Clear Matcha)', 1775277641, 1775277641, 'Matcha vedellä, ilman maitoa');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (1, 'JP', 'クリア抹茶 (Clear Matcha)', 1775277641, 1775277641, '水で点てた抹茶、ミルクなし');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (1, 'TH', 'มัทฉะใส (Clear Matcha)', 1775277641, 1775277641, 'มัทฉะกับน้ำ ไม่ใส่นม');

-- 2: matcha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (2, 'FI', 'matcha latte (matcha latte)', 1775277641, 1775277641, 'matcha maidolla');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (2, 'JP', '抹茶ラテ (matcha latte)', 1775277641, 1775277641, 'ミルク入り抹茶');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (2, 'TH', 'มัทฉะลาเต้ (matcha latte)', 1775277641, 1775277641, 'มัทฉะกับนม');

-- 3: Matcha strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (3, 'FI', 'Matcha mansikkamaito (Matcha strawberry milk)', 1775277641, 1775277641, 'Kotitekoinen mansikkapyree');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (3, 'JP', '抹茶ストロベリーミルク (Matcha strawberry milk)', 1775277641, 1775277641, '自家製いちごピューレ');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (3, 'TH', 'มัทฉะนมสตรอว์เบอร์รี (Matcha strawberry milk)', 1775277641, 1775277641, 'เพียวเร่สตรอว์เบอร์รีทำเอง');

-- 4: Matcha mango milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (4, 'FI', 'Matcha mangomaito (Matcha mango milk)', 1775277641, 1775277641, 'Kotitekoinen mangopyree');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (4, 'JP', '抹茶マンゴーミルク (Matcha mango milk)', 1775277641, 1775277641, '自家製マンゴーピューレ');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (4, 'TH', 'มัทฉะนมมะม่วง (Matcha mango milk)', 1775277641, 1775277641, 'เพียวเร่มะม่วงทำเอง');

-- 5: Matcha brown sugar milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (5, 'FI', 'Matcha fariinisokermaito (Matcha brown sugar milk)', 1775277641, 1775277641, 'Kotitekoinen muscovado-siirappi');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (5, 'JP', '抹茶黒糖ミルク (Matcha brown sugar milk)', 1775277641, 1775277641, '自家製黒糖シロップ');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (5, 'TH', 'มัทฉะนมน้ำตาลทราย (Matcha brown sugar milk)', 1775277641, 1775277641, 'น้ำเชื่อมน้ำตาลทรายแดงทำเอง');

-- 6: Matcha mango strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (6, 'FI', 'Matcha mango-mansikkamaito (Matcha mango strawberry milk)', 1775277641, 1775277641, 'Kotitekoinen mango- ja mansikkapyree');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (6, 'JP', '抹茶マンゴーストロベリーミルク (Matcha mango strawberry milk)', 1775277641, 1775277641, '自家製マンゴー＆いちごピューレ');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (6, 'TH', 'มัทฉะนมมะม่วงสตรอว์เบอร์รี (Matcha mango strawberry milk)', 1775277641, 1775277641, 'เพียวเร่มะม่วงและสตรอว์เบอร์รีทำเอง');

-- 7: Matcha Yuzu
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (7, 'FI', 'Matcha Yuzu (Matcha Yuzu)', 1775277641, 1775277641, 'Yuzu on japanilainen sitrushedelmä, jolla on kirkas ja raikas happamuus');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (7, 'JP', '抹茶ゆず (Matcha Yuzu)', 1775277641, 1775277641, '柚子は爽やかな酸味と独特の香りが特徴の日本の柑橘です');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (7, 'TH', 'มัทฉะยูซุ (Matcha Yuzu)', 1775277641, 1775277641, 'ยูซุเป็นผลไม้ตระกูลส้มจากญี่ปุ่น มีรสเปรี้ยวสดชื่นและกลิ่นหอมเฉพาะตัว');

-- 8: Matcha pineapple juice
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (8, 'FI', 'Matcha ananasmehu (Matcha pineapple juice)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (8, 'JP', '抹茶パイナップルジュース (Matcha pineapple juice)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (8, 'TH', 'มัทฉะน้ำสับปะรด (Matcha pineapple juice)', 1775277641, 1775277641, NULL);

-- 9: BOLD MATCHA LATTE
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (9, 'FI', 'BOLD MATCHA LATTE (BOLD MATCHA LATTE)', 1775277641, 1775277641, 'MATCHA×2 vain maidolla—ilman vettä
BOLD maku—suositellaan vain kokeneille matcha-ystäville');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (9, 'JP', 'ボールド抹茶ラテ (BOLD MATCHA LATTE)', 1775277641, 1775277641, '抹茶×2 ミルクのみ使用—水なし
濃厚な味わい—抹茶好きの方におすすめ');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (9, 'TH', 'โบลด์มัทฉะลาเต้ (BOLD MATCHA LATTE)', 1775277641, 1775277641, 'มัทฉะ×2 ใช้แค่นมเท่านั้น—ไม่ใส่น้ำ
รสชาติเข้มข้น—แนะนำสำหรับคนรักมัทฉะตัวจริงเท่านั้น');

-- 10: Matcha Honey Lemon
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (10, 'FI', 'Matcha hunaja-sitruuna (Matcha Honey Lemon)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (10, 'JP', '抹茶はちみつレモン (Matcha Honey Lemon)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (10, 'TH', 'มัทฉะน้ำผึ้งมะนาว (Matcha Honey Lemon)', 1775277641, 1775277641, NULL);

-- 11: Hojicha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (11, 'FI', 'Hojicha latte (Hojicha latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (11, 'JP', 'ほうじ茶ラテ (Hojicha latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (11, 'TH', 'โฮจิฉะลาเต้ (Hojicha latte)', 1775277641, 1775277641, NULL);

-- 12: Hojicha strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (12, 'FI', 'Hojicha mansikkamaito (Hojicha strawberry milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (12, 'JP', 'ほうじ茶ストロベリーミルク (Hojicha strawberry milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (12, 'TH', 'โฮจิฉะนมสตรอว์เบอร์รี (Hojicha strawberry milk)', 1775277641, 1775277641, NULL);

-- 13: Genmaicha latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (13, 'FI', 'Genmaicha latte (Genmaicha latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (13, 'JP', '玄米茶ラテ (Genmaicha latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (13, 'TH', 'เก็นไมฉะลาเต้ (Genmaicha latte)', 1775277641, 1775277641, NULL);

-- 14: Thai milk tea
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (14, 'FI', 'Thaimaalainen maitotee (Thai milk tea)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (14, 'JP', 'タイミルクティー (Thai milk tea)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (14, 'TH', 'ชานมไทย (Thai milk tea)', 1775277641, 1775277641, NULL);

-- 15: Brown sugar milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (15, 'FI', 'Fariinisokermaito (Brown sugar milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (15, 'JP', '黒糖ミルク (Brown sugar milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (15, 'TH', 'นมน้ำตาลทราย (Brown sugar milk)', 1775277641, 1775277641, NULL);

-- 16: Cocoa latte
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (16, 'FI', 'Kaakaolatte (Cocoa latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (16, 'JP', 'ココアラテ (Cocoa latte)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (16, 'TH', 'โกโก้ลาเต้ (Cocoa latte)', 1775277641, 1775277641, NULL);

-- 17: Strawberry milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (17, 'FI', 'Mansikkamaito (Strawberry milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (17, 'JP', 'ストロベリーミルク (Strawberry milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (17, 'TH', 'นมสตรอว์เบอร์รี (Strawberry milk)', 1775277641, 1775277641, NULL);

-- 18: Mango milk
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (18, 'FI', 'Mangomaito (Mango milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (18, 'JP', 'マンゴーミルク (Mango milk)', 1775277641, 1775277641, NULL);
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (18, 'TH', 'นมมะม่วง (Mango milk)', 1775277641, 1775277641, NULL);

-- 19: Es Yen (coffee)
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (19, 'FI', 'Es Yen (kahvi) (Es Yen (coffee))', 1775277641, 1775277641, 'Thaimaalainen jäämaitokahvi');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (19, 'JP', 'エスイェン（コーヒー） (Es Yen (coffee))', 1775277641, 1775277641, 'タイ式アイスミルクコーヒー');
INSERT OR IGNORE INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at, description) VALUES (19, 'TH', 'เอสเย็น (กาแฟ) (Es Yen (coffee))', 1775277641, 1775277641, 'กาแฟเย็นใส่นมแบบไทย');

-- =============================================================================
-- Gallery Page Names
-- =============================================================================

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (1, 'FI', 'Tuoreet jälkiruoat!', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (1, 'JP', '新鮮なデザート！', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (1, 'TH', 'ของหวานสดใหม่!', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (2, 'FI', 'Perinteinen matcha', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (2, 'JP', '伝統的な抹茶', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (2, 'TH', 'มัทฉะดั้งเดิม', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (3, 'FI', 'Erikoismatcha ja muut teet', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (3, 'JP', 'おしゃれ抹茶＆その他のお茶', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (3, 'TH', 'มัทฉะแฟนซีและชาอื่นๆ', 1775277641, 1775277641);

INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (4, 'FI', 'Kofeiiniton ja kahvi', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (4, 'JP', 'カフェインフリー＆コーヒー', 1775277641, 1775277641);
INSERT OR IGNORE INTO gallery_page_names (gallery_page_id, language_code, name, created_at, updated_at) VALUES (4, 'TH', 'ไม่มีคาเฟอีนและกาแฟ', 1775277641, 1775277641);

-- =============================================================================
-- Trait Names
-- =============================================================================

-- trait 1: Traditional
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (1, 'FI', 'Perinteinen', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (1, 'JP', '伝統的', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (1, 'TH', 'ดั้งเดิม', NULL, 1775277641, 1775277641);

-- trait 2: Fancy
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (2, 'FI', 'Erikoinen', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (2, 'JP', 'おしゃれ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (2, 'TH', 'แฟนซี', NULL, 1775277641, 1775277641);

-- trait 3: Milk
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (3, 'FI', 'Maidolla', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (3, 'JP', 'ミルク入り', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (3, 'TH', 'ใส่นม', NULL, 1775277641, 1775277641);

-- trait 4: No milk
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (4, 'FI', 'Ilman maitoa', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (4, 'JP', 'ミルクなし', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (4, 'TH', 'ไม่ใส่นม', NULL, 1775277641, 1775277641);

-- trait 5: no matcha
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (5, 'FI', 'ilman matchaa', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (5, 'JP', '抹茶なし', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (5, 'TH', 'ไม่ใส่มัทฉะ', NULL, 1775277641, 1775277641);

-- trait 6: with matcha
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (6, 'FI', 'matchan kanssa', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (6, 'JP', '抹茶入り', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (6, 'TH', 'ใส่มัทฉะ', NULL, 1775277641, 1775277641);

-- trait 7: with ceremonial grade matcha powder
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (7, 'FI', 'seremoniallaatuisella matcha-jauheella', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (7, 'JP', '濃茶グレードの抹茶を使用', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (7, 'TH', 'ผงมัทฉะเกรดพิธีชงชา', NULL, 1775277641, 1775277641);

-- trait 8: none (caffeine)
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (8, 'FI', 'ei lainkaan', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (8, 'JP', 'なし', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (8, 'TH', 'ไม่มี', NULL, 1775277641, 1775277641);

-- trait 9: low
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (9, 'FI', 'matala', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (9, 'JP', '少なめ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (9, 'TH', 'น้อย', NULL, 1775277641, 1775277641);

-- trait 10: medium
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (10, 'FI', 'keskitaso', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (10, 'JP', 'ふつう', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (10, 'TH', 'ปานกลาง', NULL, 1775277641, 1775277641);

-- trait 11: high
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (11, 'FI', 'korkea', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (11, 'JP', '多め', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_names (trait_id, language_code, name, description, created_at, updated_at) VALUES (11, 'TH', 'สูง', NULL, 1775277641, 1775277641);

-- =============================================================================
-- Trait Group Names
-- =============================================================================

-- group 1: Matcha?
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'FI', 'Matcha?', 'Matchaa juomaasi—omalla tavallasi', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'JP', '抹茶は？', 'あなた好みの抹茶ドリンクを', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'TH', 'มัทฉะ?', 'มัทฉะในเครื่องดื่ม—แบบที่คุณชอบ', 1775277641, 1775277641);

-- group 2: Caffeine level
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'FI', 'Kofeiinipitoisuus', 'Tarvitsetko unta tänä yönä?', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'JP', 'カフェインの量', '今夜は眠れなくても大丈夫？', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'TH', 'ระดับคาเฟอีน', 'คืนนี้ต้องนอนไหม?', 1775277641, 1775277641);

-- group 3: Milk or No milk?
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'FI', 'Maitoa vai ilman?', 'Maitoa, kasvipohjaista maitoa vai kokonaan ilman?', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'JP', 'ミルクあり？なし？', 'ミルク、植物性ミルク、またはミルクなし', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'TH', 'ใส่นมหรือไม่ใส่?', 'นม นมจากพืช หรือไม่ใส่นมเลย', 1775277641, 1775277641);

-- group 4: Traditional or Fancy
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'FI', 'Perinteinen vai erikoinen?', 'Seuraa perinteitä vai haluatko jotain modernia?', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'JP', '伝統的？おしゃれ？', '伝統に従う？それとも新しいものが気分？', 1775277641, 1775277641);
INSERT OR IGNORE INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'TH', 'ดั้งเดิมหรือแฟนซี?', 'ตามแบบดั้งเดิม หรืออยากลองแบบใหม่?', 1775277641, 1775277641);

-- =============================================================================
-- Option Group Names
-- =============================================================================

-- group 1: Matcha powder (multi-select)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'FI', 'Matcha-jauhe', 'Valitsemasi matcha-jauhe', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'JP', '抹茶パウダー', 'お好みの抹茶パウダーをお選びください', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (1, 'TH', 'ผงมัทฉะ', 'เลือกผงมัทฉะที่คุณชอบ', 1775277641, 1775277641);

-- group 2: Matcha powder
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'FI', 'Matcha-jauhe', 'Valitsemasi matcha-jauhe', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'JP', '抹茶パウダー', 'お好みの抹茶パウダーをお選びください', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (2, 'TH', 'ผงมัทฉะ', 'เลือกผงมัทฉะที่คุณชอบ', 1775277641, 1775277641);

-- group 3: MATCHA POWDER (bold)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'FI', 'Matcha-jauhe', 'Valitsemasi matcha-jauhe', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'JP', '抹茶パウダー', 'お好みの抹茶パウダーをお選びください', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (3, 'TH', 'ผงมัทฉะ', 'เลือกผงมัทฉะที่คุณชอบ', 1775277641, 1775277641);

-- group 4: Milk
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'FI', 'Maito', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'JP', 'ミルク', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (4, 'TH', 'นม', NULL, 1775277641, 1775277641);

-- group 5: Sweetness
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (5, 'FI', 'Makeus', 'Kotitekoinen valkoinen sokerisiirappi', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (5, 'JP', '甘さ', '自家製シュガーシロップ', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (5, 'TH', 'ความหวาน', 'น้ำเชื่อมน้ำตาลทรายขาวทำเอง', 1775277641, 1775277641);

-- group 6: Sweetness (Thai milk tea variant)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (6, 'FI', 'Makeus', 'Kotitekoinen valkoinen sokerisiirappi tai aito Thai kondensoidulla maidolla', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (6, 'JP', '甘さ', '自家製シュガーシロップ、またはコンデンスミルクのリアルタイ', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (6, 'TH', 'ความหวาน', 'น้ำเชื่อมน้ำตาลทรายขาวทำเอง หรือแบบไทยแท้ใส่นมข้น', 1775277641, 1775277641);

-- group 7: Temperature
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (7, 'FI', 'Lämpötila', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (7, 'JP', '温度', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (7, 'TH', 'อุณหภูมิ', NULL, 1775277641, 1775277641);

-- group 8: Temperature (purée warning)
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (8, 'FI', 'Lämpötila', 'Pyreepitoisia juomia ei tule tarjoilla lämpiminä, koska maito saattaa juustoutua', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (8, 'JP', '温度', 'ピューレ入りのドリンクは温めるとミルクが分離するため、温かくできません', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at) VALUES (8, 'TH', 'อุณหภูมิ', 'เครื่องดื่มที่มีเพียวเร่ไม่ควรเสิร์ฟร้อน เพราะนมจะจับตัวเป็นก้อน', 1775277641, 1775277641);

-- =============================================================================
-- Option Names
-- =============================================================================

-- option 1: Regular Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (1, 'FI', 'Tavallinen maito', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (1, 'JP', 'ふつうのミルク', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (1, 'TH', 'นมธรรมดา', NULL, 1775277641, 1775277641);

-- option 2: Real Thai
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (2, 'FI', 'Aito Thai', 'Kondensoitu maito', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (2, 'JP', 'リアルタイ', 'コンデンスミルク', 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (2, 'TH', 'แบบไทยแท้', 'นมข้นหวาน', 1775277641, 1775277641);

-- option 3: No sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (3, 'FI', 'Ei makeutta', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (3, 'JP', '甘さなし', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (3, 'TH', 'ไม่หวาน', NULL, 1775277641, 1775277641);

-- option 4: Lactose-free milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (4, 'FI', 'Laktoositon maito', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (4, 'JP', 'ラクトースフリーミルク', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (4, 'TH', 'นมปราศจากแลคโตส', NULL, 1775277641, 1775277641);

-- option 5: Less sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (5, 'FI', 'Vähemmän makeaa', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (5, 'JP', '甘さ控えめ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (5, 'TH', 'หวานน้อย', NULL, 1775277641, 1775277641);

-- option 6: Oat Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (6, 'FI', 'Kauramaito', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (6, 'JP', 'オーツミルク', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (6, 'TH', 'นมข้าวโอ๊ต', NULL, 1775277641, 1775277641);

-- option 7: Regular sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (7, 'FI', 'Normaali makeus', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (7, 'JP', 'ふつうの甘さ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (7, 'TH', 'หวานปกติ', NULL, 1775277641, 1775277641);

-- option 8: Coconut Milk
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (8, 'FI', 'Kookosmaito', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (8, 'JP', 'ココナッツミルク', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (8, 'TH', 'นมมะพร้าว', NULL, 1775277641, 1775277641);

-- option 9: More sweet
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (9, 'FI', 'Makeampi', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (9, 'JP', '甘め', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (9, 'TH', 'หวานมาก', NULL, 1775277641, 1775277641);

-- option 10: Warm
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (10, 'FI', 'Lämmin', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (10, 'JP', 'ホット', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (10, 'TH', 'ร้อน', NULL, 1775277641, 1775277641);

-- option 11: Cold
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (11, 'FI', 'Kylmä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (11, 'JP', 'コールド', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (11, 'TH', 'เย็น', NULL, 1775277641, 1775277641);

-- option 12: Less iced
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (12, 'FI', 'Vähemmän jäätä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (12, 'JP', '氷少なめ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (12, 'TH', 'น้ำแข็งน้อย', NULL, 1775277641, 1775277641);

-- option 13: Iced
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (13, 'FI', 'Jäillä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (13, 'JP', 'アイス', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (13, 'TH', 'ใส่น้ำแข็ง', NULL, 1775277641, 1775277641);

-- options 14-22: matcha powder cultivar names
-- JP gets native Japanese names; FI/TH inherit from English (no rows needed)
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (14, 'JP', 'はるか', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (15, 'JP', 'はるか', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (16, 'JP', 'はるか', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (17, 'JP', '朝露「あさつゆ」', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (18, 'JP', '朝露「あさつゆ」', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (19, 'JP', '朝露「あさつゆ」', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (20, 'JP', 'さえみどり', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (21, 'JP', 'さえみどり', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (22, 'JP', 'さえみどり', NULL, 1775277641, 1775277641);

-- options 24-26: mystic powder — FI/JP/TH inherit from English (no rows needed)

-- options 27-29: Cold / Less iced / Iced (duplicate temperature set for purée drinks)
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (27, 'FI', 'Kylmä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (27, 'JP', 'コールド', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (27, 'TH', 'เย็น', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (28, 'FI', 'Vähemmän jäätä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (28, 'JP', '氷少なめ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (28, 'TH', 'น้ำแข็งน้อย', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (29, 'FI', 'Jäillä', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (29, 'JP', 'アイス', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (29, 'TH', 'ใส่น้ำแข็ง', NULL, 1775277641, 1775277641);

-- options 30-33: Less sweet / Regular sweet / More sweet / No sweet (duplicate sweetness set)
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (30, 'FI', 'Vähemmän makeaa', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (30, 'JP', '甘さ控えめ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (30, 'TH', 'หวานน้อย', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (31, 'FI', 'Normaali makeus', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (31, 'JP', 'ふつうの甘さ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (31, 'TH', 'หวานปกติ', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (32, 'FI', 'Makeampi', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (32, 'JP', '甘め', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (32, 'TH', 'หวานมาก', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (33, 'FI', 'Ei makeutta', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (33, 'JP', '甘さなし', NULL, 1775277641, 1775277641);
INSERT OR IGNORE INTO option_names (option_id, language_code, name, description, created_at, updated_at) VALUES (33, 'TH', 'ไม่หวาน', NULL, 1775277641, 1775277641);

-- =============================================================================
-- DOWN (rollback) — uncomment and run to revert
-- =============================================================================
-- DELETE FROM option_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM option_group_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM trait_group_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM trait_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM gallery_page_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM menu_item_names WHERE language_code IN ('FI', 'JP', 'TH');
-- DELETE FROM settings WHERE key LIKE 'ui:%:FI' OR key LIKE 'ui:%:JP' OR key LIKE 'ui:%:TH';
-- DELETE FROM languages WHERE code IN ('FI', 'JP', 'TH');
