// GET/POST /api/ivr/call-me?to=+8801...&key=...
//
// Self-service test: makes Twilio call `to` and run the IVR, so you can test
// the phone line yourself without anyone triggering it for you. Reuses the
// Twilio creds already in Vercel (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).
//
// Protected by a key (env IVR_TEST_KEY, default "mirpur"). On a TRIAL Twilio
// account it can only ring numbers verified on the account anyway.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  return placeCall(req);
}
export async function POST(req) {
  return placeCall(req);
}

async function placeCall(req) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM || "+16092010842";
  const KEY = process.env.IVR_TEST_KEY || "mirpur";

  const url = new URL(req.url);
  const to = (url.searchParams.get("to") || "").trim();
  const key = (url.searchParams.get("key") || "").trim();

  if (!sid || !tok) {
    return NextResponse.json(
      { ok: false, error: "Twilio not configured (set TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN)." },
      { status: 500 }
    );
  }
  if (key !== KEY) {
    return NextResponse.json({ ok: false, error: "ভুল key / wrong key" }, { status: 403 });
  }
  if (!/^\+\d{7,15}$/.test(to)) {
    return NextResponse.json(
      { ok: false, error: "নম্বর আন্তর্জাতিক আকারে দিন, যেমন +8801XXXXXXXXX" },
      { status: 400 }
    );
  }

  const base = `${url.protocol}//${url.host}`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Url: `${base}/api/ivr/voice`,
    Method: "POST",
    Timeout: "55",
  });
  const auth = "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const d = await r.json();
    if (!r.ok || d.code) {
      return NextResponse.json(
        { ok: false, error: d.message || "call failed", code: d.code },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, sid: d.sid, status: d.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
