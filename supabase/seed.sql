-- Default categories (user_id = NULL means system defaults)
-- These are cloned to each user during onboarding

-- EXPENSE categories
INSERT INTO categories (user_id, emoji, name_en, name_th, name_lo, type, is_default, sort_order) VALUES
  (NULL, '🍜', 'Food & drinks',    'อาหารและเครื่องดื่ม',    'ອາຫານ ແລະ ເຄື່ອງດື່ມ',    'expense', true, 1),
  (NULL, '☕', 'Coffee',            'กาแฟ',                  'ກາເຟ',                      'expense', false, 2),
  (NULL, '🛵', 'Transport',         'การเดินทาง',             'ການເດີນທາງ',                'expense', true, 3),
  (NULL, '🚗', 'Car payment',       'ค่ารถ',                  'ຄ່າລົດ',                     'expense', false, 4),
  (NULL, '🏠', 'Housing & rent',    'ที่พักและค่าเช่า',         'ທີ່ພັກ ແລະ ຄ່າເຊົ່າ',        'expense', true, 5),
  (NULL, '📱', 'Phone bill',        'ค่าโทรศัพท์',             'ຄ່າໂທລະສັບ',                'expense', true, 6),
  (NULL, '🌐', 'Internet',          'อินเทอร์เน็ต',            'ອິນເຕີເນັດ',                 'expense', true, 7),
  (NULL, '💡', 'Utilities',          'สาธารณูปโภค',            'ສາທາລະນູປະໂພກ',            'expense', false, 8),
  (NULL, '📅', 'Subscription',      'สมาชิก',                 'ສະມາຊິກ',                   'expense', false, 9),
  (NULL, '🛍', 'Shopping',           'ช้อปปิ้ง',                'ຊື້ເຄື່ອງ',                  'expense', false, 10),
  (NULL, '🛒', 'Grocery',            'ของใช้',                  'ເຄື່ອງໃຊ້',                  'expense', false, 11),
  (NULL, '💊', 'Health',             'สุขภาพ',                 'ສຸຂະພາບ',                   'expense', false, 12),
  (NULL, '🎬', 'Entertainment',     'บันเทิง',                'ບັນເທິງ',                    'expense', false, 13),
  (NULL, '📚', 'Education',          'การศึกษา',               'ການສຶກສາ',                  'expense', false, 14),
  (NULL, '✂️', 'Personal care',     'ดูแลตัวเอง',              'ເບິ່ງແຍງຕົວເອງ',             'expense', false, 15),
  (NULL, '🎁', 'Gifts & donations', 'ของขวัญ',                'ຂອງຂວັນ',                   'expense', false, 16),
  (NULL, '📌', 'Other',              'อื่นๆ',                   'ອື່ນໆ',                      'expense', true, 17);

-- INCOME categories
INSERT INTO categories (user_id, emoji, name_en, name_th, name_lo, type, is_default, sort_order) VALUES
  (NULL, '💼', 'Salary',             'เงินเดือน',              'ເງິນເດືອນ',                  'income', true, 1),
  (NULL, '🏢', 'Business',           'ธุรกิจ',                 'ທຸລະກິດ',                    'income', true, 2),
  (NULL, '💵', 'Commission',         'ค่าคอมมิชชั่น',           'ຄ່າຄອມມິດຊັ່ນ',              'income', false, 3),
  (NULL, '⚡', 'Freelance',          'ฟรีแลนซ์',              'ຟຣີແລນ',                    'income', true, 4),
  (NULL, '🛒', 'Selling',            'ขายของ',                 'ຂາຍເຄື່ອງ',                  'income', false, 5),
  (NULL, '💎', 'Dividend',           'เงินปันผล',              'ເງິນປັນຜົນ',                  'income', false, 6),
  (NULL, '📌', 'Other income',       'รายได้อื่น',              'ລາຍຮັບອື່ນ',                 'income', true, 7);
