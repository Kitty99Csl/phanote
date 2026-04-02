const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

// NOTE: In production, move this to a Supabase Edge Function.
// For Phase 1 alpha (2 users), calling from frontend is acceptable.

export async function parseExpense(input, categories = []) {
  const catNames = categories.map(c => c.name_en.toLowerCase()).join(', ')

  const prompt = `You are a financial transaction parser for Phanote, a multi-currency app used in Laos.
The user may write in Lao, Thai, English, or any mix.
Currencies: LAK (Lao Kip), THB (Thai Baht), USD (US Dollar).

Currency detection:
- บาท, baht, ฿ → THB
- กีบ, ກີບ, kip, ₭ → LAK
- $, dollar, ดอลลาร์, ໂດລາ → USD
- No currency + Thai text → THB
- No currency + Lao text → LAK
- Large round numbers (10000+) with no currency → LAK

Type detection:
- เงินเดือน, ເງິນເດືອນ, salary, income, received, ได้รับ → "income"
- Everything else → "expense"

Available categories: ${catNames || 'food, transport, housing, shopping, health, entertainment, salary, freelance, other'}

From the input, extract:
- amount (number, no commas)
- currency (LAK | THB | USD)
- type (expense | income)
- suggested_category (best match from available categories)
- description (short, same language as input)
- confidence (0.0 to 1.0)

Return ONLY valid JSON. No markdown, no backticks, no explanation.
Example: {"amount":50000,"currency":"LAK","type":"expense","suggested_category":"food","description":"ເຂົ້າປຽກ","confidence":0.95}

User input: ${input}`

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    })

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.error('Gemini parse error:', err)
    return null
  }
}
