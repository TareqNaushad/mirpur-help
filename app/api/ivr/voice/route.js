// Phone line ENTRY — Twilio calls this webhook when someone phones the number.
// Greets in Bangla and asks what help they need (listening for speech).
//
// Set this URL as the Twilio number's "A Call Comes In" webhook (HTTP POST):
//   https://mirpur-help.vercel.app/api/ivr/voice
import { baseUrl, twiml, gatherSpeech, playBangla } from "../../../../lib/twiml";

export const dynamic = "force-dynamic";

const WELCOME =
  "আসসালামু আলাইকুম। মিরপুর সাহায্য লাইনে স্বাগতম। আপনি কী সাহায্য চান, বিপ শোনার পর বলুন। যেমন — খাবার, ডাক্তার, ঔষধ, থাকার জায়গা, কাপড়, টাকা, অথবা জরুরি সাহায্য।";

function handle(req) {
  const base = baseUrl(req);
  // Listen for the caller's spoken need; if nothing is said, gently end.
  const inner =
    gatherSpeech(WELCOME, base, "/api/ivr/handle") +
    playBangla("কিছু শুনতে পাইনি। অনুগ্রহ করে আবার কল করুন। ধন্যবাদ।", base);
  return twiml(inner);
}

export async function POST(req) {
  return handle(req);
}
export async function GET(req) {
  return handle(req);
}
