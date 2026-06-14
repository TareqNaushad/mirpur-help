"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import needsData from "../../data/needs.json";

const CATS = needsData.categories;

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  return `${Math.floor(hrs / 24)} দিন আগে`;
}

export default function Needs() {
  const [needs, setNeeds] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/needs")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setNeeds(d.needs);
        else setError(d.error || "তথ্য আনা যায়নি।");
      })
      .catch(() => setError("ইন্টারনেট সংযোগ পরীক্ষা করুন।"));
  }, []);

  const shown = useMemo(() => {
    if (!needs) return [];
    return filter === "all" ? needs : needs.filter((n) => n.categoryId === filter);
  }, [needs, filter]);

  return (
    <main className="app">
      <header className="header" style={{ background: "linear-gradient(135deg,#c1121f,#9d0208)" }}>
        <h1>❤️ সাহায্য করুন</h1>
        <p>
          আপনার কাছাকাছি কারা সাহায্য চাইছে দেখুন ও পাশে দাঁড়ান
          <br />
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            See who needs help near you — and respond
          </span>
        </p>
      </header>

      <div className="filter-row">
        <button
          className={`chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          সব
        </button>
        {CATS.map((c) => (
          <button
            key={c.id}
            className={`chip ${filter === c.id ? "active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {c.icon} {c.bn}
          </button>
        ))}
      </div>

      {error && (
        <div className="note" style={{ background: "#fde8e8", borderColor: "#f5c2c2" }}>
          ⚠️ {error}
        </div>
      )}

      {needs === null && !error && (
        <div className="empty">লোড হচ্ছে…</div>
      )}

      {needs !== null && shown.length === 0 && (
        <div className="empty">এই মুহূর্তে কোনো অনুরোধ নেই।</div>
      )}

      <div className="list">
        {shown.map((n) => (
          <article
            className="svc"
            key={n.id}
            style={n.urgency === "urgent" ? { borderColor: "#f5a3a3", borderWidth: 2 } : null}
          >
            <h3>
              {n.icon} {n.titleBn}
              {n.urgency === "urgent" && (
                <span className="badge" style={{ background: "#fde2e2", color: "#c1121f" }}>
                  জরুরি
                </span>
              )}
            </h3>
            <p className="desc">{n.descBn}</p>
            <div className="meta">
              <span>📍 {n.area}</span>
              <span>🕒 {timeAgo(n.createdAt)}</span>
              <span>🏷️ {n.categoryBn}</span>
            </div>
            <div className="actions">
              <a className="btn call" href={`tel:${n.contactPhone}`}>
                📞 যোগাযোগ করুন {n.contactName ? `(${n.contactName})` : ""}
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="note">
        🤝 সরাসরি ফোন করে সাহায্যের ব্যবস্থা করুন। সম্ভব হলে স্থানীয় মসজিদ/এনজিওর
        মাধ্যমে যাচাই করে সাহায্য দিন।
        <br />
        <em>Call directly to coordinate. Where possible, verify through a local mosque/NGO.</em>
      </div>

      <div className="actions" style={{ padding: 16 }}>
        <Link className="btn dir" href="/post-need" style={{ textAlign: "center" }}>
          🙏 সাহায্য চাই
        </Link>
        <Link className="btn" href="/" style={{ textAlign: "center" }}>
          🏠 হোম
        </Link>
      </div>
    </main>
  );
}
