// ---------------------------------------------------------------------------
// POST /api/voice  — understand free-form Bangla with a free LLM (Gemini)
//
// Body: { text: "<what the user said in Bangla>" }
// Returns: { ok, intentId, replyBn }  — intentId is one of the app's intents
//          (or "unknown"); replyBn is a short, warm Bangla sentence to speak.
//
// Uses Google Gemini's FREE tier. Set GEMINI_API_KEY (get one free at
// https://aistudio.google.com/apikey). Optional GEMINI_MODEL (default
// gemini-2.0-flash). If no key is set, returns ok:false so the client falls
// back to offline keyword matching — the app keeps working with zero cost.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INTENT_HELP = `
- food: needs food / is hungry (খাবার, খিদে)
- medical: sick, needs a doctor / hospital (ডাক্তার, অসুস্থ, জ্বর)
- medicine: needs medicine (ঔষধ)
- shelter: needs a place to stay / homeless (থাকার জায়গা, আশ্রয়)
- clothes: needs clothes / blanket (কাপড়, কম্বল)
- cash: needs money / financial help (টাকা, আর্থিক সাহায্য)
- education: needs help with study / school (পড়াশোনা, স্কুল)
- eligibility: asks about government allowance / who qualifies (ভাতা, বয়স্ক/বিধবা/প্রতিবন্ধী ভাতা)
- events: asks about free camps / events / vaccination (বিনা মূল্যে শিবির, টিকা)
- post-need: wants to post a request for help so donors can see it
- emergency: urgent danger, police, fire, ambulance (জরুরি)
- unknown: unclear / none of the above`;

export async function POST(req) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return NextResponse.json({ ok: false, reason: "no-key" });
  }

  let text = "";
  try {
    text = String((await req.json()).text || "").slice(0, 400);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-input" }, { status: 400 });
  }
  if (!text.trim()) return NextResponse.json({ ok: false, reason: "empty" });

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt =
    `You help poor and vulnerable people in Mirpur, Dhaka find free help. ` +
    `The user spoke in Bangla; here is what they said: "${text}".\n\n` +
    `Pick the single best intentId from this list:${INTENT_HELP}\n\n` +
    `Then write "replyBn": a SHORT (max 25 words), warm, simple Bangla sentence ` +
    `telling them what you are showing or doing (e.g. "খাবারের জন্য কাছের জায়গাগুলো দেখাচ্ছি।"). ` +
    `If intent is unknown, gently ask in Bangla what they need. ` +
    `Reply ONLY as JSON: {"intentId": "...", "replyBn": "..."}.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json({ ok: false, reason: "llm-error", detail }, { status: 502 });
    }
    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Strip any stray fences just in case.
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    }
    const VALID = [
      "food", "medical", "medicine", "shelter", "clothes", "cash",
      "education", "eligibility", "events", "post-need", "emergency", "unknown",
    ];
    const intentId = VALID.includes(parsed.intentId) ? parsed.intentId : "unknown";
    const replyBn = String(parsed.replyBn || "").slice(0, 300);
    return NextResponse.json({ ok: true, intentId, replyBn });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "exception", detail: String(e) }, { status: 502 });
  }
}
