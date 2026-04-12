// Category data and helpers. Extracted from App.jsx in Session 7.

export const DEFAULT_EXPENSE_CATS = [
  // ── Daily food & drink ──────────────────────────────────────
  {id:"food",          emoji:"🍜",en:"Food",             lo:"ອາຫານ",        th:"อาหาร"},
  {id:"groceries",     emoji:"🛒",en:"Groceries",        lo:"ຊື້ຂອງກິນ",    th:"ของชำ"},
  {id:"drinks",        emoji:"🍺",en:"Drinks",           lo:"ເຄື່ອງດື່ມ",   th:"เครื่องดื่ม"},
  {id:"coffee",        emoji:"☕",en:"Coffee / Cafe",    lo:"ກາເຟ",         th:"กาแฟ"},
  // ── Getting around ─────────────────────────────────────────
  {id:"transport",     emoji:"🛵",en:"Transport",        lo:"ຂົນສົ່ງ",      th:"เดินทาง"},
  {id:"travel",        emoji:"✈️",en:"Travel",           lo:"ທ່ອງທ່ຽວ",     th:"ท่องเที่ยว"},
  // ── Home & bills ───────────────────────────────────────────
  {id:"rent",          emoji:"🏠",en:"Housing / Rent",  lo:"ທີ່ພັກ",        th:"ที่พัก"},
  {id:"utilities",     emoji:"💡",en:"Utilities",        lo:"ຄ່ານ້ຳ-ໄຟ",    th:"สาธารณูปโภค"},
  {id:"phone_internet",emoji:"📱",en:"Phone & Internet", lo:"ຄ່າໂທ/ເນັດ",   th:"ค่าโทร/เน็ต"},
  {id:"household",     emoji:"🏡",en:"Household",        lo:"ຂອງໃຊ້ເຮືອນ",  th:"ของใช้ในบ้าน"},
  // ── Personal spending ──────────────────────────────────────
  {id:"shopping",      emoji:"🛍️",en:"Shopping",        lo:"ຊື້ເຄື່ອງ",    th:"ช้อปปิ้ง"},
  {id:"health",        emoji:"💊",en:"Health",           lo:"ສຸຂະພາບ",      th:"สุขภาพ"},
  {id:"beauty",        emoji:"💇",en:"Beauty",           lo:"ຄວາມງາມ",      th:"ความงาม"},
  {id:"fitness",       emoji:"🏋️",en:"Fitness",         lo:"ອອກກຳລັງ",     th:"ออกกำลัง"},
  // ── Fun & leisure ──────────────────────────────────────────
  {id:"entertainment", emoji:"🎉",en:"Entertainment",   lo:"ບັນເທີງ",      th:"บันเทิง"},
  {id:"subscriptions", emoji:"📺",en:"Subscriptions",   lo:"ສະໝັກລາຍການ",  th:"สมาชิกรายเดือน"},
  {id:"gaming",        emoji:"🎮",en:"Gaming",           lo:"ເກມ",           th:"เกม"},
  // ── Growth & family ────────────────────────────────────────
  {id:"education",     emoji:"📚",en:"Education",        lo:"ການສຶກສາ",     th:"การศึกษา"},
  {id:"family",        emoji:"👨‍👩‍👧",en:"Family",        lo:"ຄອບຄົວ",       th:"ครอบครัว"},
  // ── Culture & community ────────────────────────────────────
  {id:"donation",      emoji:"🙏",en:"Donation / Merit", lo:"ເຮັດບຸນ",      th:"ทำบุญ"},
  // ── Financial obligations ──────────────────────────────────
  {id:"debt_payment",  emoji:"💳",en:"Debt Payment",    lo:"ຊຳລະໜີ້",      th:"ชำระหนี้"},
  {id:"fees",          emoji:"🏦",en:"Fees & Charges",   lo:"ຄ່າທຳນຽມ",    th:"ค่าธรรมเนียม"},
  {id:"repair",        emoji:"🔧",en:"Repair",           lo:"ຄ່າຊ່ອມ",      th:"ค่าซ่อม"},
  // ── Catch-all ──────────────────────────────────────────────
  {id:"other",         emoji:"📦",en:"Other",            lo:"ອື່ນໆ",         th:"อื่นๆ"},
];
export const DEFAULT_INCOME_CATS = [
  {id:"salary",    emoji:"💼",en:"Salary",     lo:"ເງິນເດືອນ", th:"เงินเดือน"},
  {id:"freelance", emoji:"💰",en:"Freelance",  lo:"ຟຣີແລນ",    th:"ฟรีแลนซ์"},
  {id:"selling",   emoji:"💵",en:"Selling",    lo:"ຂາຍ",       th:"ขาย"},
  {id:"gift",      emoji:"🎁",en:"Gift",       lo:"ຂອງຂວັນ",   th:"ของขวัญ"},
  {id:"investment",emoji:"📈",en:"Investment", lo:"ການລົງທຶນ",  th:"การลงทุน"},
  {id:"bonus",     emoji:"🎯",en:"Bonus",      lo:"ໂບນັດ",     th:"โบนัส"},
  {id:"transfer",  emoji:"🏧",en:"Transfer",   lo:"ໂອນເງິນ",   th:"โอนเงิน"},
  {id:"other_inc", emoji:"📦",en:"Other",      lo:"ອື່ນໆ",      th:"อื่นๆ"},
];

export const catLabel=(cat,lang)=>(lang==="lo"?cat.lo:lang==="th"?cat.th:cat.en)||cat.en;
export const buildAllCats=(customCats=[])=>[...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS,...customCats];
export const findCat=(id,customCats=[])=>buildAllCats(customCats).find(c=>c.id===id)||DEFAULT_EXPENSE_CATS[0];

export const normalizeCategory=(cat,type)=>{
  const m={
    // Self-mappings: canonical IDs pass through unchanged.
    // Keep alias-to-ID entries in the dedicated section blocks below.
    // Adding a key in both places is safe (JS silent overwrite with
    // same value) but creates a latent footgun — audit rejects it.
    drinks:"drinks",transport:"transport",travel:"travel",rent:"rent",
    phone_internet:"phone_internet",household:"household",
    health:"health",beauty:"beauty",fitness:"fitness",
    subscriptions:"subscriptions",gaming:"gaming",
    family:"family",donation:"donation",
    debt_payment:"debt_payment",fees:"fees",repair:"repair",
    freelance:"freelance",selling:"selling",bonus:"bonus",other_inc:"other_inc",
    // ── Food ──────────────────────────────────────────────────
    food:"food",eating:"food",restaurant:"food",dining:"food",
    lunch:"food",dinner:"food",breakfast:"food",meal:"food",
    rice:"food",noodle:"food",pho:"food",bbq:"food",
    ເຂົ້າ:"food",ເຂົ້າປຽກ:"food",ອາຫານ:"food",ກິນ:"food",
    ຕຳ:"food",ເຝີ:"food",ລາບ:"food",laap:"food",larb:"food",
    // ── Groceries ─────────────────────────────────────────────
    groceries:"groceries",grocery:"groceries",supermarket:"groceries",
    "fresh market":"groceries","villa market":"groceries",
    "that luang market":"groceries","t-mart":"groceries",
    ຊື້ຂອງ:"groceries",ຊື້ຂອງກິນ:"groceries",talat:"groceries",
    // ── Drinks ────────────────────────────────────────────────
    beer:"drinks",alcohol:"drinks",wine:"drinks","beer lao":"drinks",
    whiskey:"drinks",whisky:"drinks",drinking:"drinks",vodka:"drinks",
    ດື່ມ:"drinks",ເຫຼົ້າ:"drinks","lao lao":"drinks",ລາວລາວ:"drinks",
    // ── Coffee ────────────────────────────────────────────────
    coffee:"coffee",cafe:"coffee",กาแฟ:"coffee",ກາເຟ:"coffee",
    latte:"coffee",espresso:"coffee",joma:"coffee",
    // ── Transport ─────────────────────────────────────────────
    taxi:"transport",grab:"transport",uber:"transport",loca:"transport",
    indrive:"transport",bus:"transport",fuel:"transport",gas:"transport",
    petrol:"transport",tuk:"transport",ນ້ຳມັນ:"transport",
    // ── Travel ────────────────────────────────────────────────
    flight:"travel",hotel:"travel",trip:"travel",
    vacation:"travel",holiday:"travel",resort:"travel",ທ່ອງທ່ຽວ:"travel",
    // ── Housing (id="rent") ───────────────────────────────────
    housing:"rent",apartment:"rent",room:"rent",
    ຄ່າເຊົ່າ:"rent",ເຊົ່າ:"rent",ທີ່ພັກ:"rent",
    // ── Utilities ─────────────────────────────────────────────
    utilities:"utilities",electricity:"utilities",electric:"utilities",
    edl:"utilities","nam papa":"utilities",
    ຄ່າໄຟ:"utilities",ໄຟຟ້າ:"utilities",ຄ່ານ້ຳ:"utilities",ນ້ຳປະປາ:"utilities",
    // ── Phone & Internet ──────────────────────────────────────
    "phone internet":"phone_internet",phone:"phone_internet",
    mobile:"phone_internet",topup:"phone_internet","top-up":"phone_internet",
    unitel:"phone_internet",etl:"phone_internet",ltc:"phone_internet",
    internet:"phone_internet",wifi:"phone_internet",
    ຄ່າໂທ:"phone_internet",ຄ່າໂທລະສັບ:"phone_internet",ຄ່າເນັດ:"phone_internet",ເຕີມ:"phone_internet",
    // ── Household ─────────────────────────────────────────────
    cleaning:"household",detergent:"household",furniture:"household",appliance:"household",
    ຂອງໃຊ້:"household",ຂອງໃຊ້ເຮືອນ:"household",
    // ── Shopping ──────────────────────────────────────────────
    shopping:"shopping",clothes:"shopping",shop:"shopping",
    bag:"shopping",caddie:"shopping",caddy:"shopping",mall:"shopping",
    // ── Health ────────────────────────────────────────────────
    medical:"health",doctor:"health",medicine:"health",hospital:"health",
    clinic:"health",pharmacy:"health",ໂຮງໝໍ:"health",ຢາ:"health",
    // ── Beauty ────────────────────────────────────────────────
    salon:"beauty",haircut:"beauty",nail:"beauty",spa:"beauty",ຕັດຜົມ:"beauty",
    // ── Fitness ───────────────────────────────────────────────
    gym:"fitness",sport:"fitness",exercise:"fitness",
    golf:"fitness",swimming:"fitness",yoga:"fitness",ອອກກຳລັງ:"fitness",
    // ── Entertainment ─────────────────────────────────────────
    entertainment:"entertainment",movie:"entertainment",concert:"entertainment",
    event:"entertainment",party:"entertainment",festival:"entertainment",
    karaoke:"entertainment",ktv:"entertainment","mor lam":"entertainment",morlam:"entertainment",ມໍລຳ:"entertainment",
    // ── Subscriptions ─────────────────────────────────────────
    subscription:"subscriptions",netflix:"subscriptions",spotify:"subscriptions",
    youtube:"subscriptions",disney:"subscriptions",icloud:"subscriptions",ສະໝັກ:"subscriptions",
    // ── Gaming ────────────────────────────────────────────────
    game:"gaming",games:"gaming",steam:"gaming",playstation:"gaming",xbox:"gaming",ເກມ:"gaming",
    // ── Education ─────────────────────────────────────────────
    education:"education",school:"education",book:"education",course:"education",
    tuition:"education",ຮຽນ:"education",
    // ── Family ────────────────────────────────────────────────
    parents:"family",mom:"family",dad:"family",kids:"family",children:"family",baby:"family",
    ຄອບຄົວ:"family",ພໍ່ແມ່:"family",ລູກ:"family","ໃຫ້ພໍ່":"family","ໃຫ້ແມ່":"family",ສົ່ງໃຫ້:"family",
    // ── Donation ──────────────────────────────────────────────
    donate:"donation",temple:"donation",merit:"donation",charity:"donation",monk:"donation",
    ເຮັດບຸນ:"donation",ໃສ່ບາດ:"donation",ວັດ:"donation",ຖວາຍ:"donation",ທຳທານ:"donation",ທານ:"donation",ບໍລິຈາກ:"donation",
    // ── Debt Payment ──────────────────────────────────────────
    debt:"debt_payment",loan:"debt_payment",installment:"debt_payment",repayment:"debt_payment",
    ຜ່ອນ:"debt_payment",ໜີ້:"debt_payment",ກູ້:"debt_payment",ໃຊ້ໜີ້:"debt_payment",ຊຳລະ:"debt_payment",
    // ── Fees ──────────────────────────────────────────────────
    fee:"fees",charge:"fees","atm fee":"fees","transfer fee":"fees","bank fee":"fees",
    ຄ່າທຳນຽມ:"fees",ຄ່າບໍລິການ:"fees",
    // ── Repair ────────────────────────────────────────────────
    fix:"repair",maintenance:"repair",mechanic:"repair",
    ຊ່ອມ:"repair",ສ້ອມ:"repair",ແກ້:"repair",
    // ── Income ────────────────────────────────────────────────
    salary:"salary",wage:"salary",paycheck:"salary",payroll:"salary",
    เงินเดือน:"salary",ເງິນເດືອນ:"salary",
    commission:"freelance",ຄ່າຈ້າງ:"freelance",ຮັບຈ້າງ:"freelance",
    sale:"selling",sold:"selling",sell:"selling",ຂາຍ:"selling",ຂາຍເຄື່ອງ:"selling",
    gift:"gift",ຂອງຂວັນ:"gift",award:"bonus",ໂບນັດ:"bonus",
    investment:"investment",invest:"investment",dividend:"investment",ລົງທຶນ:"investment",ຫຸ້ນ:"investment",
    transfer:"transfer",received:"transfer",ໂອນ:"transfer",
    income:type==="income"?"salary":"other",
    other:type==="income"?"other_inc":"other",
  };
  return m[cat?.toLowerCase()]||(type==="income"?"salary":"food");
};
