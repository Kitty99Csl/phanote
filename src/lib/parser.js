// Local parser v4 + AI parse fallback chain.
// Handles Lao (primary), Thai (secondary), English natural language
// transaction inputs. Extracted from App.jsx in Session 7.

import { normalizeCategory } from "./categories";
import { dbCheckMemory, dbSaveMemory } from "./db";

// ─── LOCAL PARSER v4 — Combined best of Claude + Gemini + GPT ──
// Handles: Lao (primary) · Thai (secondary) · English
// Zero API calls — handles ~90% of real inputs instantly
export const localParse = (text) => {
  if (!text || typeof text !== 'string') return null;

  // ── Lao & Thai native digit normalisation ──────────────────
  const toArabic = (s) => (s||'')
    .replace(/[໐໑໒໓໔໕໖໗໘໙]/g, c => '໐໑໒໓໔໕໖໗໘໙'.indexOf(c).toString())
    .replace(/[๐๑๒๓๔๕๖๗๘๙]/g, c => '๐๑๒๓๔๕๖๗๘๙'.indexOf(c).toString());

  // ── Scale multipliers (Lao-first) ─────────────────────────
  const SCALE = {
    k:1e3, K:1e3, m:1e6, M:1e6,
    'ພັນ':1e3, 'พัน':1e3,
    'ແສນ':1e5, 'แสน':1e5,
    'ລ້ານ':1e6, 'ล้าน':1e6,
  };

  // ── Parse number with thousands-separator awareness ────────
  const parseNum = (raw, suffix) => {
    let s = toArabic((raw||'').trim());
    const scale = SCALE[suffix] || 1;
    // 50.000 or 50,000 → thousands separator (not decimal)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
    else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g,'');
    else if (scale > 1 && /^\d+,\d+$/.test(s)) s = s.replace(',','.');
    else s = s.replace(/,/g,'');
    const n = parseFloat(s);
    return (isFinite(n) && n > 0) ? Math.round(n * scale) : null;
  };

  // ── Extract best amount from a line ───────────────────────
  const extractAmount = (line) => {
    const s = toArabic(line||'');
    const re = /(\$)?([\d][0-9.,]*)(?:\s*)(ພັນ|พัน|k|K|ແສນ|แสน|ລ້ານ|ล้าน|m|M)?/g;
    let best = null;
    let m;
    while ((m = re.exec(s)) !== null) {
      const val = parseNum(m[2], m[3]);
      if (!val) continue;
      const hasScale = !!(m[3] && SCALE[m[3]]);
      const hasDollar = m[1] === '$';
      const score = (hasScale?3:0) + (hasDollar?2:0) + (val>1000?1:0);
      if (!best || score > best.score || (!best.hasScale && val > best.val)) {
        best = { val, score, hasScale, matchText: m[0], start: m.index, end: re.lastIndex };
      }
    }
    return best;
  };

  // ── Currency detection (LAK default — Laos is primary) ────
  const detectCurrency = (line, amount) => {
    const t = (line||'').toLowerCase();
    if (/฿|บาท|baht|thb/i.test(t)) return 'THB';
    if (/\$|usd|\bdollar\b/i.test(t)) return 'USD';
    if (/₭|ກີບ|\bkip\b|\blak\b/i.test(t)) return 'LAK';
    const thaiCtx = /[\u0E00-\u0E7F]/.test(t) || /grab|shopee|lazada|lotus|big\s*c/i.test(t);
    if (amount < 5000 && thaiCtx) return 'THB';
    return 'LAK';
  };

  // ── Category rules — ordered by specificity, Lao-first ────
  // [regex, category, confidence]
  // confidence >= 0.88 → skip API call (App.jsx threshold)
  // Expanded with GPT + Gemini Lao/Thai/EN vocabulary
  const CAT_RULES = [

    // ══ INCOME ══════════════════════════════════════════════════
    [/ເງິນເດືອນ|salary|\bwage\b|payroll|เงินเดือน/i,                                       'salary',        0.96],
    [/ຂາຍ(?:ເຄື່ອງ|ຂອງ)?|ขาย|\bsell\b|\bsold\b|\bsale\b/i,                         'selling',       0.93],
    [/ຮັບຈ້າງ|ຄ່າຈ້າງ|freelance|commission|ฟรีแลนซ์/i,                                    'freelance',     0.93],
    [/ໂບນັດ|\bbonus\b|โบนัส/i,                                                           'bonus',         0.93],
    [/ລົງທຶນ|ຫຸ້ນ|\binvest|crypto|bitcoin|\bstock|หุ้น|ลงทุน/i,                          'investment',    0.90],

    // ══ TRANSFER (banks — very specific) ══════════════════════════
    [/\b(bcel|jdb|ldb|bfl|onepay|apay|k\s*plus|promptpay|truemoney)\b(?!\s*(?:fee|fees|charge|charges|statement|statements))/i, 'transfer', 0.92],
    [/ໂອນ(?:ເງິນ)?(?!\s*ອອກ)|โอน(?:เงิน)?/i,                                            'transfer',      0.90],

    // ══ DONATION — ເຮັດບຸນ (very Lao — highest priority) ══════════
    [/ເຮັດບຸນ|ໃສ່ບາດ|ຕັກບາດ|ຖວາຍ|ທຳທານ|ບໍລິຈາກ|ສູ່ຂວັນ|ຜູກແຂນ/i,                   'donation',      0.98],
    [/ບຸນທາດຫຼວງ|ບຸນບັ້ງໄຟ|ບຸນຊ່ວງເຮືອ|ບຸນປີໃໝ່|ບຸນເຂົ້າພັນສາ|ບຸນອອກພັນສາ/i,         'donation',      0.97],
    [/ວັດ(?:\s|$)|ຖວາຍພະ|ຖວາຍວັດ|ໂຮງໝໍ.*ບໍລິຈາກ|ປ່ອຍປາ|ປ່ອຍນົກ|ກະຖິນ|ຜ້າປ່າ/i,    'donation',      0.96],
    [/baci|boun\s*bang\s*fai|boun\s*that\s*luang|kathin|pha\s*pa|sai\s*bat|tak\s*bat/i,'donation',   0.95],
    [/boun\s*pi\s*mai|sou\s*khuan|sukhuan|wrist\s*thread|ordination|buat/i,           'donation',      0.93],
    [/funeral\s*envelope|ngan\s*sop|wedding\s*envelope|kha\s*dong|kha\s*khong/i,     'donation',      0.93],
    [/\bdonate\b|\bdonation\b|\bcharity\b|\btemple\b|\bmonk\b|\balms\b/i,      'donation',      0.92],
    [/ทำบุญ|ใส่บาตร|ตักบาตร|ถวาย|วัด|กฐิน|ผ้าป่า|บริจาค|สู่ขวัญ/i,                   'donation',      0.93],

    // ══ DEBT PAYMENT ══════════════════════════════════════════════
    [/ຜ່ອນ|ໜີ້|ໃຊ້ໜີ້|ກູ້(?!ຢືມ)|ຊຳລະໜີ້/i,                                             'debt_payment',  0.97],
    [/\bloan\b|\binstallment\b|\brepayment\b|ผ่อน|หนี้|ชำระหนี้/i,                  'debt_payment',  0.93],

    // ══ PHONE & INTERNET (before utilities) ══════════════════════
    [/ຄ່າໂທ|ຄ່າໂທລະສັບ|ຄ່າເນັດ|ເຕີມ(?:ເງິນ)?/i,                                       'phone_internet',0.97],
    [/\b(unitel|etl|ltc|beeline|ອູນີເທລ)\b/i,                                          'phone_internet',0.97],
    [/\btopup\b|top[\s-]?up(?:\s*phone)?|mobile\s*package|data\s*package|เติมเงิน/i, 'phone_internet',0.93],
    [/wifi\s*bill|phone\s*bill|internet\s*bill|ค่าเน็ต|ค่าโทร/i,                     'phone_internet',0.93],

    // ══ UTILITIES (ຄ່າໄຟ ຄ່ານ້ຳ) ════════════════════════════════
    [/ຄ່າໄຟ|ໄຟຟ້າ|\bedl\b|ຄ່ານ້ຳ|ນ້ຳປະປາ|\bnam\s*papa\b/i,                       'utilities',     0.98],
    [/electricity|electric\s*bill|water\s*bill|water\s*supply|ค่าไฟ|ค่าน้ำ|สาธารณูปโภค|ລັດວິສາຫະກິດນ້ຳປະປາ/i, 'utilities', 0.95],
    [/trash|garbage|rubbish|waste\s*collect|ຂີ້ເຫຍື້ອ|ค่าขยะ/i,                    'utilities',     0.92],

    // ══ HOUSING (rent only) ════════════════════════════════════════
    [/ຄ່າເຊົ່າ|ເຊົ່າຫ້ອງ|ເຊົ່າບ້ານ|ค่าเช่า|เช่าบ้าน/i,                                  'rent',          0.97],
    [/\brent\b|apartment\s*fee|room\s*rent/i,                                         'rent',          0.93],

    // ══ REPAIR ════════════════════════════════════════════════════
    [/ຊ່ອມລົດ|ຊ່ອມ(?:ຈັກ|ໂທ|ເຮືອນ|ຕູ້ເຢັນ|ແອ)|ສ້ອມແຊມ|ຄ່າຊ່າງ/i,                    'repair',        0.97],
    [/\brepair\b|mechanic|tire\s*repair|pa\s*yang|ล้างรถ|ค่าช่าง|ปะยาง/i,          'repair',        0.93],
    [/car\s*wash|lang\s*lot|ນ້ຳມັນເຄື່ອງ|engine\s*oil|ຫາງໝໍ|ຊ່ອມ/i,               'repair',        0.92],

    // ══ FEES (ATM, transfer, govt) ════════════════════════════════
    [/ຄ່າທຳນຽມ|ຄ່າ\s*atm|ຄ່າໂອນ|ຄ່າຝາກ|ໃບຂັບຂີ່|ຄ່າວີຊາ/i,                        'fees',          0.97],
    [/atm\s*fee|transfer\s*fee|bank\s*fee|service\s*fee|visa\s*fee/i,              'fees',          0.94],
    [/ຄ່າປັບ|police\s*ticket|ໃບສັ່ງ|ค่าปรับ|ค่าธรรมเนียม/i,                          'fees',          0.92],
    [/bank\s*statement|bank\s*charge|monthly\s*fee|bcel\s*fee|annual\s*fee/i,       'fees',          0.93],

    // ══ FAMILY ════════════════════════════════════════════════════
    [/ໃຫ້ພໍ່|ໃຫ້ແມ່|ໃຫ້ພໍ່ແມ່|ສົ່ງໃຫ້ພໍ່|ສົ່ງໃຫ້ແມ່|ຄ່ານົມ|ຜ້າອ້ອມ|ລ້ຽງລູກ/i,      'family',        0.97],
    [/give\s*mom|give\s*dad|send\s*parents|baby\s*milk|diapers|pampers|mamypoko/i,  'family',        0.93],

    // ══ COFFEE ════════════════════════════════════════════════════
    [/ກາເຟ|กาแฟ|\bcoffee\b|\bcafe\b|joma|starbucks|amazon\s*cafe/i,               'coffee',        0.96],
    [/latte|espresso|cappuccino|americano|flat\s*white|iced\s*coffee|cha\s*yen/i,   'coffee',        0.94],
    [/inthanin|cafe\s*amazon|chatramue|cha\s*tra\s*mue|pearly\s*tea|koi\s*the/i, 'coffee',        0.95],
    [/kamu|ichitan|oishi(?!.*beer)|green\s*tea(?!.*beer)|ชาเขียว|ชาไทย/i,            'coffee',        0.90],

    // ══ DRINKS — Beerlao variants (most specific first) ══════════
    [/beerlao|beer\s*lao|ເບຍລາວ|ເບຍນ້ຳຂອງ|namkhong/i,                                 'drinks',        0.98],
    [/beerlao\s*(?:dark|gold|white|ipa|lemon|green)|ເບຍລາວ(?:ດຳ|ໂກ|ໄວ)/i,          'drinks',        0.98],
    [/ລາວລາວ|lao\s*lao|ເຫຼົ້າ(?:ຂາວ)?|lao\s*whisky|rice\s*whisky/i,               'drinks',        0.97],
    [/carlsberg|heineken|tuborg|chang\s*beer|tiger\s*beer|luang\s*prabang\s*beer/i,'drinks',        0.96],
    [/soju|chivas|red\s*label|black\s*label|johnnie|jack\s*daniel|smirnoff|absolut/i,'drinks',       0.95],
    [/regency|blend\s*285|hong\s*thong|sangsom|vodka|\bwine\b|champagne/i,         'drinks',        0.94],
    [/ດື່ມ|alcohol|\bbeer\b|\bwhisky\b|\bwhiskey\b|cocktail|เบียร์|เหล้า/i,    'drinks',        0.95],
    [/m-150|carabao|red\s*bull|sponsor|pocari|energy\s*drink|ນ້ຳຊູກຳລັງ/i,          'drinks',        0.93],
    [/ຊານົມ|cha\s*nom|boba|bubble\s*tea|milk\s*tea|pearl(?:s)?\s*tea|ไข่มุก/i,    'drinks',        0.94],
    [/ນ້ຳອ້ອຍ|sugarcane|coconut\s*water|ໝາກພ້າວ|ນ້ຳໝາກ|fresh\s*juice|smoothie/i,   'drinks',        0.92],
    [/coke|pepsi|sprite|fanta|\bsoda\b|soft\s*drink|ນ້ຳອັດລົມ|น้ำอัดลม/i,          'drinks',        0.92],
    [/\bwater\b(?!\s*bill|\s*supply|\s*park)|ນ້ຳດື່ມ(?!\s*ຫົວ)|nom\s*sot/i,    'drinks',        0.88],

    // ══ GROCERIES (market/supermarket shopping) ══════════════════
    [/ຊື້ຂອງກິນ|ຊື້ຂອງ(?!\s*ໃຊ້)|ຕະຫຼາດສົດ|ຕະຫຼາດເຊົ້າ|ທ້ອງຕະຫຼາດ/i,              'groceries',     0.97],
    [/villa\s*market|phimphone|t-mart|j-mart|kok\s*kok|rimping|mini\s*big\s*c/i,  'groceries',     0.97],
    [/khua\s*din|talat\s*sao|that\s*luang\s*market|\btalat\b/i,                 'groceries',     0.95],
    [/supermarket|fresh\s*market|\bgrocery\b|\bproduce\b|big\s*c/i,             'groceries',     0.93],
    // Cleaning & household brands — groceries context
    [/omo|downy|comfort|pantene|sunsilk|dove\b|lux\b|colgate|vaseline/i,            'groceries',     0.93],
    [/pampers|mamypoko|mammy\s*poko|baby\s*formula|nom\s*phong|ຜ້າອ້ອມ/i,          'groceries',     0.94],
    [/\bsunlight\b|faep|\breeze\b|detergent|ຜ້ານຸ່ມ|ຜ້ານຸ່ມ|fabric\s*softener/i,'groceries',     0.92],
    [/ຢາສີຟັນ|ຢາສະຜົມ|ສະບູ|toothpaste|shampoo|conditioner|body\s*wash/i,            'groceries',     0.92],
    [/trash\s*bag|toilet\s*paper|tissue|garbage\s*bag|ຖົງຂີ້ເຫຍື້ອ|ເຈ້ຍ/i,        'groceries',     0.91],
    [/fish\s*sauce|nam\s*pa|padaek|pa\s*daek|soy\s*sauce|oyster\s*sauce/i,      'groceries',     0.91],
    [/instant\s*noodle|mama\b|wai\s*wai|ໝີ່ໄວໄວ|canned\s*fish|ປາກະປ໋ອງ/i,      'groceries',     0.93],
    [/cooking\s*oil|ນ້ຳມັນກິນ|sugar|ນ້ຳຕານ|salt|ເກືອ|msg|ຜົງ|seasoning/i,          'groceries',     0.90],

    // ══ FOOD — Lao dishes (highest priority) ═════════════════════
    [/ຕຳໝາກຫຸ່ງ|ຕຳໝາກແດງ|ຕຳໝາກ|ສົ້ມຕຳ|som\s*tam/i,                                'food',          0.98],
    [/ເຝີ|ໝູກະທະ|moo\s*kata|ອໍ້ລຳ|or\s*lam|ລາບ(?:ໝູ|ໄກ່|ງົວ|ປາ|ເປັດ)?/i,        'food',          0.97],
    [/ຜັດໄທ|pad\s*thai|ຂ້າວຜັດ|khao\s*pad|ຜັດກະເພົາ|pad\s*kra\s*pao/i,          'food',          0.97],
    [/ໝົກປາ|mok\s*pa|ໝົກໄກ່|mok\s*kai|ຫໍ່ໝົກ|hor\s*mok/i,                        'food',          0.97],
    [/ໄສ້ອົ່ວ|sai\s*oua|ແໜມເນືອງ|nam\s*khao|ຫ່ຍ|jeow\s*bong|ແຈ່ວ/i,             'food',          0.96],
    [/ping\s*(?:kai|moo|pa|sin)|ປີ້ງ(?:ໄກ່|ໝູ|ປາ|ຊີ້ນ)/i,                          'food',          0.96],
    [/khao\s*piak|kao\s*piek|ເຂົ້າປຽກ|khao\s*poon|ເຂົ້າປຸ້ນ|khao\s*soi/i,       'food',          0.96],
    [/khao\s*niao|ເຂົ້າໜຽວ|sticky\s*rice|ເຂົ້າຈີ່ປາເຕ້|khao\s*jee/i,             'food',          0.95],
    [/tom\s*yum|ຕົ້ມຍຳ|suki|ສຸກີ້|shabu|ຊາບູ|buffet|ບຸບເຟ້|wark|ແຊບ/i,             'food',          0.95],
    [/laap|larb|laab|ລາບ|khao\s*man|khao\s*na\s*ped|boat\s*noodle/i,              'food',          0.95],
    [/ເຂົ້າ|ອາຫານ|ກິນ|ຊີ້ນ|ໄກ່|ໄຂ່|ຜັກ|ປາ|ໝູ|ກຸ້ງ/i,                              'food',          0.95],
    [/ข้าว|อาหาร|หมูกระทะ|ส้มตำ|ลาบ|ผัดไทย|ก๋วยเตี๋ยว|ไก่|ไข่|เนื้อ|ผัก/i,       'food',          0.93],
    // Romanized Lao food
    [/khao|tam\s*mak|ping\s*gai|mee\s*sua|khao\s*jee|pate/i,                      'food',          0.92],
    // International food chains in Laos
    [/lotteria|texas\s*chicken|dairy\s*queen|swensen|patongo|pa\s*thong/i,          'food',          0.95],
    [/dim\s*sum|ຕິ່ມຊຳ|ramen|ຣາເມັງ|roti|ໂຣຕີ|sushi|kfc|burger|pizza/i,             'food',          0.94],
    // General food vocabulary
    [/noodle|\brice\b|chicken|\bpork\b|\bfish\b|\begg\b|shrimp|\bbeef\b/i,  'food',          0.92],
    [/\bcake\b|cupcake|cup\s*cake|cake\s*roll|croissant|pastry|bakery/i,           'food',          0.93],
    [/\bcookie\b|donut|waffle|pancake|muffin|patongko|ปาท่องโก๋/i,                  'food',          0.93],
    [/\bbread\b|toast|sandwich|hotdog|baguette|roti/i,                               'food',          0.92],
    [/ໝາກ(?:ກ້ວຍ|ໂມ|ມ່ວງ|ພ້າວ|ຫຸ້ງ|ເລັ່ນ|ນາວ)|mak\s*(?:muang|mo|kuai)/i,          'food',          0.92],
    [/\bapple\b|\bbanana\b|\bmango\b|watermelon|papaya|\bfruit\b/i,            'food',          0.92],
    [/sausage|\bham\b|\bbacon\b|meatball|\bsteak\b|ลูกชิ้น|ไส้อั่ว/i,           'food',          0.93],
    [/\bmilk\b|\bcheese\b|yogurt|\bbutter\b|tofu|ขนม|dessert|ของหวาน/i,         'food',          0.91],
    [/\bjam\b|honey|sauce|ketchup|chocolate|\bsnack\b|chips|candy|ຂະໜົມ/i,          'food',          0.90],
    [/breakfast|lunch|dinner|\bfood\b|\beat\b|meal|restaurant|street\s*food/i,   'food',          0.90],
    [/oeuvre|takeaway|packed\s*lunch|ຫໍ່ກັບ|khao\s*kong|อาหารข้างทาง/i,            'food',          0.90],

    // ══ TRANSPORT — Lao apps + specific ═══════════════════════════
    [/\bloca\b|ໂລຄ່າ|ຈໍາໂບ້|jumbo|skylab|ສະກາຍແລັບ|xanh\s*sm/i,                  'transport',     0.97],
    [/\bindrive\b|kok\s*kok\s*move|tuk\s*tuk|ຕຸກຕຸກ|\btaxi\b/i,               'transport',     0.96],
    [/ນ້ຳມັນ|ຕື່ມນ້ຳມັນ|pam\s*nam\s*man|gas\s*station|ປ້ຳ/i,                      'transport',     0.97],
    // Lao fuel brands
    [/ptt|laopec|petrolimex|petrotrade|star\s*oil|plus\s*gas|pv\s*oil|orl|lsfc/i,'transport',     0.96],
    // LCR train (Lao-China Railway)
    [/\blcr\b|lao\s*china\s*rail|lot\s*fai|ລົດໄຟ|high\s*speed\s*train/i,     'transport',     0.95],
    [/\bgrab\b|\bfuel\b|petrol|diesel|gasoline|parking|ค่าน้ำมัน|road\s*tax|vehicle\s*tax|ພາສີລົດ/i, 'transport', 0.93],
    [/speedboat|slow\s*boat|heua|ferry|ເຮືອ|boat\s*ticket|ปีเรือ/i,                'transport',     0.93],
    [/lao\s*airlines|wattay|airport|sanam\s*bin|สนามบิน|ตั๋วเครื่องบิน/i,          'transport',     0.93],
    [/motorbike\s*rental|sao\s*lot|car\s*rental|ເຊົ່າລົດ|เช่ารถ/i,               'transport',     0.92],

    // ══ ENTERTAINMENT — morlam + KTV (highest) ══════════════════
    [/ມໍລຳ|ໝໍລຳ|morlam|mor\s*lam|molam|luk\s*thung/i,                               'entertainment', 0.98],
    [/\bktv\b|karaoke|ຄາຣາໂອເກະ|คาราโอเกะ|vip\s*room(?!.*hotel)/i,                'entertainment', 0.97],
    // Pub/bar/nightclub
    [/\bຜັບ\b|nightclub|ໄນທ໌ຄັບ|pub(?!\s*lic)|beer\s*garden|rooftop\s*bar/i,   'entertainment', 0.95],
    [/tawandang|marina|dao\s*vieng|\bbar\b(?!code)|\bclub\b(?!\s*card)/i,       'entertainment', 0.93],
    // Cinema — Lao-specific
    [/major\s*(?:cineplex|platinum)|platinum\s*cineplex|hong\s*nang|ໂຮງໜັງ/i,    'entertainment', 0.97],
    [/\bmovie\b|cinema|\bfilm\b|ເບິ່ງໜັງ|popcorn|ticket(?!\s*train)/i,          'entertainment', 0.93],
    // Sports & activities
    [/bowling|ໂບລິ້ງ|billiards|billiard|snooker|ສະນຸກເກີ|pool(?!\s*party)/i,       'entertainment', 0.94],
    [/arcade|game\s*center|internet\s*cafe|pc\s*cafe|han\s*net|ຮ້ານເນັດ/i,       'entertainment', 0.93],
    // Festivals (Lao-specific)
    [/boun\s*pi\s*mai|pi\s*mai\s*lao|boun\s*bang\s*fai|boat\s*race/i,         'entertainment', 0.95],
    [/\bconcert\b|live\s*music|live\s*band|dj\s*party|edm|stage\s*show/i,      'entertainment', 0.93],
    [/\bparty\b|night\s*market|walking\s*street|water\s*park|amusement/i,        'entertainment', 0.91],
    [/petanque|ເປຕັງ|football\s*(?:match|game)|swimming\s*pool|สระว่ายน้ำ/i,       'entertainment', 0.91],
    [/lottery|lotto|ຊື້ເລກ|ຫວຍ|หวย|ลอตเตอรี่|scratch\s*card|ຂູດ/i,               'entertainment', 0.95],

    // ══ SUBSCRIPTIONS ════════════════════════════════════════════
    [/netflix|spotify|youtube\s*premium|disney\s*\+?|icloud/i,                     'subscriptions', 0.98],
    [/google\s*one|apple\s*one|line\s*tv|wetv|\bviu\b|canva/i,                   'subscriptions', 0.97],
    [/ສະໝັກ(?:\s*ລາຍ)?|ຕໍ່ອາຍຸ|auto\s*renew|monthly\s*sub/i,                    'subscriptions', 0.93],
    [/openai|chatgpt|anthropic|\bclaude\b|midjourney|github\s*copilot|\bapi\b.*subscr/i, 'subscriptions', 0.96],

    // ══ HOUSEHOLD ════════════════════════════════════════════════
    [/ຂອງໃຊ້ເຮືອນ|ຂອງໃຊ້|ນ້ຳຢາ|ຜ້າທຳຄວາມ/i,                                        'household',     0.95],
    [/detergent|cleaning|tissue|shampoo|\bsoap\b|toothpaste|floor\s*cleaner/i,    'household',     0.93],
    [/\bfan\b(?!\s*page)|rice\s*cooker|furniture|ເຄື່ອງໃຊ້ຟ້າ/i,                'household',     0.90],

    // ══ HEALTH — hospitals + medicine ════════════════════════════
    [/ໂຮງໝໍ|mahosot|setthathirath|mittaphab|hong\s*mo\s*150|hamesa/i,              'health',        0.98],
    [/\b(kasemrad|alliance\s*clinic|french\s*clinic|asean\s*hospital)\b/i,       'health',        0.97],
    [/ຮ້ານຂາຍຢາ|ຄລີນິກ|\bຢາ\b|ໝໍ(?!ລຳ)|pharmacy|clinic|\bdoctor\b/i,           'health',        0.96],
    [/paracetamol|sara\b|tiffy|decolgen|ibuprofen|amoxicillin|antibiotic/i,         'health',        0.95],
    [/dental|tooth|ຖອນແຂ້ວ|ດັດແຂ້ວ|braces|ໝໍແຂ້ວ|ขูดหินปูน/i,                     'health',        0.95],
    [/x-ray|ultrasound|mri|ct\s*scan|lab\s*test|blood\s*test|vaccine/i,           'health',        0.95],
    [/glasses|contact\s*lens|ແວ່ນຕາ|optic|eye\s*(?:care|clinic|drop)/i,           'health',        0.94],
    [/traditional\s*medicine|herbal|ຢາພື້ນເມືອງ|ຢາສະໝຸນໄພ|ยาสมุนไพร/i,            'health',        0.93],
    [/hospital|\bmedical\b|\bmedicine\b|ຢາ|surgery|pregnant|maternity/i,         'health',        0.92],

    // ══ BEAUTY ════════════════════════════════════════════════════
    [/ຕັດຜົມ|ເສີມສວຍ|ທາເລັບ|ทำผม|ตัดผม|ทำเล็บ/i,                                   'beauty',        0.95],
    [/salon|\bspa\b|haircut|\bnail\b|facial|skincare|sauna|ōb\s*aiy/i,          'beauty',        0.93],
    [/massage|ນວດ(?!ບຳ)|nuat(?!\s*bam)|โรงนวด|นวดแผนไทย/i,                        'beauty',        0.91],

    // ══ FITNESS ════════════════════════════════════════════════════
    [/\bgolf\b|\bgym\b|ອອກກຳລັງ|fitness|yoga|ฟิตเนส|กีฬา/i,                    'fitness',       0.95],
    [/badminton|football|futsal|\bswim|running|jogging|sa\s*loy\s*nam/i,          'fitness',       0.93],
    [/massage\s*therapy|nuat\s*bam|physiotherapy|ກາຍະພາບ/i,                       'fitness',       0.91],

    // ══ TRAVEL ════════════════════════════════════════════════════
    [/\bflight\b|\bhotel\b|ໂຮງແຮມ|ທ່ອງທ່ຽວ|wattay|lao\s*airlines/i,           'travel',        0.95],
    [/resort|booking|vacation|\btur\b|tour\s*package|เที่ยว|โรงแรม/i,              'travel',        0.93],

    // ══ SHOPPING ════════════════════════════════════════════════
    [/icon\s*mall|vientiane\s*center|miniso|\bcaddi\b|talat\s*sao/i,            'shopping',      0.96],
    [/ຊື້ເຄື່ອງ|shopee|lazada|clothes|shirt|\bbag\b|\bmall\b|electronics/i,          'shopping',      0.93],
    [/delivery|shipping|ຄ່າສົ່ງ|ຄ່າເຄື່ອງ|ค่าส่ง|ค่าจัดส่ง|grab\s*express|lalamove/i, 'shopping', 0.93],

    // ══ GAMING ════════════════════════════════════════════════════
    [/steam|playstation|\bps[45]\b|xbox|roblox|pubg|garena|free\s*fire/i,         'gaming',        0.97],
    [/top\s*up\s*game|เติมเกม|game\s*coin|in-game|rov|mobile\s*legend/i,         'gaming',        0.95],
    [/\bgame\b|\bgaming\b|\bເກມ\b|\bเกม\b/i,                                  'gaming',        0.88],

    // ══ EDUCATION ════════════════════════════════════════════════
    [/ຄ່າຮຽນ|ໂຮງຮຽນ|\bຮຽນ\b|ค่าเรียน|เรียน|โรงเรียน/i,                            'education',     0.95],
    [/school|university|college|course|tuition|workshop|\bbook\b|ໜັງສື/i,          'education',     0.93],
  ];

  // ── Income/expense type detection ─────────────────────────
  const INCOME_CATS = new Set(['salary','freelance','selling','bonus','investment']);
  const detectType = (line, category) => {
    if (INCOME_CATS.has(category)) return 'income';
    if (/ໄດ້ຮັບ|ຮັບ(?:ເງິນ)|ເງິນເຂົ້າ|ໂອນເຂົ້າ|รับ|เงินเข้า|received|incoming|earned|refund/i.test(line)) return 'income';
    return 'expense';
  };

  // ── Levenshtein distance (for Latin-script fuzzy matching) ──
  const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, (_, i) => i);
    for (let j = 1; j <= n; j++) {
      let prev = dp[0];
      dp[0] = j;
      for (let i = 1; i <= m; i++) {
        const tmp = dp[i];
        dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]);
        prev = tmp;
      }
    }
    return dp[m];
  };

  // ── Fuzzy keyword dictionary (Latin-only, high-value words) ─
  const FUZZY_WORDS = {
    coffee:'coffee',cafe:'coffee',latte:'coffee',espresso:'coffee',cappuccino:'coffee',americano:'coffee',starbucks:'coffee',
    beer:'drinks',whisky:'drinks',whiskey:'drinks',vodka:'drinks',cocktail:'drinks',soju:'drinks',
    gas:'transport',fuel:'transport',taxi:'transport',parking:'transport',gasoline:'transport',diesel:'transport',petrol:'transport',
    grocery:'groceries',groceries:'groceries',supermarket:'groceries',market:'groceries',
    restaurant:'food',breakfast:'food',lunch:'food',dinner:'food',pizza:'food',burger:'food',sushi:'food',noodle:'food',chicken:'food',steak:'food',
    hotel:'travel',flight:'travel',resort:'travel',vacation:'travel',booking:'travel',
    shopping:'shopping',clothes:'shopping',electronics:'shopping',delivery:'shopping',shipping:'shopping',
    netflix:'subscriptions',spotify:'subscriptions',subscription:'subscriptions',youtube:'subscriptions',
    pharmacy:'health',hospital:'health',medicine:'health',clinic:'health',dental:'health',
    salon:'beauty',haircut:'beauty',massage:'beauty',skincare:'beauty',
    gym:'fitness',yoga:'fitness',badminton:'fitness',football:'fitness',
    karaoke:'entertainment',cinema:'entertainment',movie:'entertainment',concert:'entertainment',bowling:'entertainment',lottery:'entertainment',
    rent:'rent',apartment:'rent',
    electricity:'utilities',water:'utilities',trash:'utilities',garbage:'utilities',
    repair:'repair',mechanic:'repair',
    school:'education',university:'education',tuition:'education',course:'education',
  };

  // ── Category detection ─────────────────────────────────────
  const detectCategory = (line) => {
    // Exact regex match (fast, high confidence)
    for (const [pattern, cat, conf] of CAT_RULES) {
      if (pattern.test(line)) return { category: cat, confidence: conf };
    }
    // Fuzzy fallback — Latin words only
    const words = line.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length >= 3);
    for (const word of words) {
      if (word.length <= 5) {
        // Exact match only for short words (too many near-neighbors for fuzzy)
        if (FUZZY_WORDS[word]) return { category: FUZZY_WORDS[word], confidence: 0.65 };
      } else {
        // Fuzzy match (distance 1) for longer words
        for (const [target, cat] of Object.entries(FUZZY_WORDS)) {
          if (Math.abs(word.length - target.length) > 1) continue;
          if (levenshtein(word, target) <= 1) return { category: cat, confidence: 0.65 };
        }
      }
    }
    return { category: 'other', confidence: 0.40 };
  };

  // ── Clean description ──────────────────────────────────────
  const cleanDesc = (line, matchText, category) => {
    const d = (line||'')
      .replace(matchText||'', '')
      .replace(/[฿$₭]/g, '')
      .replace(/\b(lak|kip|thb|baht|usd|dollar|ກີບ|ບາດ|บาท)\b/gi, '')
      .replace(/\b(k|m|ພັນ|ແສນ|ລ້ານ|พัน|แสน|ล้าน)\b/gi, '')
      .replace(/\s+/g,' ').trim()
      .replace(/^[-–,.\s]+|[-–,.\s]+$/g,'').trim()
      .slice(0,45);
    return d || category;
  };

  // ── Parse single line ──────────────────────────────────────
  const parseSingle = (line) => {
    const t = (line||'').trim();
    if (!t) return null;
    const amnt = extractAmount(t);
    if (!amnt) return null;
    const { category, confidence: catConf } = detectCategory(t);
    const currency = detectCurrency(t, amnt.val);
    const type = detectType(t, category);
    const description = cleanDesc(t, amnt.matchText, category);
    // Confidence: base + amount quality + category certainty
    let conf = 0.42;
    if (amnt.hasScale) conf += 0.12;
    if (amnt.val > 1000) conf += 0.05;
    if (category !== 'other') conf += Math.min(0.30, (catConf - 0.88) * 2 + 0.20);
    conf = Math.min(0.97, Math.max(0.25, parseFloat(conf.toFixed(2))));
    return { amount: amnt.val, currency, type, category, description, confidence: conf };
  };

  // ── Multi-line handling ────────────────────────────────────
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 1) return parseSingle(lines[0]);

  const parsed = lines.map(parseSingle).filter(Boolean);
  if (!parsed.length) return null;

  // Dominant currency (most frequent)
  const currCount = {};
  parsed.forEach(p => currCount[p.currency] = (currCount[p.currency]||0) + 1);
  const currency = Object.entries(currCount).sort((a,b) => b[1]-a[1])[0][0];
  const sameC = parsed.filter(p => p.currency === currency);
  const total = sameC.reduce((s,p) => s+p.amount, 0);

  // Dominant category
  const catCount = {};
  sameC.forEach(p => catCount[p.category] = (catCount[p.category]||0)+1);
  const category = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0][0] || 'food';
  const type = sameC.filter(p => p.type==='income').length > sameC.length/2 ? 'income' : 'expense';

  return {
    amount: total,
    currency,
    type,
    category,
    description: sameC.length <= 3
      ? sameC.map(p => p.description).join(', ')
      : `${sameC.slice(0,3).map(p => p.description).join(', ')} +${sameC.length-3}`,
    confidence: 0.92,
    items: sameC.map(p => ({ name: p.description, amount: p.amount })),
  };
};

export const parseWithAI=async(text,customCatIds=[],userId=null)=>{
  if(userId){
    try{
      const memory=await dbCheckMemory(userId,text);
      if(memory&&memory.usage_count>=2){
        const local=localParse(text);
        return{amount:local?.amount||0,currency:local?.currency||"LAK",type:memory.type||"expense",
          category:normalizeCategory(memory.category_name,"expense"),
          description:local?.description||text.slice(0,40),confidence:0.95,source:"memory"};
      }
    }catch{}
  }
  const local=localParse(text);
  if(local&&local.confidence>=0.88){
    return{...local,category:normalizeCategory(local.category,local.type),source:"local"};
  }
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    const res=await fetch("https://api.phajot.com/parse",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,userId}),signal:controller.signal,
    });
    clearTimeout(timeout);
    const parsed=await res.json();
    if(parsed&&parsed.amount){
      parsed.category=normalizeCategory(parsed.category,parsed.type);
      parsed.source="haiku";
      if(userId){dbSaveMemory(userId,text,parsed.category,parsed.type,parsed.confidence).catch(()=>{});}
      return parsed;
    }
    throw new Error("No amount");
  }catch{
    if(local)return{...local,category:normalizeCategory(local.category,local.type),source:"local_fallback"};
    const numMatch=text.match(/[\d,]+(?:\.\d+)?/);
    const amount=numMatch?parseFloat(numMatch[0].replace(/,/g,"")):0;
    const currency=/THB|baht|บาท/i.test(text)?"THB":/USD|dollar|\$/i.test(text)?"USD":"LAK";
    const type=/income|salary|เงินเดือน|ເງິນເດືອນ/i.test(text)?"income":"expense";
    return{amount,currency,type,category:type==="income"?"salary":"other",description:text.slice(0,40),confidence:0.35,source:"regex"};
  }
};
