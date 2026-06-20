"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Self-service tester for the phone line: tap a button, Twilio calls your phone
// and runs the Bangla IVR. Your number + key are remembered on the device.
export default function TestCall() {
  const [to, setTo] = useState("+8801713397552");
  const [key, setKey] = useState("mirpur");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedTo = localStorage.getItem("ivr_to");
    const savedKey = localStorage.getItem("ivr_key");
    if (savedTo) setTo(savedTo);
    if (savedKey) setKey(savedKey);
  }, []);

  async function callMe() {
    setBusy(true);
    setStatus("📞 কল করা হচ্ছে…");
    localStorage.setItem("ivr_to", to);
    localStorage.setItem("ivr_key", key);
    try {
      const r = await fetch(
        `/api/ivr/call-me?to=${encodeURIComponent(to)}&key=${encodeURIComponent(key)}`
      );
      const d = await r.json();
      if (d.ok) {
        setStatus("✅ আপনার ফোনে কল আসছে! ধরুন → 1 চাপুন → বিপ এর পর বাংলায় বলুন।");
      } else {
        setStatus("❌ " + (d.error || "কল ব্যর্থ"));
      }
    } catch {
      setStatus("❌ ইন্টারনেট সমস্যা");
    }
    setBusy(false);
  }

  return (
    <main className="app">
      <header className="header">
        <h1>📞 ফোন লাইন টেস্ট</h1>
        <p>
          বোতামে চাপ দিন — টুইলিও আপনাকে কল করবে ও বাংলা সহায়তা লাইন চালাবে
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            Tap the button → Twilio calls you & runs the Bangla helpline
          </span>
        </p>
      </header>

      <div className="form">
        <label>
          আপনার ফোন নম্বর (আন্তর্জাতিক, +880…)
          <input type="tel" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          গোপন key
          <input type="text" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>

        <button className="btn call submit-btn" onClick={callMe} disabled={busy}>
          {busy ? "অপেক্ষা করুন…" : "📞 আমাকে কল করুন"}
        </button>

        {status && (
          <div className="note" style={{ background: "#eaf4ec", borderColor: "#cfe6d6" }}>
            {status}
          </div>
        )}

        <div className="note">
          মনে রাখবেন: কল ধরার পর ইংরেজি ট্রায়াল মেসেজ বাজবে → কীপ্যাড খুলে{" "}
          <strong>1</strong> চাপুন → বাংলা শুরু হবে → বিপ এর পর বলুন। শুধুমাত্র
          টুইলিও-তে ভেরিফায়েড নম্বরেই কল যাবে।
        </div>

        <Link className="back" href="/" style={{ display: "inline-block" }}>
          ← হোম
        </Link>
      </div>
    </main>
  );
}
