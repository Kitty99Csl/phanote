/**
 * PHANOTE — Main API Worker v2
 * Domain: api.phanote.com
 * AI: Claude Haiku (fastest + cheapest)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PARSE_SYSTEM = `You are a financial transaction parser for Phanote, a personal finance app used in Laos and Thailand.
Users write in Lao, Thai, English, or mixed. Be smart about SEA context.

CURRENCY: บาท/baht/THB=THB, ກີບ/kip/LAK=LAK, $/dollar/USD=USD. Default=LAK.

TYPE — income keywords: salary/เงินเดือน/ເງິນເດືອນ, freelance, sell/ຂາຍ, received/ໄດ້ຮັບ, gift, bonus, dividend
TYPE — everything else = expense

CATEGORIES (pick ONE most specific):
- food: meals, rice, noodle, ເຂົ້າ, ອາຫານ, restaurant, burger, pizza, kfc, sushi
- drinks: beer, alcohol, wine, Beer Lao, lao lao, ດື່ມ, เบียร์
- coffee: coffee, cafe, กาแฟ, ກາເຟ, starbucks, amazon cafe
- transport: grab, taxi, tuk tuk, fuel, gas, bus, ລົດ, รถ
- travel: flight, hotel, trip, vacation, ທ່ອງທ່ຽວ
- shopping: clothes, bag, market, mall, caddi, ຊື້ເຄື່ອງ
- rent: rent, electricity, water, internet, bill, ຄ່າ, phone bill
- health: doctor, hospital, medicine, ໂຮງໝໍ, ຢາ
- beauty: salon, haircut, spa, nail, ຕັດຜົມ
- fitness: golf, gym, sport, exercise, ອອກກຳລັງ
- entertainment: netflix, spotify, youtube, disney, icon, karaoke, movie, concert, morlam, mor lam, party, subscription
- gaming: game, steam, playstation, xbox
- education: school, book, course, ຮຽນ
- salary: salary, wage, เงินเดือน, ເງິນເດືອນ
- freelance: freelance, commission, ຄ່າຈ້າງ
- selling: sell, sold, ຂາຍ, sale
- gift: gift, present, ຂອງຂວັນ
- bonus: bonus, ໂບນັດ
- investment: stocks, crypto, interest, dividend
- transfer: transfer, received money, ໂອນ
- other: anything unclear

IMPORTANT CONTEXT:
- "icon" in Laos = Icon shopping (entertainment/shopping)
- "mor lam" / "morlam" = Lao traditional music show (entertainment)
- "lao lao" = Lao rice whisky (drinks)
- "BCEL" = bank (transfer)
- "true money" = payment service (transfer)
- Golf in Laos is very common leisure activity (fitness)

Return ONLY valid JSON:
{"amount":number,"currency":"LAK"|"THB"|"USD","type":"expense"|"income","category":"food"|"drinks"|"coffee"|"transport"|"travel"|"shopping"|"rent"|"health"|"beauty"|"fitness"|"entertainment"|"gaming"|"education"|"salary"|"freelance"|"selling"|"gift"|"bonus"|"investment"|"transfer"|"other","description":"clean short English/Lao label","confidence":0.0-1.0}`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        status: "ok", service: "Phanote API", version: "2.0.0",
        ai: "claude-haiku-4-5",
        routes: ["/parse", "/ocr (Phase 2)", "/voice (Phase 2)", "/line (Phase 3)"]
      }, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    // ─── POST /parse ─────────────────────────────────────────────
    if (url.pathname === "/parse") {
      let text = "", userId = null;
      try {
        const body = await request.json();
        text = body.text || "";
        userId = body.userId || null;
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
      }

      if (!text.trim()) {
        return Response.json({ error: "Empty input" }, { status: 400, headers: CORS });
      }

      try {
        // Call Claude Haiku — fastest model
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 150,
            system: PARSE_SYSTEM,
            messages: [{ role: "user", content: text }],
          }),
        });

        const data = await claudeRes.json();
        const raw = data?.content?.[0]?.text || "{}";

        try {
          const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
          return Response.json({ ...parsed, model: "haiku" }, { headers: CORS });
        } catch {
          return Response.json(
            { amount: 0, currency: "LAK", type: "expense",
              category: "other", description: text.slice(0, 40),
              confidence: 0.3, model: "fallback" },
            { headers: CORS }
          );
        }
      } catch (e) {
        return Response.json(
          { error: "Parse error", message: e.message },
          { status: 500, headers: CORS }
        );
      }
    }

    // ─── POST /ocr — Phase 2 ──────────────────────────────────────
    if (url.pathname === "/ocr") {
      return Response.json({ error: "Coming in Phase 2" }, { status: 501, headers: CORS });
    }

    // ─── POST /voice — Phase 2 ────────────────────────────────────
    if (url.pathname === "/voice") {
      return Response.json({ error: "Coming in Phase 2" }, { status: 501, headers: CORS });
    }

    // ─── POST /line — Phase 3 ─────────────────────────────────────
    if (url.pathname === "/line") {
      return Response.json({ error: "Coming in Phase 3" }, { status: 501, headers: CORS });
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },
};