"use client";

import { useRef, useState } from "react";
import { VOICE_INTENTS, VOICE_MENU } from "../data/voiceIntents";
import { speak, stopSpeaking } from "./tts";

const PROMPT =
  "বলুন, আপনার কী দরকার? যেমন — খাবার, ঔষধ, ডাক্তার, থাকার জায়গা, কাপড়, টাকা, অথবা জরুরি সাহায্য।";

const MAX_SECONDS = 6; // auto-stop recording after this long

function actionForIntent(intentId) {
  if (!intentId || intentId === "unknown") return null;
  const it = VOICE_INTENTS.find((i) => i.id === intentId);
  return it ? it.action : null;
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1] || "");
    r.readAsDataURL(blob);
  });
}

export default function VoiceAssistant({ onCommand, categoryServices }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle|speaking|ready|listening|thinking|result|error|denied|unsupported
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const canRecord =
    typeof window !== "undefined" &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  function begin() {
    setOpen(true);
    setReply("");
    setHeard("");
    setShowMenu(false);
    if (!canRecord) {
      setStatus("unsupported");
      setShowMenu(true);
      return;
    }
    setStatus("speaking");
    speak(PROMPT, () => setStatus("ready"));
  }

  function cleanupStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  // Tapping "press to speak" — must be a direct user gesture so mobile grants
  // the mic. We record a few seconds of audio, then send it to Gemini.
  async function pressToSpeak() {
    stopSpeaking();
    setReply("");
    setHeard("");
    setShowMenu(false);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("denied");
      setShowMenu(true);
      return;
    }
    streamRef.current = stream;

    let mr;
    try {
      mr = new MediaRecorder(stream);
    } catch {
      cleanupStream();
      setStatus("error");
      setShowMenu(true);
      return;
    }
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    mr.onstop = () => finishRecording(mr.mimeType);
    recRef.current = mr;
    mr.start();
    setStatus("listening");
    timerRef.current = setTimeout(stopRecording, MAX_SECONDS * 1000);
  }

  function stopRecording() {
    clearTimeout(timerRef.current);
    const mr = recRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {}
    }
    setStatus("thinking");
  }

  async function finishRecording(mimeType) {
    cleanupStream();
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
    if (!blob.size) {
      setStatus("error");
      setShowMenu(true);
      return;
    }
    try {
      const audioBase64 = await blobToBase64(blob);
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType: blob.type }),
      });
      const d = await r.json();
      if (d.ok) {
        respond(actionForIntent(d.intentId), d.transcript || "", d.replyBn || "");
      } else {
        const m = "মাফ করবেন, বুঝতে পারিনি। আবার বলুন, অথবা নিচ থেকে বেছে নিন।";
        setStatus("error");
        setReply(m);
        setShowMenu(true);
        speak(m);
      }
    } catch {
      setStatus("error");
      setShowMenu(true);
    }
  }

  function respond(action, transcript, replyBn) {
    setHeard(transcript || "");
    setStatus("result");

    if (!action) {
      const m = replyBn || "আমি ঠিক বুঝতে পারিনি। আবার বলুন, অথবা নিচ থেকে বেছে নিন।";
      setReply(m);
      setShowMenu(true);
      speak(m);
      return;
    }

    let msg = replyBn || "দেখাচ্ছি…";
    if (action.type === "category" && categoryServices) {
      const list = categoryServices(action.value) || [];
      const names = list.slice(0, 3).map((s) => s.nameBn);
      if (names.length) msg += " " + names.join("। ") + "।";
    }
    setReply(msg);
    setShowMenu(false);
    speak(msg, () => {
      onCommand && onCommand(action);
      if (action.type !== "route") setOpen(false);
    });
  }

  // Tapping a fallback chip = same as choosing that intent.
  function chooseMenu(id) {
    const it = VOICE_INTENTS.find((i) => i.id === id);
    if (it) respond(it.action, labelFor(id), it.speakBn);
  }

  function close() {
    clearTimeout(timerRef.current);
    const mr = recRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {}
    }
    cleanupStream();
    stopSpeaking();
    setOpen(false);
    setStatus("idle");
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

            {status === "unsupported" ? (
              <p className="voice-status">
                এই ব্রাউজারে ভয়েস কাজ করে না। অনুগ্রহ করে নিচ থেকে বেছে নিন।
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
                  {status === "ready" && "নিচের বোতামে চাপ দিয়ে বলুন 👇"}
                  {status === "listening" && "🎙️ বলুন… (শেষ হলে থামুন চাপুন)"}
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

            {/* While recording: a big STOP button. Otherwise: a big TALK button. */}
            {status === "listening" ? (
              <button className="voice-bigtalk voice-stop" onClick={stopRecording}>
                ⏹️ থামুন
              </button>
            ) : (
              canRecord &&
              status !== "thinking" &&
              status !== "denied" &&
              status !== "unsupported" && (
                <button className="voice-bigtalk" onClick={pressToSpeak}>
                  🎤 চাপ দিয়ে বলুন
                </button>
              )
            )}

            <div className="voice-actions">
              {(status === "denied" || status === "unsupported") && (
                <button className="btn call" onClick={begin}>
                  🔄 আবার চেষ্টা করুন
                </button>
              )}
              <button className="btn" onClick={() => setShowMenu(true)}>
                📋 অপশন দেখুন
              </button>
            </div>

            {(showMenu || status === "unsupported" || status === "denied") && (
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
