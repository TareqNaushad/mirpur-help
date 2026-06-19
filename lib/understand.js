// ---------------------------------------------------------------------------
// Shared Bangla understanding brain — used by BOTH the web voice assistant
// (/api/voice) and the phone line / IVR (/api/ivr/*).
//
// understand({ text }) or understand({ audioBase64, mimeType })
//   -> { ok, intentId, replyBn, transcript, model } | { ok:false, reason }
//
// Uses Google Gemini's free tier (GEMINI_API_KEY). It classifies the need into
// an intent AND answers real questions (address, phone, hours, how to apply)
// from a knowledge base built out of the app's own data.
// ---------------------------------------------------------------------------

import servicesData from "../data/services.json";
import eventsData from "../data/events.json";
import { PROGRAMS } from "../data/eligibility";

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

const VALID = [
  "food", "medical", "medicine", "shelter", "clothes", "cash",
  "education", "eligibility", "events", "post-need", "emergency", "unknown",
];

export async function understand({ text = "", audioBase64 = "", mimeType = "audio/webm" } = {}) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) return { ok: false, reason: "no-key" };

  text = String(text || "").slice(0, 400);
  audioBase64 = typeof audioBase64 === "string" ? audioBase64 : "";
  const audioMime = String(mimeType || "audio/webm").split(";")[0];
  if (!text.trim() && !audioBase64) return { ok: false, reason: "empty" };

  const models = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-001",
  ].filter(Boolean);

  const RULES =
    `You are a warm, caring assistant for a service that helps poor and ` +
    `vulnerable people in Mirpur, Dhaka. Always answer in simple spoken Bangla.\n\n` +
    `KNOWLEDGE BASE (use ONLY this for facts — addresses, phones, hours, how to apply):\n` +
    `${KNOWLEDGE_BASE}\n\n` +
    `Do TWO things:\n` +
    `1) "intentId": pick the single best from this list:${INTENT_HELP}\n` +
    `2) "replyBn": a short, warm Bangla reply (max 45 words) to speak aloud. If ` +
    `the person asks for specific info (address, phone, hours, what a place ` +
    `offers, how to apply for an allowance), ANSWER it from the knowledge base — ` +
    `say the address and phone clearly. Do not invent facts; if not in the ` +
    `knowledge base, say you don't know and suggest calling 333. Otherwise say ` +
    `what you are showing.\n` +
    `Output ONLY raw JSON, no preamble, no code fences: ` +
    `{"transcript":"...","intentId":"...","replyBn":"..."}`;

  const promptText = audioBase64
    ? `${RULES}\n\nThe attached audio is the person speaking in Bangla. First transcribe exactly what they said into "transcript".`
    : `${RULES}\n\nThe person said (in Bangla): "${text}". Put it in "transcript".`;

  const parts = audioBase64
    ? [{ text: promptText }, { inlineData: { mimeType: audioMime, data: audioBase64 } }]
    : [{ text: promptText }];

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  try {
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
      if (r.status !== 404) break;
    }
    if (!data) return { ok: false, reason: "llm-error", detail: lastDetail };

    const raw =
      (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || "")
        .join("") || "{}";
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
    const intentId = VALID.includes(parsed.intentId) ? parsed.intentId : "unknown";
    const replyBn = String(parsed.replyBn || "").slice(0, 700);
    const transcript = String(parsed.transcript || text || "").slice(0, 400);
    return { ok: true, intentId, replyBn, transcript, model: usedModel };
  } catch (e) {
    return { ok: false, reason: "exception", detail: String(e) };
  }
}
