/**
 * PHANOTE — v3
 * New: inline post-save notes, custom categories, expanded defaults, better AI prompt
 */
import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://mmvyipjbufafqfjdcuqj.supabase.co";
const T = {
  celadon:"#ACE1AF",bg:"#F7FCF5",surface:"rgba(255,255,255,0.92)",
  dark:"#2D2D3A",muted:"#9B9BAD",
  shadow:"0 4px 24px rgba(45,45,58,0.07)",shadowLg:"0 12px 40px rgba(45,45,58,0.13)",
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

// ─── DEFAULT CATEGORIES (expanded for Lao/SEA life) ──────────
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

// Build ALL_CATS dynamically (includes custom)
const buildAllCats=(customCats=[])=>[...DEFAULT_EXPENSE_CATS,...DEFAULT_INCOME_CATS,...customCats];
const findCat=(id,customCats=[])=>buildAllCats(customCats).find(c=>c.id===id)||DEFAULT_EXPENSE_CATS[0];

// ─── CATEGORY NORMALIZER ─────────────────────────────────────
const normalizeCategory=(cat,type)=>{
  const m={
    // Food
    food:"food",eating:"food",restaurant:"food",lunch:"food",dinner:"food",
    breakfast:"food",meal:"food",rice:"food",noodle:"food",pho:"food",
    ເຂົ້າ:"food",ເຂົ້າປຽກ:"food",ອາຫານ:"food",
    // Drinks
    beer:"drinks",alcohol:"drinks",wine:"drinks",lao:"drinks","beer lao":"drinks",
    whiskey:"drinks",drinking:"drinks",ດື່ມ:"drinks",
    // Coffee
    coffee:"coffee",cafe:"coffee",กาแฟ:"coffee",ກາເຟ:"coffee",latte:"coffee",
    // Transport
    transport:"transport",taxi:"transport",grab:"taxi",uber:"transport",
    bus:"transport",fuel:"transport",gas:"transport",car:"transport",
    petrol:"transport",tuk:"transport",
    // Travel
    travel:"travel",flight:"travel",hotel:"travel",trip:"travel",
    vacation:"travel",holiday:"travel",
    // Rent/Bills
    rent:"rent",bills:"rent",utilities:"rent",housing:"rent",electric:"rent",
    water:"rent",internet:"rent",phone:"rent",electricity:"rent",
    // Shopping
    shopping:"shopping",clothes:"shopping",shop:"shopping",market:"shopping",
    bag:"shopping",plastic:"shopping",grocery:"shopping",
    caddie:"shopping",caddy:"shopping",
    // Health
    health:"health",medical:"health",doctor:"health",medicine:"health",hospital:"health",
    clinic:"health",pharmacy:"health",
    // Beauty
    beauty:"beauty",salon:"beauty",haircut:"beauty",nail:"beauty",spa:"beauty",
    // Fitness
    fitness:"fitness",gym:"fitness",sport:"fitness",exercise:"fitness",
    golf:"fitness",swimming:"fitness",yoga:"fitness",
    // Entertainment
    entertainment:"entertainment",movie:"entertainment",concert:"entertainment",
    event:"entertainment",party:"entertainment",festival:"entertainment",
    karaoke:"entertainment","mor lam":"entertainment",morlam:"entertainment",
    nightclub:"entertainment",bar:"entertainment",
    // Gaming
    gaming:"gaming",game:"gaming",games:"gaming",
    // Education
    education:"education",school:"education",book:"education",course:"education",
    // Income types
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

// ─── AI PARSER (improved prompt with SEA context + examples) ──
const makeParseSystem=(customCatIds=[])=>`You are a financial transaction parser for a personal finance app for people in Laos.
Input language: Lao, Thai, English, or mixed. Currency default: LAK.

CURRENCY RULES:
- บาท/baht/THB → THB. กีบ/ກີບ/kip/LAK → LAK. $/ dollar/USD → USD
- Default to LAK if unclear

TYPE RULES (income vs expense):
- Income keywords: salary/เงินเดือน/ເງິນເດືອນ, freelance, sell/sale/ຂາຍ, received/ໄດ້ຮັບ, gift, bonus, interest, dividend, investment return, ລາຍຮັບ, รายรับ
- Everything else = expense

CATEGORY (pick the MOST specific match):
food=meals/rice/noodles, drinks=beer/alcohol/wine, coffee=coffee/cafe,
transport=taxi/grab/tuk tuk/fuel, travel=flight/hotel/trip,
rent=rent/electricity/water/internet, shopping=clothes/bags/market/caddie,
health=doctor/medicine/hospital, beauty=salon/haircut/spa,
fitness=gym/golf/sport/exercise, entertainment=movie/karaoke/morlam/concert/party,
gaming=games, education=school/books,
salary=salary/wage, freelance=freelance/commission, selling=sold/sale item,
gift=gift/present, bonus=bonus, investment=stocks/crypto/interest,
transfer=money received/transfer in${customCatIds.length?", "+customCatIds.join("/"):""}

EXAMPLES:
"ເຂົ້າປຽກ 50000 LAK" → {"amount":50000,"currency":"LAK","type":"expense","category":"food","description":"ເຂົ້າປຽກ","confidence":0.98}
"Beer Lao Gold 500000" → {"amount":500000,"currency":"LAK","type":"expense","category":"drinks","description":"Beer Lao Gold","confidence":0.96}
"Golf 25000 LAK" → {"amount":25000,"currency":"LAK","type":"expense","category":"fitness","description":"Golf","confidence":0.9}
"karaoke 10000 kip" → {"amount":10000,"currency":"LAK","type":"expense","category":"entertainment","description":"Karaoke","confidence":0.95}
"Mor Lam 500000 LAK" → {"amount":500000,"currency":"LAK","type":"expense","category":"entertainment","description":"Mor Lam","confidence":0.95}
"ຂາຍເຄື່ອງ 200000 LAK" → {"amount":200000,"currency":"LAK","type":"income","category":"selling","description":"ຂາຍເຄື່ອງ","confidence":0.97}
"salary 15000 THB" → {"amount":15000,"currency":"THB","type":"income","category":"salary","description":"Salary","confidence":0.99}
"กาแฟ 95 บาท" → {"amount":95,"currency":"THB","type":"expense","category":"coffee","description":"กาแฟ","confidence":0.98}

Return ONLY valid JSON, no markdown:
{"amount":<number>,"currency":"LAK"|"THB"|"USD","type":"expense"|"income","category":"food"|"drinks"|"coffee"|"transport"|"travel"|"rent"|"shopping"|"health"|"beauty"|"fitness"|"entertainment"|"gaming"|"education"|"salary"|"freelance"|"selling"|"gift"|"bonus"|"investment"|"transfer"|"other","description":"<clean short label>","confidence":<0.0-1.0>}`;

const parseWithAI=async(text,customCatIds=[])=>{
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,
        system:makeParseSystem(customCatIds),messages:[{role:"user",content:text}]}),
    });
    const data=await res.json();
    const raw=data.content?.[0]?.text||"{}";
    const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
    parsed.category=normalizeCategory(parsed.category,parsed.type);
    return parsed;
  }catch{
    const numMatch=text.match(/[\d,]+(?:\.\d+)?/);
    const amount=numMatch?parseFloat(numMatch[0].replace(/,/g,"")):0;
    const currency=/THB|baht|บาท/i.test(text)?"THB":/USD|dollar|\$/i.test(text)?"USD":"LAK";
    const type=/income|salary|sell|sale|ຂາຍ|เงินเดือน|ເງິນເດືອນ|ລາຍຮັບ|รายรับ/i.test(text)?"income":"expense";
    return{amount,currency,type,category:type==="income"?"salary":"food",description:text.slice(0,40),confidence:0.35};
  }
};

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
const randomToast=(tx)=>{const pool=TOASTS[tx.type];return pool[Math.floor(Math.random()*pool.length)](tx.description,tx.amount,tx.currency);};

// ─── UI PRIMITIVES ────────────────────────────────────────────
const AnimalBg=()=>(
  <svg aria-hidden="true" style={{position:"fixed",inset:0,width:"100%",height:"100%",opacity:0.05,pointerEvents:"none",zIndex:0}}>
    <defs><pattern id="pbg" x="0" y="0" width="240" height="240" patternUnits="userSpaceOnUse">
      <ellipse cx="50" cy="72" rx="32" ry="18" fill="#ACE1AF"/>
      <ellipse cx="50" cy="56" rx="20" ry="15" fill="#ACE1AF"/>
      <ellipse cx="64" cy="50" rx="11" ry="8" fill="#ACE1AF"/>
      <ellipse cx="180" cy="170" rx="24" ry="16" fill="#C9B8FF"/>
      <ellipse cx="180" cy="156" rx="16" ry="14" fill="#C9B8FF"/>
      <polygon points="168,145 172,132 178,145" fill="#C9B8FF"/>
      <polygon points="182,145 188,132 194,145" fill="#C9B8FF"/>
      <ellipse cx="120" cy="120" rx="26" ry="17" fill="#FFB3A7"/>
      <ellipse cx="120" cy="104" rx="16" ry="14" fill="#FFB3A7"/>
      <circle cx="200" cy="40" r="5" fill="#ACE1AF"/>
      <circle cx="192" cy="31" r="3" fill="#ACE1AF"/>
      <circle cx="200" cy="29" r="3" fill="#ACE1AF"/>
      <circle cx="208" cy="31" r="3" fill="#ACE1AF"/>
    </pattern></defs>
    <rect width="100%" height="100%" fill="url(#pbg)"/>
  </svg>
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

// ═══ ONBOARDING ═══════════════════════════════════════════════
function OnboardingScreen({onComplete}){
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
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:24,boxShadow:T.shadowLg,overflow:"hidden"}}>
        <div style={{padding:"14px 20px 10px",fontSize:10,fontWeight:700,letterSpacing:1.4,color:T.muted,textTransform:"uppercase",fontFamily:"'Noto Sans',sans-serif"}}>All Wallets</div>
        {["LAK","THB","USD"].map((cur,i)=>{
          const cfg=CURR[cur],stats=getStats(cur),open=expanded===cur,bal=stats.balance;
          return(<div key={cur}>
            {i>0&&<div style={{height:1,background:"rgba(45,45,58,0.05)",margin:"0 20px"}}/>}
            <div onClick={()=>setExpanded(open?null:cur)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",cursor:"pointer",transition:"background .15s"}}
              onPointerEnter={e=>e.currentTarget.style.background="rgba(172,225,175,0.06)"}
              onPointerLeave={e=>e.currentTarget.style.background="transparent"}>
              <Flag code={cur} size={36}/>
              <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cfg.name}</div><div style={{fontSize:11,color:T.muted,marginTop:1}}>{cur} · {cfg.symbol}</div></div>
              <div style={{fontSize:20,fontWeight:800,color:bal<0?"#C0392B":T.dark,fontFamily:"'Noto Sans',sans-serif",letterSpacing:-0.5}}>{bal<0&&"−"}{cfg.symbol}{Math.abs(bal).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
              <div style={{fontSize:12,color:T.muted,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s ease",marginLeft:4}}>▾</div>
            </div>
            {open&&(<div style={{display:"flex",gap:10,padding:"4px 20px 16px",animation:"slideDown .2s ease"}}>
              <div style={{flex:1,padding:"10px 14px",borderRadius:14,background:"rgba(172,225,175,0.15)"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:0.8,color:"#2A7A40",textTransform:"uppercase"}}>Income</div><div style={{fontSize:17,fontWeight:800,color:"#1A5A30",marginTop:4,fontFamily:"'Noto Sans',sans-serif"}}>+{fmt(stats.income,cur)}</div></div>
              <div style={{flex:1,padding:"10px 14px",borderRadius:14,background:"rgba(255,179,167,0.15)"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:0.8,color:"#A03020",textTransform:"uppercase"}}>Expenses</div><div style={{fontSize:17,fontWeight:800,color:"#C0392B",marginTop:4,fontFamily:"'Noto Sans',sans-serif"}}>−{fmt(stats.expenses,cur)}</div></div>
            </div>)}
          </div>);
        })}
      </div>
    </div>
  );
}

// ═══ CONFIRM MODAL (with pre-save note) ═══════════════════════
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

// ═══ QUICK ADD ════════════════════════════════════════════════
function QuickAddBar({lang,onAdd,customCategories=[]}){
  const[input,setInput]=useState("");
  const[status,setStatus]=useState("idle");
  const[pending,setPending]=useState(null);
  const inputRef=useRef();
  const submit=useCallback(async()=>{
    if(!input.trim()||status==="parsing")return;
    setStatus("parsing");
    const customCatIds=customCategories.map(c=>c.id);
    const result=await parseWithAI(input,customCatIds);
    if(!result?.amount||result.amount<=0){setStatus("error");setTimeout(()=>setStatus("idle"),2500);return;}
    if(result.confidence<0.72){setPending({...result,rawInput:input});setStatus("confirm");}
    else finalizeAdd({...result,rawInput:input,note:""});
  },[input,status,customCategories]);
  const finalizeAdd=(parsed)=>{
    const catId=normalizeCategory(parsed.category,parsed.type);
    const cat=findCat(catId,customCategories);
    onAdd({id:`tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,amount:parsed.amount,currency:parsed.currency,type:parsed.type,categoryId:cat.id,description:parsed.description||parsed.rawInput||"",note:parsed.note||"",date:new Date().toISOString().split("T")[0],confidence:parsed.confidence,createdAt:new Date().toISOString()});
    setInput("");setStatus("idle");setPending(null);inputRef.current?.focus();
  };
  return(<>
    <div style={{padding:"0 16px"}}>
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:20,padding:"10px 14px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:18,flexShrink:0}}>✏️</div>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t(lang,"placeholder")} style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:14,color:T.dark,fontFamily:"'Noto Sans',sans-serif",minWidth:0}}/>
        <button onClick={submit} disabled={status==="parsing"} style={{width:40,height:40,borderRadius:13,border:"none",cursor:"pointer",background:status==="error"?"#FFB3A7":status==="parsing"?"rgba(172,225,175,0.4)":T.celadon,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all .2s ease",flexShrink:0,boxShadow:status==="parsing"?"none":"0 3px 10px rgba(172,225,175,0.4)"}}>
          {status==="parsing"?"⏳":status==="error"?"✗":"↑"}
        </button>
      </div>
      {status==="parsing"&&<div style={{fontSize:12,color:T.muted,textAlign:"center",marginTop:6,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"parsing")}</div>}
    </div>
    {status==="confirm"&&pending&&<ConfirmModal parsed={pending} lang={lang} onConfirm={finalizeAdd} onEdit={()=>{setStatus("idle");setPending(null);}}/>}
  </>);
}

// ═══ TRANSACTION LIST (inline post-save notes) ════════════════
function TransactionList({transactions,lang,onUpdateNote,customCategories=[]}){
  const[editingNote,setEditingNote]=useState(null);
  const[noteInput,setNoteInput]=useState("");
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
                  {/* Main row */}
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
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
                  {/* Note area */}
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
                        <button onClick={()=>startEdit(tx)} style={{fontSize:11,color:T.muted,border:"none",cursor:"pointer",background:"transparent",padding:"2px 0",fontFamily:"'Noto Sans',sans-serif",letterSpacing:0.3}}>
                          {t(lang,"add_note")}
                        </button>
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
        {customCategories.length===0&&!adding&&(
          <div style={{padding:"16px 18px",fontSize:13,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>No custom categories yet</div>
        )}
        {customCategories.map((cat,i)=>(
          <div key={cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderTop:i>0?"1px solid rgba(45,45,58,0.05)":"none"}}>
            <span style={{fontSize:22}}>{cat.emoji}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{cat.en}</div><div style={{fontSize:11,color:T.muted}}>{cat.type}</div></div>
            <button onClick={()=>onRemove(cat.id)} style={{fontSize:16,border:"none",background:"none",cursor:"pointer",color:"#FFB3A7",padding:"4px 8px"}}>✕</button>
          </div>
        ))}
        {adding&&(
          <div style={{padding:"14px 18px",borderTop:customCategories.length?"1px solid rgba(45,45,58,0.05)":"none"}}>
            {/* Emoji picker */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <button onClick={()=>setShowEmoji(!showEmoji)} style={{width:46,height:46,borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",background:"rgba(172,225,175,0.06)",fontSize:24,cursor:"pointer"}}>{newEmoji}</button>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t(lang,"category_name")} autoFocus style={{flex:1,padding:"11px 14px",borderRadius:14,border:"1.5px solid rgba(45,45,58,0.1)",outline:"none",fontSize:13,fontFamily:"'Noto Sans',sans-serif",color:T.dark,background:"rgba(172,225,175,0.06)"}}
                onFocus={e=>e.target.style.borderColor="#ACE1AF"} onBlur={e=>e.target.style.borderColor="rgba(45,45,58,0.1)"}/>
            </div>
            {showEmoji&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,padding:"10px",borderRadius:14,background:"rgba(45,45,58,0.04)"}}>
                {EMOJI_PICKS.map(e=><button key={e} onClick={()=>{setNewEmoji(e);setShowEmoji(false);}} style={{fontSize:22,border:"none",background:newEmoji===e?"rgba(172,225,175,0.3)":"transparent",cursor:"pointer",borderRadius:8,padding:"4px",width:36,height:36}}>{e}</button>)}
              </div>
            )}
            {/* Type toggle */}
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
      {!adding&&(
        <button onClick={()=>setAdding(true)} style={{width:"100%",padding:"12px",borderRadius:16,border:"1.5px dashed rgba(172,225,175,0.5)",cursor:"pointer",background:"transparent",color:"#5aae5f",fontWeight:700,fontSize:13,fontFamily:"'Noto Sans',sans-serif"}}>
          + {t(lang,"add_category")}
        </button>
      )}
    </div>
  );
}

// ═══ SETTINGS ════════════════════════════════════════════════
function SettingsScreen({profile,transactions,onUpdateProfile,onReset}){
  const{lang,baseCurrency,name,avatar,customCategories=[]}=profile;
  const[showLang,setShowLang]=useState(false);
  const[showCur,setShowCur]=useState(false);
  const LANGS=[{code:"lo",flag:"🇱🇦",label:"ລາວ"},{code:"th",flag:"🇹🇭",label:"ไทย"},{code:"en",flag:"🇬🇧",label:"English"}];
  const btnStyle=(active)=>({display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"'Noto Sans',sans-serif",background:active?"rgba(172,225,175,0.3)":"rgba(45,45,58,0.05)",fontWeight:active?700:500,fontSize:13,color:T.dark});
  return(
    <div style={{padding:"52px 20px 24px",position:"relative",zIndex:1}}>
      <div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif",marginBottom:24}}>{t(lang,"settings")}</div>
      {/* Profile */}
      <div style={{background:T.surface,backdropFilter:"blur(20px)",borderRadius:24,padding:"20px",boxShadow:T.shadow,marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 4px 14px rgba(172,225,175,0.4)"}}>{avatar}</div>
        <div><div style={{fontWeight:800,fontSize:18,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{name}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{transactions.length} transactions logged</div></div>
      </div>
      {/* Language */}
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
      {/* Custom categories */}
      <CategoryManager
        lang={lang}
        customCategories={customCategories}
        onAdd={(cat)=>onUpdateProfile({customCategories:[...customCategories,cat]})}
        onRemove={(id)=>onUpdateProfile({customCategories:customCategories.filter(c=>c.id!==id)})}
      />
      <div style={{marginTop:24}}/>
      <button onClick={onReset} style={{width:"100%",padding:"14px",borderRadius:16,border:"none",cursor:"pointer",background:"rgba(255,179,167,0.15)",color:"#C0392B",fontWeight:700,fontSize:14,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"reset")}</button>
    </div>
  );
}

const StubScreen=({icon,title,lang})=>(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,gap:14,padding:40}}><div style={{fontSize:64}}>{icon}</div><div style={{fontWeight:800,fontSize:22,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{title}</div><div style={{background:"rgba(172,225,175,0.15)",borderRadius:14,padding:"10px 20px",fontSize:13,fontWeight:700,color:"#2A7A40"}}>Coming in Phase 2 🚀</div></div>);

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

function HomeScreen({profile,transactions,onAdd,onReset,onUpdateProfile,onUpdateNote}){
  const[tab,setTab]=useState("home");
  const[toast,setToast]=useState(null);
  const{lang,customCategories=[]}=profile;
  const greet=()=>{const h=new Date().getHours();if(h<12)return t(lang,"morning");if(h<17)return t(lang,"afternoon");return t(lang,"evening");};
  const dateStr=new Date().toLocaleDateString(lang==="th"?"th-TH":lang==="lo"?"lo-LA":"en-US",{weekday:"long",month:"long",day:"numeric"});
  const handleAdd=(tx)=>{onAdd(tx);setToast(randomToast({...tx,description:tx.description||findCat(tx.categoryId,customCategories).en}));};
  return(
    <div style={{height:"100dvh",background:T.bg,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <AnimalBg/>

      {/* ── FIXED TOP: header + wallet (home tab only) ── */}
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:10,background:"rgba(247,252,245,0.97)",backdropFilter:"blur(16px)"}}>
          {/* Greeting header */}
          <div style={{padding:"52px 20px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12,color:T.muted,fontFamily:"'Noto Sans',sans-serif"}}>{dateStr}</div>
                <div style={{fontSize:20,fontWeight:800,color:T.dark,marginTop:2,fontFamily:"'Noto Sans',sans-serif"}}>{greet()}, {profile.name} 👋</div>
              </div>
              <button onClick={()=>setTab("settings")} style={{width:46,height:46,borderRadius:15,border:"none",cursor:"pointer",background:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",fontSize:24,boxShadow:"0 3px 10px rgba(172,225,175,0.4)",flexShrink:0}}>{profile.avatar}</button>
            </div>
          </div>
          {/* Wallet cards — always visible */}
          <div style={{paddingBottom:16}}>
            <WalletCards transactions={transactions}/>
          </div>
          {/* Recent label */}
          <div style={{padding:"0 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(45,45,58,0.05)"}}>
            <div style={{fontSize:14,fontWeight:700,color:T.dark,fontFamily:"'Noto Sans',sans-serif"}}>{t(lang,"recent")}</div>
            <div style={{fontSize:12,color:T.muted}}>{transactions.length} total</div>
          </div>
        </div>
      )}

      {/* ── SCROLLABLE MIDDLE ── */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {tab==="home"&&(
          <>
            <div style={{paddingTop:8}}/>
            <TransactionList transactions={transactions} lang={lang} onUpdateNote={onUpdateNote} customCategories={customCategories}/>
            <div style={{height:16}}/>
          </>
        )}
        {tab==="analytics"&&<StubScreen icon="📊" title="Analytics" lang={lang}/>}
        {tab==="budget"&&<StubScreen icon="💰" title="Budget" lang={lang}/>}
        {tab==="settings"&&<SettingsScreen profile={profile} transactions={transactions} onUpdateProfile={onUpdateProfile} onReset={onReset}/>}
      </div>

      {/* ── FIXED BOTTOM: input bar (home only) + nav ── */}
      {tab==="home"&&(
        <div style={{flexShrink:0,zIndex:150,background:"rgba(247,252,245,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(45,45,58,0.06)",padding:"8px 0 4px"}}>
          <QuickAddBar lang={lang} onAdd={handleAdd} customCategories={customCategories}/>
        </div>
      )}
      <BottomNav active={tab} onTab={setTab} lang={lang}/>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

const S={title:{fontFamily:"'Noto Sans',sans-serif",fontSize:20,fontWeight:800,color:"#2D2D3A",marginBottom:6},sub:{fontSize:13,color:"#9B9BAD",marginBottom:16,lineHeight:1.5},label:{fontSize:13,fontWeight:700,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}};

export default function App(){
  const[profile,setProfile]=useState(null);
  const[transactions,setTransactions]=useState([]);
  const[booting,setBooting]=useState(true);
  useEffect(()=>{const link=document.createElement("link");link.rel="stylesheet";link.href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;700&display=swap";document.head.appendChild(link);},[]);
  useEffect(()=>{const style=document.createElement("style");style.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#F7FCF5;overscroll-behavior:none;font-family:'Noto Sans','Noto Sans Lao',system-ui,sans-serif}input{-webkit-appearance:none}::-webkit-scrollbar{display:none}@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`;document.head.appendChild(style);},[]);
  useEffect(()=>{const p=store.get("phanote_profile");const tx=store.get("phanote_transactions")||[];if(p)setProfile(p);setTransactions(tx);setBooting(false);},[]);
  const handleOnboarding=(data)=>{const p={...data,createdAt:new Date().toISOString()};store.set("phanote_profile",p);setProfile(p);};
  const handleAddTransaction=(tx)=>{const updated=[...transactions,tx];setTransactions(updated);store.set("phanote_transactions",updated);};
  const handleUpdateProfile=(changes)=>{const updated={...profile,...changes};setProfile(updated);store.set("phanote_profile",updated);};
  const handleUpdateNote=(txId,note)=>{const updated=transactions.map(tx=>tx.id===txId?{...tx,note}:tx);setTransactions(updated);store.set("phanote_transactions",updated);};
  const handleReset=()=>{if(!window.confirm(t(profile?.lang||"en","reset_confirm")))return;store.del("phanote_profile");store.del("phanote_transactions");setProfile(null);setTransactions([]);};
  if(booting)return(<div style={{minHeight:"100dvh",background:"#F7FCF5",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:40}}>📒</div></div>);
  if(!profile)return <OnboardingScreen onComplete={handleOnboarding}/>;
  return <HomeScreen profile={profile} transactions={transactions} onAdd={handleAddTransaction} onReset={handleReset} onUpdateProfile={handleUpdateProfile} onUpdateNote={handleUpdateNote}/>;
}