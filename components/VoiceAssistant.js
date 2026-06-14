"use client";

import { useEffect, useRef, useState } from "react";
import { VOICE_INTENTS, matchIntent, VOICE_MENU } from "../data/voiceIntents";

// Split long Bangla text into <=180-char chunks (Google TTS limit), at
// sentence/space boundaries.
function chunkText(text) {
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

// Device text-to-speech (needs a Bangla voice installed on the device).
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

// Bangla text-to-speech. Tries Google's FREE TTS audio first (works on ANY
// device without installing a Bangla voice), and falls back to the device
// voice if that's unavailable. Always calls onend so navigation never stalls.
function speak(text, onend) {
  if (typeof window === "undefined") {
    onend && onend();
    return;
  }
  const parts = chunkText(text);
  let idx = 0;
  let usedFallback = false;

  const playNext = () => {
    if (idx >= parts.length) {
      onend && onend();
      return;
    }
    const url =
      "https://translate.google.com/translate_tts?ie=UTF-8&tl=bn&client=tw-ob&q=" +
      encodeURIComponent(parts[idx]);
    const audio = new Audio(url);
    let advanced = false;
    const next = () => {
      if (advanced) return;
      advanced = true;
      idx += 1;
      playNext();
    };
    audio.onended = next;
    audio.onerror = () => {
      // Google TTS unavailable -> speak the rest with the device voice.
      if (advanced) return;
      advanced = true;
      usedFallback = true;
      deviceSpeak(parts.slice(idx).join(" "), onend);
    };
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => {
        if (advanced || usedFallback) return;
        advanced = true;
        deviceSpeak(parts.slice(idx).join(" "), onend);
      });
    }
  };

  playNext();
}

const PROMPT =
  "বলুন, আপনার কী দরকার? যেমন — খাবার, ঔষধ, ডাক্তার, থাকার জায়গা, কাপড়, টাকা, অথবা জরুরি সাহায্য।";

export default function VoiceAssistant({ onCommand, categoryServices }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState("idle"); // idle|speaking|listening|result|error|denied
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const recRef = useRef(null);
  const gotResultRef = useRef(false);
  const listeningRef = useRef(false);

  // Set up SpeechRecognition once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "bn-BD";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      listeningRef.current = true;
      setStatus("listening");
    };
    rec.onresult = (e) => {
      gotResultRef.current = true;
      const alts = Array.from(e.results[0]).map((r) => r.transcript);
      handleResult(alts);
    };
    rec.onerror = (e) => {
      listeningRef.current = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setStatus("denied");
      } else if (e.error === "no-speech") {
        setStatus("error");
        const m = "কিছু শুনতে পাইনি। আবার বলুন, অথবা নিচ থেকে বেছে নিন।";
        setReply(m);
        speak(m);
      } else {
        setStatus("error");
      }
      setShowMenu(true);
    };
    rec.onend = () => {
      listeningRef.current = false;
      // Ended without any result -> let the user retry / use the menu.
      if (!gotResultRef.current) {
        setStatus((s) => (s === "denied" ? s : "error"));
        setShowMenu(true);
      }
    };

    recRef.current = rec;
    // Warm up the voice list (Android loads voices async).
    const warm = () => window.speechSynthesis && window.speechSynthesis.getVoices();
    warm();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = warm;
    }
    return () => {
      try {
        rec.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startListening() {
    if (!recRef.current) return;
    gotResultRef.current = false;
    setHeard("");
    setStatus("listening");
    try {
      recRef.current.start();
    } catch {
      // Already running — restart cleanly.
      try {
        recRef.current.stop();
        setTimeout(() => recRef.current.start(), 250);
      } catch {}
    }
  }

  async function begin() {
    setOpen(true);
    setReply("");
    setHeard("");
    setShowMenu(false);
    setStatus("speaking");

    // Explicitly request microphone permission first (Android Chrome).
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We only needed the permission; release the mic for SpeechRecognition.
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setStatus("denied");
      setShowMenu(true);
      return;
    }

    // Speak the prompt, then start listening.
    speak(PROMPT, () => startListening());
  }

  // Build the spoken reply for an intent, then run the action.
  function runIntent(intent, recognizedText) {
    setHeard(recognizedText || "");
    setStatus("result");

    if (!intent) {
      const msg = "আমি ঠিক বুঝতে পারিনি। আবার বলুন, অথবা নিচ থেকে বেছে নিন।";
      setReply(msg);
      setShowMenu(true);
      speak(msg);
      return;
    }

    let msg = intent.speakBn;
    if (intent.action.type === "category" && categoryServices) {
      const list = categoryServices(intent.action.value) || [];
      const names = list.slice(0, 3).map((s) => s.nameBn);
      if (names.length) msg += " " + names.join("। ") + "।";
    }
    setReply(msg);
    setShowMenu(false);
    speak(msg, () => {
      onCommand && onCommand(intent.action);
      if (intent.action.type !== "route") setOpen(false);
    });
  }

  function handleResult(alts) {
    runIntent(matchIntent(alts), alts[0] || "");
  }

  function chooseMenu(id) {
    const intent = VOICE_INTENTS.find((i) => i.id === id);
    if (intent) runIntent(intent, intent.id);
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    try {
      recRef.current && recRef.current.abort();
    } catch {}
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
  }

  const menuChips = VOICE_MENU.map((id) =>
    VOICE_INTENTS.find((i) => i.id === id)
  ).filter(Boolean);

  return (
    <>
      <button className="voice-fab" onClick={begin} aria-label="কথা বলে সাহায্য নিন">
        <span className="voice-fab-ic">🎤</span>
        <span className="voice-fab-txt">কথা বলুন</span>
      </button>

      {open && (
        <div className="voice-overlay" role="dialog" aria-label="ভয়েস সহায়তা">
          <div className="voice-card">
            <button className="voice-close" onClick={close} aria-label="বন্ধ করুন">
              ✕
            </button>

            {!supported ? (
              <p className="voice-status">
                এই ব্রাউজারে ভয়েস কাজ করে না। অনুগ্রহ করে <strong>Chrome</strong>{" "}
                ব্যবহার করুন, অথবা নিচ থেকে বেছে নিন।
              </p>
            ) : (
              <>
                <div className={`voice-mic ${status === "listening" ? "pulse" : ""}`}>
                  {status === "listening"
                    ? "🎙️"
                    : status === "speaking"
                    ? "🔊"
                    : status === "denied"
                    ? "🚫"
                    : "🎤"}
                </div>
                <p className="voice-status">
                  {status === "speaking" && "শুনুন…"}
                  {status === "listening" && "এখন বলুন… 🎙️"}
                  {status === "result" && "আপনি বলেছেন:"}
                  {status === "error" && "আবার চেষ্টা করুন বা নিচ থেকে বেছে নিন।"}
                  {status === "denied" && "মাইক্রোফোন অনুমতি দিন"}
                  {status === "idle" && "প্রস্তুত"}
                </p>

                {status === "denied" && (
                  <p className="voice-reply">
                    ভয়েস ব্যবহার করতে মাইক্রোফোনের অনুমতি দরকার। উপরে ঠিকানা বারের
                    🔒/⚙️ আইকনে চাপ দিয়ে <strong>Microphone → Allow</strong> করুন।
                    নয়তো নিচ থেকে বেছে নিন।
                  </p>
                )}
                {heard && <p className="voice-heard">“{heard}”</p>}
                {reply && status !== "denied" && <p className="voice-reply">🔊 {reply}</p>}
              </>
            )}

            <div className="voice-actions">
              {supported && status !== "denied" && (
                <button className="btn call" onClick={begin}>
                  🎤 আবার বলুন
                </button>
              )}
              <button className="btn" onClick={() => setShowMenu(true)}>
                📋 অপশন দেখুন
              </button>
            </div>

            {(showMenu || !supported || status === "denied") && (
              <div className="voice-menu">
                {menuChips.map((i) => (
                  <button key={i.id} className="chip" onClick={() => chooseMenu(i.id)}>
                    {labelFor(i.id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Short Bangla labels for the fallback chips.
function labelFor(id) {
  const m = {
    food: "🍚 খাবার",
    medical: "🏥 চিকিৎসা",
    medicine: "💊 ঔষধ",
    shelter: "🏠 আশ্রয়",
    clothes: "👕 কাপড়",
    cash: "💰 টাকা",
    eligibility: "📋 ভাতা",
    emergency: "🆘 জরুরি",
  };
  return m[id] || id;
}
