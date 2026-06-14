"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QUESTIONS, evaluate } from "../../data/eligibility";

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "bn-BD";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function Eligibility() {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // Only the questions that apply given current answers.
  const flow = useMemo(
    () => QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers]
  );
  const q = flow[step];
  const results = useMemo(() => (done ? evaluate(answers) : []), [done, answers]);

  function choose(value) {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    // Recompute flow against the NEW answers so skipped questions don't strand us.
    const nextFlow = QUESTIONS.filter((qq) => !qq.showIf || qq.showIf(next));
    if (step + 1 >= nextFlow.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setDone(false);
    if (typeof window !== "undefined" && window.speechSynthesis)
      window.speechSynthesis.cancel();
  }

  const progress = done
    ? 100
    : Math.round((step / Math.max(flow.length, 1)) * 100);

  return (
    <main className="app">
      <header className="header">
        <h1>📋 আমি কি যোগ্য?</h1>
        <p>
          কয়েকটি সহজ প্রশ্নের উত্তর দিন — দেখুন আপনি কোন সরকারি সাহায্য পেতে পারেন
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            Am I eligible? — check which govt allowances you can get
          </span>
        </p>
      </header>

      {!done && q && (
        <>
          <div style={{ padding: "10px 16px 0" }}>
            <div
              style={{
                height: 8,
                background: "#e4e7e3",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "var(--brand)",
                  transition: "width .25s",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              প্রশ্ন {step + 1} / {flow.length}
            </div>
          </div>

          <div className="svc" style={{ margin: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ fontSize: 20 }}>{q.bn}</h3>
              <button
                className="btn speak"
                onClick={() => speak(q.bn)}
                title="শুনুন"
                style={{ flex: "0 0 auto" }}
              >
                🔊
              </button>
            </div>
            <div className="en-name" style={{ marginBottom: 6 }}>{q.en}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {q.options.map((o) => (
                <button
                  key={o.value}
                  className="btn"
                  onClick={() => choose(o.value)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    fontSize: 17,
                  }}
                >
                  {o.bn}
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 8 }}>
                    {o.en}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 16px" }}>
            <Link className="back" href="/" style={{ display: "inline-block" }}>
              ← হোম
            </Link>
          </div>
        </>
      )}

      {done && (
        <>
          <div className="section-title" style={{ marginTop: 8 }}>
            <h2>
              {results.length > 0
                ? "আপনি যেসব সাহায্য পেতে পারেন"
                : "সরাসরি যোগ্যতা পাওয়া যায়নি"}
            </h2>
            <span className="sub">{results.length} program(s)</span>
          </div>

          {results.length === 0 && (
            <div className="note" style={{ background: "#eaf4ec", borderColor: "#cfe6d6" }}>
              আপনার উত্তর অনুযায়ী নির্দিষ্ট ভাতা মেলেনি, তবে হাল ছাড়বেন না।
              জরুরি সাহায্যের জন্য <strong>৩৩৩</strong> নম্বরে কল করুন অথবা হোম
              পেজ থেকে কাছের বিনামূল্যে সেবা খুঁজুন।
            </div>
          )}

          <div className="list">
            {results.map((p) => (
              <article className="svc" key={p.id}>
                <h3>✅ {p.nameBn}</h3>
                <div className="en-name">{p.nameEn}</div>
                <p className="desc"><strong>সুবিধা:</strong> {p.benefitBn}</p>
                <p className="desc" style={{ margin: "6px 0" }}>
                  <strong>কীভাবে পাবেন:</strong> {p.applyBn}
                </p>
                <p className="desc" style={{ margin: "6px 0", color: "var(--muted)" }}>
                  {p.docsBn}
                </p>
                <div className="actions">
                  <a className="btn call" href="tel:333">📞 ৩৩৩ কল করুন</a>
                  <a
                    className="btn dir"
                    href="https://mis.bhata.gov.bd/onlineApplication"
                    target="_blank"
                    rel="noreferrer"
                  >
                    🌐 অনলাইনে আবেদন
                  </a>
                  <button
                    className="btn speak"
                    onClick={() =>
                      speak(
                        `${p.nameBn}। সুবিধা: ${p.benefitBn} কীভাবে পাবেন: ${p.applyBn}`
                      )
                    }
                  >
                    🔊
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="note">
            ⚠️ ভাতার পরিমাণ প্রতি বছর পরিবর্তিত হতে পারে। সঠিক তথ্যের জন্য{" "}
            <strong>৩৩৩</strong> নম্বরে কল করুন বা সমাজসেবা কার্যালয়ে যোগাযোগ
            করুন। এই ফলাফল কেবল প্রাথমিক ধারণা, চূড়ান্ত সিদ্ধান্ত নয়।
          </div>

          <div className="actions" style={{ padding: 16 }}>
            <button className="btn" onClick={restart}>🔄 আবার শুরু করুন</button>
            <Link className="btn dir" href="/" style={{ textAlign: "center" }}>
              🏠 হোম
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
