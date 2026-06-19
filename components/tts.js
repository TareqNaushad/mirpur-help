"use client";

// Shared Bangla text-to-speech for the whole app.
//
// Strategy: play audio from OUR OWN /api/tts proxy (same-origin, always
// allowed to play after a user gesture), and fall back to the device voice
// (speechSynthesis) only if that fails. Always calls onend so callers never
// stall.

export function chunkText(text) {
  const parts = [];
  let s = String(text).trim();
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

// Device voice fallback (needs a Bangla voice installed; may be silent if not).
function deviceSpeak(text, onend) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onend && onend();
    return;
  }
  const sy = window.speechSynthesis;
  sy.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "bn-BD";
  u.rate = 0.95;
  const bn = sy.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("bn"));
  if (bn) u.voice = bn;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onend && onend();
  };
  u.onend = finish;
  u.onerror = finish;
  sy.speak(u);
  setTimeout(finish, Math.min(7000, 1500 + text.length * 60));
}

let currentAudio = null;

export function stopSpeaking() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
  } catch {}
}

export function speak(text, onend) {
  if (typeof window === "undefined" || !text) {
    onend && onend();
    return;
  }
  stopSpeaking();
  const parts = chunkText(text);
  let idx = 0;

  const playNext = () => {
    if (idx >= parts.length) {
      onend && onend();
      return;
    }
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(parts[idx])}`);
    currentAudio = audio;
    let advanced = false;
    const next = () => {
      if (advanced) return;
      advanced = true;
      idx += 1;
      playNext();
    };
    const fail = () => {
      if (advanced) return;
      advanced = true;
      // Proxy failed -> try the device voice for the rest.
      deviceSpeak(parts.slice(idx).join(" "), onend);
    };
    audio.onended = next;
    audio.onerror = fail;
    const p = audio.play();
    if (p && p.catch) p.catch(fail);
  };

  playNext();
}
