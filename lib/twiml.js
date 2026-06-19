// Helpers for the IVR (phone line) TwiML responses.
//
// We speak Bangla on the phone by <Play>-ing audio from our own /api/tts proxy
// (Google Bangla voice) — Twilio's built-in <Say> has no Bangla voice.

// Split long Bangla text into <=180-char chunks (Google TTS limit).
export function chunk(text) {
  const parts = [];
  let s = String(text || "").trim();
  while (s.length > 180) {
    let i = s.lastIndexOf("।", 180);
    if (i < 60) i = s.lastIndexOf(" ", 180);
    if (i < 60) i = 180;
    parts.push(s.slice(0, i));
    s = s.slice(i);
  }
  if (s.trim()) parts.push(s.trim());
  return parts;
}

export function baseUrl(req) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

// One or more <Play> tags that speak `text` in Bangla via our TTS proxy.
export function playBangla(text, base) {
  return chunk(text)
    .map((part) => `<Play>${base}/api/tts?text=${encodeURIComponent(part)}</Play>`)
    .join("");
}

// Wrap inner TwiML in a <Response> document.
export function twiml(inner) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${inner}</Response>`,
    { headers: { "Content-Type": "text/xml; charset=utf-8" } }
  );
}

// A <Gather> that plays a Bangla prompt and listens for Bangla speech.
export function gatherSpeech(promptText, base, actionPath) {
  return (
    `<Gather input="speech" language="bn-IN" speechTimeout="auto" ` +
    `action="${base}${actionPath}" method="POST">` +
    playBangla(promptText, base) +
    `</Gather>`
  );
}
