// Phone line SPEECH HANDLER — Twilio posts the caller's RECORDING here. We
// download the audio and send it to the same Gemini brain as the web app
// (which transcribes Bangla accurately), speak the Bangla answer back, then
// record again (conversation loop).
//
// Needs Twilio creds to download the recording — set in Vercel:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
import { baseUrl, twiml, playBangla } from "../../../../lib/twiml";
import { understand } from "../../../../lib/understand";

export const dynamic = "force-dynamic";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRecordingBase64(url) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tok || !url) return null;
  const auth = "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");
  // The recording may take a moment to become available — retry briefly.
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url + ".mp3", { headers: { Authorization: auth } });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 800) return Buffer.from(buf).toString("base64");
      }
    } catch {
      /* retry */
    }
    await sleep(700);
  }
  return null;
}

function recordPrompt(text, base) {
  return (
    playBangla(text, base) +
    `<Record action="${base}/api/ivr/handle" method="POST" maxLength="8" ` +
    `timeout="2" playBeep="true" trim="trim-silence" finishOnKey="#" />`
  );
}

export async function POST(req) {
  const base = baseUrl(req);

  let recUrl = "";
  let dur = 0;
  try {
    const f = await req.formData();
    recUrl = String(f.get("RecordingUrl") || "");
    dur = parseInt(f.get("RecordingDuration") || "0", 10);
  } catch {
    /* ignore */
  }

  // Nothing recorded — ask again.
  if (!recUrl || dur < 1) {
    return twiml(
      recordPrompt("দুঃখিত, শুনতে পাইনি। বিপ এর পরে আবার বলুন।", base)
    );
  }

  const audioBase64 = await fetchRecordingBase64(recUrl);
  let replyBn =
    "দুঃখিত, এই মুহূর্তে আপনার কথা বুঝতে পারছি না। জরুরি প্রয়োজনে ৩৩৩ অথবা ৯৯৯ নম্বরে কল করুন।";
  if (audioBase64) {
    try {
      const r = await understand({ audioBase64, mimeType: "audio/mpeg" });
      if (r.ok && r.replyBn) replyBn = r.replyBn;
    } catch {
      /* keep fallback */
    }
  }

  const inner =
    playBangla(replyBn, base) +
    recordPrompt("আর কিছু জানতে চাইলে বিপ এর পরে বলুন। নয়তো ফোন রেখে দিন।", base);
  return twiml(inner);
}
