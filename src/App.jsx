/**
 * PHANOTE — App.jsx (fixed)
 * Budget feature: SetBudgetModal + BudgetScreen moved OUTSIDE App()
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

const signInWithPhone = async (phone, countryCode) => {
  const cleaned = phone.replace(/\D/g, "");
  const fullPhone = countryCode + cleaned;
  const email = `${countryCode.replace("+","")}${cleaned}@phanote.app`;
  const password = `Ph4n0te${cleaned}X`;
  const { data: si } = await supabase.auth.signInWithPassword({ email, password });
  if (si?.user) return { user: si.user, isNew: false, phone: fullPhone, countryCode };
  const { data: su, error } = await supabase.auth.signUp({ email, password });
  if (su?.user) return { user: su.user, isNew: true, phone: fullPhone, countryCode };
  throw new Error(error?.message || "Auth failed");
};

// ─── AI MEMORY HELPERS ───────────────────────────────────────
const dbCheckMemory = async (userId, pattern) => {
  const key = pattern.toLowerCase()
    .replace(/[\d,]+(?:\.\d+)?(k|m)?/gi, "")
    .replace(/lak|thb|usd|baht|บาท|กีบ|kip/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, 50);
  if (!key) return null;
  const { data } = await supabase.from("ai_memory")
    .select("*")
    .ilike("input_pattern", `%${key}%`)
    .order("usage_count", { ascending: false })
    .limit(1);
  return data?.[0] || null;
};

const dbSaveMemory = async (userId, pattern, categoryName, type, confidence) => {
  const key = pattern.toLowerCase()
    .replace(/[\d,]+(?:\.\d+)?(k|m)?/gi, "")
    .replace(/lak|thb|usd|baht|บาท|กีบ|kip/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, 50);
  if (!key || key.length < 2) return;
  const { data: existing } = await supabase.from("ai_memory")
    .select("id, usage_count")
    .eq("user_id", userId)
    .eq("input_pattern", key)
    .single();
  if (existing) {
    await supabase.from("ai_memory")
      .update({ usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_memory").insert({
      user_id: userId, input_pattern: key, category_name: categoryName,
      type, confidence, usage_count: 1,
    });
  }
};

const dbUpsertProfile = async (userId, p) => {
  await supabase.from("profiles").upsert({
    id: userId, display_name: p.name, language: p.lang || "en",
    base_currency: p.baseCurrency || "LAK", onboarding_complete: true,
    phone: p.phone || null, phone_country_code: p.countryCode || null,
    avatar: p.avatar || "🦫", custom_categories: p.customCategories || [],
    exp_cats: p.expCats || [], inc_cats: p.incCats || [],
    last_seen_at: new Date().toISOString(), app_version: "1.0.0",
  }, { onConflict: "id" });
};

const dbTrackEvent = async (userId, eventType, eventData = {}) => {
  try {
    await supabase.from("app_events").insert({
      user_id: userId, event_type: eventType, event_data: eventData,
      app_version: "1.0.0", platform: "web",
    });
  } catch {}
};

const dbInsertTransaction = async (userId, tx) => {
  const { data, error } = await supabase.from("transactions").insert({
    user_id: userId, amount: tx.amount, currency: tx.currency, type: tx.type,
    description: tx.description, date: tx.date, source: "web",
    ai_confidence: tx.confidence || null, note: tx.note || null,
    category_name: tx.categoryName || null, category_emoji: tx.categoryEmoji || null,
    raw_input: tx.rawInput || null, is_deleted: false,
  }).select().single();
  if (error) throw error;
  return data;
};

const dbUpdateTransaction = async (txId, updates) => {
  await supabase.from("transactions").update(updates).eq("id", txId);
};

// ─── THEME & CONSTANTS ────────────────────────────────────────
const T = {
  celadon:"#ACE1AF", bg:"#F7FCF5", surface:"rgba(255,255,255,0.92)",
  dark:"#2D2D3A", muted:"#9B9BAD",
  shadow:"0 4px 24px rgba(45,45,58,0.07)", shadowLg:"0 12px 40px rgba(45,45,58,0.13)",
};
const CURR = {
  LAK:{symbol:"₭",name:"Lao Kip",  bg:"linear-gradient(145deg,#FFE27D,#FFAA5E)",pill:"#FFAA5E",pillText:"#7A3E00"},
  THB:{symbol:"฿",name:"Thai Baht", bg:"linear-gradient(145deg,#C9B8FF,#A8C5FF)",pill:"#C9B8FF",pillText:"#3A2A7A"},
  USD:{symbol:"$",name:"US Dollar", bg:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",pill:"#ACE1AF",pillText:"#1A4D2B"},
};
const fmt=(n,c)=>{const{symbol}=CURR[c];if(c==="LAK")return`${symbol}${Math.round(n).toLocaleString()}`;return`${symbol}${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",")}`};
const fmtCompact=(n,c)=>{if(c==="LAK"){if(n>=1e6)return`₭${(n/1e6).toFixed(1)}M`;if(n>=1e3)return`₭${(n/1e3).toFixed(0)}K`;return`₭${Math.round(n)}`}const s=CURR[c].symbol;return n>=1000?`${s}${(n/1000).toFixed(1)}K`:`${s}${Number(n).toFixed(2)}`};
const AVATARS=["🦫","🐱","🦝","🦦","🦊","🔮","🐨","🦔","🐸","🐼"];
const EMOJI_PICKS=["🍜","🍺","☕","🛵","🚗","✈️","🏠","💡","🛍️","👗","💊","🏋️","🎉","🎤","🎮","📚","💇","🎁","💼","💰","📈","💵","🏧","📦","🌟","🎯","🏌️","🎵","🏖️","🐾"];

// ─── DEFAULT CATEGORIES ───────────────────────────────────────
const DEFAULT_EXPENSE_CATS = [
  {id:"food",       emoji:"🍜",en:"Food",          lo:"ອາຫານ",    th:"อาหาร"},
  {id:"drinks",     emoji:"🍺",en:"Drinks",         lo:"ເຄື່ອງດື່ມ", th:"เครื่องดื่ม"},
  {id:"coffee",     emoji:"☕",en:"Coffee",         lo:"ກາເຟ",     th:"กาแฟ"},
  {id:"transport",  emoji:"🛵",en:"Transport",      lo:"ຂົນສົ່ງ",   th:"เดินทาง"},
  {id:"travel",     emoji:"✈️",en:"Travel",         lo:"ການທ່ອງທ່ຽວ",th:"ท่องเที่ยว"},
  {id:"rent",       emoji:"🏠",en:"Rent / Bills",   lo:"ຄ່າເຊົ່າ",  th:"ค่าเช่า"},
  {id:"shopping",   emoji:"🛍️",en:"Shopping",      lo:"ຊື້ເຄື່ອງ", th:"ช้อปปิ้ง"},
  {id:"health",     emoji:"💊",en:"Health",         lo:"ສຸຂະພາບ",   th:"สุขภาพ"},
  {id:"beauty",     emoji:"💇",en:"Beauty",         lo:"ຄວາມງາມ",   th:"ความงาม"},
  {id:"fitness",    emoji:"🏋️",en:"Fitness",        lo:"ອອກກຳລັງ",  th:"ออกกำลัง"},
  {id:"entertainment",emoji:"🎉",en:"Entertainment",lo:"ບັນເທີງ",   th:"บันเทิง"},
  {id:"gaming",     emoji:"🎮",en:"Gaming",         lo:"ເກມ",       th:"เกม"},
  {id:"education",  emoji:"📚",en:"Education",      lo:"ການສຶກສາ",  th:"การศึกษา"},
  {id:"other",      emoji:"📦",en:"Other",          lo:"ອື່ນໆ",     th:"อื่นๆ"},
];
const DEFAULT_INCOME_CATS = [
  {id:"salary",    emoji:"💼",en:"Salary",     lo:"ເງິນເດືອນ", th:"เงินเดือน"},
  {id:"freelance", emoji:"💰",en:"Freelance",  lo:"ຟຣີແລນ",    th:"ฟรีแลนซ์"},
  {id:"selling",   emoji:"💵",en:"Selling",    lo:"ຂາຍ",       th:"ขาย"},
  {id:"gift",      emoji:"🎁",en:"Gift",       lo:"ຂອງຂວັນ",   th:"ของขวัญ"},
  {id:"investment",emoji:"📈",en:"Investment", lo:"ການລົງທຶນ",  th:"การลงทุน"},
  {id:"bonus",     emoji:"🎯",en:"Bonus",      lo:"ໂບນັດ",     th:"โบนัส"},
  {id:"transfer",  emoji:"🏧",en:"Transfer",   lo:"ໂອນເງິນ",   th:"โอนเงิน"},
  {id:"other_inc", emoji:"📦",en:"Other",      lo:"ອື່ນໆ",      th:"อื่นๆ"},
];

const catLabel=(cat,lang)=>(lang==="lo"?cat.lo:lang==="th"?cat.th:cat.en)||cat.en;
const buildAllCats=(customCats=[])=>[...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS,...customCats];
const findCat=(id,customCats=[])=>buildAllCats(customCats).find(c=>c.id===id)||DEFAULT_EXPENSE_CATS[0];

const normalizeCategory=(cat,type)=>{
  const m={
    food:"food",eating:"food",restaurant:"food",lunch:"food",dinner:"food",
    breakfast:"food",meal:"food",rice:"food",noodle:"food",pho:"food",
    ເຂົ້າ:"food",ເຂົ້າປຽກ:"food",ອາຫານ:"food",
    beer:"drinks",alcohol:"drinks",wine:"drinks",lao:"drinks","beer lao":"drinks",
    whiskey:"drinks",drinking:"drinks",ດື່ມ:"drinks",
    coffee:"coffee",cafe:"coffee",กาแฟ:"coffee",ກາເຟ:"coffee",latte:"coffee",
    transport:"transport",taxi:"transport",grab:"taxi",uber:"transport",
    bus:"transport",fuel:"transport",gas:"transport",car:"transport",
    petrol:"transport",tuk:"transport",
    travel:"travel",flight:"travel",hotel:"travel",trip:"travel",
    vacation:"travel",holiday:"travel",
    rent:"rent",bills:"rent",utilities:"rent",housing:"rent",electric:"rent",
    water:"rent",internet:"rent",phone:"rent",electricity:"rent",
    shopping:"shopping",clothes:"shopping",shop:"shopping",market:"shopping",
    bag:"shopping",plastic:"shopping",grocery:"shopping",
    caddie:"shopping",caddy:"shopping",
    health:"health",medical:"health",doctor:"health",medicine:"health",hospital:"health",
    clinic:"health",pharmacy:"health",
    beauty:"beauty",salon:"beauty",haircut:"beauty",nail:"beauty",spa:"beauty",
    fitness:"fitness",gym:"fitness",sport:"fitness",exercise:"fitness",
    golf:"fitness",swimming:"fitness",yoga:"fitness",
    entertainment:"entertainment",movie:"entertainment",concert:"entertainment",
    event:"entertainment",party:"entertainment",festival:"entertainment",
    karaoke:"entertainment","mor lam":"entertainment",morlam:"entertainment",
    nightclub:"entertainment",bar:"entertainment",
    gaming:"gaming",game:"gaming",games:"gaming",
    education:"education",school:"education",book:"education",course:"education",
    salary:"salary",wage:"salary",paycheck:"salary",เงินเดือน:"salary",ເງິນເດືອນ:"salary",
    freelance:"freelance",commission:"freelance",
    selling:"selling",sale:"selling",sold:"selling",sell:"selling",ຂາຍ:"selling",
    gift:"gift",bonus:"bonus",award:"bonus",
    investment:"investment",invest:"investment",dividend:"investment",interest:"investment",
    transfer:"transfer",received:"transfer",
    other_inc:"other_inc",
    other:type==="income"?"other_inc":"other",
    income:type==="income"?"salary":"other",
  };
  return m[cat?.toLowerCase()]||(type==="income"?"salary":"food");
};

const store={
  get:(k)=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
  del:(k)=>{try{localStorage.removeItem(k);}catch{}},
};

// ─── LOCAL PARSER ─────────────────────────────────────────────
const localParse=(text)=>{
  const t=text.trim();
  const numMatch=t.match(/([\d,]+(?:\.?\d+)?)(k|K|m|M)?/);
  if(!numMatch)return null;
  let amount=parseFloat(numMatch[1].replace(/,/g,""));
  if(numMatch[2]?.toLowerCase()==="k")amount*=1000;
  if(numMatch[2]?.toLowerCase()==="m")amount*=1000000;
  if(!amount||amount<=0)return null;
  const currency=/THB|baht|บาท|฿/i.test(t)?"THB":/USD|dollar|usd/i.test(t)||t.includes("$")?"USD":"LAK";
  const type=/income|salary|เงินเดือน|ເງິນເດືອນ|freelance|ລາຍຮັບ|รายรับ|ຂາຍ|sell|sold|bonus|received|gift/i.test(t)?"income":"expense";
  let cat=null,confidence=0.5;
  if(/beer|alcohol|wine|lao\s*lao|ດື່ມ|เบียร์/i.test(t)){cat="drinks";confidence=0.95;}
  else if(/coffee|cafe|กาแฟ|ກາເຟ|starbucks|amazon\s*cafe/i.test(t)){cat="coffee";confidence=0.95;}
  else if(/grab|taxi|tuk|fuel|gas|petrol|bus|ລົດ|รถ/i.test(t)){cat="transport";confidence=0.92;}
  else if(/netflix|spotify|youtube|hbo|disney|apple|subscription/i.test(t)){cat="entertainment";confidence=0.90;}
  else if(/burger|pizza|kfc|mcdonalds|sushi|steak|restaurant/i.test(t)){cat="food";confidence=0.92;}
  else if(/golf|gym|sport|fitness|exercise|ອອກກຳລັງ/i.test(t)){cat="fitness";confidence=0.92;}
  else if(/karaoke|movie|concert|party|morlam|mor\s*lam/i.test(t)){cat="entertainment";confidence=0.92;}
  else if(/shop|market|clothes|bag|caddi|mall/i.test(t)){cat="shopping";confidence=0.88;}
  else if(/rent|electric|water|internet|bill|ຄ່າ/i.test(t)){cat="rent";confidence=0.90;}
  else if(/doctor|hospital|medicine|health|ໂຮງໝໍ/i.test(t)){cat="health";confidence=0.92;}
  else if(/salary|wage|เงินเดือน|ເງິນເດືອນ/i.test(t)){cat="salary";confidence=0.95;}
  else if(/sell|sold|ຂາຍ|sale/i.test(t)){cat="selling";confidence=0.90;}
  else if(/ເຂົ້າ|ອາຫານ|noodle|ข้าว|อาหาร|chicken|pork|food|eat|lunch|dinner|breakfast/i.test(t)){cat="food";confidence=0.90;}
  else{cat=type==="income"?"salary":"other";confidence=0.4;}
  const desc=t.replace(/([\d,]+(?:\.?\d+)?)(k|K|m|M)?/g,"")
    .replace(/LAK|THB|USD|baht|บาท|ກີບ|kip/gi,"")
    .replace(/\s+/g," ").trim().slice(0,40)||t.slice(0,40);
  return{amount,currency,type,category:cat,description:desc,confidence};
};

const parseWithAI=async(text,customCatIds=[],userId=null)=>{
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
    const res=await fetch("https://api.phanote.com/parse",{
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

// ─── I18N ─────────────────────────────────────────────────────
const i18n={
  en:{welcome:"Welcome to Phanote",tagline:"ພາໂນດ · พาโนด · Your money, your story",your_name:"Your name",pick_avatar:"Pick your companion",pick_lang:"Choose your language",pick_currency:"Your main currency",pick_expense_cats:"Select expense categories",pick_income_cats:"Select income categories",next:"Next →",start:"Start tracking! 🐾",morning:"Good morning",afternoon:"Good afternoon",evening:"Good evening",placeholder:'e.g. "coffee 45000 LAK" or "ເຂົ້າ 50,000" or "กาแฟ 95 บาท"',note_placeholder:"Add a note…",parsing:"Reading your transaction…",recent:"Recent",today:"Today",yesterday:"Yesterday",empty:"No transactions yet",empty_sub:"Type anything below to log your first one",home:"Home",analytics:"Analytics",budget:"Budget",settings:"Settings",coming_soon:"Coming in Phase 2",confirm_q:"Did you mean?",confirm_yes:"Yes, save it",confirm_edit:"Let me fix it",reset:"Reset app",reset_confirm:"This will clear all data. Are you sure?",language:"Language",base_currency:"Base Currency",add_note:"+ note",edit_note:"edit note",save:"Save",cancel:"Cancel",add_category:"Add category",category_name:"Category name",expense:"Expense",income:"Income",manage_cats:"Manage Categories"},
  lo:{welcome:"ຍິນດີຕ້ອນຮັບ Phanote",tagline:"ພາໂນດ — ຕິດຕາມການເງິນຂອງທ່ານ",your_name:"ຊື່ຂອງທ່ານ",pick_avatar:"ເລືອກໂຕລະຄອນ",pick_lang:"ເລືອກພາສາ",pick_currency:"ສະກຸນເງິນຫຼັກ",pick_expense_cats:"ເລືອກໝວດລາຍຈ່າຍ",pick_income_cats:"ເລືອກໝວດລາຍຮັບ",next:"ຕໍ່ໄປ →",start:"ເລີ່ມເລີຍ! 🐾",morning:"ສະບາຍດີຕອນເຊົ້າ",afternoon:"ສະບາຍດີຕອນທ່ຽງ",evening:"ສະບາຍດີຕອນແລງ",placeholder:"ເຊັ່ນ: ເຂົ້າປຽກ 50,000 LAK",note_placeholder:"ເພີ່ມໝາຍເຫດ…",parsing:"ກຳລັງວິເຄາະ…",recent:"ລ່າສຸດ",today:"ມື້ນີ້",yesterday:"ມື້ວານ",empty:"ຍັງບໍ່ມີລາຍການ",empty_sub:"ພິມດ້ານລຸ່ມເພື່ອບັນທຶກ",home:"ຫນ້າຫລັກ",analytics:"ວິເຄາະ",budget:"ງົບ",settings:"ຕັ້ງຄ່າ",coming_soon:"ມາໃນ Phase 2",confirm_q:"ຖືກຕ້ອງບໍ?",confirm_yes:"ຖືກ, ບັນທຶກ",confirm_edit:"ແກ້ໄຂ",reset:"ລ້າງຂໍ້ມູນ",reset_confirm:"ຈະລ້າງທຸກຂໍ້ມູນ. ແນ່ໃຈບໍ?",language:"ພາສາ",base_currency:"ສະກຸນເງິນຫຼັກ",add_note:"+ ໝາຍເຫດ",edit_note:"ແກ້ໄຂ",save:"ບັນທຶກ",cancel:"ຍົກເລີກ",add_category:"ເພີ່ມໝວດ",category_name:"ຊື່ໝວດ",expense:"ລາຍຈ່າຍ",income:"ລາຍຮັບ",manage_cats:"ຈັດການໝວດ"},
  th:{welcome:"ยินดีต้อนรับสู่ Phanote",tagline:"พาโนด — ติดตามการเงินของคุณ",your_name:"ชื่อของคุณ",pick_avatar:"เลือกตัวละคร",pick_lang:"เลือกภาษา",pick_currency:"สกุลเงินหลัก",pick_expense_cats:"เลือกหมวดรายจ่าย",pick_income_cats:"เลือกหมวดรายรับ",next:"ถัดไป →",start:"เริ่มเลย! 🐾",morning:"อรุณสวัสดิ์",afternoon:"สวัสดีตอนบ่าย",evening:"สวัสดีตอนเย็น",placeholder:"เช่น กาแฟ 95 บาท",note_placeholder:"เพิ่มหมายเหตุ…",parsing:"กำลังวิเคราะห์…",recent:"ล่าสุด",today:"วันนี้",yesterday:"เมื่อวาน",empty:"ยังไม่มีรายการ",empty_sub:"พิมพ์ด้านล่างเพื่อบันทึก",home:"หน้าหลัก",analytics:"วิเคราะห์",budget:"งบประมาณ",settings:"ตั้งค่า",coming_soon:"มาใน Phase 2",confirm_q:"ถูกต้องไหม?",confirm_yes:"ใช่ บันทึก",confirm_edit:"แก้ไข",reset:"ล้างข้อมูล",reset_confirm:"จะลบข้อมูลทั้งหมด ยืนยันไหม?",language:"ภาษา",base_currency:"สกุลเงินหลัก",add_note:"+ หมายเหตุ",edit_note:"แก้ไข",save:"บันทึก",cancel:"ยกเลิก",add_category:"เพิ่มหมวด",category_name:"ชื่อหมวด",expense:"รายจ่าย",income:"รายรับ",manage_cats:"จัดการหมวด"},
};
const t=(lang,key)=>i18n[lang]?.[key]||i18n.en[key]||key;

const TOASTS={
  expense:[(d,a,c)=>`${d} — ${fmt(a,c)} logged. Every kip tracked! 🐾`,(d,a,c)=>`${fmt(a,c)} out for ${d}. You're on it. ✨`,(d)=>`${d} done. Noted with care. 🌿`],
  income:[(d,a,c)=>`${fmt(a,c)} in! ${d} — let's track it well together. 💚`,(d,a,c)=>`${d} — +${fmt(a,c)} added. Money in! 🎉`],
};

// ─── UI PRIMITIVES ────────────────────────────────────────────
const AnimalBg=()=>(
  <div aria-hidden="true" style={{
    position:"fixed",inset:0,backgroundImage:"url('/bg-pattern.png')",
    backgroundSize:"420px 420px",backgroundRepeat:"repeat",opacity:0.18,
    mixBlendMode:"multiply",pointerEvents:"none",zIndex:0,
  }}/>
);

const Toast=({msg,onDone})=>{
  useEffect(()=>{const id=setTimeout(onDone,4500);return()=>clearTimeout(id);},[onDone]);
  return(<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(30,30,40,0.93)",backdropFilter:"blur(14px)",color:"#fff",borderRadius:18,padding:"12px 22px",fontSize:13,lineHeight:1.5,maxWidth:320,textAlign:"center",zIndex:999,boxShadow:"0 6px 28px rgba(0,0,0,0.22)",animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1)",fontFamily:"'Noto Sans',sans-serif"}}>{msg}</div>);
};

const Flag=({code,size=32})=>{
  const w=size,h=Math.round(size*0.67),r=Math.round(size*0.12);
  const flags={
    USD:(<svg width={w} height={h} viewBox="0 0 60 40">{[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i=><rect key={i} y={i*3.08} width="60" height="3.08" fill={i%2===0?"#B22234":"#fff"}/>)}<rect width="24" height="21.5" fill="#3C3B6E"/>{[[2,2],[6,2],[10,2],[14,2],[18,2],[4,4.5],[8,4.5],[12,4.5],[16,4.5],[2,7],[6,7],[10,7],[14,7],[18,7],[4,9.5],[8,9.5],[12,9.5],[16,9.5],[2,12],[6,12],[10,12],[14,12],[18,12],[4,14.5],[8,14.5],[12,14.5],[16,14.5],[2,17],[6,17],[10,17],[14,17],[18,17]].map(([x,y],i)=><circle key={i} cx={x+1.5} cy={y+1} r="0.9" fill="#fff"/>)}</svg>),
    THB:(<svg width={w} height={h} viewBox="0 0 60 40"><rect width="60" height="40" fill="#A51931"/><rect y="6.67" width="60" height="26.67" fill="#F4F5F8"/><rect y="13.33" width="60" height="13.33" fill="#2D2A4A"/></svg>),
    LAK:(<svg width={w} height={h} viewBox="0 0 60 40"><rect width="60" height="40" fill="#CE1126"/><rect y="10" width="60" height="20" fill="#002868"/><circle cx="30" cy="20" r="6.5" fill="#fff"/></svg>),
  };
  return(<div style={{width:w,height:h,borderRadius:r,overflow:"hidden",flexShrink:0,filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.15))",display:"inline-flex"}}>{flags[code]}</div>);
};

const S={title:{fontFamily:"'Noto Sans',sans-serif",fontSize:20,fontWeight:800,color:"#2D2D3A",marginBottom:6},sub:{fontSize:13,color:"#9B9BAD",marginBottom:16,lineHeight:1.5},label:{fontSize:13,fontWeight:700,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}};

// ═══ ONBOARDING ═══════════════════════════════════════════════
function OnboardingScreen({onComplete, onBack}){
  const[step,setStep]=useState(0);
  const[name,setName]=useState("");
  const[avatar,setAvatar]=useState("🦫");
  const[lang,setLang]=useState("en");
  const[baseCurrency,setBaseCurrency]=useState("LAK");
  const[expCats,setExpCats]=useState(DEFAULT_EXPENSE_CATS.map(c=>c.id));
  const[incCats,setIncCats]=useState(DEFAULT_INCOME_CATS.map(c=>c.id));
  const toggleCat=(id,list,setList)=>{if(list.includes(id)){if(list.length>1)setList(list.filter(x=>x!==id));}else setList([...list,id]);};
  const canAdvance=()=>step===0?name.trim().length>0:true;
  const advance=()=>{if(!canAdvance())return;if(step<4){setStep(step+1);return;}onComplete({name:name.trim(),avatar,lang,baseCurrency,expCats,incCats,customCategories:[]});};
  const LANGS=[{code:"lo",flag:"🇱🇦",label:"ລາວ"},{code:"th",flag:"🇹🇭",label:"ไทย"},{code:"en",flag:"🇬🇧",label:"English"}];
  const catBtnStyle=(on)=>({display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:14,border:"none",cursor:"pointer",background:on?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.05)",fontWeight:on?700:500,fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif",transition:"all .2s ease"});
  return(
    <div style={{minHeight:"100dvh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative",overflow:"hidden"}}>
      <AnimalBg/>
      <div style={{textAlign:"center",marginBottom:28,zIndex:1}}>
        <div style={{fontSize:44,lineHeight:1}}>📒</div>
        <div style={{fontFamily:"'Noto Sans',sans-serif",fontSize:30,fontWeight:800,color:T.dark,letterSpacing:-1,marginTop:6}}>Phanote</div>
        <div style={{fontSize:12,color:T.muted,marginTop:2}}>ພາໂນດ · พาโนด</div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:24,zIndex:1}}>
        {[0,1,2,3,4].map(i=><div key={i} style={{height:5,width:i===step?26:6,borderRadius:3,background:i<=step?T.celadon:"rgba(172,225,175,0.25)",transition:"all .35s cubic-bezier(.34,1.56,.64,1)"}}/>)}
      </div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:28,padding:"28px 24px",width:"100%",maxWidth:400,boxShadow:T.shadowLg,zIndex:1,maxHeight:"60vh",overflowY:"auto"}}>
        {step===0&&(<>
          {onBack&&(<button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,marginBottom:12,padding:0,fontFamily:"'Noto Sans',sans-serif",display:"flex",alignItems:"center",gap:4}}>← Back to phone login</button>)}
          <h2 style={S.title}>{t(lang,"welcome")}</h2>
          <p style={S.sub}>{t(lang,"tagline")}</p>
          <label style={S.label}>{t(lang,"your_name")}</label>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} placeholder="e.g. Kanya, Som, Alex" autoFocus style={{width:"100%",marginTop:8,padding:"13px 16px",borderRadius:14,border:`1.5px solid ${name.trim()?"#ACE1AF":"rgba(45,45,58,0.12)"}`,outline:"none",fontSize:15,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)",boxSizing:"border-box"}}/>
          <label style={{...S.label,marginTop:20}}>{t(lang,"pick_avatar")}</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
            {AVATARS.map(a=><button key={a} onClick={()=>setAvatar(a)} style={{width:52,height:52,borderRadius:16,border:"none",cursor:"pointer",fontSize:26,background:avatar===a?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",transform:avatar===a?"scale(1.15)":"scale(1)",boxShadow:avatar===a?"0 3px 12px rgba(172,225,175,0.4)":"none",transition:"all .2s ease"}}>{a}</button>)}
          </div>
        </>)}
        {step===1&&(<>
          <h2 style={S.title}>{t(lang,"pick_lang")}</h2>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            {LANGS.map(({code,flag,label})=><button key={code} onClick={()=>setLang(code)} style={{flex:1,padding:"16px 8px",borderRadius:18,border:"none",cursor:"pointer",background:lang===code?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(172,225,175,0.1)",transform:lang===code?"scale(1.06)":"scale(1)",boxShadow:lang===code?"0 4px 16px rgba(172,225,175,0.4)":"none",transition:"all .25s ease"}}>
              <div style={{fontSize:26}}>{flag}</div>
              <div style={{fontSize:13,fontWeight:700,color:T.dark,marginTop:6,fontFamily:"'Noto Sans',sans-serif"}}>{label}</div>
            </button>)}
          </div>
        </>)}
        {step===2&&(<>
          <h2 style={S.title}>{t(lang,"pick_currency")}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
            {Object.entries(CURR).map(([code,c])=><button key={code} onClick={()=>setBaseCurrency(code)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 18px",borderRadius:18,border:"none",cursor:"pointer",background:baseCurrency===code?c.bg:"rgba(172,225,175,0.08)",transition:"all .25s ease",boxShadow:baseCurrency===code?T.shadow:"none",transform:baseCurrency===code?"scale(1.02)":"scale(1)"}}>
              <div style={{width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{c.symbol}</div>
              <div style={{textAlign:"left"}}><div style={{fontWeight:700,fontSize:16,color:T.dark}}>{code}</div><div style={{fontSize:12,color:T.muted}}>{c.name}</div></div>
              {baseCurrency===code&&<div style={{marginLeft:"auto",fontSize:18,color:"#2A7A40"}}>✓</div>}
            </button>)}
          </div>
        </>)}
        {step===3&&(<>
          <h2 style={S.title}>{t(lang,"pick_expense_cats")}</h2>
          <p style={S.sub}>Select the ones that match your life</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
            {DEFAULT_EXPENSE_CATS.map(cat=>{const on=expCats.includes(cat.id);return(
              <button key={cat.id} onClick={()=>toggleCat(cat.id,expCats,setExpCats)} style={catBtnStyle(on)}>
                <span style={{fontSize:16}}>{cat.emoji}</span>{catLabel(cat,lang)}{on&&<span style={{fontSize:10,color:"#2A7A40",marginLeft:2}}>✓</span>}
              </button>
            );})}
          </div>
        </>)}
        {step===4&&(<>
          <h2 style={S.title}>{t(lang,"pick_income_cats")}</h2>
          <p style={S.sub}>Select your income sources</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>
            {DEFAULT_INCOME_CATS.map(cat=>{const on=incCats.includes(cat.id);return(
              <button key={cat.id} onClick={()=>toggleCat(cat.id,incCats,setIncCats)} style={catBtnStyle(on)}>
                <span style={{fontSize:16}}>{cat.emoji}</span>{catLabel(cat,lang)}{on&&<span style={{fontSize:10,color:"#2A7A40",marginLeft:2}}>✓</span>}
              </button>
            );})}
          </div>
        </>)}
      </div>
      <button onClick={advance} style={{marginTop:24,padding:"16px 52px",borderRadius:24,border:"none",cursor:"pointer",background:canAdvance()?"linear-gradient(145deg,#ACE1AF,#7BC8A4)":"rgba(172,225,175,0.3)",color:canAdvance()?"#1A4020":"#8FB898",fontWeight:800,fontSize:16,fontFamily:"'Noto Sans',sans-serif",boxShadow:canAdvance()?"0 6px 24px rgba(172,225,175,0.5)":"none",zIndex:1,transition:"all .2s ease"}}
        onPointerDown={e=>canAdvance()&&(e.currentTarget.style.transform="scale(0.96)")}
        onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}>
        {step<4?t(lang,"next"):t(lang,"start")}
      </button>
    </div>
  );
}

// ═══ WALLET CARDS ═════════════════════════════════════════════
function WalletCards({transactions}){
  const[expanded,setExpanded]=useState(null);
  const getStats=(cur)=>{
    const now=new Date(),mo=now.getMonth(),yr=now.getFullYear();
    const monthly=transactions.filter(tx=>{const d=new Date(tx.date);return d.getMonth()===mo&&d.getFullYear()===yr&&tx.currency===cur;});
    const allCur=transactions.filter(tx=>tx.currency===cur);
    const allIn=allCur.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const allOut=allCur.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    const moIn=monthly.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
    const moOut=monthly.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
    return{balance:allIn-allOut,income:moIn,expenses:moOut};
  };
  return(
    <div style={{padding:"0 16px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"stretch"}}>
          {["LAK","THB","USD"].map((cur,i)=>{
            const stats=getStats(cur),open=expanded===cur,bal=stats.balance;
            return(
              <div key={cur} onClick={()=>setExpanded(open?null:cur)}
                style={{flex:1,padding:"12px 10px",cursor:"pointer",
                  borderLeft:i>0?"1px solid rgba(45,45,58,0.07)":"none",
                  background:open?"rgba(172,225,175,0.08)":"transparent",
                  transition:"background .15s",textAlign:"center"}}>
                <Flag code={cur} size={22}/>
                <div style={{fontSize:10,fontWeight:600,color:T.muted,marginTop:4,letterSpacing:0.3}}>{cur}</div>
                <div style={{fontSize:13,fontWeight:800,color:bal<0?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif",marginTop:2,letterSpacing:-0.3}}>
                  {bal<0?"−":""}{fmtCompact(Math.abs(bal),cur)}
                </div>
              </div>
            );
          })}
        </div>
        {expanded&&(()=>{
          const stats=getStats(expanded),cfg=CURR[expanded];
          return(
            <div style={{borderTop:"1px solid rgba(45,45,58,0.07)",padding:"12px 14px",animation:"slideDown .2s ease",background:"rgba(172,225,175,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Flag code={expanded} size={20}/>
                  <span style={{fontSize:12,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cfg.name}</span>
                </div>
                <button onClick={()=>setExpanded(null)} style={{fontSize:14,color:T.muted,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,padding:"8px 12px",borderRadius:12,background:"rgba(172,225,175,0.15)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#2A7A40",textTransform:"uppercase",letterSpacing:0.8}}>Income</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#1A5A30",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>+{fmt(stats.income,expanded)}</div>
                </div>
                <div style={{flex:1,padding:"8px 12px",borderRadius:12,background:"rgba(255,179,167,0.15)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#A03020",textTransform:"uppercase",letterSpacing:0.8}}>Expenses</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#C0392B",marginTop:3,fontFamily:"'Noto Sans',sans-serif"}}>−{fmt(stats.expenses,expanded)}</div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ═══ EDIT TRANSACTION MODAL ───────────────────────────────────
function EditTransactionModal({tx,lang,onSave,onClose,customCategories=[]}){
  const[amount,setAmount]=useState(String(tx.amount));
  const[desc,setDesc]=useState(tx.description||"");
  const[catId,setCatId]=useState(tx.categoryId);
  const cats=tx.type==="income"
    ?[...DEFAULT_INCOME_CATS,...customCategories.filter(c=>c.type==="income")]
    :[...DEFAULT_EXPENSE_CATS,...customCategories.filter(c=>c.type==="expense")];
  const save=()=>{const a=parseFloat(String(amount).replace(/,/g,""));if(!a||a<=0)return;onSave({...tx,amount:a,categoryId:catId,description:desc.trim()||tx.description});};
  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(30,30,40,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:430,animation:"slideUp .3s ease",maxHeight:"85vh",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:16,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>Edit Transaction</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>✕</button>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Name</div>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder={tx.description}
            style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid rgba(45,45,58,0.12)",outline:"none",fontSize:14,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.05)",boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.12)"}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,fontFamily:"'Noto Sans',sans-serif"}}>Amount ({tx.currency})</div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(172,225,175,0.08)",borderRadius:14,padding:"4px 4px 4px 16px",border:"1.5px solid #ACE1AF"}}>
            <span style={{fontSize:18,fontWeight:800,color:T.dark}}>{tx.currency==="LAK"?"₭":tx.currency==="THB"?"฿":"$"}</span>
            <input value={amount} onChange={e=>setAmount(e.target.value)} onFocus={e=>e.target.select()} type="number" inputMode="decimal"
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:22,fontWeight:800,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>Category</div>
          <div style={{overflowY:"auto",maxHeight:200}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {cats.map(cat=>(
                <button key={cat.id} onClick={()=>setCatId(cat.id)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,border:"none",cursor:"pointer",background:catId===cat.id?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.04)",boxShadow:catId===cat.id?"0 0 0 2px #ACE1AF":"none",transition:"all .15s",textAlign:"left"}}>
                  <span style={{fontSize:18}}>{cat.emoji}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{catLabel(cat,lang)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={save} style={{width:"100%",padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:15,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>Save Changes ✓</button>
      </div>
    </div>
  );
}

// ═══ CONFIRM MODAL ════════════════════════════════════════════
function ConfirmModal({parsed,lang,onConfirm,onEdit}){
  const[note,setNote]=useState("");
  const cat=findCat(parsed.category);
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(30,30,40,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"28px 28px 0 0",padding:"28px 24px 44px",width:"100%",maxWidth:430,animation:"slideUp .35s cubic-bezier(.34,1.2,.64,1)"}}>
        <div style={{fontSize:13,color:T.muted,fontWeight:600,marginBottom:14}}>{t(lang,"confirm_q")}</div>
        <div style={{display:"flex",alignItems:"center",gap:14,background:T.bg,borderRadius:20,padding:"14px 16px",marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:15,fontSize:24,background:parsed.type==="expense"?"rgba(255,179,167,0.25)":"rgba(172,225,175,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>{cat.emoji}</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{parsed.description}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{catLabel(cat,lang)} · {parsed.currency}</div></div>
          <div style={{fontWeight:800,fontSize:18,fontFamily:"'Noto Sans',sans-serif",color:parsed.type==="expense"?"#C0392B":"#1A5A30"}}>{parsed.type==="expense"?"-":"+"}{fmt(parsed.amount,parsed.currency)}</div>
        </div>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder={t(lang,"note_placeholder")}
          style={{width:"100%",padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)",marginBottom:14,boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onEdit} style={{flex:1,padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"rgba(155,155,173,0.12)",color:T.muted,fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"confirm_edit")}</button>
          <button onClick={()=>onConfirm({...parsed,note:note.trim()})} style={{flex:2,padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:14,fontFamily:"'Noto Sans',sans-serif",boxShadow:"0 4px 16px rgba(172,225,175,0.4)"}}>{t(lang,"confirm_yes")}</button>
        </div>
      </div>
    </div>
  );
}

// ═══ QUICK EDIT TOAST ════════════════════════════════════════
function QuickEditToast({tx,lang,onChangeCategory,onDone,customCategories=[]}){
  const cat=findCat(tx.categoryId,customCategories);
  const[visible,setVisible]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>{setVisible(false);setTimeout(onDone,300);},4000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",bottom:140,left:"50%",transform:"translateX(-50%)",zIndex:500,width:"calc(100% - 32px)",maxWidth:398,opacity:visible?1:0,transition:"opacity .3s ease",pointerEvents:visible?"auto":"none"}}>
      <div style={{background:"#1a2e1a",borderRadius:20,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:11,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fff",fontFamily:"'Noto Sans',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.description}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:1}}>{catLabel(cat,lang)}</div>
        </div>
        <button onClick={()=>{setVisible(false);onChangeCategory();}}
          style={{padding:"6px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"#ACE1AF",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Noto Sans',sans-serif"}}>
          ✏️ Fix
        </button>
      </div>
    </div>
  );
}

// ═══ QUICK ADD BAR ════════════════════════════════════════════
function QuickAddBar({lang,onAdd,customCategories=[],userId=null}){
  const[input,setInput]=useState("");
  const[status,setStatus]=useState("idle");
  const[pending,setPending]=useState(null);
  const[mode,setMode]=useState("expense");
  const inputRef=useRef();

  const submit=useCallback(async()=>{
    if(!input.trim()||status==="parsing")return;
    const text=input.trim();
    setStatus("parsing");
    const local=localParse(text);
    if(local&&local.amount>0){
      local.type=mode;
      local.category=normalizeCategory(local.category,mode);
      const txId="tx_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const catId=normalizeCategory(local.category,local.type);
      const cat=findCat(catId,customCategories);
      const tx={id:txId,amount:local.amount,currency:local.currency,type:local.type,categoryId:cat.id,description:local.description||text,note:"",date:new Date().toISOString().split("T")[0],confidence:local.confidence,createdAt:new Date().toISOString()};
      onAdd(tx);
      setInput("");setStatus("idle");inputRef.current?.focus();
      fetch("https://api.phanote.com/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,userId})})
        .then(r=>r.json()).then(ai=>{
          if(ai&&ai.amount&&ai.category){
            const aiCat=normalizeCategory(ai.category,mode);
            if(aiCat!==catId){onAdd({...tx,categoryId:aiCat,_update:true});}
            if(userId){dbSaveMemory(userId,text,ai.category,mode,ai.confidence||0.8).catch(()=>{});}
          }
        }).catch(()=>{});
      return;
    }
    const customCatIds=customCategories.map(c=>c.id);
    const result=await parseWithAI(text,customCatIds,userId);
    if(!result||!result.amount||result.amount<=0){setStatus("error");setTimeout(()=>setStatus("idle"),2500);return;}
    result.type=mode;
    result.category=normalizeCategory(result.category,mode);
    if(result.confidence<0.72){setPending({...result,rawInput:text});setStatus("confirm");}
    else finalizeAdd({...result,rawInput:text,note:""});
  },[input,status,customCategories,mode,onAdd]);

  const finalizeAdd=(parsed)=>{
    const catId=normalizeCategory(parsed.category,parsed.type);
    const cat=findCat(catId,customCategories);
    onAdd({id:`tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,amount:parsed.amount,currency:parsed.currency,type:parsed.type,categoryId:cat.id,description:parsed.description||parsed.rawInput||"",note:parsed.note||"",date:new Date().toISOString().split("T")[0],confidence:parsed.confidence,createdAt:new Date().toISOString()});
    setInput("");setStatus("idle");setPending(null);inputRef.current?.focus();
  };

  const isIncome=mode==="income";
  return(<>
    <div style={{padding:"0 12px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:18,padding:"8px 10px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:8,border:`1.5px solid ${isIncome?"rgba(172,225,175,0.4)":"rgba(255,179,167,0.3)"}`}}>
        <button onClick={()=>setMode(isIncome?"expense":"income")} style={{flexShrink:0,padding:"5px 10px",borderRadius:10,border:"none",cursor:"pointer",background:isIncome?"rgba(172,225,175,0.25)":"rgba(255,179,167,0.25)",color:isIncome?"#1A5A30":"#C0392B",fontWeight:800,fontSize:11,fontFamily:"'Noto Sans',sans-serif",transition:"all .2s ease",whiteSpace:"nowrap"}}>{isIncome?"+ In":"− Out"}</button>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder={isIncome?"salary, ເງິນເດືອນ, รายรับ…":t(lang,"placeholder")}
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif",minWidth:0}}/>
        <button onClick={submit} disabled={status==="parsing"} style={{width:36,height:36,borderRadius:11,border:"none",cursor:"pointer",flexShrink:0,background:status==="error"?"#FFB3A7":status==="parsing"?"rgba(172,225,175,0.4)":T.celadon,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all .2s ease",boxShadow:status==="parsing"?"none":"0 3px 8px rgba(172,225,175,0.4)"}}>
          {status==="parsing"?"⏳":status==="error"?"✗":"↑"}
        </button>
      </div>
      {status==="parsing"&&<div style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:4,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"parsing")}</div>}
    </div>
    {status==="confirm"&&pending&&<ConfirmModal parsed={pending} lang={lang} onConfirm={finalizeAdd} onEdit={()=>{setStatus("idle");setPending(null);}}/>}
  </>);
}

// ═══ TRANSACTION LIST ════════════════════════════════════════
function TransactionList({transactions,lang,onUpdateNote,onDeleteTx,onEditCategory,customCategories=[]}){
  const[editingNote,setEditingNote]=useState(null);
  const[noteInput,setNoteInput]=useState("");
  const[expandedTx,setExpandedTx]=useState(null);
  const noteRef=useRef();
  const startEdit=(tx)=>{setEditingNote(tx.id);setNoteInput(tx.note||"");setTimeout(()=>noteRef.current?.focus(),50);};
  const saveNote=(txId)=>{onUpdateNote(txId,noteInput.trim());setEditingNote(null);setNoteInput("");};
  const cancelEdit=()=>{setEditingNote(null);setNoteInput("");};

  if(transactions.length===0)return(
    <div style={{textAlign:"center",padding:"52px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <div style={{fontSize:52}}>📒</div>
      <div style={{fontWeight:700,fontSize:17,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"empty")}</div>
      <div style={{fontSize:13,color:T.muted,maxWidth:220,lineHeight:1.6}}>{t(lang,"empty_sub")}</div>
    </div>
  );

  const todayStr=new Date().toISOString().split("T")[0];
  const yestStr=new Date(Date.now()-86400000).toISOString().split("T")[0];
  const groups={};
  [...transactions].reverse().forEach(tx=>{
    const key=tx.date===todayStr?t(lang,"today"):tx.date===yestStr?t(lang,"yesterday"):tx.date;
    (groups[key]=groups[key]||[]).push(tx);
  });

  return(
    <div style={{padding:"0 16px"}}>
      {Object.entries(groups).map(([date,txs])=>(
        <div key={date} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>{date}</div>
          <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,overflow:"hidden",boxShadow:T.shadow}}>
            {txs.map((tx,i)=>{
              const cat=findCat(tx.categoryId,customCategories);
              const hasNote=tx.note&&tx.note.trim().length>0;
              const isEditing=editingNote===tx.id;
              return(
                <div key={tx.id} style={{padding:"13px 16px",borderBottom:i<txs.length-1?"1px solid rgba(45,45,58,0.05)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
                    onClick={()=>setExpandedTx(expandedTx===tx.id?null:tx.id)}
                    onPointerEnter={e=>e.currentTarget.style.opacity="0.85"}
                    onPointerLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div style={{width:44,height:44,borderRadius:15,flexShrink:0,background:tx.type==="expense"?"rgba(255,179,167,0.2)":"rgba(172,225,175,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{cat.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14,color:T.dark,fontFamily:"'Noto Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description||catLabel(cat,lang)}</div>
                      <div style={{fontSize:12,color:T.muted,marginTop:2}}>{catLabel(cat,lang)}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:800,letterSpacing:-0.3,color:tx.type==="expense"?"#C0392B":"#1A5A30",fontFamily:"'Noto Sans',sans-serif"}}>{tx.type==="expense"?"−":"+"}{fmt(tx.amount,tx.currency)}</div>
                      <div style={{display:"inline-block",marginTop:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6,background:CURR[tx.currency].pill,color:CURR[tx.currency].pillText}}>{tx.currency}</div>
                    </div>
                  </div>
                  {expandedTx===tx.id&&(
                    <div style={{display:"flex",gap:8,marginTop:8,animation:"slideDown .15s ease"}}>
                      <button onClick={()=>{onEditCategory&&onEditCategory(tx);setExpandedTx(null);}} style={{flex:1,padding:"8px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(172,225,175,0.2)",color:"#1A5A30",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>✏️ Edit</button>
                      <button onClick={()=>{onDeleteTx(tx.id);setExpandedTx(null);}} style={{flex:1,padding:"8px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(255,179,167,0.2)",color:"#C0392B",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>🗑️ Delete</button>
                      <button onClick={()=>setExpandedTx(null)} style={{padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>✕</button>
                    </div>
                  )}
                  {isEditing?(
                    <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
                      <input ref={noteRef} value={noteInput} onChange={e=>setNoteInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")saveNote(tx.id);if(e.key==="Escape")cancelEdit();}}
                        placeholder={t(lang,"note_placeholder")}
                        style={{flex:1,padding:"8px 12px",borderRadius:10,border:"1.5px solid #ACE1AF",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.08)"}}/>
                      <button onClick={()=>saveNote(tx.id)} style={{padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",background:"#ACE1AF",color:"#1A4020",fontWeight:700,fontSize:12,fontFamily:"'Noto Sans',sans-serif"}}>✓</button>
                      <button onClick={cancelEdit} style={{padding:"7px 10px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.08)",color:T.muted,fontWeight:700,fontSize:12}}>✕</button>
                    </div>
                  ):(
                    <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6}}>
                      {hasNote?(
                        <span onClick={()=>startEdit(tx)} style={{fontSize:12,color:"#5aae5f",cursor:"pointer",padding:"2px 8px",borderRadius:8,background:"rgba(172,225,175,0.15)",fontFamily:"'Noto Sans',sans-serif"}}>
                          📝 {tx.note.length>35?tx.note.slice(0,35)+"…":tx.note}
                        </span>
                      ):(
                        <button onClick={()=>startEdit(tx)} style={{fontSize:11,color:T.muted,border:"none",cursor:"pointer",background:"transparent",padding:"2px 0",fontFamily:"'Noto Sans',sans-serif",letterSpacing:0.3}}>{t(lang,"add_note")}</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ CUSTOM CATEGORY MANAGER ══════════════════════════════════
function CategoryManager({lang,customCategories,onAdd,onRemove}){
  const[adding,setAdding]=useState(false);
  const[newEmoji,setNewEmoji]=useState("🌟");
  const[newName,setNewName]=useState("");
  const[newType,setNewType]=useState("expense");
  const[showEmoji,setShowEmoji]=useState(false);
  const submit=()=>{
    if(!newName.trim())return;
    const id=`custom_${Date.now()}`;
    onAdd({id,emoji:newEmoji,en:newName.trim(),lo:newName.trim(),th:newName.trim(),type:newType,isCustom:true});
    setNewName("");setNewEmoji("🌟");setAdding(false);setShowEmoji(false);
  };
  return(
    <div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"manage_cats")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,overflow:"hidden",boxShadow:T.shadow,marginBottom:12}}>
        {customCategories.length===0&&!adding&&(<div style={{padding:"16px 18px",fontSize:13,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>No custom categories yet</div>)}
        {customCategories.map((cat,i)=>(
          <div key={cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid rgba(45,45,58,0.05)":"none"}}>
            <span style={{fontSize:22}}>{cat.emoji}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cat.en}</div><div style={{fontSize:11,color:T.muted}}>{cat.type}</div></div>
            <button onClick={()=>onRemove(cat.id)} style={{fontSize:16,border:"none",background:"none",cursor:"pointer",color:"#FFB3A7",padding:"4px 8px"}}>✕</button>
          </div>
        ))}
        {adding&&(
          <div style={{padding:"14px 18px",borderTop:customCategories.length?"1px solid rgba(45,45,58,0.05)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <button onClick={()=>setShowEmoji(!showEmoji)} style={{width:46,height:46,borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",background:"rgba(172,225,175,0.06)",fontSize:24,cursor:"pointer"}}>{newEmoji}</button>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t(lang,"category_name")} autoFocus style={{flex:1,padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)"}}
                onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
            </div>
            {showEmoji&&(<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,padding:"10px",borderRadius:14,background:"rgba(45,45,58,0.04)"}}>
              {EMOJI_PICKS.map(e=><button key={e} onClick={()=>{setNewEmoji(e);setShowEmoji(false);}} style={{fontSize:22,border:"none",background:newEmoji===e?"rgba(172,225,175,0.3)":"transparent",cursor:"pointer",borderRadius:8,padding:"4px",width:36,height:36}}>{e}</button>)}
            </div>)}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["expense","income"].map(type=><button key={type} onClick={()=>setNewType(type)} style={{flex:1,padding:"9px",borderRadius:12,border:"none",cursor:"pointer",background:newType===type?"rgba(172,225,175,0.25)":"rgba(45,45,58,0.05)",fontWeight:newType===type?700:500,fontSize:13,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,type)}{newType===type&&" ✓"}</button>)}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setAdding(false);setShowEmoji(false);}} style={{flex:1,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(45,45,58,0.06)",color:T.muted,fontWeight:700,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"cancel")}</button>
              <button onClick={submit} style={{flex:2,padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",color:"#1A4020",fontWeight:800,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"save")}</button>
            </div>
          </div>
        )}
      </div>
      {!adding&&(<button onClick={()=>setAdding(true)} style={{width:"100%",padding:"12px",borderRadius:16,border:"1.5px dashed rgba(172,225,175,0.5)",cursor:"pointer",background:"transparent",color:"#5aae5f",fontWeight:700,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>+ {t(lang,"add_category")}</button>)}
    </div>
  );
}

// ═══ SETTINGS ════════════════════════════════════════════════
function SettingsScreen({profile,transactions,onUpdateProfile,onReset}){
  const{lang,baseCurrency,name,avatar,customCategories=[]}=profile;
  const[showLang,setShowLang]=useState(false);
  const[showCur,setShowCur]=useState(false);
  const[showAvatar,setShowAvatar]=useState(false);
  const LANGS=[{code:"lo",flag:"🇱🇦",label:"ລາວ"},{code:"th",flag:"🇹🇭",label:"ไทย"},{code:"en",flag:"🇬🇧",label:"English"}];
  const btnStyle=(active)=>({display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",background:active?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",fontWeight:active?700:500,fontSize:13,color:T.dark});
  return(
    <div style={{padding:"52px 20px 24px",position:"relative",zIndex:1}}>
      <div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif",marginBottom:24}}>{t(lang,"settings")}</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:24,padding:"20px",boxShadow:T.shadow,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>setShowAvatar(!showAvatar)} style={{width:64,height:64,borderRadius:20,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 4px 14px rgba(172,225,175,0.4)",border:"none",cursor:"pointer",position:"relative",flexShrink:0}}>
            {avatar}
            <div style={{position:"absolute",bottom:-4,right:-4,width:22,height:22,borderRadius:8,background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✏️</div>
          </button>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{name}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>{transactions.length} transactions logged</div>
            <div style={{fontSize:11,color:"#5aae5f",marginTop:2,cursor:"pointer"}} onClick={()=>setShowAvatar(!showAvatar)}>Tap avatar to change</div>
          </div>
        </div>
        {showAvatar&&(<div style={{marginTop:14,animation:"slideDown .2s ease"}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:8,fontFamily:"'Noto Sans',sans-serif"}}>Choose your companion</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {AVATARS.map(a=><button key={a} onClick={()=>{onUpdateProfile({avatar:a});setShowAvatar(false);}} style={{width:48,height:48,borderRadius:14,border:"none",cursor:"pointer",fontSize:24,background:avatar===a?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",transform:avatar===a?"scale(1.15)":"scale(1)",boxShadow:avatar===a?"0 3px 10px rgba(172,225,175,0.4)":"none",transition:"all .2s ease"}}>{a}</button>)}
          </div>
        </div>)}
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",marginBottom:10,fontFamily:"'Noto Sans',sans-serif"}}>Preferences</div>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,boxShadow:T.shadow,marginBottom:20}}>
        <div onClick={()=>{setShowLang(!showLang);setShowCur(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer",borderBottom:"1px solid rgba(45,45,58,0.05)"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌐</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"language")}</div><div style={{fontSize:12,color:T.muted}}>{LANGS.find(l=>l.code===lang)?.label}</div></div>
          <div style={{fontSize:12,color:T.muted,transform:showLang?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</div>
        </div>
        {showLang&&(<div style={{padding:"10px 18px 14px",display:"flex",gap:8,flexWrap:"wrap",borderBottom:"1px solid rgba(45,45,58,0.05)",animation:"slideDown .2s ease"}}>
          {LANGS.map(l=><button key={l.code} onClick={()=>{onUpdateProfile({lang:l.code});setShowLang(false);}} style={btnStyle(lang===l.code)}><span>{l.flag}</span>{l.label}{lang===l.code&&<span style={{fontSize:10,color:"#2A7A40"}}>✓</span>}</button>)}
        </div>)}
        <div onClick={()=>{setShowCur(!showCur);setShowLang(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 18px",cursor:"pointer"}}>
          <div style={{width:40,height:40,borderRadius:12,background:"rgba(172,225,175,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💱</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"base_currency")}</div><div style={{fontSize:12,color:T.muted}}>{CURR[baseCurrency].name}</div></div>
          <div style={{fontSize:12,color:T.muted,transform:showCur?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</div>
        </div>
        {showCur&&(<div style={{padding:"10px 18px 14px",display:"flex",gap:8,flexWrap:"wrap",animation:"slideDown .2s ease"}}>
          {Object.entries(CURR).map(([code,c])=><button key={code} onClick={()=>{onUpdateProfile({baseCurrency:code});setShowCur(false);}} style={btnStyle(baseCurrency===code)}><Flag code={code} size={20}/>{code} {c.symbol}{baseCurrency===code&&<span style={{fontSize:10,color:"#2A7A40"}}>✓</span>}</button>)}
        </div>)}
      </div>
      <CategoryManager lang={lang} customCategories={customCategories}
        onAdd={(cat)=>onUpdateProfile({customCategories:[...customCategories,cat]})}
        onRemove={(id)=>onUpdateProfile({customCategories:customCategories.filter(c=>c.id!==id)})}/>
      <div style={{marginTop:24}}/>
      <button onClick={onReset} style={{width:"100%",padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"rgba(255,179,167,0.15)",color:"#C0392B",fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"reset")}</button>
    </div>
  );
}

// ═══ SET BUDGET MODAL ════════════════════════════════════════
function SetBudgetModal({ cat, currency, currentLimit, spent, lang, onSave, onClose }) {
  const [amount, setAmount] = useState(currentLimit > 0 ? String(currentLimit) : "");
  const sym = CURR[currency].symbol;
  const pct = currentLimit > 0 ? Math.min((spent / currentLimit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const save = () => {
    const a = parseFloat(String(amount).replace(/,/g, ""));
    if (!a || a <= 0) return;
    onSave(a);
  };
  const QUICK = {
    LAK: [500000, 1000000, 2000000, 5000000],
    THB: [500, 1000, 2000, 5000],
    USD: [50, 100, 200, 500],
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(30,30,40,0.6)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:"28px 28px 0 0", padding:"28px 24px 52px",
        width:"100%", maxWidth:430, animation:"slideUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:30 }}>{cat.emoji}</span>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>Monthly budget · {currency}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:T.muted }}>✕</button>
        </div>
        {spent > 0 && (
          <div style={{ background:T.bg, borderRadius:16, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>Spent this month</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#C0392B", fontFamily:"'Noto Sans',sans-serif" }}>{fmt(spent, currency)}</div>
            {currentLimit > 0 && (<>
              <div style={{ marginTop:10, height:6, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:99 }} />
              </div>
              <div style={{ marginTop:5, fontSize:11, color:barColor, fontWeight:700 }}>
                {pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost at limit" : `${Math.round(pct)}% of ${fmt(currentLimit, currency)}`}
              </div>
            </>)}
          </div>
        )}
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:8, fontFamily:"'Noto Sans',sans-serif" }}>Monthly Limit</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(172,225,175,0.08)",
          borderRadius:14, padding:"4px 4px 4px 16px", border:"1.5px solid #ACE1AF", marginBottom:16 }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.dark }}>{sym}</span>
          <input value={amount} onChange={e => setAmount(e.target.value)}
            onFocus={e => e.target.select()} onKeyDown={e => e.key === "Enter" && save()}
            type="number" inputMode="decimal" placeholder="0" autoFocus
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
              fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
          {QUICK[currency].map(v => (
            <button key={v} onClick={() => setAmount(String(v))} style={{
              padding:"8px 14px", borderRadius:12, border:"none", cursor:"pointer",
              background: Number(amount) === v ? "rgba(172,225,175,0.35)" : "rgba(45,45,58,0.06)",
              fontWeight:700, fontSize:12, color:T.dark, fontFamily:"'Noto Sans',sans-serif",
              boxShadow: Number(amount) === v ? "0 0 0 2px #ACE1AF" : "none",
            }}>{fmtCompact(v, currency)}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {currentLimit > 0 && (
            <button onClick={() => onSave(0)} style={{ flex:1, padding:"14px", borderRadius:16,
              border:"none", cursor:"pointer", background:"rgba(255,179,167,0.15)", color:"#C0392B",
              fontWeight:700, fontSize:13, fontFamily:"'Noto Sans',sans-serif" }}>Remove</button>
          )}
          <button onClick={save} style={{ flex:2, padding:"14px", borderRadius:16, border:"none",
            cursor:"pointer", background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020",
            fontWeight:800, fontSize:15, fontFamily:"'Noto Sans',sans-serif",
            boxShadow:"0 4px 16px rgba(172,225,175,0.4)" }}>Save Budget ✓</button>
        </div>
      </div>
    </div>
  );
}

// ═══ BUDGET SCREEN ════════════════════════════════════════════
function BudgetScreen({ profile, transactions }) {
  const { lang, baseCurrency, customCategories = [], userId } = profile;
  const [selectedCur, setSelectedCur] = useState(baseCurrency || "LAK");
  const [budgets, setBudgets] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from("budgets").select("*").eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(b => { map[`${b.category_id}_${b.currency}`] = Number(b.monthly_limit); });
          setBudgets(map);
        }
        setLoading(false);
      });
  }, [userId]);

  const saveBudget = async (catId, currency, amount) => {
    const key = `${catId}_${currency}`;
    setBudgets(prev => amount > 0
      ? { ...prev, [key]: amount }
      : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
    );
    if (amount > 0) {
      await supabase.from("budgets").upsert({
        user_id: userId, category_id: catId, currency, monthly_limit: amount,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,category_id,currency" });
    } else {
      await supabase.from("budgets").delete().eq("user_id", userId).eq("category_id", catId).eq("currency", currency);
    }
  };

  const now = new Date();
  const monthlyExpenses = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      && tx.currency === selectedCur && tx.type === "expense";
  });
  const spentByCat = {};
  monthlyExpenses.forEach(tx => { spentByCat[tx.categoryId] = (spentByCat[tx.categoryId] || 0) + tx.amount; });
  const totalSpent = monthlyExpenses.reduce((s, tx) => s + tx.amount, 0);
  const totalBudget = Object.entries(budgets).filter(([k]) => k.endsWith(`_${selectedCur}`)).reduce((s, [, v]) => s + v, 0);
  const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const getColor = (pct) => pct >= 100 ? "#C0392B" : pct >= 80 ? "#d4993a" : "#3da873";
  const getStatus = (pct) => pct >= 100 ? "⚠️ Over budget" : pct >= 80 ? "⚡ Almost there" : "✓ On track";
  const allExpCats = [...DEFAULT_EXPENSE_CATS, ...customCategories.filter(c => c.type === "expense")];
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ padding:"52px 16px 32px", position:"relative", zIndex:1 }}>
      <div style={{ fontWeight:800, fontSize:22, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginBottom:2 }}>Budget 💰</div>
      <div style={{ fontSize:12, color:T.muted, marginBottom:20 }}>{monthName}</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["LAK","THB","USD"].map(cur => (
          <button key={cur} onClick={() => setSelectedCur(cur)} style={{
            flex:1, padding:"9px 0", borderRadius:14, border:"none", cursor:"pointer",
            background: selectedCur === cur ? T.celadon : "rgba(45,45,58,0.06)",
            fontWeight:700, fontSize:13, color: selectedCur === cur ? "#1A4020" : T.muted,
            fontFamily:"'Noto Sans',sans-serif", transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
          }}>
            <Flag code={cur} size={16}/> {cur}
          </button>
        ))}
      </div>
      {totalBudget > 0 && (
        <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:22,
          padding:"18px 20px", boxShadow:T.shadow, marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Total Spent</div>
              <div style={{ fontSize:26, fontWeight:800, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalSpent, selectedCur)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8 }}>of</div>
              <div style={{ fontSize:17, fontWeight:700, color:T.dark, fontFamily:"'Noto Sans',sans-serif", marginTop:3 }}>{fmt(totalBudget, selectedCur)}</div>
            </div>
          </div>
          <div style={{ height:10, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${totalPct}%`, borderRadius:99,
              background:getColor(totalPct), transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
          </div>
          <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, color:getColor(totalPct), fontWeight:700 }}>{getStatus(totalPct)}</div>
            <div style={{ fontSize:12, color:T.muted }}>{fmt(Math.max(totalBudget - totalSpent, 0), selectedCur)} left</div>
          </div>
        </div>
      )}
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10, fontFamily:"'Noto Sans',sans-serif" }}>Categories</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {allExpCats.map(cat => {
          const key = `${cat.id}_${selectedCur}`;
          const limit = budgets[key] || 0;
          const spent = spentByCat[cat.id] || 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const color = getColor(pct);
          const hasActivity = spent > 0 || limit > 0;
          return (
            <div key={cat.id} onClick={() => setEditCat(cat)}
              style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:18,
                padding:"13px 16px", boxShadow:T.shadow, cursor:"pointer",
                opacity: hasActivity ? 1 : 0.55, transition:"all .15s" }}
              onPointerDown={e => e.currentTarget.style.transform = "scale(0.985)"}
              onPointerUp={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:14, flexShrink:0,
                  background: hasActivity ? "rgba(255,179,167,0.2)" : "rgba(45,45,58,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{cat.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif" }}>{catLabel(cat, lang)}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>
                    {limit > 0 ? `${fmt(spent, selectedCur)} / ${fmt(limit, selectedCur)}` : spent > 0 ? `${fmt(spent, selectedCur)} spent` : "Tap to set limit"}
                  </div>
                </div>
                <div style={{ flexShrink:0, textAlign:"right" }}>
                  {limit > 0
                    ? <div style={{ fontSize:14, fontWeight:800, color, fontFamily:"'Noto Sans',sans-serif" }}>{Math.round(pct)}%</div>
                    : <div style={{ fontSize:11, color:"#ACE1AF", fontWeight:700 }}>+ Set</div>}
                </div>
              </div>
              {limit > 0 && (
                <div style={{ marginTop:10, height:5, background:"rgba(45,45,58,0.08)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99,
                    transition:"width .6s cubic-bezier(.34,1.2,.64,1)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!loading && totalBudget === 0 && (
        <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>Tap any category above to set a monthly spending limit 👆</div>
        </div>
      )}
      {editCat && (
        <SetBudgetModal cat={editCat} currency={selectedCur}
          currentLimit={budgets[`${editCat.id}_${selectedCur}`] || 0}
          spent={spentByCat[editCat.id] || 0} lang={lang}
          onSave={amount => { saveBudget(editCat.id, selectedCur, amount); setEditCat(null); }}
          onClose={() => setEditCat(null)} />
      )}
    </div>
  );
}

// ═══ STUB SCREEN ══════════════════════════════════════════════
const StubScreen=({icon,title})=>(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,gap:14,padding:40}}><div style={{fontSize:64}}>{icon}</div><div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{title}</div><div style={{background:"rgba(172,225,175,0.15)",borderRadius:14,padding:"10px 20px",fontSize:13,fontWeight:700,color:"#2A7A40"}}>Coming in Phase 2 🚀</div></div>);

// ═══ BOTTOM NAV ═══════════════════════════════════════════════
function BottomNav({active,onTab,lang}){
  const tabs=[{id:"home",icon:"🏠",label:t(lang,"home")},{id:"analytics",icon:"📊",label:t(lang,"analytics")},{id:"budget",icon:"💰",label:t(lang,"budget")},{id:"settings",icon:"⚙️",label:t(lang,"settings")}];
  return(<div style={{position:"sticky",bottom:0,background:"rgba(247,252,245,0.96)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(45,45,58,0.07)",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
    {tabs.map(tab=>(<button key={tab.id} onClick={()=>onTab(tab.id)} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
      {active===tab.id&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:32,height:2,borderRadius:2,background:T.celadon}}/>}
      <div style={{fontSize:22,filter:active!==tab.id?"grayscale(1) opacity(0.45)":"none"}}>{tab.icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:active===tab.id?T.dark:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{tab.label}</div>
    </button>))}
  </div>);
}

// ═══ HOME SCREEN ══════════════════════════════════════════════
function HomeScreen({profile,transactions,onAdd,onReset,onUpdateProfile,onUpdateNote,onUpdateCategory,onDeleteTx}){
  const[tab,setTab]=useState("home");
  const[toast,setToast]=useState(null);
  const[editTx,setEditTx]=useState(null);
  const[showEdit,setShowEdit]=useState(false);
  const{lang,customCategories=[]}=profile;
  const greet=()=>{const h=new Date().getHours();if(h<12)return t(lang,"morning");if(h<17)return t(lang,"afternoon");return t(lang,"evening");};
  const dateStr=new Date().toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{weekday:"long",month:"long",day:"numeric"});
  const handleAdd=(tx)=>{onAdd(tx);setEditTx(tx);setToast(null);};
  const handleEditSave=(updated)=>{
    if(!editTx)return;
    setShowEdit(false);setEditTx(null);
    onUpdateCategory(editTx.id,updated.categoryId,updated.amount,updated.description);
    const cat=findCat(updated.categoryId,customCategories);
    if(profile?.userId){dbSaveMemory(profile.userId,updated.description||editTx.description||"",cat.id,editTx.type,0.99).catch(()=>{});}
  };
  return(
    <div style={{height:"100dvh",background:T.bg,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <AnimalBg/>
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:10,background:"rgba(247,252,245,0.97)",backdropFilter:"blur(16px)"}}>
          <div style={{padding:"52px 20px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{dateStr}</div>
                <div style={{fontSize:20,fontWeight:800,color:T.dark,marginTop:2,fontFamily:"'Noto Sans',sans-serif"}}>{greet()}, {profile.name} 👋</div>
              </div>
              <button onClick={()=>setTab("settings")} style={{width:46,height:46,borderRadius:15,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",fontSize:24,boxShadow:"0 3px 10px rgba(172,225,175,0.4)",flexShrink:0}}>{profile.avatar}</button>
            </div>
          </div>
          <div style={{paddingBottom:16}}><WalletCards transactions={transactions}/></div>
          <div style={{padding:"0 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(45,45,58,0.05)"}}>
            <div style={{fontSize:14,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"recent")}</div>
            <div style={{fontSize:12,color:T.muted}}>{transactions.length} total</div>
          </div>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&(<><div style={{paddingTop:8}}/><TransactionList transactions={transactions} lang={lang} onUpdateNote={onUpdateNote} onDeleteTx={onDeleteTx} onEditCategory={(tx)=>{setEditTx(tx);setShowEdit(true);}} customCategories={customCategories}/><div style={{height:16}}/></>)}
        {tab==="analytics"&&<StubScreen icon="📊" title="Analytics"/>}
        {tab==="budget"&&<BudgetScreen profile={profile} transactions={transactions}/>}
        {tab==="settings"&&<SettingsScreen profile={profile} transactions={transactions} onUpdateProfile={onUpdateProfile} onReset={onReset}/>}
      </div>
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:150,background:"rgba(247,252,245,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(45,45,58,0.06)",padding:"8px 0 4px"}}>
          <QuickAddBar lang={lang} onAdd={handleAdd} customCategories={customCategories} userId={profile?.userId}/>
        </div>
      )}
      <BottomNav active={tab} onTab={setTab} lang={lang}/>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      {editTx&&!showEdit&&(<QuickEditToast tx={editTx} lang={lang} onChangeCategory={()=>setShowEdit(true)} onDone={()=>setEditTx(null)} customCategories={customCategories}/>)}
      {showEdit&&editTx&&(<EditTransactionModal tx={editTx} lang={lang} onSave={handleEditSave} onClose={()=>{setShowEdit(false);setEditTx(null);}} customCategories={customCategories}/>)}
    </div>
  );
}

// ═══ LOGIN SCREEN ════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("+856");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const CODES = [
    { flag:"🇱🇦", code:"+856", name:"Laos" },{ flag:"🇹🇭", code:"+66", name:"Thailand" },
    { flag:"🇺🇸", code:"+1", name:"USA" },{ flag:"🇬🇧", code:"+44", name:"UK" },
    { flag:"🇸🇬", code:"+65", name:"Singapore" },{ flag:"🇨🇳", code:"+86", name:"China" },
    { flag:"🇯🇵", code:"+81", name:"Japan" },{ flag:"🇰🇷", code:"+82", name:"Korea" },
    { flag:"🇻🇳", code:"+84", name:"Vietnam" },{ flag:"🇰🇭", code:"+855", name:"Cambodia" },
    { flag:"🇲🇲", code:"+95", name:"Myanmar" },{ flag:"🇦🇺", code:"+61", name:"Australia" },
  ];
  const submit = async () => {
    if (!phone.trim() || phone.trim().length < 6) { setError("Please enter a valid phone number"); return; }
    setLoading(true); setError("");
    try {
      const { user, isNew, phone: fullPhone, countryCode } = await signInWithPhone(phone.trim(), code);
      onLogin(user, isNew, fullPhone, countryCode);
    } catch (e) {
      setError(e.message?.includes("422") ? "Invalid phone number format." : "Could not sign in. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative", overflow:"hidden" }}>
      <AnimalBg />
      <div style={{ textAlign:"center", marginBottom:36, zIndex:1 }}>
        <div style={{ fontSize:52 }}>📒</div>
        <div style={{ fontFamily:"'Noto Sans',sans-serif", fontSize:32, fontWeight:800, color:T.dark, letterSpacing:-1, marginTop:8 }}>Phanote</div>
        <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>ພາໂນດ · พาโนด</div>
      </div>
      <div style={{ background:T.surface, backdropFilter:"blur(20px)", borderRadius:28,
        padding:"28px 24px", width:"100%", maxWidth:380, boxShadow:T.shadowLg, zIndex:1 }}>
        <div style={{ fontWeight:800, fontSize:18, color:T.dark, marginBottom:6, fontFamily:"'Noto Sans',sans-serif" }}>Welcome back 👋</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:22, lineHeight:1.5 }}>
          Enter your phone number to continue. First time? We'll set you up automatically.
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <select value={code} onChange={e=>setCode(e.target.value)} style={{ padding:"13px 10px", borderRadius:14, border:"1.5px solid rgba(45,45,58,0.12)", background:"rgba(172,225,175,0.06)", fontSize:14, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", cursor:"pointer", flexShrink:0 }}>
            {CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="20 123 4567" type="tel" autoFocus
            style={{ flex:1, padding:"13px 16px", borderRadius:14, border:`1.5px solid ${phone.length>5?"#ACE1AF":"rgba(45,45,58,0.12)"}`, background:"rgba(172,225,175,0.06)", fontSize:15, color:T.dark, fontFamily:"'Noto Sans',sans-serif", outline:"none", transition:"border-color .2s ease" }}/>
        </div>
        {error&&(<div style={{ fontSize:13, color:"#C0392B", marginBottom:12, padding:"8px 12px", borderRadius:10, background:"rgba(255,179,167,0.15)" }}>{error}</div>)}
        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"15px", borderRadius:18, border:"none", cursor:"pointer", background:loading?"rgba(172,225,175,0.4)":"linear-gradient(145deg,#ACE1AF,#7BC8A4)", color:"#1A4020", fontWeight:800, fontSize:16, fontFamily:"'Noto Sans',sans-serif", boxShadow:loading?"none":"0 6px 24px rgba(172,225,175,0.5)", transition:"all .2s ease" }}>
          {loading ? "Signing in…" : "Continue →"}
        </button>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.muted, lineHeight:1.6 }}>
          Your phone number is your identity. No password needed.<br/>Your data is saved securely and syncs across all your devices.
        </div>
      </div>
    </div>
  );
}

// ═══ ROOT APP ════════════════════════════════════════════════
export default function App(){
  const [profile, setProfile]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [booting, setBooting]           = useState(true);
  const [userId, setUserId]             = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;700&display=swap";
    document.head.appendChild(link);
  },[]);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#F7FCF5;overscroll-behavior:none;font-family:'Noto Sans','Noto Sans Lao',system-ui,sans-serif}input,select{-webkit-appearance:none}::-webkit-scrollbar{display:none}@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
  },[]);

  useEffect(()=>{
    const init = async () => {
      try {
        const timeout = new Promise(resolve => setTimeout(resolve, 6000));
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeout.then(() => ({ data: { session: null } }))
        ]);
        if (session?.user) await loadUserData(session.user.id);
      } catch (e) { console.error("Init error:", e); }
      setBooting(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.user) await loadUserData(session.user.id);
    });
    return () => subscription.unsubscribe();
  },[]);

  const loadUserData = async (uid) => {
    setUserId(uid); setLoadingProfile(true);
    try {
      const { data: dbProfile } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (dbProfile?.onboarding_complete) {
        setProfile({
          name: dbProfile.display_name || "User", lang: dbProfile.language || "en",
          baseCurrency: dbProfile.base_currency || "LAK", avatar: dbProfile.avatar || "🦫",
          customCategories: dbProfile.custom_categories || [],
          expCats: dbProfile.exp_cats || [], incCats: dbProfile.inc_cats || [],
          phone: dbProfile.phone || "", countryCode: dbProfile.phone_country_code || "",
          userId: uid,
        });
        supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid).then(()=>{});
        dbTrackEvent(uid, "app_open").then(()=>{});
      } else if (!dbProfile) {
        await supabase.auth.signOut(); setUserId(null);
      }
      const { data: dbTxs } = await supabase.from("transactions").select("*")
        .eq("user_id", uid).eq("is_deleted", false).order("created_at", { ascending: false });
      if (dbTxs) {
        setTransactions(dbTxs.map(tx => ({
          id: tx.id, amount: parseFloat(tx.amount), currency: tx.currency, type: tx.type,
          categoryId: tx.category_name
            ? ([...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS].find(c=>c.en===tx.category_name)?.id || "other")
            : "other",
          description: tx.description || "", note: tx.note || "",
          date: tx.date, confidence: tx.ai_confidence, createdAt: tx.created_at,
        })));
      }
    } catch (e) { console.error("Load error:", e); }
    setLoadingProfile(false);
  };

  const handleLogin = async (user, isNew, phone, countryCode) => {
    setUserId(user.id);
    try {
      await supabase.from("profiles").upsert({ id: user.id, phone: phone || null, phone_country_code: countryCode || null, last_seen_at: new Date().toISOString() }, { onConflict: "id" });
      await dbTrackEvent(user.id, "login", { phone, countryCode, isNew });
    } catch (e) { console.error("Login profile update:", e); }
    if (!isNew) await loadUserData(user.id);
  };

  const handleOnboarding = async (data) => {
    const p = { ...data, createdAt: new Date().toISOString() };
    setProfile(p);
    try {
      await dbUpsertProfile(userId, p);
      await dbTrackEvent(userId, "onboarding_complete", { lang: p.lang, baseCurrency: p.baseCurrency });
    } catch (e) { console.error(e); }
  };

  const handleAddTransaction = async (tx) => {
    setTransactions(prev => [tx, ...prev]);
    try {
      const cat = findCat(tx.categoryId, profile?.customCategories || []);
      const saved = await dbInsertTransaction(userId, { ...tx, categoryName: cat.en, categoryEmoji: cat.emoji, rawInput: tx.rawInput || tx.description });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, id: saved.id } : t));
      await dbTrackEvent(userId, "transaction_added", { type: tx.type, currency: tx.currency, category: tx.categoryId, amount: tx.amount });
    } catch (e) { console.error("Save tx error:", e); }
  };

  const handleUpdateProfile = async (changes) => {
    const updated = { ...profile, ...changes };
    setProfile(updated);
    try {
      await dbUpsertProfile(userId, updated);
      store.set(`phanote_extra_${userId}`, { avatar: updated.avatar, customCategories: updated.customCategories || [], expCats: updated.expCats, incCats: updated.incCats });
    } catch (e) { console.error(e); }
  };

  const handleUpdateNote = async (txId, note) => {
    setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, note } : tx));
    if (txId.startsWith("tx_")) return;
    try { await dbUpdateTransaction(txId, { note, edited_at: new Date().toISOString() }); } catch (e) { console.error(e); }
  };

  const handleUpdateCategory = async (txId, newCatId, newAmount=null, newDesc=null) => {
    setTransactions(prev => prev.map(tx => {
      if(tx.id !== txId) return tx;
      return { ...tx, categoryId: newCatId, ...(newAmount ? {amount: newAmount} : {}), ...(newDesc ? {description: newDesc} : {}) };
    }));
    if (txId.startsWith("tx_")) return;
    try {
      const cat = findCat(newCatId, profile?.customCategories || []);
      const updates = { category_name: cat.en, category_emoji: cat.emoji, edited_at: new Date().toISOString() };
      if (newAmount) updates.amount = newAmount;
      if (newDesc) updates.description = newDesc;
      await dbUpdateTransaction(txId, updates);
    } catch (e) { console.error("Update error:", e); }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Delete this transaction?")) return;
    setTransactions(prev => prev.filter(tx => tx.id !== txId));
    try {
      await dbUpdateTransaction(txId, { is_deleted: true, deleted_at: new Date().toISOString() });
      await dbTrackEvent(userId, "transaction_deleted", { txId });
    } catch (e) { console.error(e); }
  };

  const handleReset = async () => {
    if (!window.confirm(t(profile?.lang||"en","reset_confirm"))) return;
    setProfile(null); setTransactions([]);
    store.del(`phanote_extra_${userId}`);
    await supabase.auth.signOut(); setUserId(null);
  };

  // ── Loading splash ──
  if (booting) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg, #ACE1AF 0%, #7BC8A4 50%, #A8D8B9 100%)" }}>
      <div style={{ width:300, background:"#ffffff", borderRadius:16, padding:"32px 24px",
        filter:"drop-shadow(2px 4px 14px rgba(40,90,40,0.2))", display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:32 }}>📒</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#1a2e1a", fontFamily:"'Noto Sans',sans-serif", letterSpacing:-0.5 }}>PHANOTE</div>
            <div style={{ fontSize:10, color:"#9B9BAD", fontFamily:"'Noto Sans',sans-serif", letterSpacing:1 }}>ພາໂນດ · พาโนด</div>
          </div>
        </div>
        <div style={{ height:10, width:"90%", background:"#E9FFDB", borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:"70%", background:"linear-gradient(90deg, #5aae5f, #ACE1AF)", borderRadius:5, animation:"phanoteLoad 1.8s ease infinite" }}/>
        </div>
      </div>
      <style>{`@keyframes phanoteLoad { 0% { transform: translateX(-150%); } 100% { transform: translateX(280%); } }`}</style>
    </div>
  );

  if (!userId) return <LoginScreen onLogin={handleLogin} />;

  if (loadingProfile) return (
    <div style={{ minHeight:"100dvh", background:"#F7FCF5", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:52 }}>📒</div>
      <div style={{ fontSize:14, color:"#9B9BAD", fontFamily:"'Noto Sans',sans-serif" }}>Loading your data…</div>
    </div>
  );

  if (!profile) return (
    <OnboardingScreen
      onComplete={handleOnboarding}
      onBack={() => { supabase.auth.signOut(); setUserId(null); setProfile(null); setTransactions([]); }}
    />
  );

  return (
    <HomeScreen
      profile={profile}
      transactions={transactions}
      onAdd={handleAddTransaction}
      onReset={handleReset}
      onUpdateProfile={handleUpdateProfile}
      onUpdateNote={handleUpdateNote}
      onUpdateCategory={handleUpdateCategory}
      onDeleteTx={handleDeleteTransaction}
    />
  );
}