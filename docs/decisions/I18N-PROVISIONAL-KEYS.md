# Phajot — I18N Provisional Keys

> **Status:** Current source of truth (translation tuning queue).
> 
> Pre-loaded work queue for the Sprint H Language Strings Admin 
> Panel. Translations here were shipped to production with 
> Speaker approval, but AI-translated or partially tuned. When 
> the admin panel ships, Wife (or any admin) can edit these 
> entries via Supabase `translations` table without redeploying.

## Legend

- 🟢 Confident — stable, unlikely to need tuning. Not in queue.
- 🟡 Provisional — functional but AI-reasoned tone; Wife may polish.
- 🔴 Placeholder — known-weak, flagged for priority tuning.

Only 🟡 and 🔴 entries are listed below. 🟢 entries are the 
stable baseline.

## How to use this file post-Sprint-H

1. Open `tower.phajot.com/admin/language-strings`
2. Filter by keys listed here
3. Edit inline; save writes to Supabase `translations` table
4. Frontend fallback chain: DB → code-level i18n.js → EN → key name
5. Mark this file's entry ✅ RESOLVED when the tuning ships
6. Retire this file when all entries marked ✅ or dropped

## Session 14 entries — Sprint D close

Shipped April 17, 2026. Commits `155d09c`, `e7fe1a7`, `858d3a0`, 
`391d63e`.

### StreakModal + StreakBadge + streak.js (commit `155d09c`)

All Lao level names preserved from Session 13 Speaker approval 
(including `levelMaster` = ມາສເຕີ້/มาสเตอร์ loanword). Streak 
surface keys with provisional tone:

| Key | LO | TH | Why flagged |
|---|---|---|---|
| `streakTitle` | ຄວາມຄືບໜ້າຂອງເຈົ້າ | ความคืบหน้าของคุณ | "Progress" — tone may feel formal for gamification context |
| `streakLevelN` | ລະດັບ {n} | เลเวล {n} | TH uses gaming loanword; Wife's call if native term preferred |
| `streakLabel` | ຕິດຕໍ່ກັນ | ติดต่อกัน | "Consecutive" — works, but consider if stronger noun fits |
| `streakPctToLevel` | ອີກ {pct}% ຈະເຖິງລະດັບ {n} | อีก {pct}% จะถึงเลเวล {n} | Conversational particle; check rhythm when pct is 1-3 digit |
| `streakEarnXp` | ຮັບ XP | รับ XP | "Receive" — standard; Wife may prefer "ຫາ"/"หา" (find) |
| `streakEarn7day` | ຄວາມສຳເລັດ 7 ມື້ຕິດຕໍ່ກັນ | ความสำเร็จ 7 วันติดต่อกัน | "Achievement of N days" — functional; might feel wordy in list |
| `streakEarn30day` | ຄວາມສຳເລັດ 30 ມື້ຕິດຕໍ່ກັນ | ความสำเร็จ 30 วันติดต่อกัน | Same note as 7-day |
| `streakMilestones` | ຄວາມສຳເລັດຕໍ່ເນື່ອງ | ความสำเร็จต่อเนื่อง | "Continuous achievement" — Speaker-fixed from weak original |
| `streakMs3` | 3 ມື້ · ຜູ້ເລີ່ມຕົ້ນ | 3 วัน · ผู้เริ่มต้น | "Beginner" — culturally fine; check playful alternatives |
| `streakMs7` | 7 ມື້ · ສ້າງນິໄສ | 7 วัน · สร้างนิสัย | "Building a habit" — positive framing |
| `streakMs14` | 2 ອາທິດ · ນັກສູ້ | 2 สัปดาห์ · นักรบ | "Warrior" — fighting metaphor; OK for gaming tone |
| `streakMs30` | 30 ມື້ · ຕຳນານ | 30 วัน · ตำนาน | "Legend" — strong; keep |
| `streakBonusLabel` | ໂບນັດ {xp} | โบนัส {xp} | Loanword; standard |
| `streakBonusToast` | 🔥 ຕິດຕໍ່ກັນ {n} ມື້! +{xp} ໂບນັດ XP 🎉 | 🔥 ติดต่อกัน {n} วัน! +{xp} โบนัส XP 🎉 | Celebration tone check |

### GoalModal (commit `e7fe1a7`)

| Key | LO | TH | Why flagged |
|---|---|---|---|
| `goalNameHint` | ຕົວຢ່າງ: "ທ່ຽວບາລີ", "ໂທລະສັບໃໝ່" | เช่น "เที่ยวบาหลี", "โทรศัพท์ใหม่" | Examples — Bali may not be most-representative goal for Lao/Thai users; consider Luang Prabang / Japan / local aspiration |
| `goalMonthlySuggestion` | 💚 ເກັບ {amount}/ເດືອນ {n} ເດືອນ ກໍເຖິງເປົ້າໝາຍ | 💚 เก็บ {amount}/เดือน {n} เดือน ก็ถึงเป้าหมาย | Conversational particle ກໍ/ก็ — informal; check if suggestion hint tone is too casual |

### SettingsScreen (commit `858d3a0`)

No provisional entries — all strings reuse existing keys already 
reviewed in Session 13 sweep, or are new section headers with 
direct translations:

- `settingsToolsSection` — "Tools" (ເຄື່ອງມື/เครื่องมือ) — 🟢
- `settingsHelpAccount` — "Help & Account" (ຊ່ວຍເຫຼືອ & ບັນຊີ / 
  ช่วยเหลือ & บัญชี) — 🟢

### EditTransactionModal (commit `391d63e`)

- `editTxErrorBadAmount` — 🟢 stable, domain-standard wording

## Session 13 entries worth re-listing here (Sprint D pre-sweep)

The bulk of Session 13's 170+ strings were Speaker-reviewed in 
the 5-batch protocol (GuideScreen especially). Those are tracked 
via `docs/session-13/SUMMARY.md` wife-review-items table and not 
duplicated here. When admin panel ships, filter `translations` 
table by "last edited in Session 13" for that cohort.

Specific items called out in Session 13 summary:

| Item | Screen | Source |
|---|---|---|
| Thai `งบ` (nav) vs `งบประมาณ` (guide topics) | Budget | Session 13 SUMMARY wife-review row 1 |
| Thai `อยู่ในเส้นทาง` (Advisor Q2) — consider `ตามแผนไหม` | Guide | Session 13 SUMMARY wife-review row 2 |
| Lao `ໃຊ້ຈ່າຍໄດ້ອີກ` (Safe to spend brevity) | Guide | Session 13 SUMMARY wife-review row 3 |
| `ມາສເຕີ້/มาสเตอร์` (Master transliteration) | Streak / Guide | Speaker-confirmed, keep |

## Protocol for future sessions

When shipping new i18n strings:

1. In the chat translation table, tag each key 🟢/🟡/🔴.
2. After Speaker approval, include 🟡/🔴 entries here with source 
   commit hash.
3. Never let this file grow past ~50 active entries — if it does, 
   Wife needs to schedule tuning before new work lands.
4. Mark entries ✅ RESOLVED in-place when admin-panel tuning ships.

## Footer

Maintained Session 14+ as part of Sprint D closeout.
