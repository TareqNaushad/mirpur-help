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
import servicesData from "../../../data/services.json";
import eventsData from "../../../data/events.json";
import { PROGRAMS } from "../../../data/eligibility";

export const dynamic = "force-dynamic";

// Build a compact Bangla knowledge base from the app's data so the assistant
// can ANSWER real questions (address, phone, hours, how to apply) — not just
// navigate. Kept short so it fits comfortably in the prompt.
function buildKnowledgeBase() {
  const lines = [];
  lines.push("সেবাকেন্দ্র (Services):");
  for (const s of servicesData.services) {
    lines.push(
      `• ${s.nameBn} — ঠিকানা/এলাকা: ${s.area}; ফোন: ${s.phone || "নেই"}; সময়: ${s.hours || "—"}; সেবা: ${s.descBn}`
    );
  }
  lines.push("\nজরুরি নম্বর (Helplines):");
  for (const h of servicesData.helplines) {
    lines.push(`• ${h.bn}: ${h.number}`);
  }
  lines.push("\nবিনা মূল্যে শিবির/ইভেন্ট (Free camps):");
  for (const e of eventsData.events) {
    lines.push(
      `• ${e.titleBn} (${e.organizerBn}) — স্থান: ${e.location}; তারিখ: ${e.date} ${e.startTime || ""}-${e.endTime || ""}; ফোন: ${e.phone || "নেই"}`
    );
  }
  lines.push("\nসরকারি ভাতা ও সহায়তা (Govt allowances):");
  for (const p of PROGRAMS) {
    lines.push(
      `• ${p.nameBn} — সুবিধা: ${p.benefitBn} আবেদন: ${p.applyBn} প্রয়োজন: ${p.docsBn}`
    );
  }
  return lines.join("\n");
}

const KNOWLEDGE_BASE = buildKnowledgeBase();

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

  let input;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-input" }, { status: 400 });
  }
  const text = String(input.text || "").slice(0, 400);
  const audioBase64 = typeof input.audioBase64 === "string" ? input.audioBase64 : "";
  const audioMime = String(input.mimeType || "audio/webm").split(";")[0];
  if (!text.trim() && !audioBase64) {
    return NextResponse.json({ ok: false, reason: "empty" });
  }

  // Try current model names in order (resilient to Google retiring models).
  const models = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-001",
  ].filter(Boolean);

  // Shared instructions: classify intent for navigation AND answer real
  // questions (address, phone, hours, how to apply) from the knowledge base.
  const RULES =
    `You are a warm, caring voice assistant for a service that helps poor and ` +
    `vulnerable people in Mirpur, Dhaka. Always answer in simple spoken Bangla.\n\n` +
    `KNOWLEDGE BASE (use ONLY this for facts — addresses, phones, hours, how to apply):\n` +
    `${KNOWLEDGE_BASE}\n\n` +
    `Do TWO things:\n` +
    `1) "intentId": pick the single best from this list so the app can open the ` +
    `right screen:${INTENT_HELP}\n` +
    `2) "replyBn": a short, warm Bangla reply (max 45 words) to SPEAK aloud. ` +
    `IMPORTANT: if the person asks for specific information (an address, phone ` +
    `number, opening hours, what a place offers, or how to apply for an ` +
    `allowance), ANSWER it directly from the knowledge base in replyBn — say the ` +
    `address and phone number clearly so it can be read aloud. Do not invent ` +
    `facts; if not in the knowledge base, say you don't know and suggest calling ` +
    `333. If it's just a general need, replyBn says what you are showing.\n` +
    `Output ONLY raw JSON, no preamble, no code fences: ` +
    `{"transcript":"...","intentId":"...","replyBn":"..."}`;

  const promptText = audioBase64
    ? `${RULES}\n\nThe attached audio is the person speaking in Bangla. First ` +
      `transcribe exactly what they said into "transcript".`
    : `${RULES}\n\nThe person said (in Bangla): "${text}". Put it in "transcript".`;

  const parts = audioBase64
    ? [{ text: promptText }, { inlineData: { mimeType: audioMime, data: audioBase64 } }]
    : [{ text: promptText }];

  try {
    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 1024,
        // Gemini 2.5 models "think" by default, consuming the token budget
        // before emitting output (which truncated our JSON). Disable it — this
        // is a simple, fast classification task.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let data = null;
    let lastDetail = "";
    let usedModel = "";
    for (const m of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (r.ok) {
        data = await r.json();
        usedModel = m;
        break;
      }
      lastDetail = await r.text();
      // 404 = model name gone, try the next candidate; other errors: stop early.
      if (r.status !== 404) break;
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, reason: "llm-error", detail: lastDetail },
        { status: 502 }
      );
    }
    // Gemini may split the reply across several parts — join them all,
    // otherwise the JSON can come back truncated/unterminated.
    const raw =
      (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || "")
        .join("") || "{}";
    // Robustly extract the JSON object even if the model wraps it in prose or
    // code fences (e.g. "Here is the JSON: { ... }").
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      let s = raw.replace(/```json|```/gi, "").trim();
      const a = s.indexOf("{");
      const b = s.lastIndexOf("}");
      if (a !== -1 && b !== -1 && b > a) s = s.slice(a, b + 1);
      parsed = JSON.parse(s);
    }
    const VALID = [
      "food", "medical", "medicine", "shelter", "clothes", "cash",
      "education", "eligibility", "events", "post-need", "emergency", "unknown",
    ];
    const intentId = VALID.includes(parsed.intentId) ? parsed.intentId : "unknown";
    const replyBn = String(parsed.replyBn || "").slice(0, 700);
    const transcript = String(parsed.transcript || text || "").slice(0, 400);
    return NextResponse.json({ ok: true, intentId, replyBn, transcript, model: usedModel });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "exception", detail: String(e) }, { status: 502 });
  }
}
