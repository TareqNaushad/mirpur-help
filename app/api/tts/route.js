// ---------------------------------------------------------------------------
// GET /api/tts?text=...  — free Bangla text-to-speech, proxied through our own
// origin.
//
// The browser can't reliably play audio fetched directly from translate.google
// (cross-origin / referer blocking). So the browser asks OUR server for the
// audio, and the server fetches it from Google and streams it back as
// same-origin audio/mpeg — which always plays. No API key, no install needed
// on the user's device.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") || "").slice(0, 200);
  const lang = (searchParams.get("lang") || "bn").slice(0, 5);
  if (!text.trim()) {
    return new Response("missing text", { status: 400 });
  }

  const url =
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}` +
    `&q=${encodeURIComponent(text)}`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });
    if (!r.ok) {
      return new Response("tts upstream error", { status: 502 });
    }
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        // Cache repeated phrases (prompts, replies) for a day.
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return new Response("tts error: " + String(e), { status: 502 });
  }
}
