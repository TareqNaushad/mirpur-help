"use client";

import { useState } from "react";
import Link from "next/link";

const TYPES = [
  "স্বাস্থ্য শিবির",
  "খাদ্য বিতরণ",
  "টিকাকরণ শিবির",
  "কাপড় বিতরণ",
  "দক্ষতা প্রশিক্ষণ",
  "চোখ পরীক্ষা",
  "অন্যান্য",
];

const EMPTY = {
  typeBn: "স্বাস্থ্য শিবির",
  titleBn: "",
  organizerBn: "",
  descBn: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  phone: "",
  submittedByName: "",
  submittedByPhone: "",
};

export default function SubmitEvent() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setForm(EMPTY);
      } else {
        setStatus("error");
        setError(data.error || "জমা দিতে সমস্যা হয়েছে।");
      }
    } catch {
      setStatus("error");
      setError("ইন্টারনেট সংযোগ পরীক্ষা করুন।");
    }
  }

  return (
    <main className="app">
      <header className="header">
        <h1>➕ ইভেন্ট যোগ করুন</h1>
        <p>
          মসজিদ, এনজিও বা স্বেচ্ছাসেবক — বিনা মূল্যে সেবার তথ্য জানান
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            Mosques, NGOs & volunteers — share a free service/camp
          </span>
        </p>
      </header>

      {status === "success" ? (
        <div style={{ padding: 16 }}>
          <div className="note" style={{ background: "#eaf4ec", borderColor: "#cfe6d6" }}>
            ✅ <strong>ধন্যবাদ!</strong> আপনার তথ্য যাচাইয়ের জন্য জমা হয়েছে।
            যাচাই করার পর এটি অ্যাপে প্রকাশ করা হবে।
            <br />
            <em>Thank you! Submitted for review — it will appear after verification.</em>
          </div>
          <div className="actions" style={{ padding: 0, marginTop: 12 }}>
            <button className="btn" onClick={() => setStatus("idle")}>
              ➕ আরেকটি যোগ করুন
            </button>
            <Link className="btn dir" href="/" style={{ textAlign: "center" }}>
              🏠 হোম
            </Link>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            ইভেন্টের ধরন <span className="req">*</span>
            <select value={form.typeBn} onChange={(e) => set("typeBn", e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            শিরোনাম <span className="req">*</span>
            <input
              type="text"
              placeholder="যেমন: বিনা মূল্যে স্বাস্থ্য পরীক্ষা"
              value={form.titleBn}
              onChange={(e) => set("titleBn", e.target.value)}
            />
          </label>

          <label>
            আয়োজক (সংস্থা / মসজিদ) <span className="req">*</span>
            <input
              type="text"
              placeholder="যেমন: বায়তুল আমান মসজিদ"
              value={form.organizerBn}
              onChange={(e) => set("organizerBn", e.target.value)}
            />
          </label>

          <label>
            তারিখ <span className="req">*</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>

          <div className="row">
            <label>
              শুরুর সময়
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </label>
            <label>
              শেষের সময়
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </label>
          </div>

          <label>
            স্থান (ঠিকানা) <span className="req">*</span>
            <input
              type="text"
              placeholder="যেমন: মিরপুর ১০ নম্বর, ওয়ার্ড অফিসের পাশে"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </label>

          <label>
            যোগাযোগ ফোন
            <input
              type="tel"
              placeholder="যেমন: 01XXXXXXXXX"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </label>

          <label>
            বিস্তারিত
            <textarea
              rows={3}
              placeholder="কী সেবা দেওয়া হবে, কারা পাবে ইত্যাদি"
              value={form.descBn}
              onChange={(e) => set("descBn", e.target.value)}
            />
          </label>

          <hr className="divider" />
          <p className="form-note">
            যাচাইয়ের জন্য আপনার তথ্য (গোপন রাখা হবে):
          </p>
          <div className="row">
            <label>
              আপনার নাম
              <input
                type="text"
                value={form.submittedByName}
                onChange={(e) => set("submittedByName", e.target.value)}
              />
            </label>
            <label>
              আপনার ফোন
              <input
                type="tel"
                value={form.submittedByPhone}
                onChange={(e) => set("submittedByPhone", e.target.value)}
              />
            </label>
          </div>

          {status === "error" && (
            <div className="note" style={{ background: "#fde8e8", borderColor: "#f5c2c2" }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn call submit-btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "জমা হচ্ছে…" : "✅ জমা দিন"}
          </button>

          <Link className="back" href="/" style={{ display: "inline-block", marginTop: 8 }}>
            ← হোম
          </Link>
        </form>
      )}
    </main>
  );
}
