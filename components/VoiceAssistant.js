"use client";

import { useEffect, useRef, useState } from "react";
import { VOICE_INTENTS, matchIntent, VOICE_MENU } from "../data/voiceIntents";
import { speak } from "./tts";

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

  function begin() {
    setOpen(true);
    setReply("");
    setHeard("");
    setShowMenu(false);
    setStatus("speaking");

    // Request mic permission WITHOUT awaiting before we speak — awaiting here
    // would break the user-gesture context and browsers would then block all
    // audio. So: kick off permission as a promise, speak the prompt right now
    // (inside the tap), and only listen once permission resolves.
    const micPromise =
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((s) => {
              s.getTracks().forEach((t) => t.stop());
              return true;
            })
            .catch(() => false)
        : Promise.resolve(true);

    // Speak the prompt immediately within the tap gesture (unlocks audio).
    speak(PROMPT, async () => {
      const okMic = await micPromise;
      if (okMic === false) {
        setStatus("denied");
        setShowMenu(true);
        return;
      }
      startListening();
    });
  }

  // Build the spoken reply for an intent, then run the action.
  // replyOverride (from the LLM) is used as the spoken text when present.
  function runIntent(intent, recognizedText, replyOverride) {
    setHeard(recognizedText || "");
    setStatus("result");

    if (!intent) {
      const msg =
        replyOverride || "আমি ঠিক বুঝতে পারিনি। আবার বলুন, অথবা নিচ থেকে বেছে নিন।";
      setReply(msg);
      setShowMenu(true);
      speak(msg);
      return;
    }

    let msg = replyOverride || intent.speakBn;
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

  // First try the LLM (free-form Bangla understanding); fall back to offline
  // keyword matching if there's no key / it's slow / it errors.
  async function handleResult(alts) {
    const text = alts[0] || "";
    setHeard(text);
    setStatus("thinking");

    let intent = null;
    let replyOverride = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const d = await r.json();
      if (d.ok) {
        if (d.intentId && d.intentId !== "unknown") {
          intent = VOICE_INTENTS.find((i) => i.id === d.intentId) || null;
        }
        replyOverride = d.replyBn || null;
      }
    } catch {
      /* network / timeout / no-key → fall back below */
    }

    // Fallback: offline keyword matching.
    if (!intent && !replyOverride) intent = matchIntent(alts);

    runIntent(intent, text, replyOverride);
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
                <div
                  className={`voice-mic ${
                    status === "listening" || status === "thinking" ? "pulse" : ""
                  }`}
                >
                  {status === "listening"
                    ? "🎙️"
                    : status === "speaking"
                    ? "🔊"
                    : status === "thinking"
                    ? "🤔"
                    : status === "denied"
                    ? "🚫"
                    : "🎤"}
                </div>
                <p className="voice-status">
                  {status === "speaking" && "শুনুন…"}
                  {status === "listening" && "এখন বলুন… 🎙️"}
                  {status === "thinking" && "বুঝছি…"}
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
                {reply && status !== "denied" && (
                  <p className="voice-reply">
                    🔊 {reply}{" "}
                    <button
                      className="voice-replay"
                      onClick={() => speak(reply)}
                      aria-label="আবার শুনুন"
                    >
                      🔊 শুনুন
                    </button>
                  </p>
                )}
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
