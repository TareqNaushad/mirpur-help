// POST /api/voice — understand free-form Bangla (text or audio) with Gemini.
// Thin wrapper around the shared brain in lib/understand.js (also used by the
// phone-line IVR). Body: { text } or { audioBase64, mimeType }.
import { NextResponse } from "next/server";
import { understand } from "../../../lib/understand";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let input;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-input" }, { status: 400 });
  }
  const result = await understand(input);
  return NextResponse.json(result);
}
