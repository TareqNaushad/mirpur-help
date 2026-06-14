"use client";

import { useState } from "react";
import Link from "next/link";
import needsData from "../../data/needs.json";

const CATS = needsData.categories;

const EMPTY = {
  categoryId: "food",
  titleBn: "",
  descBn: "",
  area: "",
  contactName: "",
  contactPhone: "",
  urgency: "normal",
};

export default function PostNeed() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/needs", {
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
      <header className="header" style={{ background: "linear-gradient(135deg,#1d8a4e,#156b3c)" }}>
        <h1>🙏 সাহায্য চাই</h1>
        <p>
          আপনার বা পাশের কোনো অসহায় মানুষের প্রয়োজন জানান — দাতারা দেখবেন
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            Post a need for yourself or someone helpless nearby — donors will see it
          </span>
        </p>
      </header>

      {status === "success" ? (
        <div style={{ padding: 16 }}>
          <div className="note" style={{ background: "#eaf4ec", borderColor: "#cfe6d6" }}>
            ✅ <strong>আপনার অনুরোধ জমা হয়েছে।</strong> দাতা ও স্বেচ্ছাসেবকরা এটি
            দেখতে পাবেন এবং যোগাযোগ করবেন। জরুরি হলে এখনই <strong>৩৩৩</strong> এ কল করুন।
            <br />
            <em>Posted. Donors will see it. For emergencies, call 333 now.</em>
          </div>
          <div className="actions" style={{ padding: 0, marginTop: 12 }}>
            <button className="btn" onClick={() => setStatus("idle")}>
              ➕ আরেকটি অনুরোধ
            </button>
            <Link className="btn dir" href="/needs" style={{ textAlign: "center" }}>
              ❤️ অনুরোধ তালিকা
            </Link>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            কী দরকার? <span className="req">*</span>
            <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.bn}
                </option>
              ))}
            </select>
          </label>

          <label>
            সংক্ষেপে প্রয়োজন <span className="req">*</span>
            <input
              type="text"
              placeholder="যেমন: অসুস্থ শিশুর জন্য ঔষধ দরকার"
              value={form.titleBn}
              onChange={(e) => set("titleBn", e.target.value)}
            />
          </label>

          <label>
            বিস্তারিত
            <textarea
              rows={3}
              placeholder="অবস্থা একটু বুঝিয়ে লিখুন"
              value={form.descBn}
              onChange={(e) => set("descBn", e.target.value)}
            />
          </label>

          <label>
            এলাকা / অবস্থান <span className="req">*</span>
            <input
              type="text"
              placeholder="যেমন: মিরপুর ১১, বাউনিয়াবাঁধ"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </label>

          <div className="row">
            <label>
              যোগাযোগের নাম
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </label>
            <label>
              ফোন নম্বর <span className="req">*</span>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </label>
          </div>

          <label>
            কতটা জরুরি?
            <select value={form.urgency} onChange={(e) => set("urgency", e.target.value)}>
              <option value="normal">স্বাভাবিক</option>
              <option value="urgent">⚠️ জরুরি</option>
            </select>
          </label>

          <div className="note" style={{ margin: 0 }}>
            🔒 আপনার ফোন নম্বর দাতাদের দেখানো হবে যেন তারা সরাসরি সাহায্য করতে পারে।
            <br />
            <em>Your phone is shown to donors so they can help you directly.</em>
          </div>

          {status === "error" && (
            <div className="note" style={{ background: "#fde8e8", borderColor: "#f5c2c2" }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn call submit-btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "জমা হচ্ছে…" : "🙏 অনুরোধ জমা দিন"}
          </button>

          <Link className="back" href="/" style={{ display: "inline-block", marginTop: 8 }}>
            ← হোম
          </Link>
        </form>
      )}
    </main>
  );
}
