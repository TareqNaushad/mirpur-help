// Phone line SPEECH HANDLER — Twilio posts the caller's recognised speech here
// (SpeechResult). We run it through the same Gemini brain as the web app, then
// speak the Bangla answer back and listen again (so the call is a conversation).
import { baseUrl, twiml, gatherSpeech, playBangla } from "../../../../lib/twiml";
import { understand } from "../../../../lib/understand";

export const dynamic = "force-dynamic";

const FOLLOW_UP =
  "আর কিছু জানতে চাইলে বলুন। নয়তো ফোন রেখে দিন। ধন্যবাদ।";

export async function POST(req) {
  const base = baseUrl(req);

  let speech = "";
  try {
    const form = await req.formData();
    speech = String(form.get("SpeechResult") || "").trim();
  } catch {
    /* ignore */
  }

  if (!speech) {
    // Didn't catch anything — ask again.
    return twiml(
      gatherSpeech("দুঃখিত, বুঝতে পারিনি। অনুগ্রহ করে আবার বলুন।", base, "/api/ivr/handle")
    );
  }

  let replyBn =
    "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। জরুরি প্রয়োজনে ৩৩৩ অথবা ৯৯৯ নম্বরে কল করুন।";
  try {
    const r = await understand({ text: speech });
    if (r.ok && r.replyBn) replyBn = r.replyBn;
  } catch {
    /* keep fallback */
  }

  // Speak the answer, then listen again for the next question.
  const inner =
    `<Gather input="speech" language="bn-IN" speechTimeout="auto" ` +
    `action="${base}/api/ivr/handle" method="POST">` +
    playBangla(replyBn, base) +
    playBangla(FOLLOW_UP, base) +
    `</Gather>` +
    playBangla("ধন্যবাদ। ভালো থাকবেন।", base);

  return twiml(inner);
}
