// Phone line ENTRY — Twilio calls this when someone phones the number.
// Greets in Bangla, then RECORDS the caller's speech (we send the recording to
// Gemini for accurate Bangla understanding — Twilio's own speech recognition is
// weak for Bangla).
//
// Twilio number webhook (HTTP POST): https://mirpur-help.vercel.app/api/ivr/voice
import { baseUrl, twiml, playBangla } from "../../../../lib/twiml";

export const dynamic = "force-dynamic";

const WELCOME =
  "আসসালামু আলাইকুম। মিরপুর সাহায্য লাইনে স্বাগতম। বিপ শোনার পর, আপনার কী সাহায্য দরকার বাংলায় বলুন। যেমন — খাবার, ডাক্তার, ঔষধ, থাকার জায়গা, কাপড়, টাকা, অথবা জরুরি সাহায্য। বলা শেষ হলে একটু চুপ থাকুন।";

function handle(req) {
  const base = baseUrl(req);
  const inner =
    playBangla(WELCOME, base) +
    `<Record action="${base}/api/ivr/handle" method="POST" maxLength="9" ` +
    `timeout="3" playBeep="true" trim="trim-silence" finishOnKey="#" />` +
    playBangla("কিছু শুনতে পাইনি। অনুগ্রহ করে আবার কল করুন। ধন্যবাদ।", base);
  return twiml(inner);
}

export async function POST(req) {
  return handle(req);
}
export async function GET(req) {
  return handle(req);
}
