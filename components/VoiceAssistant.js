"use client";

import { useEffect, useRef, useState } from "react";
import { VOICE_INTENTS, matchIntent, VOICE_MENU } from "../data/voiceIntents";

// Bangla text-to-speech. Picks a Bangla voice if the device has one.
function speak(text, onend) {
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
  u.onend = () => onend && onend();
  u.onerror = () => onend && onend();
  sy.speak(u);
}

const PROMPT =
  "বলুন, আপনার কী দরকার? যেমন — খাবার, ঔষধ, ডাক্তার, থাকার জায়গা, কাপড়, টাকা, অথবা জরুরি সাহায্য।";

export default function VoiceAssistant({ onCommand, categoryServices }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState("idle"); // idle|speaking|listening|result|error
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const recRef = useRef(null);

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
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0]).map((r) => r.transcript);
      handleResult(alts);
    };
    rec.onerror = () => {
      setStatus("error");
      setShowMenu(true);
    };
    recRef.current = rec;
    // Warm up the voice list.
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    return () => {
      try {
        rec.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startListening() {
    if (!recRef.current) return;
    setStatus("listening");
    setHeard("");
    try {
      recRef.current.start();
    } catch {
      /* already started */
    }
  }

  function begin() {
    setOpen(true);
    setReply("");
    setHeard("");
    setShowMenu(false);
    setStatus("speaking");
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
    // Speak the answer, THEN navigate (so they hear it before the screen changes).
    speak(msg, () => {
      onCommand && onCommand(intent.action);
      if (intent.action.type !== "route") setOpen(false);
    });
  }

  function handleResult(alts) {
    const intent = matchIntent(alts);
    runIntent(intent, alts[0] || "");
  }

  // Tapping a fallback chip = same as saying it.
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

  const menuChips = VOICE_MENU.map((id) => VOICE_INTENTS.find((i) => i.id === id)).filter(Boolean);

  return (
    <>
      {/* Floating mic button — always reachable */}
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
                  {status === "listening" ? "🎙️" : status === "speaking" ? "🔊" : "🎤"}
                </div>
                <p className="voice-status">
                  {status === "speaking" && "শুনুন…"}
                  {status === "listening" && "এখন বলুন… 🎙️"}
                  {status === "result" && "আপনি বলেছেন:"}
                  {status === "error" && "শোনা যায়নি। আবার চেষ্টা করুন বা বেছে নিন।"}
                  {status === "idle" && "প্রস্তুত"}
                </p>
                {heard && <p className="voice-heard">“{heard}”</p>}
                {reply && <p className="voice-reply">🔊 {reply}</p>}
              </>
            )}

            <div className="voice-actions">
              {supported && (
                <button className="btn call" onClick={begin}>
                  🎤 আবার বলুন
                </button>
              )}
              <button className="btn" onClick={() => setShowMenu((s) => !s)}>
                📋 অপশন দেখুন
              </button>
            </div>

            {(showMenu || !supported) && (
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
